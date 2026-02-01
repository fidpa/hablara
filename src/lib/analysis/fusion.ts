/**
 * Emotion & Tone Fusion
 *
 * Fusioniert Audio- und Text-Analyse via Dual-Track Gewichtung (40/60 balanced).
 * Berechnet Emotion Blending (Plutchik Wheel), blendierte Circumplex-Koordinaten,
 * und Tone-Fusion mit Agreement-Boost. Unterstützt 3 Detection-Modi.
 */

import type {
  EmotionState,
  EmotionType,
  ToneResult,
  ToneState,
  EmotionDetectionMode,
} from "../types";
import {
  EMOTION_COORDINATES,
  EMOTION_THRESHOLDS,
  getAudioWeightForMode,
  getTextWeightForMode,
} from "../types";

/**
 * Calculate blend ratio for emotion blending.
 *
 * @param primaryConf - Primary emotion confidence (0-1)
 * @param secondaryConf - Secondary emotion confidence (0-1)
 * @returns Blend ratio (0-0.5), capped at 50% to preserve primary dominance
 */
export function calculateBlendRatio(
  primaryConf: number,
  secondaryConf: number
): number {
  // Skip blending if secondary confidence too low
  if (secondaryConf < EMOTION_THRESHOLDS.BLEND_CONFIDENCE_MIN) {
    return 0;
  }

  // Calculate ratio based on relative confidences
  const total = primaryConf + secondaryConf;
  const rawRatio = secondaryConf / total;

  // Cap at 50% to maintain primary dominance
  return Math.min(EMOTION_THRESHOLDS.BLEND_RATIO_MAX, rawRatio);
}

/**
 * Calculate blended dimensional coordinates (valence/arousal).
 * Interpolates between primary and secondary emotion positions.
 *
 * @param primary - Primary emotion type
 * @param secondary - Secondary emotion type
 * @param blendRatio - Blend ratio (0-0.5)
 * @returns Blended coordinates in Russell's Circumplex space
 */
export function calculateBlendedCoordinates(
  primary: EmotionType,
  secondary: EmotionType,
  blendRatio: number
): { valence: number; arousal: number } {
  const primaryCoords = EMOTION_COORDINATES[primary];
  const secondaryCoords = EMOTION_COORDINATES[secondary];
  const primaryRatio = 1 - blendRatio;

  return {
    valence: primaryCoords.valence * primaryRatio + secondaryCoords.valence * blendRatio,
    arousal: primaryCoords.arousal * primaryRatio + secondaryCoords.arousal * blendRatio,
  };
}

/**
 * Fuse audio and text emotion analysis (Dual-Track with configurable weights).
 *
 * Weight rationale: 40/60 (balanced) is research-optimized baseline based on Poria et al. (2017).
 * When both tracks agree on primary emotion, confidence is boosted by 10% (BOOST_CONFIDENCE).
 * Supports 3 modes: balanced (40/60), voice-emphasis (60/40), content-focus (20/80).
 */
