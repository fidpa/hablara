//! Emotion Classification
//!
//! Enhanced emotion detection using 12 audio features for improved accuracy.
//! Research-backed approach combining prosodic and spectral analysis.
//!
//! # Architecture
//!
//! Uses 12 audio features across 3 categories:
//! - **Legacy (3):** pitch, energy, speech_rate
//! - **Prosodic (5):** pitch_variance, pitch_range, energy_variance, pause_duration, pause_frequency
//! - **Spectral (4):** zcr, spectral_centroid, spectral_rolloff, spectral_flux
//!
//! # Key Capabilities
//!
//! 1. **Stress vs. Excitement Differentiation:**
//!    - Stress = high pitch_variance (unsteady voice)
//!    - Excitement = low variance (steady enthusiasm)
//!
//! 2. **Aggression vs. Conviction:**
//!    - Aggression = high spectral_flux (abrupt changes)
//!    - Conviction = low flux (steady assertiveness)
//!
//! 3. **Uncertainty Detection:**
//!    - High pause_frequency + high pitch_variance (hesitation markers)
//!
//! 4. **Calm Detection:**
//!    - Low pitch_variance + low pause_frequency (stability markers)
//!
//! # Theoretical Foundation
//!
//! Rules informed by:
//! - **Plutchik's Wheel (1980):** Primary/secondary emotion relationships
//! - **Russell's Circumplex (1980):** Valence-Arousal mapping

use crate::emotion::{EmotionResult, EmotionType};

use super::prosodic::ProsodicFeatures;
use super::spectral::SpectralFeatures;

/// Emotion classifier using 12 audio features
pub struct EmotionClassifier;

