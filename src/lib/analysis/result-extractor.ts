/**
 * Analysis Result Extractor
 *
 * Extrahiert fulfilled/rejected values aus Promise.allSettled. Liefert Fallback-Values für Fehler.
 * Fixed Order: [emotion, fallacy, tone, gfk, cognitive, fourSides].
 */

import type {
  EmotionState,
  AnalysisResult,
  ToneResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
} from "../types";
import type { AnalysisPromiseResult, ExtractedResults } from "./types";

/**
 * Extract fulfilled/rejected values from Promise.allSettled results.
 * Provides fallback values for rejected promises.
 *
 * @param results - Results from Promise.allSettled in fixed order
 * @returns Extracted results with fallback values for failures
 */
export function extractAnalysisResults(
  results: PromiseSettledResult<AnalysisPromiseResult>[]
): ExtractedResults {
  return {
    textEmotion:
      results[0] && results[0].status === "fulfilled"
        ? (results[0].value as Partial<EmotionState>)
        : { primary: "neutral" as const, confidence: 0 },
    fallacyAnalysis:
      results[1] && results[1].status === "fulfilled"
        ? (results[1].value as AnalysisResult)
        : { fallacies: [], enrichment: "" },
    textTone:
      results[2] && results[2].status === "fulfilled"
        ? (results[2].value as ToneResult | undefined)
        : undefined,
    gfkResult:
      results[3] && results[3].status === "fulfilled"
        ? (results[3].value as GFKAnalysis | undefined)
        : undefined,
    cognitiveResult:
      results[4] && results[4].status === "fulfilled"
        ? (results[4].value as CognitiveDistortionResult | undefined)
        : undefined,
    fourSidesResult:
      results[5] && results[5].status === "fulfilled"
        ? (results[5].value as FourSidesAnalysis | undefined)
        : undefined,
  };
}
