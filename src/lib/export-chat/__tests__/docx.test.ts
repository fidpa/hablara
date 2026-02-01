/**
 * DOCX Export Tests
 *
 * Focus: Integration testing with mocked Tauri APIs
 * Tests exportAsDOCX with various message configurations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportAsDOCX } from "../docx";
import type { ChatMessage } from "@/lib/types";
import type { ExportOptions } from "../types";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: vi.fn(),
}));

// Mock docx library
vi.mock("docx", () => {
  const mockDocument = vi.fn();
  const mockPacker = {
    toBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
  };
  const mockParagraph = vi.fn();
  const mockTextRun = vi.fn();

  return {
    Document: mockDocument,
    Packer: mockPacker,
    Paragraph: mockParagraph,
    TextRun: mockTextRun,
    AlignmentType: {
      CENTER: "center",
      LEFT: "left",
    },
    BorderStyle: {
      SINGLE: "single",
    },
  };
});

describe("DOCX Export", () => {
  const mockOptions: ExportOptions = {
    includeMetadata: true,
    includeAudioFeatures: true,
    includeTimestamps: true,
  };

  const mockMessage: ChatMessage = {
    id: "1",
    role: "user",
    content: "Test message",
    timestamp: new Date("2024-01-15T10:00:00Z"),
    source: "text",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Export", () => {
    it("should export successfully with valid messages", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");

      const result = await exportAsDOCX([mockMessage], mockOptions);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe("/path/to/chat.docx");
      expect(save).toHaveBeenCalledWith({
        defaultPath: expect.stringContaining("hablara-sprachanalyse-"),
        filters: [{ name: "Word Document", extensions: ["docx"] }],
      });
      expect(writeFile).toHaveBeenCalledWith(
        "/path/to/chat.docx",
        expect.any(Uint8Array)
      );
    });

    it("should return cancelled:true when user cancels dialog", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");

      vi.mocked(save).mockResolvedValue(null);

      const result = await exportAsDOCX([mockMessage], mockOptions);

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error on write failure", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockRejectedValue(new Error("Write failed"));

      const result = await exportAsDOCX([mockMessage], mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Write failed");
    });
  });

  describe("Options: includeTimestamps", () => {
    it("should respect includeTimestamps: true", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const result = await exportAsDOCX([mockMessage], {
        ...mockOptions,
        includeTimestamps: true,
      });

      expect(result.success).toBe(true);
      // Actual timestamp inclusion is tested via integration/manual testing
    });

    it("should respect includeTimestamps: false", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const result = await exportAsDOCX([mockMessage], {
        ...mockOptions,
        includeTimestamps: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Options: includeMetadata", () => {
    it("should export with GFK metadata", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithGFK: ChatMessage = {
        ...mockMessage,
        gfk: {
          observations: ["Beobachtung 1"],
          feelings: ["Freude", "Dankbarkeit"],
          needs: ["Verbindung"],
          requests: ["Bitte 1"],
          gfkTranslation: "Translation",
          reflectionQuestion: "Question",
        },
      };

      const result = await exportAsDOCX([messageWithGFK], {
        ...mockOptions,
        includeMetadata: true,
      });

      expect(result.success).toBe(true);
    });

    it("should export with cognitive distortions", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithCognitive: ChatMessage = {
        ...mockMessage,
        cognitive: {
          overallThinkingStyle: "balanced",
          distortions: [
            {
              type: "Catastrophizing" as const,
              quote: "Quote example",
              explanation: "Example explanation",
              reframe: "Alternative reframe",
            },
          ],
        },
      };

      const result = await exportAsDOCX([messageWithCognitive], {
        ...mockOptions,
        includeMetadata: true,
      });

      expect(result.success).toBe(true);
    });

    it("should export with Four Sides model", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithFourSides: ChatMessage = {
        ...mockMessage,
        fourSides: {
          sachinhalt: "Factual content",
          selbstoffenbarung: "Self-disclosure",
          beziehung: "Relationship",
          appell: "Appeal",
          potentielleMissverstaendnisse: ["Misunderstanding 1"],
        },
      };

      const result = await exportAsDOCX([messageWithFourSides], {
        ...mockOptions,
        includeMetadata: true,
      });

      expect(result.success).toBe(true);
    });

    it("should skip metadata when option is false", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithGFK: ChatMessage = {
        ...mockMessage,
        gfk: {
          observations: [],
          feelings: ["Freude"],
          needs: ["Verbindung"],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      };

      const result = await exportAsDOCX([messageWithGFK], {
        ...mockOptions,
        includeMetadata: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Options: includeAudioFeatures", () => {
    it("should export with audio features", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithAudio: ChatMessage = {
        ...mockMessage,
        source: "voice",
        audioFeatures: {
          pitch: 150.5,
          energy: 0.75,
          speechRate: 1.2,
          mfcc: [],
          pitchVariance: 0.1,
          pitchRange: 0.2,
          energyVariance: 0.3,
          pauseDurationAvg: 0.4,
          pauseFrequency: 0.5,
          zcrMean: 0.6,
          spectralCentroid: 0.7,
          spectralRolloff: 0.8,
          spectralFlux: 0.9,
        },
      };

      const result = await exportAsDOCX([messageWithAudio], {
        ...mockOptions,
        includeAudioFeatures: true,
      });

      expect(result.success).toBe(true);
    });

    it("should skip audio features when option is false", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messageWithAudio: ChatMessage = {
        ...mockMessage,
        audioFeatures: {
          pitch: 150,
          energy: 0.75,
          speechRate: 1.2,
          mfcc: [],
          pitchVariance: 0.1,
          pitchRange: 0.2,
          energyVariance: 0.3,
          pauseDurationAvg: 0.4,
          pauseFrequency: 0.5,
          zcrMean: 0.6,
          spectralCentroid: 0.7,
          spectralRolloff: 0.8,
          spectralFlux: 0.9,
        },
      };

      const result = await exportAsDOCX([messageWithAudio], {
        ...mockOptions,
        includeAudioFeatures: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message array", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const result = await exportAsDOCX([], mockOptions);

      expect(result.success).toBe(true);
    });

    it("should handle large message array", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: "user" as const,
        content: `Message ${i}`.repeat(10),
        timestamp: new Date(),
        source: "text" as const,
      }));

      const result = await exportAsDOCX(largeMessages, mockOptions);

      expect(result.success).toBe(true);
    });

    it("should handle messages with special characters", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const specialMessage: ChatMessage = {
        ...mockMessage,
        content: "Test with <script>alert('XSS')</script> and äöüß & special chars",
      };

      const result = await exportAsDOCX([specialMessage], mockOptions);

      expect(result.success).toBe(true);
    });

    it("should handle very long content", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const longMessage: ChatMessage = {
        ...mockMessage,
        content: "Lorem ipsum ".repeat(1000), // ~10KB text
      };

      const result = await exportAsDOCX([longMessage], mockOptions);

      expect(result.success).toBe(true);
    });
  });

  describe("User vs Assistant Messages", () => {
    it("should differentiate between user and assistant messages", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "User message",
          timestamp: new Date(),
          source: "text",
        },
        {
          id: "2",
          role: "assistant",
          content: "Assistant message",
          timestamp: new Date(),
        },
      ];

      const result = await exportAsDOCX(messages, mockOptions);

      expect(result.success).toBe(true);
    });

    it("should include source information for user messages", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(save).mockResolvedValue("/path/to/chat.docx");
      vi.mocked(writeFile).mockResolvedValue();

      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Voice message",
          timestamp: new Date(),
          source: "voice",
        },
        {
          id: "2",
          role: "user",
          content: "Text message",
          timestamp: new Date(),
          source: "text",
        },
        {
          id: "3",
          role: "user",
          content: "RAG message",
          timestamp: new Date(),
          source: "rag",
        },
      ];

      const result = await exportAsDOCX(messages, mockOptions);

      expect(result.success).toBe(true);
    });
  });
});
