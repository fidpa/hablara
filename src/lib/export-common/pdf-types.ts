/**
 * Shared PDF Export Types
 *
 * Type definitions used across PDF export modules (recording, chat).
 */

import type jsPDF from "jspdf";
import type { PDFRecordingConfig } from "./pdf-colors";

/**
 * PDF Context passed to section renderers
 */
export interface PDFContext {
  doc: jsPDF;
  config: PDFRecordingConfig;
  y: number;
  useVisualDesign: boolean;
}

/**
 * Options for section rendering
 */
export interface PDFSectionOptions {
  useVisualDesign?: boolean;
}

/**
 * Result from section rendering (returns updated y position)
 */
export type PDFSectionResult = number;
