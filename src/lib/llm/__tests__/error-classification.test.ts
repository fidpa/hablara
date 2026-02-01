/**
 * Tests for LLM Error Classification (P1-6)
 *
 * Verifies HTTP status code extraction and classification logic.
 */

import { classifyLLMErrorType } from "../error-types";

describe("classifyLLMErrorType - HTTP Status Detection", () => {
  it("should detect 429 rate limit from status code", () => {
    const error = new Error("API error 429: Too many requests");
    const type = classifyLLMErrorType(error, "openai");
    expect(type).toBe("rate_limit");
  });

  it("should detect 401 auth error from status code", () => {
    const error = new Error("API error 401: Unauthorized");
    const type = classifyLLMErrorType(error, "anthropic");
    expect(type).toBe("auth");
  });

  it("should detect 403 auth error from status code", () => {
    const error = new Error("API error 403: Forbidden");
    const type = classifyLLMErrorType(error, "openai");
    expect(type).toBe("auth");
  });

  it("should detect 500 server error from status code", () => {
    const error = new Error("API error 500: Internal Server Error");
    const type = classifyLLMErrorType(error, "ollama");
    expect(type).toBe("server_error");
  });

  it("should detect 503 server error from status code", () => {
    const error = new Error("API error 503: Service Unavailable");
    const type = classifyLLMErrorType(error, "anthropic");
    expect(type).toBe("server_error");
  });

  it("should prioritize HTTP status over string matching", () => {
    // Message says "timeout" but status code 429 should win
    const error = new Error("API error 429: Request timeout due to rate limit");
    const type = classifyLLMErrorType(error, "openai");
    expect(type).toBe("rate_limit"); // NOT "timeout"
  });

  it("should fall back to string matching if no HTTP status", () => {
    const error = new Error("Connection refused");
    const type = classifyLLMErrorType(error, "ollama");
    expect(type).toBe("offline");
  });

  it("should handle errors without HTTP status gracefully", () => {
    const error = new Error("Generic error message");
    const type = classifyLLMErrorType(error, "openai");
    expect(type).toBe("unknown");
  });
});
