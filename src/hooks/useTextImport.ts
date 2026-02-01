"use client";

/**
 * useTextImport - Text-Only Analysis ohne Audio
 *
 * Analysiert reinen Text via LLM Pipeline (Emotion, Fallacies, Tone, Psychological).
 * Callback-Pattern wie useAudioRecorder. Unterstützt Input Limits, Abort Signal,
 * Feature Toggles. Für Text-Import-Mode + Clipboard Hotkey.
 *
 * Security (OWASP A03:2021 Injection Prevention):
 * - Input Sanitization: Control characters removed, Unicode NFC normalized
 * - Prompt Injection Detection: 18 patterns (INJECTION_PATTERNS) with NFKD normalization
 * - Length Limit: 100,000 characters (configurable via limits.maxTextCharacters)
 */

import { useRef, useCallback } from "react";
import { useTauri } from "./useTauri";
import { getAnalysisPipeline } from "@/lib/analysis";
import { logger } from "@/lib/logger";
import { sanitizeInput } from "@/lib/sanitize";
import { INJECTION_PATTERNS } from "@/lib/rag/constants";
import type {
  EmotionState,
  AnalysisResult,
  ToneState,
  ProcessingStepStatus,
  InputSource,
  RecordingMetadata,
  AudioValidationMeta,
  TranscriptionMeta,
  ToneResult,
  InputLimits,
  LLMConfig,
  TopicResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  AppSettings,
} from "@/lib/types";

interface UseTextImportOptions {
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
  llmConfig?: LLMConfig;
  settings?: AppSettings; // For emotion detection mode configuration
}

interface UseTextImportReturn {
  processText: (text: string, source: InputSource) => Promise<void>;
}

/**
 * Hook for importing and analyzing text without audio recording.
 * Follows the same callback pattern as useAudioRecorder.
 *
 * Processing Flow:
 * 1. textImport: Validate text
 * 2. textEmotion + fallacyDetection + toneAnalysis: Parallel LLM analysis
 * 3. storage: Save to disk (no WAV file)
 *
 * @param options - Callbacks and abort signal
 * @returns processText function
 */
