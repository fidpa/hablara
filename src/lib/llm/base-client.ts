// ============================================
// Base LLM Client - Abstract Implementation
// ============================================
// Template Method Pattern: Shared logic for all providers
// Subclasses implement only provider-specific _generate() method

import type { LLMClient } from "./client-interface";
import type {
  AnalysisResult,
  EmotionState,
  ToneResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  Fallacy,
  TopicResult,
  LLMProvider,
} from "../types";
import type { LLMError } from "./error-types";
import { logger } from "../logger";
import { parseJsonResponse } from "./helpers/json-parser";
import { ANALYSIS_THRESHOLDS, TOKEN_BUDGETS, DEFAULT_RESPONSES } from "./helpers/analysis-config";
import { escapePromptText } from "./helpers/escape-prompt";
import { INJECTION_PATTERNS } from "../rag/constants";
import {
  toEmotionType,
  toFallacyType,
  toCognitiveDistortionType,
  toThinkingStyle,
  toTopicType,
} from "./type-guards";
import {
  EMOTION_PROMPT,
  CEG_PROMPT,
  TONE_ANALYSIS_PROMPT,
  GFK_ANALYSIS_PROMPT,
  COGNITIVE_DISTORTION_PROMPT,
  FOUR_SIDES_PROMPT,
  TOPIC_CLASSIFICATION_PROMPT,
  CHAT_SUMMARY_PROMPT,
} from "./prompts";
import type {
  EmotionAnalysisResponse,
  ArgumentAnalysisResponse,
  ToneAnalysisResponse,
  GFKAnalysisResponse,
  CognitiveDistortionResponse,
  FourSidesResponse,
  TopicClassificationResponse,
} from "./response-parsers";

/**
 * Abstract Base Class for all LLM providers
 * Implements common analysis logic, delegates provider-specific generation
 */
export abstract class BaseLLMClient implements LLMClient {
  public readonly provider: LLMProvider;
  public readonly model: string;
  protected onError?: (error: LLMError) => void;

  constructor(provider: LLMProvider, model: string, onError?: (error: LLMError) => void) {
    this.provider = provider;
    this.model = model;
    this.onError = onError;
  }

  /**
   * Provider-specific text generation (abstract)
   * Must be implemented by subclasses (Ollama, OpenAI, Anthropic)
   * @param prompt - Complete prompt (system + user combined for Ollama, separate for others)
   * @param maxTokens - Maximum tokens to generate
   * @param signal - Abort signal for cancellation
   * @param format - Response format constraint ("json" for structured analysis, undefined for natural language)
   */
  protected abstract _generate(prompt: string, maxTokens: number, signal?: AbortSignal, format?: string): Promise<string>;

  /**
   * Check if LLM service is available (abstract)
   * Provider-specific implementation (HTTP ping, API check, etc.)
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Generate chat response (provider-specific, not template method)
   * Signature varies between providers (messages format differs)
   */
  abstract generateChat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;

  // ============================================================================
  // Prompt Injection Defense
  // ============================================================================

