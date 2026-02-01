/**
 * Embeddings Utility (Client-Side)
 *
 * Generates semantic embeddings using sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2.
 *
 * - Model: 384-dim multilingual embeddings
 * - Runtime: Browser-only (transformers.js + WebAssembly)
 * - Cache: IndexedDB (persistent across sessions)
 * - Latency: ~50ms after warmup (M4 Pro baseline)
 *
 * NOTE: This module must run in browser (transformers.js uses WebAssembly).
 */

"use client";

import { pipeline, env } from "@xenova/transformers";
import { logger } from "@/lib/logger";
import { isTauri } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/core";

// Browser-only check
if (typeof window === "undefined") {
  throw new Error("embeddings.ts must run in browser environment");
}

// Configure transformers.js for Desktop App (Tauri)
// STRATEGY: Use bundled ONNX model (100% Privacy, no CDN)
// Model is bundled via Tauri resources (large files bypass embedded frontend)
env.allowLocalModels = true; // Use local model from bundle
env.allowRemoteModels = false; // No CDN downloads (Privacy-First!)

// Path configuration:
// - Tauri Production: Models in bundle.resources at _up_/public/models/, accessed via asset:// protocol
// - Browser Dev: Next.js serves public/models/ as /models/
if (isTauri()) {
  // asset:// protocol for bundle.resources (bypasses embedded frontend limitation)
  env.localModelPath = convertFileSrc("public/models/onnx-models", "asset");
} else {
  env.localModelPath = "/models/onnx-models";
}

// Model configuration
const MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2-onnx";
const EMBEDDING_DIM = 384;

// Type for feature extraction pipeline from @xenova/transformers
// Note: Library has incomplete type definitions, using minimal interface for type safety
interface FeatureExtractionPipeline {
  (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<unknown>;
}

// Singleton pattern for model loading
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isLoading = false;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initialize embedding model (lazy-loaded, singleton)
 *
 * First call downloads model (~50MB) to IndexedDB.
 * Subsequent calls use cached model.
 *
 * @returns Embedding pipeline
 * @throws Error if model fails to load
 */
export async function initEmbedder(): Promise<FeatureExtractionPipeline> {
  // Return existing pipeline
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // Wait for existing load operation
  if (isLoading && loadingPromise) {
    return loadingPromise;
  }

  // Start new load operation
  isLoading = true;
  loadingPromise = (async () => {
    try {
      logger.info("Embeddings", `Loading model ${MODEL_NAME} (first use: ~2-3s download)...`);

      // INT8 Quantisierung (ONNX Runtime):
      // - Größe: 112 MB (vs 448 MB FP32) = 74.9% Reduktion
      // - Genauigkeit: 0.990 avg similarity (>= 0.98 Threshold)
      // - Trade-off: Minimaler Qualitätsverlust für Bundle-Optimierung
      embeddingPipeline = (await pipeline("feature-extraction", MODEL_NAME, {
        quantized: true,
      })) as FeatureExtractionPipeline;

      logger.info("Embeddings", "Model loaded and cached in IndexedDB");

      return embeddingPipeline;
    } catch (error) {
      logger.error("Embeddings", "Model load failed", error);
      isLoading = false;
      loadingPromise = null;
      throw new Error("SEMANTIC_UNAVAILABLE");
    } finally {
      isLoading = false;
    }
  })();

  return loadingPromise;
}

/**
 * Generate 384-dim embedding for text
 *
 * @param text - Input text (German/English/multilingual)
 * @returns 384-dim normalized embedding vector
 * @throws Error if model not loaded or embedding fails
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot embed empty text");
  }

  try {
    // Ensure model is loaded
    const model = await initEmbedder();

    // Generate embedding with mean pooling + L2 normalization
    const output = (await model(text, {
      pooling: "mean",
      normalize: true,
    })) as { data: ArrayLike<number> };

    // Convert tensor to array
    const embedding: number[] = Array.from(output.data);

    // Validate dimensions
    if (embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Expected ${EMBEDDING_DIM} dimensions, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    logger.error("Embeddings", "Failed to generate embedding", error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 *
 * Result range: [-1, 1]
 * - 1.0 = identical vectors
 * - 0.0 = orthogonal (no similarity)
 * - -1.0 = opposite vectors
 *
 * @param a - First embedding vector (384-dim)
 * @param b - Second embedding vector (384-dim)
 * @returns Cosine similarity score [0, 1]
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  if (a.length !== EMBEDDING_DIM) {
    throw new Error(`Expected ${EMBEDDING_DIM} dimensions, got ${a.length}`);
  }

  // Single-pass calculation: dot product + magnitudes (O(n) vs O(2n))
  // Performance-optimized for frequent RAG queries
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];

    if (valA === undefined || valB === undefined) {
      throw new Error(`Invalid embedding: undefined value at index ${i}`);
    }

    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Avoid division by zero
  if (magA === 0 || magB === 0) {
    return 0;
  }

  // Cosine similarity
  const similarity = dotProduct / (magA * magB);

  // Clamp to [0, 1] (normalized embeddings should already be in this range)
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Check if embedding model is ready (loaded in IndexedDB cache)
 *
 * @returns True if model is cached and ready for use
 */
export function isEmbeddingModelReady(): boolean {
  return embeddingPipeline !== null;
}

/**
 * Get embedding model status
 *
 * @returns Model status object
 */
export function getEmbeddingModelStatus() {
  return {
    isReady: isEmbeddingModelReady(),
    isLoading,
    modelName: MODEL_NAME,
    dimensions: EMBEDDING_DIM,
  };
}
