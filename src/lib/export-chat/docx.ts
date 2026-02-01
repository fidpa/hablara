/**
 * DOCX Export for Hablará Chat History
 *
 * Document structure pattern based on [thewh1teagle/vibe](https://github.com/thewh1teagle/vibe) (MIT License).
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { logger } from "@/lib/logger";
import type { ChatMessage } from "@/lib/types";
import type { ExportOptions, ExportResult } from "./types";
import { DOCX_EXPORT_CONFIG } from "./config";

/**
 * Export chat history as DOCX file
 */
export async function exportAsDOCX(
  messages: ChatMessage[],
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const sections: Paragraph[] = [];

    // Title section
    sections.push(...createTitleSection(messages.length));

    // Messages
    messages.forEach((msg, idx) => {
      sections.push(...createMessageParagraphs(msg, idx + 1, options));
    });

    // Create document
    const doc = new Document({
      creator: DOCX_EXPORT_CONFIG.document.creator,
      title: DOCX_EXPORT_CONFIG.document.title,
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Save dialog
    const filePath = await save({
      defaultPath: `hablara-sprachanalyse-${Date.now()}.docx`,
      filters: [{ name: "Word Document", extensions: ["docx"] }],
    });

    if (!filePath) {
      logger.info("ChatExport", "User cancelled DOCX export");
      return { success: false, cancelled: true };
    }

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    await writeFile(filePath, new Uint8Array(buffer));

    logger.info("ChatExport", "DOCX exported", { filePath });
    return { success: true, filePath };
  } catch (error) {
    logger.error("ChatExport", "DOCX export failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "DOCX-Export fehlgeschlagen",
    };
  }
}

/**
 * Create title section with metadata
 */
function createTitleSection(messageCount: number): Paragraph[] {
  const { typography, colors, spacing } = DOCX_EXPORT_CONFIG;

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: spacing.afterTitle },
      children: [
        new TextRun({
          text: DOCX_EXPORT_CONFIG.document.title,
          bold: true,
          size: typography.fontSize.title,
          color: colors.userHeader,
          font: typography.font.family,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exportiert: ${new Date().toLocaleString("de-DE")}`,
          size: typography.fontSize.caption,
          color: colors.muted,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Nachrichten: ${messageCount}`,
          size: typography.fontSize.caption,
          color: colors.muted,
          font: typography.font.family,
        }),
      ],
      spacing: { after: spacing.betweenMessages },
    }),
  ];
}

/**
 * Create paragraphs for a single message
 */
