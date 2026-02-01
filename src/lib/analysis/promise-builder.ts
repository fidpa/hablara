/**
 * Analysis Promise Builder
 *
 * Erstellt Feature-basierte Promise-Arrays für parallele LLM-Analysen.
 * Nutzt AbortSignal für Cancel-Support. Fixed Order: [emotion, fallacy, tone, gfk, cognitive, fourSides].
 */

import type { LLMClient } from "../llm";
import type { AnalysisPromiseResult } from "./types";

/**
 * Configuration for building analysis promises.
 */
export interface PromiseBuilderConfig {
  emotionAnalysisEnabled: boolean;
  shouldCheckFallacies: boolean;
  includeTone: boolean;
  includeGFK: boolean;
  includeCognitive: boolean;
  includeFourSides: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Build array of analysis promises based on enabled features.
 * All promises are created with AbortSignal support.
 *
 * @param llm - LLM client for analysis calls
 * @param text - Text to analyze
 * @param config - Configuration for which analyses to run
 * @returns Array of promises in fixed order: [emotion, fallacy, tone, gfk, cognitive, fourSides]
 */
export function buildAnalysisPromises(
  llm: LLMClient,
  text: string,
  config: PromiseBuilderConfig
): Promise<AnalysisPromiseResult>[] {
  const { abortSignal } = config;

  return [
    config.emotionAnalysisEnabled
      ? llm.analyzeEmotion(text, abortSignal)
      : Promise.resolve({ primary: "neutral" as const, confidence: 0 }),
    config.shouldCheckFallacies
      ? llm.analyzeArgument(text, abortSignal)
      : Promise.resolve({ fallacies: [], enrichment: "" }),
    config.includeTone
      ? llm.analyzeTone(text, abortSignal)
      : Promise.resolve(undefined),
    config.includeGFK
      ? llm.analyzeGFK(text, abortSignal)
      : Promise.resolve(undefined),
    config.includeCognitive
      ? llm.analyzeCognitiveDistortions(text, abortSignal)
      : Promise.resolve(undefined),
    config.includeFourSides
      ? llm.analyzeFourSides(text, abortSignal)
      : Promise.resolve(undefined),
  ];
}
