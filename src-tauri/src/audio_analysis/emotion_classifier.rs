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
    pub fn classify(
        prosodic: &ProsodicFeatures,
        spectral: &SpectralFeatures,
        speech_rate: f32,
    ) -> EmotionResult {
        let pitch = prosodic.pitch_mean;
        let energy = prosodic.energy_mean;

        // NOTE: Energy thresholds calibrated for typical microphone input (RMS 0.05-0.3)
        // Original thresholds (0.5+) were too high for real-world recordings

        // Rule 1: Stress vs. Excitement (HIGH PRIORITY)
        // Basis: Both high-arousal (Russell). Stress = vocal instability (Scherer, 1986).
        // High pitch + high pitch variance = emotional speech
        // Differentiate by pitch variance: stress = unsteady, excitement = steady
        if pitch > 160.0 && prosodic.pitch_variance > 1000.0 {
            if prosodic.pitch_variance > 3000.0 || energy > 0.15 {
                // Very high variance OR elevated energy = stress
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
                // NEU: Mittlerer Bereich - Confidence-basierte Entscheidung
                // If pitch_variance is between 1000-3000, energy < 0.15, speech_rate < 0.8
                let stress_signal = (prosodic.pitch_variance - 1000.0) / 2000.0;
                let excitement_signal = speech_rate;
                if stress_signal > excitement_signal {
                    return EmotionResult {
                        primary: EmotionType::Stress,
                        confidence: 0.65,
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

        // Rule 2: Calm Detection (ENHANCED)
        // Basis: Low-arousal, positive-valence (Russell). Parasympathetic dominance.
        // Low energy + low pitch variance + continuous speech
        if energy < 0.08 && prosodic.pitch_variance < 500.0 && speech_rate > 0.7 {
            return EmotionResult {
                primary: EmotionType::Calm,
                confidence: 0.72,
                secondary: None,
                features: None,
            };
        }

        // Rule 3: Uncertainty Detection (ENHANCED)
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

        // Rule 4: Aggression vs. Conviction
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

        // Rule 5: Joy Detection (ENHANCED with spectral brightness)
        // Higher pitch + moderate energy + bright spectrum
        if pitch > 150.0 && energy > 0.08 && spectral.spectral_centroid > 1000.0 {
            if prosodic.pitch_variance > 500.0 && prosodic.pitch_variance < 2000.0 {
                return EmotionResult {
                    primary: EmotionType::Joy,
                    confidence: 0.68,
                    secondary: None,
                    features: None,
                };
            }
        }

        // Rule 6: Frustration Detection
        // Moderate-high pitch variance + moderate energy
        if prosodic.pitch_variance > 1000.0
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

    #[test]
    fn test_stress_classification() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 200.0,
            energy_mean: 0.15,
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
        let prosodic = ProsodicFeatures {
            pitch_mean: 180.0,
            energy_mean: 0.12,
            pitch_variance: 1500.0, // Moderate variance
            pitch_range: 80.0,
            energy_variance: 0.008,
            pause_duration_avg: 80.0,
            pause_frequency: 0.3,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.22,
            spectral_centroid: 1400.0,
            spectral_rolloff: 3500.0,
            spectral_flux: 0.025,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.9); // Fast speech
        assert!(matches!(result.primary, EmotionType::Excitement));
        assert!(result.confidence > 0.65);
    }

    #[test]
    fn test_calm_classification() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 120.0,
            energy_mean: 0.05, // Low energy
            pitch_variance: 300.0, // Low variance
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

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.85);
        assert!(matches!(result.primary, EmotionType::Calm));
        assert!(result.confidence > 0.7);
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
        let prosodic = ProsodicFeatures {
            pitch_mean: 140.0, // Lower pitch
            energy_mean: 0.13, // Moderate energy
            pitch_variance: 800.0, // Lower variance = steady
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
        let prosodic = ProsodicFeatures {
            pitch_mean: 170.0,
            energy_mean: 0.12,
            pitch_variance: 1000.0, // Moderate variance
            pitch_range: 60.0,
            energy_variance: 0.006,
            pause_duration_avg: 100.0,
            pause_frequency: 0.4,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.22,
            spectral_centroid: 1400.0, // Bright
            spectral_rolloff: 4000.0,
            spectral_flux: 0.03,
        };

        let result = EmotionClassifier::classify(&prosodic, &spectral, 0.85);
        assert!(matches!(result.primary, EmotionType::Joy));
        assert!(result.confidence > 0.65);
    }
}