export function useTextImport(options: UseTextImportOptions): UseTextImportReturn {
  const { onEmotionUpdate, onAnalysis, onToneUpdate, onTopicUpdate, onGFKUpdate, onCognitiveUpdate, onFourSidesUpdate, onProcessingStepUpdate, abortSignal, limits, enabledSteps, llmConfig, settings } =
    options;

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

  const processText = useCallback(
    async (text: string, source: InputSource): Promise<void> => {
      const startTime = Date.now();

      // Validate and sanitize text (remove control characters, normalize Unicode)
      const sanitized = sanitizeInput(text);
      if (sanitized.length === 0) {
        throw new Error("Text cannot be empty");
      }

      // Check for prompt injection patterns (same defense as RAG pipeline)
      // WHY NFKD (not NFC): Stronger normalization against Unicode Homoglyph Attacks
      // NFKD decomposes compatibility characters (e.g., ① → 1), preventing bypass via lookalikes
      const normalized = sanitized.normalize('NFKD');
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(normalized)) {
          logger.warn("TextImport", "Prompt injection detected, rejecting input", {
            pattern: pattern.source,
            source,
          });
          throw new Error("Eingabe enthält verdächtige Muster und wurde aus Sicherheitsgründen abgelehnt.");
        }
      }

      const maxChars = limits?.maxTextCharacters ?? 100000;

      if (sanitized.length > maxChars) {
        throw new Error(`Text zu lang (max. ${maxChars.toLocaleString()} Zeichen)`);
      }

      try {
        // Step 1: Text Import (validation complete)
        if (isStepEnabled("textImport")) {
          onProcessingStepUpdateRef.current?.("textImport", "active");
        }
        logger.info("TextImport", "Starting text import", { source, length: sanitized.length });

        // Check for abort
        if (abortSignalRef.current?.aborted) {
          logger.info("TextImport", "Processing aborted");
          return;
        }

        if (isStepEnabled("textImport")) {
          onProcessingStepUpdateRef.current?.("textImport", "completed");
        }

        // Step 2: Reset audio emotion to neutral (text-only mode)
        const pipeline = getAnalysisPipeline(llmConfig, settings);
        pipeline.resetAudioEmotion();

        // Step 3-5: Analyze text (emotion + fallacy + tone in parallel)
        if (isStepEnabled("textEmotion")) {
          onProcessingStepUpdateRef.current?.("textEmotion", "active");
        }
        if (isStepEnabled("fallacyDetection")) {
          onProcessingStepUpdateRef.current?.("fallacyDetection", "active");
        }
        if (isStepEnabled("toneAnalysis")) {
          onProcessingStepUpdateRef.current?.("toneAnalysis", "active");
        }

        logger.info("TextImport", "Starting LLM analysis");

        const { emotion, analysis, tone, topic, gfk, cognitive, fourSides, analysisStatus } = await pipeline.analyzeTextFull(sanitized, {
          emotionAnalysisEnabled: isStepEnabled("textEmotion"),
          fallacyDetectionEnabled: isStepEnabled("fallacyDetection"),
          toneEnabled: isStepEnabled("toneAnalysis"),
          topicClassificationEnabled: isStepEnabled("topicClassification"),
          gfkAnalysisEnabled: isStepEnabled("gfkAnalysis"),
          cognitiveDistortionEnabled: isStepEnabled("cognitiveDistortions"),
          fourSidesAnalysisEnabled: isStepEnabled("fourSidesAnalysis"),
          onProcessingStepUpdate: onProcessingStepUpdateRef.current ?? undefined,
          abortSignal: abortSignalRef.current,
        });

        // Check for abort after analysis
        if (abortSignalRef.current?.aborted) {
          logger.info("TextImport", "Processing aborted after analysis");
          return;
        }

        if (isStepEnabled("textEmotion")) {
          onProcessingStepUpdateRef.current?.("textEmotion", "completed");
        }
        if (isStepEnabled("fallacyDetection")) {
          onProcessingStepUpdateRef.current?.("fallacyDetection", "completed");
        }
        if (isStepEnabled("toneAnalysis")) {
          onProcessingStepUpdateRef.current?.("toneAnalysis", "completed");
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

        logger.info("TextImport", "LLM analysis complete", {
          emotion: emotion.primary,
          fallacies: analysis.fallacies.length,
          tone: tone ? "present" : "none",
          topic: topic ? topic.topic : "none",
        });

        // Trigger callbacks
        onEmotionUpdateRef.current?.(emotion);
        onAnalysisRef.current?.(sanitized, analysis, emotion);
        if (tone) {
          onToneUpdateRef.current?.(tone);
        }
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

        // Step 6: Save to storage (if Tauri available)
        if (isStepEnabled("storage")) {
          onProcessingStepUpdateRef.current?.("storage", "active");

          if (!isTauri) {
            logger.warn("TextImport", "Not in Tauri, skipping storage");
            onProcessingStepUpdateRef.current?.("storage", "skipped");
            return;
          }

          // Check for abort before storage
          if (abortSignalRef.current?.aborted) {
            logger.info("TextImport", "Processing aborted before storage");
            return;
          }
        } else {
          // Storage not enabled - skip rest of function
          logger.info("TextImport", "Storage disabled, skipping");
          return;
        }

        // Build metadata for text-import
        const processingTimeMs = Date.now() - startTime;

        const audioValidation: AudioValidationMeta = {
          rmsEnergy: 0,
          durationMs: 0,
          sampleCount: 0,
          passed: true, // Text-import always passes validation
        };

        const transcription: TranscriptionMeta = {
          text: sanitized,
          provider: "text-import",
          model: "manual",
          language: "de",
          processingTimeMs,
        };

        // Convert tone to serializable format
        const toneData: ToneResult | undefined = tone
          ? {
              formality: tone.formality,
              professionalism: tone.professionalism,
              directness: tone.directness,
              energy: tone.energy,
              seriousness: tone.seriousness,
              confidence: tone.confidence,
            }
          : undefined;

        const metadata: Partial<RecordingMetadata> = {
          id: "", // Will be generated by backend
          createdAt: "", // Will be generated by backend
          durationMs: 0, // No audio
          sampleRate: 16000, // Standard
          fileSize: 0, // No audio file
          audioValidation,
          vadStats: null,
          transcription,
          textFilter: null,
          provider: "text-import",
          model: "manual",
          appVersion: "", // Will be set by backend
          source, // "text" or "file"
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
          tone: toneData,
          gfk,
          cognitive,
          fourSides,
          analysisStatus, // P1-4: Track which analyses succeeded vs failed
        };

        logger.info("TextImport", "Saving to storage");

        await invoke<void>("save_recording", {
          audioData: "", // Empty for text-import
          metadata,
        });

        if (isStepEnabled("storage")) {
          onProcessingStepUpdateRef.current?.("storage", "completed");
        }

        logger.info("TextImport", "Processing complete", {
          processingTimeMs,
          source,
        });
      } catch (error: unknown) {
        logger.error("TextImport", "Processing failed", error);

        // Mark relevant steps as error (only if enabled)
        if ((error as Error).message.includes("Analysis")) {
          if (isStepEnabled("textEmotion")) {
            onProcessingStepUpdateRef.current?.("textEmotion", "error");
          }
          if (isStepEnabled("fallacyDetection")) {
            onProcessingStepUpdateRef.current?.("fallacyDetection", "error");
          }
          if (isStepEnabled("toneAnalysis")) {
            onProcessingStepUpdateRef.current?.("toneAnalysis", "error");
          }
        } else if ((error as Error).message.includes("Storage")) {
          if (isStepEnabled("storage")) {
            onProcessingStepUpdateRef.current?.("storage", "error");
          }
        }

        throw error;
      }
    },
    [isTauri, invoke, limits, llmConfig, settings]
  );

  return {
    processText,
  };
}
