/**
 * OpenAI Client - Cloud LLM Provider
 *
 * Implements provider-specific methods for OpenAI (gpt-4o-mini).
 * Requires API key stored in OS keychain.
 * Provides health checks via /v1/models endpoint.
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
import { corsSafeFetch } from "../helpers/tauri-fetch";

export class OpenAIClient extends BaseLLMClient {
  private apiKey: string | null = null;
  private timeoutMs: number;

  constructor(config: LLMConfig & { onError?: (error: LLMError) => void; timeoutMs?: number }) {
    super("openai", config.model, config.onError);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_LLM_TIMEOUTS.openai;

    logger.info("OpenAIClient", "LLM Client initialized", {
      provider: "openai",
      model: this.model,
      engine: "OpenAI API",
    });
  }

  private async ensureAPIKey(): Promise<string> {
    // Always fetch fresh key (removes cache invalidation issue)
    // Overhead: ~5ms per call (keychain lookup is fast, acceptable for 2-4s LLM calls)
    this.apiKey = await getApiKey("openai");
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured. Please add it in Settings.");
    }
    return this.apiKey;
  }

  // ============================================================================
  // Provider-Specific Implementation
  // ============================================================================

  protected async _generate(prompt: string, maxTokens: number, signal?: AbortSignal, _format?: string): Promise<string> {
    const apiKey = await this.ensureAPIKey();

    // Combine user-provided signal with timeout signal (prevents infinite hang)
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await corsSafeFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: LLM_GENERATION_PARAMS.temperature,
          top_p: LLM_GENERATION_PARAMS.topP,
        }),
        signal: combinedSignal,
      }, "OpenAIClient");

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(sanitizeErrorMessage(rawError, response.status));
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error: unknown) {
      // Enhanced error message for timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`OpenAI timeout after ${this.timeoutMs / 1000}s - API möglicherweise überlastet`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = await this.ensureAPIKey();

      // Ping OpenAI models endpoint (lightweight, no billing)
      const response = await corsSafeFetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(LLM_HEALTH_CHECK_TIMEOUT),
      }, "OpenAIClient");

      // API reachable if we get ANY HTTP response (not a network error)
      // 200 = success, 401 = auth error, 429 = rate limit
      // All indicate the API is reachable (just auth/request issues)
      return true;
    } catch {
      // Network error, timeout - API not reachable
      return false;
    }
  }

  async generateChat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
  ): Promise<string> {
    const apiKey = await this.ensureAPIKey();

    // Combine user-provided signal with timeout signal
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = options?.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await corsSafeFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? 512,
          temperature: options?.temperature ?? LLM_GENERATION_PARAMS.temperature,
          top_p: LLM_GENERATION_PARAMS.topP,
        }),
        signal: combinedSignal,
      }, "OpenAIClient");

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(sanitizeErrorMessage(rawError, response.status));
      }

      const data = await response.json();
      const rawResponse = data.choices[0]?.message?.content || "";
      const cleanedResponse = stripMarkdownCodeBlock(rawResponse, "OpenAIClient");

      // Apply minimal safety filter (extreme clinical content only)
      return filterCriticalContent(cleanedResponse);
    } catch (error: unknown) {
      // Enhanced error message for timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`OpenAI timeout after ${this.timeoutMs / 1000}s - API möglicherweise überlastet`);
      }
      throw error;
    }
  }
}
