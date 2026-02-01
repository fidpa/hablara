//! VAD Pipeline
//!
//! Provides a convenient interface for filtering audio through VAD
//! before transcription.
//!
//! Threshold and timing settings based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

use anyhow::Result;

use super::{SileroVad, SmoothedVad, VoiceActivityDetector, VAD_FRAME_SIZE};

/// Default VAD threshold (30% probability for speech detection)
const DEFAULT_THRESHOLD: f32 = 0.3;

/// Default prefill frames (15 = 450ms context before speech)
const DEFAULT_PREFILL: usize = 15;

/// Default hangover frames (15 = 450ms after speech ends)
const DEFAULT_HANGOVER: usize = 15;

/// Default onset frames (2 = 60ms to confirm speech start)
const DEFAULT_ONSET: usize = 2;

/// Result from VAD filtering with timing metadata
#[derive(Debug, Clone)]
pub struct VadResult {
    /// Filtered audio samples (speech only)
    pub samples: Vec<f32>,
    /// Duration of speech detected (seconds)
    pub speech_duration_sec: f32,
    /// Total duration of input audio (seconds)
    pub total_duration_sec: f32,
}

/// VadPipeline provides a simple interface for filtering audio
pub struct VadPipeline {
    vad: SmoothedVad,
}

// Implement VoiceActivityDetector trait for VadPipeline
// This allows VadPipeline to be used directly in the native audio recorder
impl VoiceActivityDetector for VadPipeline {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<super::VadFrame<'a>> {
        self.vad.push_frame(frame)
    }

    fn reset(&mut self) {
        self.vad.reset();
    }
}

impl VadPipeline {
    /// Create a new VadPipeline with default parameters
    ///
    /// # Arguments
    /// * `model_path` - Path to silero_vad_v4.onnx model
    pub fn new(model_path: &str) -> Result<Self> {
        Self::with_params(
            model_path,
            DEFAULT_THRESHOLD,
            DEFAULT_PREFILL,
            DEFAULT_HANGOVER,
            DEFAULT_ONSET,
        )
    }

    /// Create a new VadPipeline with custom parameters
    pub fn with_params(
        model_path: &str,
        threshold: f32,
        prefill_frames: usize,
        hangover_frames: usize,
        onset_frames: usize,
    ) -> Result<Self> {
        let silero = SileroVad::new(model_path, threshold)?;
        let smoothed = SmoothedVad::new(
            Box::new(silero),
            prefill_frames,
            hangover_frames,
            onset_frames,
        );

        Ok(Self { vad: smoothed })
    }

    /// Filter audio samples, returning only speech segments with timing metadata
    ///
    /// # Arguments
    /// * `samples` - Audio samples at 16kHz mono
    ///
    /// # Returns
    /// VadResult with filtered audio and timing information
    pub fn filter_audio(&mut self, samples: &[f32]) -> Result<VadResult> {
        if samples.is_empty() {
            return Ok(VadResult {
                samples: Vec::new(),
                speech_duration_sec: 0.0,
                total_duration_sec: 0.0,
            });
        }

        let mut speech_samples = Vec::new();
        let total_frames = samples.len() / VAD_FRAME_SIZE;
        let mut speech_frames = 0;

        // Process audio in 30ms frames
        for frame_idx in 0..(samples.len() / VAD_FRAME_SIZE) {
            let start = frame_idx * VAD_FRAME_SIZE;
            let end = start + VAD_FRAME_SIZE;
            let frame = &samples[start..end];

            match self.vad.push_frame(frame)? {
                super::VadFrame::Speech(speech) => {
                    speech_samples.extend_from_slice(speech);
                    speech_frames += 1;
                }
                super::VadFrame::Noise => {}
            }
        }

        // Handle remaining samples (less than a full frame)
        let remaining = samples.len() % VAD_FRAME_SIZE;
        if remaining > 0 && !speech_samples.is_empty() {
            // If we're in speech, include the trailing samples
            let start = (samples.len() / VAD_FRAME_SIZE) * VAD_FRAME_SIZE;
            speech_samples.extend_from_slice(&samples[start..]);
        }

        // Calculate timing metadata (30ms per frame = 0.03 seconds)
        let speech_duration = (speech_frames as f32) * 0.03;
        let total_duration = (total_frames as f32) * 0.03;

        let speech_percent = if total_frames > 0 {
            (speech_frames as f32 / total_frames as f32) * 100.0
        } else {
            0.0
        };

        tracing::debug!(
            input_samples = samples.len(),
            output_samples = speech_samples.len(),
            speech_percent = %format!("{:.1}", speech_percent),
            speech_frames,
            speech_sec = %format!("{:.2}", speech_duration),
            total_sec = %format!("{:.2}", total_duration),
            "VAD: Audio filtered"
        );

        Ok(VadResult {
            samples: speech_samples,
            speech_duration_sec: speech_duration,
            total_duration_sec: total_duration,
        })
    }

