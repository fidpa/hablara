/**
 * Recording PDF Export Types
 *
 * Types for exporting individual recording analyses as PDF.
 * Based on export-chat/types.ts with adaptations for RecordingMetadata.
 */

/**
 * Options controlling what content is included in the recording export
 */
export interface RecordingExportOptions {
  /** Include GFK, cognitive distortions, four-sides, tone analysis */
  includeMetadata: boolean;
  /** Include audio features (pitch, energy, speech rate) */
  includeAudioFeatures: boolean;
  /** Include timestamps (creation date, duration) */
  includeTimestamps: boolean;
  /** Include fallacy detection results */
  includeFallacies: boolean;
  /** Include topic classification */
  includeTopic: boolean;
  /**
   * Use enhanced visual design (colored borders, badges, boxes, progress bars)
   * @default true
   */
  useVisualDesign?: boolean;
}

/**
 * Default export options (all features enabled)
 */
export const DEFAULT_RECORDING_EXPORT_OPTIONS: RecordingExportOptions = {
  includeMetadata: true,
  includeAudioFeatures: true,
  includeTimestamps: true,
  includeFallacies: true,
  includeTopic: true,
  useVisualDesign: true,
};

/**
 * Result of a recording export operation
 */
export interface RecordingExportResult {
  /** Whether the export succeeded */
  success: boolean;
  /** File path where PDF was saved */
  filePath?: string;
  /** Error message if export failed */
  error?: string;
  /** Whether user cancelled the file dialog (no error, silent) */
  cancelled?: boolean;
}
