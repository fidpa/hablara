/**
 * SQLite FTS5 Search Implementation
 *
 * Nutzt @sqlite.org/sqlite-wasm für Browser-kompatible Volltextsuche.
 * Lädt knowledge.db beim App-Start und cached die DB in-memory.
 */

import initSqlite from "@sqlite.org/sqlite-wasm";
import type { SearchResult } from "./types";
import { logger } from "../logger";

// Type definition for SQLite DB instance (library doesn't provide types)
interface SQLiteDB {
  pointer?: number;
  exec(config: { sql: string; returnValue?: string; bind?: unknown[]; rowMode?: string }): unknown[];
  close(): void;
}

// Type for FTS5 query result rows
interface FTS5Row {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string;
  score: number;
}

// Singleton SQLite instance
let db: SQLiteDB | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Prüft ob SQLite DB bereit ist
 */
export function isReady(): boolean {
  return isInitialized && db !== null;
}

/**
 * Initialisiert SQLite WASM + lädt knowledge.db
 * Wird beim App-Start aufgerufen (async)
 */
export async function initSQLiteSearch(): Promise<void> {
  // Verhindere doppelte Initialisierung
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      logger.info("RAG-SQLite", "Initializing SQLite WASM...");

      // 1. SQLite WASM initialisieren
      const sqlite3 = await initSqlite();

      // 2. knowledge.db laden
      logger.info("RAG-SQLite", "Loading knowledge.db...");
      const response = await fetch("/knowledge.db");

      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge.db: ${response.statusText}`);
      }

      const dbBuffer = await response.arrayBuffer();
      const dbUint8 = new Uint8Array(dbBuffer);

      // 3. In-Memory DB erstellen - direktes Laden aus ArrayBuffer
      db = new sqlite3.oo1.DB() as SQLiteDB;

      // Allocate WASM memory and copy data
      const pMem = sqlite3.wasm.allocFromTypedArray(dbUint8);

      try {
        if (!db.pointer) {
          throw new Error("Database pointer is undefined");
        }

        const rc = sqlite3.capi.sqlite3_deserialize(
          db.pointer,
          "main",
          pMem,
          dbUint8.byteLength,
          dbUint8.byteLength,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
            sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
        );

        if (rc !== 0) {
          throw new Error(`Failed to deserialize database: ${rc}`);
        }
      } catch (error: unknown) {
        // If deserialize fails, free the memory
        sqlite3.wasm.dealloc(pMem);
        throw error;
      }

      // 4. Verify FTS5 table exists
      const tables = db.exec({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_fts';",
        returnValue: "resultRows",
      });

      if (tables.length === 0) {
        throw new Error("knowledge_fts table not found in database");
      }

      isInitialized = true;
      logger.info("RAG-SQLite", "SQLite initialized successfully");
    } catch (error: unknown) {
      logger.error("RAG-SQLite", "Initialization failed", error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Sanitize FTS5 query - escape special chars, quote tokens
 * FTS5 Syntax: https://www.sqlite.org/fts5.html#full_text_query_syntax
 */
function sanitizeFTS5Query(query: string): string {
  // Entferne special FTS5 chars: " ( ) * : -
  const sanitized = query.replace(/["()*:\-]/g, " ");

  // Tokenize auf Whitespace
  const tokens = sanitized.split(/\s+/).filter(Boolean);

  // Filtere zu kurze Tokens (<3 chars)
  const filtered = tokens.filter((t) => t.length >= 3);

  // Quote jedes Token (verhindert Syntax-Errors)
  const quoted = filtered.map((t) => `"${t}"`);

  // Join mit OR (FTS5 Standard)
  return quoted.join(" OR ");
}

/**
 * Normalisiere BM25 Scores auf 0-1 Bereich (wie Keyword-Match)
 * BM25 Scores sind negativ: -0.5 (bestes Match) bis -10 (schlechtestes)
 */
function normalizeScores(results: SearchResult[]): SearchResult[] {
  if (results.length === 0) return results;

  // Finde Min/Max Scores (BM25 ist negativ!)
  const scores = results.map((r) => r.score);
  const minScore = Math.min(...scores); // e.g. -10
  const maxScore = Math.max(...scores); // e.g. -0.5

  // Normalisiere auf 0-1, beste Score = 1
  const range = maxScore - minScore;

  if (range === 0) {
    return results.map((r) => ({ chunk: r.chunk, score: 1.0 }));
  }

  return results.map((r) => ({
    chunk: r.chunk,
    score: (r.score - minScore) / range, // 0 (worst) - 1 (best)
  }));
}

/**
 * Sucht in der Knowledge-Base via FTS5
 *
 * @param query - Suchquery (natural language)
 * @param topK - Anzahl Ergebnisse (default 3)
 * @returns Sortierte SearchResults mit BM25 Scoring
 */
export function searchKnowledge(query: string, topK = 3): SearchResult[] {
  if (!isReady() || !db) {
    logger.warn("RAG-SQLite", "SQLite not ready, returning empty results");
    return [];
  }

  try {
    // 1. Sanitize Query
    const ftsQuery = sanitizeFTS5Query(query);

    if (!ftsQuery) {
      logger.warn("RAG-SQLite", "Query too short after sanitization", { query });
      return [];
    }

    logger.debug("RAG-SQLite", "Executing FTS5 search", {
      original: query,
      sanitized: ftsQuery,
      topK,
    });

    // 2. FTS5 Query mit BM25 Ranking
    // Column Weights: id=0, category=0, title=10.0, content=5.0, keywords=1.0
    const sql = `
      SELECT
        id,
        category,
        title,
        content,
        keywords,
        bm25(knowledge_fts, 0, 0, 10.0, 5.0, 1.0) as score
      FROM knowledge_fts
      WHERE knowledge_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `;

    const rows = db.exec({
      sql,
      bind: [ftsQuery, topK],
      returnValue: "resultRows",
      rowMode: "object",
    });

    // 3. Konvertiere zu SearchResult[] (matches Keyword-Match format)
    const results: SearchResult[] = (rows as FTS5Row[]).map((row) => ({
      chunk: {
        id: row.id,
        category: row.category as import("./types").KnowledgeCategory,
        title: row.title,
        content: row.content,
        keywords: row.keywords.split(" "), // Space-separated -> Array
      },
      score: row.score, // BM25 score (negativ)
    }));

    // 4. Normalisiere Scores auf 0-1
    const normalized = normalizeScores(results);

    logger.debug("RAG-SQLite", "FTS5 search results", {
      query: ftsQuery,
      count: normalized.length,
      topScore: normalized[0]?.score,
    });

    return normalized;
  } catch (error: unknown) {
    logger.error("RAG-SQLite", "FTS5 search failed", error);
    return []; // Graceful degradation
  }
}
