//! Audio Analysis Module
//!
//! Enhanced audio feature extraction for emotion detection.
//! Combines spectral and prosodic features for robust classification.
//!
//! # Architecture
//!
//! ```text
//! AudioAnalyzer (Orchestrator)
//!     ├─► SpectralAnalyzer (FFT-based features)
//!     │   ├─ Zero-Crossing Rate
//!     │   ├─ Spectral Centroid (brightness)
//!     │   ├─ Spectral Rolloff (high-freq cutoff)
//!     │   └─ Spectral Flux (change rate)
//!     │
//!     ├─► ProsodicAnalyzer (Speech-based features)
//!     │   ├─ Pitch Variance & Range
//!     │   ├─ Energy Variance
//!     │   └─ Pause Analysis (duration, frequency)
//!     │
//!     └─► EmotionClassifier (12-feature rules)
//!         └─ 10 emotion types with secondary emotions
//! ```
//!
//! # Usage
//!
//! ```rust,ignore
//! use crate::audio_analysis::AudioAnalyzer;
//! use crate::vad::VadFrame;
//!
//! let mut analyzer = AudioAnalyzer::new(16000);
//! let vad_frames: Vec<VadFrame> = vec![];
//! let samples: Vec<f32> = vec![0.0; 16000];
//! let (features, emotion) = analyzer.analyze_full(&samples, &vad_frames, 1.0, 1.0);
//! ```

mod spectral;
mod prosodic;
mod emotion_classifier;
mod tone;

pub use spectral::SpectralAnalyzer;
pub use prosodic::ProsodicAnalyzer;
pub use emotion_classifier::EmotionClassifier;
pub use tone::{ToneClassifier, ToneResult};

use crate::audio::AudioFeatures;
use crate::emotion::EmotionResult;
use crate::vad::VadFrame;

/// Orchestrator for comprehensive audio analysis
///
/// Combines spectral and prosodic analysis to extract 12 features
/// for high-accuracy emotion detection.
pub struct AudioAnalyzer {
    spectral: SpectralAnalyzer,
    prosodic: ProsodicAnalyzer,
    #[allow(dead_code)]
    sample_rate: u32,
}

impl AudioAnalyzer {
    /// Create a new AudioAnalyzer
    ///
    /// # Arguments
    /// * `sample_rate` - Audio sample rate (typically 16000 Hz)
    pub fn new(sample_rate: u32) -> Self {
        Self {
            spectral: SpectralAnalyzer::new(sample_rate),
            prosodic: ProsodicAnalyzer::new(sample_rate),
            sample_rate,
        }
    }

    /// Perform comprehensive audio analysis
    ///
    /// # Arguments
    /// * `samples` - Audio samples (16kHz mono, VAD-filtered)
    /// * `vad_frames` - VAD frame classification for pause analysis
    ///
    /// # Returns
    /// Tuple of (AudioFeatures with 12 fields, EmotionResult)
    pub fn analyze_full(
        &mut self,
        samples: &[f32],
        vad_frames: &[VadFrame],
        speech_duration: f32,
        total_duration: f32,
    ) -> (AudioFeatures, EmotionResult) {
        if samples.is_empty() {
            return (
                AudioFeatures {
                    pitch: 0.0,
                    energy: 0.0,
                    speech_rate: 1.0,
                    mfcc: vec![0.0; 13],
                    pitch_variance: 0.0,
                    pitch_range: 0.0,
                    energy_variance: 0.0,
                    pause_duration_avg: 0.0,
                    pause_frequency: 0.0,
                    zcr_mean: 0.0,
                    spectral_centroid: 0.0,
                    spectral_rolloff: 0.0,
                    spectral_flux: 0.0,
                },
                EmotionResult {
                    primary: crate::emotion::EmotionType::Neutral,
                    confidence: 0.5,
                    secondary: None,
                    features: None,
                },
            );
        }

        // Extract prosodic features (pitch, energy, pauses)
        let prosodic = self.prosodic.analyze(samples, vad_frames);

        // Extract spectral features (FFT-based)
        let spectral = self.spectral.analyze(samples);

        // Calculate speech rate from VAD timing
        let speech_rate = if total_duration > 0.0 {
            speech_duration / total_duration
        } else {
            1.0
        };

        // Build extended AudioFeatures
        let features = AudioFeatures {
            // Legacy features (3)
            pitch: prosodic.pitch_mean,
            energy: prosodic.energy_mean,
            speech_rate,
            mfcc: vec![0.0; 13], // Placeholder

            // New prosodic features (5)
            pitch_variance: prosodic.pitch_variance,
            pitch_range: prosodic.pitch_range,
            energy_variance: prosodic.energy_variance,
            pause_duration_avg: prosodic.pause_duration_avg,
            pause_frequency: prosodic.pause_frequency,

            // New spectral features (4)
            zcr_mean: spectral.zcr_mean,
            spectral_centroid: spectral.spectral_centroid,
            spectral_rolloff: spectral.spectral_rolloff,
            spectral_flux: spectral.spectral_flux,
        };

        // Classify emotion using 12-feature rules
        let emotion = EmotionClassifier::classify(&prosodic, &spectral, speech_rate);

        tracing::debug!(
            pitch = %format!("{:.1}", features.pitch),
            energy = %format!("{:.3}", features.energy),
            speech_rate = %format!("{:.2}", features.speech_rate),
            pitch_var = %format!("{:.1}", features.pitch_variance),
            zcr = %format!("{:.3}", features.zcr_mean),
            "AudioAnalyzer: Features extracted"
        );

        (features, emotion)
    }
}
