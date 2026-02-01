import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChatMessage } from "@/lib/types";

// Create mock doc instance that will be returned by jsPDF constructor
const mockDoc = {
  // Existing methods
  addPage: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  text: vi.fn(),
  output: vi.fn((type: string) => {
    if (type === "arraybuffer") {
      return new ArrayBuffer(100);
    }
    return new ArrayBuffer(100);
  }),
  // Visual design methods (required by export-common)
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFillColor: vi.fn(),
  roundedRect: vi.fn(),
  rect: vi.fn(),
  circle: vi.fn(),
  setTextColor: vi.fn(),
  getTextWidth: vi.fn(() => 50), // Return reasonable default
};

// Mock jsPDF - must be before imports
// Create a class-like mock that works with `new jsPDF()`
vi.mock("jspdf", () => {
  const MockJsPDF = class {
    constructor() {
      // Return mockDoc properties and methods on the instance
      return mockDoc;
    }
  };
  return {
    default: MockJsPDF,
  };
});

// Mock Tauri plugins
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock adapters
vi.mock("@/lib/adapters", () => ({
  chatMessageToRecordingMetadata: vi.fn((msg, index) => ({
    id: msg.id || `chat-msg-${index}`,
    createdAt: new Date(msg.timestamp).toISOString(),
    transcription: {
      text: msg.content,
      provider: "unknown",
      model: "unknown",
      language: "de",
      processingTimeMs: 0,
    },
    source: msg.source === "voice" ? "recording" : "text",
    gfk: msg.gfk,
    cognitive: msg.cognitive,
    fourSides: msg.fourSides,
    durationMs: 0,
    sampleRate: 0,
    fileSize: 0,
    audioValidation: {
      rmsEnergy: 0,
      durationMs: 0,
      sampleCount: 0,
      passed: false,
    },
    vadStats: null,
  })),
}));

// Mock config to avoid module resolution issues
vi.mock("../config", () => ({
  PDF_EXPORT_CONFIG: {
    page: {
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    },
    layout: {
      marginLeft: 20,
      marginTop: 20,
      marginBottom: 20,
      maxContentWidth: 170,
      maxY: 277,
    },
    typography: {
      lineHeight: 6,
      fontSize: {
        title: 18,
        subtitle: 12,
        body: 10,
        caption: 9,
        small: 8,
      },
      font: {
        family: "helvetica",
        styleNormal: "normal",
        styleBold: "bold",
      },
    },
    spacing: {
      afterHeader: 6,
      betweenMessages: 8,
      beforeMetadata: 2,
    },
  },
}));

// Import after mocks
import { exportAsPDFWithJsPDF, generatePrintHTML } from "../pdf";

