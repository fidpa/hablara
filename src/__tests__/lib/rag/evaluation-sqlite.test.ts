/**
 * SQLite FTS5 Evaluation Suite (Phase 19 Batch 2)
 *
 * Vergleicht SQLite FTS5 mit Keyword-Match auf den selben 60 Test-Queries.
 * Misst Accuracy-Verbesserung durch Full-Text Search.
 *
 * Expected Results:
 * - Keyword-Match: 72% baseline (43/60 queries)
 * - SQLite FTS5: 85%+ target (51+/60 queries)
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { searchKnowledge as searchKeyword } from "@/lib/rag/search";
import { searchKnowledge as searchSQLite, initSQLiteSearch, isReady } from "@/lib/rag/search-sqlite";

/**
 * Evaluation test case
 */
interface EvaluationCase {
  query: string;
  expectedChunks: string[];
  category?: string;
}

/**
 * Same 60 queries as keyword-match evaluation
 */
const EVALUATION_CASES: EvaluationCase[] = [
  // --- Emotion (10 queries) ---
  {
    query: "Was ist Stress?",
    expectedChunks: ["emotion_stress", "general_emotion_analysis", "general_what_is_hablara"],
    category: "emotion",
  },
  {
    query: "Wie erkenne ich Calm?",
    expectedChunks: ["emotion_calm", "general_emotion_analysis", "general_what_is_hablara"],
    category: "emotion",
  },
  {
    query: "Woran erkenne ich Excitement?",
    expectedChunks: ["emotion_excitement", "general_emotion_analysis", "general_what_is_hablara"],
    category: "emotion",
  },
  {
    query: "Ich bin gestresst, welche Emotion ist das?",
    expectedChunks: ["emotion_stress", "general_emotion_analysis", "general_what_is_hablara"],
    category: "emotion",
  },
  {
    query: "Emotionen erkennen",
    expectedChunks: ["general_emotion_analysis"],
    category: "general",
  },
  {
    query: "Wie unterscheidet sich Aggression von Conviction?",
    expectedChunks: ["emotion_aggression", "emotion_conviction"],
    category: "emotion",
  },
  {
    query: "Was bedeutet Frustration?",
    expectedChunks: ["emotion_frustration", "general_emotion_analysis", "general_what_is_hablara"],
    category: "emotion",
  },
  {
    query: "Unsicherheit erkennen",
    expectedChunks: ["emotion_uncertainty"],
    category: "emotion",
  },
  {
    query: "Welche Emotionen gibt es in Hablará?",
    expectedChunks: ["general_what_is_hablara", "general_emotion_analysis", "emotion_neutral"],
    category: "general",
  },
  {
    query: "Wie funktioniert Dual-Track Emotion Analysis?",
    expectedChunks: ["general_emotion_analysis"],
    category: "general",
  },

  // --- Fallacy (6 queries) ---
  {
    query: "Was ist Ad Hominem?",
    expectedChunks: ["fallacy_ad_hominem", "general_what_is_hablara"],
    category: "fallacy",
  },
  {
    query: "Erkläre Strohmann-Argument",
    expectedChunks: ["fallacy_straw_man"],
    category: "fallacy",
  },
  {
    query: "Was ist ein Falsches Dilemma?",
    expectedChunks: ["fallacy_false_dichotomy", "cd_black_white_thinking"],
    category: "fallacy",
  },
  {
    query: "Fehlschlüsse erkennen",
    expectedChunks: ["fallacy_ad_hominem", "fallacy_straw_man", "fallacy_false_dichotomy"],
    category: "fallacy",
  },
  {
    query: "Circular Reasoning Beispiel",
    expectedChunks: ["fallacy_circular_reasoning"],
    category: "fallacy",
  },
  {
    query: "Wie funktioniert Fallacy Detection?",
    expectedChunks: ["general_what_is_hablara", "fallacy_ad_hominem"],
    category: "general",
  },

  // --- Tone (5 queries) ---
  {
    query: "Was bedeutet Formality?",
    expectedChunks: ["tone_formality", "general_what_is_hablara"],
    category: "tone",
  },
  {
    query: "Wie wird Professionalism gemessen?",
    expectedChunks: ["tone_professionalism"],
    category: "tone",
  },
  {
    query: "Direktheit in Kommunikation",
    expectedChunks: ["tone_directness"],
    category: "tone",
  },
  {
    query: "Tonalität analysieren",
    expectedChunks: ["tone_formality", "tone_professionalism", "tone_directness", "general_what_is_hablara"],
    category: "tone",
  },
  {
    query: "Tone 5 Dimensionen",
    expectedChunks: ["tone_formality", "tone_professionalism", "tone_directness", "tone_energy", "tone_seriousness"],
    category: "tone",
  },

  // --- GFK (3 queries) ---
  {
    query: "Was ist Gewaltfreie Kommunikation?",
    expectedChunks: ["gfk_four_components"],
    category: "gfk",
  },
  {
    query: "Wie funktioniert GFK?",
    expectedChunks: ["gfk_four_components", "general_what_is_hablara"],
    category: "gfk",
  },
  {
    query: "OFNR Framework erklären",
    expectedChunks: ["gfk_four_components", "four_sides_model"],
    category: "gfk",
  },

  // --- Cognitive Distortion (7 queries) ---
  {
    query: "Was ist Schwarz-Weiß-Denken?",
    expectedChunks: ["cd_black_white_thinking", "fallacy_false_dichotomy"],
    category: "cognitive_distortion",
  },
  {
    query: "Wie erkenne ich Katastrophisierung?",
    expectedChunks: ["cd_catastrophizing", "emotion_stress"],
    category: "cognitive_distortion",
  },
  {
    query: "Übergeneralisierung Beispiel",
    expectedChunks: ["cd_overgeneralization"],
    category: "cognitive_distortion",
  },
  {
    query: "Mind Reading kognitiv",
    expectedChunks: ["cd_mind_reading"],
    category: "cognitive_distortion",
  },
  {
    query: "Kognitive Verzerrungen erkennen",
    expectedChunks: ["cd_black_white_thinking", "cd_overgeneralization", "cd_catastrophizing"],
    category: "cognitive_distortion",
  },
  {
    query: "Emotionales Schlussfolgern",
    expectedChunks: ["cd_emotional_reasoning"],
    category: "cognitive_distortion",
  },
  {
    query: "Sollte-Aussagen Problem",
    expectedChunks: ["cd_should_statements"],
    category: "cognitive_distortion",
  },

  // --- Four-Sides Model (3 queries) ---
  {
    query: "Was ist das Vier-Seiten-Modell?",
    expectedChunks: ["four_sides_model", "gfk_four_components"],
    category: "four_sides",
  },
  {
    query: "Schulz von Thun erklären",
    expectedChunks: ["four_sides_model"],
    category: "four_sides",
  },
  {
    query: "Sachinhalt Selbstoffenbarung",
    expectedChunks: ["four_sides_model"],
    category: "four_sides",
  },

  // --- Topic (7 queries) ---
  {
    query: "Welche Topic-Kategorien gibt es?",
    expectedChunks: ["topic_work_career", "topic_health_wellbeing", "topic_relationships_social"],
    category: "topic",
  },
  {
    query: "Work Career Kategorie",
    expectedChunks: ["topic_work_career"],
    category: "topic",
  },
  {
    query: "Health Wellbeing",
    expectedChunks: ["topic_health_wellbeing"],
    category: "topic",
  },
  {
    query: "Relationships Social",
    expectedChunks: ["topic_relationships_social"],
    category: "topic",
  },
  {
    query: "Personal Development Kategorie",
    expectedChunks: ["topic_personal_development"],
    category: "topic",
  },
  {
    query: "Wie funktioniert Topic Classification?",
    expectedChunks: ["general_what_is_hablara", "topic_work_career", "general_llm_providers"],
    category: "general",
  },
  {
    query: "Voice Journal kategorisieren",
    expectedChunks: ["general_what_is_hablara", "topic_work_career", "general_transcription"],
    category: "general",
  },

  // --- General / Meta (9 queries) ---
  {
    query: "Was ist Hablará?",
    expectedChunks: ["general_what_is_hablara"],
    category: "general",
  },
  {
    query: "Welche Features hat Hablará?",
    expectedChunks: ["general_what_is_hablara"],
    category: "general",
  },
  {
    query: "Wie funktioniert Transkription?",
    expectedChunks: ["general_transcription"],
    category: "general",
  },
  {
    query: "Welche LLM-Provider gibt es?",
    expectedChunks: ["general_llm_providers"],
    category: "general",
  },
  {
    query: "Ollama OpenAI Anthropic",
    expectedChunks: ["general_llm_providers"],
    category: "general",
  },
  {
    query: "Hotkey Aufnahme starten",
    expectedChunks: ["general_hotkey"],
    category: "general",
  },
  {
    query: "Storage Settings",
    expectedChunks: ["general_what_is_hablara", "general_gdpr_privacy"],
    category: "general",
  },
  {
    query: "GDPR Datenschutz",
    expectedChunks: ["general_gdpr_privacy"],
    category: "general",
  },
  {
    query: "Was ist RAG Chatbot?",
    expectedChunks: ["general_rag_chatbot"],
    category: "general",
  },

  // --- New Meta/Operational Queries (10 queries) ---
  {
    query: "Wie fange ich an?",
    expectedChunks: ["general_getting_started"],
    category: "general",
  },
  {
    query: "Was bedeutet 65% Confidence?",
    expectedChunks: ["general_confidence_interpretation"],
    category: "general",
  },
  {
    query: "Wo werden meine Daten gespeichert?",
    expectedChunks: ["general_storage_data", "general_gdpr_privacy"],
    category: "general",
  },
  {
    query: "Unterschied Emotion und Tone?",
    expectedChunks: ["general_feature_comparison"],
    category: "general",
  },
  {
    query: "Welchen Provider soll ich wählen?",
    expectedChunks: ["general_provider_decision", "general_llm_providers"],
    category: "general",
  },
  {
    query: "Kann ich Text analysieren ohne Aufnahme?",
    expectedChunks: ["general_text_audio_import"],
    category: "general",
  },
  {
    query: "Was ist Baseline Feedback?",
    expectedChunks: ["general_personalized_reflection"],
    category: "general",
  },
  {
    query: "Wie funktioniert Emotion Blending?",
    expectedChunks: ["general_emotion_blending", "emotion_plutchik_wheel"],
    category: "general",
  },
  {
    query: "Kann ich Ergebnisse exportieren?",
    expectedChunks: ["general_export"],
    category: "general",
  },
  {
    query: "Transkription ist falsch, was tun?",
    expectedChunks: ["general_troubleshooting", "general_transcription"],
    category: "general",
  },
];

