"use client";

/**
 * useAudioFileImport - Audio-Datei-Import mit Full Analysis
 *
 * Importiert Audio-Dateien (MP3/WAV/M4A), konvertiert zu WAV 16kHz Mono, transkribiert
 * via Whisper, analysiert Audio-Emotion (12 Features) + Text (LLM Pipeline).
 * Callback-Pattern wie useAudioRecorder. Large File Support (Stack Overflow Fix).
 */

import { useRef, useCallback } from "react";
import { useTauri } from "./useTauri";
import { getAnalysisPipeline } from "@/lib/analysis";
import { getWhisperClient } from "@/lib/whisper";
import { convertToWav16kMono } from "@/lib/audio-convert";
import { logger } from "@/lib/logger";
import type {
  EmotionState,
  AnalysisResult,
  ToneState,
  ProcessingStepStatus,
  RecordingMetadata,
  AudioValidationMeta,
  TranscriptionMeta,
  ToneResult,
  EmotionResultFromRust,
  InputLimits,
  LLMConfig,
  TopicResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  AppSettings,
} from "@/lib/types";

interface UseAudioFileImportOptions {
  onEmotionUpdate?: (emotion: EmotionState) => void;
  onAnalysis?: (text: string, result: AnalysisResult, emotion: EmotionState) => void;
  onToneUpdate?: (tone: ToneState) => void;
  onTopicUpdate?: (topic: TopicResult) => void;
  onGFKUpdate?: (gfk: GFKAnalysis) => void;
  onCognitiveUpdate?: (cognitive: CognitiveDistortionResult) => void;
  onFourSidesUpdate?: (fourSides: FourSidesAnalysis) => void;
  onProcessingStepUpdate?: (stepId: string, status: ProcessingStepStatus) => void;
  abortSignal?: AbortSignal;
  limits?: InputLimits;
  enabledSteps?: string[]; // List of step IDs that should be processed
  whisperProvider?: string;
  whisperModel?: string;
  llmConfig?: LLMConfig;
  settings?: AppSettings; // For emotion detection mode configuration
}

interface UseAudioFileImportReturn {
  processAudioFile: (file: File) => Promise<void>;
}

/**
 * Hook for importing and analyzing audio files.
 * Follows the same callback pattern as useAudioRecorder.
 *
 * Processing Flow:
 * 1. audioFileImport: Validate and convert to WAV 16kHz mono
 * 2. transcription: Whisper STT
 * 3. audioEmotion: Analyze audio features (pitch, energy, etc.)
 * 4. toneAnalysis: Analyze communication style from audio
 * 5. textEmotion + fallacyDetection: LLM analysis of transcript
 * 6. storage: Save recording with full metadata
 *
 * @param options - Callbacks and abort signal
 * @returns processAudioFile function
 */
