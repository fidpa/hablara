/**
 * Analysis Pipeline Type Definitions
 *
 * AnalysisPromiseResult Union, ExtractedResults, Config-Interfaces für Promise-Builder,
 * Status-Helpers, Topic-Classification. Shared Types für alle analysis-Module.
 */

import type {
  EmotionState,
  AnalysisResult,
  ToneResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
} from "../types";

// Union type for analysis promise results (shared across pipeline helpers)
export type AnalysisPromiseResult =
  | Partial<EmotionState>
  | AnalysisResult
  | ToneResult
  | GFKAnalysis
  | CognitiveDistortionResult
  | FourSidesAnalysis
  | undefined;

/**
 * Extracted results from analysis promises.
 */
export interface ExtractedResults {
  textEmotion: Partial<EmotionState>;
  fallacyAnalysis: AnalysisResult;
  textTone: ToneResult | undefined;
  gfkResult: GFKAnalysis | undefined;
  cognitiveResult: CognitiveDistortionResult | undefined;
  fourSidesResult: FourSidesAnalysis | undefined;
}

// ============================================================================
// Helper Config Interfaces (for pipeline helpers)
// ============================================================================

/** Processing step update callback type. */
export type ProcessingStepUpdateFn = (
  stepId: string,
  status: "active" | "completed" | "error",
  errorMessage?: string
) => void;

/** Configuration for logging failed analyses. */
export interface FailedAnalysisConfig {
  emotionAnalysisEnabled: boolean;
  shouldCheckFallacies: boolean;
  includeTone: boolean;
  includeGFK: boolean;
  includeCognitive: boolean;
  includeFourSides: boolean;
  onProcessingStepUpdate?: ProcessingStepUpdateFn;
}

/** Configuration for topic classification. */
export interface TopicClassificationConfig {
  topicClassificationEnabled: boolean;
  onProcessingStepUpdate?: ProcessingStepUpdateFn;
  abortSignal?: AbortSignal;
}

/** Configuration for building analysis status. */
export interface AnalysisStatusConfig {
  emotionAnalysisEnabled: boolean;
  shouldCheckFallacies: boolean;
  includeTone: boolean;
  includeGFK: boolean;
  includeCognitive: boolean;
  includeFourSides: boolean;
  topicResult?: import("../types").TopicResult;
  topicClassificationEnabled: boolean;
}

// ============================================================================
// Analysis Options
// ============================================================================

// Analysis options for conditional processing
export interface AnalysisOptions {
  emotionAnalysisEnabled?: boolean;
  fallacyDetectionEnabled?: boolean;
  topicClassificationEnabled?: boolean;
  gfkAnalysisEnabled?: boolean;
  cognitiveDistortionEnabled?: boolean;
  fourSidesAnalysisEnabled?: boolean;
  onProcessingStepUpdate?: (
    stepId: string,
    status: "active" | "completed" | "error",
    errorMessage?: string
  ) => void;
  abortSignal?: AbortSignal;
}

// Internal unified analysis options (extends AnalysisOptions)
export interface UnifiedAnalysisOptions extends AnalysisOptions {
  includeTone?: boolean;
  includeGFK?: boolean;
  includeCognitive?: boolean;
  includeFourSides?: boolean;
}

/**
 * Pre-filter thresholds for fallacy detection.
 *
 * Rationale (argumentation theory):
 * - 40 chars: Minimum for claim + reason structure ("X because Y")
 * - 6 words: German arguments typically need subject + verb + object + qualifier
 *
 * Shorter texts (greetings, acknowledgments) cannot contain logical fallacies
 * by definition (no argument structure present).
 */
export const MIN_CHARS_FOR_FALLACY = 40;
export const MIN_WORDS_FOR_FALLACY = 6;

// Patterns that indicate non-argumentative text (greetings, farewells, simple responses)
export const SKIP_PATTERNS = [
  /^(guten\s+(tag|morgen|abend)|hallo|hi|hey|moin|servus)/i,
  /^(tschuess|auf wiedersehen|bye|ciao|tschau)/i,
  /^(danke|bitte|ja|nein|ok|okay|alles klar|genau|verstehe|klar)$/i,
  /^(wie geht('s|s)?|was geht|na)/i,
  /^(gru(ss|ess)\s*(gott|dich))/i,
] as const;

// Analysis names for error logging (module-level constant per TYPESCRIPT.md guidelines)
export const ANALYSIS_NAMES = [
  "Emotion Analysis",
  "Fallacy Detection",
  "Tone Analysis",
  "GFK-Analyse",
  "Cognitive Distortion",
  "Four Sides Model",
] as const;

// Processing step IDs for UI updates (parallel with ANALYSIS_NAMES)
export const ANALYSIS_STEP_IDS = [
  "textEmotion",
  "fallacyDetection",
  "toneAnalysis",
  "gfkAnalysis",
  "cognitive",
  "fourSides",
] as const;

/**
 * Determines if text should be analyzed for logical fallacies.
 * Short greetings, farewells, and simple responses are skipped.
 */
export function shouldAnalyzeFallacies(text: string): boolean {
  const trimmed = text.trim();

  // Skip if too short
  if (trimmed.length < MIN_CHARS_FOR_FALLACY) {
    return false;
  }

  // Skip if too few words
  const words = trimmed.split(/\s+/);
  if (words.length < MIN_WORDS_FOR_FALLACY) {
    return false;
  }

  // Skip if matches non-argumentative patterns
  if (SKIP_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  return true;
}
