/**
 * PDF Formatting Tests - Pagination Logic
 *
 * Tests for line-by-line pagination (P0-1 fixes).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type jsPDF from "jspdf";
import {
  renderTextWithPagination,
  addText,
  addBoxedSection,
  addBulletList,
} from "../pdf-formatting";

// Mock PDF_RECORDING_CONFIG
vi.mock("../pdf-colors", () => ({
  PDF_RECORDING_CONFIG: {
    typography: {
      lineHeight: 6,
      fontSize: {
        body: 10,
        sectionHeader: 14,
        subsectionHeader: 12,
        small: 9,
      },
      font: {
        family: "helvetica",
        styleNormal: "normal",
        styleBold: "bold",
      },
    },
    layout: {
      marginLeft: 20,
      marginTop: 20,
      maxContentWidth: 170,
      maxY: 277, // A4 page height (~297mm) - bottom margin
    },
    spacing: {
      listItemIndent: 5,
      beforeList: 2,
      afterProgressBar: 4,
      beforeSectionHeader: 8,
      afterSectionHeader: 4,
      beforeSubsectionHeader: 6,
      afterSubsectionHeader: 2,
    },
    visual: {
      box: {
        padding: {
          top: 3,
          bottom: 3,
          left: 5,
          right: 5,
        },
        borderWidth: 1,
      },
      badge: {
        padding: 2,
        height: 5,
        cornerRadius: 2,
      },
      progressBar: {
        width: 60,
        height: 3,
      },
      sectionBorder: {
        width: 1,
        offset: 2,
      },
    },
  },
  CACHED_COLORS: {},
  hexToRgb: vi.fn((hex: string) => ({ r: 0, g: 0, b: 0 })),
  PDF_COLOR_PALETTE: {
    utility: { lightGray: "#e5e7eb" },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock types (TONE_DIMENSIONS)
vi.mock("@/lib/types", () => ({
  TONE_DIMENSIONS: {
    formality: { lowLabel: "Informell", highLabel: "Formell" },
    directness: { lowLabel: "Indirekt", highLabel: "Direkt" },
  },
}));

// Create mock doc
const createMockDoc = () => ({
  addPage: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  circle: vi.fn(),
  setTextColor: vi.fn(),
  getTextWidth: vi.fn(() => 50),
});

describe("renderTextWithPagination", () => {
  let mockDoc: ReturnType<typeof createMockDoc>;

  beforeEach(() => {
    mockDoc = createMockDoc();
  });

  it("should render text that fits on current page without adding page", () => {
    const lines = ["Line 1", "Line 2", "Line 3"];
    const startY = 50; // Well below maxY (277)

    const finalY = renderTextWithPagination(
      mockDoc as unknown as jsPDF,
      lines,
      startY,
      { size: 10, bold: false, indent: 0 }
    );

    // Should render all 3 lines without page break
    expect(mockDoc.addPage).not.toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledTimes(3);
    expect(finalY).toBe(startY + 3 * 6); // startY + 3 lines * 6mm lineHeight
  });

  it("should start new page when y + lineHeight exceeds maxY", () => {
    const lines = ["Line 1", "Line 2", "Line 3"];
    const startY = 273; // Close to maxY (277)

    const finalY = renderTextWithPagination(
      mockDoc as unknown as jsPDF,
      lines,
      startY,
      { size: 10, bold: false, indent: 0 }
    );

    // First line fits (273 + 6 = 279 > 277), triggers page break
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledTimes(3);
    // After page break, y resets to marginTop (20)
    expect(finalY).toBe(20 + 3 * 6); // marginTop + 3 lines * 6mm
  });

  it("should paginate long text across multiple pages", () => {
    // Create 50 lines (would span ~2 pages at 6mm/line)
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
    const startY = 50;

    renderTextWithPagination(
      mockDoc as unknown as jsPDF,
      lines,
      startY,
      { size: 10, bold: false, indent: 0 }
    );

    // With lineHeight=6mm and maxY=277mm, each page fits ~42 lines
    // Starting at y=50 (227mm remaining = ~37 lines), then new page
    // Second page starts at y=20 (257mm available = ~42 lines)
    // Total 50 lines should trigger at least 1 page break
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledTimes(50);
  });

  it("should apply font options correctly", () => {
    const lines = ["Bold text"];
    renderTextWithPagination(
      mockDoc as unknown as jsPDF,
      lines,
      50,
      { size: 14, bold: true, indent: 10 }
    );

    expect(mockDoc.setFontSize).toHaveBeenCalledWith(14);
    expect(mockDoc.setFont).toHaveBeenCalledWith("helvetica", "bold");
    expect(mockDoc.text).toHaveBeenCalledWith("Bold text", 20 + 10, 50);
  });
});

describe("addText - pagination integration", () => {
  let mockDoc: ReturnType<typeof createMockDoc>;

  beforeEach(() => {
    mockDoc = createMockDoc();
  });

  it("should use renderTextWithPagination for long wrapped text", () => {
    // Mock splitTextToSize to return 5 wrapped lines
    mockDoc.splitTextToSize.mockReturnValue([
      "Wrapped line 1",
      "Wrapped line 2",
      "Wrapped line 3",
      "Wrapped line 4",
      "Wrapped line 5",
    ]);

    const finalY = addText(
      mockDoc as unknown as jsPDF,
      "Very long text that wraps into multiple lines",
      50,
      10,
      false,
      0
    );

    // Should call text() 5 times (once per wrapped line)
    expect(mockDoc.text).toHaveBeenCalledTimes(5);
    expect(finalY).toBe(50 + 5 * 6); // startY + 5 lines * 6mm
  });

  it("should handle page break in middle of wrapped text", () => {
    // Mock splitTextToSize to return 5 wrapped lines
    mockDoc.splitTextToSize.mockReturnValue([
      "Line 1",
      "Line 2",
      "Line 3",
      "Line 4",
      "Line 5",
    ]);

    addText(
      mockDoc as unknown as jsPDF,
      "Text near page boundary",
      270, // Near maxY (277)
      10,
      false,
      0
    );

    // First line triggers page break (270 + 6 = 276 < 277, fits)
    // Second line triggers page break (276 + 6 = 282 > 277)
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledTimes(5);
  });
});

describe("addBoxedSection - pagination fixes", () => {
  let mockDoc: ReturnType<typeof createMockDoc>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    // Default: each line wraps to 2 lines
    mockDoc.splitTextToSize.mockImplementation((text: string) => [
      `${text} (line 1)`,
      `${text} (line 2)`,
    ]);
  });

  it("should calculate height from wrapped lines, not content array length", () => {
    const content = ["Short line 1", "Short line 2"]; // 2 array items
    // Each wraps to 2 lines = 4 total wrapped lines

    addBoxedSection(
      mockDoc as unknown as jsPDF,
      content,
      50,
      { r: 240, g: 240, b: 240 }, // backgroundColor
      { r: 100, g: 100, b: 100 }, // borderColor
      true // useVisualDesign
    );

    // Should call splitTextToSize for each content line
    expect(mockDoc.splitTextToSize).toHaveBeenCalledTimes(2);

    // Box height = (4 wrapped lines * 6mm) + (3mm top + 3mm bottom padding) = 30mm
    // rect(x, y, width, height)
    expect(mockDoc.rect).toHaveBeenCalledWith(20, 50, 170, 30, "F");

    // Border line should span the true height
    expect(mockDoc.line).toHaveBeenCalledWith(20, 50, 20, 80); // y: 50 -> 80 (height 30)
  });

  it("should handle box that spans page boundary", () => {
    const content = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
    // Each wraps to 2 lines = 20 total wrapped lines
    // Box height = (20 * 6) + (3 + 3) = 126mm

    addBoxedSection(
      mockDoc as unknown as jsPDF,
      content,
      200, // Start at y=200, box would end at 326 (> maxY 277)
      { r: 240, g: 240, b: 240 },
      undefined,
      true
    );

    // Should trigger page break (200 + 126 = 326 > 277)
    expect(mockDoc.addPage).toHaveBeenCalled();
    // Box should render at marginTop (20) after page break
    expect(mockDoc.rect).toHaveBeenCalledWith(20, 20, 170, 126, "F");
  });

  it("should render all wrapped lines inside box", () => {
    const content = ["Line A", "Line B"];
    // Each wraps to 2 lines = 4 total

    addBoxedSection(
      mockDoc as unknown as jsPDF,
      content,
      50,
      { r: 240, g: 240, b: 240 },
      undefined,
      true
    );

    // Should render 4 wrapped lines
    expect(mockDoc.text).toHaveBeenCalledTimes(4);
    // Verify text positions (startY = boxY + paddingTop + baseline offset)
    // boxY=50, paddingTop=3, baselineOffset=6*0.8=4.8 -> textStartY=57.8
    expect(mockDoc.text).toHaveBeenNthCalledWith(1, "Line A (line 1)", 25, 57.8);
    expect(mockDoc.text).toHaveBeenNthCalledWith(2, "Line A (line 2)", 25, 63.8);
    expect(mockDoc.text).toHaveBeenNthCalledWith(3, "Line B (line 1)", 25, 69.8);
    expect(mockDoc.text).toHaveBeenNthCalledWith(4, "Line B (line 2)", 25, 75.8);
  });
});

describe("addBulletList - pagination fixes", () => {
  let mockDoc: ReturnType<typeof createMockDoc>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    // Default: text doesn't wrap
    mockDoc.splitTextToSize.mockImplementation((text: string) => [text]);
  });

  it("should pre-wrap bullet items to calculate true height", () => {
    const items = ["Short item 1", "Short item 2"];
    // Mock: each item wraps to 3 lines
    mockDoc.splitTextToSize.mockImplementation((text: string) => [
      `${text} (line 1)`,
      `${text} (line 2)`,
      `${text} (line 3)`,
    ]);

    addBulletList(
      mockDoc as unknown as jsPDF,
      items,
      50,
      { r: 59, g: 130, b: 246 }, // bulletColor
      true
    );

    // Should call splitTextToSize for BOTH items (pre-wrap check)
    // Each addText() also calls splitTextToSize, so total = 2 (pre-wrap) + 2 (addText) = 4
    expect(mockDoc.splitTextToSize.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Should render 2 bullets
    expect(mockDoc.circle).toHaveBeenCalledTimes(2);
  });

  it("should check page break with true item height (capped at 3 lines)", () => {
    const items = ["Very long item that wraps to 5 lines"];
    // Mock: wraps to 5 lines
    mockDoc.splitTextToSize.mockReturnValue([
      "Line 1",
      "Line 2",
      "Line 3",
      "Line 4",
      "Line 5",
    ]);

    addBulletList(
      mockDoc as unknown as jsPDF,
      items,
      270, // Near maxY
      { r: 59, g: 130, b: 246 },
      true
    );

    // Should trigger page break (itemHeight = 5*6 = 30mm, capped at 3*6 = 18mm)
    // 270 + 18 = 288 > 277 -> page break
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.circle).toHaveBeenCalledTimes(1);
  });

  it("should draw bullet at final position after page break check", () => {
    const items = ["Item at page boundary"];
    mockDoc.splitTextToSize.mockReturnValue(["Item at page boundary"]);

    addBulletList(
      mockDoc as unknown as jsPDF,
      items,
      275, // Very close to maxY (277)
      { r: 59, g: 130, b: 246 },
      true
    );

    // Should trigger page break immediately (275 + 6 = 281 > 277)
    expect(mockDoc.addPage).toHaveBeenCalled();

    // Bullet should be drawn at marginTop (20) after page break, not at old y (275)
    // circle(x, y, radius, style)
    // x = marginLeft (20) + listItemIndent (5) - 2 = 23
    // y = currentY (20 after page break + 2 spacing) - 1.8 = 20.2
    expect(mockDoc.circle).toHaveBeenCalledWith(23, expect.any(Number), 0.5, "F");
    const circleY = mockDoc.circle.mock.calls[0][1];
    expect(circleY).toBeLessThan(30); // Should be near marginTop, not near 275
  });
});