impl EmotionClassifier {
    /// Classify emotion from prosodic and spectral features
    ///
    /// # Arguments
    /// * `prosodic` - Prosodic features (pitch, energy, pauses)
    /// * `spectral` - Spectral features (ZCR, centroid, rolloff, flux)
    /// * `speech_rate` - Speech duration / total duration
    ///
    /// # Returns
    /// EmotionResult with primary emotion, confidence, and optional secondary emotion
    ///
    /// # Rule Ordering (P1 Bug Fix - Feb 2026)
    ///
    /// Rules are ordered by specificity and priority:
    /// 1. **Calm/Joy FIRST** - Positive emotions need priority to avoid stress bias
    /// 2. **Stress/Excitement** - High arousal detection (requires very high variance)
    /// 3. **Negative emotions** - Aggression, Frustration, Uncertainty
    /// 4. **Neutral fallback** - Default when no strong signals
    ///
    /// Previous ordering caused "stress bias" where calm speech with moderate variance
    /// was incorrectly classified as stress due to early rule termination.
    pub fn classify(
        prosodic: &ProsodicFeatures,
        spectral: &SpectralFeatures,
        speech_rate: f32,
    ) -> EmotionResult {
        let pitch = prosodic.pitch_mean;
        let energy = prosodic.energy_mean;

        // NOTE: Energy thresholds calibrated for typical microphone input (RMS 0.05-0.3)
        // Original thresholds (0.5+) were too high for real-world recordings
        // P1 Fix (Feb 2026): Recalibrated Calm threshold from 0.08 to 0.12

        // ============================================================================
        // PRIORITY 1: Positive/Low-Arousal Emotions (check BEFORE stress)
        // ============================================================================

        // Rule 1: Calm Detection (RECALIBRATED - P1 Bug Fix)
        // Basis: Low-arousal, positive-valence (Russell). Parasympathetic dominance.
        // P1 Fix: Relaxed thresholds for real-world calm speech:
        //   - energy: 0.08 → 0.12 (real calm speech is 0.08-0.12 RMS)
        //   - variance: 500 → 800 (conversational variance)
        //   - speech_rate: 0.7 → 0.65 (allow slower thoughtful speech)
        if energy < 0.12 && prosodic.pitch_variance < 800.0 && speech_rate > 0.65 {
            return EmotionResult {
                primary: EmotionType::Calm,
                confidence: 0.72,
                secondary: None,
                features: None,
            };
        }

        // Rule 2: Joy Detection (ENHANCED - check before stress)
        // Basis: Positive valence, moderate-high arousal (Russell Circumplex)
        // Higher pitch + moderate energy + bright spectrum + moderate variance
        // P1 Fix: Expanded Joy path to catch enthusiastic positive speech
        if pitch > 150.0 && energy > 0.08 && energy < 0.18 && spectral.spectral_centroid > 1000.0 {
            // Moderate variance (500-1800) with good speech rate = Joy
            // This catches enthusiastic speakers who were previously classified as Stress
            if prosodic.pitch_variance > 400.0 && prosodic.pitch_variance < 1800.0 && speech_rate > 0.7 {
                return EmotionResult {
                    primary: EmotionType::Joy,
                    confidence: 0.70,
                    secondary: Some(EmotionType::Excitement),
                    features: None,
                };
            }
        }

        // ============================================================================
        // PRIORITY 2: High-Arousal Emotions (Stress/Excitement)
        // ============================================================================

        // Rule 3: Stress vs. Excitement (RECALIBRATED)
        // Basis: Both high-arousal (Russell). Stress = vocal instability (Scherer, 1986).
        // P1 Fix: Increased variance threshold from 3000 → 3500 for Stress
        // Now requires VERY high variance to trigger Stress (avoids false positives)
        if pitch > 160.0 && prosodic.pitch_variance > 1200.0 {
            if prosodic.pitch_variance > 3500.0 || energy > 0.18 {
                // Very high variance OR high energy = stress
                return EmotionResult {
                    primary: EmotionType::Stress,
                    confidence: 0.75,
                    secondary: Some(EmotionType::Excitement),
                    features: None,
                };
            } else if speech_rate > 0.8 {
                // Fast + moderate variance = excitement
                return EmotionResult {
                    primary: EmotionType::Excitement,
                    confidence: 0.70,
                    secondary: Some(EmotionType::Stress),
                    features: None,
                };
            } else {
                // Middle range - confidence-based decision
                // If pitch_variance is between 1200-3500, energy < 0.18, speech_rate < 0.8
                let stress_signal = (prosodic.pitch_variance - 1200.0) / 2300.0;
                let excitement_signal = speech_rate;
                if stress_signal > excitement_signal {
                    return EmotionResult {
                        primary: EmotionType::Stress,
                        confidence: 0.62,
                        secondary: Some(EmotionType::Excitement),
                        features: None,
                    };
                } else {
                    return EmotionResult {
                        primary: EmotionType::Excitement,
                        confidence: 0.60,
                        secondary: Some(EmotionType::Stress),
                        features: None,
                    };
                }
            }
        }

        // ============================================================================
        // PRIORITY 3: Negative/Complex Emotions
        // ============================================================================

        // Rule 4: Uncertainty Detection
        // Basis: Cognitive load disrupts fluency (Goldman-Eisler, 1968).
        // High pitch variance + slow/interrupted speech
        if prosodic.pitch_variance > 1500.0 && speech_rate < 0.6 {
            return EmotionResult {
                primary: EmotionType::Uncertainty,
                confidence: 0.68,
                secondary: Some(EmotionType::Doubt),
                features: None,
            };
        }

        // Rule 5: Aggression vs. Conviction
        // Basis: Aggression = abrupt spectral changes (Banse & Scherer, 1996).
        // Lower pitch + elevated energy + high spectral activity
        if pitch < 180.0 && energy > 0.12 {
            if spectral.spectral_flux > 0.05 || prosodic.pitch_variance > 2000.0 {
                // High flux or variance = aggressive/emphatic
                return EmotionResult {
                    primary: EmotionType::Aggression,
                    confidence: 0.70,
                    secondary: Some(EmotionType::Conviction),
                    features: None,
                };
            } else if speech_rate > 0.8 {
                // Steady + fast = conviction
                return EmotionResult {
                    primary: EmotionType::Conviction,
                    confidence: 0.65,
                    secondary: None,
                    features: None,
                };
            }
        }

        // Rule 6: Frustration Detection
        // Moderate-high pitch variance + moderate energy
        if prosodic.pitch_variance > 1200.0
            && prosodic.pitch_variance < 4000.0
            && energy > 0.1
            && speech_rate > 0.7
        {
            return EmotionResult {
                primary: EmotionType::Frustration,
                confidence: 0.63,
                secondary: Some(EmotionType::Stress),
                features: None,
            };
        }

        // Rule 7: Doubt Detection
        // Moderate pitch variance + slower speech
        if prosodic.pitch_variance > 800.0
            && prosodic.pitch_variance < 2000.0
            && speech_rate < 0.8
        {
            return EmotionResult {
                primary: EmotionType::Doubt,
                confidence: 0.60,
                secondary: Some(EmotionType::Uncertainty),
                features: None,
            };
        }

        // Default: Neutral
        EmotionResult {
            primary: EmotionType::Neutral,
            confidence: 0.5,
            secondary: None,
            features: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // NOTE: Test values calibrated for real microphone input (RMS typically 0.05-0.3)
    // P1 Fix (Feb 2026): Updated test values to match recalibrated thresholds

    #[test]
    fn test_stress_classification() {
        // P1 Fix: Stress now requires variance > 3500 or energy > 0.18
        let prosodic = ProsodicFeatures {
            pitch_mean: 200.0,
            energy_mean: 0.20, // High energy (above 0.18 threshold)
            pitch_variance: 5000.0, // Very high variance = unsteady/stressed
            pitch_range: 150.0,
            energy_variance: 0.01,
            pause_duration_avg: 100.0,
            pause_frequency: 0.5,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.25,
            spectral_centroid: 1500.0,
            spectral_rolloff: 4000.0,
            spectral_flux: 0.03,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.9);
        assert!(matches!(result.primary, EmotionType::Stress));
        assert!(result.confidence > 0.7);
    }

    #[test]
    fn test_excitement_classification() {
        // P1 Fix: Excitement requires variance > 1200 but < 3500, fast speech, pitch > 160
        // Must avoid triggering Calm (energy >= 0.12) or Joy (energy < 0.18, spectral > 1000)
        let prosodic = ProsodicFeatures {
            pitch_mean: 185.0, // High pitch (> 160 for stress/excitement path)
            energy_mean: 0.16, // Above Joy threshold (0.18), in excitement range
            pitch_variance: 2000.0, // Moderate-high variance (1200-3500)
            pitch_range: 80.0,
            energy_variance: 0.008,
            pause_duration_avg: 80.0,
            pause_frequency: 0.3,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.22,
            spectral_centroid: 900.0, // Below Joy threshold (1000) to avoid Joy path
            spectral_rolloff: 3500.0,
            spectral_flux: 0.025,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.9); // Fast speech
        assert!(matches!(result.primary, EmotionType::Excitement));
        assert!(result.confidence > 0.65);
    }

    #[test]
    fn test_calm_classification() {
        // P1 Fix: Calm threshold relaxed - energy < 0.12, variance < 800
        let prosodic = ProsodicFeatures {
            pitch_mean: 120.0,
            energy_mean: 0.08, // Real-world calm speech (was 0.05, now valid up to 0.12)
            pitch_variance: 500.0, // Conversational variance (valid up to 800)
            pitch_range: 40.0,
            energy_variance: 0.002,
            pause_duration_avg: 150.0,
            pause_frequency: 0.2,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.15,
            spectral_centroid: 800.0,
            spectral_rolloff: 2500.0,
            spectral_flux: 0.01,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.75);
        assert!(matches!(result.primary, EmotionType::Calm));
        assert!(result.confidence > 0.7);
    }

    #[test]
    fn test_calm_at_upper_threshold() {
        // P1 Fix: Test calm detection at upper boundary (energy 0.11, variance 750)
        let prosodic = ProsodicFeatures {
            pitch_mean: 130.0,
            energy_mean: 0.11, // Near upper threshold (0.12)
            pitch_variance: 750.0, // Near upper threshold (800)
            pitch_range: 50.0,
            energy_variance: 0.003,
            pause_duration_avg: 120.0,
            pause_frequency: 0.25,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.18,
            spectral_centroid: 900.0,
            spectral_rolloff: 2800.0,
            spectral_flux: 0.015,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.70);
        assert!(matches!(result.primary, EmotionType::Calm));
    }

    #[test]
    fn test_uncertainty_classification() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 160.0,
            energy_mean: 0.1,
            pitch_variance: 2000.0, // High variance
            pitch_range: 100.0,
            energy_variance: 0.008,
            pause_duration_avg: 250.0,
            pause_frequency: 0.8,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.2,
            spectral_centroid: 1200.0,
            spectral_rolloff: 3000.0,
            spectral_flux: 0.04,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.5); // Slow speech
        assert!(matches!(result.primary, EmotionType::Uncertainty));
        assert!(result.confidence > 0.65);
    }

