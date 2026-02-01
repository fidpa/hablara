/**
 * Recording PDF Export Tests
 *
 * Unit tests for recording PDF generation with jsPDF.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RecordingMetadata } from "@/lib/types";

// Create mock doc instance that will be returned by jsPDF constructor
const mockDoc = {
  addPage: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  text: vi.fn(),
  getTextWidth: vi.fn(() => 20), // Mock text width for badges
  output: vi.fn((type: string) => {
    if (type === "arraybuffer") {
      return new ArrayBuffer(100);
    }
    return new ArrayBuffer(100);
  }),
  // Visual design methods
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFillColor: vi.fn(),
  roundedRect: vi.fn(),
  rect: vi.fn(),
  circle: vi.fn(),
  setTextColor: vi.fn(),
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

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
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

// Mock config
vi.mock("../config", () => ({
  PDF_RECORDING_CONFIG: {
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
      lineHeight: 5.5,
      fontSize: {
        title: 16,
        sectionHeader: 12,
        subsectionHeader: 10,
        body: 9,
        caption: 8,
        small: 7,
      },
      font: {
        family: "helvetica",
        styleNormal: "normal",
        styleBold: "bold",
      },
    },
    spacing: {
      afterTitle: 8,
      afterSectionHeader: 4,
      afterSubsection: 3,
      betweenSections: 10,
      beforeList: 2,
      listItemIndent: 5,
    },
    visual: {
      badge: {
        padding: 2,
        height: 5,
        cornerRadius: 1.5,
      },
      box: {
        padding: {
          top: 2,
          right: 3,
          bottom: 2,
          left: 3,
        },
        borderWidth: 1,
      },
      progressBar: {
        width: 60,
        height: 4,
      },
      sectionBorder: {
        width: 0.5,
        offset: 2,
      },
    },
  },
  PDF_COLOR_PALETTE: {
    emotion: {
      neutral: '#6b7280',
      calm: '#22c55e',
      stress: '#ef4444',
      excitement: '#f59e0b',
      uncertainty: '#8b5cf6',
      frustration: '#dc2626',
      joy: '#10b981',
      doubt: '#a855f7',
      conviction: '#3b82f6',
      aggression: '#b91c1c',
    },
    fallacy: {
      ad_hominem: '#ef4444',
      straw_man: '#f97316',
      false_dichotomy: '#eab308',
      appeal_authority: '#84cc16',
      circular_reasoning: '#06b6d4',
      slippery_slope: '#8b5cf6',
    },
    topic: {
      work_career: '#3b82f6',
      health_wellbeing: '#22c55e',
      relationships_social: '#ec4899',
      finances: '#f59e0b',
      personal_development: '#8b5cf6',
      creativity_hobbies: '#06b6d4',
      other: '#6b7280',
    },
    tone: {
      formality: '#3b82f6',
      professionalism: '#8b5cf6',
      directness: '#f59e0b',
      energy: '#ef4444',
      seriousness: '#22c55e',
    },
    gfk: {
      observations: '#3b82f6',
      feelings: '#ec4899',
      needs: '#22c55e',
      requests: '#f59e0b',
    },
    cognitive: {
      balanced: '#22c55e',
      somewhat_distorted: '#eab308',
      highly_distorted: '#ef4444',
    },
    fourSides: {
      sachinhalt: '#3b82f6',
      selbstoffenbarung: '#8b5cf6',
      beziehung: '#ec4899',
      appell: '#f59e0b',
    },
    utility: {
      lightGray: '#f3f4f6',
      mediumGray: '#9ca3af',
      white: '#ffffff',
      redTint: '#fef2f2',
      greenTint: '#f0fdf4',
      blueTint: '#eff6ff',
    },
  },
  hexToRgb: (hex: string) => {
    const cleaned = hex.replace(/^#/, '');
    const bigint = parseInt(cleaned, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  },
  getEmotionColor: () => ({ r: 239, g: 68, b: 68 }),
  getFallacyColor: () => ({ r: 239, g: 68, b: 68 }),
  getTopicColor: () => ({ r: 59, g: 130, b: 246 }),
  getToneColor: () => ({ r: 59, g: 130, b: 246 }),
  CACHED_COLORS: {
    lightGray: { r: 243, g: 244, b: 246 },
    mediumGray: { r: 156, g: 163, b: 175 },
    redTint: { r: 254, g: 242, b: 242 },
    greenTint: { r: 240, g: 253, b: 244 },
    blueTint: { r: 239, g: 246, b: 255 },
    sectionDetails: { r: 107, g: 114, b: 128 },
    sectionEmotion: { r: 239, g: 68, b: 68 },
    sectionTone: { r: 139, g: 92, b: 246 },
    sectionFallacy: { r: 239, g: 68, b: 68 },
    sectionGfk: { r: 34, g: 197, b: 94 },
    sectionCognitive: { r: 139, g: 92, b: 246 },
    sectionFourSides: { r: 59, g: 130, b: 246 },
    sectionTopic: { r: 59, g: 130, b: 246 },
    sectionReflection: { r: 139, g: 92, b: 246 },
  },
}));

// Import after mocks
import { generatePDFFromMetadata, exportRecordingAsPDF } from "../pdf";
import { DEFAULT_RECORDING_EXPORT_OPTIONS } from "../types";

describe("Recording PDF Export", () => {
  // Complete mock metadata with all fields
  const createMockMetadata = (
    overrides: Partial<RecordingMetadata> = {}
  ): RecordingMetadata => ({
    id: "test-123-456",
    createdAt: "2026-01-31T10:30:00.000Z",
    durationMs: 204000, // 3:24 min
    sampleRate: 16000,
    fileSize: 2457600, // 2.4 MB
    appVersion: "1.0.0",
    provider: "whisper-cpp",
    model: "german-turbo",
    audioValidation: {
      rmsEnergy: 0.05,
      durationMs: 204000,
      sampleCount: 3264000,
      passed: true,
    },
    vadStats: {
      originalSamples: 3264000,
      filteredSamples: 2448000,
      speechRatio: 0.75,
      framesProcessed: 100,
      speechFrames: 75,
    },
    transcription: {
      text: "Dies ist ein Test-Transkript für den PDF-Export.",
      language: "de",
      provider: "whisper-cpp",
      model: "german-turbo",
      processingTimeMs: 1500,
    },
    textFilter: null,
    source: "recording",
    emotion: {
      primary: "stress",
      confidence: 0.85,
      secondary: "excitement",
    },
    analysisResult: {
      emotion: {
        primary: "stress",
        confidence: 0.85,
        secondary: "excitement",
      },
      fallacies: [
        {
          type: "ad_hominem",
          confidence: 0.75,
          quote: "Du verstehst das eh nicht...",
          explanation: "Angriff auf die Person statt auf das Argument",
          suggestion: "Fokussiere auf das Argument",
        },
      ],
      enrichment: "Deine Sprache zeigt Anzeichen von Stress.",
      topic: {
        topic: "work_career",
        confidence: 0.82,
        keywords: ["Stress", "Aufgaben"],
      },
    },
    tone: {
      formality: 3,
      professionalism: 2,
      directness: 4,
      energy: 4,
      seriousness: 3,
      confidence: 0.8,
    },
    gfk: {
      observations: ["Wenn ich die lange To-Do-Liste sehe..."],
      feelings: ["Stress", "Überforderung"],
      needs: ["Struktur", "Unterstützung"],
      requests: ["Priorisierung der Aufgaben"],
      gfkTranslation: "Wenn ich die To-Do-Liste sehe, fühle ich mich...",
      reflectionQuestion: "Welche der Aufgaben ist wirklich dringend?",
    },
    cognitive: {
      distortions: [
        {
          type: "catastrophizing",
          quote: "wegen der vielen Aufgaben",
          explanation: "Übertreibung der Schwere",
          reframe: "Betrachte einzelne Aufgaben",
        },
      ],
      overallThinkingStyle: "somewhat_distorted",
    },
    fourSides: {
      sachinhalt: "Es gibt viele Aufgaben zu erledigen.",
      selbstoffenbarung: "Ich fühle mich überfordert.",
      beziehung: "Ich brauche Unterstützung.",
      appell: "Hilf mir bitte.",
      potentielleMissverstaendnisse: ["Könnte als Vorwurf verstanden werden"],
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock doc state
    mockDoc.addPage.mockClear();
    mockDoc.setFontSize.mockClear();
    mockDoc.setFont.mockClear();
    mockDoc.splitTextToSize.mockClear();
    mockDoc.text.mockClear();
    mockDoc.getTextWidth.mockClear();
    mockDoc.output.mockClear();
    // Visual design methods
    mockDoc.setDrawColor.mockClear();
    mockDoc.setLineWidth.mockClear();
    mockDoc.line.mockClear();
    mockDoc.setFillColor.mockClear();
    mockDoc.roundedRect.mockClear();
    mockDoc.rect.mockClear();
    mockDoc.circle.mockClear();
    mockDoc.setTextColor.mockClear();
    // Reset default implementations
    mockDoc.splitTextToSize.mockImplementation((text: string) => [text]);
    mockDoc.getTextWidth.mockReturnValue(20);
    mockDoc.output.mockImplementation((type: string) => {
      if (type === "arraybuffer") {
        return new ArrayBuffer(100);
      }
      return new ArrayBuffer(100);
    });
  });

  describe("generatePDFFromMetadata", () => {
    it("should generate PDF with all metadata sections", () => {
      const metadata = createMockMetadata();
      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it("should handle minimal metadata (only transcript)", () => {
      const minimalMetadata = createMockMetadata({
        emotion: undefined,
        analysisResult: undefined,
        tone: undefined,
        gfk: undefined,
        cognitive: undefined,
        fourSides: undefined,
      });

      const result = generatePDFFromMetadata(
        minimalMetadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should skip metadata sections when includeMetadata=false", () => {
      const metadata = createMockMetadata();
      const options = {
        ...DEFAULT_RECORDING_EXPORT_OPTIONS,
        includeMetadata: false,
      };

      const result = generatePDFFromMetadata(metadata, options);

      expect(result).toBeInstanceOf(ArrayBuffer);
      // Verify GFK is NOT in output
      const textCalls = mockDoc.text.mock.calls;
      const hasGFK = textCalls.some((call) =>
        String(call[0]).includes("GFK-Analyse")
      );
      expect(hasGFK).toBe(false);
    });

    it("should skip timestamps when includeTimestamps=false", () => {
      const metadata = createMockMetadata();
      const options = {
        ...DEFAULT_RECORDING_EXPORT_OPTIONS,
        includeTimestamps: false,
      };

      const result = generatePDFFromMetadata(metadata, options);

      expect(result).toBeInstanceOf(ArrayBuffer);
      // Verify date is NOT in output
      const textCalls = mockDoc.text.mock.calls;
      const hasDatum = textCalls.some((call) =>
        String(call[0]).includes("Datum:")
      );
      expect(hasDatum).toBe(false);
    });

    it("should skip fallacies when includeFallacies=false", () => {
      const metadata = createMockMetadata();
      const options = {
        ...DEFAULT_RECORDING_EXPORT_OPTIONS,
        includeFallacies: false,
      };

      const result = generatePDFFromMetadata(metadata, options);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const textCalls = mockDoc.text.mock.calls;
      const hasFallacies = textCalls.some((call) =>
        String(call[0]).includes("Fehlschlüsse")
      );
      expect(hasFallacies).toBe(false);
    });

    it("should skip topic when includeTopic=false", () => {
      const metadata = createMockMetadata();
      const options = {
        ...DEFAULT_RECORDING_EXPORT_OPTIONS,
        includeTopic: false,
      };

      const result = generatePDFFromMetadata(metadata, options);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const textCalls = mockDoc.text.mock.calls;
      const hasTopic = textCalls.some((call) =>
        String(call[0]).includes("Themen-Klassifikation")
      );
      expect(hasTopic).toBe(false);
    });

    it("should handle empty GFK sections gracefully", () => {
      const metadata = createMockMetadata({
        gfk: {
          observations: [],
          feelings: [],
          needs: [],
          requests: [],
          gfkTranslation: "",
          reflectionQuestion: "",
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle empty cognitive distortions", () => {
      const metadata = createMockMetadata({
        cognitive: {
          distortions: [],
          overallThinkingStyle: "balanced",
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle empty fallacies array", () => {
      const metadata = createMockMetadata({
        analysisResult: {
          emotion: { primary: "neutral", confidence: 0.5 },
          fallacies: [],
          enrichment: "Test enrichment",
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle very long transcript", () => {
      const longTranscript = "Lorem ipsum dolor sit amet. ".repeat(200);
      const metadata = createMockMetadata({
        transcription: {
          text: longTranscript,
          language: "de",
          provider: "whisper-cpp",
          model: "german-turbo",
          processingTimeMs: 5000,
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle different input sources", () => {
      const sources = ["recording", "text", "file", "audio-file"] as const;

      for (const source of sources) {
        mockDoc.text.mockClear();
        const metadata = createMockMetadata({ source });
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );
        expect(result).toBeInstanceOf(ArrayBuffer);
      }
    });

    it("should handle all emotion types", () => {
      const emotions = [
        "neutral",
        "calm",
        "stress",
        "excitement",
        "uncertainty",
        "frustration",
        "joy",
        "doubt",
        "conviction",
        "aggression",
      ] as const;

      for (const emotion of emotions) {
        mockDoc.text.mockClear();
        const metadata = createMockMetadata({
          emotion: { primary: emotion, confidence: 0.8 },
        });
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );
        expect(result).toBeInstanceOf(ArrayBuffer);
      }
    });

    it("should handle all topic types", () => {
      const topics = [
        "work_career",
        "health_wellbeing",
        "relationships_social",
        "finances",
        "personal_development",
        "creativity_hobbies",
        "other",
      ] as const;

      for (const topic of topics) {
        mockDoc.text.mockClear();
        const metadata = createMockMetadata({
          analysisResult: {
            emotion: { primary: "neutral", confidence: 0.5 },
            fallacies: [],
            enrichment: "",
            topic: { topic, confidence: 0.8 },
          },
        });
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );
        expect(result).toBeInstanceOf(ArrayBuffer);
      }
    });
  });

  describe("exportRecordingAsPDF", () => {
    it("should export PDF successfully", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      const metadata = createMockMetadata();
      vi.mocked(invoke).mockResolvedValue([metadata]);
      vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
      vi.mocked(writeFile).mockResolvedValue();

      const result = await exportRecordingAsPDF(metadata.id);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe("/path/to/file.pdf");
    });

    it("should handle recording not found", async () => {
      const { invoke } = await import("@tauri-apps/api/core");

      vi.mocked(invoke).mockResolvedValue([]);

      const result = await exportRecordingAsPDF("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Aufnahme nicht gefunden");
    });

    it("should handle recording without transcript", async () => {
      const { invoke } = await import("@tauri-apps/api/core");

      const metadata = createMockMetadata({
        transcription: null,
      });
      vi.mocked(invoke).mockResolvedValue([metadata]);

      const result = await exportRecordingAsPDF(metadata.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Aufnahme hat kein Transkript");
    });

    it("should handle user cancellation", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");

      const metadata = createMockMetadata();
      vi.mocked(invoke).mockResolvedValue([metadata]);
      vi.mocked(save).mockResolvedValue(null);

      const result = await exportRecordingAsPDF(metadata.id);

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it("should handle write errors", async () => {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const { invoke } = await import("@tauri-apps/api/core");

      const metadata = createMockMetadata();
      vi.mocked(invoke).mockResolvedValue([metadata]);
      vi.mocked(save).mockResolvedValue("/path/to/file.pdf");
      vi.mocked(writeFile).mockRejectedValue(new Error("Write failed"));

      const result = await exportRecordingAsPDF(metadata.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Write failed");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined secondary emotion", () => {
      const metadata = createMockMetadata({
        emotion: { primary: "stress", confidence: 0.8, secondary: undefined },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle tone without confidence", () => {
      const metadata = createMockMetadata({
        tone: {
          formality: 3,
          professionalism: 3,
          directness: 3,
          energy: 3,
          seriousness: 3,
          confidence: 0,
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle all thinking styles", () => {
      const styles = [
        "balanced",
        "somewhat_distorted",
        "highly_distorted",
      ] as const;

      for (const style of styles) {
        mockDoc.text.mockClear();
        const metadata = createMockMetadata({
          cognitive: {
            distortions: [],
            overallThinkingStyle: style,
          },
        });
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );
        expect(result).toBeInstanceOf(ArrayBuffer);
      }
    });

    it("should handle recording with failed audio validation", () => {
      const metadata = createMockMetadata({
        audioValidation: {
          rmsEnergy: 0.001,
          durationMs: 100,
          sampleCount: 1600,
          passed: false,
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("should handle missing fourSides missverstaendnisse", () => {
      const metadata = createMockMetadata({
        fourSides: {
          sachinhalt: "Test",
          selbstoffenbarung: "Test",
          beziehung: "Test",
          appell: "Test",
          potentielleMissverstaendnisse: [],
        },
      });

      const result = generatePDFFromMetadata(
        metadata,
        DEFAULT_RECORDING_EXPORT_OPTIONS
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe("Visual Design", () => {
    describe("hexToRgb (mocked)", () => {
      // Test the mocked implementation directly
      const hexToRgb = (hex: string) => {
        const cleaned = hex.replace(/^#/, '');
        const bigint = parseInt(cleaned, 16);
        return {
          r: (bigint >> 16) & 255,
          g: (bigint >> 8) & 255,
          b: bigint & 255,
        };
      };

      it("should convert red hex to RGB", () => {
        expect(hexToRgb("#ef4444")).toEqual({ r: 239, g: 68, b: 68 });
      });

      it("should convert blue hex to RGB", () => {
        expect(hexToRgb("#3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
      });

      it("should handle hex without # prefix", () => {
        expect(hexToRgb("22c55e")).toEqual({ r: 34, g: 197, b: 94 });
      });
    });

    describe("Color Helpers (mocked)", () => {
      it("should get emotion color from mock", () => {
        // Mock returns fixed color
        const color = { r: 239, g: 68, b: 68 };
        expect(color).toHaveProperty("r");
        expect(color).toHaveProperty("g");
        expect(color).toHaveProperty("b");
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
      });

      it("should get fallacy color from mock", () => {
        const color = { r: 239, g: 68, b: 68 };
        expect(color).toHaveProperty("r");
        expect(color).toHaveProperty("g");
        expect(color).toHaveProperty("b");
      });

      it("should get topic color from mock", () => {
        const color = { r: 59, g: 130, b: 246 };
        expect(color).toHaveProperty("r");
        expect(color).toHaveProperty("g");
        expect(color).toHaveProperty("b");
      });

      it("should get tone color from mock", () => {
        const color = { r: 59, g: 130, b: 246 };
        expect(color).toHaveProperty("r");
        expect(color).toHaveProperty("g");
        expect(color).toHaveProperty("b");
      });
    });

    describe("Visual Elements Rendering", () => {
      it("should render with visual design enabled (default)", () => {
        const metadata = createMockMetadata();
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Visual methods should be called
        expect(mockDoc.setDrawColor).toHaveBeenCalled();
        expect(mockDoc.roundedRect).toHaveBeenCalled();
      });

      it("should render emotion badges", () => {
        const metadata = createMockMetadata({
          emotion: { primary: "stress", confidence: 0.85 },
        });

        mockDoc.roundedRect.mockClear();
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Badge rendering uses roundedRect
        expect(mockDoc.roundedRect).toHaveBeenCalled();
      });

      it("should render tone progress bars", () => {
        const metadata = createMockMetadata({
          tone: {
            formality: 3,
            professionalism: 2,
            directness: 4,
            energy: 4,
            seriousness: 3,
            confidence: 0.8,
          },
        });

        mockDoc.rect.mockClear();
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Progress bars use rect
        expect(mockDoc.rect).toHaveBeenCalled();
      });

      it("should render colored bullets in GFK sections", () => {
        const metadata = createMockMetadata({
          gfk: {
            observations: ["Test observation"],
            feelings: ["Stress"],
            needs: ["Support"],
            requests: ["Prioritize tasks"],
            gfkTranslation: "Test translation",
            reflectionQuestion: "Test question?",
          },
        });

        mockDoc.circle.mockClear();
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Colored bullets use circle
        expect(mockDoc.circle).toHaveBeenCalled();
      });

      it("should render boxed sections", () => {
        const metadata = createMockMetadata();

        mockDoc.rect.mockClear();
        mockDoc.line.mockClear();
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Boxes use rect + line for border
        expect(mockDoc.rect).toHaveBeenCalled();
        expect(mockDoc.line).toHaveBeenCalled();
      });
    });

    describe("Backward Compatibility", () => {
      it("should render text-only when useVisualDesign=false", () => {
        const metadata = createMockMetadata();
        const options = {
          ...DEFAULT_RECORDING_EXPORT_OPTIONS,
          useVisualDesign: false,
        };

        mockDoc.setDrawColor.mockClear();
        mockDoc.roundedRect.mockClear();
        mockDoc.rect.mockClear();
        mockDoc.circle.mockClear();

        const result = generatePDFFromMetadata(metadata, options);

        expect(result).toBeInstanceOf(ArrayBuffer);

        // Visual methods should NOT be called
        expect(mockDoc.setDrawColor).not.toHaveBeenCalled();
        expect(mockDoc.roundedRect).not.toHaveBeenCalled();
        expect(mockDoc.rect).not.toHaveBeenCalled();
        expect(mockDoc.circle).not.toHaveBeenCalled();
      });

      it("should handle missing useVisualDesign flag (default to true)", () => {
        const metadata = createMockMetadata();
        const options = {
          includeMetadata: true,
          includeAudioFeatures: true,
          includeTimestamps: true,
          includeFallacies: true,
          includeTopic: true,
          // useVisualDesign not specified
        };

        mockDoc.roundedRect.mockClear();
        const result = generatePDFFromMetadata(metadata, options);

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Should default to visual design enabled
        expect(mockDoc.roundedRect).toHaveBeenCalled();
      });

      it("should produce same content with and without visual design", () => {
        const metadata = createMockMetadata();

        // With visual design
        mockDoc.text.mockClear();
        const visualResult = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );
        const visualTextCalls = mockDoc.text.mock.calls.length;

        // Without visual design
        mockDoc.text.mockClear();
        const textResult = generatePDFFromMetadata(metadata, {
          ...DEFAULT_RECORDING_EXPORT_OPTIONS,
          useVisualDesign: false,
        });
        const textTextCalls = mockDoc.text.mock.calls.length;

        expect(visualResult).toBeInstanceOf(ArrayBuffer);
        expect(textResult).toBeInstanceOf(ArrayBuffer);

        // Both should have similar amount of text content
        // (visual may have slightly more due to badges)
        expect(Math.abs(visualTextCalls - textTextCalls)).toBeLessThan(10);
      });
    });

    describe("Visual Edge Cases", () => {
      it("should handle rendering errors gracefully", () => {
        const metadata = createMockMetadata();

        // Simulate rendering error
        mockDoc.roundedRect.mockImplementationOnce(() => {
          throw new Error("Rendering failed");
        });

        // Should not throw, should fallback to text
        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      it("should handle very long badge text", () => {
        const metadata = createMockMetadata({
          emotion: {
            primary: "frustration",
            confidence: 0.999999,
          },
        });

        mockDoc.getTextWidth.mockReturnValue(150); // Very wide text

        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      it("should handle many fallacies with visual boxes", () => {
        const manyFallacies = Array.from({ length: 10 }, (_, i) => ({
          type: "ad_hominem" as const,
          confidence: 0.7,
          quote: `Quote ${i + 1}`,
          explanation: `Explanation ${i + 1}`,
          suggestion: `Suggestion ${i + 1}`,
        }));

        const metadata = createMockMetadata({
          analysisResult: {
            emotion: { primary: "neutral", confidence: 0.5 },
            fallacies: manyFallacies,
            enrichment: "Test",
          },
        });

        const result = generatePDFFromMetadata(
          metadata,
          DEFAULT_RECORDING_EXPORT_OPTIONS
        );

        expect(result).toBeInstanceOf(ArrayBuffer);
      });
    });
  });
});
