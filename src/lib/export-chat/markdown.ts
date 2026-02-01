/**
 * Markdown Export Generator
 *
 * Erstellt Markdown mit YAML Frontmatter + Full Metadata. Nutzt DEFAULT_EXPORT_OPTIONS.
 * Bullet-List-Formatting für User/Assistant Messages. Clean Timestamp-Formatting.
 */

import type { ChatMessage } from "@/lib/types";
import type { ExportOptions } from "./types";

export function generateMarkdown(
  messages: ChatMessage[],
  options: ExportOptions
): string {
  const lines: string[] = [];

  // YAML Frontmatter
  lines.push("---");
  lines.push(`title: "Hablará Sprachanalyse"`);
  lines.push(`exported: ${new Date().toISOString()}`);
  lines.push(`message_count: ${messages.length}`);
  lines.push("---");
  lines.push("");
  lines.push("# Hablará Sprachanalyse");
  lines.push("");

  // Message Loop
  messages.forEach((msg, idx) => {
    // Message header
    lines.push(`## Nachricht ${idx + 1}`);
    lines.push("");

    // Timestamp
    if (options.includeTimestamps) {
      const timestamp = new Date(msg.timestamp).toLocaleString("de-DE");
      lines.push(`**Zeitstempel:** ${timestamp}`);
    }

    // Role and source
    const role = msg.role === "user" ? "Benutzer" : "Hablará";
    lines.push(`**Rolle:** ${role}`);

    if (msg.role === "user" && msg.source) {
      const source = msg.source === "voice" ? "Sprachaufnahme" :
                     msg.source === "text" ? "Text-Import" :
                     msg.source === "rag" ? "RAG-Chatbot" : "Unbekannt";
      lines.push(`**Quelle:** ${source}`);
    }

    lines.push("");

    // Content
    lines.push("### Inhalt");
    lines.push("");
    lines.push(msg.content);
    lines.push("");

    // Metadata sections (only if includeMetadata is true)
    if (options.includeMetadata) {
      // GFK Analysis
      if (msg.gfk) {
        lines.push("### GFK-Analyse (Gewaltfreie Kommunikation)");
        lines.push("");

        if (Array.isArray(msg.gfk.observations) && msg.gfk.observations.length > 0) {
          lines.push("**Beobachtungen:**");
          msg.gfk.observations.forEach(obs => {
            lines.push(`- ${obs}`);
          });
          lines.push("");
        }

        if (Array.isArray(msg.gfk.feelings) && msg.gfk.feelings.length > 0) {
          lines.push("**Gefühle:**");
          msg.gfk.feelings.forEach(feeling => {
            lines.push(`- ${feeling}`);
          });
          lines.push("");
        }

        if (Array.isArray(msg.gfk.needs) && msg.gfk.needs.length > 0) {
          lines.push("**Bedürfnisse:**");
          msg.gfk.needs.forEach(need => {
            lines.push(`- ${need}`);
          });
          lines.push("");
        }

        if (Array.isArray(msg.gfk.requests) && msg.gfk.requests.length > 0) {
          lines.push("**Bitten:**");
          msg.gfk.requests.forEach(request => {
            lines.push(`- ${request}`);
          });
          lines.push("");
        }

        if (msg.gfk.gfkTranslation) {
          lines.push("**GFK-Übersetzung:**");
          lines.push("");
          lines.push(msg.gfk.gfkTranslation);
          lines.push("");
        }

        if (msg.gfk.reflectionQuestion) {
          lines.push("**Reflexionsfrage:**");
          lines.push("");
          lines.push(msg.gfk.reflectionQuestion);
          lines.push("");
        }
      }

      // Cognitive Distortions
      if (msg.cognitive) {
        lines.push("### Kognitive Verzerrungen (CBT)");
        lines.push("");

        lines.push(`**Denkstil:** ${msg.cognitive.overallThinkingStyle}`);
        lines.push("");

        if (Array.isArray(msg.cognitive.distortions) && msg.cognitive.distortions.length > 0) {
          lines.push("**Erkannte Verzerrungen:**");
          lines.push("");

          msg.cognitive.distortions.forEach((distortion, i) => {
            lines.push(`#### ${i + 1}. ${distortion.type}`);
            lines.push("");
            lines.push(`**Zitat:** ${distortion.quote}`);
            lines.push("");
            lines.push(`**Erklärung:** ${distortion.explanation}`);
            lines.push("");
            lines.push(`**Reframe:** ${distortion.reframe}`);
            lines.push("");
          });
        } else {
          lines.push("Keine kognitiven Verzerrungen erkannt.");
          lines.push("");
        }
      }

      // Four Sides Model
      if (msg.fourSides) {
        lines.push("### Vier-Seiten-Modell (Schulz von Thun)");
        lines.push("");

        lines.push("**Sachinhalt:**");
        lines.push(msg.fourSides.sachinhalt);
        lines.push("");

        lines.push("**Selbstoffenbarung:**");
        lines.push(msg.fourSides.selbstoffenbarung);
        lines.push("");

        lines.push("**Beziehung:**");
        lines.push(msg.fourSides.beziehung);
        lines.push("");

        lines.push("**Appell:**");
        lines.push(msg.fourSides.appell);
        lines.push("");

        if (Array.isArray(msg.fourSides.potentielleMissverstaendnisse) && msg.fourSides.potentielleMissverstaendnisse.length > 0) {
          lines.push("**Mögliche Missverständnisse:**");
          msg.fourSides.potentielleMissverstaendnisse.forEach(m => {
            lines.push(`- ${m}`);
          });
          lines.push("");
        }
      }

      // Audio Features (only for user messages)
      if (options.includeAudioFeatures && msg.role === "user" && msg.audioFeatures) {
        lines.push("### Audio-Features");
        lines.push("");
        lines.push(`**Tonhöhe:** ${msg.audioFeatures.pitch.toFixed(2)} Hz`);
        lines.push(`**Energie:** ${msg.audioFeatures.energy.toFixed(2)}`);
        lines.push(`**Sprechgeschwindigkeit:** ${msg.audioFeatures.speechRate.toFixed(2)}`);
        lines.push("");
      }
    }

    // Separator
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}