    /// Filter audio samples, returning only speech samples (backward compat)
    ///
    /// For new code, prefer filter_audio() which returns VadResult with timing info
    #[allow(dead_code)]
    pub fn filter_audio_simple(&mut self, samples: &[f32]) -> Result<Vec<f32>> {
        Ok(self.filter_audio(samples)?.samples)
    }

    /// Check if audio contains any speech
    #[allow(dead_code)]
    pub fn has_speech(&mut self, samples: &[f32]) -> Result<bool> {
        if samples.is_empty() {
            return Ok(false);
        }

        // Check first few frames
        let frames_to_check = std::cmp::min(samples.len() / VAD_FRAME_SIZE, 30);

        for frame_idx in 0..frames_to_check {
            let start = frame_idx * VAD_FRAME_SIZE;
            let end = start + VAD_FRAME_SIZE;
            let frame = &samples[start..end];

            if self.vad.is_voice(frame)? {
                self.vad.reset();
                return Ok(true);
            }
        }

        self.vad.reset();
        Ok(false)
    }

    /// Reset VAD internal state
    pub fn reset(&mut self) {
        self.vad.reset();
    }
}

/// Convert raw audio bytes (WAV format) to f32 samples
pub fn wav_bytes_to_samples(audio_bytes: &[u8]) -> Result<Vec<f32>> {
    // Skip WAV header (44 bytes minimum)
    if audio_bytes.len() < 44 {
        anyhow::bail!("Audio data too short for WAV header");
    }

    // Read sample rate from WAV header (bytes 24-27, little-endian)
    let sample_rate = u32::from_le_bytes([
        audio_bytes[24],
        audio_bytes[25],
        audio_bytes[26],
        audio_bytes[27],
    ]);
    tracing::debug!(sample_rate, "WAV: Sample rate from header");

    if sample_rate != 16000 {
        tracing::warn!(
            expected = 16000,
            actual = sample_rate,
            "WAV: Unexpected sample rate - VAD may fail"
        );
    }

    // Read number of channels (bytes 22-23)
    let num_channels = u16::from_le_bytes([audio_bytes[22], audio_bytes[23]]);
    if num_channels != 1 {
        tracing::warn!(
            expected = 1,
            actual = num_channels,
            "WAV: Expected mono, got multiple channels"
        );
    }

    // Read bits per sample (bytes 34-35)
    let bits_per_sample = u16::from_le_bytes([audio_bytes[34], audio_bytes[35]]);
    tracing::debug!(
        sample_rate,
        channels = num_channels,
        bits = bits_per_sample,
        "WAV: Format parsed"
    );

    let mut samples = Vec::new();

    // Parse 16-bit PCM samples (skip 44-byte WAV header)
    for i in (44..audio_bytes.len()).step_by(2) {
        if i + 1 < audio_bytes.len() {
            let sample = i16::from_le_bytes([audio_bytes[i], audio_bytes[i + 1]]);
            samples.push(sample as f32 / 32768.0);
        }
    }

    tracing::debug!(
        samples = samples.len(),
        duration_sec = %format!("{:.2}", samples.len() as f32 / sample_rate as f32),
        sample_rate,
        "WAV: Samples parsed"
    );

    Ok(samples)
}

/// Convert f32 samples back to WAV bytes
pub fn samples_to_wav_bytes(samples: &[f32], sample_rate: u32) -> Vec<u8> {
    let data_size = samples.len() * 2; // 16-bit = 2 bytes per sample
    let file_size = 36 + data_size;

    let mut buffer = Vec::with_capacity(44 + data_size);

    // WAV Header
    buffer.extend_from_slice(b"RIFF");
    buffer.extend_from_slice(&(file_size as u32).to_le_bytes());
    buffer.extend_from_slice(b"WAVE");

    // fmt chunk
    buffer.extend_from_slice(b"fmt ");
    buffer.extend_from_slice(&16u32.to_le_bytes()); // Subchunk1Size
    buffer.extend_from_slice(&1u16.to_le_bytes()); // AudioFormat (PCM)
    buffer.extend_from_slice(&1u16.to_le_bytes()); // NumChannels (Mono)
    buffer.extend_from_slice(&sample_rate.to_le_bytes()); // SampleRate
    buffer.extend_from_slice(&(sample_rate * 2).to_le_bytes()); // ByteRate
    buffer.extend_from_slice(&2u16.to_le_bytes()); // BlockAlign
    buffer.extend_from_slice(&16u16.to_le_bytes()); // BitsPerSample

    // data chunk
    buffer.extend_from_slice(b"data");
    buffer.extend_from_slice(&(data_size as u32).to_le_bytes());

    // Sample data
    for sample in samples {
        let s = sample.clamp(-1.0, 1.0);
        // i16 two's complement: [-32768, +32767] (asymmetric range)
        // -1.0 -> -32768 (i16::MIN), +1.0 -> +32767 (i16::MAX)
        let int_sample = if s < 0.0 {
            (s * 32768.0) as i16
        } else {
            (s * 32767.0) as i16
        };
        buffer.extend_from_slice(&int_sample.to_le_bytes());
    }

    buffer
}