export function useAudioFileImport(
  options: UseAudioFileImportOptions
): UseAudioFileImportReturn {
  const {
    onEmotionUpdate,
    onAnalysis,
    onToneUpdate,
    onTopicUpdate,
    onGFKUpdate,
    onCognitiveUpdate,
    onFourSidesUpdate,
    onProcessingStepUpdate,
    abortSignal,
    limits,
    enabledSteps,
    llmConfig,
    settings,
  } = options;

  const { isTauri, invoke } = useTauri();

  // Ref-based callback pattern (prevents dependency loops)
  const onEmotionUpdateRef = useRef(onEmotionUpdate);
  onEmotionUpdateRef.current = onEmotionUpdate;

  const onAnalysisRef = useRef(onAnalysis);
  onAnalysisRef.current = onAnalysis;

  const onToneUpdateRef = useRef(onToneUpdate);
  onToneUpdateRef.current = onToneUpdate;

  const onTopicUpdateRef = useRef(onTopicUpdate);
  onTopicUpdateRef.current = onTopicUpdate;

  const onGFKUpdateRef = useRef(onGFKUpdate);
  onGFKUpdateRef.current = onGFKUpdate;

  const onCognitiveUpdateRef = useRef(onCognitiveUpdate);
  onCognitiveUpdateRef.current = onCognitiveUpdate;

  const onFourSidesUpdateRef = useRef(onFourSidesUpdate);
  onFourSidesUpdateRef.current = onFourSidesUpdate;

  const onProcessingStepUpdateRef = useRef(onProcessingStepUpdate);
  onProcessingStepUpdateRef.current = onProcessingStepUpdate;

  const abortSignalRef = useRef(abortSignal);
  abortSignalRef.current = abortSignal;

  // enabledSteps als Ref (verhindert stale closure in useCallback)
  const enabledStepsRef = useRef(enabledSteps);
  enabledStepsRef.current = enabledSteps;

  // Helper to check if a step is enabled (uses Ref for current value)
  const isStepEnabled = (stepId: string): boolean => {
    if (!enabledStepsRef.current) return true; // If not specified, enable all
    return enabledStepsRef.current.includes(stepId);
  };

  const processAudioFile = useCallback(
    async (file: File): Promise<void> => {
      const startTime = Date.now();

      try {
        // Step 1: Audio File Import (validate + convert)
        if (isStepEnabled("audioFileImport")) {
          onProcessingStepUpdateRef.current?.("audioFileImport", "active");
        }

        const fileSizeMB = file.size / (1024 * 1024);
        logger.info("AudioFileImport", "Starting audio file import", {
          name: file.name,
          size: file.size,
          sizeMB: fileSizeMB.toFixed(2),
          type: file.type,
        });

        const maxAudioSizeMB = limits?.maxAudioFileSizeMB ?? 50;

        // Log warning for large files (80% of limit)
        if (fileSizeMB > maxAudioSizeMB * 0.8) {
          logger.warn('AudioFileImport', 'Large audio file', {
            sizeMB: fileSizeMB,
            maxMB: maxAudioSizeMB
          });
        }

        const { wavBlob, durationSec, originalFormat } = await convertToWav16kMono(file, maxAudioSizeMB);

        if (abortSignalRef.current?.aborted) {
          logger.info("AudioFileImport", "Processing aborted after conversion");
          return;
        }

        if (isStepEnabled("audioFileImport")) {
          onProcessingStepUpdateRef.current?.("audioFileImport", "completed");
        }
        logger.info("AudioFileImport", "Conversion complete", {
          originalFormat,
          durationSec,
          wavSize: wavBlob.size,
        });

        // Step 2: Transcription
        if (isStepEnabled("transcription")) {
          onProcessingStepUpdateRef.current?.("transcription", "active");
        }
        logger.info("AudioFileImport", "Starting transcription");

        const whisperClient = getWhisperClient(undefined, isTauri);
        const transcriptionResult = await whisperClient.transcribe(wavBlob);

        if (abortSignalRef.current?.aborted) {
          logger.info("AudioFileImport", "Processing aborted after transcription");
          return;
        }

        if (isStepEnabled("transcription")) {
          onProcessingStepUpdateRef.current?.("transcription", "completed");
        }
        logger.info("AudioFileImport", "Transcription complete", {
          text: transcriptionResult.text.substring(0, 100),
          language: transcriptionResult.language,
        });

        // Convert WAV blob to base64 for Rust backend
        const arrayBuffer = await wavBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Chunked base64 encoding to prevent stack overflow on large files
        // Direct spread operator (...uint8Array) causes "Maximum call stack size exceeded"
        // for files >~50KB due to JavaScript call stack limits
        const CHUNK_SIZE = 8192; // 8KB chunks (safe for call stack)
        let binary = '';
        for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
          const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
          binary += String.fromCharCode(...chunk);
        }
        const base64Audio = btoa(binary);

        // Step 3: Audio Emotion Analysis (conditional)
        let audioEmotionResult: EmotionResultFromRust | null = null;
        if (isStepEnabled("audioEmotion")) {
          onProcessingStepUpdateRef.current?.("audioEmotion", "active");
          logger.info("AudioFileImport", "Analyzing audio emotion");

          audioEmotionResult = await invoke<EmotionResultFromRust>(
            "analyze_audio_from_wav",
            {
              audioData: base64Audio,
              speechDuration: durationSec, // Total duration (no VAD for file import)
              totalDuration: durationSec,
            }
          );

          if (!audioEmotionResult) {
            throw new Error("Audio emotion analysis returned null");
          }

          if (abortSignalRef.current?.aborted) {
            logger.info("AudioFileImport", "Processing aborted after audio emotion");
            return;
          }

          onProcessingStepUpdateRef.current?.("audioEmotion", "completed");
          logger.info("AudioFileImport", "Audio emotion complete", {
            primary: audioEmotionResult.primary,
            confidence: audioEmotionResult.confidence,
          });
        } else {
          onProcessingStepUpdateRef.current?.("audioEmotion", "skipped");
          logger.info("AudioFileImport", "Audio emotion skipped (disabled)");
        }

        // Step 4: Tone Analysis (conditional)
        let toneResult: ToneResult | null = null;
        if (isStepEnabled("toneAnalysis")) {
          onProcessingStepUpdateRef.current?.("toneAnalysis", "active");
          logger.info("AudioFileImport", "Analyzing tone");

          toneResult = await invoke<ToneResult>("analyze_audio_tone", {
            audioData: base64Audio,
            speechDuration: durationSec, // Total duration (no VAD for file import)
            totalDuration: durationSec,
          });

          if (!toneResult) {
            throw new Error("Tone analysis returned null");
          }

          if (abortSignalRef.current?.aborted) {
            logger.info("AudioFileImport", "Processing aborted after tone analysis");
            return;
          }

          onProcessingStepUpdateRef.current?.("toneAnalysis", "completed");
          logger.info("AudioFileImport", "Tone analysis complete", toneResult);

          // Convert tone to ToneState
          const toneState: ToneState = {
            formality: toneResult.formality,
            professionalism: toneResult.professionalism,
            directness: toneResult.directness,
            energy: toneResult.energy,
            seriousness: toneResult.seriousness,
            confidence: toneResult.confidence,
            source: "audio",
          };

          onToneUpdateRef.current?.(toneState);
        } else {
          onProcessingStepUpdateRef.current?.("toneAnalysis", "skipped");
          logger.info("AudioFileImport", "Tone analysis skipped (disabled)");
        }

        // Step 5: Text Analysis (emotion + fallacy)
        if (isStepEnabled("textEmotion")) {
          onProcessingStepUpdateRef.current?.("textEmotion", "active");
        }
        if (isStepEnabled("fallacyDetection")) {
          onProcessingStepUpdateRef.current?.("fallacyDetection", "active");
        }
        logger.info("AudioFileImport", "Starting text analysis");

        const pipeline = getAnalysisPipeline(llmConfig, settings);

        // Set audio emotion from Rust analysis (only if analyzed)
        // WHY: lastAudioEmotion enables Dual-Track Fusion in analyzeTextFull()
        // Text-only mode would use neutral audio baseline, losing prosodic signals
        if (audioEmotionResult) {
          pipeline.lastAudioEmotion = {
            primary: audioEmotionResult.primary,
            confidence: audioEmotionResult.confidence,
            audioFeatures: audioEmotionResult.features
              ? {
                  pitch: audioEmotionResult.features.pitch,
                  energy: audioEmotionResult.features.energy,
                  speechRate: audioEmotionResult.features.speech_rate,
                  mfcc: [],
                  pitchVariance: 0,
                  pitchRange: 0,
                  energyVariance: 0,
                  pauseDurationAvg: 0,
                  pauseFrequency: 0,
                  zcrMean: 0,
                  spectralCentroid: 0,
                  spectralRolloff: 0,
                  spectralFlux: 0,
                }
              : null,
          };
        } else {
          // WHY: Reset prevents stale emotion from previous recording affecting current analysis
          // Without reset, text-import would inherit audio emotion from last audio-recording
          pipeline.resetAudioEmotion();
        }

        const { emotion, analysis, topic, gfk, cognitive, fourSides, analysisStatus } = await pipeline.analyzeTextFull(
          transcriptionResult.text,
          {
            emotionAnalysisEnabled: isStepEnabled("textEmotion"),
            fallacyDetectionEnabled: isStepEnabled("fallacyDetection"),
            toneEnabled: false, // Already analyzed from audio
            topicClassificationEnabled: isStepEnabled("topicClassification"),
            gfkAnalysisEnabled: isStepEnabled("gfkAnalysis"),
            cognitiveDistortionEnabled: isStepEnabled("cognitiveDistortions"),
            fourSidesAnalysisEnabled: isStepEnabled("fourSidesAnalysis"),
            onProcessingStepUpdate: onProcessingStepUpdateRef.current ?? undefined,
            abortSignal: abortSignalRef.current,
          }
        );

        if (abortSignalRef.current?.aborted) {
          logger.info("AudioFileImport", "Processing aborted after text analysis");
          return;
        }

        if (isStepEnabled("textEmotion")) {
          onProcessingStepUpdateRef.current?.("textEmotion", "completed");
        }
        if (isStepEnabled("fallacyDetection")) {
          onProcessingStepUpdateRef.current?.("fallacyDetection", "completed");
        }
        if (isStepEnabled("gfkAnalysis")) {
          onProcessingStepUpdateRef.current?.("gfkAnalysis", "completed");
        }
        if (isStepEnabled("cognitiveDistortions")) {
          onProcessingStepUpdateRef.current?.("cognitiveDistortions", "completed");
        }
        if (isStepEnabled("fourSidesAnalysis")) {
          onProcessingStepUpdateRef.current?.("fourSidesAnalysis", "completed");
        }

        logger.info("AudioFileImport", "Text analysis complete", {
          emotion: emotion.primary,
          fallacies: analysis.fallacies.length,
          topic: topic ? topic.topic : "none",
        });

        // Trigger callbacks
        onEmotionUpdateRef.current?.(emotion);
        onAnalysisRef.current?.(transcriptionResult.text, analysis, emotion);
        if (topic) {
          onTopicUpdateRef.current?.(topic);
        }
        if (gfk) {
          onGFKUpdateRef.current?.(gfk);
        }
        if (cognitive) {
          onCognitiveUpdateRef.current?.(cognitive);
        }
        if (fourSides) {
          onFourSidesUpdateRef.current?.(fourSides);
        }

        // Step 6: Storage
        if (isStepEnabled("storage")) {
          onProcessingStepUpdateRef.current?.("storage", "active");

          if (!isTauri) {
            logger.warn("AudioFileImport", "Not in Tauri, skipping storage");
            onProcessingStepUpdateRef.current?.("storage", "skipped");
            return;
          }

          if (abortSignalRef.current?.aborted) {
            logger.info("AudioFileImport", "Processing aborted before storage");
            return;
          }
        } else {
          // Storage not enabled - skip rest of function
          logger.info("AudioFileImport", "Storage disabled, skipping");
          return;
        }

        // Build metadata
        const processingTimeMs = Date.now() - startTime;

        const audioValidation: AudioValidationMeta = {
          rmsEnergy: 0.5, // Placeholder - real value would come from audio analysis
          durationMs: durationSec * 1000,
          sampleCount: Math.floor(durationSec * 16000),
          passed: true,
        };

        const transcription: TranscriptionMeta = {
          text: transcriptionResult.text,
          provider: options.whisperProvider ?? "whisper-cpp",
          model: options.whisperModel ?? "german-turbo",
          language: transcriptionResult.language,
          processingTimeMs,
        };

        const metadata: Partial<RecordingMetadata> = {
          id: "",
          createdAt: "",
          durationMs: durationSec * 1000,
          sampleRate: 16000,
          fileSize: wavBlob.size,
          audioValidation,
          vadStats: null,
          transcription,
          textFilter: null,
          provider: options.whisperProvider ?? "whisper-cpp",
          model: options.whisperModel ?? "german-turbo",
          appVersion: "",
          source: "audio-file",
          analysisResult: {
            emotion: {
              primary: emotion.primary,
              confidence: emotion.confidence,
              secondary: emotion.secondary,
            },
            fallacies: analysis.fallacies.map((f) => ({
              type: f.type,
              confidence: f.confidence,
              quote: f.quote,
              explanation: f.explanation,
              suggestion: f.suggestion,
            })),
            enrichment: analysis.enrichment,
            topic: topic ? {
              topic: topic.topic,
              confidence: topic.confidence,
              keywords: topic.keywords,
            } : undefined,
          },
          tone: toneResult || undefined,
          gfk,
          cognitive,
          fourSides,
          analysisStatus, // P1-4: Track which analyses succeeded vs failed
        };

        logger.info("AudioFileImport", "Saving to storage");

        await invoke<void>("save_recording", {
          audioData: base64Audio,
          metadata,
        });

        if (isStepEnabled("storage")) {
          onProcessingStepUpdateRef.current?.("storage", "completed");
        }

        logger.info("AudioFileImport", "Processing complete", {
          processingTimeMs,
          originalFormat,
          durationSec,
        });
      } catch (error: unknown) {
        logger.error("AudioFileImport", "Processing failed", error);

        // Mark relevant steps as error (only if enabled)
        // Safe error message extraction (handles string errors from Tauri)
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Datei") || errorMessage.includes("Format")) {
          if (isStepEnabled("audioFileImport")) {
            onProcessingStepUpdateRef.current?.("audioFileImport", "error");
          }
        } else if (errorMessage.includes("Transcription") || errorMessage.includes("Whisper")) {
          if (isStepEnabled("transcription")) {
            onProcessingStepUpdateRef.current?.("transcription", "error");
          }
        } else if (errorMessage.includes("Audio") || errorMessage.includes("analyze_audio_from_wav")) {
          if (isStepEnabled("audioEmotion")) {
            onProcessingStepUpdateRef.current?.("audioEmotion", "error");
          }
        } else if (errorMessage.includes("Tone") || errorMessage.includes("analyze_audio_tone")) {
          if (isStepEnabled("toneAnalysis")) {
            onProcessingStepUpdateRef.current?.("toneAnalysis", "error");
          }
        } else if (errorMessage.includes("Analysis") || errorMessage.includes("LLM")) {
          if (isStepEnabled("textEmotion")) {
            onProcessingStepUpdateRef.current?.("textEmotion", "error");
          }
          if (isStepEnabled("fallacyDetection")) {
            onProcessingStepUpdateRef.current?.("fallacyDetection", "error");
          }
        } else if (errorMessage.includes("Storage") || errorMessage.includes("save_recording")) {
          if (isStepEnabled("storage")) {
            onProcessingStepUpdateRef.current?.("storage", "error");
          }
        }

        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTauri, invoke, limits, llmConfig, settings]
  );

  return {
    processAudioFile,
  };
}
