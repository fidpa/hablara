//! Spectral Audio Analysis
//!
//! FFT-based feature extraction for emotion detection.
//!
//! # Features
//!
//! - **Zero-Crossing Rate (ZCR):** Measures how often the signal crosses zero
//!   - High ZCR: Noisy/unvoiced sounds (fricatives, breathy speech)
//!   - Low ZCR: Tonal/voiced sounds (vowels, sustained speech)
//!
//! - **Spectral Centroid:** "Center of mass" of the spectrum (brightness)
//!   - High centroid: Bright, high-frequency emphasis (excitement, stress)
//!   - Low centroid: Dark, low-frequency emphasis (calm, sadness)
//!
//! - **Spectral Rolloff:** Frequency below which 85% of energy lies
//!   - High rolloff: More high-frequency content
//!   - Low rolloff: More low-frequency content
//!
//! - **Spectral Flux:** Rate of change in spectrum (roughness/instability)
//!   - High flux: Rapidly changing (agitation, stress)
//!   - Low flux: Stable (calm, monotone)

use std::f32::consts::PI;

/// FFT size for spectral analysis (512 samples = 32ms at 16kHz)
const FFT_SIZE: usize = 512;

/// Spectral features extracted from audio
#[derive(Debug, Clone, Copy)]
pub struct SpectralFeatures {
    pub zcr_mean: f32,
    pub spectral_centroid: f32,
    pub spectral_rolloff: f32,
    pub spectral_flux: f32,
}

/// Spectral analyzer using FFT
pub struct SpectralAnalyzer {
    sample_rate: u32,
    fft_size: usize,
    prev_spectrum: Vec<f32>,
}