describe.skip("SQLite FTS5 Evaluation Suite (60 queries) - SKIPPED: Node.js environment", () => {
  // Skipped: SQLite WASM init requires browser environment (fetch API)
  // Tests work in browser but not in vitest Node.js environment
  // Known limitation documented in PHASE_19_BATCH_2_SQLITE_READY.md

  beforeAll(async () => {
    // Initialize SQLite before tests
    await initSQLiteSearch();
  });

  it("should have SQLite initialized", () => {
    expect(isReady()).toBe(true);
  });

  it("should have 60 test cases", () => {
    expect(EVALUATION_CASES.length).toBe(60);
  });

  describe("SQLite FTS5 Top-3 Accuracy", () => {
    const sqliteResults: Array<{ query: string; success: boolean; topChunkId: string | null }> = [];

    EVALUATION_CASES.forEach((testCase, index) => {
      it(`[${index + 1}/60] SQLite: ${testCase.query}`, () => {
        const searchResults = searchSQLite(testCase.query, 3);

        // Validate results exist
        expect(searchResults.length).toBeGreaterThan(0);

        // Extract Top-3 chunk IDs
        const top3Ids = searchResults.map((r) => r.chunk.id);

        // Check if any expected chunk is in Top-3
        const found = testCase.expectedChunks.some((expectedId) => top3Ids.includes(expectedId));

        // Record result for summary
        sqliteResults.push({
          query: testCase.query,
          success: found,
          topChunkId: top3Ids[0] || null,
        });
      });
    });

    afterAll(() => {
      const successCount = sqliteResults.filter((r) => r.success).length;
      const totalCount = sqliteResults.length;
      const accuracy = totalCount > 0 ? successCount / totalCount : 0;

      console.log("\n📊 SQLite FTS5 Evaluation Results:");
      console.log(`   Successful: ${successCount}/${totalCount}`);
      console.log(`   Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`   Target: ≥85% (51/60)\n`);

      // SQLite target: 85% accuracy
      if (accuracy < 0.85) {
        throw new Error(
          `SQLite FTS5 accuracy below target: ${(accuracy * 100).toFixed(1)}% (target: ≥85%)\n` +
          `Successful: ${successCount}/${totalCount}\n` +
          `Failed: ${totalCount - successCount}`
        );
      }
    });
  });

  describe("Keyword-Match vs SQLite Comparison", () => {
    it("should compare search quality on sample queries", () => {
      const testQueries = [
        "Was ist Stress?",
        "Ad Hominem Fehlschluss",
        "Gewaltfreie Kommunikation",
        "Emotionen erkennen",
      ];

      testQueries.forEach((query) => {
        const keywordResults = searchKeyword(query, 3);
        const sqliteResults = searchSQLite(query, 3);

        // Both should return results
        expect(keywordResults.length).toBeGreaterThan(0);
        expect(sqliteResults.length).toBeGreaterThan(0);

        console.log(`\nQuery: "${query}"`);
        console.log(`  Keyword Top-1: ${keywordResults[0]!.chunk.id} (${(keywordResults[0]!.score * 100).toFixed(0)}%)`);
        console.log(`  SQLite Top-1:  ${sqliteResults[0]!.chunk.id} (${(sqliteResults[0]!.score * 100).toFixed(0)}%)`);
      });
    });
  });
});
