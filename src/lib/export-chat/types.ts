// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ChatMessage } from "@/lib/types";

/**
 * Supported export formats for chat history
 * - markdown: Rich text with YAML frontmatter and full metadata
 * - txt: Plain ASCII text with simplified metadata
 * - pdf: Browser print dialog for save-as-PDF
 * - html: HTML file (fallback when popup blocker prevents PDF)
 * - docx: Microsoft Word document with rich formatting
 */
export type ExportFormat = "markdown" | "txt" | "pdf" | "html" | "docx";

/**
 * Options controlling what content is included in the export
 */
export interface ExportOptions {
  /** Include GFK, cognitive distortions, and four-sides analysis */
  includeMetadata: boolean;
  /** Include audio features (pitch, energy, speech rate) for voice messages */
  includeAudioFeatures: boolean;
  /** Include timestamps (date/time) for each message */
  includeTimestamps: boolean;
}

/**
 * Default export options (all features enabled)
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeMetadata: true,
  includeAudioFeatures: true,
  includeTimestamps: true,
};

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Whether the export succeeded */
  success: boolean;
  /** File path where content was saved (Markdown/TXT/PDF) */
  filePath?: string;
  /** Error message if export failed */
  error?: string;
  /** Whether user cancelled the operation (no error, silent) */
  cancelled?: boolean;
}
