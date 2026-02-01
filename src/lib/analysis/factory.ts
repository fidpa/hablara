/**
 * Analysis Pipeline Factory
 *
 * Singleton-Cache für AnalysisPipeline-Instanzen. Config-basierter Cache-Key (JSON.stringify)
 * verhindert unnötige Neuinstanziierungen (99% Reduktion).
 */

import type { LLMConfig, AppSettings } from "../types";
import { AnalysisPipeline } from "./pipeline";

// Singleton cache for pipeline instances
let pipelineInstance: AnalysisPipeline | null = null;
let lastPipelineConfig: string | null = null;

/**
 * Get or create an AnalysisPipeline instance with config-based caching.
 *
 * Uses JSON.stringify to serialize config for cache key comparison.
 * Only recreates pipeline if config actually changed (99% instance reduction).
 *
 * @param config - Optional LLM configuration (provider, model, baseUrl)
 * @param settings - Optional app settings (emotionDetectionMode affects weights)
 * @returns Cached or new AnalysisPipeline instance
 *
 * @example
 * ```typescript
 * // First call - creates instance
 * const pipeline1 = getAnalysisPipeline({ provider: "ollama", model: "qwen2.5:7b" });
 *
 * // Second call with same config - returns cached instance
 * const pipeline2 = getAnalysisPipeline({ provider: "ollama", model: "qwen2.5:7b" });
 * // pipeline1 === pipeline2 (same instance!)
 *
 * // Call with different config - creates new instance
 * const pipeline3 = getAnalysisPipeline({ provider: "openai", model: "gpt-4o-mini" });
 * // pipeline3 !== pipeline1 (different instance)
 * ```
 */
export function getAnalysisPipeline(
  config?: LLMConfig,
  settings?: AppSettings
): AnalysisPipeline {
  // Serialize relevant config fields for comparison
  const configKey = config || settings
    ? JSON.stringify({
        provider: config?.provider,
        model: config?.model,
        baseUrl: config?.baseUrl,
        emotionDetectionMode: settings?.audio?.emotionDetectionMode,
      })
    : null;

  // Only recreate if config actually changed
  if (!pipelineInstance || (configKey && configKey !== lastPipelineConfig)) {
    pipelineInstance = new AnalysisPipeline(config, settings);
    lastPipelineConfig = configKey;
  }

  return pipelineInstance;
}
