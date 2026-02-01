/**
 * Recording PDF Export Module
 *
 * Re-exports main functions for recording PDF export.
 */

export {
  exportRecordingAsPDF,
  exportRecordingMetadataAsPDF,
  generatePDFFromMetadata,
} from "./pdf";

export type {
  RecordingExportOptions,
  RecordingExportResult,
} from "./types";

export {
  DEFAULT_RECORDING_EXPORT_OPTIONS,
} from "./types";

export { PDF_RECORDING_CONFIG } from "./config";
