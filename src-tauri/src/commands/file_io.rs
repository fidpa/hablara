//! File I/O Commands
//!
//! Custom Tauri commands for reading audio files.
//! Uses std::fs for synchronous file operations in spawn_blocking.

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::security::path_validation::validate_audio_file_path;

/// Read audio file and return as base64 encoded string.
///
/// Uses spawn_blocking to avoid blocking the Tokio runtime.
///
/// # Security
/// * Path traversal protection (rejects .., ./)
/// * Symlink following protection
/// * Extension validation (only audio formats allowed)
/// * Directory whitelisting (only $HOME and /tmp)
///
/// # Arguments
/// * `file_path` - Absolute path to the audio file
///
/// # Returns
/// * Base64 encoded audio data
///
/// # Errors
/// * File not found
/// * Path traversal detected
/// * Symlink not allowed
/// * Invalid file extension
/// * Path not in allowed directories
/// * Read permission denied
#[tauri::command]
pub async fn read_audio_file(file_path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        // Security: Validate path (prevents path traversal, symlinks, wrong extensions)
        let validated_path = validate_audio_file_path(&file_path)
            .map_err(|e| format!("Security validation failed: {}", e))?;

        // Read file (validated_path is guaranteed safe)
        let bytes = std::fs::read(&validated_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        // Encode as base64
        let base64_data = BASE64.encode(&bytes);

        Ok(base64_data)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get file metadata (size, extension) without reading content.
///
/// # Security
/// * Same security checks as read_audio_file()
/// * Prevents information disclosure via path traversal
///
/// # Arguments
/// * `file_path` - Absolute path to the file
///
/// # Returns
/// * JSON with { size: u64, extension: String }
///
/// # Errors
/// * Security validation failed
/// * File not found
/// * Permission denied
#[tauri::command]
pub async fn get_file_metadata(file_path: String) -> Result<serde_json::Value, String> {
    tokio::task::spawn_blocking(move || {
        // Security: Validate path (same checks as read_audio_file)
        let validated_path = validate_audio_file_path(&file_path)
            .map_err(|e| format!("Security validation failed: {}", e))?;

        // Get metadata (validated_path is guaranteed safe)
        let metadata = std::fs::metadata(&validated_path)
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        let extension = validated_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        Ok(serde_json::json!({
            "size": metadata.len(),
            "extension": extension,
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
