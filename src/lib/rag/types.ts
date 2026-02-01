/**
 * RAG (Retrieval-Augmented Generation) Types
 *
 * Knowledge base types for Hablará chatbot.
 * Supports 8 categories: emotion, fallacy, tone, gfk,
 * cognitive_distortion, four_sides, topic, general.
 */

/**
 * Knowledge categories for curated chunks
 */
export type KnowledgeCategory =
  | "emotion"
  | "fallacy"
  | "tone"
  | "gfk"
  | "cognitive_distortion"
  | "four_sides"
  | "topic"
  | "general";

/**
 * Single knowledge chunk from curated knowledge base
 */
export interface KnowledgeChunk {
  /** Unique identifier */
  id: string;
  /** Category for filtering/boosting */
  category: KnowledgeCategory;
  /** Title (higher weight in search) */
  title: string;
  /** Main content */
  content: string;
  /** Keywords for search matching */
  keywords: string[];
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** Matched knowledge chunk */
  chunk: KnowledgeChunk;
  /** Relevance score (0-1 normalized) */
  score: number;
}

/**
 * Valid knowledge categories (runtime validation)
 */
const VALID_CATEGORIES: readonly KnowledgeCategory[] = [
  "emotion",
  "fallacy",
  "tone",
  "gfk",
  "cognitive_distortion",
  "four_sides",
  "topic",
  "general",
] as const;

/**
 * Type guard for KnowledgeCategory
 */
export function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return (
    typeof value === "string" &&
    VALID_CATEGORIES.includes(value as KnowledgeCategory)
  );
}

/**
 * Assert and coerce to KnowledgeCategory
 *
 * @throws Error if value invalid
 */
export function assertKnowledgeCategory(
  value: unknown,
  context: string
): KnowledgeCategory {
  if (isKnowledgeCategory(value)) {
    return value;
  }

  throw new Error(
    `[${context}] Invalid knowledge category: ${JSON.stringify(value)}. ` +
      `Expected: ${VALID_CATEGORIES.join(", ")}`
  );
}
