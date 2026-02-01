/**
 * Knowledge Base - Modular Category Exports
 *
 * 78 chunks across 8 categories.
 * See README.md for structure documentation.
 *
 * Language Policy:
 * - All chunk content in German (Fachbegriffe/technical terms excepted)
 * - Technical terms preserved: Valence, Arousal, Features, Pipeline, LLM, GFK, CBT, etc.
 * - Product names preserved: Whisper, Ollama, OpenAI, Anthropic, Tauri
 * - German translations for common terms: Joy→Freude, Suggestion→Empfehlung, Sample-Size→Stichprobengröße
 */
import type { KnowledgeChunk } from "../types";

// Category imports
import { emotionChunks } from "./categories/emotion";
import { fallacyChunks } from "./categories/fallacy";
import { toneChunks } from "./categories/tone";
import { gfkChunks } from "./categories/gfk";
import { cognitiveDistortionChunks } from "./categories/cognitive";
import { fourSidesChunks } from "./categories/four-sides";
import { topicChunks } from "./categories/topic";
import { generalChunks } from "./categories/general";

// Re-export individual categories for selective imports
export {
  emotionChunks,
  fallacyChunks,
  toneChunks,
  gfkChunks,
  cognitiveDistortionChunks,
  fourSidesChunks,
  topicChunks,
  generalChunks,
};

// Combined knowledge base (same export as before)
export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  ...emotionChunks,
  ...fallacyChunks,
  ...toneChunks,
  ...gfkChunks,
  ...cognitiveDistortionChunks,
  ...fourSidesChunks,
  ...topicChunks,
  ...generalChunks,
];

// Expected chunk count - calculated dynamically from all category arrays
// This ensures validation stays in sync when chunks are added/removed
const EXPECTED_CHUNK_COUNT =
  emotionChunks.length +
  fallacyChunks.length +
  toneChunks.length +
  gfkChunks.length +
  cognitiveDistortionChunks.length +
  fourSidesChunks.length +
  topicChunks.length +
  generalChunks.length;

// Validate: Throw error at module load time to catch issues early
// This catches cases where KNOWLEDGE_BASE spread is incomplete
if (KNOWLEDGE_BASE.length !== EXPECTED_CHUNK_COUNT) {
  throw new Error(
    `[knowledge-base] Invalid chunk count: Expected ${EXPECTED_CHUNK_COUNT} chunks (sum of all categories), got ${KNOWLEDGE_BASE.length}. ` +
      `This indicates a bug in knowledge-base. Check that all chunk arrays are included in KNOWLEDGE_BASE.`
  );
}

// Additional validation: Check for duplicate IDs
const ids = new Set<string>();
const duplicateIds: string[] = [];
KNOWLEDGE_BASE.forEach((chunk) => {
  if (ids.has(chunk.id)) {
    duplicateIds.push(chunk.id);
  }
  ids.add(chunk.id);
});
if (duplicateIds.length > 0) {
  throw new Error(
    `[knowledge-base] Duplicate chunk IDs found: ${duplicateIds.join(", ")}. ` +
      `Each chunk must have a unique ID.`
  );
}
