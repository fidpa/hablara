//! Tone Classification from Audio Features
//!
//! 5-dimensional communication style analysis (1-5 scale):
//! - **Formality:** Casual (1) to Formal (5)
//! - **Professionalism:** Personal (1) to Professional (5)
//! - **Directness:** Indirect (1) to Direct (5)
//! - **Energy:** Calm (1) to Energetic (5)
//! - **Seriousness:** Light (1) to Serious (5)
//!
//! # Feature Mapping
//!
//! - **Formality:** Low pitch variance + slow speech = formal, high variance + fast = casual
//! - **Professionalism:** Low energy variance = stable/professional, high variance = dynamic/personal
//! - **Directness:** Short pauses = direct, long pauses = indirect/thoughtful
//! - **Energy:** High energy + bright spectrum = energetic, low = calm
//! - **Seriousness:** Low pitch = serious/authoritative, high pitch = light/casual

use super::prosodic::ProsodicFeatures;
use super::spectral::SpectralFeatures;
use serde::{Deserialize, Serialize};

/// Tone analysis result with 5 dimensions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToneResult {
    pub formality: u8,       // 1-5 (1=casual, 5=formal)
    pub professionalism: u8, // 1-5 (1=personal, 5=professional)
    pub directness: u8,      // 1-5 (1=indirect, 5=direct)
    pub energy: u8,          // 1-5 (1=calm, 5=energetic)
    pub seriousness: u8,     // 1-5 (1=light, 5=serious)
    pub confidence: f32,     // 0.0-1.0 (overall confidence)
}

/// Tone classifier using 12 audio features
pub struct ToneClassifier;

impl ToneClassifier {
    /// Classify communication style from audio features
    ///
    /// # Arguments
    /// * `prosodic` - Prosodic features (pitch, energy, pauses)
    /// * `spectral` - Spectral features (ZCR, centroid, rolloff, flux)
    /// * `speech_rate` - Speech duration / total duration
    ///
    /// # Returns
    /// ToneResult with 5 dimensions (1-5 scale) + confidence
    pub fn classify(
        prosodic: &ProsodicFeatures,
        spectral: &SpectralFeatures,
        speech_rate: f32,
    ) -> ToneResult {
        // Extract formality score
        let formality = Self::score_formality(prosodic, speech_rate);

        // Extract professionalism score
        let professionalism = Self::score_professionalism(prosodic);

        // Extract directness score
        let directness = Self::score_directness(prosodic);

        // Extract energy score
        let energy = Self::score_energy(prosodic, spectral);

        // Extract seriousness score
        let seriousness = Self::score_seriousness(prosodic);

        // Calculate overall confidence (average consistency of features)
        let confidence = Self::calculate_confidence(prosodic, spectral, speech_rate);

        ToneResult {
            formality,
            professionalism,
            directness,
            energy,
            seriousness,
            confidence,
        }
    }

    /// Score formality (1=casual, 5=formal)
    ///
    /// Indicators:
    /// - Low pitch variance = monotone = formal
    /// - High pitch variance = expressive = casual
    /// - Slow speech rate = deliberate = formal
    ///
    /// Calibration:
    /// - <500 Hz variance: Lecture/newsreader (controlled)
    /// - 500-1000 Hz: Professional presentation
    /// - 1000-2000 Hz: Conversational baseline
    /// - >2000 Hz: Expressive/casual
    fn score_formality(prosodic: &ProsodicFeatures, speech_rate: f32) -> u8 {
        let pitch_variance = prosodic.pitch_variance;

        // Variance-based scoring (inverted: low variance = high formality)
        let variance_score = if pitch_variance < 500.0 {
            5 // Very low variance = very formal
        } else if pitch_variance < 1000.0 {
            4 // Low variance = formal
        } else if pitch_variance < 2000.0 {
            3 // Moderate variance = neutral
        } else if pitch_variance < 3500.0 {
            2 // High variance = casual
        } else {
            1 // Very high variance = very casual
        };

        // Speech rate adjustment (-1 if fast, +1 if slow)
        let speed_adjustment = if speech_rate > 0.85 {
            -1 // Fast speech = more casual
        } else if speech_rate < 0.6 {
            1 // Slow speech = more formal
        } else {
            0
        };

        // Clamp to 1-5 range
        ((variance_score as i8 + speed_adjustment).max(1).min(5)) as u8
    }

    /// Score professionalism (1=personal, 5=professional)
    ///
    /// Indicators:
    /// - Low energy variance = stable/controlled = professional
    /// - High energy variance = dynamic/emotional = personal
    ///
    /// Calibration:
    /// - <0.005: Very stable (broadcast-quality)
    /// - 0.005-0.01: Controlled (business meeting)
    /// - 0.01-0.02: Moderate (casual conversation)
    /// - >0.02: Dynamic (storytelling/emotional)
    fn score_professionalism(prosodic: &ProsodicFeatures) -> u8 {
        let energy_variance = prosodic.energy_variance;

        // Variance-based scoring (inverted: low variance = high professionalism)
        if energy_variance < 0.005 {
            5 // Very stable = very professional
        } else if energy_variance < 0.01 {
            4 // Stable = professional
        } else if energy_variance < 0.02 {
            3 // Moderate = neutral
        } else if energy_variance < 0.04 {
            2 // Dynamic = personal
        } else {
            1 // Very dynamic = very personal
        }
    }

