//! MLX-Whisper Transcription Backend
//!
//! Apple Silicon optimized transcription using mlx-audio.

use serde::Serialize;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

use crate::commands::mlx_llm::MlxPaths;
use crate::commands::utils::{decode_audio_base64, resolve_mlx_models_dir, resolve_mlx_python_path};
use crate::text::filter_transcription_output;

use super::{TranscriptionResult, VALID_LANGUAGES};

/// MLX-Whisper Status
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxWhisperStatus {
    pub available: bool,
    pub python_path: Option<String>,
    pub script_path: Option<String>,
    pub models: Vec<String>,
    pub error: Option<String>,
}

/// MLX-Whisper Model Information
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxModelInfo {
    pub id: String,
    pub display_name: String,
    pub directory: String,
    pub size_estimate: Option<String>,
    pub description: Option<String>,
}

/// Transcribe audio using MLX-Whisper
///
/// This is the internal implementation called by the dispatcher in mod.rs.
pub(crate) async fn transcribe_mlx(
    audio_data: String,
    model: String,
    language: String,
    mlx_paths: Option<&MlxPaths>,
) -> Result<TranscriptionResult, String> {
    // Validate model against discovered models (dynamic, not static)
    let models_dir = resolve_mlx_models_dir(mlx_paths.map(|p| p.models_dir.as_str()));
    let available = discover_mlx_models(&models_dir);
    if !available.iter().any(|m| m.id == model) {
        let ids: Vec<&str> = available.iter().map(|m| m.id.as_str()).collect();
        return Err(format!(
            "Invalid MLX model: {}. Available: {:?}",
            model, ids
        ));
    }

    // Validate language parameter
    if !language.is_empty() && !VALID_LANGUAGES.contains(&language.as_str()) {
        return Err(format!(
            "Invalid language code: {}. Valid options: {:?}",
            language, VALID_LANGUAGES
        ));
    }

    // Decode base64 audio
    let audio_bytes = decode_audio_base64(&audio_data)?;

    // Resolve paths using the priority chain: env var > user setting > default
    let python_path = resolve_mlx_python_path(mlx_paths.map(|p| p.python_path.as_str()));

    let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("scripts/mlx_transcribe.py"))
        .unwrap_or_default();

    if !python_path.exists() {
        return Err(format!(
            "MLX-Whisper Python venv not found at {}. Set MLX_WHISPER_PYTHON env var or configure in settings.",
            python_path.display()
        ));
    }

    if !script_path.exists() {
        return Err("mlx_transcribe.py script not found".to_string());
    }

    // Create temp file for audio input
    let temp_dir = std::env::temp_dir();
    let audio_path = temp_dir.join("vip_mlx_input.wav");

    // Write audio to temp file
    tokio::fs::write(&audio_path, &audio_bytes)
        .await
        .map_err(|e| format!("Failed to write audio: {}", e))?;

    // Log for debugging
    tracing::debug!(
        path = ?audio_path,
        bytes = audio_bytes.len(),
        model = %model,
        python = ?python_path,
        "MLX-Whisper: Starting transcription"
    );

    // Build command args
    let mut args = vec![
        script_path.to_string_lossy().to_string(),
        audio_path.to_string_lossy().to_string(),
        "--model".to_string(),
        model,
    ];

    if !language.is_empty() {
        args.push("--language".to_string());
        args.push(language.clone());
    }

    // Run Python script
    let output = Command::new(&python_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run mlx-whisper: {}", e))?;

    // Cleanup temp file
    let _ = tokio::fs::remove_file(&audio_path).await;

    // Log output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    tracing::debug!(
        status = ?output.status,
        stdout = %stdout,
        stderr = %stderr,
        "MLX-Whisper: Process completed"
    );

    if !output.status.success() {
        // Try to parse error from stderr
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&stderr) {
            if let Some(error) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(format!("MLX-Whisper error: {}", error));
            }
        }
        return Err(format!(
            "MLX-Whisper failed (exit {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    // Parse JSON output
    let mut result: TranscriptionResult = serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Failed to parse MLX-Whisper output: {}. Output: {}",
            e, stdout
        )
    })?;

    // Apply text filter to remove filler words and stutters
    let original_text = result.text.clone();
    result.text = filter_transcription_output(&result.text);
    if original_text != result.text {
        tracing::debug!(
            original = %original_text,
            filtered = %result.text,
            "MLX-Whisper: Text filtered"
        );
    }

    Ok(result)
}

