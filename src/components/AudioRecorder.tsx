"use client";

/**
 * AudioRecorder - Hidden Audio Processing Component
 *
 * Verwaltet komplette Audio-Pipeline: Recording → Transcription (whisper.cpp/MLX) →
 * Emotion/Fallacy/Tone Analysis → Storage. Rendered kein UI, reagiert nur auf
 * isRecording prop. Koordiniert useAudioRecorder Hook mit Analysis-Pipeline.
 */

import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTauri } from "@/hooks/useTauri";
import { useRecordings } from "@/hooks/useRecordings";
import { getWhisperClient } from "@/lib/whisper";
import { getAnalysisPipeline, convertRustEmotionResult } from "@/lib/analysis";
import { extractAudioFeatures } from "@/lib/whisper";
import { blobToBase64 } from "@/lib/audio-utils";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  showAudioErrorToast,
  showTranscriptionErrorToast,
  showStorageErrorToast,
} from "@/lib/ui/toast-utils";
import type {
  EmotionState,
  EmotionType,
  AnalysisResult,
  AudioFeatures,
  AppSettings,
  RecordingMetadata,
  ProcessingStepStatus,
  ToneState,
  ToneResult,
  TopicResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
} from "@/lib/types";

interface AudioRecorderProps {
  isRecording: boolean;
  onTranscript: (text: string, timestamp: number) => void;
  onEmotionUpdate: (emotion: EmotionState) => void;
  onToneUpdate?: (tone: ToneState) => void;
  onTopicUpdate?: (topic: TopicResult) => void;
  onGFKUpdate?: (gfk: GFKAnalysis) => void;
  onCognitiveUpdate?: (cognitive: CognitiveDistortionResult) => void;
  onFourSidesUpdate?: (fourSides: FourSidesAnalysis) => void;
  onAnalysis: (result: AnalysisResult, emotion: EmotionState) => void;
  onError: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onDurationUpdate?: (duration: number) => void;
  onRecordingSaved?: (recordingId: string) => void;
  onProcessingUpdate?: (stepId: string, status: ProcessingStepStatus, errorMessage?: string) => void;
  abortSignal?: AbortSignal;
  settings?: AppSettings;
}

