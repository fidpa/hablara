/**
 * Anthropic Client - Cloud LLM Provider
 *
 * Implements provider-specific methods for Anthropic (claude-sonnet-4).
 * Requires API key stored in OS keychain.
 * Uses Messages API v2023-06-01.
 *
 * NOTE: Uses Tauri HTTP plugin to bypass CORS restrictions.
 * Anthropic API does not support browser CORS - direct fetch() fails with 400 on preflight.
 */

import { BaseLLMClient } from "../base-client";
import type { LLMConfig } from "../../types";
import type { LLMError } from "../error-types";
import { logger } from "../../logger";
import { getApiKey } from "../../secure-storage";
import { DEFAULT_LLM_TIMEOUTS, LLM_HEALTH_CHECK_TIMEOUT } from "../../types";
import { LLM_GENERATION_PARAMS } from "../helpers/analysis-config";
import { filterCriticalContent } from "../../safety-filter";
import { sanitizeErrorMessage } from "../helpers/error-sanitizer";
import { stripMarkdownCodeBlock } from "../helpers/strip-markdown-wrapper";

const ANTHROPIC_VERSION = "2023-06-01";

// Tauri fetch lazy-loaded to avoid SSR issues
let tauriFetchPromise: Promise<typeof fetch | null> | null = null;

/**
 * Get Tauri fetch function (lazy-loaded)
 * Returns null in non-Tauri environment
 */
async function getTauriFetch(): Promise<typeof fetch | null> {
  // SSR guard
  if (typeof window === "undefined") {
    return null;
  }

  // Check for Tauri environment
  const hasTauri = "__TAURI_INTERNALS__" in window;

  if (!hasTauri) {
    return null;
  }

  // Lazy load the plugin (reset on failure to allow retry)
  if (!tauriFetchPromise) {
    tauriFetchPromise = import("@tauri-apps/plugin-http")
      .then((m) => {
        logger.info("AnthropicClient", "Tauri HTTP plugin loaded successfully");
        return m.fetch;
      })
      .catch((err) => {
        logger.error("AnthropicClient", "Failed to load Tauri HTTP plugin", err);
        // Reset promise to allow retry on next call
        tauriFetchPromise = null;
        return null;
      });
  }

  return tauriFetchPromise;
}

/**
 * CORS-safe fetch for Anthropic API
 *
 * Priority:
 * 1. Tauri HTTP plugin (bypasses CORS, no header needed)
 * 2. Native fetch with anthropic-dangerous-direct-browser-access header
 *
 * The CORS header is required by Anthropic for browser requests.
 * In Tauri desktop app, this is a fallback when plugin fails to load.
 */
async function anthropicFetch(url: string, init: RequestInit): Promise<Response> {
  const tauriFetch = await getTauriFetch();

  if (tauriFetch) {
    logger.debug("AnthropicClient", "Using Tauri HTTP plugin for request");
    return tauriFetch(url, init);
  }

  // Browser fallback with CORS header
  // Required by Anthropic: https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
  logger.warn("AnthropicClient", "Using native fetch with CORS header (Tauri plugin unavailable)");

  // Merge CORS header into existing headers (preserves plain object format for compatibility)
  const existingHeaders = init.headers as Record<string, string> | undefined;
  const headers = {
    ...existingHeaders,
    "anthropic-dangerous-direct-browser-access": "true",
  };

  return fetch(url, { ...init, headers });
}

export class AnthropicClient extends BaseLLMClient {
  private apiKey: string | null = null;
  private timeoutMs: number;

  constructor(config: LLMConfig & { onError?: (error: LLMError) => void; timeoutMs?: number }) {
    super("anthropic", config.model, config.onError);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_LLM_TIMEOUTS.anthropic;

    logger.info("AnthropicClient", "LLM Client initialized", {
      provider: "anthropic",
      model: this.model,
      engine: "Anthropic API",
    });
  }

