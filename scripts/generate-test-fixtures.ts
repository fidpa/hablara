#!/usr/bin/env tsx
/**
 * Generate Test Fixtures Script
 *
 * Generates embeddings for test queries and select chunks for testing.
 * Used by unit/integration tests to avoid loading the real model.
 *
 * Run: pnpm run build:test-fixtures
 *
 * Output: src/__tests__/lib/rag/fixtures/embeddings.fixture.json (~1MB)
 */

import { pipeline, env } from "@xenova/transformers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { KNOWLEDGE_BASE } from "../src/lib/rag/knowledge-base";

// Configure transformers.js
env.cacheDir = join(process.cwd(), "public", "models");
env.allowLocalModels = true;
env.allowRemoteModels = true;

const MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const OUTPUT_FILE = join(
  process.cwd(),
  "src",
  "__tests__",
  "lib",
  "rag",
  "fixtures",
  "embeddings.fixture.json"
);

// Test queries for semantic evaluation
const TEST_QUERIES = [
  // Synonym tests
  { query: "Wut", expectedChunk: "emotion_aggression", description: "Synonym: Wut → Aggression" },
  { query: "Denkfehler", expectedChunk: "cd_beck_framework", description: "Synonym: Denkfehler → Cognitive Distortions" },
  { query: "Vier Ohren", expectedChunk: "four_sides_model", description: "Synonym: Vier Ohren → Four-Sides Model" },
  { query: "bedürfnisse", expectedChunk: "gfk_four_components", description: "Synonym: Bedürfnisse → GFK" },

  // Paraphrase tests
  { query: "Wie kommuniziere ich besser?", expectedChunk: "gfk_four_components", description: "Paraphrase: Better communication → GFK" },
  { query: "Meine Stimme klingt aggressiv", expectedChunk: "emotion_aggression", description: "Paraphrase: Voice aggressive → Aggression" },
  { query: "Ich bin sehr aufgeregt", expectedChunk: "emotion_excitement", description: "Paraphrase: Very excited → Excitement" },
  { query: "Fehlschluss in meiner Argumentation", expectedChunk: "fallacy_ad_hominem", description: "Paraphrase: Fallacy in argument → Fallacies" },

  // Multi-word tests
  { query: "entspannt und gelassen", expectedChunk: "emotion_calm", description: "Multi-word: relaxed calm → Calm" },
  { query: "gestresst und unter Druck", expectedChunk: "emotion_stress", description: "Multi-word: stressed pressure → Stress" },

  // Category tests
  { query: "Was sind Emotionen?", expectedChunk: "emotion_neutral", description: "Category: What are emotions? → Emotion chunk" },
  { query: "Welche Fehlschlüsse gibt es?", expectedChunk: "fallacy_ad_hominem", description: "Category: What fallacies? → Fallacy chunk" },

  // Technical tests
  { query: "Audio Features", expectedChunk: "general_emotion_v2_audio_features", description: "Technical: Audio features → V2 Audio doc" },
  { query: "LLM Provider", expectedChunk: "general_multi_provider_llm", description: "Technical: LLM provider → Multi-Provider doc" },
  { query: "Wie funktioniert Hablará?", expectedChunk: "general_onboarding_quickstart", description: "Meta: How does Hablará work? → Onboarding" },

  // Edge cases
  { query: "test", expectedChunk: null, description: "Edge case: Generic query (no match)" },
  { query: "", expectedChunk: null, description: "Edge case: Empty query" },
  { query: "xyz123", expectedChunk: null, description: "Edge case: Nonsense query" },

  // Performance tests
  { query: "Ich fühle mich ruhig und entspannt heute", expectedChunk: "emotion_calm", description: "Long query: Calm sentence" },
  { query: "Angst Unsicherheit Zweifel", expectedChunk: "emotion_uncertainty", description: "Keyword list: Fear uncertainty doubt" },
];

