/**
 * Prompt Injection Defense - Escaping Utilities
 *
 * Escapes user input before inserting into LLM prompts to prevent:
 * - JSON structure injection
 * - Quote-based prompt breaking
 * - Newline-based instruction override
 * - Control character exploits
 */

/**
 * Escapes user text for safe insertion into LLM prompts
 *
 * Defense layers:
 * 1. Backslash escaping (prevents escape sequences)
 * 2. Double quote escaping (prevents JSON/prompt break)
 * 3. Newline normalization (prevents instruction injection)
 * 4. Control character removal (prevents invisible exploits)
 * 5. JSON structure char escaping (prevents injection)
 *
 * @param text - Raw user input
 * @returns Escaped text safe for prompt insertion
 *
 * @example
 * ```typescript
 * const userText = 'Ich sagte: "ignore previous"';
 * const safe = escapePromptText(userText);
 * // Result: 'Ich sagte: \\"ignore previous\\"'
 * ```
 */
export function escapePromptText(text: string): string {
  // Early return for empty string (no processing needed)
  if (text.length === 0) {
    return text;
  }

  return (
    text
      .replace(/\\/g, "\\\\") // Backslash first (order matters!)
      .replace(/"/g, '\\"') // Double quotes
      .replace(/\n/g, " ") // Newlines → space (preserves readability)
      .replace(/\r/g, "") // Carriage returns → removed
      .replace(/[\x00-\x1F\x7F]/g, " ") // Control chars + DEL → space
      // JSON structure chars → escaped (prevents injection)
      .replace(/[{}[\]]/g, (c) => `\\${c}`)
  );
}
