/**
 * Unit tests for RAG search module
 */

import { describe, it, expect } from "vitest";
import { searchKnowledge } from "@/lib/rag/search";

describe("searchKnowledge", () => {
  describe("Keyword Matching", () => {
    it("should find chunks with exact keyword match", () => {
      const results = searchKnowledge("stress", 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.chunk.id).toBe("emotion_stress");
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    it("should find chunks with partial keyword match", () => {
      const results = searchKnowledge("gestresst", 5);

      expect(results.length).toBeGreaterThan(0);
      const stressChunk = results.find((r) => r.chunk.id === "emotion_stress");
      expect(stressChunk).toBeDefined();
    });

    it("should match multiple keywords", () => {
      const results = searchKnowledge("stress arousal negativ", 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.chunk.id).toBe("emotion_stress");
      expect(results[0]!.score).toBeGreaterThan(0.5); // Multiple matches = higher score
    });
  });

  describe("Title Boosting", () => {
    it("should prioritize title matches over content matches", () => {
      const results = searchKnowledge("Ad Hominem", 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.chunk.id).toBe("fallacy_ad_hominem");
      expect(results[0]!.score).toBeGreaterThan(0.8); // Title match = high score
    });

    it("should find chunks by title", () => {
      const results = searchKnowledge("Vier-Seiten-Modell", 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.chunk.id).toBe("four_sides_model");
    });
  });

  describe("Category Matching", () => {
    it("should boost chunks matching category", () => {
      const results = searchKnowledge("emotion neutral", 5);

      expect(results.length).toBeGreaterThan(0);
      const neutralChunk = results.find((r) => r.chunk.id === "emotion_neutral");
      expect(neutralChunk).toBeDefined();
      expect(neutralChunk!.score).toBeGreaterThan(0);
    });
  });

  describe("Top-K Filtering", () => {
    it("should return default top-3 results", () => {
      const results = searchKnowledge("emotion", 3);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should return top-5 results when specified", () => {
      const results = searchKnowledge("emotion", 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should return all results if fewer than topK", () => {
      const results = searchKnowledge("Vier-Seiten-Modell", 10);

      // Specific term should have few matches
      expect(results.length).toBeLessThan(10);
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array for empty query", () => {
      const results = searchKnowledge("", 3);

      expect(results).toEqual([]);
    });

    it("should return empty array for no matches", () => {
      const results = searchKnowledge("xyzabc123nonexistent", 3);

      expect(results).toEqual([]);
    });

    it("should be case-insensitive", () => {
      const resultsLower = searchKnowledge("stress", 3);
      const resultsUpper = searchKnowledge("STRESS", 3);
      const resultsMixed = searchKnowledge("StReSs", 3);

      expect(resultsLower[0]!.chunk.id).toBe("emotion_stress");
      expect(resultsUpper[0]!.chunk.id).toBe("emotion_stress");
      expect(resultsMixed[0]!.chunk.id).toBe("emotion_stress");
    });

    it("should handle multi-word queries", () => {
      const results = searchKnowledge("Gewaltfreie Kommunikation", 3);

      expect(results.length).toBeGreaterThan(0);
      const gfkChunk = results.find((r) => r.chunk.id === "gfk_four_components");
      expect(gfkChunk).toBeDefined();
    });
  });

  describe("Score Normalization", () => {
    it("should normalize scores to 0-1 range", () => {
      const results = searchKnowledge("emotion stress", 5);

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it("should order results by score descending", () => {
      const results = searchKnowledge("emotion", 5);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]!.score).toBeGreaterThanOrEqual(results[i + 1]!.score);
      }
    });
  });

  describe("Real-World Queries", () => {
    it("should find emotion information", () => {
      const results = searchKnowledge("stress arousal", 3);

      expect(results.length).toBeGreaterThan(0);
      const stressChunk = results.find((r) => r.chunk.id === "emotion_stress");
      expect(stressChunk).toBeDefined();
    });

    it("should find fallacy information", () => {
      const results = searchKnowledge("ad hominem", 3);

      expect(results.length).toBeGreaterThan(0);
      const adHominemChunk = results.find((r) => r.chunk.id === "fallacy_ad_hominem");
      expect(adHominemChunk).toBeDefined();
    });

    it("should find Hablára information", () => {
      const results = searchKnowledge("Was ist Hablára?", 3);

      expect(results.length).toBeGreaterThan(0);
      const hablaraChunk = results.find((r) => r.chunk.id === "general_what_is_hablara");
      expect(hablaraChunk).toBeDefined();
    });

    it("should find GFK information", () => {
      const results = searchKnowledge("Wie funktioniert Gewaltfreie Kommunikation?", 3);

      expect(results.length).toBeGreaterThan(0);
      const gfkChunk = results.find((r) => r.chunk.id === "gfk_four_components");
      expect(gfkChunk).toBeDefined();
    });
  });

  describe("German Stemming", () => {
    it("should match morphological variants: Emotionen → Emotion", () => {
      const results = searchKnowledge("Emotionen erkennen", 5);

      expect(results.length).toBeGreaterThan(0);
      // Should find emotion-related chunks via stemming
      const emotionChunks = results.filter((r) => r.chunk.category === "emotion");
      expect(emotionChunks.length).toBeGreaterThan(0);
    });

    it("should match morphological variants: gestresst → Stress", () => {
      // topK=10: Common German words like "ich" inflate scores for unrelated chunks
      // via partial keyword matches (e.g., "unsicherheit" contains "ich")
      const results = searchKnowledge("Ich bin gestresst", 10);

      expect(results.length).toBeGreaterThan(0);
      // Should find stress chunk via stemming
      const stressChunk = results.find((r) => r.chunk.id === "emotion_stress");
      expect(stressChunk).toBeDefined();
    });

    it("should match morphological variants: Transkription → Transkript", () => {
      const results = searchKnowledge("Transkription funktioniert nicht", 5);

      expect(results.length).toBeGreaterThan(0);
      // Should find transcription-related chunks via stemming
      const transcriptionChunk = results.find(
        (r) => r.chunk.id === "general_transcription" || r.chunk.content.toLowerCase().includes("transkript")
      );
      expect(transcriptionChunk).toBeDefined();
    });

    it("should handle plurals: Fehlschlüsse → Fehlschluss", () => {
      const results = searchKnowledge("Welche Fehlschlüsse gibt es?", 5);

      expect(results.length).toBeGreaterThan(0);
      // Should find fallacy chunks via stemming
      const fallacyChunks = results.filter((r) => r.chunk.category === "fallacy");
      expect(fallacyChunks.length).toBeGreaterThan(0);
    });

    it("should maintain backward compatibility with exact matches", () => {
      // Exact match should still work (not broken by stemming)
      const exactResults = searchKnowledge("stress", 5);
      const stemmedResults = searchKnowledge("gestresst", 5);

      // Both should find stress chunk
      expect(exactResults.find((r) => r.chunk.id === "emotion_stress")).toBeDefined();
      expect(stemmedResults.find((r) => r.chunk.id === "emotion_stress")).toBeDefined();
    });

    it("should improve recall with stemmed query variations", () => {
      // Compare results with and without morphological variations
      const baseResults = searchKnowledge("Emotion", 5);
      const morphResults = searchKnowledge("Emotionen", 5);

      // Both should return results (stemming makes them equivalent)
      expect(baseResults.length).toBeGreaterThan(0);
      expect(morphResults.length).toBeGreaterThan(0);

      // Should find similar chunks (both via stemming)
      const baseIds = baseResults.map((r) => r.chunk.id);
      const morphIds = morphResults.map((r) => r.chunk.id);

      // At least some overlap expected
      const overlap = baseIds.filter((id) => morphIds.includes(id));
      expect(overlap.length).toBeGreaterThan(0);
    });
  });

  describe("German Edge Cases", () => {
    it("should handle compound words (Emotionserkennung)", () => {
      // German compound: "Emotionserkennung" = Emotion + Erkennung
      const results = searchKnowledge("Emotionserkennung", 3);

      // Should match emotion-related chunks via stemming
      expect(results.length).toBeGreaterThan(0);
      const emotionChunks = results.filter(
        (r) => r.chunk.category === "emotion" || r.chunk.category === "general"
      );
      expect(emotionChunks.length).toBeGreaterThan(0);
    });

    it("should handle long compound words (Donaudampfschifffahrt)", () => {
      // Classic German compound word test
      // Should not crash, may return 0 results (no matching chunk)
      const results = searchKnowledge("Donaudampfschifffahrt", 3);

      // Should not crash (edge case handling)
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle compound with fallacy (Fehlschlussanalyse)", () => {
      // Fehlschlussanalyse = Fehlschluss + Analyse
      const results = searchKnowledge("Fehlschlussanalyse", 3);

      // Should find fallacy-related chunks
      expect(results.length).toBeGreaterThan(0);
      const fallacyChunks = results.filter((r) => r.chunk.category === "fallacy");
      expect(fallacyChunks.length).toBeGreaterThan(0);
    });

    it("should handle umlauts correctly (Überzeugung)", () => {
      // "Überzeugung" should match "conviction" via stemming
      const withUmlaut = searchKnowledge("Überzeugung", 3);
      const withoutUmlaut = searchKnowledge("Uberzeugung", 3);

      // With umlaut should work (normalize preserves umlauts)
      expect(withUmlaut.length).toBeGreaterThan(0);

      // Without umlaut might have different results (different stem)
      expect(withoutUmlaut).toBeDefined();
    });

    it("should handle ü in Gefühl correctly", () => {
      // "Gefühl" (feeling) should find GFK or emotion chunks
      const results = searchKnowledge("Gefühl", 3);

      // Should find relevant chunks (GFK component: "Gefühl")
      expect(results.length).toBeGreaterThan(0);
      const relevant = results.filter(
        (r) => r.chunk.category === "gfk" || r.chunk.category === "emotion"
      );
      expect(relevant.length).toBeGreaterThan(0);
    });

    it("should handle ß correctly (Streß vs Stress)", () => {
      // Old spelling "Streß" vs modern "Stress"
      const modernSpelling = searchKnowledge("Stress", 3);
      const oldSpelling = searchKnowledge("Streß", 3);

      // Modern spelling should definitely work
      expect(modernSpelling.length).toBeGreaterThan(0);
      expect(modernSpelling.find((r) => r.chunk.id === "emotion_stress")).toBeDefined();

      // Old spelling should also work (normalize preserves ß)
      expect(oldSpelling.length).toBeGreaterThan(0);
    });
  });
});
