#!/usr/bin/env tsx
/**
 * Download Embedding Model Script
 *
 * Downloads the sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 model
 * to public/models/ for offline use.
 *
 * Run: pnpm run download:model
 *
 * Model: 384-dim multilingual sentence embeddings
 * Size: ~50MB
 * Provider: HuggingFace
 *
 * NOTE: Environment variable ONNX_DISALLOW_SHARP=1 disables sharp dependency
 */

// Disable sharp (we only need text embeddings, not image processing)
process.env.ONNX_DISALLOW_SHARP = "1";

import { pipeline, env } from "@xenova/transformers";
import { mkdir } from "fs/promises";
import { join } from "path";

// Configure transformers.js for local model storage
env.cacheDir = join(process.cwd(), "public", "models");
env.allowLocalModels = true;
env.allowRemoteModels = true;

const MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";

async function downloadModel() {
  console.log("[download-model] Starting model download...");
  console.log(`[download-model] Model: ${MODEL_NAME}`);
  console.log(`[download-model] Cache directory: ${env.cacheDir}`);

  try {
    // Create cache directory
    await mkdir(env.cacheDir, { recursive: true });
    console.log("[download-model] Cache directory created");

    // Download model (first call downloads, subsequent calls use cache)
    console.log("[download-model] Downloading model (this may take 1-2 minutes)...");
    const extractor = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true, // Use quantized version (50% smaller)
    });

    console.log("[download-model] Model downloaded successfully!");

    // Test embedding
    console.log("[download-model] Testing model...");
    const output = await extractor("test", { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data);

    console.log(`[download-model] Test embedding generated: ${embedding.length} dimensions`);

    if (embedding.length !== 384) {
      throw new Error(`Expected 384 dimensions, got ${embedding.length}`);
    }

    console.log("[download-model] ✅ Model ready for offline use!");
    console.log(`[download-model] Location: ${env.cacheDir}`);
  } catch (error) {
    console.error("[download-model] ❌ Download failed:", error);
    process.exit(1);
  }
}

downloadModel();
