/**
 * LLM Response Parsers
 *
 * Robustes JSON-Parsing für LLM-Responses (Regex-Extraktion, Quote-Fixing, Trailing-Commas).
 * Interfaces für alle 9 LLM-Methods (Emotion, Fallacy, Tone, GFK, Cognitive, Four-Sides, Chat, Topic, RAG).
 */

// ============================================
// LLM Response Interfaces
// ============================================

/** Type for parsed argument analysis response */
export interface ArgumentAnalysisResponse {
  fallacies?: Array<{
    type?: string;
    confidence?: number;
    quote?: string;
    explanation?: string;
    suggestion?: string;
  }>;
  enrichment?: string;
}

/**
 * Parsed emotion analysis response from LLM.
 * All fields optional (defensive parsing) - use nullish coalescing for defaults.
 */
export interface EmotionAnalysisResponse {
  primary?: string;
  confidence?: number;
  markers?: string[];
}

/** Type for GFK analysis response */
export interface GFKAnalysisResponse {
  observations?: string[];
  feelings?: string[];
  needs?: string[];
  requests?: string[];
  gfk_translation?: string;
  reflection_question?: string;
}

/** Type for cognitive distortion response */
export interface CognitiveDistortionResponse {
  distortions?: Array<{
    type?: string;
    quote?: string;
    explanation?: string;
    reframe?: string;
  }>;
  overall_thinking_style?: string;
}

/** Type for four-sides analysis response */
export interface FourSidesResponse {
  sachinhalt?: string;
  selbstoffenbarung?: string;
  beziehung?: string;
  appell?: string;
  potentielleMissverstaendnisse?: string[];
}

/** Type for tone analysis response */
export interface ToneAnalysisResponse {
  formality?: number;
  professionalism?: number;
  directness?: number;
  energy?: number;
  seriousness?: number;
  confidence?: number;
}

/** Type for topic classification response */
export interface TopicClassificationResponse {
  topic?: string;
  confidence?: number;
  keywords?: string[];
}

// ============================================
// JSON Response Parser
// ============================================
// NOTE: parseJsonResponse has been moved to helpers/json-parser.ts
// This file now exports only response type interfaces
// Import from helpers/json-parser.ts instead
