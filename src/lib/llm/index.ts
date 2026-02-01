/**
 * LLM Module - Barrel Exports
 *
 * Centralized exports for all LLM-related modules.
 * Provides factory functions, client classes, and type utilities.
 */

// Factory Functions
export { getLLMClient, getOllamaClient } from "./factory";
export type { GetLLMClientOptions } from "./factory";

// Client Classes
export { OllamaClient, OpenAIClient, AnthropicClient } from "./providers";

// Base Client
export { BaseLLMClient } from "./base-client";

// Interfaces
export type { LLMClient } from "./client-interface";
export type { LLMProvider } from "../types";

// Error Types
export { isLLMError, createLLMError, classifyLLMError } from "./error-types";
export type { LLMError, LLMErrorType } from "./error-types";

// Type Guards
export {
  isEmotionType,
  isFallacyType,
  isThinkingStyle,
  toEmotionType,
  toFallacyType,
  toThinkingStyle,
  toCognitiveDistortionType,
  toTopicType,
  type ThinkingStyle,
} from "./type-guards";

// Response Parser (exported for testing)
export { parseJsonResponse } from "./helpers/json-parser";

// Response Interfaces (exported for typing in consumers)
export type {
  ArgumentAnalysisResponse,
  EmotionAnalysisResponse,
  GFKAnalysisResponse,
  CognitiveDistortionResponse,
  FourSidesResponse,
  ToneAnalysisResponse,
  TopicClassificationResponse,
} from "./response-parsers";

// NOTE: Prompts are NOT exported - they are internal implementation details
// Consumers should use LLMClient methods, not raw prompts
