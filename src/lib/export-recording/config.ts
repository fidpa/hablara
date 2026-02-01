/**
 * Recording PDF Export Configuration
 *
 * Centralized configuration for recording PDF generation with jsPDF.
 * Based on export-chat/config.ts with recording-specific adjustments.
 */

import type { EmotionType, FallacyType, TopicType } from "@/lib/types";

/**
 * Color Palette (Static Hex Values)
 *
 * Replaces CSS variables for PDF generation.
 * Source: src/app/globals.css
 */
export const PDF_COLOR_PALETTE = {
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
    red_herring: '#dc2626',
    tu_quoque: '#ea580c',
    hasty_generalization: '#d97706',
    post_hoc: '#ca8a04',
    bandwagon: '#65a30d',
    appeal_emotion: '#16a34a',
    appeal_ignorance: '#059669',
    loaded_question: '#0d9488',
    no_true_scotsman: '#0891b2',
    false_cause: '#0284c7',
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
    observations: '#3b82f6',    // blue-500
    feelings: '#ec4899',        // pink-500
    needs: '#22c55e',           // green-500
    requests: '#f59e0b',        // amber-500
  },
  cognitive: {
    balanced: '#22c55e',        // green-500
    somewhat_distorted: '#eab308', // yellow-500
    highly_distorted: '#ef4444',   // red-500
  },
  fourSides: {
    sachinhalt: '#3b82f6',      // blue-500
    selbstoffenbarung: '#8b5cf6',// violet-500
    beziehung: '#ec4899',       // pink-500
    appell: '#f59e0b',          // amber-500
  },
  utility: {
    lightGray: '#f3f4f6',       // gray-100
    mediumGray: '#9ca3af',      // gray-400
    white: '#ffffff',
    redTint: '#fef2f2',         // red-50
    greenTint: '#f0fdf4',       // green-50
    blueTint: '#eff6ff',        // blue-50
  },
  section: {
    details: '#6b7280',         // gray-500 (Recording Details)
    emotion: '#ef4444',         // red-500 (Emotion Analysis)
    tone: '#8b5cf6',            // violet-500 (Tone Analysis)
    fallacy: '#ef4444',         // red-500 (Fallacy Detection)
    gfk: '#22c55e',             // green-500 (GFK Analysis)
    cognitive: '#8b5cf6',       // violet-500 (Cognitive Distortions)
    fourSides: '#3b82f6',       // blue-500 (Four-Sides Model)
    topic: '#3b82f6',           // blue-500 (Topic Classification)
    reflection: '#8b5cf6',      // violet-500 (Personalized Reflection)
  },
} as const;

/**
 * Convert hex color to RGB object
 *
 * @param hex - Hex color string (e.g., "#3b82f6")
 * @returns RGB object { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace(/^#/, '');
  const bigint = parseInt(cleaned, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Get RGB color for an emotion type
 *
 * @param emotion - EmotionType
 * @returns RGB object
 */
export function getEmotionColor(emotion: EmotionType): { r: number; g: number; b: number } {
  const hex = PDF_COLOR_PALETTE.emotion[emotion] || PDF_COLOR_PALETTE.emotion.neutral;
  return hexToRgb(hex);
}

/**
 * Get RGB color for a fallacy type
 *
 * @param fallacy - FallacyType
 * @returns RGB object
 */
export function getFallacyColor(fallacy: FallacyType): { r: number; g: number; b: number } {
  const hex = PDF_COLOR_PALETTE.fallacy[fallacy] || PDF_COLOR_PALETTE.fallacy.ad_hominem;
  return hexToRgb(hex);
}

/**
 * Get RGB color for a topic type
 *
 * @param topic - TopicType
 * @returns RGB object
 */
export function getTopicColor(topic: TopicType): { r: number; g: number; b: number } {
  const hex = PDF_COLOR_PALETTE.topic[topic] || PDF_COLOR_PALETTE.topic.other;
  return hexToRgb(hex);
}

/**
 * Get RGB color for a tone dimension
 *
 * @param dimension - Tone dimension key
 * @returns RGB object
 */
export function getToneColor(dimension: keyof typeof PDF_COLOR_PALETTE.tone): { r: number; g: number; b: number } {
  const hex = PDF_COLOR_PALETTE.tone[dimension];
  return hexToRgb(hex);
}

/**
 * Cached RGB conversions for frequently used colors
 * Performance optimization to avoid repeated hexToRgb() calls
 */
export const CACHED_COLORS = {
  lightGray: hexToRgb(PDF_COLOR_PALETTE.utility.lightGray),
  mediumGray: hexToRgb(PDF_COLOR_PALETTE.utility.mediumGray),
  redTint: hexToRgb(PDF_COLOR_PALETTE.utility.redTint),
  greenTint: hexToRgb(PDF_COLOR_PALETTE.utility.greenTint),
  blueTint: hexToRgb(PDF_COLOR_PALETTE.utility.blueTint),
  // Section colors
  sectionDetails: hexToRgb(PDF_COLOR_PALETTE.section.details),
  sectionEmotion: hexToRgb(PDF_COLOR_PALETTE.section.emotion),
  sectionTone: hexToRgb(PDF_COLOR_PALETTE.section.tone),
  sectionFallacy: hexToRgb(PDF_COLOR_PALETTE.section.fallacy),
  sectionGfk: hexToRgb(PDF_COLOR_PALETTE.section.gfk),
  sectionCognitive: hexToRgb(PDF_COLOR_PALETTE.section.cognitive),
  sectionFourSides: hexToRgb(PDF_COLOR_PALETTE.section.fourSides),
  sectionTopic: hexToRgb(PDF_COLOR_PALETTE.section.topic),
  sectionReflection: hexToRgb(PDF_COLOR_PALETTE.section.reflection),
} as const;

export const PDF_RECORDING_CONFIG = {
  page: {
    format: "a4" as const,
    orientation: "portrait" as const,
    unit: "mm" as const,
  },
  layout: {
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 20,
    maxContentWidth: 170, // A4 width (210mm) - 2x20mm margins
    maxY: 277, // A4 height (297mm) - 20mm bottom margin
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
      family: "helvetica" as const,
      styleNormal: "normal" as const,
      styleBold: "bold" as const,
    },
  },
  spacing: {
    afterTitle: 8,
    afterSectionHeader: 4,
    afterSubsectionHeader: 2,     // CHANGED: 4→2 (header closer to its content)
    afterSubsection: 8,           // CHANGED: 4→8 (more space after content, before next header)
    betweenSections: 10,
    beforeSectionHeader: 10,      // Space before major section header
    beforeSubsectionHeader: 6,    // Space before subsection header (after boxes)
    afterBadge: 10,               // Space after badges
    afterConfidenceText: 6,       // Space after confidence text
    beforeList: 3,
    listItemIndent: 5,
    afterProgressBar: 3,
  },
  visual: {
    badge: {
      padding: 2,        // mm padding inside badge
      height: 5,         // mm badge height
      cornerRadius: 1.5, // mm corner radius
    },
    box: {
      padding: {
        top: 3,          // CHANGED: 2 → 3 for vertical centering (symmetric with bottom)
        right: 3,
        bottom: 3,
        left: 3,
      },
      borderWidth: 1,    // mm left border width
    },
    progressBar: {
      width: 60,         // mm total bar width
      height: 4,         // mm bar height
    },
    sectionBorder: {
      width: 0.5,        // mm top border width
      offset: 6,         // mm above header text (accounts for 12pt = 4.2mm height)
    },
  },
} as const;

export type PDFRecordingConfig = typeof PDF_RECORDING_CONFIG;
