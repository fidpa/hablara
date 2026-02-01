/**
 * PDF Export Generator
 *
 * Nutzt jsPDF für PDF-Generierung. A4 Format, Roboto Font (fallback Arial), Word-Wrap.
 * Config via PDF_EXPORT_CONFIG (Dynamic Values Pattern). HTML-Escaping für sichere Rendering.
 *
 * PDF Export (jsPDF) uses shared formatting utilities from @/lib/export-common for professional styling.
 */

import type { ChatMessage } from "@/lib/types";
import type { ExportOptions, ExportResult } from "./types";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { logger } from "@/lib/logger";
import jsPDF from "jspdf";
import { PDF_EXPORT_CONFIG } from "./config";

// Shared PDF utilities
import {
  addGFKSection,
  addCognitiveSection,
  addFourSidesSection,
  addAudioFeaturesSection,
} from "@/lib/export-common";
import { chatMessageToRecordingMetadata } from "@/lib/adapters";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}

export function generatePrintHTML(
  messages: ChatMessage[],
  options: ExportOptions
): string {
  const lines: string[] = [];

  // HTML Header
  lines.push("<!DOCTYPE html>");
  lines.push('<html lang="de">');
  lines.push("<head>");
  lines.push('<meta charset="UTF-8">');
  lines.push("<title>Hablará Sprachanalyse</title>");
  lines.push("<style>");
  lines.push(`
    @media print {
      @page {
        margin: 2cm;
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #000;
      }
      .message {
        page-break-inside: avoid;
        margin-bottom: 1.5em;
        border-bottom: 1px solid #ccc;
        padding-bottom: 1em;
      }
      .message-header {
        font-weight: bold;
        margin-bottom: 0.5em;
      }
      .metadata {
        font-size: 9pt;
        color: #555;
        margin-top: 0.5em;
      }
      .metadata-section {
        margin-top: 0.8em;
        padding-left: 1em;
      }
      .metadata-title {
        font-weight: bold;
        text-decoration: underline;
      }
      ul {
        margin: 0.3em 0;
        padding-left: 1.5em;
      }
      h1 {
        font-size: 18pt;
        border-bottom: 2px solid #000;
        padding-bottom: 0.3em;
      }
      h2 {
        font-size: 14pt;
        margin-top: 1em;
      }
    }
    @media screen {
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 2em auto;
        padding: 0 2em;
      }
      .message {
        margin-bottom: 2em;
        border-bottom: 1px solid #ddd;
        padding-bottom: 1em;
      }
      .message-header {
        font-weight: bold;
        margin-bottom: 0.5em;
      }
      .metadata {
        color: #666;
        margin-top: 1em;
      }
      .metadata-section {
        margin-top: 1em;
        padding-left: 1em;
      }
      .metadata-title {
        font-weight: bold;
      }
      h1 {
        border-bottom: 2px solid #333;
        padding-bottom: 0.5em;
      }
      h2 {
        margin-top: 1.5em;
      }
    }
  `);
  lines.push("</style>");
  lines.push("</head>");
  lines.push("<body>");

  // Header
  lines.push("<h1>Hablará Sprachanalyse</h1>");
  lines.push(`<p><strong>Exportiert:</strong> ${new Date().toLocaleString("de-DE")}</p>`);
  lines.push(`<p><strong>Nachrichten:</strong> ${messages.length}</p>`);

  // Messages
  messages.forEach((msg, idx) => {
    lines.push('<div class="message">');

    // Message header
    lines.push(`<h2>Nachricht ${idx + 1}</h2>`);

    // Timestamp
    if (options.includeTimestamps) {
      const timestamp = new Date(msg.timestamp).toLocaleString("de-DE");
      lines.push(`<p><strong>Zeitstempel:</strong> ${timestamp}</p>`);
    }

    // Role and source
    const role = msg.role === "user" ? "Benutzer" : "Hablará";
    lines.push(`<p><strong>Rolle:</strong> ${role}</p>`);

    if (msg.role === "user" && msg.source) {
      const source = msg.source === "voice" ? "Sprachaufnahme" :
                     msg.source === "text" ? "Text-Import" :
                     msg.source === "rag" ? "RAG-Chatbot" : "Unbekannt";
      lines.push(`<p><strong>Quelle:</strong> ${source}</p>`);
    }

    // Content
    lines.push("<p><strong>Inhalt:</strong></p>");
    lines.push(`<p>${escapeHtml(msg.content)}</p>`);

    // Simplified metadata (space-constrained for print)
    if (options.includeMetadata) {
      lines.push('<div class="metadata">');

      // GFK - simplified
      if (msg.gfk) {
        const hasFeelings = Array.isArray(msg.gfk.feelings) && msg.gfk.feelings.length > 0;
        const hasNeeds = Array.isArray(msg.gfk.needs) && msg.gfk.needs.length > 0;

        if (hasFeelings || hasNeeds) {
          lines.push('<div class="metadata-section">');
          lines.push('<p class="metadata-title">GFK-Analyse:</p>');

          if (hasFeelings) {
            lines.push(`<p><em>Gefühle:</em> ${escapeHtml(msg.gfk.feelings.join(", "))}</p>`);
          }

          if (hasNeeds) {
            lines.push(`<p><em>Bedürfnisse:</em> ${escapeHtml(msg.gfk.needs.join(", "))}</p>`);
          }

          lines.push("</div>");
        }
      }

      // Cognitive - simplified
      if (msg.cognitive) {
        lines.push('<div class="metadata-section">');
        lines.push('<p class="metadata-title">Kognitive Verzerrungen:</p>');
        lines.push(`<p><em>Denkstil:</em> ${escapeHtml(msg.cognitive.overallThinkingStyle)}</p>`);

        if (Array.isArray(msg.cognitive.distortions) && msg.cognitive.distortions.length > 0) {
          lines.push("<ul>");
          msg.cognitive.distortions.forEach(d => {
            lines.push(`<li>${escapeHtml(d.type)}</li>`);
          });
          lines.push("</ul>");
        }

        lines.push("</div>");
      }

      // Four Sides - very simplified
      if (msg.fourSides) {
        lines.push('<div class="metadata-section">');
        lines.push('<p class="metadata-title">Vier-Seiten-Modell:</p>');
        lines.push(`<p><em>Sachinhalt:</em> ${escapeHtml(msg.fourSides.sachinhalt)}</p>`);
        lines.push(`<p><em>Appell:</em> ${escapeHtml(msg.fourSides.appell)}</p>`);
        lines.push("</div>");
      }

      lines.push("</div>"); // Close metadata
    }

    lines.push("</div>"); // Close message
  });

  lines.push("</body>");
  lines.push("</html>");

  return lines.join("\n");
}

