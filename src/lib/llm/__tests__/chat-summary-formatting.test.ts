/**
 * Chat Summary Formatting Tests
 *
 * Verifies that LLM responses wrapped in code blocks are correctly stripped
 * to allow ReactMarkdown to render formatting (bold, headers) properly.
 *
 * Root Cause: Some LLMs (Ollama, qwen, self-hosted) wrap Markdown in ```markdown blocks
 * Fix: Prompt instruction (chat-summary.ts:36-39) + defensive runtime strip (base-client.ts)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger before imports
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "@/lib/logger";

/**
 * Simulates the code-block stripping logic from base-client.ts
 * Extracted for isolated unit testing
 */
function stripCodeBlockWrapper(response: string): string {
  let cleanedResponse = response.trim();

  // Match: ```markdown, ```md, or plain ``` code fences
  const codeBlockMatch = cleanedResponse.match(/^```(?:markdown|md)?\n?([\s\S]*?)\n?```\s*$/);
  if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
    cleanedResponse = codeBlockMatch[1].trim();
  }

  return cleanedResponse;
}

describe("Chat Summary Code Block Stripping", () => {
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    mockLogger.debug.mockClear();
  });

  describe("stripCodeBlockWrapper", () => {
    it("should strip ```markdown wrapper", () => {
      const wrapped = "```markdown\n**Emotions-Analyse**\nTest content\n```";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toBe("**Emotions-Analyse**\nTest content");
    });

    it("should strip ```md wrapper (short form)", () => {
      const wrapped = "```md\n**Emotions-Analyse**\nTest content\n```";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toBe("**Emotions-Analyse**\nTest content");
    });

    it("should strip plain ``` wrapper without language specifier", () => {
      const wrapped = "```\n**Emotions-Analyse**\nTest content\n```";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toBe("**Emotions-Analyse**\nTest content");
    });

    it("should preserve content without code block wrapper", () => {
      const unwrapped = "**Emotions-Analyse**\nTest content";
      const result = stripCodeBlockWrapper(unwrapped);

      expect(result).toBe("**Emotions-Analyse**\nTest content");
    });

    it("should handle trailing whitespace after closing fence", () => {
      const wrapped = "```markdown\n**Test**\n```  \n";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toBe("**Test**");
    });

    it("should handle no newline after opening fence", () => {
      const wrapped = "```markdown**Test**\n```";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toBe("**Test**");
    });

    it("should preserve multiline content correctly", () => {
      const multiline = "```markdown\n**Emotions-Analyse**\nFrustration (73%) praegte deine Sprechweise.\n\n**Reflexions-Impuls**\nWas wuerde passieren?\n```";
      const result = stripCodeBlockWrapper(multiline);

      expect(result).toContain("**Emotions-Analyse**");
      expect(result).toContain("Frustration (73%)");
      expect(result).toContain("**Reflexions-Impuls**");
      expect(result).not.toContain("```");
    });

    it("should NOT strip code blocks that are part of content", () => {
      // This is valid Markdown with a code block inside - should not be stripped
      const contentWithCodeBlock = "**Example:**\n```javascript\nconst x = 1;\n```\nMore text";
      const result = stripCodeBlockWrapper(contentWithCodeBlock);

      // The outer content should remain as-is (no outer wrapper to strip)
      expect(result).toBe(contentWithCodeBlock);
    });

    it("should handle empty content inside wrapper", () => {
      const emptyContent = "```markdown\n\n```";
      const result = stripCodeBlockWrapper(emptyContent);

      expect(result).toBe("");
    });

    it("should handle only whitespace content", () => {
      const whitespaceContent = "```markdown\n   \n```";
      const result = stripCodeBlockWrapper(whitespaceContent);

      expect(result).toBe("");
    });
  });

  describe("ReactMarkdown rendering compatibility", () => {
    it("stripped content should contain bold markers for ReactMarkdown", () => {
      const wrapped = "```markdown\n**Emotions-Analyse**\nCalm (82%) praegte deine Sprechweise.\n```";
      const result = stripCodeBlockWrapper(wrapped);

      // ReactMarkdown needs ** markers visible, not escaped
      expect(result).toMatch(/\*\*Emotions-Analyse\*\*/);
    });

    it("stripped content should preserve all Markdown syntax", () => {
      const wrapped = "```markdown\n**Bold** and *italic* and [link](url)\n```";
      const result = stripCodeBlockWrapper(wrapped);

      expect(result).toContain("**Bold**");
      expect(result).toContain("*italic*");
      expect(result).toContain("[link](url)");
    });
  });
});