function createMessageParagraphs(
  msg: ChatMessage,
  index: number,
  options: ExportOptions
): Paragraph[] {
  const { typography, colors, spacing } = DOCX_EXPORT_CONFIG;
  const paragraphs: Paragraph[] = [];

  // Message header
  const role = msg.role === "user" ? "Benutzer" : "Hablará";
  const headerColor = msg.role === "user" ? colors.userHeader : colors.assistantHeader;

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Nachricht ${index} - ${role}`,
          bold: true,
          size: typography.fontSize.heading,
          color: headerColor,
          font: typography.font.family,
        }),
      ],
      spacing: { before: spacing.betweenMessages, after: spacing.beforeMetadata },
    })
  );

  // Timestamp
  if (options.includeTimestamps) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Zeitstempel: ${new Date(msg.timestamp).toLocaleString("de-DE")}`,
            size: typography.fontSize.caption,
            color: colors.muted,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  // Source (for user messages)
  if (msg.role === "user" && msg.source) {
    const sourceMap: Record<string, string> = {
      voice: "Sprachaufnahme",
      text: "Text-Import",
      rag: "RAG-Chatbot",
    };
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Quelle: ${sourceMap[msg.source] || "Unbekannt"}`,
            size: typography.fontSize.caption,
            color: colors.muted,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  // Content
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: msg.content,
          size: typography.fontSize.body,
          font: typography.font.family,
        }),
      ],
      spacing: { after: spacing.beforeMetadata },
    })
  );

  // Audio features (for voice messages)
  if (options.includeAudioFeatures && msg.audioFeatures) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Audio: Tonhöhe ${msg.audioFeatures.pitch.toFixed(1)}Hz, Energie ${msg.audioFeatures.energy.toFixed(2)}, Sprechrate ${msg.audioFeatures.speechRate.toFixed(2)}`,
            size: typography.fontSize.caption,
            color: colors.muted,
            font: typography.font.family,
            italics: true,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  // Metadata
  if (options.includeMetadata) {
    if (msg.gfk) {
      paragraphs.push(...createGFKSection(msg.gfk));
    }
    if (msg.cognitive) {
      paragraphs.push(...createCognitiveSection(msg.cognitive));
    }
    if (msg.fourSides) {
      paragraphs.push(...createFourSidesSection(msg.fourSides));
    }
  }

  // Separator
  paragraphs.push(createSeparator());

  return paragraphs;
}

/**
 * Create GFK analysis section
 */
function createGFKSection(gfk: NonNullable<ChatMessage["gfk"]>): Paragraph[] {
  const { typography, colors } = DOCX_EXPORT_CONFIG;
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "GFK-Analyse (Gewaltfreie Kommunikation)",
          bold: true,
          size: typography.fontSize.subtitle,
          color: colors.gfkObservations,
          font: typography.font.family,
        }),
      ],
      spacing: { before: 200, after: 100 },
    })
  );

  // Observations
  if (gfk.observations.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Beobachtungen: ",
            bold: true,
            size: typography.fontSize.caption,
            color: colors.gfkObservations,
            font: typography.font.family,
          }),
          new TextRun({
            text: gfk.observations.join(", "),
            size: typography.fontSize.caption,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  // Feelings
  if (gfk.feelings.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Gefühle: ",
            bold: true,
            size: typography.fontSize.caption,
            color: colors.gfkFeelings,
            font: typography.font.family,
          }),
          new TextRun({
            text: gfk.feelings.join(", "),
            size: typography.fontSize.caption,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  // Needs
  if (gfk.needs.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Bedürfnisse: ",
            bold: true,
            size: typography.fontSize.caption,
            color: colors.gfkNeeds,
            font: typography.font.family,
          }),
          new TextRun({
            text: gfk.needs.join(", "),
            size: typography.fontSize.caption,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  // Requests
  if (gfk.requests.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Bitten: ",
            bold: true,
            size: typography.fontSize.caption,
            color: colors.gfkRequests,
            font: typography.font.family,
          }),
          new TextRun({
            text: gfk.requests.join(", "),
            size: typography.fontSize.caption,
            font: typography.font.family,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  return paragraphs;
}

/**
 * Create cognitive distortion section
 */
function createCognitiveSection(cognitive: NonNullable<ChatMessage["cognitive"]>): Paragraph[] {
  const { typography, colors } = DOCX_EXPORT_CONFIG;
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Kognitive Verzerrungen",
          bold: true,
          size: typography.fontSize.subtitle,
          font: typography.font.family,
        }),
      ],
      spacing: { before: 200, after: 100 },
    })
  );

  // Thinking style
  const styleColorMap = {
    balanced: colors.cognitiveBalanced,
    somewhat_distorted: colors.cognitiveSomewhat,
    highly_distorted: colors.cognitiveHighly,
  };
  const styleColor = styleColorMap[cognitive.overallThinkingStyle] || colors.muted;

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Denkstil: ${cognitive.overallThinkingStyle}`,
          bold: true,
          size: typography.fontSize.caption,
          color: styleColor,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  // Distortions
  if (cognitive.distortions.length > 0) {
    cognitive.distortions.forEach(d => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${d.type}: `,
              bold: true,
              size: typography.fontSize.caption,
              font: typography.font.family,
            }),
            new TextRun({
              text: d.explanation,
              size: typography.fontSize.caption,
              font: typography.font.family,
            }),
          ],
          spacing: { after: 50 },
        })
      );
    });
  }

  return paragraphs;
}

/**
 * Create four-sides model section
 */
function createFourSidesSection(fourSides: NonNullable<ChatMessage["fourSides"]>): Paragraph[] {
  const { typography, colors } = DOCX_EXPORT_CONFIG;
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Vier-Seiten-Modell (Schulz von Thun)",
          bold: true,
          size: typography.fontSize.subtitle,
          font: typography.font.family,
        }),
      ],
      spacing: { before: 200, after: 100 },
    })
  );

  // Sachinhalt
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Sachinhalt: ",
          bold: true,
          size: typography.fontSize.caption,
          color: colors.fourSidesSachinhalt,
          font: typography.font.family,
        }),
        new TextRun({
          text: fourSides.sachinhalt,
          size: typography.fontSize.caption,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 50 },
    })
  );

  // Selbstoffenbarung
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Selbstoffenbarung: ",
          bold: true,
          size: typography.fontSize.caption,
          color: colors.fourSidesSelbstoffenbarung,
          font: typography.font.family,
        }),
        new TextRun({
          text: fourSides.selbstoffenbarung,
          size: typography.fontSize.caption,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 50 },
    })
  );

  // Beziehung
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Beziehung: ",
          bold: true,
          size: typography.fontSize.caption,
          color: colors.fourSidesBeziehung,
          font: typography.font.family,
        }),
        new TextRun({
          text: fourSides.beziehung,
          size: typography.fontSize.caption,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 50 },
    })
  );

  // Appell
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Appell: ",
          bold: true,
          size: typography.fontSize.caption,
          color: colors.fourSidesAppell,
          font: typography.font.family,
        }),
        new TextRun({
          text: fourSides.appell,
          size: typography.fontSize.caption,
          font: typography.font.family,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  return paragraphs;
}

/**
 * Create horizontal separator
 */
function createSeparator(): Paragraph {
  return new Paragraph({
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: DOCX_EXPORT_CONFIG.colors.border,
      },
    },
    spacing: { after: DOCX_EXPORT_CONFIG.spacing.betweenMessages },
  });
}
