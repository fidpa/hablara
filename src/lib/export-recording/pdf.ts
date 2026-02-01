/**
 * Recording PDF Export
 *
 * Exports individual recording analyses as PDF files using jsPDF.
 * Uses shared PDF rendering utilities from @/lib/export-common.
 */

import jsPDF from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";
import type { RecordingExportOptions, RecordingExportResult } from "./types";
import { DEFAULT_RECORDING_EXPORT_OPTIONS } from "./types";
import type { RecordingMetadata } from "@/lib/types";

// Import shared PDF utilities
import {
  PDF_RECORDING_CONFIG,
  CACHED_COLORS,
  addText as sharedAddText,
  addSectionHeader as sharedAddSectionHeader,
  addBoxedSection as sharedAddBoxedSection,
  addEmotionSection,
  addAudioFeaturesSection,
  addToneSection,
  addFallacySection,
  addGFKSection,
  addCognitiveSection,
  addFourSidesSection,
  addTopicSection,
  formatDuration,
  formatFileSize,
} from "@/lib/export-common";

/**
 * Generate PDF from RecordingMetadata
 *
 * @param metadata - RecordingMetadata object
 * @param options - Export options
 * @returns PDF as ArrayBuffer
 */
export function generatePDFFromMetadata(
  metadata: RecordingMetadata,
  options: RecordingExportOptions = DEFAULT_RECORDING_EXPORT_OPTIONS
): ArrayBuffer {
  const doc = new jsPDF({
    orientation: PDF_RECORDING_CONFIG.page.orientation,
    unit: PDF_RECORDING_CONFIG.page.unit,
    format: PDF_RECORDING_CONFIG.page.format,
  });

  const config = PDF_RECORDING_CONFIG;
  const useVisualDesign = options.useVisualDesign !== false;
  let y: number = config.layout.marginTop;

  // ============================================
  // TITLE
  // ============================================
  y = sharedAddText(doc, "Hablará Sprachanalyse", y, config.typography.fontSize.title, true);
  y += config.spacing.afterTitle / 2;
  y = sharedAddText(
    doc,
    `Exportiert: ${new Date().toLocaleString("de-DE")}`,
    y,
    config.typography.fontSize.caption
  );
  y += config.spacing.afterTitle;

  // ============================================
  // RECORDING DETAILS
  // ============================================
  if (options.includeTimestamps) {
    y = sharedAddSectionHeader(doc, "Aufnahme-Details", y, CACHED_COLORS.sectionDetails, useVisualDesign);

    const sourceLabels: Record<string, string> = {
      recording: "Sprachaufnahme",
      text: "Text-Import",
      file: "Datei-Import",
      "audio-file": "Audio-Datei-Import",
    };

    if (useVisualDesign) {
      const detailsContent = [
        `Datum: ${new Date(metadata.createdAt).toLocaleString("de-DE")}`,
        `Dauer: ${formatDuration(metadata.durationMs)}`,
        `Dateigröße: ${formatFileSize(metadata.fileSize)}`,
      ];

      if (metadata.source) {
        detailsContent.push(`Quelle: ${sourceLabels[metadata.source] || metadata.source}`);
      }

      y = sharedAddBoxedSection(doc, detailsContent, y, CACHED_COLORS.lightGray, CACHED_COLORS.sectionDetails, useVisualDesign);
    } else {
      y = sharedAddText(
        doc,
        `Datum: ${new Date(metadata.createdAt).toLocaleString("de-DE")}`,
        y,
        config.typography.fontSize.body
      );
      y = sharedAddText(
        doc,
        `Dauer: ${formatDuration(metadata.durationMs)}`,
        y,
        config.typography.fontSize.body
      );
      y = sharedAddText(
        doc,
        `Dateigröße: ${formatFileSize(metadata.fileSize)}`,
        y,
        config.typography.fontSize.body
      );
      if (metadata.source) {
        y = sharedAddText(
          doc,
          `Quelle: ${sourceLabels[metadata.source] || metadata.source}`,
          y,
          config.typography.fontSize.body
        );
      }
    }
  }

  // ============================================
  // TRANSCRIPT
  // ============================================
  if (metadata.transcription?.text) {
    y = sharedAddSectionHeader(doc, "Transkript", y);
    y = sharedAddText(doc, metadata.transcription.text, y, config.typography.fontSize.body);
  }

  // ============================================
  // EMOTION ANALYSIS (Shared Function)
  // ============================================
  if (metadata.emotion && options.includeMetadata) {
    y = addEmotionSection(doc, metadata, y, { useVisualDesign });

    // Audio Validation Meta (Recording-specific, not in shared functions)
    if (options.includeAudioFeatures && metadata.audioValidation) {
      const validation = metadata.audioValidation;

      if (useVisualDesign) {
        const boxContent = [
          `RMS-Energie: ${validation.rmsEnergy.toFixed(4)}`,
          `Dauer: ${(validation.durationMs / 1000).toFixed(1)}s`,
          `Validierung: ${validation.passed ? "Bestanden" : "Fehlgeschlagen"}`,
        ];

        y = sharedAddBoxedSection(doc, boxContent, y, CACHED_COLORS.lightGray, CACHED_COLORS.sectionEmotion, useVisualDesign);
      } else {
        y = sharedAddText(
          doc,
          `• RMS-Energie: ${validation.rmsEnergy.toFixed(4)}`,
          y,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
        y = sharedAddText(
          doc,
          `• Dauer: ${(validation.durationMs / 1000).toFixed(1)}s`,
          y,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
        y = sharedAddText(
          doc,
          `• Validierung: ${validation.passed ? "Bestanden" : "Fehlgeschlagen"}`,
          y,
          config.typography.fontSize.small,
          false,
          config.spacing.listItemIndent
        );
      }
    }
  }

  // ============================================
  // TONE ANALYSIS (Shared Function)
  // ============================================
  if (metadata.tone && options.includeMetadata) {
    y = addToneSection(doc, metadata.tone, y, { useVisualDesign });
  }

  // ============================================
  // FALLACY DETECTION (Shared Function)
  // ============================================
  if (
    metadata.analysisResult?.fallacies &&
    metadata.analysisResult.fallacies.length > 0 &&
    options.includeFallacies
  ) {
    y = addFallacySection(doc, metadata.analysisResult.fallacies, y, { useVisualDesign });
  }

  // ============================================
  // FOUR-SIDES MODEL (Surface → Deep: konkreteste Analyse zuerst)
  // ============================================
  if (metadata.fourSides && options.includeMetadata) {
    y = addFourSidesSection(doc, metadata.fourSides, y, { useVisualDesign });
  }

  // ============================================
  // GFK ANALYSIS (Bedürfnis-Ebene)
  // ============================================
  if (metadata.gfk && options.includeMetadata) {
    y = addGFKSection(doc, metadata.gfk, y, { useVisualDesign });
  }

  // ============================================
  // COGNITIVE DISTORTIONS (tiefste Ebene: Denkmuster)
  // ============================================
  if (metadata.cognitive && options.includeMetadata) {
    y = addCognitiveSection(doc, metadata.cognitive, y, { useVisualDesign });
  }

  // ============================================
  // TOPIC CLASSIFICATION (Shared Function)
  // ============================================
  if (metadata.analysisResult?.topic && options.includeTopic) {
    y = addTopicSection(doc, metadata.analysisResult.topic, y, { useVisualDesign });
  }

  // ============================================
  // PERSONALIZED REFLECTION (Enrichment)
  // ============================================
  if (metadata.analysisResult?.enrichment && options.includeMetadata) {
    y = sharedAddSectionHeader(doc, "Personalisierte Reflexion", y, CACHED_COLORS.sectionReflection, useVisualDesign);

    if (useVisualDesign) {
      y = sharedAddBoxedSection(doc, [metadata.analysisResult.enrichment], y, CACHED_COLORS.blueTint, CACHED_COLORS.sectionReflection, useVisualDesign);
    } else {
      y = sharedAddText(doc, metadata.analysisResult.enrichment, y, config.typography.fontSize.body);
    }
  }

  // ============================================
  // FOOTER
  // ============================================
  y += config.spacing.betweenSections;
  // No checkPageBreak needed for footer (always fits)
  y = sharedAddText(
    doc,
    `Generiert mit Hablará • ${new Date().toLocaleDateString("de-DE")}`,
    y,
    config.typography.fontSize.caption
  );

  return doc.output("arraybuffer");
}

/**
 * Export a recording by ID as PDF
 *
 * @param recordingId - Recording ID from RecordingMetadata.id
 * @param options - Export options
 * @returns ExportResult with success status + filePath
 */
export async function exportRecordingAsPDF(
  recordingId: string,
  options: RecordingExportOptions = DEFAULT_RECORDING_EXPORT_OPTIONS
): Promise<RecordingExportResult> {
  try {
    // 1. Load RecordingMetadata from backend
    const recordings = await invoke<RecordingMetadata[]>("list_recordings");
    const metadata = recordings.find((r) => r.id === recordingId);

    if (!metadata) {
      logger.error("RecordingPDFExport", "Recording not found", { recordingId });
      return {
        success: false,
        error: "Aufnahme nicht gefunden",
      };
    }

    // 2. Validate minimal data (transcript is required)
    if (!metadata.transcription?.text || metadata.transcription.text.length === 0) {
      logger.warn("RecordingPDFExport", "Recording has no transcript", { recordingId });
      return {
        success: false,
        error: "Aufnahme hat kein Transkript",
      };
    }

    // 3. Generate PDF
    logger.info("RecordingPDFExport", "Generating PDF", { recordingId });
    const pdfArrayBuffer = generatePDFFromMetadata(metadata, options);

    // 4. Open save dialog
    const defaultFileName = `hablara-recording-${new Date(metadata.createdAt).toISOString().slice(0, 10)}-${metadata.id.slice(0, 8)}.pdf`;
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (!filePath) {
      logger.info("RecordingPDFExport", "User cancelled save dialog");
      return { success: false, cancelled: true };
    }

    // 5. Write PDF bytes to file
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    await writeFile(filePath, pdfBytes);

    logger.info("RecordingPDFExport", "PDF exported successfully", { filePath, recordingId });
    return { success: true, filePath };
  } catch (error) {
    logger.error("RecordingPDFExport", "Export failed", { recordingId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF-Export fehlgeschlagen",
    };
  }
}

/**
 * Export recording metadata directly (without loading from backend)
 * Useful for testing or when metadata is already available
 *
 * @param metadata - RecordingMetadata object
 * @param options - Export options
 * @returns ExportResult with success status + filePath
 */
export async function exportRecordingMetadataAsPDF(
  metadata: RecordingMetadata,
  options: RecordingExportOptions = DEFAULT_RECORDING_EXPORT_OPTIONS
): Promise<RecordingExportResult> {
  try {
    // Validate minimal data
    if (!metadata.transcription?.text || metadata.transcription.text.length === 0) {
      return {
        success: false,
        error: "Aufnahme hat kein Transkript",
      };
    }

    // Generate PDF
    const pdfArrayBuffer = generatePDFFromMetadata(metadata, options);

    // Open save dialog
    const defaultFileName = `hablara-recording-${new Date(metadata.createdAt).toISOString().slice(0, 10)}-${metadata.id.slice(0, 8)}.pdf`;
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (!filePath) {
      return { success: false, cancelled: true };
    }

    // Write PDF bytes
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    await writeFile(filePath, pdfBytes);

    return { success: true, filePath };
  } catch (error) {
    logger.error("RecordingPDFExport", "Export failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF-Export fehlgeschlagen",
    };
  }
}
