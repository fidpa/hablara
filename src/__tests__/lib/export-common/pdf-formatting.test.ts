/**
 * Tests for PDF Formatting Helpers
 */

import { vi, describe, it, expect } from "vitest";
import {
  formatDuration,
  formatFileSize,
  getToneLabel,
  checkPageBreak,
  addText,
  addSectionHeader,
  addSubsectionHeader,
  addBadge,
  addBoxedSection,
  addProgressBar,
  addBulletList,
} from "@/lib/export-common/pdf-formatting";
import { PDF_RECORDING_CONFIG } from "@/lib/export-common/pdf-colors";
import type jsPDF from "jspdf";

// Mock jsPDF
const createMockDoc = (): Partial<jsPDF> => {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 20),
    addPage: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    circle: vi.fn(),
    line: vi.fn(),
  };
};

describe("PDF Formatting Helpers", () => {
  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(45000)).toBe("0:45"); // 45s
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(125000)).toBe("2:05"); // 2m 5s
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3665000)).toBe("1:01:05"); // 1h 1m 5s
    });

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("0:00");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(2560)).toBe("2.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(5242880)).toBe("5.0 MB");
    });

    it("should handle zero size", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });
  });

  describe("getToneLabel", () => {
    it("should return low label for value <= 2", () => {
      expect(getToneLabel(1, "formality")).toBe("Locker");
      expect(getToneLabel(2, "formality")).toBe("Locker");
    });

    it("should return high label for value >= 4", () => {
      expect(getToneLabel(4, "formality")).toBe("Formell");
      expect(getToneLabel(5, "formality")).toBe("Formell");
    });

    it("should return Neutral for value 3", () => {
      expect(getToneLabel(3, "formality")).toBe("Neutral");
    });
  });

  describe("checkPageBreak", () => {
    it("should return same y if no page break needed", () => {
      const doc = createMockDoc();
      const y = checkPageBreak(doc, 50, 10);
      expect(y).toBe(50);
      expect(doc.addPage).not.toHaveBeenCalled();
    });

    it("should add page and return marginTop if page break needed", () => {
      const doc = createMockDoc();
      const y = checkPageBreak(doc, 270, 20); // exceeds maxY (277)
      expect(y).toBe(PDF_RECORDING_CONFIG.layout.marginTop);
      expect(doc.addPage).toHaveBeenCalled();
    });
  });

  describe("addText", () => {
    it("should add text with correct parameters", () => {
      const doc = createMockDoc();
      const y = addText(doc, "Test text", 50, 12, false, 0);

      expect(doc.setFontSize).toHaveBeenCalledWith(12);
      expect(doc.setFont).toHaveBeenCalledWith("helvetica", "normal");
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should use bold font when bold=true", () => {
      const doc = createMockDoc();
      addText(doc, "Bold text", 50, 12, true, 0);

      expect(doc.setFont).toHaveBeenCalledWith("helvetica", "bold");
    });

    it("should handle invalid splitTextToSize result", () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValue(null as never);

      const y = addText(doc, "Test", 50, 12);
      expect(y).toBe(50); // Should return unchanged y
    });
  });

  describe("addSectionHeader", () => {
    it("should add section header without color", () => {
      const doc = createMockDoc();
      const y = addSectionHeader(doc, "Test Section", 50);

      expect(doc.setFontSize).toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should add colored border and title with visual design", () => {
      const doc = createMockDoc();
      const color = { r: 255, g: 0, b: 0 };
      const y = addSectionHeader(doc, "Test Section", 50, color, true);

      expect(doc.setDrawColor).toHaveBeenCalledWith(color.r, color.g, color.b);
      expect(doc.setTextColor).toHaveBeenCalledWith(color.r, color.g, color.b);
      expect(doc.line).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should skip visual design when useVisualDesign=false", () => {
      const doc = createMockDoc();
      const color = { r: 255, g: 0, b: 0 };
      addSectionHeader(doc, "Test Section", 50, color, false);

      expect(doc.setDrawColor).not.toHaveBeenCalled();
      expect(doc.line).not.toHaveBeenCalled();
    });
  });

  describe("addSubsectionHeader", () => {
    it("should add subsection header", () => {
      const doc = createMockDoc();
      const y = addSubsectionHeader(doc, "Subsection", 50);

      expect(doc.setFontSize).toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });
  });

  describe("addBadge", () => {
    it("should add badge with visual design", () => {
      const doc = createMockDoc();
      const color = { r: 255, g: 0, b: 0 };
      const width = addBadge(doc, "Test Badge", color, 20, 50, true);

      expect(doc.setFillColor).toHaveBeenCalledWith(color.r, color.g, color.b);
      expect(doc.roundedRect).toHaveBeenCalled();
      expect(doc.setTextColor).toHaveBeenCalledWith(255, 255, 255); // White text
      expect(width).toBeGreaterThan(0);
    });

    it("should add plain text badge without visual design", () => {
      const doc = createMockDoc();
      const color = { r: 255, g: 0, b: 0 };
      const width = addBadge(doc, "Test Badge", color, 20, 50, false);

      expect(doc.roundedRect).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(width).toBeGreaterThan(0);
    });
  });

  describe("addBoxedSection", () => {
    it("should add boxed section with visual design", () => {
      const doc = createMockDoc();
      const bgColor = { r: 243, g: 244, b: 246 };
      const borderColor = { r: 255, g: 0, b: 0 };
      const content = ["Line 1", "Line 2"];

      const y = addBoxedSection(doc, content, 50, bgColor, borderColor, true);

      expect(doc.setFillColor).toHaveBeenCalledWith(bgColor.r, bgColor.g, bgColor.b);
      expect(doc.rect).toHaveBeenCalled();
      expect(doc.setDrawColor).toHaveBeenCalledWith(borderColor.r, borderColor.g, borderColor.b);
      expect(doc.line).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should add plain text without visual design", () => {
      const doc = createMockDoc();
      const bgColor = { r: 243, g: 244, b: 246 };
      const content = ["Line 1", "Line 2"];

      const y = addBoxedSection(doc, content, 50, bgColor, undefined, false);

      expect(doc.rect).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });
  });

  describe("addProgressBar", () => {
    it("should add progress bar with visual design", () => {
      const doc = createMockDoc();
      const color = { r: 59, g: 130, b: 246 };
      const y = addProgressBar(doc, 3, "Test Dimension", color, 50, true);

      expect(doc.setFillColor).toHaveBeenCalled();
      expect(doc.rect).toHaveBeenCalled(); // Background + fill bars
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should add text-only progress bar without visual design", () => {
      const doc = createMockDoc();
      const color = { r: 59, g: 130, b: 246 };
      const y = addProgressBar(doc, 3, "Test Dimension", color, 50, false);

      expect(doc.rect).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });
  });

  describe("addBulletList", () => {
    it("should add bullet list with colored bullets", () => {
      const doc = createMockDoc();
      const color = { r: 59, g: 130, b: 246 };
      const items = ["Item 1", "Item 2", "Item 3"];

      const y = addBulletList(doc, items, 50, color, true);

      expect(doc.setFillColor).toHaveBeenCalledWith(color.r, color.g, color.b);
      expect(doc.circle).toHaveBeenCalledTimes(3);
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should add bullet list without colored bullets", () => {
      const doc = createMockDoc();
      const items = ["Item 1", "Item 2"];

      const y = addBulletList(doc, items, 50, undefined, true);

      expect(doc.circle).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });

    it("should use text bullets when visual design is disabled", () => {
      const doc = createMockDoc();
      const color = { r: 59, g: 130, b: 246 };
      const items = ["Item 1"];

      const y = addBulletList(doc, items, 50, color, false);

      expect(doc.circle).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalled();
      expect(y).toBeGreaterThan(50);
    });
  });
});
