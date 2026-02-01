/**
 * PDF Formatting Helpers
 *
 * Shared utility functions for PDF generation with jsPDF.
 * Extracted from export-recording/pdf.ts for code reuse.
 */

import type jsPDF from "jspdf";
import { logger } from "@/lib/logger";
import { PDF_RECORDING_CONFIG, CACHED_COLORS, hexToRgb, PDF_COLOR_PALETTE } from "./pdf-colors";
import { TONE_DIMENSIONS } from "@/lib/types";

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get tone label based on value (1-5)
 */
export function getToneLabel(value: number, dimension: keyof typeof TONE_DIMENSIONS): string {
  const info = TONE_DIMENSIONS[dimension];
  if (value <= 2) return info.lowLabel;
  if (value >= 4) return info.highLabel;
  return "Neutral";
}

/**
 * Check page break and add new page if needed
 */
export function checkPageBreak(doc: jsPDF, y: number, height: number): number {
  const config = PDF_RECORDING_CONFIG;
  if (y + height > config.layout.maxY) {
    doc.addPage();
    return config.layout.marginTop;
  }
  return y;
}

/**
 * Render text with line-by-line pagination
 *
 * Prevents page overflow by checking BEFORE each line, not once for all lines.
 * If 5 lines but page fits only 3, renders 3 then starts new page for remaining 2.
 *
 * @param doc - jsPDF instance
 * @param lines - Pre-wrapped text lines (from splitTextToSize)
 * @param startY - Starting y position
 * @param options - Font size, bold, indent
 * @returns Final y position after all lines rendered
 */
export function renderTextWithPagination(
  doc: jsPDF,
  lines: string[],
  startY: number,
  options: { size: number; bold?: boolean; indent?: number }
): number {
  const config = PDF_RECORDING_CONFIG;
  let currentY = startY;

  doc.setFontSize(options.size);
  doc.setFont(
    config.typography.font.family,
    options.bold ? config.typography.font.styleBold : config.typography.font.styleNormal
  );

  for (const line of lines) {
    // Check BEFORE each line
    if (currentY + config.typography.lineHeight > config.layout.maxY) {
      doc.addPage();
      currentY = config.layout.marginTop;
    }
    doc.text(line, config.layout.marginLeft + (options.indent ?? 0), currentY);
    currentY += config.typography.lineHeight;
  }

  return currentY;
}

/**
 * Add text with wrapping and error handling
 *
 * @param doc - jsPDF instance
 * @param text - Text to add
 * @param y - Current y position
 * @param size - Font size
 * @param bold - Use bold font
 * @param indent - Left indent in mm
 * @returns Updated y position
 */
export function addText(
  doc: jsPDF,
  text: string,
  y: number,
  size: number,
  bold = false,
  indent = 0
): number {
  const config = PDF_RECORDING_CONFIG;

  try {
    const maxWidth = config.layout.maxContentWidth - indent;
    const lines = doc.splitTextToSize(text, maxWidth);

    if (!Array.isArray(lines) || lines.length === 0) {
      logger.warn("PDFFormatting", "splitTextToSize returned invalid result", { text });
      return y;
    }

    // Use line-by-line pagination instead of single pre-check
    return renderTextWithPagination(doc, lines, y, { size, bold, indent });
  } catch (error) {
    logger.error("PDFFormatting", "Failed to add text to PDF", { text, size, error });
    return y;
  }
}

/**
 * Add section header (with optional colored border)
 *
 * @param doc - jsPDF instance
 * @param title - Section title
 * @param y - Current y position
 * @param color - Optional RGB color for border and text
 * @param useVisualDesign - Enable visual styling
 * @returns Updated y position
 */
export function addSectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  color?: { r: number; g: number; b: number },
  useVisualDesign = true
): number {
  const config = PDF_RECORDING_CONFIG;
  let currentY = checkPageBreak(doc, y, 20);
  currentY += config.spacing.beforeSectionHeader;

  // Colored top border (visual design)
  if (useVisualDesign && color) {
    try {
      doc.setDrawColor(color.r, color.g, color.b);
      doc.setLineWidth(config.visual.sectionBorder.width);
      doc.line(
        config.layout.marginLeft,
        currentY - config.visual.sectionBorder.offset,
        config.layout.marginLeft + config.layout.maxContentWidth,
        currentY - config.visual.sectionBorder.offset
      );
    } catch (error) {
      logger.warn('PDFFormatting', 'Section border rendering failed', error);
    }
  }

  // Colored title (visual design)
  if (useVisualDesign && color) {
    try {
      doc.setTextColor(color.r, color.g, color.b);
      currentY = addText(doc, title, currentY, config.typography.fontSize.sectionHeader, true);
      doc.setTextColor(0, 0, 0); // Reset to black
    } catch (error) {
      logger.warn('PDFFormatting', 'Colored title rendering failed', error);
      currentY = addText(doc, title, currentY, config.typography.fontSize.sectionHeader, true);
    }
  } else {
    // Fallback: text-only
    currentY = addText(doc, title, currentY, config.typography.fontSize.sectionHeader, true);
  }

  currentY += config.spacing.afterSectionHeader;
  return currentY;
}