    /// Score directness (1=indirect, 5=direct)
    ///
    /// Indicators:
    /// - Short pauses = fluent = direct
    /// - Long pauses = thoughtful/hesitant = indirect
    /// - Low pause frequency = continuous = direct
    ///
    /// Calibration:
    /// - <100ms: Very fluent (no hesitation)
    /// - 100-200ms: Normal (planned speech)
    /// - 200-400ms: Thoughtful (deliberate pauses)
    /// - >400ms: Hesitant (uncertainty/search for words)
    fn score_directness(prosodic: &ProsodicFeatures) -> u8 {
        let pause_duration = prosodic.pause_duration_avg;
        let pause_frequency = prosodic.pause_frequency;

        // Duration-based scoring (inverted: short pauses = high directness)
        let duration_score = if pause_duration < 100.0 {
            5 // Very short = very direct
        } else if pause_duration < 200.0 {
            4 // Short = direct
        } else if pause_duration < 400.0 {
            3 // Moderate = neutral
        } else if pause_duration < 700.0 {
            2 // Long = indirect
        } else {
            1 // Very long = very indirect
        };

        // Frequency adjustment (-1 if high frequency, +1 if low)
        let frequency_adjustment = if pause_frequency > 0.8 {
            -1 // Many pauses = more indirect
        } else if pause_frequency < 0.3 {
            1 // Few pauses = more direct
        } else {
            0
        };

        // Clamp to 1-5 range
        ((duration_score as i8 + frequency_adjustment).max(1).min(5)) as u8
    }

    /// Score energy (1=calm, 5=energetic)
    ///
    /// Indicators:
    /// - High energy + high spectral centroid = energetic
    /// - Low energy + low spectral centroid = calm
    fn score_energy(prosodic: &ProsodicFeatures, spectral: &SpectralFeatures) -> u8 {
        let energy_mean = prosodic.energy_mean;
        let spectral_centroid = spectral.spectral_centroid;

        // Energy-based scoring
        let energy_score = if energy_mean < 0.05 {
            1 // Very low energy
        } else if energy_mean < 0.08 {
            2 // Low energy
        } else if energy_mean < 0.12 {
            3 // Moderate energy
        } else if energy_mean < 0.18 {
            4 // High energy
        } else {
            5 // Very high energy
        };

        // Spectral brightness adjustment (+1 if bright, -1 if dark)
        let brightness_adjustment = if spectral_centroid > 1500.0 {
            1 // Bright = more energetic
        } else if spectral_centroid < 800.0 {
            -1 // Dark = less energetic
        } else {
            0
        };

        // Clamp to 1-5 range
        ((energy_score as i8 + brightness_adjustment).max(1).min(5)) as u8
    }

    /// Score seriousness (1=light, 5=serious)
    ///
    /// Indicators:
    /// - Low pitch = serious/authoritative
    /// - High pitch = light/casual
    /// - Low pitch variance = controlled = serious
    fn score_seriousness(prosodic: &ProsodicFeatures) -> u8 {
        let pitch_mean = prosodic.pitch_mean;
        let pitch_variance = prosodic.pitch_variance;

        // Pitch-based scoring (inverted: low pitch = high seriousness)
        let pitch_score = if pitch_mean < 110.0 {
            5 // Very low pitch = very serious
        } else if pitch_mean < 130.0 {
            4 // Low pitch = serious
        } else if pitch_mean < 160.0 {
            3 // Moderate pitch = neutral
        } else if pitch_mean < 190.0 {
            2 // High pitch = light
        } else {
            1 // Very high pitch = very light
        };

        // Variance adjustment (-1 if high variance = playful)
        let variance_adjustment = if pitch_variance > 2000.0 {
            -1 // High variance = more light/playful
        } else if pitch_variance < 500.0 {
            1 // Low variance = more serious/controlled
        } else {
            0
        };

        // Clamp to 1-5 range
        ((pitch_score as i8 + variance_adjustment).max(1).min(5)) as u8
    }

