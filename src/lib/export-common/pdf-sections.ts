/**
 * PDF Section Renderers
 *
 * Shared section rendering functions for PDF generation.
 * Extracted from export-recording/pdf.ts for code reuse between recording and chat exports.
 */

import type jsPDF from "jspdf";
import type {
  RecordingMetadata,
  EmotionType,
  ToneResult,
  GFKAnalysis,
  CognitiveDistortionResult,
  FourSidesAnalysis,
  FallacyData,
  TopicType,
  AudioFeatures,
} from "@/lib/types";
import {
  EMOTION_INFO,
  TONE_DIMENSIONS,
  FALLACY_INFO,
  TOPIC_INFO,
} from "@/lib/types";
import {
  PDF_RECORDING_CONFIG,
  CACHED_COLORS,
  PDF_COLOR_PALETTE,
  hexToRgb,
  getEmotionColor,
  getFallacyColor,
  getTopicColor,
  getToneColor,
} from "./pdf-colors";
import {
  addText,
  addSectionHeader,
  addSubsectionHeader,
  addBadge,
  addBoxedSection,
  addProgressBar,
  addBulletList,
  checkPageBreak,
  getToneLabel,
  formatDuration,
  formatFileSize,
} from "./pdf-formatting";
import type { PDFSectionOptions } from "./pdf-types";

// Thinking style labels for cognitive distortions
const THINKING_STYLE_LABELS: Record<string, string> = {
  balanced: "Ausgewogen",
  somewhat_distorted: "Leicht verzerrt",
  highly_distorted: "Stark verzerrt",
};

// Distortion type labels
const DISTORTION_TYPE_LABELS: Record<string, string> = {
  catastrophizing: "Katastrophisieren",
  all_or_nothing: "Schwarz-Weiß-Denken",
  overgeneralization: "Übergeneralisierung",
  mind_reading: "Gedankenlesen",
  personalization: "Personalisierung",
  emotional_reasoning: "Emotionales Schlussfolgern",
  should_statements: "Sollte-Aussagen",
};

