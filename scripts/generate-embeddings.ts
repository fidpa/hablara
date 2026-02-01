#!/usr/bin/env tsx
/**
 * Generate Embeddings Script
 *
 * Generates semantic embeddings for all knowledge base chunks using
 * sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2.
 *
 * Run: pnpm run build:embeddings
 *
 * Output: public/embeddings.json (78 chunks × 384 dims, ~200KB)
 */

import { pipeline, env } from "@xenova/transformers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { KNOWLEDGE_BASE } from "../src/lib/rag/knowledge-base";

// Configure transformers.js to use local model
env.cacheDir = join(process.cwd(), "public", "models");
env.allowLocalModels = true;
env.allowRemoteModels = true;

const MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const OUTPUT_FILE = join(process.cwd(), "public", "embeddings.json");

interface EmbeddingEntry {
  id: string;
  category: string;
  content: string;
  embedding: number[];
}

async function generateEmbeddings() {
  console.log("[generate-embeddings] Starting embedding generation...");
  console.log(`[generate-embeddings] Model: ${MODEL_NAME}`);
  console.log(`[generate-embeddings] Chunks: ${KNOWLEDGE_BASE.length}`);

  try {
    // Load model (must be downloaded first via download-embedding-model.ts)
    console.log("[generate-embeddings] Loading model...");
    const extractor = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    });
    console.log("[generate-embeddings] Model loaded");

    // Generate embeddings for all chunks
    const embeddings: EmbeddingEntry[] = [];

    for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
      const chunk = KNOWLEDGE_BASE[i];
      if (!chunk) continue; // Type guard: skip if undefined

      const progress = `[${i + 1}/${KNOWLEDGE_BASE.length}]`;

      // Combine title and content for better semantic representation
      const text = `${chunk.title}\n${chunk.content}`;

      console.log(`${progress} Embedding chunk: ${chunk.id}`);

      // Generate embedding
      const output = await extractor(text, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      if (embedding.length !== 384) {
        throw new Error(
          `Expected 384 dimensions, got ${embedding.length} for chunk ${chunk.id}`
        );
      }

      embeddings.push({
        id: chunk.id,
        category: chunk.category,
        content: text,
        embedding,
      });
    }

    // Write to public/embeddings.json
    await mkdir(join(process.cwd(), "public"), { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(embeddings, null, 2), "utf-8");

    console.log(`[generate-embeddings] ✅ Generated ${embeddings.length} embeddings`);
    console.log(`[generate-embeddings] Output: ${OUTPUT_FILE}`);

    // Calculate file size
    const stats = await import("fs/promises").then((fs) => fs.stat(OUTPUT_FILE));
    console.log(
      `[generate-embeddings] File size: ${(stats.size / 1024).toFixed(0)} KB`
    );
  } catch (error) {
    console.error("[generate-embeddings] ❌ Generation failed:", error);
    process.exit(1);
  }
}

generateEmbeddings();
