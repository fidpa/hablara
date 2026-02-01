/**
 * Audio Emotion Converter
 *
 * Konvertiert Rust Emotion-Results (12 Audio-Features) zu EmotionState.
 * Erstellt Baseline-Differenzen für Personalized Feedback.
 */

import type {
  EmotionState,
  EmotionType,
  AudioFeatures,
  EmotionResultFromRust,
} from "../types";
import { EMOTION_THRESHOLDS } from "../types";

/**
 * Convert Rust V2 Emotion Result to EmotionState
 * @param rustResult - Result from analyze_audio_from_wav (Rust V2, 12 features)
 * @param audioFeatures - Full 12-feature AudioFeatures (optional, for display)
 * @returns EmotionState compatible with frontend
 */
export function convertRustEmotionResult(
  rustResult: EmotionResultFromRust,
  audioFeatures?: AudioFeatures
): EmotionState {
  return {
    primary: rustResult.primary,
    confidence: rustResult.confidence,
    secondary: rustResult.secondary ?? undefined,
    audioFeatures: audioFeatures ?? null,
  };
}

/**
 * @deprecated Use Rust V2 analyze_audio_from_wav instead (93% accuracy with 12 features).
 * This 3-feature fallback uses simplified prosody heuristics:
 * - Energy >0.6 + Pitch >180Hz = stressed/excited (Scherer 1986, vocal affect encoding)
 * - Energy <0.25 + Speech rate <0.8 = calm (low arousal indicator)
 * - Speech rate <0.7 + Pitch ~medium = uncertainty (hesitation marker)
 */
export function analyzeAudioEmotion(features: AudioFeatures): EmotionState {
  const { pitch, energy, speechRate } = features;

  // Simple rule-based emotion detection from audio
  let primary: EmotionType = "neutral";
  let confidence: number = EMOTION_THRESHOLDS.DEFAULT_CONFIDENCE;

  if (energy > EMOTION_THRESHOLDS.LEGACY_ENERGY_HIGH && pitch > EMOTION_THRESHOLDS.LEGACY_PITCH_HIGH) {
    if (speechRate > EMOTION_THRESHOLDS.LEGACY_SPEECH_RATE_HIGH) {
      primary = "excitement";
      confidence = EMOTION_THRESHOLDS.LEGACY_CONFIDENCE_EXCITEMENT;
    } else {
      primary = "stress";
      confidence = EMOTION_THRESHOLDS.LEGACY_CONFIDENCE_STRESS;
    }
  } else if (energy < EMOTION_THRESHOLDS.LEGACY_ENERGY_LOW && speechRate < EMOTION_THRESHOLDS.LEGACY_SPEECH_RATE_LOW) {
    primary = "calm";
    confidence = EMOTION_THRESHOLDS.LEGACY_CONFIDENCE_CALM;
  } else if (speechRate < EMOTION_THRESHOLDS.LEGACY_SPEECH_RATE_VERY_LOW && pitch > EMOTION_THRESHOLDS.LEGACY_PITCH_MEDIUM) {
    primary = "uncertainty";
    confidence = EMOTION_THRESHOLDS.LEGACY_CONFIDENCE_UNCERTAINTY;
  }

  return {
    primary,
    confidence,
    audioFeatures: features,
  };
}
