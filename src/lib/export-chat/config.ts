/**
 * PDF Export Configuration
 *
 * Centralized configuration for PDF generation with jsPDF.
 * Follows Dynamic Values Pattern (CLAUDE.md Quality-First Policy).
 */

export const PDF_EXPORT_CONFIG = {
  page: {
    format: "a4" as const,      // ISO 216: 210mm × 297mm
    orientation: "portrait" as const,
    unit: "mm" as const,
  },
  layout: {
    marginLeft: 20,             // 20mm left margin
    marginTop: 20,              // 20mm top margin
    marginBottom: 20,           // 20mm bottom margin
    maxContentWidth: 170,       // 210mm - 2×20mm = 170mm usable width
    maxY: 277,                  // 297mm - 20mm bottom = 277mm
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
      family: "helvetica" as const,
      styleNormal: "normal" as const,
      styleBold: "bold" as const,
    },
  },
  spacing: {
    afterHeader: 6,
    betweenMessages: 8,
    beforeMetadata: 2,
  },
} as const;

export type PDFExportConfig = typeof PDF_EXPORT_CONFIG;

/**
 * DOCX Export Configuration
 *
 * Font sizes in half-points (20 = 10pt).
 * Colors in hex format without '#' prefix.
 */
export const DOCX_EXPORT_CONFIG = {
  document: {
    title: "Hablará Sprachanalyse",
    creator: "Hablará",
  },
  typography: {
    fontSize: {
      title: 32,      // 16pt (half-points)
      subtitle: 24,   // 12pt
      heading: 22,    // 11pt
      body: 20,       // 10pt
      caption: 18,    // 9pt
    },
    font: { family: "Arial" },
  },
  colors: {
    userHeader: "2563EB",       // Blue-600
    assistantHeader: "059669",  // Emerald-600
    gfkObservations: "3B82F6",  // Blue-500
    gfkFeelings: "EC4899",      // Pink-500
    gfkNeeds: "22C55E",         // Green-500
    gfkRequests: "F59E0B",      // Amber-500
    cognitiveBalanced: "22C55E",
    cognitiveSomewhat: "EAB308",
    cognitiveHighly: "EF4444",
    fourSidesSachinhalt: "3B82F6",
    fourSidesSelbstoffenbarung: "8B5CF6",
    fourSidesBeziehung: "EC4899",
    fourSidesAppell: "F97316",
    muted: "6B7280",
    border: "D1D5DB",
  },
  spacing: {
    afterTitle: 400,
    betweenMessages: 300,
    beforeMetadata: 100,
  },
} as const;

export type DOCXExportConfig = typeof DOCX_EXPORT_CONFIG;
