/**
 * Knowledge Base Search Module
 *
 * Keyword-based search with Title-Boost scoring + German Stemming.
 * Hybrid approach: Uses both original and stemmed tokens for better recall.
 * O(n) linear scan over 74 chunks (~0.1ms).
 */

import { KNOWLEDGE_BASE } from "./knowledge-base";
import type { SearchResult, KnowledgeChunk } from "./types";
import * as snowballFactory from "snowball-stemmers";

// Initialize German stemmer (replaces natural's PorterStemmerDe)
const germanStemmer = snowballFactory.newStemmer("german");

/**
 * Scoring weights for different match types
 */
const SCORE_WEIGHTS = {
  EXACT_KEYWORD: 1.0,      // Exact match in keywords
  PARTIAL_KEYWORD: 0.5,    // Partial match in keywords
  CONTENT_MATCH: 0.5,      // Substring match in content
  TITLE_MATCH: 2.0,        // Match in title (higher priority)
  CATEGORY_MATCH: 0.3,     // Match in category
} as const;

/**
 * Minimum token length for search (noise reduction)
 */
const MIN_TOKEN_LENGTH = 2;

/**
 * Normalize text for matching (lowercase, trim)
 *
 * @param text - Text to normalize
 * @returns Normalized lowercase text
 */
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Stem German text using Porter Stemmer
 *
 * Handles German morphology:
 * - "Emotionen" → "emotion"
 * - "gestresst" → "stress"
 * - "Transkription" → "transkript"
 *
 * Edge cases:
 * - Empty/short strings (< MIN_TOKEN_LENGTH chars) are returned unchanged
 * - Numbers are not stemmed
 * - Stemmer errors are caught and return original text
 *
 * @param text - Text to stem (should be lowercase)
 * @returns Stemmed text (or original if edge case)
 */
function stem(text: string): string {
  // Edge case: Empty or single-char strings (articles, etc.)
  if (!text || text.length < MIN_TOKEN_LENGTH) {
    return text;
  }

  // Edge case: Numbers should not be stemmed
  if (/^[0-9]+$/.test(text)) {
    return text;
  }

  // Stem with error handling
  try {
    return germanStemmer.stem(text);
  } catch {
    // Fallback to original if stemmer fails
    return text;
  }
}

/**
 * Generate search tokens with hybrid approach
 *
 * Creates both original and stemmed tokens for better recall:
 * - Original: Exact match (high precision)
 * - Stemmed: Morphological variants (high recall)
 *
 * Example: "Emotionen erkennen"
 * → Original: ["emotionen", "erkennen"]
 * → Stemmed: ["emotion", "erkenn"]
 *
 * @param text - Text to tokenize
 * @returns Array of original + stemmed tokens (deduplicated)
 */
function generateSearchTokens(text: string): string[] {
  const normalized = normalize(text);
  const originalTokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  // Combine and deduplicate using Set (optimized)
  const tokenSet = new Set(originalTokens);
  originalTokens.forEach((token) => {
    const stemmed = stem(token);
    // Only add stemmed tokens that meet minimum length
    // (single-char stems like "a", "i" are often noise)
    if (stemmed.length >= MIN_TOKEN_LENGTH) {
      tokenSet.add(stemmed);
    }
  });

  // Filter out tokens below minimum length from final set
  return Array.from(tokenSet).filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/**
 * Pre-normalized chunk with cached lowercase fields
 */
interface NormalizedChunk {
  chunk: KnowledgeChunk;
  normalizedTitle: string;
  normalizedContent: string;
  normalizedKeywords: string[];
  normalizedCategory: string;
}

/**
 * Pre-normalized chunks (cached at module load for performance)
 * Eliminates 220+ normalize() calls per search (74 chunks × 3 fields)
 */
const NORMALIZED_CHUNKS: NormalizedChunk[] = KNOWLEDGE_BASE.map((chunk) => ({
  chunk,
  normalizedTitle: normalize(chunk.title),
  normalizedContent: normalize(chunk.content),
  normalizedKeywords: chunk.keywords.map(normalize),
  normalizedCategory: normalize(chunk.category),
}));

/**
 * Search knowledge base by query
 *
 * Scoring Algorithm:
 * - Exact keyword match: +1.0
 * - Substring match (content): +0.5
 * - Title match: +2.0 (higher weight)
 * - Category match: +0.3
 *
 * @param query - User query
 * @param topK - Number of results to return (default: 3)
 * @returns Top-K search results sorted by score
 */
export function searchKnowledge(query: string, topK = 3): SearchResult[] {
  // 1. Generate search tokens (original + stemmed)
  const queryTokens = generateSearchTokens(query);

  if (queryTokens.length === 0) {
    return [];
  }

  // 2. Score each chunk (using pre-normalized fields)
  const scores: SearchResult[] = NORMALIZED_CHUNKS.map((normalized) => {
    let score = 0;

    queryTokens.forEach((token) => {
      // Exact keyword match
      normalized.normalizedKeywords.forEach((kw) => {
        if (kw === token) {
          score += SCORE_WEIGHTS.EXACT_KEYWORD;
        }
        // Partial keyword match
        else if (kw.includes(token) || token.includes(kw)) {
          score += SCORE_WEIGHTS.PARTIAL_KEYWORD;
        }
      });

      // Substring match in content
      if (normalized.normalizedContent.includes(token)) {
        score += SCORE_WEIGHTS.CONTENT_MATCH;
      }

      // Title match (higher priority)
      if (normalized.normalizedTitle.includes(token)) {
        score += SCORE_WEIGHTS.TITLE_MATCH;
      }

      // Category match
      if (normalized.normalizedCategory.includes(token)) {
        score += SCORE_WEIGHTS.CATEGORY_MATCH;
      }
    });

    return { chunk: normalized.chunk, score };
  });

  // 3. Filter out zero scores
  const filtered = scores.filter((s) => s.score > 0);

  if (filtered.length === 0) {
    return [];
  }

  // 4. Normalize scores (0-1)
  const maxScore = Math.max(...filtered.map((s) => s.score));
  const normalized = filtered.map((s) => ({
    chunk: s.chunk,
    score: s.score / maxScore,
  }));

  // 5. Sort by score descending and return Top-K (immutable copy)
  return [...normalized].sort((a, b) => b.score - a.score).slice(0, topK);
}