/// Check if MLX-Whisper is available (implementation)
pub(crate) async fn check_mlx_whisper_status_impl(
    mlx_paths: Option<MlxPaths>,
) -> Result<MlxWhisperStatus, String> {
    let python_path = resolve_mlx_python_path(mlx_paths.as_ref().map(|p| p.python_path.as_str()));
    let mlx_whisper_dir =
        resolve_mlx_models_dir(mlx_paths.as_ref().map(|p| p.models_dir.as_str()));

    let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("scripts/mlx_transcribe.py"))
        .unwrap_or_default();

    // Check Python venv
    if !python_path.exists() {
        return Ok(MlxWhisperStatus {
            available: false,
            python_path: None,
            script_path: None,
            models: vec![],
            error: Some(format!(
                "Python venv not found. Checked: {}. Set MLX_WHISPER_PYTHON env var or configure in settings.",
                python_path.display()
            )),
        });
    }

    // Check script
    if !script_path.exists() {
        return Ok(MlxWhisperStatus {
            available: false,
            python_path: Some(python_path.to_string_lossy().to_string()),
            script_path: None,
            models: vec![],
            error: Some("mlx_transcribe.py script not found".to_string()),
        });
    }

    // Check models
    let models: Vec<String> = if mlx_whisper_dir.exists() {
        std::fs::read_dir(&mlx_whisper_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .filter_map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if name.contains("whisper") {
                            // Map directory names to our model identifiers
                            // Note: large-v3 excluded (too large for live transcription)
                            if name.contains("german") || name.contains("turbo") {
                                Some("german-turbo".to_string())
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    } else {
        vec![]
    };

    let has_models = !models.is_empty();
    let error = if !has_models {
        Some(format!(
            "No MLX-Whisper models found in {}. Set MLX_WHISPER_DIR env var or configure in settings.",
            mlx_whisper_dir.display()
        ))
    } else {
        None
    };

    Ok(MlxWhisperStatus {
        available: has_models,
        python_path: Some(python_path.to_string_lossy().to_string()),
        script_path: Some(script_path.to_string_lossy().to_string()),
        models,
        error,
    })
}

/// Known MLX-Whisper model patterns (allowlist for security)
/// Format: (pattern1, pattern2, id, size, description)
const KNOWN_MODEL_PATTERNS: &[(&str, &str, &str, &str, &str)] = &[
    ("turbo", "german", "german-turbo", "~1.6GB", "Optimiert fuer Deutsch"),
    ("large-v3", "", "large-v3", "~2.9GB", "Hoechste Qualitaet"),
    ("large-v2", "", "large-v2", "~2.9GB", "Large V2 Modell"),
    ("medium", "", "medium", "~1.5GB", "Medium Modell"),
    ("small", "", "small", "~461MB", "Small Modell"),
    ("base", "", "base", "~138MB", "Base Modell"),
    ("tiny", "", "tiny", "~75MB", "Tiny Modell"),
];

/// Map directory name to friendly model info (allowlist-based for security)
fn get_known_model_info(dir_name: &str) -> Option<MlxModelInfo> {
    // Only process directories containing "whisper"
    if !dir_name.contains("whisper") {
        return None;
    }

    // Check against allowlist patterns
    for (pattern1, pattern2, id, size, description) in KNOWN_MODEL_PATTERNS {
        let matches = dir_name.contains(pattern1)
            && (pattern2.is_empty() || dir_name.contains(pattern2));
        if matches {
            return Some(MlxModelInfo {
                id: id.to_string(),
                display_name: id.replace("-", " ").to_uppercase(),
                directory: dir_name.to_string(),
                size_estimate: Some(size.to_string()),
                description: Some(description.to_string()),
            });
        }
    }

    // Reject unknown models for security
    None
}

/// Scan directory for available MLX models
pub(crate) fn discover_mlx_models(models_dir: &std::path::Path) -> Vec<MlxModelInfo> {
    // Canonicalize base path to resolve symlinks and prevent path traversal
    let canonical_base = match models_dir.canonicalize() {
        Ok(p) => p,
        Err(_) => return vec![],
    };

    std::fs::read_dir(&canonical_base)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    // Verify entry is within base directory (no symlink escape)
                    if let Ok(canonical_entry) = e.path().canonicalize() {
                        canonical_entry.starts_with(&canonical_base) && canonical_entry.is_dir()
                    } else {
                        false
                    }
                })
                .filter_map(|e| get_known_model_info(&e.file_name().to_string_lossy()))
                .collect()
        })
        .unwrap_or_default()
}

