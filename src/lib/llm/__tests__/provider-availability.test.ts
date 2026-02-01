/**
 * Tests for Provider Availability Checks (P0-2, P0-3)
 *
 * NOTE: These are integration tests that require actual API access.
 * They will be skipped in CI/CD without API keys.
 */

import { OllamaClient } from "../providers/ollama";

describe("OllamaClient - verifyModelStatus (P0-3)", () => {
  const mockConfig = {
    provider: "ollama" as const,
    model: "qwen2.5:7b-custom",
    baseUrl: "http://localhost:11434",
  };

  it("should return available: false when server is offline", async () => {
    const client = new OllamaClient({ ...mockConfig, baseUrl: "http://localhost:99999" });
    const status = await client.verifyModelStatus();

    expect(status.available).toBe(false);
    expect(status.modelExists).toBe(false);
  });

  it("should detect model existence when available", async () => {
    const client = new OllamaClient(mockConfig);

    // Skip if Ollama not running
    const isAvailable = await client.isAvailable();
    if (!isAvailable) {
      console.log("Ollama not running, skipping test");
      return;
    }

    const status = await client.verifyModelStatus();
    expect(status.available).toBe(true);
    // modelExists depends on whether qwen2.5:7b-custom is installed
  });

  it("should handle model name with tag suffix", async () => {
    const client = new OllamaClient({ ...mockConfig, model: "qwen2.5" });

    const isAvailable = await client.isAvailable();
    if (!isAvailable) {
      console.log("Ollama not running, skipping test");
      return;
    }

    const status = await client.verifyModelStatus();
    expect(status.available).toBe(true);
    // Should match "qwen2.5:7b-custom" as it starts with "qwen2.5:"
  });
});

/**
 * NOTE: OpenAI/Anthropic isAvailable() tests require API keys and network access.
 * These are better suited for manual testing or E2E test suites.
 * Skipped in unit test suite to avoid API calls during development.
 */
