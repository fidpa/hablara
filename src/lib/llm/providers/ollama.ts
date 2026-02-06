/**
 * Ollama Client - Local LLM Provider
 *
 * Implements provider-specific methods for Ollama (local inference).
 * Supports MLX acceleration with Python subprocess fallback.
 * Provides health checks via /api/tags endpoint.
 */

import { invoke } from "@tauri-apps/api/core";
import { BaseLLMClient } from "../base-client";
import type { LLMConfig, EmotionState, AnalysisResult } from "../../types";
import type { LLMError } from "../error-types";
import { logger } from "../../logger";
import { DEFAULT_LLM_TIMEOUTS, LLM_LOCAL_HEALTH_CHECK_TIMEOUT, MLX_INVOKE_TIMEOUT } from "../../types";
import { toEmotionType, toFallacyType } from "../type-guards";
import { ANALYSIS_THRESHOLDS, LLM_GENERATION_PARAMS } from "../helpers/analysis-config";
import type {
  ArgumentAnalysisResponse,
} from "../response-parsers";
import { filterCriticalContent } from "../../safety-filter";
import { stripMarkdownCodeBlock } from "../helpers/strip-markdown-wrapper";
import { corsSafeFetch } from "../helpers/tauri-fetch";

// MLX_INVOKE_TIMEOUT imported from types.ts

export class OllamaClient extends BaseLLMClient {
  private baseUrl: string;
  private useMlx: boolean;
  private mlxPaths: { pythonPath: string; modelsDir: string };
  private timeoutMs: number;

  constructor(config: LLMConfig & { onError?: (error: LLMError) => void; timeoutMs?: number }) {
    super("ollama", config.model, config.onError);
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.useMlx = config.useMlx || false;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_LLM_TIMEOUTS.ollama;
    this.mlxPaths = {
      pythonPath: "~/.venvs/mlx-whisper/bin/python",
      modelsDir: "~/mlx-models",
    };

    logger.info("OllamaClient", "LLM Client initialized", {
      provider: config.provider,
      model: this.model,
      mlxEnabled: this.useMlx,
      engine: this.useMlx ? "MLX (optional) + Ollama (default)" : "Ollama",
    });
  }

  // ============================================================================
  // Provider-Specific Implementation
  // ============================================================================

  protected async _generate(prompt: string, maxTokens: number, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    // Combine user-provided signal with timeout signal (prevents infinite hang)
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await corsSafeFetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: LLM_GENERATION_PARAMS.temperature,
            top_p: LLM_GENERATION_PARAMS.topP,
            num_predict: maxTokens,
          },
        }),
        signal: combinedSignal,
      }, "OllamaClient");

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${rawError.slice(0, 200)}`);
      }
      const data = await response.json();
      return data.response;
    } catch (error: unknown) {
      // Enhanced error message for timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`Ollama timeout after ${this.timeoutMs / 1000}s - Server möglicherweise überlastet oder nicht erreichbar`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await corsSafeFetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(LLM_LOCAL_HEALTH_CHECK_TIMEOUT),
      }, "OllamaClient");
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Verify Ollama model availability
   * @returns Object with server availability and model existence
   */
  async verifyModelStatus(): Promise<{ available: boolean; modelExists: boolean }> {
    try {
      const response = await corsSafeFetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(LLM_LOCAL_HEALTH_CHECK_TIMEOUT),
      }, "OllamaClient");

      if (!response.ok) {
        return { available: false, modelExists: false };
      }

      const data = await response.json();
      const models = data.models || [];

      // Check if configured model exists (exact match or with tag suffix)
      const modelExists = models.some(
        (m: { name: string }) =>
          m.name === this.model || m.name.startsWith(`${this.model}:`)
      );

      return { available: true, modelExists };
    } catch {
      return { available: false, modelExists: false };
    }
  }

  async generateChat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
  ): Promise<string> {
    const combinedPrompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
    const response = await this._generate(combinedPrompt, options?.maxTokens ?? 512, options?.signal);
    const cleanedResponse = stripMarkdownCodeBlock(response, "OllamaClient");

    // Apply minimal safety filter (extreme clinical content only)
    return filterCriticalContent(cleanedResponse);
  }

  // ============================================================================
  // MLX-Enhanced Overrides (Ollama-specific)
  // ============================================================================

  override async analyzeEmotion(text: string, signal?: AbortSignal): Promise<Partial<EmotionState>> {
    if (signal?.aborted) throw new Error("Request aborted before starting");
    if (text.trim().length < ANALYSIS_THRESHOLDS.emotion) {
      logger.debug("OllamaClient", `Text too short (${text.trim().length} chars), returning neutral`);
      return { primary: "neutral", confidence: 0.3 };
    }

    // Try MLX first if enabled (3-4x faster)
    if (this.useMlx) {
      try {
        const mlxPromise = invoke<{ primary: string; confidence: number; markers?: string[] }>(
          "analyze_emotion_mlx_cmd",
          { text, model: "qwen2.5-7b", mlxPaths: this.mlxPaths }
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("MLX timeout")), MLX_INVOKE_TIMEOUT)
        );

        const result = await Promise.race([mlxPromise, timeoutPromise]);
        return { primary: toEmotionType(result.primary), confidence: result.confidence, markers: result.markers || [] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "unknown";
        logger.warn("OllamaClient", `MLX emotion analysis failed: ${msg}, falling back to Ollama`);
      }
    }

    // Ollama fallback (or default)
    return super.analyzeEmotion(text, signal);
  }

  override async analyzeArgument(text: string, signal?: AbortSignal): Promise<AnalysisResult> {
    if (signal?.aborted) throw new Error("Request aborted before starting");
    if (text.trim().length < ANALYSIS_THRESHOLDS.argument) {
      logger.debug("OllamaClient", `Text too short (${text.trim().length} chars), skipping fallacy analysis`);
      return { fallacies: [], enrichment: "" };
    }

    // Try MLX first if enabled
    if (this.useMlx) {
      try {
        const mlxPromise = invoke<ArgumentAnalysisResponse>("analyze_fallacy_mlx_cmd", {
          text,
          model: "qwen2.5-7b",
          mlxPaths: this.mlxPaths,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("MLX timeout")), MLX_INVOKE_TIMEOUT)
        );

        const result = await Promise.race([mlxPromise, timeoutPromise]);
        const fallacies = result.fallacies?.map((f) => ({
          type: toFallacyType(f.type),
          confidence: f.confidence ?? 0.5,
          quote: f.quote ?? "",
          explanation: f.explanation ?? "",
          suggestion: f.suggestion ?? "",
          startIndex: text.indexOf(f.quote ?? ""),
          endIndex: text.indexOf(f.quote ?? "") + (f.quote?.length || 0),
        })) ?? [];
        return { fallacies, enrichment: result.enrichment ?? "" };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "unknown";
        logger.warn("OllamaClient", `MLX fallacy analysis failed: ${msg}, falling back to Ollama`);
      }
    }

    // Ollama fallback (or default)
    return super.analyzeArgument(text, signal);
  }

  async checkMlxAvailable(): Promise<boolean> {
    try {
      const result = await invoke<boolean>("check_mlx_available", { pythonPath: this.mlxPaths.pythonPath });
      return result;
    } catch {
      return false;
    }
  }
}
