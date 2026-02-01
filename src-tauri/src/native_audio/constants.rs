//! Native Audio Constants
//!
//! Shared constants for native audio capture and processing.

/// Whisper expects 16kHz mono audio
pub const WHISPER_SAMPLE_RATE: u32 = 16000;

/// Frame duration for VAD processing (30ms)
#[allow(dead_code)]
pub const VAD_FRAME_DURATION_MS: u64 = 30;

/// VAD frame size at 16kHz: 30ms * 16000 / 1000 = 480 samples
#[allow(dead_code)]
pub const VAD_FRAME_SIZE: usize = (WHISPER_SAMPLE_RATE as usize * VAD_FRAME_DURATION_MS as usize) / 1000;
