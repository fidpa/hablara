//! Voice Activity Detection (VAD) Module
//!
//! Provides Silero VAD integration to filter non-speech audio
//! before transcription, solving the "[Musik]" problem.

use anyhow::Result;

pub mod pipeline;
mod silero;
mod smoothed;

pub use pipeline::VadPipeline;
pub use silero::SileroVad;
pub use smoothed::SmoothedVad;

/// Sample rate for Whisper (16kHz)
pub const WHISPER_SAMPLE_RATE: u32 = 16000;

/// Frame size for Silero VAD: 30ms at 16kHz = 480 samples
pub const VAD_FRAME_SIZE: usize = (WHISPER_SAMPLE_RATE * 30 / 1000) as usize;

/// Represents the result of VAD processing for a single frame
pub enum VadFrame<'a> {
    /// Speech detected - contains the audio samples
    Speech(&'a [f32]),
    /// Non-speech (silence, noise) - can be ignored
    Noise,
}

impl<'a> VadFrame<'a> {
    #[inline]
    pub fn is_speech(&self) -> bool {
        matches!(self, VadFrame::Speech(_))
    }
}

/// Trait for Voice Activity Detection implementations
pub trait VoiceActivityDetector: Send + Sync {
    /// Process a single 30ms frame and return speech/noise classification
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>>;

    /// Convenience method to check if frame contains voice
    fn is_voice(&mut self, frame: &[f32]) -> Result<bool> {
        Ok(self.push_frame(frame)?.is_speech())
    }

    /// Reset internal state
    fn reset(&mut self) {}
}
