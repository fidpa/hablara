//! Silero VAD Implementation
//!
//! Wrapper around vad-rs for Silero V4 model inference.

use anyhow::Result;
use std::path::Path;
use vad_rs::Vad;

use super::{VadFrame, VoiceActivityDetector, VAD_FRAME_SIZE, WHISPER_SAMPLE_RATE};

/// Silero VAD wrapper
pub struct SileroVad {
    engine: Vad,
    threshold: f32,
}

impl SileroVad {
    /// Create a new SileroVad instance
    ///
    /// # Arguments
    /// * `model_path` - Path to silero_vad_v4.onnx model
    /// * `threshold` - Speech probability threshold (0.0-1.0, recommended: 0.3)
    pub fn new<P: AsRef<Path>>(model_path: P, threshold: f32) -> Result<Self> {
        if !(0.0..=1.0).contains(&threshold) {
            anyhow::bail!("threshold must be between 0.0 and 1.0");
        }

        let engine = Vad::new(&model_path, WHISPER_SAMPLE_RATE as usize)
            .map_err(|e| anyhow::anyhow!("Failed to create VAD: {e}"))?;

        Ok(Self { engine, threshold })
    }
}

impl VoiceActivityDetector for SileroVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
        if frame.len() != VAD_FRAME_SIZE {
            anyhow::bail!(
                "expected {} samples (30ms at 16kHz), got {}",
                VAD_FRAME_SIZE,
                frame.len()
            );
        }

        let result = self
            .engine
            .compute(frame)
            .map_err(|e| anyhow::anyhow!("Silero VAD error: {e}"))?;

        // Debug logging for frame-level VAD decisions (only in debug builds)
        #[cfg(debug_assertions)]
        {
            static FRAME_COUNT: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
            let count = FRAME_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            // Log every 10th frame to avoid spam (300ms intervals)
            if count % 10 == 0 {
                let is_speech = result.prob > self.threshold;
                tracing::trace!(
                    frame = count,
                    prob = %format!("{:.3}", result.prob),
                    threshold = %format!("{:.3}", self.threshold),
                    result = if is_speech { "SPEECH" } else { "NOISE" },
                    "VAD: Frame decision"
                );
            }
        }

        if result.prob > self.threshold {
            Ok(VadFrame::Speech(frame))
        } else {
            Ok(VadFrame::Noise)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_threshold_validation() {
        // Can't really test without model, but we can test threshold validation
        assert!(SileroVad::new("/nonexistent", 0.5).is_err());
        assert!(SileroVad::new("/nonexistent", -0.1).is_err());
        assert!(SileroVad::new("/nonexistent", 1.1).is_err());
    }
}