/**
 * Add subsection header
 *
 * @param doc - jsPDF instance
 * @param title - Subsection title
 * @param y - Current y position
 * @returns Updated y position
 */
export function addSubsectionHeader(doc: jsPDF, title: string, y: number): number {
  const config = PDF_RECORDING_CONFIG;
  let currentY = checkPageBreak(doc, y, 10);
  currentY += config.spacing.beforeSubsectionHeader;  // Space before subsection header
  currentY = addText(doc, title, currentY, config.typography.fontSize.subsectionHeader, true);
  currentY += config.spacing.afterSubsectionHeader;   // Small space after header (closer to content)
  return currentY;
}

/**
 * Add badge (rounded rectangle with colored background)
 *
 * @param doc - jsPDF instance
 * @param text - Badge text
 * @param color - RGB color for background
 * @param x - X position
 * @param y - Y position
 * @param useVisualDesign - Enable visual styling
 * @returns Badge width (including padding)
 */
export function addBadge(
  doc: jsPDF,
  text: string,
  color: { r: number; g: number; b: number },
  x: number,
  y: number,
  useVisualDesign = true
): number {
  const config = PDF_RECORDING_CONFIG;

  if (!useVisualDesign) {
    // Fallback: plain text
    doc.setFontSize(config.typography.fontSize.small);
    doc.text(text, x, y + 3.5);
    return doc.getTextWidth(text) + 2;
  }

  try {
    doc.setFontSize(config.typography.fontSize.small);
    doc.setFont(config.typography.font.family, config.typography.font.styleBold);
    const textWidth = doc.getTextWidth(text);

    const badgeWidth = textWidth + (config.visual.badge.padding * 2);
    const badgeHeight = config.visual.badge.height;
    const cornerRadius = config.visual.badge.cornerRadius;

    // Draw rounded rectangle
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x, y, badgeWidth, badgeHeight, cornerRadius, cornerRadius, 'F');

    // White text on colored background
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + config.visual.badge.padding, y + 3.5);
    doc.setTextColor(0, 0, 0);

    return badgeWidth + 2; // Badge width + gap
  } catch (error) {
    logger.error('PDFFormatting', 'Badge rendering failed', error);
    doc.setTextColor(0, 0, 0);
    doc.text(text, x, y + 3.5);
    return doc.getTextWidth(text) + 2;
  }
}

/**
 * Add boxed section (content with colored left border)
 *
 * @param doc - jsPDF instance
 * @param content - Content lines
 * @param y - Current y position
 * @param backgroundColor - RGB background color
 * @param borderColor - Optional RGB border color
 * @param useVisualDesign - Enable visual styling
 * @returns Updated y position
 */
export function addBoxedSection(
  doc: jsPDF,
  content: string[],
  y: number,
  backgroundColor: { r: number; g: number; b: number },
  borderColor?: { r: number; g: number; b: number },
  useVisualDesign = true
): number {
  const config = PDF_RECORDING_CONFIG;

  if (!useVisualDesign) {
    // Fallback: plain text
    let currentY = y;
    for (const line of content) {
      currentY = addText(doc, line, currentY, config.typography.fontSize.body);
    }
    return currentY;
  }

  try {
    const verticalPadding = config.visual.box.padding.top + config.visual.box.padding.bottom;
    const maxWidth = config.layout.maxContentWidth - config.visual.box.padding.left - config.visual.box.padding.right;

    // PRE-WRAP all content to calculate TRUE height
    const allWrappedLines: string[] = [];
    for (const line of content) {
      if (!line) continue;
      const wrapped = doc.splitTextToSize(line, maxWidth);
      allWrappedLines.push(...wrapped);
    }

    const trueContentHeight = allWrappedLines.length * config.typography.lineHeight;
    const trueBoxHeight = trueContentHeight + verticalPadding;

    // Check page break with TRUE height
    const currentY = checkPageBreak(doc, y, trueBoxHeight);

    // Render box with TRUE dimensions
    const boxY = currentY;
    const boxX = config.layout.marginLeft;
    const boxWidth = config.layout.maxContentWidth;

    doc.setFillColor(backgroundColor.r, backgroundColor.g, backgroundColor.b);
    doc.rect(boxX, boxY, boxWidth, trueBoxHeight, 'F');

    if (borderColor) {
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(config.visual.box.borderWidth);
      doc.line(boxX, boxY, boxX, boxY + trueBoxHeight);
    }

    // Render wrapped lines inside box
    const textStartY = boxY + config.visual.box.padding.top + config.typography.lineHeight * 0.8;
    doc.setFontSize(config.typography.fontSize.body);
    doc.setFont(config.typography.font.family, config.typography.font.styleNormal);

    let lineY = textStartY;
    for (const line of allWrappedLines) {
      doc.text(line, boxX + config.visual.box.padding.left, lineY);
      lineY += config.typography.lineHeight;
    }

    return boxY + trueBoxHeight;
  } catch (error) {
    logger.error('PDFFormatting', 'Boxed section failed', error);
    let currentY = y;
    for (const line of content) {
      currentY = addText(doc, line, currentY, config.typography.fontSize.body);
    }
    return currentY;
  }
}