/// Maximum number of models to return (prevents memory issues)
const MAX_DISCOVERED_MODELS: usize = 50;

/// List available MLX-Whisper models (implementation)
pub(crate) async fn list_mlx_whisper_models_impl(
    mlx_paths: Option<MlxPaths>,
) -> Result<Vec<MlxModelInfo>, String> {
    let models_dir = resolve_mlx_models_dir(mlx_paths.as_ref().map(|p| p.models_dir.as_str()));

    tokio::task::spawn_blocking(move || {
        let mut models = discover_mlx_models(&models_dir);
        models.truncate(MAX_DISCOVERED_MODELS);
        Ok(models)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_get_known_model_info_german_turbo() {
        let info = get_known_model_info("whisper-large-v3-turbo-german-f16");
        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.id, "german-turbo");
        assert_eq!(info.display_name, "GERMAN TURBO");
        assert_eq!(info.size_estimate, Some("~1.6GB".to_string()));
    }

    #[test]
    fn test_get_known_model_info_large_v3() {
        let info = get_known_model_info("whisper-large-v3-f16");
        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.id, "large-v3");
        assert_eq!(info.display_name, "LARGE V3");
        assert_eq!(info.size_estimate, Some("~2.9GB".to_string()));
    }

    #[test]
    fn test_get_known_model_info_unknown() {
        // Allowlist pattern now rejects unknown models for security
        let info = get_known_model_info("whisper-unknown-model");
        assert!(info.is_none());
    }

    #[test]
    fn test_get_known_model_info_non_whisper() {
        let info = get_known_model_info("some-other-directory");
        assert!(info.is_none());
    }

    #[test]
    fn test_discover_mlx_models_empty() {
        let temp = TempDir::new().unwrap();
        let models = discover_mlx_models(temp.path());
        assert!(models.is_empty());
    }

    #[test]
    fn test_discover_mlx_models_with_german_turbo() {
        let temp = TempDir::new().unwrap();
        std::fs::create_dir(temp.path().join("whisper-large-v3-turbo-german-f16")).unwrap();
        let models = discover_mlx_models(temp.path());
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].id, "german-turbo");
        assert_eq!(models[0].display_name, "GERMAN TURBO");
    }

    #[test]
    fn test_discover_mlx_models_multiple() {
        let temp = TempDir::new().unwrap();
        std::fs::create_dir(temp.path().join("whisper-large-v3-turbo-german-f16")).unwrap();
        std::fs::create_dir(temp.path().join("whisper-large-v3-f16")).unwrap();
        let models = discover_mlx_models(temp.path());
        assert_eq!(models.len(), 2);
    }

    #[test]
    fn test_discover_mlx_models_nonexistent_dir() {
        let models = discover_mlx_models(std::path::Path::new("/nonexistent/path"));
        assert!(models.is_empty());
    }
}
