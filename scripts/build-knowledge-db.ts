#!/usr/bin/env tsx

/**
 * Build Script: SQLite FTS5 Knowledge Database
 *
 * Erstellt eine SQLite-Datenbank mit FTS5-Index aus der Knowledge-Base.
 * Nutzt sqlite3 CLI (vorinstalliert auf macOS/Linux).
 * Exportiert die DB nach:
 * - public/knowledge.db (Browser/Dev mit @sqlite.org/sqlite-wasm)
 * - src-tauri/resources/knowledge.db (Tauri Desktop)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Ausgabepfade
const PUBLIC_DB_PATH = path.join(process.cwd(), "public/knowledge.db");
const TAURI_RESOURCES_PATH = path.join(process.cwd(), "src-tauri/resources");
const TAURI_DB_PATH = path.join(TAURI_RESOURCES_PATH, "knowledge.db");

async function buildDatabase() {
  console.log("[build-knowledge-db] Starting SQLite FTS5 knowledge base build...");

  // 1. Knowledge-Base importieren
  const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "src/lib/rag/knowledge-base/index.ts");
  const knowledgeModule = await import(KNOWLEDGE_BASE_PATH);
  const KNOWLEDGE_BASE = knowledgeModule.KNOWLEDGE_BASE;

  // 2. Temporäre DB erstellen
  const tempPath = path.join(process.cwd(), ".tmp-knowledge.db");
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }

  console.log("[build-knowledge-db] Creating FTS5 virtual table...");

  // 3. SQL Schema erstellen
  let sql = `
CREATE VIRTUAL TABLE knowledge_fts USING fts5(
  id,
  category,
  title,
  content,
  keywords,
  tokenize = 'unicode61'
);

`;

  console.log(`[build-knowledge-db] Generating INSERT statements for ${KNOWLEDGE_BASE.length} chunks...`);

  // 4. INSERT-Statements generieren
  for (const chunk of KNOWLEDGE_BASE) {
    const keywordsString = chunk.keywords.join(" ");

    // SQL-Escape Funktion
    const escape = (str: string) => str.replace(/'/g, "''");

    sql += `INSERT INTO knowledge_fts (id, category, title, content, keywords) VALUES ('${escape(chunk.id)}', '${escape(chunk.category)}', '${escape(chunk.title)}', '${escape(chunk.content)}', '${escape(keywordsString)}');\n`;
  }

  // 5. SQL in Temp-Datei schreiben
  const sqlPath = path.join(process.cwd(), ".tmp-knowledge.sql");
  fs.writeFileSync(sqlPath, sql, "utf-8");

  console.log(`[build-knowledge-db] Executing SQL with sqlite3 CLI...`);

  // 6. sqlite3 CLI ausführen
  try {
    execSync(`sqlite3 "${tempPath}" < "${sqlPath}"`, { stdio: "inherit" });
  } catch (error) {
    console.error("[build-knowledge-db] ❌ sqlite3 command failed:", error);
    throw error;
  }

  // 7. SQL-Datei löschen
  fs.unlinkSync(sqlPath);

  const dbSize = fs.statSync(tempPath).size;

  console.log(`[build-knowledge-db] Inserted ${KNOWLEDGE_BASE.length} chunks.`);

  // 8. public/knowledge.db schreiben
  console.log(`[build-knowledge-db] Writing database to ${PUBLIC_DB_PATH}...`);
  fs.mkdirSync(path.dirname(PUBLIC_DB_PATH), { recursive: true });
  fs.copyFileSync(tempPath, PUBLIC_DB_PATH);

  // 9. src-tauri/resources/knowledge.db schreiben
  console.log(`[build-knowledge-db] Writing database to ${TAURI_DB_PATH}...`);
  fs.mkdirSync(TAURI_RESOURCES_PATH, { recursive: true });
  fs.copyFileSync(tempPath, TAURI_DB_PATH);

  // 10. Temp-Datei löschen
  fs.unlinkSync(tempPath);

  console.log("[build-knowledge-db] ✅ Build complete!");
  console.log(`  - Database size: ${(dbSize / 1024).toFixed(2)} KB`);
  console.log(`  - Chunks indexed: ${KNOWLEDGE_BASE.length}`);
  console.log(`  - Output paths:`);
  console.log(`    • ${PUBLIC_DB_PATH}`);
  console.log(`    • ${TAURI_DB_PATH}`);
}

buildDatabase().catch((error) => {
  console.error("[build-knowledge-db] ❌ Build failed:", error);
  process.exit(1);
});
