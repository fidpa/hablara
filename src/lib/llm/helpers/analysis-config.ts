/**
 * Analysis Configuration - Shared Constants
 *
 * Centralized thresholds, token budgets, and default responses.
 * Single Source of Truth for all LLM analysis parameters.
 */

/**
 * Minimum text lengths for each analysis type (in characters)
 * Shorter texts return default values without calling LLM
 */
export const ANALYSIS_THRESHOLDS = {
  emotion: 5, // Short exclamations allowed ("Schmerz!")
  argument: 10, // Fallacy needs more context
  tone: 15, // Tone needs context for 5 dimensions
  gfk: 10, // GFK needs context like fallacy
  cognitive: 15, // Distortions need context ("Ich bin müde" = skip)
  fourSides: 10, // Communication analysis needs context
  topic: 15, // Topic classification needs context
} as const;

/**
 * Token budgets for LLM generation (max tokens per analysis)
 * Prevents truncation and controls response length
 */
export const TOKEN_BUDGETS = {
  emotion: 256, // Small output (primary, confidence, markers)
  argument: 512, // Medium output (fallacies array + enrichment)
  tone: 256, // Small output (5 dimensions + confidence)
  gfk: 512, // Medium output (4 components + translation)
  cognitive: 384, // Medium output (distortions array + style)
  fourSides: 384, // Medium output (4 sides + misunderstandings)
  topic: 128, // Small output (topic, confidence, keywords)
  chatSummary: 1024, // Large output (3 sections with paragraphs) - increased from 768 to prevent truncation
} as const;

/**
 * Default responses when text is too short or analysis fails
 * Ensures graceful degradation instead of errors
 */
export const DEFAULT_RESPONSES = {
  emotion: { primary: "neutral" as const, confidence: 0.5, markers: [] as string[] },
  argument: { fallacies: [] as never[], enrichment: "" },
  tone: {
    formality: 3,
    professionalism: 3,
    directness: 3,
    energy: 3,
    seriousness: 3,
    confidence: 0.3,
  },
  gfk: {
    observations: [] as string[],
    feelings: [] as string[],
    needs: [] as string[],
    requests: [] as string[],
    gfkTranslation: "",
    reflectionQuestion: "",
  },
  cognitive: { distortions: [] as never[], overallThinkingStyle: "balanced" as const },
  fourSides: {
    sachinhalt: "",
    selbstoffenbarung: "",
    beziehung: "",
    appell: "",
    potentielleMissverstaendnisse: [] as string[],
  },
  topic: { topic: "other" as const, confidence: 0.4, keywords: [] as string[] },
};

/**
 * LLM generation parameters
 */
export const LLM_GENERATION_PARAMS = {
  temperature: 0.3, // Low temperature for consistent, focused responses
  topP: 0.9, // Nucleus sampling parameter
} as const;
