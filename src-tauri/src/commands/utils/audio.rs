//! Audio validation and VAD filtering utilities
//!
//! This module handles:
//! - Audio validation (length, energy checks)
//! - VAD (Voice Activity Detection) pipeline initialization and filtering
//! - Speech/silence detection with timing metadata

use crate::vad::{pipeline::samples_to_wav_bytes, pipeline::wav_bytes_to_samples, VadPipeline};
use std::sync::Mutex;

// Re-import from path module
use super::path::find_vad_model_path;

/// Global VAD pipeline (lazy initialized)
pub static VAD_PIPELINE: std::sync::OnceLock<Mutex<Option<VadPipeline>>> =
    std::sync::OnceLock::new();

/// VAD-filtered audio with timing metadata
pub struct FilteredAudio {
    pub bytes: Vec<u8>,
    pub speech_duration_sec: f32,
    pub total_duration_sec: f32,
}

/// Validate audio data has sufficient content for transcription
/// Returns false if audio is too short or too quiet (likely silence)
pub fn validate_audio(audio_bytes: &[u8]) -> bool {
    // Minimum size: WAV header (44 bytes) + 1 second of 16kHz mono audio
    const MIN_SIZE: usize = 44 + 32000; // Header + 1s at 16kHz (16000 * 1 * 2 bytes)
    const MIN_ENERGY: f32 = 0.01; // Minimum RMS energy threshold (lowered - VAD does real filtering)

    if audio_bytes.len() < MIN_SIZE {
        tracing::debug!(
            bytes = audio_bytes.len(),
            min = MIN_SIZE,
            "Audio too short"
        );
        return false;
    }

    // Calculate RMS energy from audio samples (skip 44-byte WAV header)
    let mut sum_squares = 0.0f32;
    let mut sample_count = 0;

    for i in (44..audio_bytes.len()).step_by(2) {
        if i + 1 < audio_bytes.len() {
            let sample = i16::from_le_bytes([audio_bytes[i], audio_bytes[i + 1]]);
            let normalized = sample as f32 / 32768.0;
            sum_squares += normalized * normalized;
            sample_count += 1;
        }
    }

    if sample_count == 0 {
        tracing::debug!("No samples found in audio");
        return false;
    }

    let rms = (sum_squares / sample_count as f32).sqrt();
    tracing::debug!(rms = %format!("{:.4}", rms), threshold = MIN_ENERGY, "Audio RMS energy");

    if rms < MIN_ENERGY {
        tracing::debug!("Audio too quiet (silence detected)");
        return false;
    }

    true
}

/// Get or initialize the VAD pipeline
fn get_vad_pipeline(
    app_handle: &tauri::AppHandle,
) -> Result<&'static Mutex<Option<VadPipeline>>, String> {
    // Initialize the OnceLock if needed
    let mutex = VAD_PIPELINE.get_or_init(|| Mutex::new(None));

    // Check if we need to initialize the pipeline
    {
        let mut guard = mutex
            .lock()
            .map_err(|e| format!("VAD lock error: {}", e))?;
        if guard.is_none() {
            let model_path = find_vad_model_path(app_handle)?;
            tracing::info!(path = ?model_path, "Initializing VAD pipeline");

            let pipeline = VadPipeline::new(model_path.to_str().ok_or("Invalid model path")?)
                .map_err(|e| format!("Failed to initialize VAD: {}", e))?;

            *guard = Some(pipeline);
        }
    }

    Ok(mutex)
}

/// Apply VAD filtering to audio bytes, returning filtered audio with timing
pub fn apply_vad_filter(
    app_handle: &tauri::AppHandle,
    audio_bytes: &[u8],
) -> Result<FilteredAudio, String> {
    // Convert WAV bytes to samples
    let samples = wav_bytes_to_samples(audio_bytes)
        .map_err(|e| format!("Failed to parse audio: {}", e))?;

    if samples.is_empty() {
        tracing::debug!("VAD: No samples to filter");
        return Ok(FilteredAudio {
            bytes: audio_bytes.to_vec(),
            speech_duration_sec: 0.0,
            total_duration_sec: 0.0,
        });
    }

    // Get VAD pipeline
    let vad_mutex = get_vad_pipeline(app_handle)?;
    let mut guard = vad_mutex
        .lock()
        .map_err(|e| format!("VAD lock error: {}", e))?;
    let vad = guard.as_mut().ok_or("VAD not initialized")?;

    // Reset VAD state before processing
    vad.reset();

    // Filter audio with timing metadata
    let vad_result = vad
        .filter_audio(&samples)
        .map_err(|e| format!("VAD filter error: {}", e))?;

    if vad_result.samples.is_empty() {
        tracing::debug!("VAD: No speech detected in audio");
        return Ok(FilteredAudio {
            bytes: Vec::new(),
            speech_duration_sec: vad_result.speech_duration_sec,
            total_duration_sec: vad_result.total_duration_sec,
        });
    }

    // Minimum audio length check (1.0 seconds = 16000 samples at 16kHz)
    // Lowered from 1.5s to allow shorter utterances while still preventing hallucinations
    const MIN_SAMPLES: usize = 16000;
    if vad_result.samples.len() < MIN_SAMPLES {
        let duration_ms = (vad_result.samples.len() as f32 / 16.0) as u32;
        tracing::debug!(
            samples = vad_result.samples.len(),
            duration_ms,
            min_samples = MIN_SAMPLES,
            "VAD: Audio too short after filtering"
        );
        return Ok(FilteredAudio {
            bytes: Vec::new(),
            speech_duration_sec: vad_result.speech_duration_sec,
            total_duration_sec: vad_result.total_duration_sec,
        });
    }

    // Convert back to WAV bytes
    let filtered_bytes = samples_to_wav_bytes(&vad_result.samples, 16000);
    tracing::debug!(
        input_bytes = audio_bytes.len(),
        output_bytes = filtered_bytes.len(),
        speech_sec = %format!("{:.2}", vad_result.speech_duration_sec),
        total_sec = %format!("{:.2}", vad_result.total_duration_sec),
        "VAD: Filtered audio"
    );

    Ok(FilteredAudio {
        bytes: filtered_bytes,
        speech_duration_sec: vad_result.speech_duration_sec,
        total_duration_sec: vad_result.total_duration_sec,
    })
}