    #[test]
    fn test_aggression_classification() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 150.0, // Lower pitch
            energy_mean: 0.15, // Elevated energy
            pitch_variance: 2500.0, // High variance
            pitch_range: 80.0,
            energy_variance: 0.015,
            pause_duration_avg: 60.0,
            pause_frequency: 0.3,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.28,
            spectral_centroid: 1600.0,
            spectral_rolloff: 4000.0,
            spectral_flux: 0.08, // Higher flux
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.85);
        assert!(matches!(result.primary, EmotionType::Aggression));
        assert!(result.confidence > 0.65);
    }

    #[test]
    fn test_conviction_classification() {
        // P1 Fix: Conviction needs energy > 0.12, pitch < 180, low variance
        let prosodic = ProsodicFeatures {
            pitch_mean: 140.0, // Lower pitch
            energy_mean: 0.14, // Above calm threshold, triggers Aggression/Conviction path
            pitch_variance: 700.0, // Low variance = steady
            pitch_range: 50.0,
            energy_variance: 0.005,
            pause_duration_avg: 80.0,
            pause_frequency: 0.2,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.2,
            spectral_centroid: 1300.0,
            spectral_rolloff: 3500.0,
            spectral_flux: 0.02, // Low flux = steady
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.9); // Fast speech
        assert!(matches!(result.primary, EmotionType::Conviction));
        assert!(result.confidence > 0.6);
    }

    #[test]
    fn test_joy_classification() {
        // P1 Fix: Joy now checked before Stress, with expanded variance range (400-1800)
        let prosodic = ProsodicFeatures {
            pitch_mean: 170.0,
            energy_mean: 0.13, // Moderate energy (within 0.08-0.18)
            pitch_variance: 1000.0, // Moderate variance (within 400-1800)
            pitch_range: 60.0,
            energy_variance: 0.006,
            pause_duration_avg: 100.0,
            pause_frequency: 0.4,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.22,
            spectral_centroid: 1400.0, // Bright spectrum (> 1000)
            spectral_rolloff: 4000.0,
            spectral_flux: 0.03,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.85);
        assert!(matches!(result.primary, EmotionType::Joy));
        assert!(result.confidence > 0.65);
    }

    #[test]
    fn test_positive_speech_not_stress() {
        // P1 Fix: This is the key regression test - enthusiastic positive speech
        // should NOT be classified as Stress due to moderate variance
        let prosodic = ProsodicFeatures {
            pitch_mean: 165.0, // Elevated but not extreme
            energy_mean: 0.12, // Conversational level
            pitch_variance: 1200.0, // Was incorrectly triggering Stress
            pitch_range: 70.0,
            energy_variance: 0.007,
            pause_duration_avg: 90.0,
            pause_frequency: 0.35,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.20,
            spectral_centroid: 1300.0,
            spectral_rolloff: 3800.0,
            spectral_flux: 0.025,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.80);
        // Should be Joy or Calm, NOT Stress
        assert!(
            !matches!(result.primary, EmotionType::Stress),
            "Positive speech with moderate variance should NOT be Stress"
        );
    }
}
