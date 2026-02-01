"use client";

/**
 * Safety-Filter - Minimal LLM Output Safety Layer
 *
 * Filters extreme clinical content from RAG chatbot responses.
 * Uses 7 highly specific patterns with ~0% false-positive risk.
 * Defense-in-depth layer over prompt engineering.
 */

import { logger } from "./logger";

/**
 * Critical patterns with ~0% false-positive risk
 *
 * Categories:
 * - ICD-10 diagnosis codes (legal: physician-only)
 * - Suicide risk levels (harm: highest damage potential)
 * - Medication dosages (legal: physician-only)
 * - Clinical scores with numbers (legal: validated instruments only)
 */
const CRITICAL_SAFETY_PATTERNS = [
  /ICD-10:?\s*F\d+/i,                              // ICD-10 codes (e.g., "ICD-10: F32.1")
  /suizid(-)?risiko:?\s*(hoch|mittel|niedrig|akut)/i, // Suicide risk levels
  /suizidgefährdet/i,                               // "Suicidal" statement
  /selbstmordgedanken/i,                            // "Suicidal thoughts"
  /dosierung:?\s*\d+\s*(mg|ml)/i,                  // Medication dosage (e.g., "50mg")
  /PHQ-9:?\s*\d+/i,                                // PHQ-9 clinical score
  /GAD-7:?\s*\d+/i,                                // GAD-7 clinical score
] as const;

/** Fallback response when content is blocked (GDPR Art. 13 compliant) */
export const BLOCKED_RESPONSE =
  "Entschuldigung, ich kann keine medizinischen oder therapeutischen Ratschläge geben. " +
  "Hablará ist ein Selbstreflexions-Tool, kein Ersatz für professionelle Hilfe.\n\n" +
  "Bei psychischen Problemen wende dich bitte an:\n" +
  "• Telefonseelsorge: 0800 111 0 111 (24/7, kostenlos)\n" +
  "• Deinen Hausarzt oder einen Psychiater/Psychotherapeuten";

/**
 * Filters critical clinical content from LLM responses
 *
 * Scope: generateChat() only (RAG chatbot), NOT JSON APIs
 * Performance: O(n*m), <1ms latency
 */
export function filterCriticalContent(text: string): string {
  for (const pattern of CRITICAL_SAFETY_PATTERNS) {
    if (pattern.test(text)) {
      const matchResult = text.match(pattern);
      const matchedText =
        matchResult && matchResult.length > 0 ? matchResult[0] : "(no match)";

      logger.warn("SafetyFilter", "Critical content blocked", {
        pattern: pattern.source,
        match: matchedText,
        preview: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      });

      return BLOCKED_RESPONSE;
    }
  }

  return text;
}

/** Checks if text contains critical patterns (for tests/monitoring) */
export function containsCriticalContent(text: string): boolean {
  return CRITICAL_SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

/** Returns count of active patterns (for tests/documentation) */
export function getPatternCount(): number {
  return CRITICAL_SAFETY_PATTERNS.length;
}
