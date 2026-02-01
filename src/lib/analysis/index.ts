/**
 * Analysis Module - Barrel Exports
 *
 * Re-exports all analysis-related functions and types.
 * Provides AnalysisPipeline, fusion functions, and weight helpers.
 */

// Core Pipeline
export { AnalysisPipeline } from "./pipeline";
export { getAnalysisPipeline } from "./factory";

// Fusion Functions
export {
  fuseEmotions,
  fuseTones,
  calculateBlendRatio,
  calculateBlendedCoordinates,
} from "./fusion";

// Audio Emotion Functions
export {
  convertRustEmotionResult,
  analyzeAudioEmotion,
} from "./audio-emotion";

// Types (re-export for consumers)
export type { AnalysisOptions, UnifiedAnalysisOptions } from "./types";

// ============================================================================
// Internal Exports (NOT re-exported - for internal use only)
// ============================================================================
// - pipeline-helpers.ts functions (buildAnalysisPromises, etc.)
// - types.ts helpers (shouldAnalyzeFallacies, constants)
