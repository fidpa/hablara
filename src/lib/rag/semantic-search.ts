/**
 * Semantic Search Module
 *
 * Searches knowledge base using semantic embeddings (cosine similarity).
 *
 * - Embedding Model: paraphrase-multilingual-MiniLM-L12-v2 (384-dim)
 * - Search Algorithm: Cosine similarity with Top-K ranking
 * - Embeddings Source: /embeddings.json (pre-generated or on-demand)
 * - Fallback: Returns empty array if embeddings unavailable (triggers FTS5 fallback)
 *
 * Performance (M4 Pro baseline):
 * - Embedding generation: ~40ms (after warmup)
 * - Similarity search: ~5ms (78 chunks)
 * - Total latency: ~45ms
 */

"use client";

import { embedText, cosineSimilarity } from "./embeddings";
import { logger } from "../logger";

/**
 * Custom error class for embedding validation failures
 * Re-thrown in catch block for testing visibility and debugging
 */
class EmbeddingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingValidationError";
  }
}

// Browser-only check
if (typeof window === "undefined") {
  throw new Error("semantic-search.ts must run in browser environment");
}

/**
 * Embedding entry from embeddings.json
 * Represents a knowledge chunk with its semantic vector
 */
interface EmbeddingEntry {
  /** Unique chunk identifier (e.g., "emotion_stress", "fallacy_ad_hominem") */
  id: string;
  /** Knowledge category (e.g., "emotion", "fallacy", "gfk", "cognitive") */
  category: string;
  /** Combined title + content text for display/context */
  content: string;
  /** 384-dimensional embedding vector (MiniLM-L12-v2) */
  embedding: number[];
}

/**
 * Semantic search result with cosine similarity score
 */
export interface SemanticResult {
  id: string;
  category: string;
  content: string;
  score: number; // Cosine similarity [0, 1]
}

// Embeddings cache (singleton) - readonly for immutability
let embeddingsCache: readonly EmbeddingEntry[] | null = null;
let isLoading = false;
let loadingPromise: Promise<readonly EmbeddingEntry[]> | null = null;

/**
 * Load pre-generated embeddings from /embeddings.json
 *
 * First call fetches JSON (~200KB).
 * Subsequent calls use in-memory cache.
 *
 * @returns Readonly array of embedding entries (78 chunks, immutable)
 * @throws Error if embeddings.json not found or invalid
 */
async function loadEmbeddings(): Promise<readonly EmbeddingEntry[]> {
  // Return cached embeddings
  if (embeddingsCache) {
    return embeddingsCache;
  }

  // Wait for existing load operation
  if (isLoading && loadingPromise) {
    return loadingPromise;
  }

  // Start new load operation
  isLoading = true;
  loadingPromise = (async () => {
    try {
      logger.info("SemanticSearch", "Loading embeddings.json...");

      // Max size: 78 chunks x 384 dims x ~10 bytes + metadata = ~500KB
      const MAX_EMBEDDINGS_SIZE = 500 * 1024;

      const response = await fetch("/embeddings.json");

      if (!response.ok) {
        throw new Error(`embeddings.json not found (HTTP ${response.status})`);
      }

      // Check Content-Length if available
      const contentLength = response.headers.get("Content-Length");
      if (contentLength && parseInt(contentLength, 10) > MAX_EMBEDDINGS_SIZE) {
        throw new EmbeddingValidationError(
          `embeddings.json too large: ${contentLength} bytes (max: ${MAX_EMBEDDINGS_SIZE})`
        );
      }

      const embeddings: EmbeddingEntry[] = await response.json();

      // Validation constants
      const EXPECTED_EMBEDDING_DIM = 384;
      const EXPECTED_CHUNK_COUNT = 78;

      // Validate count
      if (embeddings.length !== EXPECTED_CHUNK_COUNT) {
        throw new EmbeddingValidationError(
          `Invalid embeddings.json: Expected ${EXPECTED_CHUNK_COUNT} entries, got ${embeddings.length}`
        );
      }

      // Validate ALL entries (not just first)
      for (let i = 0; i < embeddings.length; i++) {
        const entry = embeddings[i];
        if (!entry || !entry.id || !entry.category || !entry.content) {
          throw new EmbeddingValidationError(`Invalid embeddings.json: Entry ${i} missing required fields`);
        }
        if (!Array.isArray(entry.embedding) || entry.embedding.length !== EXPECTED_EMBEDDING_DIM) {
          throw new EmbeddingValidationError(
            `Invalid embeddings.json: Entry ${i} (${entry.id}) has invalid embedding dimensions`
          );
        }
        // Validate no NaN/Infinity values
        if (entry.embedding.some(v => !Number.isFinite(v))) {
          throw new EmbeddingValidationError(`Invalid embeddings.json: Entry ${i} (${entry.id}) contains NaN/Infinity`);
        }
      }

      // Deep freeze for immutability (prevents cache poisoning)
      const frozenEmbeddings = embeddings.map(entry => Object.freeze({
        ...entry,
        embedding: Object.freeze([...entry.embedding])
      }));
      embeddingsCache = Object.freeze(frozenEmbeddings) as readonly EmbeddingEntry[];
      logger.info("SemanticSearch", `Loaded ${embeddings.length} embeddings`);

      return embeddingsCache; // Return frozen cache, NOT original mutable array
    } catch (error) {
      logger.error("SemanticSearch", "Failed to load embeddings", error);
      isLoading = false;
      loadingPromise = null;

      // Re-throw validation errors (security-critical, must be visible for debugging/testing)
      if (error instanceof EmbeddingValidationError) {
        throw error;
      }

      // Wrap network/parsing errors as SEMANTIC_UNAVAILABLE (triggers FTS5 fallback)
      throw new Error("SEMANTIC_UNAVAILABLE");
    } finally {
      isLoading = false;
    }
  })();

  return loadingPromise;
}

