//! Prosodic Audio Analysis
//!
//! Speech-specific feature extraction (pitch, energy, pauses).
//!
//! # Features
//!
//! - **Pitch Variance:** Standard deviation of pitch contour
//!   - High variance: Emotional, expressive (excitement, stress, uncertainty)
//!   - Low variance: Monotone, flat (calm, fatigue, depression)
//!
//! - **Pitch Range:** Maximum - Minimum pitch
//!   - Wide range: Expressive, emotional
//!   - Narrow range: Monotone, controlled
//!
//! - **Energy Variance:** Standard deviation of energy contour
//!   - High variance: Dynamic, emphatic (stress, excitement)
//!   - Low variance: Stable, controlled (calm, certainty)
//!
//! - **Pause Duration:** Average pause length (milliseconds)
//!   - Long pauses: Hesitation, thinking (uncertainty, doubt)
//!   - Short pauses: Fluent, confident (certainty, aggression)
//!
//! - **Pause Frequency:** Pauses per second
//!   - High frequency: Fragmented, hesitant (uncertainty, stress)
//!   - Low frequency: Fluent, continuous (calm, conviction)

use crate::vad::VadFrame;

/// VAD frame duration (30ms)
const VAD_FRAME_DURATION_MS: f32 = 30.0;

/// Prosodic features extracted from speech
#[derive(Debug, Clone, Copy)]
pub struct ProsodicFeatures {
    // Mean values (for compatibility with legacy emotion.rs)
    pub pitch_mean: f32,
    pub energy_mean: f32,

    // New prosodic features
    pub pitch_variance: f32,
    pub pitch_range: f32,
    pub energy_variance: f32,
    pub pause_duration_avg: f32,
    pub pause_frequency: f32,
}

/// Prosodic analyzer
pub struct ProsodicAnalyzer {
    sample_rate: u32,
    frame_size: usize,
}

