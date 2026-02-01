/**
 * Embeddings Utility Tests
 *
 * Tests for semantic embeddings generation (client-side).
 *
 * NOTE: These tests mock the transformers.js pipeline since we can't
 * load the real model in a test environment (requires browser + WebAssembly).
 */

import { describe, it, expect, vi } from "vitest";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((path: string) => `tauri://localhost/${path}`),
  invoke: vi.fn(),
}));

// Mock transformers.js to avoid sharp dependency
vi.mock("@xenova/transformers", () => ({
  pipeline: vi.fn(),
  env: {
    useBrowserCache: false,
    allowLocalModels: false,
    allowRemoteModels: false,
  },
}));

import { cosineSimilarity } from "@/lib/rag/embeddings";

describe("Embeddings Utility", () => {
  describe("cosineSimilarity", () => {
    it("should return 1.0 for identical vectors", () => {
      const vec = new Array(384).fill(0.1);
      const similarity = cosineSimilarity(vec, vec);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("should return 0.0 for orthogonal vectors", () => {
      const vecA = new Array(384).fill(0);
      vecA[0] = 1.0; // [1, 0, 0, ...]

      const vecB = new Array(384).fill(0);
      vecB[1] = 1.0; // [0, 1, 0, ...]

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it("should return high similarity for similar vectors", () => {
      // Two vectors with small differences
      const vecA = new Array(384).fill(0.5);
      const vecB = new Array(384).fill(0.51);

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThan(0.99);
    });

    it("should return low similarity for opposite vectors", () => {
      const vecA = new Array(384).fill(1.0);
      const vecB = new Array(384).fill(-1.0);

      const similarity = cosineSimilarity(vecA, vecB);

      // Should be close to 0 (opposite directions)
      expect(similarity).toBeLessThan(0.1);
    });

    it("should throw error for dimension mismatch", () => {
      const vecA = new Array(384).fill(0.5);
      const vecB = new Array(512).fill(0.5); // Wrong dimension

      expect(() => cosineSimilarity(vecA, vecB)).toThrow("dimension mismatch");
    });

    it("should throw error for wrong dimensions", () => {
      const vecA = new Array(128).fill(0.5); // Should be 384
      const vecB = new Array(128).fill(0.5);

      expect(() => cosineSimilarity(vecA, vecB)).toThrow("Expected 384 dimensions");
    });

    it("should handle zero vectors gracefully", () => {
      const vecA = new Array(384).fill(0);
      const vecB = new Array(384).fill(1.0);

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it("should clamp results to [0, 1] range", () => {
      // Test with normalized vectors (common case)
      const vecA = new Array(384).fill(0.05); // Normalized
      const vecB = new Array(384).fill(0.05);

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe("embedText (integration test placeholder)", () => {
    it("should be tested manually in browser environment", () => {
      // This is a placeholder - embedText requires browser environment
      // Manual testing required in Tauri app:
      // 1. Load Hablará app
      // 2. Open RAG chat
      // 3. Send first message (triggers model download)
      // 4. Verify no errors in console
      // 5. Verify IndexedDB contains cached model

      expect(true).toBe(true);
    });
  });

  describe("initEmbedder (integration test placeholder)", () => {
    it("should be tested manually in browser environment", () => {
      // Placeholder for manual browser testing
      // Real test would require:
      // - Browser environment with WebAssembly
      // - IndexedDB access
      // - Network access to HuggingFace CDN (or local model)

      expect(true).toBe(true);
    });
  });
});
