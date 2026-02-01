//! Storage Commands
//!
//! Recording persistence, metadata management, and baseline calculations.
//! All commands use spawn_blocking for non-blocking file I/O.

use crate::storage::{get_storage_manager, BaselineResult, RecordingMetadata, StorageConfig, StorageStats};
use crate::security::path_validation::validate_storage_path;
use serde::{Deserialize, Serialize};

use super::utils::{decode_audio_base64, encode_audio_base64};

/// Personalized feedback result for a recording
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalizedFeedback {
    pub baseline_emotion: String,
    pub baseline_confidence: f32,
    pub baseline_sample_count: usize,
    pub current_emotion: String,
    pub current_confidence: f32,
    pub confidence_delta: f32,
    pub should_show_feedback: bool,
    pub feedback_mode: String, // "generic" | "preliminary" | "personalized"
}

/// Save a recording with metadata
#[tauri::command]
pub async fn save_recording(
    audio_data: String, // Base64 encoded WAV
    metadata: RecordingMetadata,
) -> Result<String, String> {
    let audio_bytes = decode_audio_base64(&audio_data)?;

    tokio::task::spawn_blocking(move || {
        let manager = get_storage_manager();
        manager.save_recording(&audio_bytes, &metadata)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// List all recordings
#[tauri::command]
pub async fn list_recordings() -> Result<Vec<RecordingMetadata>, String> {
    tokio::task::spawn_blocking(|| {
        let manager = get_storage_manager();
        manager.list_recordings()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get recording audio by ID (returns Base64 encoded WAV)
#[tauri::command]
pub async fn get_recording_audio(id: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let manager = get_storage_manager();
        let audio_bytes = manager.get_recording_audio(&id)?;
        Ok(encode_audio_base64(&audio_bytes))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Delete a recording by ID
#[tauri::command]
pub async fn delete_recording(id: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let manager = get_storage_manager();
        manager.delete_recording(&id)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Clear all recordings
#[tauri::command]
pub async fn clear_all_recordings() -> Result<usize, String> {
    tokio::task::spawn_blocking(|| {
        let manager = get_storage_manager();
        manager.clear_all_recordings()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get storage configuration
#[tauri::command]
pub async fn get_storage_config() -> Result<StorageConfig, String> {
    tokio::task::spawn_blocking(|| {
        let manager = get_storage_manager();
        manager.get_config()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Update storage configuration
///
/// # Security
/// * Path traversal protection (rejects ..)
/// * Directory whitelisting (only $HOME allowed)
/// * Symlink following protection
/// * Parent directory validation for non-existent paths
///
/// # Arguments
/// * `config` - New storage configuration
///
/// # Returns
/// * `Ok(())` if configuration updated successfully
///
/// # Errors
/// * Security validation failed (path traversal, symlink, not in home)
/// * Failed to update configuration
#[tauri::command]
pub async fn update_storage_config(config: StorageConfig) -> Result<(), String> {
    // Security: Validate storage path (path traversal, symlinks, home directory)
    let validated_path = validate_storage_path(&config.storage_path)
        .map_err(|e| format!("Security validation failed: {}", e))?;

    // Use validated (canonicalized) path in config
    let config_with_validated_path = StorageConfig {
        storage_path: validated_path.to_string_lossy().to_string(),
        ..config
    };

    tokio::task::spawn_blocking(move || {
        let manager = get_storage_manager();
        manager.update_config(config_with_validated_path)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get storage statistics
#[tauri::command]
pub async fn get_storage_stats() -> Result<StorageStats, String> {
    tokio::task::spawn_blocking(|| {
        let manager = get_storage_manager();
        manager.get_storage_stats()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Calculate baseline emotion from all recordings
#[tauri::command]
pub async fn calculate_baseline_emotion() -> Result<Option<BaselineResult>, String> {
    tokio::task::spawn_blocking(|| {
        let manager = get_storage_manager();
        manager.calculate_baseline_emotion()
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get personalized feedback for a recording based on baseline comparison
///
/// Returns feedback if current emotion differs significantly from baseline.
/// Feedback mode depends on sample count:
/// - 0-4 recordings: "generic" (cold start, no feedback)
/// - 5-9 recordings: "preliminary" (building baseline)
/// - 10+ recordings: "personalized" (stable baseline)
#[tauri::command]
pub async fn get_personalized_feedback(
    recording_id: String,
) -> Result<Option<PersonalizedFeedback>, String> {
    tokio::task::spawn_blocking(move || {
        let manager = get_storage_manager();

        // Get baseline (already implemented!)
        let baseline = match manager.calculate_baseline_emotion()? {
            Some(b) => b,
            None => return Ok(None), // Cold start - no recordings with emotion
        };

        // Get current recording
        let recordings = manager.list_recordings()?;
        let current = recordings
            .iter()
            .find(|r| r.id == recording_id)
            .ok_or_else(|| "Recording not found".to_string())?;

        // Get current emotion (prefer analysis_result, fall back to emotion field)
        let current_emotion = current
            .analysis_result
            .as_ref()
            .and_then(|a| a.emotion.as_ref())
            .or(current.emotion.as_ref())
            .ok_or_else(|| "No emotion data in recording".to_string())?;

        // Determine feedback mode based on sample count
        let sample_count = baseline.sample_count;
        let feedback_mode = match sample_count {
            0..=4 => "generic",
            5..=9 => "preliminary",
            _ => "personalized",
        };

        // Cold start: don't show feedback for generic mode
        if feedback_mode == "generic" {
            return Ok(None);
        }

        // Check if feedback should show
        // Show feedback when emotion differs from baseline (regardless of confidence delta)
        let confidence_delta = (current_emotion.confidence - baseline.confidence).abs();
        let emotions_differ = baseline.emotion != current_emotion.primary;
        let should_show = emotions_differ;

        Ok(Some(PersonalizedFeedback {
            baseline_emotion: baseline.emotion,
            baseline_confidence: baseline.confidence,
            baseline_sample_count: sample_count,
            current_emotion: current_emotion.primary.clone(),
            current_confidence: current_emotion.confidence,
            confidence_delta,
            should_show_feedback: should_show,
            feedback_mode: feedback_mode.to_string(),
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
