//! Transcription Commands
//!
//! Whisper.cpp and MLX-Whisper integration with VAD filtering.
//!
//! This module is organized into:
//! - mod.rs: Types, constants, and Tauri commands
//! - whisper_cpp.rs: whisper.cpp implementation
//! - mlx_whisper.rs: MLX-Whisper implementation

mod mlx_whisper;
mod whisper_cpp;

use crate::text::filter_transcription_output;
use serde::{Deserialize, Serialize};

use super::mlx_llm::MlxPaths;
use super::utils::{apply_vad_filter, decode_audio_base64, validate_audio};

// Re-export types from sub-modules
pub use mlx_whisper::{MlxModelInfo, MlxWhisperStatus};
pub use whisper_cpp::WhisperStatus;

/// Transcription result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionResult {
    pub text: String,
    pub segments: Vec<TranscriptionSegment>,
    pub language: String,
    /// VAD timing: duration of detected speech (seconds)
    #[serde(alias = "speech_duration_sec")]
    pub speech_duration_sec: f32,
    /// VAD timing: total duration before filtering (seconds)
    #[serde(alias = "total_duration_sec")]
    pub total_duration_sec: f32,
}

/// Transcription segment
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

/// Valid MLX-Whisper models (DEPRECATED: Models are now discovered dynamically)
#[allow(dead_code)]
pub(crate) const VALID_MLX_MODELS: &[&str] = &["german-turbo"];

/// Valid language codes for whisper
pub(crate) const VALID_LANGUAGES: &[&str] = &[
    "de", "en", "fr", "es", "it", "nl", "pt", "ja", "zh", "ko", "auto",
];

/// Transcribe audio using whisper.cpp or mlx-whisper
///
/// This is the main dispatcher that routes to the appropriate backend
/// based on the provider parameter. Falls back to whisper.cpp on MLX errors.
#[tauri::command]
pub async fn transcribe_audio(
    audio_data: String, // Base64 encoded audio
    model: String,
    language: String,
    provider: Option<String>,    // "whisper-cpp" or "mlx-whisper"
    mlx_paths: Option<MlxPaths>, // Optional path configuration for MLX-Whisper
    app_handle: tauri::AppHandle,
) -> Result<TranscriptionResult, String> {
    // Check provider
    let provider = provider.unwrap_or_else(|| "whisper-cpp".to_string());

    // Track if we're falling back from MLX to whisper.cpp
    let mut fallback_model: Option<String> = None;

    if provider == "mlx-whisper" {
        // Try MLX-Whisper first, fall back to whisper.cpp on error
        match mlx_whisper::transcribe_mlx(
            audio_data.clone(),
            model.clone(),
            language.clone(),
            mlx_paths.as_ref(),
        )
        .await
        {
            Ok(result) => return Ok(result),
            Err(e) => {
                tracing::warn!(error = %e, "MLX-Whisper failed, falling back to whisper.cpp");
                // Use "german-turbo" model for whisper.cpp fallback (same as default)
                fallback_model = Some("german-turbo".to_string());
            }
        }
    }

    // Use fallback model if MLX failed, otherwise use requested model
    let whisper_model = fallback_model.unwrap_or(model);

    // Decode base64 audio
    let audio_bytes = decode_audio_base64(&audio_data)?;

    // Validate audio has sufficient content (not silence)
    if !validate_audio(&audio_bytes) {
        tracing::debug!("Audio validation failed - returning empty result");
        return Ok(TranscriptionResult {
            text: String::new(),
            segments: vec![],
            language,
            speech_duration_sec: 0.0,
            total_duration_sec: 0.0,
        });
    }

    // Apply VAD filtering to remove non-speech audio
    let (audio_bytes, speech_duration, total_duration) =
        match apply_vad_filter(&app_handle, &audio_bytes) {
            Ok(filtered) => {
                if filtered.bytes.is_empty() {
                    tracing::debug!("VAD filtered all audio (no speech detected)");
                    return Ok(TranscriptionResult {
                        text: String::new(),
                        segments: vec![],
                        language,
                        speech_duration_sec: filtered.speech_duration_sec,
                        total_duration_sec: filtered.total_duration_sec,
                    });
                }
                (
                    filtered.bytes,
                    filtered.speech_duration_sec,
                    filtered.total_duration_sec,
                )
            }
            Err(e) => {
                tracing::warn!(error = %e, "VAD filtering failed, using original audio");
                // Calculate duration from original audio (16kHz = 16000 samples/sec)
                let duration = (audio_bytes.len() - 44) as f32 / (16000.0 * 2.0); // 16-bit = 2 bytes/sample
                (audio_bytes, duration, duration)
            }
        };

    // Transcribe using whisper.cpp
    let text = whisper_cpp::transcribe_whisper_cpp(
        &audio_bytes,
        &whisper_model,
        &language,
        speech_duration,
        total_duration,
        &app_handle,
    )
    .await?;

    // Apply text filter to remove filler words and stutters
    let filtered_text = filter_transcription_output(&text);
    if text != filtered_text {
        tracing::debug!(
            original = %text,
            filtered = %filtered_text,
            "Whisper: Text filtered"
        );
    }

    Ok(TranscriptionResult {
        text: filtered_text,
        segments: vec![], // whisper.cpp txt output doesn't include segments
        language,
        speech_duration_sec: speech_duration,
        total_duration_sec: total_duration,
    })
}

/// Check if Whisper.cpp is installed and ready
#[tauri::command]
pub async fn check_whisper_status(app_handle: tauri::AppHandle) -> Result<WhisperStatus, String> {
    whisper_cpp::check_whisper_status_impl(&app_handle).await
}

/// Check if MLX-Whisper is available
#[tauri::command]
pub async fn check_mlx_whisper_status(
    mlx_paths: Option<MlxPaths>,
) -> Result<MlxWhisperStatus, String> {
    mlx_whisper::check_mlx_whisper_status_impl(mlx_paths).await
}

/// List available MLX-Whisper models
#[tauri::command]
pub async fn list_mlx_whisper_models(
    mlx_paths: Option<MlxPaths>,
) -> Result<Vec<MlxModelInfo>, String> {
    mlx_whisper::list_mlx_whisper_models_impl(mlx_paths).await
}