describe("exportAsPDFWithJsPDF", () => {
  const mockMessages: ChatMessage[] = [
    {
      id: "1",
      role: "user",
      content: "Test message",
      timestamp: Date.now(),
      source: "text",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset ALL mock doc methods
    Object.values(mockDoc).forEach((mock) => {
      if (typeof mock === "function" && mock.mockClear) {
        mock.mockClear();
      }
    });
    // Reset default implementations
    mockDoc.splitTextToSize.mockImplementation((text: string) => [text]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockDoc.output.mockImplementation((type: string) => {
      if (type === "arraybuffer") {
        return new ArrayBuffer(100);
      }
      return new ArrayBuffer(100);
    });
    mockDoc.getTextWidth.mockImplementation(() => 50);
  });

  it("should generate PDF with correct structure", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    const result = await exportAsPDFWithJsPDF(mockMessages, {
      includeMetadata: true,
      includeAudioFeatures: false,
      includeTimestamps: true,
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/path/to/file.pdf");
    expect(save).toHaveBeenCalledWith({
      defaultPath: expect.stringContaining("hablara-sprachanalyse-"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    expect(writeFile).toHaveBeenCalledWith(
      "/path/to/file.pdf",
      expect.any(Uint8Array)
    );
  });

  it("should handle user cancellation", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { logger } = await import("@/lib/logger");

    vi.mocked(save).mockResolvedValue(null);

    const result = await exportAsPDFWithJsPDF(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith("ChatExport", "User cancelled PDF export");
  });

  it("should handle jsPDF errors gracefully", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { logger } = await import("@/lib/logger");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");

    // Make output throw an error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockDoc.output.mockImplementation((type: string) => {
      throw new Error("jsPDF output failed");
    });

    const result = await exportAsPDFWithJsPDF(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("jsPDF output failed");
    expect(logger.error).toHaveBeenCalledWith(
      "ChatExport",
      "PDF export failed",
      expect.any(Error)
    );
  });

  it("should respect includeTimestamps option", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    // With timestamps
    const result1 = await exportAsPDFWithJsPDF(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: true,
    });

    expect(result1.success).toBe(true);
    const callsWithTimestamps = mockDoc.text.mock.calls;
    const hasTimestamp = callsWithTimestamps.some((call) =>
      String(call[0]).includes("Zeit:")
    );
    expect(hasTimestamp).toBe(true);

    // Clear mocks for second test
    mockDoc.text.mockClear();
    mockDoc.splitTextToSize.mockClear();
    vi.mocked(save).mockResolvedValue("/path/to/file2.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    // Without timestamps
    const result2 = await exportAsPDFWithJsPDF(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(result2.success).toBe(true);
    const callsWithoutTimestamps = mockDoc.text.mock.calls;
    const hasTimestampAfter = callsWithoutTimestamps.some((call) =>
      String(call[0]).includes("Zeit:")
    );
    expect(hasTimestampAfter).toBe(false);
  });

  it("should respect includeMetadata option", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    const messagesWithMetadata: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "voice",
        gfk: {
          observations: [],
          feelings: ["Freude"],
          needs: ["Verbindung"],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      },
    ];

    // With metadata
    const result1 = await exportAsPDFWithJsPDF(messagesWithMetadata, {
      includeMetadata: true,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(result1.success).toBe(true);
    const callsWithMetadata = mockDoc.text.mock.calls;
    const hasGFK = callsWithMetadata.some((call) =>
      String(call[0]).includes("GFK")
    );
    expect(hasGFK).toBe(true);

    // Clear mocks for second test
    mockDoc.text.mockClear();
    mockDoc.splitTextToSize.mockClear();
    vi.mocked(save).mockResolvedValue("/path/to/file2.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    // Without metadata
    const result2 = await exportAsPDFWithJsPDF(messagesWithMetadata, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(result2.success).toBe(true);
    const callsWithoutMetadata = mockDoc.text.mock.calls;
    const hasGFK2 = callsWithoutMetadata.some((call) =>
      String(call[0]).includes("GFK")
    );
    expect(hasGFK2).toBe(false);
  });

  it("should handle empty message array", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    const result = await exportAsPDFWithJsPDF([], {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    // Should generate PDF with header but no messages
    expect(result.success).toBe(true);
  });

  it("should handle large message arrays", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
    vi.mocked(writeFile).mockResolvedValue();

    const largeMessages = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}`,
      role: "user" as const,
      content: `Message ${i}`.repeat(10),
      timestamp: Date.now(),
      source: "text" as const,
    }));

    const result = await exportAsPDFWithJsPDF(largeMessages, {
      includeMetadata: true,
      includeAudioFeatures: true,
      includeTimestamps: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("generatePrintHTML", () => {
  const mockMessages: ChatMessage[] = [
    {
      id: "1",
      role: "user",
      content: "Test message",
      timestamp: Date.now(),
      source: "text",
    },
  ];

  it("should generate valid HTML structure", () => {
    const html = generatePrintHTML(mockMessages, {
      includeMetadata: true,
      includeAudioFeatures: false,
      includeTimestamps: true,
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="de">');
    expect(html).toContain("Hablará Sprachanalyse");
  });

  it("should escape HTML in user content", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "<script>alert('XSS')</script>",
        timestamp: Date.now(),
        source: "text",
      },
    ];

    const html = generatePrintHTML(messages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("should include/exclude timestamps based on option", () => {
    const htmlWithTimestamps = generatePrintHTML(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: true,
    });

    expect(htmlWithTimestamps).toContain("Zeitstempel:");

    const htmlWithoutTimestamps = generatePrintHTML(mockMessages, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(htmlWithoutTimestamps).not.toContain("Zeitstempel:");
  });

  it("should include/exclude metadata based on option", () => {
    const messagesWithMetadata: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Test",
        timestamp: Date.now(),
        source: "voice",
        gfk: {
          observations: [],
          feelings: ["Freude"],
          needs: ["Verbindung"],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      },
    ];

    const htmlWithMetadata = generatePrintHTML(messagesWithMetadata, {
      includeMetadata: true,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(htmlWithMetadata).toContain("GFK-Analyse");

    const htmlWithoutMetadata = generatePrintHTML(messagesWithMetadata, {
      includeMetadata: false,
      includeAudioFeatures: false,
      includeTimestamps: false,
    });

    expect(htmlWithoutMetadata).not.toContain("GFK-Analyse");
  });
});
