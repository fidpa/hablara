/**
 * Plain Text Export Generator
 *
 * ASCII-Text mit simplified metadata. Header mit ASCII Art ("HABLARÁ").
 * Clean Formatting mit Separator-Lines (80 Zeichen "="). No HTML/Markdown.
 */

import type { ChatMessage } from "@/lib/types";
import type { ExportOptions } from "./types";

export function generatePlainText(
  messages: ChatMessage[],
  options: ExportOptions
): string {
  const lines: string[] = [];

  // Header with ASCII art
  lines.push("=".repeat(60));
  lines.push("HABLARÁ CHAT EXPORT");
  lines.push(`Exportiert: ${new Date().toLocaleString("de-DE")}`);
  lines.push(`Nachrichten: ${messages.length}`);
  lines.push("=".repeat(60));
  lines.push("");

  // Message Loop
  messages.forEach((msg, idx) => {
    // Message header
    lines.push(`NACHRICHT ${idx + 1}`);
    lines.push("-".repeat(60));

    // Timestamp
    if (options.includeTimestamps) {
      const timestamp = new Date(msg.timestamp).toLocaleString("de-DE");
      lines.push(`Zeitstempel: ${timestamp}`);
    }

    // Role and source
    const role = msg.role === "user" ? "Benutzer" : "Hablará";
    lines.push(`Rolle: ${role}`);

    if (msg.role === "user" && msg.source) {
      const source = msg.source === "voice" ? "Sprachaufnahme" :
                     msg.source === "text" ? "Text-Import" :
                     msg.source === "rag" ? "RAG-Chatbot" : "Unbekannt";
      lines.push(`Quelle: ${source}`);
    }

    lines.push("");

    // Content
    lines.push("INHALT:");
    lines.push(msg.content);
    lines.push("");

    // Simplified metadata (only if includeMetadata is true)
    if (options.includeMetadata) {
      // GFK - simplified (feelings and needs only)
      if (msg.gfk) {
        const hasFeelings = Array.isArray(msg.gfk.feelings) && msg.gfk.feelings.length > 0;
        const hasNeeds = Array.isArray(msg.gfk.needs) && msg.gfk.needs.length > 0;

        if (hasFeelings || hasNeeds) {
          lines.push("GFK-ANALYSE:");

          if (hasFeelings) {
            lines.push(`Gefühle: ${msg.gfk.feelings.join(", ")}`);
          }

          if (hasNeeds) {
            lines.push(`Bedürfnisse: ${msg.gfk.needs.join(", ")}`);
          }

          lines.push("");
        }
      }

      // Cognitive - simplified (thinking style and count)
      if (msg.cognitive) {
        lines.push("KOGNITIVE VERZERRUNGEN:");
        lines.push(`Denkstil: ${msg.cognitive.overallThinkingStyle}`);

        if (Array.isArray(msg.cognitive.distortions) && msg.cognitive.distortions.length > 0) {
          lines.push(`Anzahl Verzerrungen: ${msg.cognitive.distortions.length}`);
          msg.cognitive.distortions.forEach(d => {
            lines.push(`  - ${d.type}`);
          });
        } else {
          lines.push("Keine Verzerrungen erkannt.");
        }

        lines.push("");
      }

      // Four Sides - simplified
      if (msg.fourSides) {
        lines.push("VIER-SEITEN-MODELL:");
        lines.push(`Sachinhalt: ${msg.fourSides.sachinhalt}`);
        lines.push(`Beziehung: ${msg.fourSides.beziehung}`);
        lines.push(`Appell: ${msg.fourSides.appell}`);
        lines.push("");
      }

      // Audio Features
      if (options.includeAudioFeatures && msg.role === "user" && msg.audioFeatures) {
        lines.push("AUDIO-FEATURES:");
        lines.push(`Tonhöhe: ${msg.audioFeatures.pitch.toFixed(2)} Hz`);
        lines.push(`Energie: ${msg.audioFeatures.energy.toFixed(2)}`);
        lines.push(`Sprechgeschwindigkeit: ${msg.audioFeatures.speechRate.toFixed(2)}`);
        lines.push("");
      }
    }

    // Separator
    lines.push("=".repeat(60));
    lines.push("");
  });

  return lines.join("\n");
}