export default function AudioRecorder({
  isRecording,
  onTranscript,
  onEmotionUpdate,
  onToneUpdate,
  onTopicUpdate,
  onGFKUpdate,
  onCognitiveUpdate,
  onFourSidesUpdate,
  onAnalysis,
  onError,
  onAudioLevel,
  onDurationUpdate,
  onRecordingSaved,
  onProcessingUpdate,
  abortSignal,
  settings,
}: AudioRecorderProps): null {
  const { isTauri } = useTauri();
  const { saveRecording } = useRecordings();
  const { toast } = useToast();
  const pipeline = useRef(getAnalysisPipeline(settings?.llm, settings));
  const processingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const lastLlmProviderRef = useRef<string | null>(null);
  const lastLlmModelRef = useRef<string | null>(null);
  const lastLlmBaseUrlRef = useRef<string | null>(null);
  const lastLlmApiKeyRef = useRef<string | null>(null);

  // Recreate WhisperClient when isTauri status is known OR when provider changes
  // Use ref to track if we've already created the client to prevent re-creation loops
  const whisperRef = useRef<ReturnType<typeof getWhisperClient> | null>(null);
  const lastTauriStatusRef = useRef<boolean | null>(null);
  const lastProviderRef = useRef<string | null>(null);
  const currentProvider = settings?.whisperProvider ?? "whisper-cpp";

  if (
    whisperRef.current === null ||
    lastTauriStatusRef.current !== isTauri ||
    lastProviderRef.current !== currentProvider
  ) {
    lastTauriStatusRef.current = isTauri;
    lastProviderRef.current = currentProvider;
    whisperRef.current = getWhisperClient({
      model: settings?.whisperModel ?? "german-turbo",
      language: settings?.language ?? "de",
      provider: currentProvider,
      mlxModel: settings?.mlxWhisperModel ?? "german-turbo",
      mlxPaths: settings?.mlxPaths,
    }, isTauri);
  }

  // Recreate AnalysisPipeline when LLM settings change (Whisper-Pattern)
  const currentLlmProvider = settings?.llm?.provider ?? "ollama";
  const currentLlmModel = settings?.llm?.model ?? "qwen2.5:7b-custom";
  const currentLlmBaseUrl = settings?.llm?.baseUrl ?? "http://localhost:11434";
  const currentLlmApiKey = settings?.llm?.apiKey ?? "";

  if (
    lastLlmProviderRef.current !== currentLlmProvider ||
    lastLlmModelRef.current !== currentLlmModel ||
    lastLlmBaseUrlRef.current !== currentLlmBaseUrl ||
    lastLlmApiKeyRef.current !== currentLlmApiKey
  ) {
    lastLlmProviderRef.current = currentLlmProvider;
    lastLlmModelRef.current = currentLlmModel;
    lastLlmBaseUrlRef.current = currentLlmBaseUrl;
    lastLlmApiKeyRef.current = currentLlmApiKey;
    pipeline.current = getAnalysisPipeline(settings?.llm, settings);
  }

  // Handle real-time audio data for emotion analysis
  // Note: Level metering is handled directly by useAudioRecorder via onAudioLevel
  const handleAudioData = useCallback((data: Float32Array) => {
    const basicFeatures = extractAudioFeatures(data);
    const features: AudioFeatures = {
      ...basicFeatures,
      mfcc: [], // Would be computed in Rust for performance
      // New prosodic features (placeholder - computed in Rust)
      pitchVariance: 0,
      pitchRange: 0,
      energyVariance: 0,
      pauseDurationAvg: 0,
      pauseFrequency: 0,
      // New spectral features (placeholder - computed in Rust)
      zcrMean: 0,
      spectralCentroid: 0,
      spectralRolloff: 0,
      spectralFlux: 0,
    };
    const emotion = pipeline.current.processAudioFeatures(features);
    onEmotionUpdate(emotion);
  }, [onEmotionUpdate]);

  // Handle audio chunk for transcription
  const handleAudioChunk = useCallback(async (blob: Blob) => {
    if (processingRef.current || !whisperRef.current) return;
    processingRef.current = true;

    try {
      const result = await whisperRef.current.transcribe(blob);

      if (result.text && result.text.trim()) {
        const timestamp = Date.now() - startTimeRef.current;
        onTranscript(result.text.trim(), timestamp);

        // Run full analysis on the transcribed text
        const { emotion, analysis } = await pipeline.current.analyzeText(
          result.text,
          {
            emotionAnalysisEnabled: settings?.emotionAnalysisEnabled ?? true,
            fallacyDetectionEnabled: settings?.fallacyDetectionEnabled ?? true,
          }
        );
        onEmotionUpdate(emotion);
        onAnalysis(analysis, emotion);
      }
    } catch (error: unknown) {
      logger.error('AudioRecorder', 'Chunk processing error', error);
      // Don't report minor transcription errors as critical
    } finally {
      processingRef.current = false;
    }
  }, [onTranscript, onEmotionUpdate, onAnalysis, settings]);

  // Audio recorder hook
  const recorder = useAudioRecorder({
    onAudioData: handleAudioData,
    onAudioChunk: handleAudioChunk,
    onAudioLevel, // Pass level callback directly to hook
    chunkInterval: 3000, // 3 second chunks
    sampleRate: 16000,
    preferNative: true, // Native cpal audio with Web Audio fallback
    maxRecordingMinutes: settings?.limits?.maxRecordingMinutes ?? 30,
  });

  // Store recorder functions in refs to avoid dependency loops
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  // Track if we've started recording to avoid double-start
  const hasStartedRef = useRef(false);

  // Store callbacks in refs to avoid triggering the effect
  const callbacksRef = useRef({ onTranscript, onEmotionUpdate, onToneUpdate, onTopicUpdate, onGFKUpdate, onCognitiveUpdate, onFourSidesUpdate, onAnalysis, onError, onRecordingSaved, onProcessingUpdate, onDurationUpdate });
  callbacksRef.current = { onTranscript, onEmotionUpdate, onToneUpdate, onTopicUpdate, onGFKUpdate, onCognitiveUpdate, onFourSidesUpdate, onAnalysis, onError, onRecordingSaved, onProcessingUpdate, onDurationUpdate };

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const abortSignalRef = useRef(abortSignal);
  abortSignalRef.current = abortSignal;

  // Start/stop recording based on isRecording prop ONLY
  // No other dependencies to prevent unwanted re-runs
  useEffect(() => {
    const rec = recorderRef.current;

    if (isRecording && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startTimeRef.current = Date.now();
      rec.start().catch((err) => {
        logger.error('AudioRecorder', 'Failed to start recording', err);
        hasStartedRef.current = false;

        // Error-Klassifizierung für Audio-Fehler (AUD-001, AUD-002, AUD-003)
        const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

        if (
          errorMessage.includes("notfounderror") ||
          errorMessage.includes("no device") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("no input device")
        ) {
          // AUD-001: Kein Mikrofon
          showAudioErrorToast(toast, "no_device");
        } else if (
          errorMessage.includes("notallowederror") ||
          errorMessage.includes("permission") ||
          errorMessage.includes("denied")
        ) {
          // AUD-002: Berechtigung verweigert
          showAudioErrorToast(toast, "permission_denied");
        } else {
          // AUD-003: Audio Capture fehlgeschlagen (generisch)
          showAudioErrorToast(toast, "capture_failed", errorMessage);
        }

        callbacksRef.current.onError("Mikrofon-Zugriff fehlgeschlagen. Bitte Berechtigungen pruefen.");
      });
    } else if (!isRecording && hasStartedRef.current) {
      hasStartedRef.current = false;
      rec.stop().then(async (blob) => {
        if (blob && blob.size > 0 && whisperRef.current) {
          // Process final audio
          try {
            // Step 1: Transcription
            callbacksRef.current.onProcessingUpdate?.("transcription", "active");

            // Check if Whisper is available
            if (!whisperRef.current) {
              // TRS-001: Whisper nicht verfügbar
              showTranscriptionErrorToast(toast, "whisper_unavailable");
              callbacksRef.current.onProcessingUpdate?.("transcription", "error", "Whisper nicht verfügbar");
              return;
            }

            const result = await whisperRef.current.transcribe(blob);

            // Check if aborted
            if (abortSignalRef.current?.aborted) {
              logger.debug('AudioRecorder', 'Processing aborted after transcription');
              return;
            }

            callbacksRef.current.onProcessingUpdate?.("transcription", "completed");
            if (result.text && result.text.trim()) {
              const timestamp = Date.now() - startTimeRef.current;
              callbacksRef.current.onTranscript(result.text.trim(), timestamp);

              // Analyze audio emotion using AudioAnalyzer V2 (12 features) if Tauri available
              if (isTauri && result.speechDurationSec !== undefined && result.totalDurationSec !== undefined) {
                // Prepare audio data for both emotion and tone analysis
                const audioData = await blobToBase64(blob);

                try {
                  // Step 2: Audio Emotion Analysis
                  callbacksRef.current.onProcessingUpdate?.("audioEmotion", "active");
                  const audioEmotion = await invoke<{
                    primary: string;
                    confidence: number;
                    secondary?: string;
                    features?: { pitch: number; energy: number; speech_rate: number };
                  }>("analyze_audio_from_wav", {
                    audioData,
                    speechDuration: result.speechDurationSec,
                    totalDuration: result.totalDurationSec,
                  });

                  logger.debug('AudioRecorder', 'Audio emotion analyzed (V2, 12 features)', {
                    primary: audioEmotion.primary,
                    confidence: audioEmotion.confidence,
                    secondary: audioEmotion.secondary ?? 'none',
                  });

                  // Convert Rust V2 result to EmotionState with features
                  const audioFeatures: AudioFeatures | undefined = audioEmotion.features
                    ? {
                        // Legacy features (3) from Rust V2
                        pitch: audioEmotion.features.pitch,
                        energy: audioEmotion.features.energy,
                        speechRate: audioEmotion.features.speech_rate,
                        mfcc: [],
                        // Prosodic features (5) - not available in Rust response
                        pitchVariance: 0,
                        pitchRange: 0,
                        energyVariance: 0,
                        pauseDurationAvg: 0,
                        pauseFrequency: 0,
                        // Spectral features (4) - not available in Rust response
                        zcrMean: 0,
                        spectralCentroid: 0,
                        spectralRolloff: 0,
                        spectralFlux: 0,
                      }
                    : undefined;

                  // Update lastAudioEmotion in pipeline for fusion (Rust V2 with 12 audio features)
                  pipeline.current.lastAudioEmotion = convertRustEmotionResult(
                    {
                      primary: audioEmotion.primary as EmotionType,
                      confidence: audioEmotion.confidence,
                      secondary: (audioEmotion.secondary as EmotionType) ?? null,
                      features: audioEmotion.features ?? null,
                    },
                    audioFeatures
                  );
                  callbacksRef.current.onProcessingUpdate?.("audioEmotion", "completed");
                } catch (error: unknown) {
                  logger.error('AudioRecorder', 'Audio emotion analysis failed', error);
                  callbacksRef.current.onProcessingUpdate?.("audioEmotion", "error", "Audio-Emotionsanalyse fehlgeschlagen");
                  // Continue without audio emotion (text-only)
                }

                // Check if aborted after audio emotion
                if (abortSignalRef.current?.aborted) {
                  logger.debug('AudioRecorder', 'Processing aborted after audio emotion');
                  return;
                }

                // Step 2.5: Audio Tone Analysis (if enabled and audio available)
                const toneEnabled = settingsRef.current?.toneAnalysisEnabled ?? true;
                if (toneEnabled) {
                try {
                  callbacksRef.current.onProcessingUpdate?.("toneAnalysis", "active");
                  const audioTone = await invoke<ToneResult>("analyze_audio_tone", {
                    audioData,
                    speechDuration: result.speechDurationSec ?? 0,
                    totalDuration: result.totalDurationSec ?? 0,
                  });

                  // Update lastAudioTone in pipeline for fusion
                  pipeline.current.lastAudioTone = {
                    formality: audioTone.formality,
                    professionalism: audioTone.professionalism,
                    directness: audioTone.directness,
                    energy: audioTone.energy,
                    seriousness: audioTone.seriousness,
                    confidence: audioTone.confidence,
                  };
                  logger.debug('AudioRecorder', 'Audio tone analysis completed', audioTone);
                } catch (error: unknown) {
                  logger.error('AudioRecorder', 'Audio tone analysis failed', error);
                  // Continue without audio tone (text-only)
                }
              }

                // Check if aborted after audio tone
                if (abortSignalRef.current?.aborted) {
                  logger.debug('AudioRecorder', 'Processing aborted after audio tone');
                  return;
                }
              } else {
                // Skip audio emotion/tone if not available (not Tauri)
                callbacksRef.current.onProcessingUpdate?.("audioEmotion", "skipped");
              }

              // Step 3+: Text Emotion + Fallacy + Tone + Psychological (run in parallel via analyzeTextFull)
              const emotionEnabled = settingsRef.current?.emotionAnalysisEnabled ?? true;
              const fallacyEnabled = settingsRef.current?.fallacyDetectionEnabled ?? true;
              const toneEnabled = settingsRef.current?.toneAnalysisEnabled ?? true;
              const topicEnabled = settingsRef.current?.topicClassificationEnabled ?? true;
              const gfkEnabled = settingsRef.current?.psychological?.gfkAnalysisEnabled ?? false;
              const cognitiveEnabled = settingsRef.current?.psychological?.cognitiveDistortionEnabled ?? false;
              const fourSidesEnabled = settingsRef.current?.psychological?.fourSidesAnalysisEnabled ?? false;

              if (emotionEnabled) {
                callbacksRef.current.onProcessingUpdate?.("textEmotion", "active");
              } else {
                callbacksRef.current.onProcessingUpdate?.("textEmotion", "skipped");
              }

              if (fallacyEnabled) {
                callbacksRef.current.onProcessingUpdate?.("fallacyDetection", "active");
              } else {
                callbacksRef.current.onProcessingUpdate?.("fallacyDetection", "skipped");
              }

              if (gfkEnabled) {
                callbacksRef.current.onProcessingUpdate?.("gfkAnalysis", "active");
              }
              if (cognitiveEnabled) {
                callbacksRef.current.onProcessingUpdate?.("cognitiveDistortions", "active");
              }
              if (fourSidesEnabled) {
                callbacksRef.current.onProcessingUpdate?.("fourSidesAnalysis", "active");
              }

              const { emotion, analysis, tone, topic, gfk, cognitive, fourSides, analysisStatus } = await pipeline.current.analyzeTextFull(
                result.text,
                {
                  emotionAnalysisEnabled: emotionEnabled,
                  fallacyDetectionEnabled: fallacyEnabled,
                  toneEnabled: toneEnabled,
                  topicClassificationEnabled: topicEnabled,
                  gfkAnalysisEnabled: gfkEnabled,
                  cognitiveDistortionEnabled: cognitiveEnabled,
                  fourSidesAnalysisEnabled: fourSidesEnabled,
                  abortSignal: abortSignalRef.current,
                }
              );

              // Check if aborted after text analysis
              if (abortSignalRef.current?.aborted) {
                logger.debug('AudioRecorder', 'Processing aborted after text analysis');
                return;
              }

              if (emotionEnabled) {
                callbacksRef.current.onProcessingUpdate?.("textEmotion", "completed");
              }
              if (fallacyEnabled) {
                callbacksRef.current.onProcessingUpdate?.("fallacyDetection", "completed");
              }
              if (toneEnabled) {
                callbacksRef.current.onProcessingUpdate?.("toneAnalysis", "completed");
              }
              if (gfkEnabled) {
                callbacksRef.current.onProcessingUpdate?.("gfkAnalysis", "completed");
              }
              if (cognitiveEnabled) {
                callbacksRef.current.onProcessingUpdate?.("cognitiveDistortions", "completed");
              }
              if (fourSidesEnabled) {
                callbacksRef.current.onProcessingUpdate?.("fourSidesAnalysis", "completed");
              }
              if (topicEnabled) {
                callbacksRef.current.onProcessingUpdate?.("topicClassification", "completed");
              }

              callbacksRef.current.onEmotionUpdate(emotion);
              callbacksRef.current.onAnalysis(analysis, emotion);
              if (tone && toneEnabled) {
                callbacksRef.current.onToneUpdate?.(tone);
              }
              if (topic) {
                callbacksRef.current.onTopicUpdate?.(topic);
              }
              if (gfk && gfkEnabled) {
                callbacksRef.current.onGFKUpdate?.(gfk);
              }
              if (cognitive && cognitiveEnabled) {
                callbacksRef.current.onCognitiveUpdate?.(cognitive);
              }
              if (fourSides && fourSidesEnabled) {
                callbacksRef.current.onFourSidesUpdate?.(fourSides);
              }

              // Step 6: Save recording if storageEnabled
              if (settingsRef.current?.storage?.storageEnabled) {
                try {
                  callbacksRef.current.onProcessingUpdate?.("storage", "active");
                  const audioData = await blobToBase64(blob);
                  const durationMs = Date.now() - startTimeRef.current;

                  const metadata: Omit<RecordingMetadata, "id" | "createdAt" | "appVersion"> = {
                    durationMs,
                    sampleRate: 16000,
                    fileSize: blob.size,
                    audioValidation: {
                      rmsEnergy: 0,
                      durationMs,
                      sampleCount: Math.floor((durationMs / 1000) * 16000),
                      passed: true,
                    },
                    vadStats: null,
                    transcription: {
                      text: result.text,
                      provider: settingsRef.current?.whisperProvider ?? "whisper-cpp",
                      model: (settingsRef.current?.whisperProvider === "mlx-whisper")
                        ? (settingsRef.current?.mlxWhisperModel ?? "german-turbo")
                        : (settingsRef.current?.whisperModel ?? "german-turbo"),
                      language: settingsRef.current?.language ?? "de",
                      processingTimeMs: Date.now() - startTimeRef.current,
                    },
                    textFilter: null,
                    provider: settingsRef.current?.whisperProvider ?? "whisper-cpp",
                    model: (settingsRef.current?.whisperProvider === "mlx-whisper")
                      ? (settingsRef.current?.mlxWhisperModel ?? "german-turbo")
                      : (settingsRef.current?.whisperModel ?? "german-turbo"),
                    emotion: emotion
                      ? {
                          primary: emotion.primary,
                          confidence: emotion.confidence,
                          secondary: emotion.secondary,
                        }
                      : undefined,
                    // Full analysis result for personalized feedback
                    analysisResult: analysis
                      ? {
                          emotion: emotion
                            ? {
                                primary: emotion.primary,
                                confidence: emotion.confidence,
                                secondary: emotion.secondary,
                              }
                            : undefined,
                          fallacies: analysis.fallacies.map((f) => ({
                            type: f.type,
                            confidence: f.confidence,
                            quote: f.quote,
                            explanation: f.explanation,
                            suggestion: f.suggestion,
                          })),
                          enrichment: analysis.enrichment,
                          topic: topic
                            ? {
                                topic: topic.topic,
                                confidence: topic.confidence,
                                keywords: topic.keywords,
                              }
                            : undefined,
                        }
                      : undefined,
                    tone: tone
                      ? {
                          formality: tone.formality,
                          professionalism: tone.professionalism,
                          directness: tone.directness,
                          energy: tone.energy,
                          seriousness: tone.seriousness,
                          confidence: tone.confidence,
                        }
                      : undefined,
                    gfk: gfk ?? undefined,
                    cognitive: cognitive ?? undefined,
                    fourSides: fourSides ?? undefined,
                    analysisStatus, // P1-4: Track which analyses succeeded vs failed
                  };

                  const recordingId = await saveRecording(audioData, metadata);
                  if (recordingId) {
                    logger.info('AudioRecorder', `Recording saved: ${recordingId}`);
                    callbacksRef.current.onRecordingSaved?.(recordingId);
                    callbacksRef.current.onProcessingUpdate?.("storage", "completed");
                  } else {
                    // STR-002: Speichern fehlgeschlagen
                    showStorageErrorToast(toast, "save_failed");
                    callbacksRef.current.onProcessingUpdate?.("storage", "error", "Speichern fehlgeschlagen");
                  }
                } catch (saveError) {
                  logger.error('AudioRecorder', 'Failed to save recording', saveError);

                  // Storage-Error-Klassifizierung (STR-001, STR-002)
                  const errorMessage = saveError instanceof Error ? saveError.message.toLowerCase() : String(saveError).toLowerCase();

                  if (
                    errorMessage.includes("no space") ||
                    errorMessage.includes("disk full") ||
                    errorMessage.includes("enospc") ||
                    errorMessage.includes("insufficient space")
                  ) {
                    // STR-001: Speicherplatz voll
                    showStorageErrorToast(toast, "disk_full");
                  } else {
                    // STR-002: Speichern fehlgeschlagen (generisch)
                    showStorageErrorToast(toast, "save_failed", errorMessage);
                  }

                  callbacksRef.current.onProcessingUpdate?.("storage", "error", "Speichern fehlgeschlagen");
                }
              } else {
                callbacksRef.current.onProcessingUpdate?.("storage", "skipped");
              }
            }
          } catch (error: unknown) {
            logger.error('AudioRecorder', 'Final transcription error', error);

            // TRS-002: Transkription fehlgeschlagen
            const errorMessage = error instanceof Error ? error.message : String(error);
            showTranscriptionErrorToast(toast, "transcription_failed", errorMessage);

            callbacksRef.current.onProcessingUpdate?.("transcription", "error", "Transkription fehlgeschlagen");
          }
        }
      });
    }
    // NO cleanup here - we don't want to cancel on dependency changes
    // isTauri and saveRecording are stable but added for exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isTauri, saveRecording]);

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      if (hasStartedRef.current) {
        hasStartedRef.current = false;
        recorderRef.current.cancel();
      }
    };
  }, []); // Empty deps = only on unmount

  // Duration update callback - throttled to 1Hz (once per second)
  // Reduces parent re-renders from 6000+ to ~300 for a 5-minute recording
  useEffect(() => {
    if (!recorder.isRecording) {
      return;
    }

    // Initial update (show 00:00 immediately)
    callbacksRef.current.onDurationUpdate?.(0);

    // Update once per second
    const intervalId = setInterval(() => {
      callbacksRef.current.onDurationUpdate?.(recorderRef.current.duration);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [recorder.isRecording]);

  // This component doesn't render anything visible
  return null;
}