impl SpectralAnalyzer {
    /// Create a new spectral analyzer
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            fft_size: FFT_SIZE,
            prev_spectrum: vec![0.0; FFT_SIZE / 2],
        }
    }

    /// Analyze audio samples and extract spectral features
    pub fn analyze(&mut self, samples: &[f32]) -> SpectralFeatures {
        if samples.is_empty() {
            return SpectralFeatures {
                zcr_mean: 0.0,
                spectral_centroid: 0.0,
                spectral_rolloff: 0.0,
                spectral_flux: 0.0,
            };
        }

        // Calculate ZCR (time-domain, no FFT needed)
        let zcr_mean = self.calculate_zcr_mean(samples);

        // For FFT-based features, process in frames
        let num_frames = samples.len() / self.fft_size;
        if num_frames == 0 {
            // Not enough samples for FFT, return ZCR only
            return SpectralFeatures {
                zcr_mean,
                spectral_centroid: 0.0,
                spectral_rolloff: 0.0,
                spectral_flux: 0.0,
            };
        }

        let mut centroids = Vec::new();
        let mut rolloffs = Vec::new();
        let mut fluxes = Vec::new();

        for i in 0..num_frames {
            let start = i * self.fft_size;
            let end = start + self.fft_size;
            let frame = &samples[start..end];

            // Compute magnitude spectrum
            let spectrum = self.compute_magnitude_spectrum(frame);

            // Spectral Centroid
            let centroid = self.spectral_centroid(&spectrum);
            centroids.push(centroid);

            // Spectral Rolloff
            let rolloff = self.spectral_rolloff(&spectrum);
            rolloffs.push(rolloff);

            // Spectral Flux (change from previous frame)
            let flux = self.spectral_flux(&spectrum, &self.prev_spectrum);
            fluxes.push(flux);

            // Store for next frame
            self.prev_spectrum = spectrum;
        }

        // Average over all frames
        let spectral_centroid = centroids.iter().sum::<f32>() / centroids.len() as f32;
        let spectral_rolloff = rolloffs.iter().sum::<f32>() / rolloffs.len() as f32;
        let spectral_flux = fluxes.iter().sum::<f32>() / fluxes.len() as f32;

        SpectralFeatures {
            zcr_mean,
            spectral_centroid,
            spectral_rolloff,
            spectral_flux,
        }
    }

    /// Calculate Zero-Crossing Rate (normalized)
    ///
    /// Returns value in range [0.0, 1.0]
    fn calculate_zcr_mean(&self, samples: &[f32]) -> f32 {
        if samples.len() < 2 {
            return 0.0;
        }

        let mut crossings = 0;
        for i in 1..samples.len() {
            if (samples[i] >= 0.0 && samples[i - 1] < 0.0)
                || (samples[i] < 0.0 && samples[i - 1] >= 0.0)
            {
                crossings += 1;
            }
        }

        // Normalize by max possible crossings (every sample = 0.5)
        (crossings as f32) / ((samples.len() - 1) as f32)
    }

    /// Compute magnitude spectrum via simple DFT
    ///
    /// Returns magnitude spectrum (first half, positive frequencies)
    ///
    /// Note: Using simple DFT instead of full FFT library to avoid
    /// additional dependencies. Performance is acceptable for 512-sample frames.
    fn compute_magnitude_spectrum(&self, frame: &[f32]) -> Vec<f32> {
        let n = frame.len();
        let mut spectrum = vec![0.0; n / 2];

        // Apply Hamming window to reduce spectral leakage
        let windowed: Vec<f32> = frame
            .iter()
            .enumerate()
            .map(|(i, &sample)| {
                let window = 0.54 - 0.46 * (2.0 * PI * i as f32 / (n - 1) as f32).cos();
                sample * window
            })
            .collect();

        // Compute DFT for positive frequencies only
        for k in 0..n / 2 {
            let mut real = 0.0;
            let mut imag = 0.0;

            for (i, &sample) in windowed.iter().enumerate() {
                let angle = -2.0 * PI * (k as f32) * (i as f32) / (n as f32);
                real += sample * angle.cos();
                imag += sample * angle.sin();
            }

            // Magnitude
            spectrum[k] = (real * real + imag * imag).sqrt();
        }

        spectrum
    }

    /// Calculate Spectral Centroid (brightness)
    ///
    /// Returns frequency in Hz
    fn spectral_centroid(&self, spectrum: &[f32]) -> f32 {
        let mut weighted_sum = 0.0;
        let mut magnitude_sum = 0.0;

        for (k, &magnitude) in spectrum.iter().enumerate() {
            let freq = (k as f32) * (self.sample_rate as f32) / (2.0 * spectrum.len() as f32);
            weighted_sum += freq * magnitude;
            magnitude_sum += magnitude;
        }

        if magnitude_sum > 0.0 {
            weighted_sum / magnitude_sum
        } else {
            0.0
        }
    }

    /// Calculate Spectral Rolloff (85% energy threshold)
    ///
    /// Returns frequency in Hz below which 85% of energy lies
    fn spectral_rolloff(&self, spectrum: &[f32]) -> f32 {
        const ROLLOFF_THRESHOLD: f32 = 0.85;

        // Total energy
        let total_energy: f32 = spectrum.iter().map(|m| m * m).sum();
        let threshold_energy = ROLLOFF_THRESHOLD * total_energy;

        // Find frequency where cumulative energy exceeds threshold
        let mut cumulative_energy = 0.0;
        for (k, &magnitude) in spectrum.iter().enumerate() {
            cumulative_energy += magnitude * magnitude;
            if cumulative_energy >= threshold_energy {
                return (k as f32) * (self.sample_rate as f32) / (2.0 * spectrum.len() as f32);
            }
        }

        // If not found, return Nyquist frequency
        (self.sample_rate / 2) as f32
    }

    /// Calculate Spectral Flux (frame-to-frame change)
    ///
    /// Returns normalized flux value
    fn spectral_flux(&self, spectrum: &[f32], prev_spectrum: &[f32]) -> f32 {
        if spectrum.len() != prev_spectrum.len() {
            return 0.0;
        }

        let mut flux = 0.0;
        for (curr, prev) in spectrum.iter().zip(prev_spectrum.iter()) {
            let diff = curr - prev;
            flux += diff * diff;
        }

        // Normalize by spectrum length
        (flux / spectrum.len() as f32).sqrt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zcr_silence() {
        let mut analyzer = SpectralAnalyzer::new(16000);
        let silence = vec![0.0; 1000];

        let features = analyzer.analyze(&silence);
        assert_eq!(features.zcr_mean, 0.0, "Silence should have ZCR = 0");
    }

    #[test]
    fn test_zcr_square_wave() {
        let mut analyzer = SpectralAnalyzer::new(16000);
        // Square wave: alternating +1/-1 (maximum crossings)
        let square_wave: Vec<f32> = (0..1000).map(|i| if i % 2 == 0 { 1.0 } else { -1.0 }).collect();

        let features = analyzer.analyze(&square_wave);
        assert!(
            features.zcr_mean > 0.9,
            "Square wave should have ZCR > 0.9, got {}",
            features.zcr_mean
        );
    }

    #[test]
    fn test_spectral_centroid_pure_tone() {
        let mut analyzer = SpectralAnalyzer::new(16000);
        // Pure 440 Hz tone (A4)
        let tone: Vec<f32> = (0..1024)
            .map(|i| (2.0 * PI * 440.0 * i as f32 / 16000.0).sin())
            .collect();

        let features = analyzer.analyze(&tone);
        // Centroid should be near 440 Hz for pure tone
        assert!(
            (features.spectral_centroid - 440.0).abs() < 100.0,
            "Pure 440Hz tone should have centroid near 440Hz, got {}",
            features.spectral_centroid
        );
    }

    #[test]
    fn test_spectral_rolloff_threshold() {
        let mut analyzer = SpectralAnalyzer::new(16000);
        // White noise has flat spectrum
        let noise: Vec<f32> = (0..1024).map(|i| ((i * 7) % 17) as f32 / 17.0 - 0.5).collect();

        let features = analyzer.analyze(&noise);
        // Rolloff should be in upper half of spectrum for white noise
        assert!(
            features.spectral_rolloff > 4000.0,
            "White noise should have high rolloff, got {}",
            features.spectral_rolloff
        );
    }

    #[test]
    fn test_spectral_flux_stable_vs_changing() {
        let mut analyzer1 = SpectralAnalyzer::new(16000);
        let mut analyzer2 = SpectralAnalyzer::new(16000);

        // Stable signal: same frequency throughout
        let stable: Vec<f32> = (0..2048)
            .map(|i| (2.0 * PI * 300.0 * i as f32 / 16000.0).sin())
            .collect();

        // Changing signal: frequency sweep 100Hz -> 500Hz
        let changing: Vec<f32> = (0..2048)
            .map(|i| {
                let freq = 100.0 + (400.0 * i as f32 / 2048.0);
                (2.0 * PI * freq * i as f32 / 16000.0).sin()
            })
            .collect();

        let stable_features = analyzer1.analyze(&stable);
        let changing_features = analyzer2.analyze(&changing);

        // Changing signal should have higher flux than stable signal
        assert!(
            changing_features.spectral_flux > stable_features.spectral_flux,
            "Changing signal flux ({}) should be > stable signal flux ({})",
            changing_features.spectral_flux,
            stable_features.spectral_flux
        );
    }
}
