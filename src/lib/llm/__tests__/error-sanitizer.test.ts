/**
 * Tests for LLM Error Message Sanitization
 *
 * Verifies that API keys and sensitive data are redacted from error messages.
 */

import { sanitizeErrorMessage } from "../helpers/error-sanitizer";

describe("sanitizeErrorMessage", () => {
  it("should redact OpenAI API keys (sk-proj-* format)", () => {
    const rawError = "Invalid API key: sk-proj-abcdefghijklmnopqrstuvwxyz1234567890";
    const sanitized = sanitizeErrorMessage(rawError, 401);

    expect(sanitized).not.toContain("sk-proj-");
    expect(sanitized).toContain("[REDACTED_KEY]");
    expect(sanitized).toContain("API error 401");
  });

  it("should redact OpenAI API keys (sk-* format)", () => {
    const rawError = "Authentication failed with key sk-1234567890abcdefghijklmnopqrstuvwxyz";
    const sanitized = sanitizeErrorMessage(rawError, 403);

    expect(sanitized).not.toContain("sk-1234567890");
    expect(sanitized).toContain("[REDACTED_KEY]");
  });

  it("should redact Bearer tokens", () => {
    const rawError = "Authorization header: Bearer sk-test-1234567890";
    const sanitized = sanitizeErrorMessage(rawError, 401);

    expect(sanitized).not.toContain("sk-test-1234567890");
    expect(sanitized).toContain("Bearer [REDACTED]");
  });

  it("should limit message length to 500 chars", () => {
    const longError = "x".repeat(1000);
    const sanitized = sanitizeErrorMessage(longError, 500);

    expect(sanitized.length).toBeLessThanOrEqual("API error 500: ".length + 500);
  });

  it("should preserve status code in output", () => {
    const rawError = "Rate limit exceeded";
    const sanitized = sanitizeErrorMessage(rawError, 429);

    expect(sanitized).toContain("API error 429");
    expect(sanitized).toContain("Rate limit exceeded");
  });

  it("should handle multiple keys in same message", () => {
    const rawError = "Keys sk-proj-abc123def456ghi789 and sk-xyz987uvw654rst321 are invalid";
    const sanitized = sanitizeErrorMessage(rawError, 401);

    expect(sanitized).not.toContain("sk-proj-");
    expect(sanitized).not.toContain("sk-xyz");
    const redactedCount = (sanitized.match(/\[REDACTED_KEY\]/g) || []).length;
    expect(redactedCount).toBe(2);
  });

  it("should redact Anthropic API keys (sk-ant-* format)", () => {
    const rawError = "Invalid API key: sk-ant-api03-abcdefghijklmnop";
    const sanitized = sanitizeErrorMessage(rawError, 401);

    expect(sanitized).not.toContain("sk-ant-");
    expect(sanitized).toContain("[REDACTED_KEY]");
  });

  it("should redact x-api-key header values", () => {
    const rawError = "Header x-api-key: sk-ant-secret123456789 was invalid";
    const sanitized = sanitizeErrorMessage(rawError, 403);

    expect(sanitized).not.toContain("sk-ant-secret");
    expect(sanitized).toContain("x-api-key: [REDACTED]");
  });
});
