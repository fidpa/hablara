/**
 * Code-Block-Stripping Tests
 *
 * Tests für die Markdown Code-Block Entfernung in generateChat() Responses.
 * Verhindert Formatierungs-Probleme bei RAG/Chat-Responses.
 *
 * Root Cause: Ollama/qwen wraps Markdown in ```markdown``` blocks
 * Fix: Defensive stripping wie in generateChatSummary()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OllamaClient } from "../providers/ollama";
import { OpenAIClient } from "../providers/openai";
import { AnthropicClient } from "../providers/anthropic";

// Mock fetch globally
global.fetch = vi.fn();

// Mock secure-storage module
vi.mock("../../secure-storage", () => ({
  getApiKey: vi.fn().mockResolvedValue("test-key"),
  storeApiKey: vi.fn(),
}));

describe("Code-Block-Stripping in generateChat()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OllamaClient", () => {
    it("should strip ```markdown``` wrapper from RAG response", async () => {
      const client = new OllamaClient({ provider: "ollama", model: "qwen2.5:7b-custom" });

      // Mock response with code-block wrapper
      const wrappedResponse = "```markdown\n**Emotions-Analyse**\n\nFrustration (80%) dominiert...\n```";
      const expectedClean = "**Emotions-Analyse**\n\nFrustration (80%) dominiert...";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: wrappedResponse }),
      } as Response);

      const result = await client.generateChat([
        { role: "user", content: "Test question" }
      ]);

      expect(result).toBe(expectedClean);
      expect(result).not.toContain("```markdown");
    });

    it("should strip ```md``` wrapper (short variant)", async () => {
      const client = new OllamaClient({ provider: "ollama", model: "qwen2.5:7b-custom" });

      const wrappedResponse = "```md\n**Bold text**\n```";
      const expectedClean = "**Bold text**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: wrappedResponse }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(expectedClean);
    });

    it("should strip ``` wrapper (no language specifier)", async () => {
      const client = new OllamaClient({ provider: "ollama", model: "qwen2.5:7b-custom" });

      const wrappedResponse = "```\n**Text**\n```";
      const expectedClean = "**Text**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: wrappedResponse }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(expectedClean);
    });

    it("should NOT strip if response is already clean", async () => {
      const client = new OllamaClient({ provider: "ollama", model: "qwen2.5:7b-custom" });

      const cleanResponse = "**Emotions-Analyse**\n\nFrustration (80%) dominiert...";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: cleanResponse }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(cleanResponse);
    });

    it("should preserve code blocks within content", async () => {
      const client = new OllamaClient({ provider: "ollama", model: "qwen2.5:7b-custom" });

      // Outer wrapper should be stripped, inner code block preserved
      const wrappedResponse = "```markdown\nHere's an example:\n\n```typescript\nconst x = 1;\n```\n```";
      const expectedClean = "Here's an example:\n\n```typescript\nconst x = 1;\n```";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: wrappedResponse }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(expectedClean);
      expect(result).toContain("```typescript"); // Inner block preserved
    });
  });

  describe("OpenAIClient", () => {
    it("should strip ```markdown``` wrapper from RAG response", async () => {
      const client = new OpenAIClient({ provider: "openai", model: "gpt-4o-mini" });

      const wrappedResponse = "```markdown\n**Test**\n```";
      const expectedClean = "**Test**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: wrappedResponse } }] }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(expectedClean);
    });

    it("should NOT strip if response is clean", async () => {
      const client = new OpenAIClient({ provider: "openai", model: "gpt-4o-mini" });

      const cleanResponse = "**Clean response**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: cleanResponse } }] }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(cleanResponse);
    });
  });

  describe("AnthropicClient", () => {
    it("should strip ```markdown``` wrapper from RAG response", async () => {
      const client = new AnthropicClient({ provider: "anthropic", model: "claude-sonnet-4" });

      const wrappedResponse = "```markdown\n**Test**\n```";
      const expectedClean = "**Test**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: wrappedResponse }] }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(expectedClean);
    });

    it("should NOT strip if response is clean", async () => {
      const client = new AnthropicClient({ provider: "anthropic", model: "claude-sonnet-4" });

      const cleanResponse = "**Clean response**";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: cleanResponse }] }),
      } as Response);

      const result = await client.generateChat([{ role: "user", content: "Test" }]);

      expect(result).toBe(cleanResponse);
    });
  });
});
