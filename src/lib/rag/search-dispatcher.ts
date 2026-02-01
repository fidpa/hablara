/**
 * Search Dispatcher - Feature Flag Router
 *
 * Routes searchKnowledge() calls to the correct implementation:
 * - Hybrid Search (FTS5 60% + Semantic 40%) - NEXT_PUBLIC_ENABLE_SEMANTIC_RAG=true
 * - SQLite FTS5 - NEXT_PUBLIC_ENABLE_SQLITE_RAG=true
 * - Keyword-Match V2.1 (default fallback)
 *
 * BREAKING CHANGE (V3.2): searchKnowledge() is now async!
 * - Required for semantic embeddings (async model loading)
 * - FTS5-only path wrapped in Promise.resolve() (no downstream changes)
 */

import type { SearchResult } from "./types";
import { searchKnowledge as searchKeyword } from "./search";
import { logger } from "../logger";
import { expandQuery } from "./alias-map";

// Feature Flags
const USE_SQLITE =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_SQLITE_RAG === "true";

const USE_SEMANTIC =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_SEMANTIC_RAG === "true";

// Lazy-load modules
let sqliteModule: typeof import("./search-sqlite") | null = null;
let hybridModule: typeof import("./hybrid-search") | null = null;

if (typeof window !== "undefined") {
  // SQLite FTS5 (existing)
  if (USE_SQLITE) {
    import("./search-sqlite")
      .then((mod) => {
        sqliteModule = mod;
        return mod.initSQLiteSearch();
      })
      .catch((error) => {
        logger.error("RAG-Dispatcher", "SQLite init failed", error);
      });
  }

  // Hybrid Search (V3.2 new)
  if (USE_SEMANTIC) {
    import("./hybrid-search")
      .then((mod) => {
        hybridModule = mod;
        logger.info("RAG-Dispatcher", "Semantic search enabled");
      })
      .catch((error) => {
        logger.error("RAG-Dispatcher", "Hybrid search init failed", error);
      });
  }
}

/**
 * Search knowledge base (V3.2 - Now ASYNC!)
 *
 * @param query - Search query (natural language)
 * @param topK - Number of results (default 3)
 * @returns Sorted search results
 */
export async function searchKnowledge(
  query: string,
  topK = 3
): Promise<SearchResult[]> {
  // NEW: Expand aliases before search (e.g. "GFK" → "GFK gewaltfreie kommunikation")
  const expandedQuery = expandQuery(query);

  // Log if expansion happened
  if (expandedQuery !== query) {
    logger.debug("RAG-Dispatcher", "Query expanded", {
      original: query,
      expanded: expandedQuery,
    });
  }

  // 1. Hybrid Search Path (V3.2 - if enabled + module ready)
  if (USE_SEMANTIC && hybridModule) {
    try {
      const results = await hybridModule.hybridSearch(expandedQuery, topK);

      logger.debug("RAG-Dispatcher", "Using Hybrid search (FTS5 60% + Semantic 40%)", {
        query: expandedQuery,
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.error("RAG-Dispatcher", "Hybrid search failed, FTS5 fallback", error);
      // Fall through to FTS5
    }
  }

  // 2. FTS5-only Path (V3.1 - if SQLite enabled + ready)
  if (USE_SQLITE && sqliteModule?.isReady()) {
    try {
      const results = sqliteModule.searchKnowledge(expandedQuery, topK);

      logger.debug("RAG-Dispatcher", "Using SQLite FTS5 search", {
        query: expandedQuery,
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.error("RAG-Dispatcher", "SQLite search failed, keyword fallback", error);
    }
  }

  // 3. Keyword-Match Fallback (V2.1 - default)
  logger.debug("RAG-Dispatcher", "Using keyword-match search", {
    query: expandedQuery,
    sqliteEnabled: USE_SQLITE,
    semanticEnabled: USE_SEMANTIC,
  });

  return searchKeyword(expandedQuery, topK);
}