/**
 * Add Emotion Analysis section
 *
 * @param doc - jsPDF instance
 * @param metadata - RecordingMetadata (or partial with emotion field)
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addEmotionSection(
  doc: jsPDF,
  metadata: Partial<RecordingMetadata>,
  y: number,
  options: PDFSectionOptions = {}
): number {
  if (!metadata.emotion) return y;

  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  const primaryColor = getEmotionColor(metadata.emotion.primary as EmotionType);
  currentY = addSectionHeader(doc, "Emotions-Analyse", currentY, primaryColor, useVisualDesign);

  const primaryInfo = EMOTION_INFO[metadata.emotion.primary as EmotionType];

  // Primary emotion badge (visual design)
  if (useVisualDesign) {
    const badgeX = config.layout.marginLeft;
    const badgeText = `${primaryInfo?.name || metadata.emotion.primary} (${(metadata.emotion.confidence * 100).toFixed(0)}%)`;
    const badgeWidth = addBadge(doc, badgeText, primaryColor, badgeX, currentY, useVisualDesign);
    currentY += config.spacing.afterBadge;

    // Secondary badge (if present)
    if (metadata.emotion.secondary) {
      const secondaryColor = getEmotionColor(metadata.emotion.secondary as EmotionType);
      const secondaryInfo = EMOTION_INFO[metadata.emotion.secondary as EmotionType];
      addBadge(
        doc,
        `Sekundär: ${secondaryInfo?.name || metadata.emotion.secondary}`,
        secondaryColor,
        badgeX + badgeWidth,
        currentY - 7,
        useVisualDesign
      );
    }
  } else {
    // Fallback: text-only
    currentY = addText(
      doc,
      `Primär: ${primaryInfo?.name || metadata.emotion.primary} (Konfidenz: ${(metadata.emotion.confidence * 100).toFixed(0)}%)`,
      currentY,
      config.typography.fontSize.body
    );

    if (metadata.emotion.secondary) {
      const secondaryInfo = EMOTION_INFO[metadata.emotion.secondary as EmotionType];
      currentY = addText(
        doc,
        `Sekundär: ${secondaryInfo?.name || metadata.emotion.secondary}`,
        currentY,
        config.typography.fontSize.body
      );
    }
  }

  currentY += config.spacing.afterSubsection;

  return currentY;
}

/**
 * Add Audio Features subsection (within Emotion Analysis)
 *
 * @param doc - jsPDF instance
 * @param features - AudioFeatures object
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addAudioFeaturesSection(
  doc: jsPDF,
  features: AudioFeatures,
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  if (useVisualDesign) {
    const boxContent = [
      `Pitch: ${features.pitch.toFixed(2)} Hz`,
      `Energie: ${features.energy.toFixed(4)}`,
      `Sprechrate: ${features.speechRate.toFixed(2)} Wörter/Sek`,
      `Pitch-Varianz: ${features.pitchVariance.toFixed(2)}`,
      `Pitch-Range: ${features.pitchRange.toFixed(2)} Hz`,
      `Energie-Varianz: ${features.energyVariance.toFixed(4)}`,
      `Pausendauer (Ø): ${features.pauseDurationAvg.toFixed(2)}s`,
      `Pausenfrequenz: ${features.pauseFrequency.toFixed(2)} pro Sek`,
      `ZCR-Mean: ${features.zcrMean.toFixed(4)}`,
      `Spectral Centroid: ${features.spectralCentroid.toFixed(2)} Hz`,
      `Spectral Rolloff: ${features.spectralRolloff.toFixed(2)} Hz`,
      `Spectral Flux: ${features.spectralFlux.toFixed(4)}`,
    ];

    const primaryColor = CACHED_COLORS.sectionEmotion;
    currentY = addBoxedSection(doc, boxContent, currentY, CACHED_COLORS.lightGray, primaryColor, useVisualDesign);
  } else {
    // Fallback: text-only
    currentY = addSubsectionHeader(doc, "Audio-Features:", currentY);
    const featureTexts = [
      `Pitch: ${features.pitch.toFixed(2)} Hz`,
      `Energie: ${features.energy.toFixed(4)}`,
      `Sprechrate: ${features.speechRate.toFixed(2)} Wörter/Sek`,
      `Pitch-Varianz: ${features.pitchVariance.toFixed(2)}`,
      `Pitch-Range: ${features.pitchRange.toFixed(2)} Hz`,
      `Energie-Varianz: ${features.energyVariance.toFixed(4)}`,
      `Pausendauer (Ø): ${features.pauseDurationAvg.toFixed(2)}s`,
      `Pausenfrequenz: ${features.pauseFrequency.toFixed(2)} pro Sek`,
      `ZCR-Mean: ${features.zcrMean.toFixed(4)}`,
      `Spectral Centroid: ${features.spectralCentroid.toFixed(2)} Hz`,
      `Spectral Rolloff: ${features.spectralRolloff.toFixed(2)} Hz`,
      `Spectral Flux: ${features.spectralFlux.toFixed(4)}`,
    ];

    for (const text of featureTexts) {
      currentY = addText(
        doc,
        `• ${text}`,
        currentY,
        config.typography.fontSize.small,
        false,
        config.spacing.listItemIndent
      );
    }
  }

  return currentY;
}

/**
 * Add Tone Analysis section
 *
 * @param doc - jsPDF instance
 * @param tone - ToneResult object
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addToneSection(
  doc: jsPDF,
  tone: ToneResult,
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "Tonalität (5-Dimensional)", currentY, CACHED_COLORS.sectionTone, useVisualDesign);

  const dimensions: (keyof typeof TONE_DIMENSIONS)[] = [
    "formality",
    "professionalism",
    "directness",
    "energy",
    "seriousness",
  ];

  if (useVisualDesign) {
    // Progress bars (visual design)
    for (const dim of dimensions) {
      const value = tone[dim];
      if (typeof value === "number") {
        const dimColor = getToneColor(dim);
        currentY = addProgressBar(doc, value, TONE_DIMENSIONS[dim].name, dimColor, currentY, useVisualDesign);
      }
    }

    // Confidence (small gray text)
    if (tone.confidence) {
      doc.setFontSize(config.typography.fontSize.caption);
      doc.setTextColor(CACHED_COLORS.mediumGray.r, CACHED_COLORS.mediumGray.g, CACHED_COLORS.mediumGray.b);
      doc.text(
        `Konfidenz: ${(tone.confidence * 100).toFixed(0)}%`,
        config.layout.marginLeft,
        currentY
      );
      doc.setTextColor(0, 0, 0);
      currentY += config.spacing.afterConfidenceText;
    }
  } else {
    // Fallback: text-only
    for (const dim of dimensions) {
      const value = tone[dim];
      if (typeof value === "number") {
        const label = getToneLabel(value, dim);
        currentY = addText(
          doc,
          `• ${TONE_DIMENSIONS[dim].name}: ${value}/5 (${label})`,
          currentY,
          config.typography.fontSize.body,
          false,
          config.spacing.listItemIndent
        );
      }
    }

    if (tone.confidence) {
      currentY = addText(
        doc,
        `Konfidenz: ${(tone.confidence * 100).toFixed(0)}%`,
        currentY,
        config.typography.fontSize.caption
      );
    }
  }

  return currentY;
}

/**
 * Add Fallacy Detection section
 *
 * @param doc - jsPDF instance
 * @param fallacies - FallacyData array
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addFallacySection(
  doc: jsPDF,
  fallacies: FallacyData[],
  y: number,
  options: PDFSectionOptions = {}
): number {
  if (!fallacies || fallacies.length === 0) return y;

  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "Fehlschlüsse (Argumentation)", currentY, CACHED_COLORS.sectionFallacy, useVisualDesign);

  for (let i = 0; i < fallacies.length; i++) {
    const fallacy = fallacies[i];
    if (!fallacy) continue;

    const info = FALLACY_INFO[fallacy.type];
    const fallacyColor = getFallacyColor(fallacy.type);

    currentY = checkPageBreak(doc, currentY, 25);

    if (useVisualDesign) {
      // Fallacy badge
      const badgeText = `${info?.name || fallacy.type} (${(fallacy.confidence * 100).toFixed(0)}%)`;
      addBadge(doc, badgeText, fallacyColor, config.layout.marginLeft, currentY, useVisualDesign);
      currentY += config.spacing.afterBadge;

      // Details in red-tinted box
      const boxContent: string[] = [];
      if (fallacy.quote) boxContent.push(`Zitat: "${fallacy.quote}"`);
      if (fallacy.explanation) boxContent.push(`Erklärung: ${fallacy.explanation}`);
      if (fallacy.suggestion) boxContent.push(`Vorschlag: ${fallacy.suggestion}`);

      if (boxContent.length > 0) {
        currentY = addBoxedSection(doc, boxContent, currentY, CACHED_COLORS.redTint, fallacyColor, useVisualDesign);
      }
    } else {
      // Fallback: text-only
      currentY = addText(
        doc,
        `${i + 1}. ${info?.name || fallacy.type} (Konfidenz: ${(fallacy.confidence * 100).toFixed(0)}%)`,
        currentY,
        config.typography.fontSize.body,
        true
      );

      if (fallacy.quote) {
        currentY = addText(
          doc,
          `Zitat: "${fallacy.quote}"`,
          currentY,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
      }

      if (fallacy.explanation) {
        currentY = addText(
          doc,
          `Erklärung: ${fallacy.explanation}`,
          currentY,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
      }

      if (fallacy.suggestion) {
        currentY = addText(
          doc,
          `Vorschlag: ${fallacy.suggestion}`,
          currentY,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
      }
    }

    currentY += config.spacing.afterSubsection;
  }

  return currentY;
}

/**
 * Add GFK Analysis section
 *
 * @param doc - jsPDF instance
 * @param gfk - GFKAnalysis object
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addGFKSection(
  doc: jsPDF,
  gfk: GFKAnalysis,
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "GFK-Analyse (Gewaltfreie Kommunikation)", currentY, CACHED_COLORS.sectionGfk, useVisualDesign);

  const gfkSections = [
    { key: 'observations', title: 'Beobachtungen', color: PDF_COLOR_PALETTE.gfk.observations },
    { key: 'feelings', title: 'Gefühle', color: PDF_COLOR_PALETTE.gfk.feelings },
    { key: 'needs', title: 'Bedürfnisse', color: PDF_COLOR_PALETTE.gfk.needs },
    { key: 'requests', title: 'Bitten', color: PDF_COLOR_PALETTE.gfk.requests },
  ] as const;

  for (const section of gfkSections) {
    const data = gfk[section.key as keyof GFKAnalysis];
    if (!data || (Array.isArray(data) && data.length === 0)) continue;

    const sectionColor = hexToRgb(section.color);

    if (useVisualDesign) {
      // Colored subsection header
      doc.setTextColor(sectionColor.r, sectionColor.g, sectionColor.b);
      currentY = addText(doc, section.title + ":", currentY, config.typography.fontSize.subsectionHeader, true);
      doc.setTextColor(0, 0, 0);
      currentY += config.spacing.afterSubsectionHeader;  // Small space after header
    } else {
      currentY = addSubsectionHeader(doc, section.title + ":", currentY);
    }

    if (Array.isArray(data)) {
      if (section.key === 'observations' || section.key === 'requests') {
        currentY = addBulletList(doc, data, currentY, useVisualDesign ? sectionColor : undefined, useVisualDesign);
      } else {
        // feelings, needs - comma-separated
        currentY = addText(doc, data.join(", "), currentY, config.typography.fontSize.body, false, config.spacing.listItemIndent);
      }
    }

    currentY += config.spacing.afterSubsection;  // More space after content
  }

  // GFK Translation in green box (visual design)
  if (gfk.gfkTranslation) {
    if (useVisualDesign) {
      currentY = addBoxedSection(doc, [`GFK-Übersetzung: ${gfk.gfkTranslation}`], currentY, CACHED_COLORS.greenTint, CACHED_COLORS.sectionGfk, useVisualDesign);
      currentY += config.spacing.afterSubsection;
    } else {
      currentY = addSubsectionHeader(doc, "GFK-Übersetzung:", currentY);
      currentY = addText(doc, gfk.gfkTranslation, currentY, config.typography.fontSize.body, false, config.spacing.listItemIndent);
    }
  }

  // Reflection Question
  if (gfk.reflectionQuestion) {
    currentY = addSubsectionHeader(doc, "Reflexionsfrage:", currentY);
    currentY = addText(doc, gfk.reflectionQuestion, currentY, config.typography.fontSize.body, false, config.spacing.listItemIndent);
  }

  return currentY;
}

/**
 * Add Cognitive Distortions section
 *
 * @param doc - jsPDF instance
 * @param cognitive - CognitiveDistortionResult object
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addCognitiveSection(
  doc: jsPDF,
  cognitive: CognitiveDistortionResult,
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "Kognitive Verzerrungen (CBT)", currentY, CACHED_COLORS.sectionCognitive, useVisualDesign);

  // Thinking style badge (visual design)
  const thinkingStyleLabel = THINKING_STYLE_LABELS[cognitive.overallThinkingStyle] || cognitive.overallThinkingStyle;

  if (useVisualDesign) {
    // Color based on thinking style severity
    let styleColor: { r: number; g: number; b: number };
    if (cognitive.overallThinkingStyle === 'balanced') {
      styleColor = hexToRgb(PDF_COLOR_PALETTE.cognitive.balanced);
    } else if (cognitive.overallThinkingStyle === 'somewhat_distorted') {
      styleColor = hexToRgb(PDF_COLOR_PALETTE.cognitive.somewhat_distorted);
    } else {
      styleColor = hexToRgb(PDF_COLOR_PALETTE.cognitive.highly_distorted);
    }

    addBadge(doc, `Denkstil: ${thinkingStyleLabel}`, styleColor, config.layout.marginLeft, currentY, useVisualDesign);
    currentY += config.spacing.afterBadge;
  } else {
    currentY = addText(
      doc,
      `Denkstil: ${thinkingStyleLabel}`,
      currentY,
      config.typography.fontSize.body,
      true
    );
  }

  // Individual distortions
  if (cognitive.distortions && cognitive.distortions.length > 0) {
    currentY += config.spacing.afterSubsection;

    for (let i = 0; i < cognitive.distortions.length; i++) {
      const distortion = cognitive.distortions[i];
      if (!distortion) continue;

      currentY = checkPageBreak(doc, currentY, 25);

      if (useVisualDesign) {
        // Distortion name as small header
        doc.setFontSize(config.typography.fontSize.body);
        doc.setFont(config.typography.font.family, config.typography.font.styleBold);
        doc.text(
          `${i + 1}. ${DISTORTION_TYPE_LABELS[distortion.type] || distortion.type}`,
          config.layout.marginLeft,
          currentY
        );
        currentY += config.typography.lineHeight;

        // Details in light gray box
        const boxContent: string[] = [];
        if (distortion.quote) boxContent.push(`Zitat: "${distortion.quote}"`);
        if (distortion.explanation) boxContent.push(`Erklärung: ${distortion.explanation}`);
        if (distortion.reframe) boxContent.push(`Reframe: ${distortion.reframe}`);

        if (boxContent.length > 0) {
          currentY = addBoxedSection(doc, boxContent, currentY, CACHED_COLORS.lightGray, CACHED_COLORS.sectionCognitive, useVisualDesign);
        }
      } else {
        // Fallback: text-only
        currentY = addText(
          doc,
          `${i + 1}. ${DISTORTION_TYPE_LABELS[distortion.type] || distortion.type}`,
          currentY,
          config.typography.fontSize.body,
          true
        );

        if (distortion.quote) {
          currentY = addText(
            doc,
            `Zitat: "${distortion.quote}"`,
            currentY,
            config.typography.fontSize.small,
            false,
            config.spacing.listItemIndent
          );
        }

        if (distortion.explanation) {
          currentY = addText(
            doc,
            `Erklärung: ${distortion.explanation}`,
            currentY,
            config.typography.fontSize.small,
            false,
            config.spacing.listItemIndent
          );
        }

        if (distortion.reframe) {
          currentY = addText(
            doc,
            `Reframe: ${distortion.reframe}`,
            currentY,
            config.typography.fontSize.small,
            false,
            config.spacing.listItemIndent
          );
        }
      }

      currentY += config.spacing.afterSubsection;
    }
  }

  return currentY;
}

/**
 * Add Four-Sides Model section
 *
 * @param doc - jsPDF instance
 * @param fourSides - FourSidesAnalysis object
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addFourSidesSection(
  doc: jsPDF,
  fourSides: FourSidesAnalysis,
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "Vier-Seiten-Modell (Schulz von Thun)", currentY, CACHED_COLORS.sectionFourSides, useVisualDesign);

  const fourSidesSections = [
    { key: 'sachinhalt', title: 'Sachinhalt', color: PDF_COLOR_PALETTE.fourSides.sachinhalt },
    { key: 'selbstoffenbarung', title: 'Selbstoffenbarung', color: PDF_COLOR_PALETTE.fourSides.selbstoffenbarung },
    { key: 'beziehung', title: 'Beziehung', color: PDF_COLOR_PALETTE.fourSides.beziehung },
    { key: 'appell', title: 'Appell', color: PDF_COLOR_PALETTE.fourSides.appell },
  ] as const;

  for (const section of fourSidesSections) {
    const data = fourSides[section.key as keyof FourSidesAnalysis];
    if (!data || typeof data !== 'string') continue;

    const sectionColor = hexToRgb(section.color);

    if (useVisualDesign) {
      // Colored subsection header
      doc.setTextColor(sectionColor.r, sectionColor.g, sectionColor.b);
      currentY = addText(doc, section.title + ":", currentY, config.typography.fontSize.subsectionHeader, true);
      doc.setTextColor(0, 0, 0);
      currentY += config.spacing.afterSubsectionHeader;  // Small space: header closer to its box

      // Content in colored box
      const boxContent = [data as string];
      currentY = addBoxedSection(doc, boxContent, currentY, CACHED_COLORS.lightGray, sectionColor, useVisualDesign);
    } else {
      currentY = addSubsectionHeader(doc, section.title + ":", currentY);
      currentY = addText(doc, data as string, currentY, config.typography.fontSize.body, false, config.spacing.listItemIndent);
    }

    currentY += config.spacing.afterSubsection;  // More space: separation before next header
  }

  // Potential misunderstandings
  if (fourSides.potentielleMissverstaendnisse && fourSides.potentielleMissverstaendnisse.length > 0) {
    currentY = addSubsectionHeader(doc, "Potentielle Missverständnisse:", currentY);

    if (useVisualDesign) {
      const orangeColor = hexToRgb(PDF_COLOR_PALETTE.gfk.requests); // amber-500 (reuse GFK requests color)
      currentY = addBulletList(doc, fourSides.potentielleMissverstaendnisse, currentY, orangeColor, useVisualDesign);
    } else {
      currentY = addBulletList(doc, fourSides.potentielleMissverstaendnisse, currentY);
    }
  }

  return currentY;
}

/**
 * Add Topic Classification section
 *
 * @param doc - jsPDF instance
 * @param topic - Topic classification data
 * @param y - Current y position
 * @param options - Section rendering options
 * @returns Updated y position
 */
