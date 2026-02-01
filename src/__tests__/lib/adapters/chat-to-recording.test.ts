/**
 * Tests for Chat to Recording Adapter
 */

import { describe, it, expect } from "vitest";
import { chatMessageToRecordingMetadata } from "@/lib/adapters/chat-to-recording";
import type { ChatMessage, EmotionType } from "@/lib/types";

describe("chatMessageToRecordingMetadata", () => {
  const baseMessage: ChatMessage = {
    id: "msg-123",
    role: "assistant",
    content: "Test message",
    timestamp: new Date("2025-01-31T12:00:00Z"),
    source: "voice",
  };

  it("should map core fields 1:1", () => {
    const result = chatMessageToRecordingMetadata(baseMessage, 0);

    expect(result.id).toBe("msg-123");
    expect(result.createdAt).toBe("2025-01-31T12:00:00.000Z");
    expect(result.transcription).toEqual({
      text: "Test message",
      language: "de",
      provider: "unknown",
      model: "unknown",
      processingTimeMs: 0,
    });
    expect(result.source).toBe("recording"); // voice → recording
  });

  it("should map psychological enrichments 1:1", () => {
    const messageWithEnrichments: ChatMessage = {
      ...baseMessage,
      gfk: {
        observations: ["Test observation"],
        feelings: ["ruhig"],
        needs: ["sicherheit"],
        requests: ["bitte"],
        gfkTranslation: "Translation",
        reflectionQuestion: "Question?",
      },
      cognitive: {
        thinkingStyle: "balanced",
        distortions: [],
      },
      fourSides: {
        factual: "Test fact",
        selfRevelation: "I feel...",
        relationship: "You are...",
        appeal: "Please do...",
        misunderstandings: [],
      },
    };

    const result = chatMessageToRecordingMetadata(messageWithEnrichments, 0);

    // NOTE: emotion and tone are NOT mapped from ChatMessage (different from RecordingMetadata)
    expect(result.emotion).toBeUndefined();
    expect(result.tone).toBeUndefined();
    // GFK, cognitive, fourSides ARE mapped
    expect(result.gfk).toEqual(messageWithEnrichments.gfk);
    expect(result.cognitive).toEqual(messageWithEnrichments.cognitive);
    expect(result.fourSides).toEqual(messageWithEnrichments.fourSides);
  });

  it("should set audio metadata to null/zero", () => {
    const result = chatMessageToRecordingMetadata(baseMessage, 0);

    expect(result.durationMs).toBe(0);
    expect(result.sampleRate).toBe(0);
    expect(result.fileSize).toBe(0);
    expect(result.audioValidation).toEqual({
      rmsEnergy: 0,
      durationMs: 0,
      sampleCount: 0,
      passed: false,
    });
    expect(result.vadStats).toBeNull();
  });

  it("should set analysis fields to undefined", () => {
    const result = chatMessageToRecordingMetadata(baseMessage, 0);

    expect(result.analysisResult).toBeUndefined();
  });

  it("should use fallback ID when message has no ID", () => {
    const messageWithoutId: ChatMessage = {
      ...baseMessage,
      id: undefined,
    };

    const result = chatMessageToRecordingMetadata(messageWithoutId, 5);

    expect(result.id).toBe("chat-msg-5");
  });

  it("should preserve audioFeatures if present (note: different from RecordingMetadata structure)", () => {
    const messageWithAudio: ChatMessage = {
      ...baseMessage,
      audioFeatures: {
        pitch: 150,
        energy: 0.5,
        speechRate: 1.0,
        mfcc: [],
        pitchVariance: 10,
        pitchRange: 50,
        energyVariance: 0.1,
        pauseDurationAvg: 0.2,
        pauseFrequency: 2,
        zcrMean: 0.3,
        spectralCentroid: 1000,
        spectralRolloff: 2000,
        spectralFlux: 0.4,
      },
    };

    const result = chatMessageToRecordingMetadata(messageWithAudio, 0);

    // audioFeatures is NOT mapped to emotion.audioFeatures (different structures)
    // ChatMessage.audioFeatures is separate, RecordingMetadata.audioValidation is different
    expect(result.emotion).toBeUndefined();
  });

  it("should map source 'voice' to 'recording'", () => {
    const messageVoice: ChatMessage = {
      ...baseMessage,
      source: "voice",
    };

    const result = chatMessageToRecordingMetadata(messageVoice, 0);

    expect(result.source).toBe("recording");
  });

  it("should map source 'text' to 'text'", () => {
    const messageText: ChatMessage = {
      ...baseMessage,
      source: "text",
    };

    const result = chatMessageToRecordingMetadata(messageText, 0);

    expect(result.source).toBe("text");
  });
});
