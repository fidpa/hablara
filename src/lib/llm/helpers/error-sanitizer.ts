/**
 * LLM Error Message Sanitization
 *
 * Verhindert API Key Leakage in Error Messages durch Redaction.
 * Limitiert Message-Länge um Speicher-Issues zu vermeiden.
 */

/**
 * Sanitize error message from API responses
 *
 * Removes:
 * - OpenAI API keys (sk-proj-*, sk-*)
 * - Bearer tokens
 * - Limits message length to 500 chars
 *
 * @param rawError - Raw error message from API
 * @param statusCode - HTTP status code
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(rawError: string, statusCode: number): string {
  const sanitized = rawError
    // Match Bearer tokens first (before sk- replacement)
    .replace(/Bearer\s+[a-zA-Z0-9-_]+/gi, "Bearer [REDACTED]")
    // Match x-api-key header values (Anthropic format)
    .replace(/x-api-key[:\s]+[a-zA-Z0-9-_]+/gi, "x-api-key: [REDACTED]")
    // Match Anthropic API keys (sk-ant-* format)
    .replace(/sk-ant-[a-zA-Z0-9-_]+/gi, "[REDACTED_KEY]")
    // Match OpenAI keys (sk-proj-*, sk-*, etc.)
    // Minimum 10 chars after sk- to avoid false positives
    .replace(/sk-[a-zA-Z0-9-_]{10,}/g, "[REDACTED_KEY]")
    .slice(0, 500);

  return `API error ${statusCode}: ${sanitized}`;
}