export function addTopicSection(
  doc: jsPDF,
  topic: { topic: TopicType; confidence: number; keywords?: string[] },
  y: number,
  options: PDFSectionOptions = {}
): number {
  const useVisualDesign = options.useVisualDesign !== false;
  const config = PDF_RECORDING_CONFIG;
  let currentY = y;

  currentY = addSectionHeader(doc, "Themen-Klassifikation", currentY, CACHED_COLORS.sectionTopic, useVisualDesign);

  const topicInfo = TOPIC_INFO[topic.topic as TopicType];
  const topicColor = getTopicColor(topic.topic as TopicType);

  if (useVisualDesign) {
    // Topic badge
    const badgeText = `${topicInfo?.name || topic.topic} (${(topic.confidence * 100).toFixed(0)}%)`;
    addBadge(doc, badgeText, topicColor, config.layout.marginLeft, currentY, useVisualDesign);
    currentY += config.spacing.afterBadge;

    // Keywords in blue-tinted box
    if (topic.keywords && topic.keywords.length > 0) {
      currentY = addBoxedSection(doc, [`Keywords: ${topic.keywords.join(", ")}`], currentY, CACHED_COLORS.blueTint, topicColor, useVisualDesign);
      currentY += config.spacing.afterSubsection;
    }
  } else {
    // Fallback: text-only
    currentY = addText(
      doc,
      `Kategorie: ${topicInfo?.name || topic.topic} (Konfidenz: ${(topic.confidence * 100).toFixed(0)}%)`,
      currentY,
      config.typography.fontSize.body
    );

    if (topic.keywords && topic.keywords.length > 0) {
      currentY = addText(
        doc,
        `Keywords: ${topic.keywords.join(", ")}`,
        currentY,
        config.typography.fontSize.small
      );
    }
  }

  return currentY;
}
