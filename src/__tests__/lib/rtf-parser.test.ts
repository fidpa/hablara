/**
 * RTF Parser Tests
 *
 * Tests for RTF detection and conversion to plain text.
 * Covers macOS TextEdit RTF format.
 */

import { describe, it, expect } from "vitest";
import { isRTF, rtfToText } from "@/lib/rtf-parser";

describe("rtf-parser", () => {
  describe("isRTF", () => {
    it("should detect RTF format", () => {
      const rtf = "{\\rtf1\\ansi\\ansicpg1252 Hello World}";
      expect(isRTF(rtf)).toBe(true);
    });

    it("should detect RTF with leading whitespace", () => {
      const rtf = "  \n  {\\rtf1\\ansi\\ansicpg1252 Hello}";
      expect(isRTF(rtf)).toBe(true);
    });

    it("should reject plain text", () => {
      const text = "This is plain text";
      expect(isRTF(text)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isRTF("")).toBe(false);
    });

    it("should reject JSON (looks like RTF with braces)", () => {
      const json = '{"key": "value"}';
      expect(isRTF(json)).toBe(false);
    });
  });

  describe("rtfToText", () => {
    it("should extract plain text from simple RTF", () => {
      const rtf = "{\\rtf1\\ansi\\ansicpg1252 Hello World}";
      const text = rtfToText(rtf);
      expect(text).toBe("Hello World");
    });

    it("should handle macOS TextEdit RTF format", () => {
      const rtf = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2867
\\cocoatextscaling0\\cocoaplatform0{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}
{\\colortbl;\\red255\\green255\\blue255;}
{\\*\\expandedcolortbl;;}
\\paperw11900\\paperh16840\\margl1440\\margr1440\\vieww11520\\viewh8400\\viewkind0
\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\pardirnatural\\partightenfactor0
\\f0\\fs24 \\cf0 Ich bin sehr traurig, weil ich so viel arbeiten muss.}`;

      const text = rtfToText(rtf);
      expect(text).toBe("Ich bin sehr traurig, weil ich so viel arbeiten muss.");
    });

    it("should handle Unicode characters", () => {
      const rtf = "{\\rtf1 Caf\\'e9}"; // \'e9 = é
      const text = rtfToText(rtf);
      expect(text).toContain("Caf");
      expect(text).toContain("é");
    });

    it("should handle RTF line breaks (\\par)", () => {
      const rtf = "{\\rtf1 Line 1\\par Line 2\\par Line 3}";
      const text = rtfToText(rtf);
      expect(text).toContain("Line 1");
      expect(text).toContain("Line 2");
      expect(text).toContain("Line 3");
    });

    it("should remove font table", () => {
      const rtf = "{\\rtf1{\\fonttbl\\f0\\fswiss Helvetica;} Hello}";
      const text = rtfToText(rtf);
      expect(text).toBe("Hello");
      expect(text).not.toContain("fonttbl");
      expect(text).not.toContain("Helvetica");
    });

    it("should remove color table", () => {
      const rtf = "{\\rtf1{\\colortbl;\\red255\\green255\\blue255;} Hello}";
      const text = rtfToText(rtf);
      expect(text).toBe("Hello");
      expect(text).not.toContain("colortbl");
    });

    it("should handle nested control groups", () => {
      const rtf = "{\\rtf1{\\fonttbl{\\f0\\fswiss Helvetica;}} Text}";
      const text = rtfToText(rtf);
      expect(text).toBe("Text");
    });

    it("should clean up whitespace", () => {
      const rtf = "{\\rtf1   Multiple   Spaces   Here  }";
      const text = rtfToText(rtf);
      expect(text).toBe("Multiple Spaces Here");
    });

    it("should handle empty RTF document", () => {
      const rtf = "{\\rtf1}";
      const text = rtfToText(rtf);
      expect(text).toBe("");
    });

    it("should preserve German umlauts (hex encoding)", () => {
      const rtf = "{\\rtf1 M\\'fcnchen}"; // \'fc = ü
      const text = rtfToText(rtf);
      expect(text).toContain("M");
      expect(text).toContain("nchen");
    });

    it("should handle control words with parameters", () => {
      const rtf = "{\\rtf1\\paperw11900\\margl1440 Text}";
      const text = rtfToText(rtf);
      expect(text).toBe("Text");
      expect(text).not.toContain("paperw");
      expect(text).not.toContain("11900");
    });

    it("should remove RTF artifacts (semicolons, asterisks)", () => {
      const rtf = "{\\rtf1{\\*\\expandedcolortbl;;} Text}";
      const text = rtfToText(rtf);
      expect(text).toBe("Text");
      expect(text).not.toContain(";");
      expect(text).not.toContain("*");
    });
  });
});