// Select representative chunks for fixtures (all emotion chunks + 10 others)
const FIXTURE_CHUNK_IDS = [
  // All emotion chunks (10)
  "emotion_neutral",
  "emotion_calm",
  "emotion_stress",
  "emotion_excitement",
  "emotion_uncertainty",
  "emotion_frustration",
  "emotion_joy",
  "emotion_doubt",
  "emotion_conviction",
  "emotion_aggression",

  // Representative chunks from other categories (10)
  "fallacy_ad_hominem",
  "gfk_four_components",
  "cd_beck_framework",
  "four_sides_model",
  "general_emotion_v2_audio_features",
  "general_multi_provider_llm",
  "general_onboarding_quickstart",
  "tone_formal_casual",
  "topic_work_career",
  "general_troubleshooting_common_issues",
];

interface EmbeddingEntry {
  id: string;
  category: string;
  content: string;
  embedding: number[];
}

interface QueryFixture {
  query: string;
  expectedChunk: string | null;
  description: string;
  embedding: number[];
}

interface Fixture {
  metadata: {
    model: string;
    generated: string;
    chunkCount: number;
    queryCount: number;
  };
  chunks: EmbeddingEntry[];
  queries: QueryFixture[];
}

async function generateFixtures() {
  console.log("[generate-fixtures] Starting fixture generation...");
  console.log(`[generate-fixtures] Model: ${MODEL_NAME}`);
  console.log(`[generate-fixtures] Chunks: ${FIXTURE_CHUNK_IDS.length}`);
  console.log(`[generate-fixtures] Queries: ${TEST_QUERIES.length}`);

  try {
    // Load model
    console.log("[generate-fixtures] Loading model...");
    const extractor = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    });
    console.log("[generate-fixtures] Model loaded");

    // Generate chunk embeddings
    const chunkEmbeddings: EmbeddingEntry[] = [];

    for (const chunkId of FIXTURE_CHUNK_IDS) {
      const chunk = KNOWLEDGE_BASE.find((c) => c.id === chunkId);
      if (!chunk) {
        throw new Error(`Chunk not found: ${chunkId}`);
      }

      const text = `${chunk.title}\n${chunk.content}`;
      console.log(`[chunk] ${chunkId}`);

      const output = await extractor(text, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      chunkEmbeddings.push({
        id: chunk.id,
        category: chunk.category,
        content: text,
        embedding,
      });
    }

    // Generate query embeddings
    const queryEmbeddings: QueryFixture[] = [];

    for (const testQuery of TEST_QUERIES) {
      console.log(`[query] ${testQuery.description}`);

      const output = await extractor(testQuery.query, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      queryEmbeddings.push({
        query: testQuery.query,
        expectedChunk: testQuery.expectedChunk,
        description: testQuery.description,
        embedding,
      });
    }

    // Create fixture
    const fixture: Fixture = {
      metadata: {
        model: MODEL_NAME,
        generated: new Date().toISOString(),
        chunkCount: chunkEmbeddings.length,
        queryCount: queryEmbeddings.length,
      },
      chunks: chunkEmbeddings,
      queries: queryEmbeddings,
    };

    // Write to file
    const dir = join(process.cwd(), "src", "__tests__", "lib", "rag", "fixtures");
    await mkdir(dir, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(fixture, null, 2), "utf-8");

    console.log(`[generate-fixtures] ✅ Generated fixture file`);
    console.log(`[generate-fixtures] Chunks: ${chunkEmbeddings.length}`);
    console.log(`[generate-fixtures] Queries: ${queryEmbeddings.length}`);
    console.log(`[generate-fixtures] Output: ${OUTPUT_FILE}`);

    // Calculate file size
    const stats = await import("fs/promises").then((fs) => fs.stat(OUTPUT_FILE));
    console.log(
      `[generate-fixtures] File size: ${(stats.size / 1024).toFixed(0)} KB`
    );
  } catch (error) {
    console.error("[generate-fixtures] ❌ Generation failed:", error);
    process.exit(1);
  }
}

generateFixtures();
