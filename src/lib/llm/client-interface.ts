/**
 * LLMClient Interface - Shared contract for all LLM providers
 *
 * All providers (Ollama, OpenAI, Anthropic) implement this interface.
 * Ensures consistent API across different LLM backends.
 */

import type {
  AnalysisResult,
  EmotionState,
  ToneResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  Fallacy,
  TopicResult,
} from "../types";

export interface LLMClient {
  /**
   * LLM provider identifier
   */
  readonly provider: "ollama" | "openai" | "anthropic";

  /**
   * Model identifier (e.g., "llama3.1:8b", "gpt-4o", "claude-sonnet-4-20250514")
   */
  readonly model: string;

  /**
   * Check if the LLM service is available and accessible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Analyze emotion from text (Dual-Track: Text 60%)
   */
  analyzeEmotion(text: string, signal?: AbortSignal): Promise<Partial<EmotionState>>;

  /**
   * Analyze logical fallacies in argumentation
   */
  analyzeArgument(text: string, signal?: AbortSignal): Promise<AnalysisResult>;

  /**
   * Analyze tone (formal/informal, directness, intensity)
   */
  analyzeTone(text: string, signal?: AbortSignal): Promise<Partial<ToneResult>>;

  /**
   * Analyze using Gewaltfreie Kommunikation framework (GFK)
   */
  analyzeGFK(text: string, signal?: AbortSignal): Promise<GFKAnalysis>;

  /**
   * Detect cognitive distortions (CBT framework)
   */
  analyzeCognitiveDistortions(text: string, signal?: AbortSignal): Promise<CognitiveDistortionResult>;

  /**
   * Analyze using Four-Sides Model (Schulz von Thun)
   */
  analyzeFourSides(text: string, signal?: AbortSignal): Promise<FourSidesAnalysis>;

  /**
   * Generate chat summary from analysis results
   * Creates an empathetic, readable summary for chat display
   */
  generateChatSummary(
    text: string,
    emotion: Partial<EmotionState>,
    fallacies: Fallacy[],
    signal?: AbortSignal
  ): Promise<string>;

  /**
   * Classify text into topic categories for voice journaling
   */
  classifyTopic(text: string, signal?: AbortSignal): Promise<TopicResult>;

  /**
   * Generate chat response with conversation history (RAG support)
   *
   * Supports multi-turn conversations with system + user + assistant messages.
   * Used for RAG chatbot to answer questions about Hablará knowledge.
   *
   * @param messages - Array of chat messages (system, user, assistant roles)
   * @param options - Generation options (temperature, maxTokens)
   * @returns Generated response text
   */
  generateChat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string>;
}

/**
 * Base type for LLMClient (used in pipeline.ts and other modules)
 */
export type BaseLLMClient = LLMClient;
