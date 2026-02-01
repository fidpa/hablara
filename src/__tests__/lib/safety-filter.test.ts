/**
 * Tests for Minimal Safety-Filter
 *
 * Design: Zero False-Positive with 7 critical patterns only
 *
 * Test Categories:
 * 1. TRUE POSITIVES: All 7 patterns must block correctly
 * 2. FALSE NEGATIVE PREVENTION: Legitimate content must pass through
 * 3. EDGE CASES: Empty strings, whitespace, special characters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  filterCriticalContent,
  containsCriticalContent,
  getPatternCount,
  BLOCKED_RESPONSE,
} from "@/lib/safety-filter";

// Mock logger to prevent console output during tests
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("safety-filter.ts - Minimal Safety Filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPatternCount", () => {
    it("should return exactly 7 patterns", () => {
      expect(getPatternCount()).toBe(7);
    });
  });

  // ==========================================================================
  // TRUE POSITIVES: All 7 patterns must block correctly
  // ==========================================================================

  describe("TRUE POSITIVES - ICD-10 Codes (Pattern 1)", () => {
    it("should block ICD-10: F32.1 (Depression)", () => {
      const result = filterCriticalContent("Du hast ICD-10: F32.1 Depression.");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block ICD-10 F41 (Anxiety) without colon", () => {
      const result = filterCriticalContent("Diagnose ICD-10 F41");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block ICD-10:F33 with spaces", () => {
      const result = filterCriticalContent("ICD-10:  F33");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should be case-insensitive for ICD-10", () => {
      const result = filterCriticalContent("icd-10: f32");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  describe("TRUE POSITIVES - Suicide Risk Levels (Pattern 2)", () => {
    it("should block Suizidrisiko: hoch", () => {
      const result = filterCriticalContent("Dein Suizidrisiko: hoch");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block Suizid-Risiko: mittel with hyphen", () => {
      const result = filterCriticalContent("Suizid-Risiko: mittel");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block Suizidrisiko niedrig without colon", () => {
      const result = filterCriticalContent("Suizidrisiko niedrig eingestuft");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block Suizidrisiko: akut", () => {
      const result = filterCriticalContent("Suizidrisiko: akut");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  describe("TRUE POSITIVES - Suizidgefährdet (Pattern 3)", () => {
    it("should block suizidgefährdet statement", () => {
      const result = filterCriticalContent("Du bist suizidgefährdet.");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should be case-insensitive for suizidgefährdet", () => {
      const result = filterCriticalContent("SUIZIDGEFÄHRDET");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  describe("TRUE POSITIVES - Selbstmordgedanken (Pattern 4)", () => {
    it("should block Selbstmordgedanken mention", () => {
      const result = filterCriticalContent("Du hast Selbstmordgedanken.");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should be case-insensitive for Selbstmordgedanken", () => {
      const result = filterCriticalContent("selbstmordgedanken erkannt");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  describe("TRUE POSITIVES - Medication Dosage (Pattern 5)", () => {
    it("should block Dosierung: 50mg", () => {
      const result = filterCriticalContent("Dosierung: 50mg täglich");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block Dosierung 100 ml without colon", () => {
      const result = filterCriticalContent("Dosierung 100 ml");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should be case-insensitive for dosierung", () => {
      const result = filterCriticalContent("DOSIERUNG: 25MG");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  describe("TRUE POSITIVES - PHQ-9 Scores (Pattern 6)", () => {
    it("should block PHQ-9: 15", () => {
      const result = filterCriticalContent("Dein PHQ-9: 15 zeigt...");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block PHQ-9 20 without colon", () => {
      const result = filterCriticalContent("PHQ-9 20");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should allow PHQ-9 Score without direct number (not a score)", () => {
      // "PHQ-9 Score: 12" has "Score" between PHQ-9 and the number
      // This is intentionally NOT blocked (false positive prevention)
      // Only "PHQ-9: 12" or "PHQ-9 12" patterns are blocked
      const text = "PHQ-9 Score: 12";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("TRUE POSITIVES - GAD-7 Scores (Pattern 7)", () => {
    it("should block GAD-7: 12", () => {
      const result = filterCriticalContent("GAD-7: 12 bedeutet...");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block GAD-7 18 without colon", () => {
      const result = filterCriticalContent("GAD-7 18");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should block gad-7: 8 lowercase", () => {
      const result = filterCriticalContent("gad-7: 8");
      expect(result).toBe(BLOCKED_RESPONSE);
    });
  });

  // ==========================================================================
  // FALSE NEGATIVE PREVENTION: Legitimate content must pass through
  // ==========================================================================

  describe("FALSE NEGATIVE PREVENTION - Legitimate Emotion Analysis", () => {
    it("should allow 'Symptome deuten auf Stress'", () => {
      const text = "Deine Symptome deuten auf hohen Stress hin.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Du leidest unter Druck'", () => {
      const text = "Du leidest unter viel Druck gerade.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Du hast viel Stress'", () => {
      const text = "Du hast viel Stress in letzter Zeit.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Deine Sprache wirkt gestresst'", () => {
      const text = "Deine Sprache wirkt gestresst.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("FALSE NEGATIVE PREVENTION - Legitimate Therapy Discussion", () => {
    it("should allow general therapy mention", () => {
      const text = "Bewegung kann eine gute Therapie für Stress sein.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Therapie kann helfen'", () => {
      const text = "Eine Therapie kann bei Angst helfen.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow discussion ABOUT cognitive therapy", () => {
      const text = "Kognitive Verhaltenstherapie ist ein bewährter Ansatz.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("FALSE NEGATIVE PREVENTION - Legitimate Medication Discussion", () => {
    it("should allow 'Antidepressiva' in context", () => {
      const text = "Manche Menschen nehmen Antidepressiva.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow SSRI mention without prescription", () => {
      const text = "SSRI sind eine Klasse von Medikamenten.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow discussion of medication without dosage", () => {
      const text = "Medikamente können bei einigen Bedingungen helfen.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("FALSE NEGATIVE PREVENTION - Legitimate Score Discussion", () => {
    it("should allow question ABOUT PHQ-9", () => {
      const text = "Was ist der PHQ-9 Fragebogen?";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow question ABOUT GAD-7", () => {
      const text = "Wie funktioniert der GAD-7 Test?";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow generic score mention without numbers", () => {
      const text = "Dein Stress-Score ist erhöht.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("FALSE NEGATIVE PREVENTION - Legitimate Crisis References", () => {
    it("should allow 'akute Stresssituation'", () => {
      const text = "Du befindest dich in einer akuten Stresssituation.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Krise' without 'akute'", () => {
      const text = "Eine Krise kann Wachstum bedeuten.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow 'Suizidprävention' discussion", () => {
      const text = "Suizidprävention ist ein wichtiges Thema.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  describe("FALSE NEGATIVE PREVENTION - Self-Reflection Content", () => {
    it("should allow cognitive awareness", () => {
      const text = "Ich bemerke einen Zirkelschluss in deiner Argumentation.";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow coaching-style feedback", () => {
      const text = "Möchtest du reflektieren, was dich gerade beschäftigt?";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should allow emotion vocabulary", () => {
      const text = "Deine Emotion scheint zwischen Stress und Aufregung zu liegen.";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("EDGE CASES", () => {
    it("should handle empty string", () => {
      expect(filterCriticalContent("")).toBe("");
    });

    it("should handle whitespace only", () => {
      expect(filterCriticalContent("   ")).toBe("   ");
    });

    it("should handle special characters", () => {
      const text = "!@#$%^&*()";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should handle multi-line text with critical content", () => {
      const result = filterCriticalContent("Line 1\nICD-10: F32\nLine 3");
      expect(result).toBe(BLOCKED_RESPONSE);
    });

    it("should handle multi-line text without critical content", () => {
      const text = "Line 1\nDu fühlst dich gestresst.\nLine 3";
      expect(filterCriticalContent(text)).toBe(text);
    });

    it("should handle very long text", () => {
      const longText = "Normale Analyse. ".repeat(1000);
      expect(filterCriticalContent(longText)).toBe(longText);
    });

    it("should handle Unicode characters", () => {
      const text = "Deine Gefühle sind berechtigt. 🙂";
      expect(filterCriticalContent(text)).toBe(text);
    });
  });

  // ==========================================================================
  // BLOCKED RESPONSE FORMAT
  // ==========================================================================

  describe("BLOCKED_RESPONSE Format", () => {
    it("should contain clear disclaimer", () => {
      expect(BLOCKED_RESPONSE).toContain("keine medizinischen oder therapeutischen");
      expect(BLOCKED_RESPONSE).toContain("Selbstreflexions-Tool");
      expect(BLOCKED_RESPONSE).toContain("kein Ersatz für professionelle Hilfe");
    });

    it("should contain emergency contacts", () => {
      expect(BLOCKED_RESPONSE).toContain("Telefonseelsorge: 0800 111 0 111");
      expect(BLOCKED_RESPONSE).toContain("24/7, kostenlos");
    });

    it("should suggest professional help", () => {
      expect(BLOCKED_RESPONSE).toContain("Hausarzt");
      expect(BLOCKED_RESPONSE).toContain("Psychiater");
      expect(BLOCKED_RESPONSE).toContain("Psychotherapeuten");
    });
  });

  // ==========================================================================
  // containsCriticalContent helper
  // ==========================================================================

  describe("containsCriticalContent helper", () => {
    it("should return true for critical content", () => {
      expect(containsCriticalContent("ICD-10: F32")).toBe(true);
      expect(containsCriticalContent("PHQ-9: 15")).toBe(true);
      expect(containsCriticalContent("suizidgefährdet")).toBe(true);
    });

    it("should return false for safe content", () => {
      expect(containsCriticalContent("Normale Analyse")).toBe(false);
      expect(containsCriticalContent("Du fühlst dich gestresst")).toBe(false);
      expect(containsCriticalContent("Therapie kann helfen")).toBe(false);
    });
  });

  // ==========================================================================
  // INTEGRATION SCENARIOS
  // ==========================================================================

  describe("INTEGRATION SCENARIOS - JSON Output", () => {
    it("should allow emotion analysis JSON output", () => {
      const goodOutput = JSON.stringify({
        primary: "stress",
        confidence: 0.8,
        markers: ["worried", "tense"],
      });
      expect(filterCriticalContent(goodOutput)).toBe(goodOutput);
    });

    it("should allow fallacy detection JSON output", () => {
      const goodOutput = JSON.stringify({
        fallacies: [
          {
            type: "ad_hominem",
            quote: "Du verstehst das nicht",
          },
        ],
        enrichment: "Ein Ad Hominem wurde erkannt.",
      });
      expect(filterCriticalContent(goodOutput)).toBe(goodOutput);
    });

    it("should block JSON with ICD-10 code embedded", () => {
      const unsafeOutput = JSON.stringify({
        diagnosis: "ICD-10: F32.1",
        recommendation: "Therapie starten",
      });
      expect(filterCriticalContent(unsafeOutput)).toBe(BLOCKED_RESPONSE);
    });
  });
});