impl ProsodicAnalyzer {
    /// Create a new prosodic analyzer
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            frame_size: 512, // 32ms at 16kHz
        }
    }

    /// Analyze audio samples with VAD frames
    pub fn analyze(&mut self, samples: &[f32], vad_frames: &[VadFrame]) -> ProsodicFeatures {
        if samples.is_empty() {
            return ProsodicFeatures {
                pitch_mean: 0.0,
                energy_mean: 0.0,
                pitch_variance: 0.0,
                pitch_range: 0.0,
                energy_variance: 0.0,
                pause_duration_avg: 0.0,
                pause_frequency: 0.0,
            };
        }

        // Extract pitch and energy contours
        let (pitch_contour, energy_contour) = self.extract_contours(samples);

        // Calculate mean pitch and energy
        let pitch_mean = if !pitch_contour.is_empty() {
            pitch_contour.iter().sum::<f32>() / pitch_contour.len() as f32
        } else {
            0.0
        };

        let energy_mean = if !energy_contour.is_empty() {
            energy_contour.iter().sum::<f32>() / energy_contour.len() as f32
        } else {
            0.0
        };

        // Calculate variance
        let pitch_variance = self.calculate_variance(&pitch_contour, pitch_mean);
        let energy_variance = self.calculate_variance(&energy_contour, energy_mean);

        // Calculate pitch range (single-pass)
        let pitch_range = if !pitch_contour.is_empty() {
            let (min_pitch, max_pitch) = pitch_contour.iter().fold(
                (f32::INFINITY, f32::NEG_INFINITY),
                |(min, max), &val| (min.min(val), max.max(val)),
            );
            max_pitch - min_pitch
        } else {
            0.0
        };

        // Analyze pauses from VAD frames
        let (pause_duration_avg, pause_frequency) = self.analyze_pauses(vad_frames);

        ProsodicFeatures {
            pitch_mean,
            energy_mean,
            pitch_variance,
            pitch_range,
            energy_variance,
            pause_duration_avg,
            pause_frequency,
        }
    }

    /// Extract pitch and energy contours (frame-by-frame)
    fn extract_contours(&self, samples: &[f32]) -> (Vec<f32>, Vec<f32>) {
        let num_frames = samples.len() / self.frame_size;
        if num_frames == 0 {
            return (Vec::new(), Vec::new());
        }

        let mut pitch_contour = Vec::with_capacity(num_frames);
        let mut energy_contour = Vec::with_capacity(num_frames);

        for i in 0..num_frames {
            let start = i * self.frame_size;
            let end = start + self.frame_size;
            let frame = &samples[start..end];

            // Pitch via autocorrelation (more accurate than ZCR)
            if let Some(pitch) = self.estimate_pitch_autocorr(frame) {
                pitch_contour.push(pitch);
            }

            // Energy via RMS
            let energy = self.calculate_rms(frame);
            energy_contour.push(energy);
        }

        (pitch_contour, energy_contour)
    }

    /// Estimate pitch using autocorrelation
    ///
    /// More accurate than zero-crossing rate for voiced speech.
    fn estimate_pitch_autocorr(&self, frame: &[f32]) -> Option<f32> {
        // Pitch detection bounds: Human voice ~40-400 Hz
        // At 16kHz: lag = sample_rate / frequency
        const MIN_LAG: usize = 40;  // 16000/40 = 400 Hz max (soprano/child)
        const MAX_LAG: usize = 400; // 16000/400 = 40 Hz min (bass)

        if frame.len() < MAX_LAG {
            return None;
        }

        // Find autocorrelation peak
        let mut max_corr = 0.0;
        let mut best_lag = 0;

        for lag in MIN_LAG..MAX_LAG.min(frame.len()) {
            let mut corr = 0.0;
            for i in 0..(frame.len() - lag) {
                corr += frame[i] * frame[i + lag];
            }

            if corr > max_corr {
                max_corr = corr;
                best_lag = lag;
            }
        }

        // Only return pitch if correlation is strong enough
        if best_lag > 0 && max_corr > 0.01 {
            Some(self.sample_rate as f32 / best_lag as f32)
        } else {
            None
        }
    }

    /// Calculate RMS energy
    fn calculate_rms(&self, frame: &[f32]) -> f32 {
        if frame.is_empty() {
            return 0.0;
        }

        let sum: f32 = frame.iter().map(|s| s * s).sum();
        (sum / frame.len() as f32).sqrt()
    }

    /// Calculate variance of a signal
    fn calculate_variance(&self, values: &[f32], mean: f32) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        let sum_squared_diff: f32 = values.iter().map(|v| (v - mean).powi(2)).sum();
        sum_squared_diff / values.len() as f32
    }

    /// Analyze pauses from VAD frame classification
    ///
    /// Returns (average pause duration in ms, pause frequency per second)
    fn analyze_pauses(&self, vad_frames: &[VadFrame]) -> (f32, f32) {
        if vad_frames.is_empty() {
            return (0.0, 0.0);
        }

        let mut pauses = Vec::new();
        let mut current_pause_frames = 0;

        for frame in vad_frames {
            match frame {
                VadFrame::Noise => {
                    current_pause_frames += 1;
                }
                VadFrame::Speech(_) => {
                    if current_pause_frames > 0 {
                        pauses.push(current_pause_frames);
                        current_pause_frames = 0;
                    }
                }
            }
        }

        // Add final pause if recording ended during pause
        if current_pause_frames > 0 {
            pauses.push(current_pause_frames);
        }

        if pauses.is_empty() {
            return (0.0, 0.0);
        }

        // Average pause duration (frames * 30ms)
        let avg_duration_ms =
            (pauses.iter().sum::<usize>() as f32 / pauses.len() as f32) * VAD_FRAME_DURATION_MS;

        // Pause frequency (pauses per second)
        let total_duration_sec = (vad_frames.len() as f32) * (VAD_FRAME_DURATION_MS / 1000.0);
        let frequency = if total_duration_sec > 0.0 {
            pauses.len() as f32 / total_duration_sec
        } else {
            0.0
        };

        (avg_duration_ms, frequency)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pitch_variance_monotone() {
        let mut analyzer = ProsodicAnalyzer::new(16000);
        // Generate monotone signal (constant 200 Hz)
        let samples: Vec<f32> = (0..8192)
            .map(|i| (2.0 * std::f32::consts::PI * 200.0 * i as f32 / 16000.0).sin())
            .collect();

        let features = analyzer.analyze(&samples, &[]);
        // Monotone should have low pitch variance
        assert!(
            features.pitch_variance < 100.0,
            "Monotone should have low pitch variance, got {}",
            features.pitch_variance
        );
    }

    #[test]
    fn test_pitch_variance_rising() {
        let mut analyzer = ProsodicAnalyzer::new(16000);
        // Generate rising pitch (100 Hz -> 300 Hz)
        let samples: Vec<f32> = (0..8192)
            .map(|i| {
                let freq = 100.0 + (200.0 * i as f32 / 8192.0);
                (2.0 * std::f32::consts::PI * freq * i as f32 / 16000.0).sin()
            })
            .collect();

        let features = analyzer.analyze(&samples, &[]);
        // Rising pitch should have high variance
        assert!(
            features.pitch_variance > 100.0,
            "Rising pitch should have high variance, got {}",
            features.pitch_variance
        );
    }

    #[test]
    fn test_pause_analysis_no_pauses() {
        let analyzer = ProsodicAnalyzer::new(16000);
        // All speech frames (no pauses)
        let vad_frames: Vec<VadFrame> = (0..100)
            .map(|_| VadFrame::Speech(&[0.5; 480]))
            .collect();

        let (avg_duration, frequency) = analyzer.analyze_pauses(&vad_frames);
        assert_eq!(avg_duration, 0.0, "No pauses should give 0 duration");
        assert_eq!(frequency, 0.0, "No pauses should give 0 frequency");
    }

    #[test]
    fn test_pause_analysis_with_pauses() {
        let analyzer = ProsodicAnalyzer::new(16000);
        // Pattern: 10 speech, 5 pause, 10 speech, 5 pause (2 pauses total)
        let mut vad_frames = Vec::new();
        for _ in 0..10 {
            vad_frames.push(VadFrame::Speech(&[0.5; 480]));
        }
        for _ in 0..5 {
            vad_frames.push(VadFrame::Noise);
        }
        for _ in 0..10 {
            vad_frames.push(VadFrame::Speech(&[0.5; 480]));
        }
        for _ in 0..5 {
            vad_frames.push(VadFrame::Noise);
        }

        let (avg_duration, frequency) = analyzer.analyze_pauses(&vad_frames);
        // 5 frames * 30ms = 150ms average
        assert!(
            (avg_duration - 150.0).abs() < 1.0,
            "Expected ~150ms pause duration, got {}",
            avg_duration
        );
        // 2 pauses in 30 frames = 0.9s -> ~2.22 pauses/sec
        assert!(
            frequency > 2.0 && frequency < 2.5,
            "Expected ~2.2 pauses/sec, got {}",
            frequency
        );
    }

    #[test]
    fn test_energy_contour() {
        let mut analyzer = ProsodicAnalyzer::new(16000);
        // Generate signal with varying amplitude
        let samples: Vec<f32> = (0..8192)
            .map(|i| {
                let amp = 0.2 + 0.8 * (i as f32 / 8192.0);
                amp * (2.0 * std::f32::consts::PI * 200.0 * i as f32 / 16000.0).sin()
            })
            .collect();

        let features = analyzer.analyze(&samples, &[]);
        // Rising amplitude should have non-zero energy variance
        assert!(
            features.energy_variance > 0.0,
            "Rising amplitude should have positive energy variance"
        );
    }
}
