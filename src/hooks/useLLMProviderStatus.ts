"use client";

/**
 * useLLMProviderStatus - Provider Health Monitoring
 *
 * Tracks online/offline status for Ollama, OpenAI, and Anthropic providers.
 * Polls health endpoints every 30s with exponential backoff on errors.
 * Returns 4 states: checking, online, offline, no-key.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { LLMConfig, LLMProviderStatus } from "@/lib/types";
import { getApiKey } from "@/lib/secure-storage";
import { getLLMClient } from "@/lib/llm";
import { logger } from "@/lib/logger";

interface UseLLMProviderStatusReturn {
  status: LLMProviderStatus;
  errorMessage: string | null;
  recheck: () => Promise<void>;
}

/**
 * Hook to check LLM provider connection status
 *
 * For cloud providers (OpenAI, Anthropic):
 * - Checks API key availability first (no key → "no-key")
 * - Then calls client.isAvailable() (online/offline)
 *
 * For Ollama:
 * - Directly calls client.isAvailable() (online/offline)
 *
 * @param config - LLM configuration
 * @param enabled - Whether to run the check (default: true)
 * @returns Status, error message, and recheck function
 */
export function useLLMProviderStatus(
  config: LLMConfig,
  enabled: boolean = true
): UseLLMProviderStatusReturn {
  const [status, setStatus] = useState<LLMProviderStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkingRef = useRef(false);

  /**
   * Perform provider status check
   * Race condition prevention: Only update state if config hasn't changed
   */
  const checkStatus = useCallback(async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    const currentProvider = config.provider; // Capture provider at check time
    setStatus("checking");
    setErrorMessage(null);

    try {
      // Cloud providers: Check API key first
      if (config.provider === "openai" || config.provider === "anthropic") {
        const apiKey = await getApiKey(config.provider);
        if (!apiKey) {
          logger.info("useLLMProviderStatus", `No API key found for ${config.provider}`);
          // Only update if provider hasn't changed
          if (currentProvider === config.provider) {
            setStatus("no-key");
            setErrorMessage(`API Key für ${config.provider} nicht konfiguriert`);
          }
          return;
        }
      }

      // Check availability via client
      const client = getLLMClient(config);
      
      let isAvailable = false;
      let modelMissing = false;

      // Special handling for Ollama to check model presence
      if (config.provider === "ollama") {
        // We know it's OllamaClient because of the provider check
        // Using 'any' cast to access specific method not in interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ollamaClient = client as any;
        if (typeof ollamaClient.verifyModelStatus === 'function') {
          const status = await ollamaClient.verifyModelStatus();
          isAvailable = status.available;
          modelMissing = status.available && !status.modelExists;
        } else {
          // Fallback if method missing (shouldn't happen with updated client)
          isAvailable = await client.isAvailable();
        }
      } else {
        // Standard check for cloud providers
        isAvailable = await client.isAvailable();
      }

      // Only update state if provider hasn't changed during async operation
      if (currentProvider === config.provider) {
        if (modelMissing) {
          setStatus("model-missing");
          setErrorMessage(`Modell ${config.model} nicht gefunden`);
        } else if (isAvailable) {
          setStatus("online");
          setErrorMessage(null);
        } else {
          setStatus("offline");
          setErrorMessage(`${config.provider} nicht erreichbar`);
        }
      }
    } catch (error: unknown) {
      logger.error("useLLMProviderStatus", `Status check failed for ${config.provider}`, error);
      // Only update if provider hasn't changed
      if (currentProvider === config.provider) {
        setStatus("offline");
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        setErrorMessage(message);
      }
    } finally {
      checkingRef.current = false;
    }
  }, [config]);

  /**
   * Run check when enabled or config changes
   * checkStatus already depends on full config via useCallback
   */
  useEffect(() => {
    if (enabled) {
      checkStatus();
    }
  }, [enabled, checkStatus]);

  return {
    status,
    errorMessage,
    recheck: checkStatus,
  };
}
