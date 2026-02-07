// ============================================
// LLM Factory - Singleton Client Management
// ============================================
// Manages LLM client instances with caching to prevent unnecessary recreations
// Uses config-based cache invalidation

import { logger } from "../logger";
import { OllamaClient, OpenAIClient, AnthropicClient } from "./providers";
import type { LLMClient } from "./client-interface";
import type { LLMConfig } from "../types";
import { DEFAULT_LLM_TIMEOUTS } from "../types";
import type { LLMError } from "./error-types";

// Default LLM configuration (Ollama as default)
const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "ollama",
  model: "qwen2.5:7b-custom",
  baseUrl: "http://127.0.0.1:11434",
};

// Singleton pattern for LLM client
let clientInstance: LLMClient | undefined = undefined;
let currentProvider: string | undefined = undefined;

/**
 * Options for getLLMClient
 */
export interface GetLLMClientOptions {
  config?: LLMConfig;
  onError?: (error: LLMError) => void;
}

/**
 * Get or create LLM client based on provider
 *
 * Factory function that creates the appropriate client (Ollama, OpenAI, or Anthropic)
 * based on the provider specified in config. Reuses existing client if provider hasn't changed.
 *
 * @param configOrOptions - LLM configuration or options object with onError callback
 * @returns LLMClient instance (OllamaClient, OpenAIClient, or AnthropicClient)
 */
export function getLLMClient(configOrOptions?: LLMConfig | GetLLMClientOptions): LLMClient {
  // Handle both old signature (config only) and new signature (options object)
  let config: LLMConfig | undefined;
  let onError: ((error: LLMError) => void) | undefined;

  if (configOrOptions && "onError" in configOrOptions) {
    config = configOrOptions.config;
    onError = configOrOptions.onError;
  } else {
    config = configOrOptions as LLMConfig | undefined;
  }

  const finalConfig = config || DEFAULT_LLM_CONFIG;

  // Inject provider-specific timeout
  const timeoutMs = DEFAULT_LLM_TIMEOUTS[finalConfig.provider];

  // Determine if client needs recreation
  const needsRecreate =
    !clientInstance ||
    currentProvider !== finalConfig.provider ||
    // Only check model for Ollama (OpenAI/Anthropic have fixed models)
    (config && finalConfig.provider === "ollama" && clientInstance.model !== finalConfig.model);

  if (needsRecreate) {
    let newClient: LLMClient;
    const clientConfig = { ...finalConfig, timeoutMs, onError };

    switch (finalConfig.provider) {
      case "openai":
        newClient = new OpenAIClient(clientConfig);
        break;
      case "anthropic":
        newClient = new AnthropicClient(clientConfig);
        break;
      case "ollama":
      default:
        newClient = new OllamaClient(clientConfig);
    }
    clientInstance = newClient;
    currentProvider = finalConfig.provider;
    logger.info("LLMFactory", "Client created", {
      provider: finalConfig.provider,
      model: finalConfig.model,
      timeoutMs,
      hasErrorCallback: !!onError,
    });
  } else if (clientInstance) {
    // Only log reuse if client actually exists
    logger.debug("LLMFactory", "Client reused", {
      provider: currentProvider,
      model: clientInstance.model,
    });
  }

  // Safety check: clientInstance is always defined at this point
  // because needsRecreate is true when !clientInstance
  if (!clientInstance) {
    throw new Error("LLM client initialization failed");
  }
  return clientInstance;
}

/**
 * Backward compatibility alias for getLLMClient
 * @deprecated Use getLLMClient() instead
 */
export const getOllamaClient = getLLMClient;