    /// Calculate overall confidence based on feature consistency
    ///
    /// Higher confidence when:
    /// - Features are within expected ranges
    /// - Speech rate is moderate (not too fast/slow = reliable features)
    /// - Energy is not too low (reliable pitch extraction)
    fn calculate_confidence(
        prosodic: &ProsodicFeatures,
        spectral: &SpectralFeatures,
        speech_rate: f32,
    ) -> f32 {
        let mut confidence: f32 = 0.6; // Base confidence

        // Boost if speech rate is moderate (more reliable features)
        if speech_rate > 0.5 && speech_rate < 0.95 {
            confidence += 0.1;
        }

        // Boost if energy is sufficient (reliable pitch extraction)
        if prosodic.energy_mean > 0.05 {
            confidence += 0.1;
        }

        // Boost if spectral features are non-zero (valid FFT)
        if spectral.spectral_centroid > 0.0 && spectral.spectral_rolloff > 0.0 {
            confidence += 0.1;
        }

        // Penalty if pitch is zero (unreliable features)
        if prosodic.pitch_mean < 50.0 {
            confidence -= 0.1;
        }

        // Clamp to 0.0-1.0
        confidence.max(0.0).min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test Case 1: Formal communication (monotone, slow, stable)
    #[test]
    fn test_formal_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 120.0,
            energy_mean: 0.08,
            pitch_variance: 300.0, // Very low variance = formal
            pitch_range: 40.0,
            energy_variance: 0.003, // Stable
            pause_duration_avg: 150.0,
            pause_frequency: 0.3,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.15,
            spectral_centroid: 900.0,
            spectral_rolloff: 2500.0,
            spectral_flux: 0.01,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.7); // Moderate speed

        assert!(
            result.formality >= 4,
            "Expected high formality (>=4), got {}",
            result.formality
        );
        assert!(
            result.professionalism >= 4,
            "Expected high professionalism (>=4), got {}",
            result.professionalism
        );
        assert!(result.confidence > 0.7, "Expected confidence > 0.7");
    }

    // Test Case 2: Casual communication (expressive, fast, dynamic)
    #[test]
    fn test_casual_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 180.0,
            energy_mean: 0.14,
            pitch_variance: 3000.0, // High variance = casual
            pitch_range: 120.0,
            energy_variance: 0.03, // Dynamic
            pause_duration_avg: 80.0,
            pause_frequency: 0.5,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.22,
            spectral_centroid: 1400.0,
            spectral_rolloff: 3500.0,
            spectral_flux: 0.04,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.9); // Fast speech

        assert!(
            result.formality <= 2,
            "Expected low formality (<=2), got {}",
            result.formality
        );
        assert!(
            result.professionalism <= 2,
            "Expected low professionalism (<=2), got {}",
            result.professionalism
        );
        assert!(
            result.energy >= 4,
            "Expected high energy (>=4), got {}",
            result.energy
        );
    }

    // Test Case 3: Direct communication (short pauses, fluent)
    #[test]
    fn test_direct_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 150.0,
            energy_mean: 0.11,
            pitch_variance: 800.0,
            pitch_range: 60.0,
            energy_variance: 0.008,
            pause_duration_avg: 80.0, // Short pauses
            pause_frequency: 0.2,     // Low frequency
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.2,
            spectral_centroid: 1200.0,
            spectral_rolloff: 3000.0,
            spectral_flux: 0.02,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.85);

        assert!(
            result.directness >= 4,
            "Expected high directness (>=4), got {}",
            result.directness
        );
    }

    // Test Case 4: High energy communication (loud, bright)
    #[test]
    fn test_high_energy_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 170.0,
            energy_mean: 0.18, // High energy
            pitch_variance: 1500.0,
            pitch_range: 90.0,
            energy_variance: 0.012,
            pause_duration_avg: 100.0,
            pause_frequency: 0.4,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.24,
            spectral_centroid: 1800.0, // Bright spectrum
            spectral_rolloff: 4500.0,
            spectral_flux: 0.05,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.85);

        assert!(
            result.energy >= 4,
            "Expected high energy (>=4), got {}",
            result.energy
        );
    }

    // Test Case 5: Serious communication (low pitch, controlled)
    #[test]
    fn test_serious_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 110.0, // Low pitch
            energy_mean: 0.09,
            pitch_variance: 400.0, // Low variance
            pitch_range: 45.0,
            energy_variance: 0.005,
            pause_duration_avg: 180.0,
            pause_frequency: 0.25,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.16,
            spectral_centroid: 850.0,
            spectral_rolloff: 2200.0,
            spectral_flux: 0.015,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.75);

        assert!(
            result.seriousness >= 4,
            "Expected high seriousness (>=4), got {}",
            result.seriousness
        );
    }

    // Test Case 6: Neutral/balanced tone
    #[test]
    fn test_neutral_tone() {
        let prosodic = ProsodicFeatures {
            pitch_mean: 140.0,
            energy_mean: 0.10,
            pitch_variance: 1200.0,
            pitch_range: 70.0,
            energy_variance: 0.012,
            pause_duration_avg: 250.0,
            pause_frequency: 0.5,
        };

        let spectral = SpectralFeatures {
            zcr_mean: 0.2,
            spectral_centroid: 1100.0,
            spectral_rolloff: 2800.0,
            spectral_flux: 0.025,
        };

        let result = ToneClassifier::classify(&prosodic, &spectral, 0.75);

        // All dimensions should be near middle (2-4 range)
        assert!(result.formality >= 2 && result.formality <= 4);
        assert!(result.professionalism >= 2 && result.professionalism <= 4);
        assert!(result.directness >= 2 && result.directness <= 4);
        assert!(result.energy >= 2 && result.energy <= 4);
        assert!(result.seriousness >= 2 && result.seriousness <= 4);
    }
}