  /**
   * Checks user input for prompt injection patterns
   *
   * Defense Strategy:
   * - Uses same patterns as RAG pipeline (INJECTION_PATTERNS from constants.ts)
   * - Rejects suspicious input with default response
   * - Logs attempts (preview only, no full text to avoid log spam)
   *
   * @param text - User input text
   * @param context - Analysis context (emotion, argument, etc.)
   * @returns true if suspicious, false if safe
   */
  private checkInjectionPatterns(text: string, context: string): boolean {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        logger.warn("PromptInjection", `Suspicious input detected in ${context}`, {
          provider: this.provider,
          preview: text.slice(0, 50),
        });
        return true;
      }
    }
    return false;
  }

  // ============================================================================
  // Shared Analysis Methods (Template Method Pattern)
  // ============================================================================

  async analyzeEmotion(text: string, signal?: AbortSignal): Promise<Partial<EmotionState>> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.emotion) {
      logger.debug(this.provider + "Client", `Text too short (${text.trim().length} chars), returning neutral`);
      return { primary: "neutral", confidence: 0.3 };
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeEmotion")) {
      return DEFAULT_RESPONSES.emotion;
    }

    try {
      // escapePromptText() sanitizes user input against prompt injection
      const prompt = EMOTION_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.emotion, signal, "json");
      const parsed = parseJsonResponse<EmotionAnalysisResponse>(response, DEFAULT_RESPONSES.emotion);

      return {
        primary: toEmotionType(parsed.primary),
        confidence: parsed.confidence ?? 0.5,
        markers: parsed.markers ?? [],
      };
    } catch (error) {
      this.handleError(error, "analyzeEmotion");
      return DEFAULT_RESPONSES.emotion;
    }
  }

  async analyzeArgument(text: string, signal?: AbortSignal): Promise<AnalysisResult> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.argument) {
      logger.debug(this.provider + "Client", `Text too short (${text.trim().length} chars), skipping fallacy analysis`);
      return { fallacies: [], enrichment: "" };
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeArgument")) {
      return DEFAULT_RESPONSES.argument;
    }

    try {
      const prompt = CEG_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.argument, signal, "json");
      const parsed = parseJsonResponse<ArgumentAnalysisResponse>(response, DEFAULT_RESPONSES.argument);

      const fallacies: Fallacy[] =
        parsed.fallacies?.map((f) => {
          const quote = f.quote ?? "";
          const startIndex = text.indexOf(quote);
          return {
            type: toFallacyType(f.type),
            confidence: f.confidence ?? 0.5,
            quote,
            explanation: f.explanation ?? "",
            suggestion: f.suggestion ?? "",
            startIndex: startIndex >= 0 ? startIndex : 0,
            endIndex: startIndex >= 0 ? startIndex + quote.length : text.length,
          };
        }) ?? [];

      return {
        fallacies,
        enrichment: parsed.enrichment ?? "",
      };
    } catch (error) {
      this.handleError(error, "analyzeArgument");
      return DEFAULT_RESPONSES.argument;
    }
  }

  async analyzeTone(text: string, signal?: AbortSignal): Promise<Partial<ToneResult>> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.tone) {
      logger.debug(this.provider + "Client", `Text too short (${text.trim().length} chars), returning neutral tone`);
      return DEFAULT_RESPONSES.tone;
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeTone")) {
      return DEFAULT_RESPONSES.tone;
    }

    try {
      const prompt = TONE_ANALYSIS_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.tone, signal, "json");
      const parsed = parseJsonResponse<ToneAnalysisResponse>(response, DEFAULT_RESPONSES.tone);

      const clamp = (val: number | undefined, def: number) => Math.max(1, Math.min(5, val ?? def));
      const isShortText = text.trim().length < 20;
      const confidence = isShortText
        ? Math.min(parsed.confidence ?? 0.5, 0.6)
        : Math.max(0.3, Math.min(1.0, parsed.confidence ?? 0.5));

      return {
        formality: clamp(parsed.formality, 3),
        professionalism: clamp(parsed.professionalism, 3),
        directness: clamp(parsed.directness, 3),
        energy: clamp(parsed.energy, 3),
        seriousness: clamp(parsed.seriousness, 3),
        confidence,
      };
    } catch (error) {
      this.handleError(error, "analyzeTone");
      return DEFAULT_RESPONSES.tone;
    }
  }

  async analyzeGFK(text: string, signal?: AbortSignal): Promise<GFKAnalysis> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.gfk) {
      logger.debug(this.provider + "Client", `Text too short (${text.trim().length} chars), skipping GFK`);
      return DEFAULT_RESPONSES.gfk;
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeGFK")) {
      return DEFAULT_RESPONSES.gfk;
    }

    try {
      const prompt = GFK_ANALYSIS_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.gfk, signal, "json");
      const parsed = parseJsonResponse<GFKAnalysisResponse>(response, DEFAULT_RESPONSES.gfk);

      return {
        observations: parsed.observations ?? [],
        feelings: parsed.feelings ?? [],
        needs: parsed.needs ?? [],
        requests: parsed.requests ?? [],
        gfkTranslation: parsed.gfk_translation ?? "",
        reflectionQuestion: parsed.reflection_question ?? "",
      };
    } catch (error) {
      this.handleError(error, "analyzeGFK");
      return DEFAULT_RESPONSES.gfk;
    }
  }

  async analyzeCognitiveDistortions(text: string, signal?: AbortSignal): Promise<CognitiveDistortionResult> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.cognitive) {
      logger.debug(this.provider + "Client", `Text too short for distortion analysis (${text.trim().length} chars)`);
      return { distortions: [], overallThinkingStyle: "balanced" };
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeCognitiveDistortions")) {
      return DEFAULT_RESPONSES.cognitive;
    }

    try {
      const prompt = COGNITIVE_DISTORTION_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.cognitive, signal, "json");
      const parsed = parseJsonResponse<CognitiveDistortionResponse>(response, DEFAULT_RESPONSES.cognitive);

      const distortions =
        parsed.distortions?.map((d) => ({
          type: toCognitiveDistortionType(d.type),
          quote: d.quote ?? "",
          explanation: d.explanation ?? "",
          reframe: d.reframe ?? "",
        })) ?? [];

      return {
        distortions,
        overallThinkingStyle: toThinkingStyle(parsed.overall_thinking_style),
      };
    } catch (error) {
      this.handleError(error, "analyzeCognitiveDistortions");
      return { distortions: [], overallThinkingStyle: "balanced" };
    }
  }

  async analyzeFourSides(text: string, signal?: AbortSignal): Promise<FourSidesAnalysis> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.fourSides) {
      logger.debug(this.provider + "Client", "Text too short for Four-Sides analysis");
      return DEFAULT_RESPONSES.fourSides;
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "analyzeFourSides")) {
      return DEFAULT_RESPONSES.fourSides;
    }

    try {
      const prompt = FOUR_SIDES_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.fourSides, signal, "json");
      const parsed = parseJsonResponse<FourSidesResponse>(response, DEFAULT_RESPONSES.fourSides);

      return {
        sachinhalt: parsed.sachinhalt ?? "",
        selbstoffenbarung: parsed.selbstoffenbarung ?? "",
        beziehung: parsed.beziehung ?? "",
        appell: parsed.appell ?? "",
        potentielleMissverstaendnisse: parsed.potentielleMissverstaendnisse ?? [],
      };
    } catch (error) {
      this.handleError(error, "analyzeFourSides");
      return DEFAULT_RESPONSES.fourSides;
    }
  }

  async classifyTopic(text: string, signal?: AbortSignal): Promise<TopicResult> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    if (text.trim().length < ANALYSIS_THRESHOLDS.topic) {
      return DEFAULT_RESPONSES.topic;
    }

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "classifyTopic")) {
      return DEFAULT_RESPONSES.topic;
    }

    try {
      const prompt = TOPIC_CLASSIFICATION_PROMPT.replace("{text}", escapePromptText(text));
      const response = await this._generate(prompt, TOKEN_BUDGETS.topic, signal, "json");
      const parsed = parseJsonResponse<TopicClassificationResponse>(response, DEFAULT_RESPONSES.topic);

      return {
        topic: toTopicType(parsed.topic),
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
        keywords: parsed.keywords ?? [],
      };
    } catch (error) {
      this.handleError(error, "classifyTopic");
      return DEFAULT_RESPONSES.topic;
    }
  }

  async generateChatSummary(
    text: string,
    emotion: Partial<EmotionState>,
    fallacies: Fallacy[],
    signal?: AbortSignal
  ): Promise<string> {
    if (signal?.aborted) throw new Error("Request aborted before starting");

    // Prompt injection defense
    if (this.checkInjectionPatterns(text, "generateChatSummary")) {
      return "Die Verarbeitung wurde aus Sicherheitsgründen abgelehnt.";
    }

    try {
      const prompt = CHAT_SUMMARY_PROMPT.replace("{text}", escapePromptText(text))
        .replace("{primaryEmotion}", emotion.primary ?? "neutral")
        .replace("{primaryConfidence}", String(Math.round((emotion.confidence ?? 0.5) * 100)))
        .replace("{secondaryEmotion}", emotion.secondary ?? "none")
        .replace("{fallacies}", fallacies.length === 0 ? "Keine" : fallacies.map((f) => f.type).join(", "));

      const response = await this._generate(prompt, TOKEN_BUDGETS.chatSummary, signal);

      // Strip Markdown code-block wrapper if LLM incorrectly wraps output
      // Root Cause: Some LLMs (Ollama, qwen, self-hosted) wrap Markdown in code blocks
      // Variants: ```markdown, ```md, or plain ``` without language specifier
      // This prevents ReactMarkdown from rendering bold/formatting correctly
      // Fix: Prompt instruction (chat-summary.ts:36-39) + defensive strip here
      let cleanedResponse = response.trim();

      // Match: ```markdown, ```md, or plain ``` code fences
      const codeBlockMatch = cleanedResponse.match(/^```(?:markdown|md)?\n?([\s\S]*?)\n?```\s*$/);
      if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
        cleanedResponse = codeBlockMatch[1].trim();

        logger.debug('ChatSummary', 'Stripped code-block wrapper', {
          originalPreview: response.substring(0, 50),
          cleanedPreview: cleanedResponse.substring(0, 50),
        });
      }

      return cleanedResponse;
    } catch (error) {
      this.handleError(error, "generateChatSummary");
      return "Fehler bei der Zusammenfassung.";
    }
  }

  /**
   * Centralized error handling with logging
   */
  protected handleError(error: unknown, methodName: string): void {
    logger.error(this.provider + "Client", `${methodName} failed`, error);
    // onError callback removed (caused cache invalidation)
  }
}
