/**
 * Chat to Recording Adapter
 *
 * Converts ChatMessage to Partial<RecordingMetadata> for use with shared PDF section renderers.
 * Enables code reuse between chat and recording PDF exports.
 */

import type { ChatMessage, RecordingMetadata } from "@/lib/types";

/**
 * Convert ChatMessage to Partial<RecordingMetadata>
 *
 * @param message - ChatMessage object
 * @param index - Message index (used for fallback ID)
 * @returns Partial<RecordingMetadata> with mapped fields
 */
export function chatMessageToRecordingMetadata(
  message: ChatMessage,
  index: number
): Partial<RecordingMetadata> {
  return {
    // === 1:1 Mapping ===
    id: message.id || `chat-msg-${index}`,
    createdAt: message.timestamp.toISOString(),
    transcription: {
      text: message.content,
      provider: "unknown",
      model: "unknown",
      language: "de",
      processingTimeMs: 0,
    },
    source: message.source === "voice" ? "recording" : "text",

    // === Psychological Enrichments (1:1) ===
    // NOTE: ChatMessage does NOT have emotion or tone fields
    // Only GFK, cognitive, fourSides, and audioFeatures are available
    emotion: undefined, // Not in ChatMessage
    tone: undefined, // Not in ChatMessage
    gfk: message.gfk,
    cognitive: message.cognitive,
    fourSides: message.fourSides,

    // === Audio Metadata (NULL - not applicable for ChatMessage) ===
    durationMs: 0, // Chat messages have no duration
    sampleRate: 0,
    fileSize: 0,
    audioValidation: {
      rmsEnergy: 0,
      durationMs: 0,
      sampleCount: 0,
      passed: false,
    },
    vadStats: null,

    // === Analysis (NULL - not in ChatMessage) ===
    analysisResult: undefined, // fallacies, topic, enrichment not in ChatMessage
    provider: "unknown",
    model: "unknown",
    appVersion: "unknown",

    // === Optional (conditional) ===
    // Note: audioFeatures is NOT in RecordingMetadata.emotion
    // It would be in metadata.audioValidation if we had it
    // For now, we don't include it since ChatMessage.audioFeatures != RecordingMetadata.audioValidation
  };
}