  private async ensureAPIKey(): Promise<string> {
    // Always fetch fresh key (removes cache invalidation issue)
    // Overhead: ~5ms per call (keychain lookup is fast, acceptable for 2-4s LLM calls)
    this.apiKey = await getApiKey("anthropic");
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured. Please add it in Settings.");
    }
    return this.apiKey;
  }

  // ============================================================================
  // Provider-Specific Implementation
  // ============================================================================

  protected async _generate(prompt: string, maxTokens: number, signal?: AbortSignal): Promise<string> {
    const apiKey = await this.ensureAPIKey();

    // AbortSignal Strategy:
    // - If user provides signal: Trust it (user controls abort + timeout)
    // - Otherwise: Use internal timeout signal as protection
    // - Tauri HTTP plugin has limited AbortSignal support, so we keep it simple
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);

    try {
      const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          // CORS header required for all requests (Tauri plugin may still be detected as browser)
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          temperature: LLM_GENERATION_PARAMS.temperature,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: signal ?? timeoutSignal,
      });

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(sanitizeErrorMessage(rawError, response.status));
      }

      const data = await response.json();

      // Defensive API response validation (TYPESCRIPT.md pattern)
      if (!Array.isArray(data.content) || data.content.length === 0) {
        logger.warn("AnthropicClient", "_generate: Unexpected API response structure", {
          hasContent: !!data.content,
          isArray: Array.isArray(data.content),
        });
        return "";
      }

      const firstBlock = data.content[0];
      if (firstBlock?.type !== "text" || typeof firstBlock.text !== "string") {
        logger.warn("AnthropicClient", "_generate: Unexpected content block type", {
          type: firstBlock?.type,
        });
        return "";
      }

      return firstBlock.text;
    } catch (error: unknown) {
      // Enhanced error message for timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        const timeoutSec = Math.round(this.timeoutMs / 1000);
        throw new Error(`Anthropic timeout after ${timeoutSec}s - API möglicherweise überlastet`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = await this.ensureAPIKey();

      // Anthropic has no models endpoint - use minimal ping with max_tokens: 1
      // CORS header included for all requests (defense-in-depth)
      const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(LLM_HEALTH_CHECK_TIMEOUT),
      });

      // API reachable if we get ANY HTTP response (not a network error)
      // 200 = success, 400 = bad request, 401 = auth error, 429 = rate limit
      // All indicate the API is reachable (just auth/request issues)
      // Only 5xx would indicate server problems, but API is still "reachable"
      return true;
    } catch {
      // Network error, timeout, CORS - API not reachable
      return false;
    }
  }

  async generateChat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
  ): Promise<string> {
    const apiKey = await this.ensureAPIKey();

    // Anthropic requires system message separately
    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const chatMessages = messages.filter((m) => m.role !== "system");

    // AbortSignal Strategy: User signal takes precedence, fallback to timeout
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);

    try {
      const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          // CORS header required for all requests (defense-in-depth)
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? 512,
          temperature: options?.temperature ?? LLM_GENERATION_PARAMS.temperature,
          ...(systemMessage && { system: systemMessage }),
          messages: chatMessages,
        }),
        signal: options?.signal ?? timeoutSignal,
      });

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(sanitizeErrorMessage(rawError, response.status));
      }

      const data = await response.json();

      // Defensive API response validation (TYPESCRIPT.md pattern)
      if (!Array.isArray(data.content) || data.content.length === 0) {
        logger.warn("AnthropicClient", "generateChat: Unexpected API response structure", {
          hasContent: !!data.content,
          isArray: Array.isArray(data.content),
        });
        return "";
      }

      const firstBlock = data.content[0];
      if (firstBlock?.type !== "text" || typeof firstBlock.text !== "string") {
        logger.warn("AnthropicClient", "generateChat: Unexpected content block type", {
          type: firstBlock?.type,
        });
        return "";
      }

      const rawResponse = firstBlock.text;
      const cleanedResponse = stripMarkdownCodeBlock(rawResponse, "AnthropicClient");

      // Apply minimal safety filter (extreme clinical content only)
      return filterCriticalContent(cleanedResponse);
    } catch (error: unknown) {
      // Enhanced error message for timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        const timeoutSec = Math.round(this.timeoutMs / 1000);
        throw new Error(`Anthropic timeout after ${timeoutSec}s - API möglicherweise überlastet`);
      }
      throw error;
    }
  }
}