export function fuseEmotions(
  audioEmotion: EmotionState,
  textEmotion: Partial<EmotionState>,
  mode: EmotionDetectionMode = "balanced"
): EmotionState {
  const AUDIO_WEIGHT = getAudioWeightForMode(mode);
  const TEXT_WEIGHT = getTextWeightForMode(mode);

  // If same emotion, boost confidence
  if (audioEmotion.primary === textEmotion.primary) {
    return {
      primary: audioEmotion.primary,
      confidence: Math.min(
        1,
        audioEmotion.confidence * AUDIO_WEIGHT +
          (textEmotion.confidence || 0) * TEXT_WEIGHT + EMOTION_THRESHOLDS.BOOST_CONFIDENCE // +10% boost when audio/text agree (agreement = higher signal reliability)
      ),
      audioFeatures: audioEmotion.audioFeatures,
      markers: textEmotion.markers,
    };
  }

  // Different emotions - use weighted decision
  const audioScore = audioEmotion.confidence * AUDIO_WEIGHT;
  const textScore = (textEmotion.confidence || 0) * TEXT_WEIGHT;

  if (audioScore > textScore) {
    // Audio wins - text becomes secondary
    const secondaryConf = textEmotion.confidence || EMOTION_THRESHOLDS.DEFAULT_CONFIDENCE;
    const blendRatio = calculateBlendRatio(audioEmotion.confidence, secondaryConf);

    return {
      ...audioEmotion,
      secondary: textEmotion.primary,
      secondaryInfo: textEmotion.primary
        ? {
            type: textEmotion.primary,
            confidence: secondaryConf,
            source: "text",
            blendRatio,
          }
        : undefined,
      blendedCoordinates: textEmotion.primary && blendRatio > 0
        ? calculateBlendedCoordinates(audioEmotion.primary, textEmotion.primary, blendRatio)
        : undefined,
    };
  } else {
    // Text wins - audio becomes secondary
    const blendRatio = calculateBlendRatio(textEmotion.confidence || EMOTION_THRESHOLDS.DEFAULT_CONFIDENCE, audioEmotion.confidence);

    return {
      primary: textEmotion.primary || "neutral",
      confidence: textEmotion.confidence || EMOTION_THRESHOLDS.DEFAULT_CONFIDENCE,
      audioFeatures: audioEmotion.audioFeatures,
      secondary: audioEmotion.primary,
      secondaryInfo: {
        type: audioEmotion.primary,
        confidence: audioEmotion.confidence,
        source: "audio",
        blendRatio,
      },
      markers: textEmotion.markers,
      blendedCoordinates: blendRatio > 0
        ? calculateBlendedCoordinates(textEmotion.primary || "neutral", audioEmotion.primary, blendRatio)
        : undefined,
    };
  }
}

/**
 * Fuse audio and text tone analysis (Dual-Track with configurable weights)
 *
 * Agreement boost: +2% per matching dimension (max +10% for all 5 matching)
 * Matching = within 1 point on 1-5 scale
 */
export function fuseTones(
  audioTone: ToneResult,
  textTone: Partial<ToneResult>,
  mode: EmotionDetectionMode = "balanced"
): ToneState {
  const AUDIO_WEIGHT = getAudioWeightForMode(mode);
  const TEXT_WEIGHT = getTextWeightForMode(mode);

  // Calculate weighted average for each dimension
  const formality = Math.round(
    (audioTone.formality * AUDIO_WEIGHT) + ((textTone.formality || 3) * TEXT_WEIGHT)
  );
  const professionalism = Math.round(
    (audioTone.professionalism * AUDIO_WEIGHT) + ((textTone.professionalism || 3) * TEXT_WEIGHT)
  );
  const directness = Math.round(
    (audioTone.directness * AUDIO_WEIGHT) + ((textTone.directness || 3) * TEXT_WEIGHT)
  );
  const energy = Math.round(
    (audioTone.energy * AUDIO_WEIGHT) + ((textTone.energy || 3) * TEXT_WEIGHT)
  );
  const seriousness = Math.round(
    (audioTone.seriousness * AUDIO_WEIGHT) + ((textTone.seriousness || 3) * TEXT_WEIGHT)
  );

  // Count agreeing dimensions (within 1 point)
  let agreements = 0;
  if (textTone.formality && Math.abs(audioTone.formality - textTone.formality) <= 1) agreements++;
  if (textTone.professionalism && Math.abs(audioTone.professionalism - textTone.professionalism) <= 1) agreements++;
  if (textTone.directness && Math.abs(audioTone.directness - textTone.directness) <= 1) agreements++;
  if (textTone.energy && Math.abs(audioTone.energy - textTone.energy) <= 1) agreements++;
  if (textTone.seriousness && Math.abs(audioTone.seriousness - textTone.seriousness) <= 1) agreements++;

  // Base confidence: weighted average
  const baseConfidence =
    (audioTone.confidence * AUDIO_WEIGHT) + ((textTone.confidence || EMOTION_THRESHOLDS.DEFAULT_CONFIDENCE) * TEXT_WEIGHT);

  // Agreement boost: +2% per matching dimension (max +10%)
  const agreementBoost = agreements * EMOTION_THRESHOLDS.TONE_AGREEMENT_BOOST_PER_DIM;
  const confidence = Math.min(1.0, baseConfidence + agreementBoost);

  return {
    formality: Math.max(1, Math.min(5, formality)),
    professionalism: Math.max(1, Math.min(5, professionalism)),
    directness: Math.max(1, Math.min(5, directness)),
    energy: Math.max(1, Math.min(5, energy)),
    seriousness: Math.max(1, Math.min(5, seriousness)),
    confidence,
    source: "fused",
  };
}