export async function exportAsPDFWithJsPDF(
  messages: ChatMessage[],
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const doc = new jsPDF({
      orientation: PDF_EXPORT_CONFIG.page.orientation,
      unit: PDF_EXPORT_CONFIG.page.unit,
      format: PDF_EXPORT_CONFIG.page.format,
    });
    let y: number = PDF_EXPORT_CONFIG.layout.marginTop;

    // Helper: Page break check
    const checkPageBreak = (height: number): void => {
      if (y + height > PDF_EXPORT_CONFIG.layout.maxY) {
        doc.addPage();
        y = PDF_EXPORT_CONFIG.layout.marginTop;
      }
    };

    // Helper: Add wrapped text with error handling
    const addText = (text: string, size: number, bold = false): void => {
      try {
        doc.setFontSize(size);
        doc.setFont(
          PDF_EXPORT_CONFIG.typography.font.family,
          bold ? PDF_EXPORT_CONFIG.typography.font.styleBold : PDF_EXPORT_CONFIG.typography.font.styleNormal
        );
        const lines = doc.splitTextToSize(text, PDF_EXPORT_CONFIG.layout.maxContentWidth);

        // Validate splitTextToSize result
        if (!Array.isArray(lines) || lines.length === 0) {
          logger.warn("ChatExport", "splitTextToSize returned invalid result", { text });
          return;
        }

        checkPageBreak(lines.length * PDF_EXPORT_CONFIG.typography.lineHeight);
        doc.text(lines, PDF_EXPORT_CONFIG.layout.marginLeft, y);
        y += lines.length * PDF_EXPORT_CONFIG.typography.lineHeight;
      } catch (error) {
        logger.error("ChatExport", "Failed to add text to PDF", { text, size, error });
        // Continue with next element instead of failing entire export
      }
    };

    // Header
    addText("Hablará Sprachanalyse", PDF_EXPORT_CONFIG.typography.fontSize.title, true);
    y += PDF_EXPORT_CONFIG.spacing.afterHeader / 2;
    addText(`Exportiert: ${new Date().toLocaleString("de-DE")}`, PDF_EXPORT_CONFIG.typography.fontSize.body);
    addText(`Nachrichten: ${messages.length}`, PDF_EXPORT_CONFIG.typography.fontSize.body);
    y += PDF_EXPORT_CONFIG.spacing.afterHeader;

    // Messages
    messages.forEach((msg, idx) => {
      checkPageBreak(25);

      addText(`Nachricht ${idx + 1}`, PDF_EXPORT_CONFIG.typography.fontSize.subtitle, true);

      if (options.includeTimestamps) {
        addText(
          `Zeit: ${new Date(msg.timestamp).toLocaleString("de-DE")}`,
          PDF_EXPORT_CONFIG.typography.fontSize.caption
        );
      }

      const role = msg.role === "user" ? "Benutzer" : "Hablará";
      addText(`Rolle: ${role}`, PDF_EXPORT_CONFIG.typography.fontSize.body);

      if (msg.role === "user" && msg.source) {
        const sourceMap: Record<string, string> = {
          voice: "Sprachaufnahme",
          text: "Text-Import",
          rag: "RAG-Chatbot",
        };
        addText(
          `Quelle: ${sourceMap[msg.source] || "Unbekannt"}`,
          PDF_EXPORT_CONFIG.typography.fontSize.caption
        );
      }

      y += PDF_EXPORT_CONFIG.spacing.beforeMetadata;
      addText(msg.content, PDF_EXPORT_CONFIG.typography.fontSize.body);

      // Metadata (formatted - using shared functions)
      // NOTE: ChatMessage only has GFK, cognitive, fourSides, audioFeatures
      // Emotion and Tone are NOT available in ChatMessage
      if (options.includeMetadata) {
        const adapted = chatMessageToRecordingMetadata(msg, idx);

        // Four-Sides Model (Surface → Deep Progression: konkreteste Analyse zuerst)
        if (adapted.fourSides) {
          y = addFourSidesSection(doc, adapted.fourSides, y, { useVisualDesign: true });
        }

        // GFK Analysis (Bedürfnis-Ebene)
        if (adapted.gfk) {
          y = addGFKSection(doc, adapted.gfk, y, { useVisualDesign: true });
        }

        // Cognitive Distortions (tiefste Ebene: Denkmuster)
        if (adapted.cognitive) {
          y = addCognitiveSection(doc, adapted.cognitive, y, { useVisualDesign: true });
        }

        // Audio Features (if present)
        if (options.includeAudioFeatures && msg.audioFeatures) {
          y = addAudioFeaturesSection(doc, msg.audioFeatures, y, { useVisualDesign: true });
        }
      }

      y += PDF_EXPORT_CONFIG.spacing.betweenMessages;
    });

    // Save dialog
    const filePath = await save({
      defaultPath: `hablara-sprachanalyse-${Date.now()}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (!filePath) {
      logger.info("ChatExport", "User cancelled PDF export");
      return { success: false, cancelled: true };
    }

    // Write PDF bytes
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    await writeFile(filePath, pdfBytes);

    logger.info("ChatExport", "PDF exported", { filePath });
    return { success: true, filePath };
  } catch (error) {
    logger.error("ChatExport", "PDF export failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF-Export fehlgeschlagen",
    };
  }
}
