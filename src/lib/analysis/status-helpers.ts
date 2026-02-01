/**
 * Analysis Status Helpers
 *
 * Logging + UI-Updates für fehlgeschlagene Analysen. Topic-Classification mit Parallel-Execution.
 * AnalysisStatus-Objekt-Erstellung mit ternary status (success/failed/skipped).
 */

import type { LLMClient } from "../llm";
import type { TopicResult, AnalysisStatus } from "../types";
import { logger } from "../logger";
import {
  ANALYSIS_NAMES,
  ANALYSIS_STEP_IDS,
  type AnalysisPromiseResult,
  type FailedAnalysisConfig,
  type TopicClassificationConfig,
  type AnalysisStatusConfig,
} from "./types";

/**
 * Log failed analyses and optionally notify UI via onProcessingStepUpdate.
 *
 * @param results - Results from Promise.allSettled
 * @param config - Configuration with enabled flags and update callback
 */
export function logFailedAnalyses(
  results: PromiseSettledResult<AnalysisPromiseResult>[],
  config: FailedAnalysisConfig
): void {
  const analysisMap = [
    {
      enabled: config.emotionAnalysisEnabled,
      name: ANALYSIS_NAMES[0],
      stepId: ANALYSIS_STEP_IDS[0],
    },
    {
      enabled: config.shouldCheckFallacies,
      name: ANALYSIS_NAMES[1],
      stepId: ANALYSIS_STEP_IDS[1],
    },
    {
      enabled: config.includeTone,
      name: ANALYSIS_NAMES[2],
      stepId: ANALYSIS_STEP_IDS[2],
    },
    {
      enabled: config.includeGFK,
      name: ANALYSIS_NAMES[3],
      stepId: ANALYSIS_STEP_IDS[3],
    },
    {
      enabled: config.includeCognitive,
      name: ANALYSIS_NAMES[4],
      stepId: ANALYSIS_STEP_IDS[4],
    },
    {
      enabled: config.includeFourSides,
      name: ANALYSIS_NAMES[5],
      stepId: ANALYSIS_STEP_IDS[5],
    },
  ];

  results.forEach((result, index) => {
    if (
      result &&
      result.status === "rejected" &&
      analysisMap[index] &&
      analysisMap[index].enabled
    ) {
      const { name, stepId } = analysisMap[index];
      logger.error(
        "AnalysisPipeline",
        `${name} failed - using fallback`,
        result.reason
      );

      if (config.onProcessingStepUpdate) {
        config.onProcessingStepUpdate(
          stepId,
          "error",
          `${name} fehlgeschlagen`
        );
      }
    }
  });
}

/**
 * Handle topic classification with UI notifications.
 *
 * @param llm - LLM client for classification
 * @param text - Text to classify
 * @param config - Configuration with enabled flag and callbacks
 * @returns Topic result or undefined if disabled/failed
 */
export async function handleTopicClassification(
  llm: LLMClient,
  text: string,
  config: TopicClassificationConfig
): Promise<TopicResult | undefined> {
  if (!config.topicClassificationEnabled) return undefined;

  if (config.onProcessingStepUpdate) {
    config.onProcessingStepUpdate("topicClassification", "active");
    try {
      const result = await llm.classifyTopic(text, config.abortSignal);
      config.onProcessingStepUpdate("topicClassification", "completed");
      return result;
    } catch (error) {
      logger.error("AnalysisPipeline", "Topic classification failed", error);
      config.onProcessingStepUpdate(
        "topicClassification",
        "error",
        "Klassifikation fehlgeschlagen"
      );
      return undefined;
    }
  } else {
    try {
      return await llm.classifyTopic(text, config.abortSignal);
    } catch (error) {
      logger.error("AnalysisPipeline", "Topic classification failed", error);
      return undefined;
    }
  }
}

/**
 * Build AnalysisStatus object from Promise.allSettled results.
 *
 * @param results - Results from Promise.allSettled
 * @param config - Configuration with enabled flags and topic result
 * @returns AnalysisStatus with success/failed/skipped for each analysis
 */
export function buildAnalysisStatus(
  results: PromiseSettledResult<AnalysisPromiseResult>[],
  config: AnalysisStatusConfig
): AnalysisStatus {
  return {
    emotion: !config.emotionAnalysisEnabled
      ? "skipped"
      : results[0] && results[0].status === "fulfilled"
      ? "success"
      : "failed",
    fallacy: !config.shouldCheckFallacies
      ? "skipped"
      : results[1] && results[1].status === "fulfilled"
      ? "success"
      : "failed",
    tone: !config.includeTone
      ? "skipped"
      : results[2] && results[2].status === "fulfilled"
      ? "success"
      : "failed",
    gfk: !config.includeGFK
      ? "skipped"
      : results[3] && results[3].status === "fulfilled"
      ? "success"
      : "failed",
    cognitive: !config.includeCognitive
      ? "skipped"
      : results[4] && results[4].status === "fulfilled"
      ? "success"
      : "failed",
    fourSides: !config.includeFourSides
      ? "skipped"
      : results[5] && results[5].status === "fulfilled"
      ? "success"
      : "failed",
    topic: !config.topicClassificationEnabled
      ? "skipped"
      : config.topicResult !== undefined
      ? "success"
      : "failed",
  };
}