/**
 * Add progress bar (horizontal bar with colored fill)
 *
 * @param doc - jsPDF instance
 * @param value - Progress value (1-5)
 * @param label - Label text
 * @param color - RGB color for fill
 * @param y - Current y position
 * @param useVisualDesign - Enable visual styling
 * @returns Updated y position
 */
export function addProgressBar(
  doc: jsPDF,
  value: number,
  label: string,
  color: { r: number; g: number; b: number },
  y: number,
  useVisualDesign = true
): number {
  const config = PDF_RECORDING_CONFIG;

  if (!useVisualDesign) {
    // Fallback: text-only
    return addText(doc, `${label}: ${value}/5`, y, config.typography.fontSize.small);
  }

  try {
    const currentY = checkPageBreak(doc, y, 8);

    const barY = currentY;
    const barX = config.layout.marginLeft;
    const maxBarWidth = config.visual.progressBar.width;
    const barHeight = config.visual.progressBar.height;

    // Label
    doc.setFontSize(config.typography.fontSize.small);
    doc.text(label, barX, barY + 3);
    const labelWidth = doc.getTextWidth(label) + 2;

    // Background bar (gray)
    const grayBg = hexToRgb(PDF_COLOR_PALETTE.utility.lightGray);
    doc.setFillColor(grayBg.r, grayBg.g, grayBg.b);
    doc.rect(barX + labelWidth, barY, maxBarWidth, barHeight, 'F');

    // Filled bar (colored)
    const fillWidth = (value / 5) * maxBarWidth;
    doc.setFillColor(color.r, color.g, color.b);
    doc.rect(barX + labelWidth, barY, fillWidth, barHeight, 'F');

    // Value text
    doc.setTextColor(0, 0, 0);
    doc.text(`${value}/5`, barX + labelWidth + maxBarWidth + 2, barY + 3);

    return barY + barHeight + config.spacing.afterProgressBar;
  } catch (error) {
    logger.error('PDFFormatting', 'Progress bar failed', error);
    return addText(doc, `${label}: ${value}/5`, y, config.typography.fontSize.small);
  }
}

/**
 * Add bullet list (with optional colored bullets)
 *
 * @param doc - jsPDF instance
 * @param items - List items
 * @param y - Current y position
 * @param bulletColor - Optional RGB color for bullets
 * @param useVisualDesign - Enable visual styling
 * @returns Updated y position
 */
export function addBulletList(
  doc: jsPDF,
  items: string[],
  y: number,
  bulletColor?: { r: number; g: number; b: number },
  useVisualDesign = true
): number {
  const config = PDF_RECORDING_CONFIG;
  let currentY = y + config.spacing.beforeList;

  for (const item of items) {
    // Pre-wrap to know actual line count
    const maxWidth = config.layout.maxContentWidth - config.spacing.listItemIndent;
    const wrappedLines = doc.splitTextToSize(item, maxWidth);
    const itemHeight = wrappedLines.length * config.typography.lineHeight;

    // Check if ENTIRE item fits, or move to next page
    // Cap at 3 lines to avoid splitting very long items unnecessarily
    currentY = checkPageBreak(doc, currentY, Math.min(itemHeight, config.typography.lineHeight * 3));

    // Draw bullet at FINAL position (after page break check)
    if (useVisualDesign && bulletColor) {
      try {
        doc.setFillColor(bulletColor.r, bulletColor.g, bulletColor.b);
        doc.circle(
          config.layout.marginLeft + config.spacing.listItemIndent - 2,
          currentY - 1.8,  // Better vertical centering with 9pt text x-height
          0.5,
          'F'
        );
      } catch (error) {
        logger.warn('PDFFormatting', 'Bullet rendering failed', error);
      }
    }

    // Use text bullet only when no colored circle is drawn
    const bulletPrefix = useVisualDesign && bulletColor ? "" : "• ";
    currentY = addText(
      doc,
      `${bulletPrefix}${item}`,
      currentY,
      config.typography.fontSize.body,
      false,
      config.spacing.listItemIndent
    );
  }

  // Reset fill color
  if (useVisualDesign && bulletColor) {
    doc.setFillColor(0, 0, 0);
  }

  return currentY;
}
