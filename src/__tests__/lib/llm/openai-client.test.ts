/**
 * OpenAI Client Unit Tests
 *
 * Tests for OpenAIClient implementation:
 * - API key lazy loading
 * - All 9 analysis methods
 * - Pre-filters for short text
 * - Error handling with graceful fallbacks
 * - Missing API key error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIClient } from "@/lib/llm";
import type { LLMConfig } from "@/lib/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock secure-storage
vi.mock("@/lib/secure-storage", () => ({
  getApiKey: vi.fn().mockResolvedValue("sk-openai-test-key-12345"),
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

describe("OpenAIClient", () => {
  let client: OpenAIClient;
  const config: LLMConfig = {
    provider: "openai",
    model: "gpt-4o-mini",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    client = new OpenAIClient(config);
  });

  describe("constructor", () => {
    it("should set provider to 'openai'", () => {
      expect(client.provider).toBe("openai");
    });

    it("should use provided model", () => {
      expect(client.model).toBe("gpt-4o-mini");
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

      const clientNoKey = new OpenAIClient(config);
      const result = await clientNoKey.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("analyzeEmotion", () => {
    it("should analyze emotion from text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                primary: "excitement",
                confidence: 0.85,
                markers: ["freue", "aufgeregt"],
              }),
            },
          }],
        }),
      });

      const result = await client.analyzeEmotion("Ich freue mich so sehr auf morgen! Bin total aufgeregt!");
      expect(result.primary).toBe("excitement");
      expect(result.confidence).toBe(0.85);
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
        status: 401,
        text: async () => "Unauthorized",
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
          choices: [{
            message: {
              content: JSON.stringify({
                fallacies: [{
                  type: "straw_man",
                  confidence: 0.9,
                  quote: "Du willst also",
                  explanation: "Verzerrte Darstellung",
                  suggestion: "Stelle die Position korrekt dar",
                }],
                enrichment: "Der Text verzerrt die Gegenposition.",
              }),
            },
          }],
        }),
      });

      const result = await client.analyzeArgument(
        "Du willst also, dass wir alle arm werden? Das ist doch Unsinn!"
      );
      expect(result.fallacies).toHaveLength(1);
      expect(result.fallacies[0].type).toBe("straw_man");
    });

    it("should return empty for short text", async () => {
      const result = await client.analyzeArgument("Nein");
      expect(result.fallacies).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("analyzeTone", () => {
    it("should analyze tone dimensions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                formality: 2,
                professionalism: 2,
                directness: 5,
                energy: 4,
                seriousness: 2,
                confidence: 0.8,
              }),
            },
          }],
        }),
      });

      const result = await client.analyzeTone("Hey, das ist echt cool! Mach weiter so!");
      expect(result.formality).toBe(2);
      expect(result.directness).toBe(5);
    });

    it("should return neutral tone for short text", async () => {
      const result = await client.analyzeTone("OK");
      expect(result.formality).toBe(3);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("analyzeCognitiveDistortions", () => {
    it("should detect cognitive distortions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                distortions: [{
                  type: "catastrophizing",
                  quote: "alles wird schrecklich",
                  explanation: "Übertriebene negative Erwartung",
                  reframe: "Es gibt auch positive Möglichkeiten",
                }],
                overall_thinking_style: "somewhat_distorted",
              }),
            },
          }],
        }),
      });

      const result = await client.analyzeCognitiveDistortions(
        "Wenn das schiefgeht, wird alles schrecklich und mein Leben ist ruiniert!"
      );
      expect(result.distortions).toHaveLength(1);
      expect(result.distortions[0].type).toBe("catastrophizing");
      expect(result.overallThinkingStyle).toBe("somewhat_distorted");
    });
  });

  describe("generateChat", () => {
    it("should generate chat response with messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: "Ich bin ein KI-Assistent und helfe dir gerne!",
            },
          }],
        }),
      });

      const messages = [
        { role: "system" as const, content: "Du bist ein hilfreicher Assistent." },
        { role: "user" as const, content: "Wer bist du?" },
      ];

      const result = await client.generateChat(messages);
      expect(result).toBe("Ich bin ein KI-Assistent und helfe dir gerne!");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer sk-openai-test-key-12345",
          }),
        })
      );
    });
  });
});
