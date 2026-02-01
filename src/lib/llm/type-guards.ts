/**
 * Type Guards for LLM Response Validation
 *
 * Runtime validation functions for LLM output types.
 * Ensures type safety by checking against allowed values.
 */

import type { EmotionType, FallacyType, CognitiveDistortionType, TopicType } from "../types";

/** Valid EmotionType values (must match types.ts) */
const VALID_EMOTION_TYPES = [
  "neutral", "calm", "stress", "excitement", "uncertainty",
  "frustration", "joy", "doubt", "conviction", "aggression",
] as const;

/** Valid FallacyType values (must match types.ts - Tier 1+2: 16 types) */
const VALID_FALLACY_TYPES = [
  // Tier 1 (Kern-6)
  "ad_hominem", "straw_man", "false_dichotomy",
  "appeal_authority", "circular_reasoning", "slippery_slope",
  // Tier 2 (High Voice-Relevance)
  "red_herring", "tu_quoque", "hasty_generalization",
  "post_hoc", "bandwagon", "appeal_emotion",
  "appeal_ignorance", "loaded_question", "no_true_scotsman", "false_cause",
] as const;

/** Valid CognitiveDistortionType values (must match types.ts) */
const VALID_COGNITIVE_DISTORTION_TYPES = [
  "catastrophizing", "all_or_nothing", "overgeneralization",
  "mind_reading", "personalization", "emotional_reasoning", "should_statements",
] as const;

/** Valid TopicType values (must match types.ts) */
const VALID_TOPIC_TYPES = [
  "work_career", "health_wellbeing", "relationships_social",
  "finances", "personal_development", "creativity_hobbies", "other",
] as const;

/** Valid ThinkingStyle values for cognitive distortion analysis */
const VALID_THINKING_STYLES = [
  "balanced", "somewhat_distorted", "highly_distorted",
] as const;

export type ThinkingStyle = typeof VALID_THINKING_STYLES[number];

/**
 * Type guard for EmotionType validation
 * @param value - Unknown value from LLM response
 * @returns True if value is a valid EmotionType
 */
export function isEmotionType(value: unknown): value is EmotionType {
  return typeof value === "string" &&
    VALID_EMOTION_TYPES.includes(value as EmotionType);
}

/**
 * Type guard for FallacyType validation
 * @param value - Unknown value from LLM response
 * @returns True if value is a valid FallacyType
 */
export function isFallacyType(value: unknown): value is FallacyType {
  return typeof value === "string" &&
    VALID_FALLACY_TYPES.includes(value as FallacyType);
}

/**
 * Type guard for CognitiveDistortionType validation
 * @param value - Unknown value from LLM response
 * @returns True if value is a valid CognitiveDistortionType
 */
export function isCognitiveDistortionType(value: unknown): value is CognitiveDistortionType {
  return typeof value === "string" &&
    VALID_COGNITIVE_DISTORTION_TYPES.includes(value as CognitiveDistortionType);
}

/**
 * Type guard for ThinkingStyle validation
 * @param value - Unknown value from LLM response
 * @returns True if value is a valid ThinkingStyle
 */
export function isThinkingStyle(value: unknown): value is ThinkingStyle {
  return typeof value === "string" &&
    VALID_THINKING_STYLES.includes(value as ThinkingStyle);
}

/**
 * Safely convert LLM response to EmotionType with fallback
 * @param value - Unknown value from LLM response
 * @param fallback - Fallback EmotionType if validation fails
 * @returns Valid EmotionType
 */
export function toEmotionType(value: unknown, fallback: EmotionType = "neutral"): EmotionType {
  return isEmotionType(value) ? value : fallback;
}

/**
 * Safely convert LLM response to FallacyType with fallback
 * @param value - Unknown value from LLM response
 * @param fallback - Fallback FallacyType if validation fails
 * @returns Valid FallacyType
 */
export function toFallacyType(value: unknown, fallback: FallacyType = "ad_hominem"): FallacyType {
  return isFallacyType(value) ? value : fallback;
}

/**
 * Safely convert LLM response to CognitiveDistortionType with fallback
 * @param value - Unknown value from LLM response
 * @param fallback - Fallback CognitiveDistortionType if validation fails
 * @returns Valid CognitiveDistortionType
 */
export function toCognitiveDistortionType(value: unknown, fallback: CognitiveDistortionType = "overgeneralization"): CognitiveDistortionType {
  return isCognitiveDistortionType(value) ? value : fallback;
}

/**
 * Safely convert LLM response to ThinkingStyle with fallback
 * @param value - Unknown value from LLM response
 * @param fallback - Fallback ThinkingStyle if validation fails
 * @returns Valid ThinkingStyle
 */
export function toThinkingStyle(value: unknown, fallback: ThinkingStyle = "balanced"): ThinkingStyle {
  return isThinkingStyle(value) ? value : fallback;
}

/**
 * Type guard for TopicType validation
 * @param value - Unknown value from LLM response
 * @returns True if value is a valid TopicType
 */
export function isTopicType(value: unknown): value is TopicType {
  return typeof value === "string" &&
    VALID_TOPIC_TYPES.includes(value as TopicType);
}

/**
 * Safely convert LLM response to TopicType with fallback
 * @param value - Unknown value from LLM response
 * @param fallback - Fallback TopicType if validation fails
 * @returns Valid TopicType
 */
export function toTopicType(value: unknown, fallback: TopicType = "other"): TopicType {
  return isTopicType(value) ? value : fallback;
}
