/**
 * Hybrid Search Module (FTS5 + Semantic Embeddings)
 *
 * Combines keyword search (FTS5) with semantic search (embeddings)
 * using weighted score fusion.
 *
 * Algorithm:
 * 1. Run FTS5 search (60% weight) + Semantic search (40% weight) in parallel
 * 2. Normalize FTS5 scores (BM25 is unbounded) to [0, 1]
 * 3. Fuse scores: `fusedScore = fts5Score * 0.6 + semanticScore * 0.4`
 * 4. Sort by fused score, return top-K
 *
 * Fallback Strategy:
 * - If semantic fails → FTS5-only (existing V3.1 behavior)
 * - If FTS5 returns 0 results → Semantic-only
 * - If both fail → Empty results (upstream fallback to keyword search)
 *
 * Performance (M4 Pro baseline):
 * - FTS5: ~10ms
 * - Semantic: ~45ms (after warmup)
 * - Total: ~50ms (parallel execution)
 */

"use client";

import { searchKnowledge as searchFTS5 } from "./search-sqlite";
import { semanticSearch, SemanticResult } from "./semantic-search";
import type { SearchResult, KnowledgeChunk, KnowledgeCategory } from "./types";
import { assertKnowledgeCategory } from "./types";
import { logger } from "../logger";

// Browser-only check
if (typeof window === "undefined") {
  throw new Error("hybrid-search.ts must run in browser environment");
}

/**
 * Hybrid search result with detailed scoring
 */
export interface HybridResult {
  chunk: KnowledgeChunk;
  score: number; // Fused score [0, 1]
  fts5Score?: number; // FTS5 contribution (normalized)
  semanticScore?: number; // Semantic contribution
}

// Fusion weights (must sum to 1.0)
const FTS5_WEIGHT = 0.6;
const SEMANTIC_WEIGHT = 0.4;

/**
 * Hybrid search combining FTS5 and semantic embeddings
 *
 * @param query - User query (German/English/multilingual)
 * @param topK - Number of results to return (default: 5)
 * @returns Top-K results sorted by fused score
 */
export async function hybridSearch(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    logger.warn("HybridSearch", "Empty query, returning empty results");
    return [];
  }

  try {
    logger.debug("HybridSearch", "Starting parallel search", { query, topK });

    // Fetch 2x topK pro Quelle für Fusion-Pool
    // Nach Deduplizierung + Score-Fusion können Top-Results
    // von beiden Quellen abweichen. Beispiel: topK=3 holt
    // 6 FTS5 + 6 Semantic, fusioniert zu ~8-10 unique, gibt 3 zurück.
    const [fts5Results, semanticResults] = await Promise.all([
      // FTS5 is synchronous, wrap in Promise.resolve()
      Promise.resolve(searchFTS5(query, topK * 2)),

      // Semantic is async, catches errors for fallback
      semanticSearch(query, topK * 2).catch((err) => {
        logger.warn("HybridSearch", "Semantic search failed, using FTS5 only", err);
        return [] as SemanticResult[];
      }),
    ]);

    // 2. Normalize and fuse FTS5 scores
    const resultMap = new Map<string, HybridResult>();
    const maxFts5Score = Math.max(...fts5Results.map((r) => r.score), 1);

    for (const result of fts5Results) {
      const normalizedScore = result.score / maxFts5Score;
      resultMap.set(result.chunk.id, {
        chunk: result.chunk,
        score: normalizedScore * FTS5_WEIGHT,
        fts5Score: normalizedScore,
      });
    }

    // Score Fusion Szenarien:
    // 1. Beide gefunden (häufig): FTS5 + Semantic kombiniert (0.6 + 0.4)
    // 2. Nur FTS5 (selten): Chunk ohne Semantic-Match, max 60% Score
    // 3. Nur Semantic (edge): Chunk ohne Keywords, max 40% Score
    //    → Semantic-only Chunks nutzen ID als Fallback-Titel
    for (const result of semanticResults) {
      const existing = resultMap.get(result.id);

      if (existing) {
        // Chunk found by both methods - combine scores
        existing.score += result.score * SEMANTIC_WEIGHT;
        existing.semanticScore = result.score;
      } else {
        // Semantic-only result (FTS5 didn't find it)
        // Need to reconstruct KnowledgeChunk from semantic result
        let validatedCategory: KnowledgeCategory;
        try {
          validatedCategory = assertKnowledgeCategory(result.category, "hybrid-search");
        } catch (error) {
          // Fallback to "general" if invalid
          logger.warn(
            "HybridSearch",
            "Invalid category from semantic search, using 'general'",
            { original: result.category, error }
          );
          validatedCategory = "general";
        }

        resultMap.set(result.id, {
          chunk: {
            id: result.id,
            category: validatedCategory,
            title: result.id, // ID als Fallback-Titel für semantic-only Ergebnisse
            content: result.content,
            keywords: [],
          },
          score: result.score * SEMANTIC_WEIGHT,
          semanticScore: result.score,
        });
      }
    }

    // 4. Sort by fused score, take top-K
    const results: SearchResult[] = Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((r) => ({
        chunk: r.chunk,
        score: r.score,
      }));

    logger.debug("HybridSearch", `Returned ${results.length} results`, {
      fts5Count: fts5Results.length,
      semanticCount: semanticResults.length,
      topScore: results[0]?.score,
    });

    return results;
  } catch (error) {
    logger.error("HybridSearch", "Search failed completely", error);

    // Graceful degradation: return empty array (upstream fallback to keyword search)
    return [];
  }
}
