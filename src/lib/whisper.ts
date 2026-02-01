/**
 * Whisper Transcription Client
 *
 * Speech-to-Text via whisper.cpp (german-turbo, default) oder MLX-Whisper (optional).
 * Nutzt Tauri IPC für native Inferenz, Fallback zu lokaler Server (Development).
 * Includes VAD Stats (speechDurationSec, totalDurationSec) für Audio-Emotion-Analyse.
 */

import type { WhisperProvider, MlxWhisperModel, MlxWhisperPaths } from "./types";
import { logger } from "./logger";

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
  /// VAD timing: duration of detected speech (seconds)
  speechDurationSec: number;
  /// VAD timing: total duration before filtering (seconds)
  totalDurationSec: number;
}

export interface WhisperConfig {
  model: "tiny" | "base" | "small" | "medium" | "large" | "german-turbo";
  language: string;
  provider?: WhisperProvider;
  mlxModel?: MlxWhisperModel;
  mlxPaths?: MlxWhisperPaths;
}

// Desktop transcription via Tauri sidecar (whisper.cpp / MLX-whisper)
export class WhisperClient {
  private config: WhisperConfig;
  private isTauri: boolean;

  constructor(config: WhisperConfig, isTauri: boolean = false) {
    this.config = config;
    this.isTauri = isTauri;
  }

  // Convert Uint8Array to base64 using chunked approach to avoid stack overflow
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    const chunk = 8192;
    let result = "";
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.slice(i, Math.min(i + chunk, bytes.length));
      result += String.fromCharCode(...slice);
    }
    return btoa(result);
  }

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    logger.debug('WhisperClient', `Transcribe called (isTauri: ${this.isTauri}, size: ${audioBlob.size} bytes)`);
    if (this.isTauri) {
      return this.transcribeViaTauri(audioBlob);
    }
    // Development-Fallback: Local server (für `pnpm dev` ohne Tauri)
    // Production: Immer Tauri (whisper.cpp / MLX-whisper)
    return this.transcribeViaLocalServer(audioBlob);
  }

  private async transcribeViaTauri(audioBlob: Blob): Promise<TranscriptionResult> {
    // Convert blob to array buffer, then to base64 for IPC
    // Using chunked approach to avoid stack overflow with large audio files
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = this.uint8ArrayToBase64(uint8Array);

    const provider = this.config.provider || "whisper-cpp";
    const model =
      provider === "mlx-whisper"
        ? this.config.mlxModel || "german-turbo"
        : this.config.model;

    // Prepare MLX paths for Rust (camelCase to snake_case conversion happens in Rust via serde)
    const mlxPaths = this.config.mlxPaths
      ? {
          pythonPath: this.config.mlxPaths.pythonPath,
          modelsDir: this.config.mlxPaths.modelsDir,
        }
      : undefined;

    try {
      // Dynamic import to avoid SSR issues
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<TranscriptionResult>("transcribe_audio", {
        audioData: base64,
        model,
        language: this.config.language,
        provider,
        mlxPaths,
      });
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('WhisperClient', 'Tauri transcription failed', error);
      } else {
        logger.error('WhisperClient', 'Tauri transcription failed', { error });
      }

      // If MLX-Whisper failed, try falling back to whisper.cpp
      if (provider === "mlx-whisper") {
        logger.warn('WhisperClient', 'MLX-Whisper failed, falling back to whisper.cpp');
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const result = await invoke<TranscriptionResult>("transcribe_audio", {
            audioData: base64,
            model: this.config.model,
            language: this.config.language,
            provider: "whisper-cpp",
          });
          return result;
        } catch (fallbackError: unknown) {
          if (fallbackError instanceof Error) {
            logger.error('WhisperClient', 'Fallback to whisper.cpp also failed', fallbackError);
          } else {
            logger.error('WhisperClient', 'Fallback to whisper.cpp also failed', { error: fallbackError });
          }
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  private async transcribeViaLocalServer(audioBlob: Blob): Promise<TranscriptionResult> {
    // Local whisper server (for development without Tauri)
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");
    formData.append("model", this.config.model);
    formData.append("language", this.config.language);

    try {
      const response = await fetch("http://localhost:8080/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription server error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('WhisperClient', 'Local server transcription failed', error);
      } else {
        logger.error('WhisperClient', 'Local server transcription failed', { error });
      }
      // Return placeholder for graceful degradation
      // Note: LLM clients detect this placeholder and use fallback summary instead
      return {
        text: "[Transcription service unavailable]",
        segments: [],
        language: this.config.language,
        speechDurationSec: 0.0,
        totalDurationSec: 0.0,
      };
    }
  }
}

// Singleton instance
let whisperInstance: WhisperClient | null = null;
let lastIsTauri: boolean | undefined = undefined;

export function getWhisperClient(config?: WhisperConfig, isTauri?: boolean): WhisperClient {
  // Recreate if config changed or isTauri status changed
  if (!whisperInstance || config || isTauri !== lastIsTauri) {
    lastIsTauri = isTauri;
    whisperInstance = new WhisperClient(
      config || { model: "german-turbo", language: "de" },
      isTauri ?? false
    );
  }
  return whisperInstance;
}

// Audio feature extraction for real-time emotion analysis
export function extractAudioFeatures(audioData: Float32Array): {
  pitch: number;
  energy: number;
  speechRate: number;
} {
  // Basic audio feature extraction
  // In production, this would be done in Rust for better performance

  // Energy (RMS)
  let sumSquares = 0;
  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i] ?? 0;
    sumSquares += sample * sample;
  }
  const energy = Math.sqrt(sumSquares / audioData.length);

  // Simple pitch estimation using zero-crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    const current = audioData[i] ?? 0;
    const previous = audioData[i - 1] ?? 0;
    if ((current >= 0 && previous < 0) ||
        (current < 0 && previous >= 0)) {
      zeroCrossings++;
    }
  }
  // Approximate pitch from zero-crossing rate (very rough)
  const pitch = (zeroCrossings / 2) * (16000 / audioData.length);

  // Speech rate placeholder (would need VAD in production)
  const speechRate = 1.0;

  return { pitch, energy, speechRate };
}