/**
 * Search knowledge base using semantic similarity
 *
 * Algorithm:
 * 1. Generate query embedding (384-dim)
 * 2. Calculate cosine similarity with all chunk embeddings
 * 3. Sort by similarity descending
 * 4. Return top-K results
 *
 * @param query - User query (German/English/multilingual)
 * @param topK - Number of results to return (default: 5)
 * @returns Top-K results sorted by similarity score
 * @throws Error if embeddings unavailable or embedding generation fails
 */
export async function semanticSearch(
  query: string,
  topK: number = 5
): Promise<SemanticResult[]> {
  if (!query || query.trim().length === 0) {
    logger.warn("SemanticSearch", "Empty query, returning empty results");
    return [];
  }

  try {
    // 1. Generate query embedding
    logger.debug("SemanticSearch", "Generating query embedding", { query });
    const queryEmbedding = await embedText(query);

    // 2. Load chunk embeddings
    const embeddings = await loadEmbeddings();

    // Top-K Selection mit partiellem Sort (effizient für kleine k)
    // Bei k=5, n=78: Nur Top-Kandidaten werden sortiert gehalten
    // Praktischer Vorteil gegenüber Full-Sort für kleine k << n
    const topResults: SemanticResult[] = [];

    for (const entry of embeddings) {
      const score = cosineSimilarity(queryEmbedding, entry.embedding);

      // If we haven't filled topK yet, just add it.
      if (topResults.length < topK) {
        topResults.push({
          id: entry.id,
          category: entry.category,
          content: entry.content,
          score,
        });
        // Sort once we have topK elements to find the lowest score
        if (topResults.length === topK) {
          topResults.sort((a, b) => b.score - a.score);
        }
      } else if (topResults[topK - 1] && score > (topResults[topK - 1]?.score ?? 0)) {
        // If the new score is better than the worst in our list, replace it.
        topResults[topK - 1] = {
          id: entry.id,
          category: entry.category,
          content: entry.content,
          score,
        };
        // And re-sort to maintain the list.
        topResults.sort((a, b) => b.score - a.score);
      }
    }

    logger.debug("SemanticSearch", `Found ${topResults.length} results`, {
      query,
      topScore: topResults[0]?.score,
    });

    return topResults;
  } catch (error) {
    logger.error("SemanticSearch", "Search failed", error);

    // Propagate error to trigger FTS5 fallback
    throw error;
  }
}

/**
 * Check if semantic search is available
 *
 * @returns True if embeddings are loaded
 */
export function isSemanticSearchReady(): boolean {
  return embeddingsCache !== null;
}

/**
 * Pre-load embeddings (optional optimization)
 *
 * Call this during app initialization to avoid latency on first search.
 */
export async function preloadEmbeddings(): Promise<void> {
  try {
    await loadEmbeddings();
    logger.info("SemanticSearch", "Embeddings pre-loaded successfully");
  } catch (error) {
    logger.warn("SemanticSearch", "Pre-load failed (not critical)", error);
  }
}
