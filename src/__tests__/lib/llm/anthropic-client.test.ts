/**
 * Anthropic Client Unit Tests
 *
 * Tests for AnthropicClient implementation:
 * - API key lazy loading
 * - All 9 analysis methods
 * - Pre-filters for short text
 * - Error handling with graceful fallbacks
 * - Missing API key error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnthropicClient } from "@/lib/llm";
import type { LLMConfig } from "@/lib/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock secure-storage
vi.mock("@/lib/secure-storage", () => ({
  getApiKey: vi.fn().mockResolvedValue("sk-ant-test-key-12345"),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("AnthropicClient", () => {
  let client: AnthropicClient;
  const config: LLMConfig = {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    client = new AnthropicClient(config);
  });

  describe("constructor", () => {
    it("should set provider to 'anthropic'", () => {
      expect(client.provider).toBe("anthropic");
    });

    it("should use provided model", () => {
      expect(client.model).toBe("claude-sonnet-4-20250514");
    });
  });

  describe("isAvailable", () => {
    it("should return true when API key is configured", async () => {
      const result = await client.isAvailable();
      expect(result).toBe(true);
    });

    it("should return false when API key is missing", async () => {
      const { getApiKey } = await import("@/lib/secure-storage");
      vi.mocked(getApiKey).mockResolvedValueOnce(null);

      const clientNoKey = new AnthropicClient(config);
      const result = await clientNoKey.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("analyzeEmotion", () => {
    it("should analyze emotion from text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              primary: "stress",
              confidence: 0.8,
              markers: ["müde", "erschöpft"],
            }),
          }],
        }),
      });

      const result = await client.analyzeEmotion("Ich bin so müde und erschöpft heute.");
      expect(result.primary).toBe("stress");
      expect(result.confidence).toBe(0.8);
    });

    it("should return neutral for short text", async () => {
      const result = await client.analyzeEmotion("Hi");
      expect(result.primary).toBe("neutral");
      expect(result.confidence).toBe(0.3);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await client.analyzeEmotion("This is a test text for emotion analysis.");
      expect(result.primary).toBe("neutral");
    });
  });

  describe("analyzeArgument", () => {
    it("should analyze fallacies in text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              fallacies: [{
                type: "ad_hominem",
                confidence: 0.85,
                quote: "Du bist dumm",
                explanation: "Angriff auf die Person",
                suggestion: "Argumentiere sachlich",
              }],
              enrichment: "Der Text enthält einen persönlichen Angriff.",
            }),
          }],
        }),
      });

      const result = await client.analyzeArgument(
        "Du bist dumm, deshalb hast du unrecht mit deiner Meinung."
      );
      expect(result.fallacies).toHaveLength(1);
      expect(result.fallacies[0].type).toBe("ad_hominem");
    });

    it("should return empty for short text", async () => {
      const result = await client.analyzeArgument("Hi");
      expect(result.fallacies).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("analyzeTone", () => {
    it("should analyze tone dimensions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              formality: 4,
              professionalism: 4,
              directness: 3,
              energy: 2,
              seriousness: 4,
              confidence: 0.75,
            }),
          }],
        }),
      });

      const result = await client.analyzeTone("Sehr geehrte Damen und Herren, hiermit teile ich Ihnen mit...");
      expect(result.formality).toBe(4);
      expect(result.professionalism).toBe(4);
    });

    it("should return neutral tone for short text", async () => {
      const result = await client.analyzeTone("Ja");
      expect(result.formality).toBe(3);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("analyzeGFK", () => {
    it("should analyze GFK components", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              observations: ["Du bist zu spät"],
              feelings: ["frustriert"],
              needs: ["Respekt", "Pünktlichkeit"],
              requests: ["Bitte komm pünktlich"],
              gfk_translation: "Ich fühle mich frustriert...",
              reflection_question: "Was könnte dahinter stecken?",
            }),
          }],
        }),
      });

      const result = await client.analyzeGFK("Du bist immer zu spät, das nervt mich total!");
      expect(result.feelings).toContain("frustriert");
      expect(result.needs).toContain("Respekt");
    });
  });

  describe("generateChat", () => {
    it("should generate chat response with messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: "text",
            text: "Dies ist eine Antwort auf deine Frage.",
          }],
        }),
      });

      const messages = [
        { role: "system" as const, content: "Du bist ein hilfreicher Assistent." },
        { role: "user" as const, content: "Hallo, wie geht es dir?" },
      ];

      const result = await client.generateChat(messages);
      expect(result).toBe("Dies ist eine Antwort auf deine Frage.");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "sk-ant-test-key-12345",
            "anthropic-version": "2023-06-01",
            // CORS header added for browser fallback
            "anthropic-dangerous-direct-browser-access": "true",
          }),
        })
      );
    });

    it("should handle system message separately (Anthropic-specific)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "Response" }],
        }),
      });

      const messages = [
        { role: "system" as const, content: "System prompt" },
        { role: "user" as const, content: "User message" },
      ];

      await client.generateChat(messages);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system).toBe("System prompt");
      expect(callBody.messages).toEqual([{ role: "user", content: "User message" }]);
    });
  });
});
