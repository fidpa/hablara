/**
 * Input Sanitization Utilities
 *
 * Defense against OWASP A03:2021 (Injection) attacks:
 * - Control character removal (log injection, terminal escape sequences)
 * - Unicode normalization (homoglyph attacks)
 * - Length limits enforcement
 *
 * Used by:
 * - ChatInput.tsx (user chat prompts)
 * - useTextImport.ts (text file imports)
 *
 * Security Model:
 * - Remove control characters (except \t \n \r)
 * - NFC normalization for consistent Unicode representation
 * - Trim whitespace
 *
 * @see docs/reference/guidelines/TYPESCRIPT.md (Security section)
 */

/**
 * Sanitize user input text
 *
 * Removes:
 * - Control characters (except tab, newline, carriage return)
 * - Leading/trailing whitespace
 *
 * Applies:
 * - Unicode NFC normalization
 *
 * @param text - Raw user input
 * @returns Sanitized text safe for processing
 *
 * @example
 * sanitizeInput("Hello\x00World")  // "HelloWorld"
 * sanitizeInput("  Test\x1B[31m  ")  // "Test[31m" (ESC removed)
 */
export function sanitizeInput(text: string): string {
  return text
    .normalize('NFC')  // Unicode normalization (prevent homoglyphs)
    // Remove control chars: 0x00-0x08, 0x0B (VT), 0x0C (FF), 0x0E-0x1F, 0x7F (DEL)
    // Preserved: 0x09 (\t tab), 0x0A (\n newline), 0x0D (\r carriage return)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize text for display (preserves more whitespace)
 *
 * Removes only dangerous control characters, keeps formatting.
 *
 * @param text - Text to sanitize for display
 * @returns Sanitized text with preserved formatting
 */
export function sanitizeForDisplay(text: string): string {
  return text
    .normalize('NFC')
    // Same control char removal as sanitizeInput, but without trim (preserves formatting)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Enforce maximum length on text input
 *
 * @param text - Input text
 * @param maxLength - Maximum allowed length (must be non-negative)
 * @returns Truncated text if exceeds maxLength, empty string if maxLength < 0
 *
 * Note: Operates on UTF-16 code units, not Unicode code points.
 * Multi-byte characters (emojis, CJK) may be split if truncated mid-character.
 */
export function enforceMaxLength(text: string, maxLength: number): string {
  // Defensive: negative maxLength returns empty string
  if (maxLength < 0) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}
