/**
 * RTF Parser Utility
 *
 * Converts RTF (Rich Text Format) to plain text.
 * Handles macOS TextEdit default format (.rtf files).
 *
 * Simple regex-based parser sufficient for TextEdit RTF files.
 * More robust than full RTF spec parsers for this use case.
 */

/**
 * Check if content is RTF format
 */
export function isRTF(content: string): boolean {
  return content.trimStart().startsWith("{\\rtf");
}

/**
 * Convert RTF to plain text
 *
 * Handles common RTF control words from macOS TextEdit:
 * - Removes RTF header and formatting
 * - Preserves actual text content
 * - Handles Unicode characters (\uXXXX)
 * - Converts RTF line breaks (\par) to newlines
 *
 * @param rtfContent - RTF formatted string
 * @returns Plain text content
 */
export function rtfToText(rtfContent: string): string {
  let text = rtfContent;

  // Remove specific control groups (fonttbl, colortbl, expandedcolortbl, etc.)
  // These are the common groups that should be removed, NOT the main document
  // Use recursive removal to handle nested groups like {\\fonttbl{\\f0...}}
  const controlGroups = [
    /\{\\fonttbl[^{}]*(\{[^{}]*\}[^{}]*)*\}/gi,  // Handles one level of nesting
    /\{\\colortbl[^{}]*\}/gi,
    /\{\\*\\expandedcolortbl[^{}]*\}/gi,
    /\{\\stylesheet[^{}]*\}/gi,
    /\{\\info[^{}]*\}/gi,
  ];

  // Apply each pattern multiple times for deeply nested groups
  for (let i = 0; i < 5; i++) {
    controlGroups.forEach(pattern => {
      text = text.replace(pattern, "");
    });
  }

  // Handle Unicode characters (\uXXXX?)
  text = text.replace(/\\u(-?\d+)\??/g, (match, code) => {
    const charCode = parseInt(code, 10);
    // Handle negative values (RTF uses signed 16-bit)
    const normalized = charCode < 0 ? charCode + 65536 : charCode;
    return String.fromCharCode(normalized);
  });

  // Decode hex-encoded characters (\'XX)
  text = text.replace(/\\'([0-9a-f]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Convert RTF line breaks to newlines
  text = text.replace(/\\par\b/g, "\n");

  // Remove ALL control words and their parameters
  // Pattern: \word or \word123 or \word-123
  text = text.replace(/\\[a-z][a-z0-9-]*\d*/gi, "");

  // Remove standalone backslashes followed by special chars
  text = text.replace(/\\[\\{}\*]/g, "");

  // Remove outer braces (main RTF document wrapper)
  text = text.replace(/^\s*\{/, "").replace(/\}\s*$/, "");

  // Remove any remaining inner braces
  text = text.replace(/[{}]/g, "");

  // Fix common RTF artifacts (before final cleanup)
  text = text.replace(/\s*;\s*/g, " "); // Remove semicolons from control sequences
  text = text.replace(/\*/g, ""); // Remove asterisks

  // Final whitespace cleanup (MUST be last step)
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
