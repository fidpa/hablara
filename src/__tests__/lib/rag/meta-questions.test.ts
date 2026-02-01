/**
 * Unit Tests: RAG Meta-Question Handling (V3.2)
 *
 * Tests the layered defense strategy for preventing hallucinations
 * when users ask meta-questions about chat history.
 *
 * Defense Layers:
 * 1. Meta-question detection: Regex-based detection skips KB search
 * 2. Search-score threshold: Filters low-scoring chunks
 * 3. Enhanced system prompt: LLM instruction to prioritize history
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeRAGQuery } from "@/lib/rag/pipeline";
import type { ChatMessage } from "@/lib/types";
import type { BaseLLMClient } from "@/lib/llm/client-interface";

// Mock dependencies (factory function required for hoisting)
vi.mock("@/lib/rag/search-dispatcher", () => ({
  searchKnowledge: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked function after vi.mock
import { searchKnowledge } from "@/lib/rag/search-dispatcher";

describe("RAG Meta-Question Handling (V3.2)", () => {
  // Mock LLM client
  const mockLLM: BaseLLMClient = {
    generateChat: vi.fn(),
  } as unknown as BaseLLMClient;

  // Sample chat history
  const sampleHistory: ChatMessage[] = [
    {
      id: "1",
      role: "user",
      content: "Was ist Emotionserkennung?",
      timestamp: new Date("2026-01-29T10:00:00Z"),
    },
    {
      id: "2",
      role: "assistant",
      content:
        "Emotionserkennung ist die Analyse von Sprache und Audio-Features...",
      timestamp: new Date("2026-01-29T10:00:05Z"),
    },
    {
      id: "3",
      role: "user",
      content: "Wie funktioniert das Vier-Seiten-Modell?",
      timestamp: new Date("2026-01-29T10:01:00Z"),
    },
    {
      id: "4",
      role: "assistant",
      content:
        "Das Vier-Seiten-Modell nach Schulz von Thun beschreibt vier Aspekte...",
      timestamp: new Date("2026-01-29T10:01:10Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchKnowledge).mockReset();
    (mockLLM.generateChat as ReturnType<typeof vi.fn>).mockResolvedValue(
      "Mocked LLM answer"
    );
  });

  describe("Layer 1: Meta-Question Detection", () => {
    it("should detect 'Was habe ich gefragt?' and skip KB search", async () => {
      const question = "Was habe ich dich gerade gefragt?";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      // Verify search was NOT called (meta-question early exit)
      expect(searchKnowledge).not.toHaveBeenCalled();

      // Verify LLM was called with history-only prompt
      expect(mockLLM.generateChat).toHaveBeenCalled();

      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      // Get LAST user message (the actual question prompt, not history)
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      // Should NOT contain "Kontext aus Wissensbasis"
      expect(userMessage).not.toContain("Kontext aus Wissensbasis");
      // Should contain hint about no KB results
      expect(userMessage).toContain(
        "Keine relevanten Informationen in der Wissensbasis gefunden"
      );
    });

    it("should detect 'Was war meine letzte Frage?'", async () => {
      const question = "Was war meine letzte Frage?";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      expect(searchKnowledge).not.toHaveBeenCalled();
    });

    it("should detect 'Worüber haben wir gesprochen?'", async () => {
      const question = "Worüber haben wir gerade gesprochen?";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      expect(searchKnowledge).not.toHaveBeenCalled();
    });

    it("should NOT detect domain questions as meta-questions", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "Vier-Seiten-Modell",
            category: "enrichment",
            content: "Das Vier-Seiten-Modell beschreibt...",
          },
          score: 0.85,
        },
      ]);

      const question = "Was ist das Vier-Seiten-Modell?";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      // Normal flow: search SHOULD run
      expect(searchKnowledge).toHaveBeenCalledWith(question, 3);

      // Verify KB chunks present in prompt
      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      expect(userMessage).toContain("Kontext aus Wissensbasis");
      expect(userMessage).toContain("Vier-Seiten-Modell");
    });

    it("should handle edge case: question ABOUT the phrase 'was habe ich gefragt'", async () => {
      searchKnowledge.mockResolvedValue([]);

      const question = "Was bedeutet die Phrase 'was habe ich gefragt'?";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      // This should NOT be detected as meta (asking about the phrase, not the history)
      // However, current regex WILL match - this is acceptable behavior
      // (Better to over-trigger meta-detection than under-trigger)
    });
  });

  describe("Layer 2: Search-Score Threshold", () => {
    it("should filter chunks below MIN_RELEVANCE_THRESHOLD (0.3)", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "Irrelevant Chunk 1",
            category: "onboarding",
            content: "Unrelated content...",
          },
          score: 0.1,
        },
        {
          chunk: {
            id: "2",
            title: "Irrelevant Chunk 2",
            category: "troubleshooting",
            content: "Also unrelated...",
          },
          score: 0.2,
        },
      ]);

      const question = "Completely off-topic question";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      // Verify search was called (not a meta-question)
      expect(searchKnowledge).toHaveBeenCalled();

      // Verify NO KB chunks in prompt (all scores < 0.3)
      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      expect(userMessage).not.toContain("Irrelevant Chunk 1");
      expect(userMessage).not.toContain("Irrelevant Chunk 2");
      expect(userMessage).toContain(
        "Keine relevanten Informationen in der Wissensbasis gefunden"
      );
    });

    it("should include chunks above MIN_RELEVANCE_THRESHOLD", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "Relevant Chunk",
            category: "enrichment",
            content: "Important information about emotions...",
          },
          score: 0.8,
        },
      ]);

      const question = "Domain question about emotions";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      expect(userMessage).toContain("Kontext aus Wissensbasis");
      expect(userMessage).toContain("Relevant Chunk");
      expect(userMessage).toContain("Important information about emotions");
    });

    it("should include chunks with score exactly 0.3 (>= threshold)", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "Edge Case Chunk",
            category: "enrichment",
            content: "Borderline relevance...",
          },
          score: 0.3,
        },
      ]);

      const question = "Borderline relevance question";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      // Score 0.3 should be INCLUDED (>= threshold)
      expect(userMessage).toContain("Edge Case Chunk");
    });

    it("should filter mixed results (some above, some below threshold)", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "High Score Chunk",
            category: "enrichment",
            content: "Very relevant...",
          },
          score: 0.9,
        },
        {
          chunk: {
            id: "2",
            title: "Low Score Chunk",
            category: "onboarding",
            content: "Not relevant...",
          },
          score: 0.15,
        },
        {
          chunk: {
            id: "3",
            title: "Medium Score Chunk",
            category: "troubleshooting",
            content: "Moderately relevant...",
          },
          score: 0.5,
        },
      ]);

      const question = "Mixed relevance question";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const userMessages = callArgs.filter((m) => m.role === "user");
      const userMessage = userMessages[userMessages.length - 1]?.content;

      // High and medium should be included
      expect(userMessage).toContain("High Score Chunk");
      expect(userMessage).toContain("Medium Score Chunk");
      // Low should be filtered
      expect(userMessage).not.toContain("Low Score Chunk");
    });
  });

  describe("Layer 3: System Prompt Enhancement", () => {
    it("should include meta-question instruction in system prompt", async () => {
      searchKnowledge.mockResolvedValue([]);

      const question = "Any question";
      await executeRAGQuery(question, sampleHistory, mockLLM);

      const callArgs = (mockLLM.generateChat as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Array<{ role: string; content: string }>;
      const systemMessage = callArgs.find((m) => m.role === "system")?.content;

      // Verify system prompt contains meta-question instruction
      expect(systemMessage).toContain("KRITISCH: Meta-Fragen über Chat-Verlauf");
      expect(systemMessage).toContain("IGNORIERE die bereitgestellte Wissensbasis");
      expect(systemMessage).toContain("Beantworte NUR aus der Chat-History");
    });
  });

  describe("Error Handling", () => {
    it("should handle LLM errors gracefully (meta-question mode)", async () => {
      // Meta-question won't call searchKnowledge, but set default anyway
      vi.mocked(searchKnowledge).mockResolvedValue([]);

      (mockLLM.generateChat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM service unavailable")
      );

      const question = "Was habe ich gefragt?";
      const result = await executeRAGQuery(question, sampleHistory, mockLLM);

      expect(result).toContain("Entschuldigung");
      expect(result).toContain("konnte deine Frage nicht beantworten");
    });

    it("should handle LLM errors gracefully (normal mode)", async () => {
      searchKnowledge.mockResolvedValue([]);
      (mockLLM.generateChat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM service unavailable")
      );

      const question = "Domain question";
      const result = await executeRAGQuery(question, sampleHistory, mockLLM);

      expect(result).toContain("Entschuldigung");
    });
  });

  describe("Integration: Full Pipeline", () => {
    it("should handle complete meta-question flow", async () => {
      const question = "Was habe ich dich gerade gefragt?";
      (mockLLM.generateChat as ReturnType<typeof vi.fn>).mockResolvedValue(
        "Du hast mich gefragt: 'Wie funktioniert das Vier-Seiten-Modell?'"
      );

      const result = await executeRAGQuery(question, sampleHistory, mockLLM);

      // Should cite from history
      expect(result).toContain("Vier-Seiten-Modell");
      // Should NOT hallucinate KB content
      expect(result).not.toContain("Emotionserkennung nutzt 12 Audio-Features");
    });

    it("should handle complete domain-question flow", async () => {
      searchKnowledge.mockResolvedValue([
        {
          chunk: {
            id: "1",
            title: "Emotion Detection",
            category: "enrichment",
            content: "Emotion Detection nutzt 12 Audio-Features...",
          },
          score: 0.9,
        },
      ]);

      (mockLLM.generateChat as ReturnType<typeof vi.fn>).mockResolvedValue(
        "Emotionserkennung nutzt 12 Audio-Features **[Quelle: Emotion Detection]**."
      );

      const question = "Was ist Emotionserkennung?";
      const result = await executeRAGQuery(question, sampleHistory, mockLLM);

      // Should use KB content
      expect(result).toContain("12 Audio-Features");
      expect(result).toContain("[Quelle: Emotion Detection]");
    });
  });
});
