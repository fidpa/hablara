/**
 * Chat History Export Module
 *
 * Exports Chat-Verlauf in 4 Formaten: TXT, Markdown, PDF, DOCX.
 * Nutzt Tauri Dialog + FS APIs. Filename: "hablara-chat-YYYYMMDD-HHMMSS".
 */

import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { logger } from "@/lib/logger";
import { generateMarkdown } from "./markdown";
import { generatePlainText } from "./txt";
import { exportAsPDFWithJsPDF } from "./pdf";
import { exportAsDOCX } from "./docx";
import type { ChatMessage } from "@/lib/types";
import type { ExportFormat, ExportOptions, ExportResult } from "./types";

/**
 * Warn for large exports that may consume significant memory.
 * Threshold: 500 messages (~typical 50-day journal with 10 entries/day).
 */
const MAX_EXPORT_MESSAGES_WARNING = 500;

export async function exportChatHistory(
  messages: ChatMessage[],
  format: ExportFormat,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Handle empty message array
    if (messages.length === 0) {
      logger.warn('ChatExport', 'Export attempted with empty message array');
      return {
        success: false,
        error: "Keine Nachrichten zum Exportieren vorhanden",
      };
    }

    // Warn for large exports
    if (messages.length > MAX_EXPORT_MESSAGES_WARNING) {
      logger.warn('ChatExport', `Large export: ${messages.length} messages (may be slow)`, {
        format,
        messageCount: messages.length,
      });
    }

    // PDF: Direct generation with jsPDF
    if (format === "pdf") {
      return await exportAsPDFWithJsPDF(messages, options);
    }

    // DOCX: Microsoft Word document
    if (format === "docx") {
      return await exportAsDOCX(messages, options);
    }

    // HTML: Generate HTML file (fallback for blocked popup)
    if (format === "html") {
      const { generatePrintHTML } = await import("./pdf");
      const content = generatePrintHTML(messages, options);

      const filePath = await save({
        defaultPath: `hablara-sprachanalyse-${Date.now()}.html`,
        filters: [{ name: "HTML", extensions: ["html"] }],
      });

      if (!filePath) {
        return { success: false };
      }

      await writeTextFile(filePath, content);
      logger.info('ChatExport', 'Exported as HTML (fallback)', { filePath });

      return { success: true, filePath };
    }

    // Generate content (markdown or txt)
    const content = format === "markdown"
      ? generateMarkdown(messages, options)
      : generatePlainText(messages, options);

    // Open Tauri save dialog
    const extension = format === "markdown" ? "md" : "txt";
    const defaultFileName = `hablara-sprachanalyse-${Date.now()}.${extension}`;

    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{
        name: format === "markdown" ? "Markdown" : "Text",
        extensions: [extension],
      }],
    });

    // User cancelled (silent)
    if (!filePath) {
      return { success: false };
    }

    // Write file via Tauri FS
    await writeTextFile(filePath, content);

    logger.info('ChatExport', `Exported as ${format}`, { filePath });

    return { success: true, filePath };
  } catch (error) {
    logger.error('ChatExport', `Export failed: ${format}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export fehlgeschlagen",
    };
  }
}

// Re-export types
export type { ExportFormat, ExportOptions, ExportResult };
export { DEFAULT_EXPORT_OPTIONS } from "./types";
