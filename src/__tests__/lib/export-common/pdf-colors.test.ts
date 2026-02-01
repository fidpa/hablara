/**
 * Tests for PDF Colors & Configuration
 */

import {
  PDF_COLOR_PALETTE,
  hexToRgb,
  getEmotionColor,
  getFallacyColor,
  getTopicColor,
  getToneColor,
  CACHED_COLORS,
  PDF_RECORDING_CONFIG,
} from "@/lib/export-common/pdf-colors";
import type { EmotionType, FallacyType, TopicType } from "@/lib/types";

describe("PDF Colors & Configuration", () => {
  describe("hexToRgb", () => {
    it("should convert hex color to RGB object", () => {
      expect(hexToRgb("#3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
    });

    it("should handle hex without # prefix", () => {
      expect(hexToRgb("3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
    });

    it("should convert black", () => {
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("should convert white", () => {
      expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe("getEmotionColor", () => {
    it("should return correct color for known emotion", () => {
      const color = getEmotionColor("stress" as EmotionType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.emotion.stress));
    });

    it("should return neutral color for unknown emotion", () => {
      const color = getEmotionColor("unknown" as EmotionType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.emotion.neutral));
    });
  });

  describe("getFallacyColor", () => {
    it("should return correct color for known fallacy", () => {
      const color = getFallacyColor("ad_hominem" as FallacyType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.fallacy.ad_hominem));
    });

    it("should return ad_hominem color for unknown fallacy", () => {
      const color = getFallacyColor("unknown" as FallacyType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.fallacy.ad_hominem));
    });
  });

  describe("getTopicColor", () => {
    it("should return correct color for known topic", () => {
      const color = getTopicColor("work_career" as TopicType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.topic.work_career));
    });

    it("should return other color for unknown topic", () => {
      const color = getTopicColor("unknown" as TopicType);
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.topic.other));
    });
  });

  describe("getToneColor", () => {
    it("should return correct color for formality", () => {
      const color = getToneColor("formality");
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.tone.formality));
    });

    it("should return correct color for professionalism", () => {
      const color = getToneColor("professionalism");
      expect(color).toEqual(hexToRgb(PDF_COLOR_PALETTE.tone.professionalism));
    });
  });

  describe("CACHED_COLORS", () => {
    it("should have pre-computed lightGray RGB", () => {
      expect(CACHED_COLORS.lightGray).toEqual(hexToRgb(PDF_COLOR_PALETTE.utility.lightGray));
    });

    it("should have pre-computed section colors", () => {
      expect(CACHED_COLORS.sectionEmotion).toEqual(hexToRgb(PDF_COLOR_PALETTE.section.emotion));
      expect(CACHED_COLORS.sectionTone).toEqual(hexToRgb(PDF_COLOR_PALETTE.section.tone));
      expect(CACHED_COLORS.sectionGfk).toEqual(hexToRgb(PDF_COLOR_PALETTE.section.gfk));
    });
  });

  describe("PDF_RECORDING_CONFIG", () => {
    it("should have valid page configuration", () => {
      expect(PDF_RECORDING_CONFIG.page.format).toBe("a4");
      expect(PDF_RECORDING_CONFIG.page.orientation).toBe("portrait");
      expect(PDF_RECORDING_CONFIG.page.unit).toBe("mm");
    });

    it("should have consistent layout values", () => {
      expect(PDF_RECORDING_CONFIG.layout.marginLeft).toBe(20);
      expect(PDF_RECORDING_CONFIG.layout.marginTop).toBe(20);
      expect(PDF_RECORDING_CONFIG.layout.maxContentWidth).toBe(170); // 210 - 2*20
    });

    it("should have typography configuration", () => {
      expect(PDF_RECORDING_CONFIG.typography.font.family).toBe("helvetica");
      expect(PDF_RECORDING_CONFIG.typography.fontSize.title).toBeGreaterThan(
        PDF_RECORDING_CONFIG.typography.fontSize.body
      );
    });
  });
});
