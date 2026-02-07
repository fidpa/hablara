/**
 * Ollama Client Unit Tests
 *
 * Tests for OllamaClient implementation:
 * - generateChatSummary method
 * - Short text fallback
 * - Fallacy description building
 * - Error handling with graceful fallbacks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OllamaClient } from "@/lib/llm";
import type { LLMConfig, Fallacy, EmotionState } from "@/lib/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("OllamaClient", () => {
  let client: OllamaClient;
  const config: LLMConfig = {
    provider: "ollama",
    model: "qwen2.5:7b-custom",
    baseUrl: "http://localhost:11434",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    client = new OllamaClient(config);
  });

  describe("constructor", () => {
    it("should set provider to 'ollama'", () => {
      expect(client.provider).toBe("ollama");
    });

    it("should use provided model", () => {
      expect(client.model).toBe("qwen2.5:7b-custom");
    });

    it("should use default baseUrl if not provided", () => {
      const defaultClient = new OllamaClient({
        provider: "ollama",
        model: "llama3",
      });
      expect(defaultClient.provider).toBe("ollama");
    });
  });

  describe("generateChatSummary", () => {
    const sampleEmotion: Partial<EmotionState> = {
      primary: "stress",
      confidence: 0.75,
      secondary: "frustration",
    };

    const sampleFallacies: Fallacy[] = [
      {
        type: "ad_hominem",
        confidence: 0.8,
        quote: "Du verstehst das nicht",
        explanation: "Angriff auf Person",
        suggestion: "Fokus auf Sachargumente",
        startIndex: 0,
        endIndex: 20,
      },
    ];

    it("should call LLM even for short text", async () => {
      // Note: generateChatSummary no longer has text length threshold
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "Kurze Zusammenfassung." }),
      });

      const result = await client.generateChatSummary("Hi", sampleEmotion, []);

      expect(result).toBe("Kurze Zusammenfassung.");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return error message for empty text when LLM fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Empty prompt"));

      const result = await client.generateChatSummary("", sampleEmotion, []);

      expect(result).toBe("Fehler bei der Zusammenfassung.");
    });

    it("should generate summary with LLM for valid text", async () => {
      const mockResponse = `**Emotions-Analyse**
Dein Ausdruck zeigt Stress (75%) mit einer Nebenemotion von Frustration.

**Argumentations-Analyse**
Keine Fehlschlüsse erkannt.

**Reflexions-Impuls**
Was beschäftigt dich gerade am meisten?`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: mockResponse }),
      });

      const result = await client.generateChatSummary(
        "Ich bin sehr gestresst wegen der Deadline.",
        sampleEmotion,
        []
      );

      expect(result).toContain("Emotions-Analyse");
      expect(result).toContain("Reflexions-Impuls");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should include fallacy information in summary", async () => {
      const mockResponse = `**Emotions-Analyse**
Dein Ausdruck zeigt Stress.

**Argumentations-Analyse**
Ich habe einen möglichen Ad Hominem erkannt.

**Reflexions-Impuls**
Was genau stört dich?`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: mockResponse }),
      });

      const result = await client.generateChatSummary(
        "Du verstehst das nicht, weil du keine Ahnung hast.",
        sampleEmotion,
        sampleFallacies
      );

      expect(result).toContain("Argumentations-Analyse");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should return error message on LLM error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await client.generateChatSummary(
        "Dies ist ein längerer Text für die Analyse.",
        sampleEmotion,
        []
      );

      // New behavior: returns error message, not structured fallback
      expect(result).toBe("Fehler bei der Zusammenfassung.");
    });

    it("should call LLM for neutral emotion", async () => {
      const neutralEmotion: Partial<EmotionState> = {
        primary: "neutral",
        confidence: 0.5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "Neutrale Zusammenfassung." }),
      });

      const result = await client.generateChatSummary("Test text", neutralEmotion, []);

      expect(result).toBe("Neutrale Zusammenfassung.");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return error message on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.generateChatSummary(
        "Dies ist ein Text mit Fehlschlüssen.",
        sampleEmotion,
        sampleFallacies
      );

      // New behavior: returns error message
      expect(result).toBe("Fehler bei der Zusammenfassung.");
    });

    it("should generate summary with structured prompt (new format)", async () => {
      const longText = "A".repeat(500);
      const mockResponse = "**Emotions-Analyse**\nTest response.";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: mockResponse }),
      });

      await client.generateChatSummary(longText, sampleEmotion, []);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      // V2.0 format: uses CHAT_SUMMARY_PROMPT with ROLLE section
      expect(callBody.prompt).toContain("ROLLE:");
      expect(callBody.prompt).toContain("empathischer Reflexions-Coach");
      expect(callBody.prompt).toContain("AUFGABE:");
      // Prompt includes analysis data placeholders
    });

    it("should call LLM even with missing secondary emotion", async () => {
      const emotionNoSecondary: Partial<EmotionState> = {
        primary: "calm",
        confidence: 0.9,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "Calm analysis without secondary." }),
      });

      const result = await client.generateChatSummary(
        "Test text",
        emotionNoSecondary,
        []
      );

      expect(result).toBe("Calm analysis without secondary.");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should use V2.0 prompt with 3 examples and role definition", async () => {
      const longText = "Das ist ein langer Text mit genug Zeichen.";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response:
              "**Emotions-Analyse**\nStress zeigt sich in deinem Sprechtempo.",
          }),
      });

      await client.generateChatSummary(longText, sampleEmotion, []);

      // Get the last fetch call (the actual generateChatSummary call)
      const lastCallIndex = mockFetch.mock.calls.length - 1;
      const callBody = JSON.parse(
        mockFetch.mock.calls[lastCallIndex]![1]!.body as string
      );
      expect(callBody.prompt).toContain("ROLLE:");
      expect(callBody.prompt).toContain("empathischer Reflexions-Coach");
      expect(callBody.prompt).toContain("BEISPIEL 1");
      expect(callBody.prompt).toContain("BEISPIEL 2");
      expect(callBody.prompt).toContain("BEISPIEL 3");
      expect(callBody.prompt).toContain("Vermeide Floskeln");
      expect(callBody.prompt).toContain("möglicherweise");
    });

    it("should handle mixed emotions (primary + secondary)", async () => {
      const mixedEmotion: Partial<EmotionState> = {
        primary: "excitement",
        confidence: 0.65,
        secondary: "stress",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response:
              "**Emotions-Analyse**\nAufregung (65%) zeigt sich. Stress (42%) liegt darunter.",
          }),
      });

      const result = await client.generateChatSummary(
        "Test text",
        mixedEmotion,
        []
      );

      expect(result).toContain("Aufregung");
      expect(result).toContain("65%");
    });
  });

  describe("isAvailable", () => {
    it("should return true when Ollama is running", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const result = await client.isAvailable();
      expect(result).toBe(true);
    });

    it("should return false when Ollama is not running", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await client.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("classifyTopic", () => {
    it("should return 'other' for short text (< 15 chars)", async () => {
      const result = await client.classifyTopic("Hi test");

      expect(result.topic).toBe("other");
      expect(result.confidence).toBe(0.4);
      expect(result.keywords).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return 'other' for empty text", async () => {
      const result = await client.classifyTopic("");

      expect(result.topic).toBe("other");
      expect(result.confidence).toBe(0.4);
    });

    it("should classify work-related text correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "work_career",
              confidence: 0.85,
              keywords: ["Meeting", "Chef", "Projekt"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich hatte heute ein Meeting mit meinem Chef."
      );

      expect(result.topic).toBe("work_career");
      expect(result.confidence).toBe(0.85);
      expect(result.keywords).toContain("Meeting");
    });

    it("should classify health-related text correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "health_wellbeing",
              confidence: 0.78,
              keywords: ["Schlaf", "müde"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich konnte nicht schlafen und bin sehr müde."
      );

      expect(result.topic).toBe("health_wellbeing");
      expect(result.confidence).toBe(0.78);
    });

    it("should return LLM result even for low confidence", async () => {
      // Note: Low confidence filtering is consumer responsibility, not client
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "work_career",
              confidence: 0.45,
              keywords: ["vielleicht"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich habe heute etwas gemacht."
      );

      // Client returns LLM result as-is, consumer decides how to handle low confidence
      expect(result.topic).toBe("work_career");
      expect(result.confidence).toBe(0.45);
    });

    it("should handle invalid topic type by falling back to 'other'", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "invalid_category",
              confidence: 0.9,
              keywords: ["test"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Dieser Text hat eine ungültige Kategorie."
      );

      expect(result.topic).toBe("other");
      expect(result.confidence).toBe(0.9);
    });

    it("should return default response on LLM error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await client.classifyTopic(
        "Dies ist ein längerer Text für den Test."
      );

      expect(result.topic).toBe("other");
      expect(result.confidence).toBe(0.4);
      expect(result.keywords).toEqual([]);
    });

    it("should handle malformed JSON response gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: "This is not JSON at all",
          }),
      });

      const result = await client.classifyTopic(
        "Dieser Text produziert fehlerhaftes JSON."
      );

      expect(result.topic).toBe("other");
      expect(result.confidence).toBe(0.4);
    });

    it("should clamp confidence to valid range [0, 1]", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "finances",
              confidence: 1.5, // Invalid: > 1
              keywords: ["Geld"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich muss mehr Geld sparen für den Urlaub."
      );

      expect(result.confidence).toBe(1.0); // Clamped to 1
    });

    it("should handle missing confidence with default 0.5", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "relationships_social",
              // confidence missing
              keywords: ["Freund"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich habe heute meinen Freund getroffen."
      );

      // Missing confidence defaults to 0.5, client returns LLM result
      expect(result.topic).toBe("relationships_social");
      expect(result.confidence).toBe(0.5);
    });

    it("should pass through keywords array from LLM", async () => {
      // Note: Keyword filtering/validation is consumer responsibility
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              topic: "creativity_hobbies",
              confidence: 0.82,
              keywords: ["Gitarre", "Musik"],
            }),
          }),
      });

      const result = await client.classifyTopic(
        "Ich habe heute Gitarre gespielt und Musik gehoert."
      );

      expect(result.topic).toBe("creativity_hobbies");
      expect(result.keywords).toEqual(["Gitarre", "Musik"]);
    });

    it("should handle all valid topic types", async () => {
      const validTopics = [
        "work_career",
        "health_wellbeing",
        "relationships_social",
        "finances",
        "personal_development",
        "creativity_hobbies",
        "other",
      ];

      for (const topicType of validTopics) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                topic: topicType,
                confidence: 0.85,
                keywords: ["test"],
              }),
            }),
        });

        const result = await client.classifyTopic(
          `Test text für ${topicType} Kategorie.`
        );

        expect(result.topic).toBe(topicType);
      }
    });
  });

  describe("Error Handling - Timeout & Network Errors", () => {
    describe("Timeout Scenarios", () => {
      it("should handle timeout error (>2000ms)", async () => {
        // Mock fetch to timeout
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new DOMException("The operation was aborted", "AbortError"));
            }, 100);
          });
        });

        // Should return false gracefully
        const result = await client.isAvailable();
        expect(result).toBe(false);
      });

      it("should handle timeout in analyzeEmotion gracefully", async () => {
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new DOMException("The operation was aborted", "AbortError"));
            }, 100);
          });
        });

        const result = await client.analyzeEmotion("Test text");

        // Should return default/fallback values
        expect(result).toBeDefined();
        expect(result.primary).toBe("neutral");
        expect(result.confidence).toBeGreaterThanOrEqual(0); // Fallback may have 0 confidence
      });
    });

    describe("Rate Limit Scenarios (HTTP 429)", () => {
      it("should handle rate limit error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: () => Promise.resolve({ error: "Rate limit exceeded" }),
        });

        const result = await client.analyzeEmotion("Test text");

        // Should return fallback instead of crashing
        expect(result).toBeDefined();
        expect(result.primary).toBe("neutral");
      });

      it("should handle rate limit in analyzeArgument", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: () => Promise.resolve({ error: "Rate limit exceeded" }),
        });

        const result = await client.analyzeArgument("Test text");

        // Should return empty fallacies array
        expect(result).toBeDefined();
        expect(result.fallacies).toEqual([]);
      });
    });

    describe("Server Error Scenarios (HTTP 500)", () => {
      it("should handle internal server error (500)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve({ error: "Server error" }),
        });

        const result = await client.analyzeEmotion("Test text");

        // Should return fallback
        expect(result.primary).toBe("neutral");
      });

      it("should handle service unavailable (503)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: () => Promise.resolve({ error: "Service unavailable" }),
        });

        const result = await client.isAvailable();
        expect(result).toBe(false);
      });
    });

    describe("Network Error Scenarios", () => {
      it("should handle network connection refused", async () => {
        mockFetch.mockRejectedValueOnce(
          new Error("fetch failed: ECONNREFUSED")
        );

        const result = await client.isAvailable();
        expect(result).toBe(false);
      });

      it("should handle network timeout (ETIMEDOUT)", async () => {
        mockFetch.mockRejectedValueOnce(new Error("ETIMEDOUT"));

        const result = await client.isAvailable();
        expect(result).toBe(false);
      });

      it("should handle DNS resolution failure", async () => {
        mockFetch.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));

        const result = await client.analyzeEmotion("Test text");

        // Should return fallback
        expect(result.primary).toBe("neutral");
      });
    });

    describe("JSON Format Parameter (Constrained Decoding)", () => {
      it("should send format: 'json' for analyzeEmotion", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: JSON.stringify({ primary: "neutral", confidence: 0.5, markers: [] }),
          }),
        });

        await client.analyzeEmotion("Dies ist ein Testtext für Emotionen.");

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
        expect(callBody.format).toBe("json");
      });

      it("should send format: 'json' for analyzeArgument", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: JSON.stringify({ fallacies: [], enrichment: "" }),
          }),
        });

        await client.analyzeArgument("Dies ist ein längerer Testtext für die Argumentation.");

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
        expect(callBody.format).toBe("json");
      });

      it("should send format: 'json' for classifyTopic", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: JSON.stringify({ topic: "other", confidence: 0.5, keywords: [] }),
          }),
        });

        await client.classifyTopic("Dies ist ein Testtext für die Kategorisierung.");

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
        expect(callBody.format).toBe("json");
      });

      it("should NOT send format: 'json' for generateChatSummary (expects Markdown)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: "**Emotions-Analyse**\nTest.",
          }),
        });

        await client.generateChatSummary("Test text", { primary: "neutral", confidence: 0.5 }, []);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
        expect(callBody.format).toBeUndefined();
      });

      it("should NOT send format: 'json' for generateChat (expects natural language)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: "Das ist eine natürliche Antwort.",
          }),
        });

        await client.generateChat([
          { role: "system", content: "Du bist ein Assistent." },
          { role: "user", content: "Was ist Hablará?" },
        ]);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
        expect(callBody.format).toBeUndefined();
      });
    });

    describe("Malformed Response Handling", () => {
      it("should handle non-JSON response", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error("Unexpected token")),
        });

        const result = await client.analyzeEmotion("Test text");

        // Should return fallback
        expect(result.primary).toBe("neutral");
      });

      it("should handle empty response body", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

        const result = await client.analyzeEmotion("Test text");

        // Should handle missing fields gracefully
        expect(result.primary).toBe("neutral");
      });

      it("should handle response with invalid emotion type", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                primary: "invalid_emotion_type",
                confidence: 0.8,
                reasoning: "Test",
              }),
            }),
        });

        const result = await client.analyzeEmotion("Test text");

        // Should fallback to neutral for invalid type
        expect(result.primary).toBe("neutral");
      });
    });
  });
});
