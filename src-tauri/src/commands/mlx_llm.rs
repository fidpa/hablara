//! MLX-LLM Integration (Emotion + Fallacy Analysis)
//!
//! 3-4x faster than Ollama for local LLM inference using Apple Silicon's Metal acceleration.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

use super::utils::{expand_tilde, resolve_mlx_python_path};

/// Emotion analysis result from MLX-LLM
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxEmotionResult {
    pub primary: String,
    pub confidence: f32,
    pub markers: Option<Vec<String>>,
}

/// Fallacy in text
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxFallacy {
    #[serde(rename = "type")]
    pub fallacy_type: String,
    pub confidence: f32,
    pub quote: String,
    pub explanation: String,
    pub suggestion: String,
}

/// Fallacy analysis result from MLX-LLM
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxFallacyResult {
    pub fallacies: Vec<MlxFallacy>,
    pub enrichment: String,
}

/// MLX-Whisper path configuration (from frontend settings)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MlxPaths {
    pub python_path: String,
    pub models_dir: String,
}

/// Analyze emotion in text using MLX-LLM
async fn analyze_emotion_mlx(
    text: String,
    model: String,
    mlx_paths: Option<&MlxPaths>,
) -> Result<MlxEmotionResult, String> {
    // Resolve Python path
    let python_path = resolve_mlx_python_path(mlx_paths.map(|p| p.python_path.as_str()));

    let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("scripts/mlx_analyze.py"))
        .unwrap_or_default();

    if !python_path.exists() {
        return Err(format!(
            "MLX-LLM Python venv not found at {}. Install mlx-lm: pip install mlx-lm",
            python_path.display()
        ));
    }

    if !script_path.exists() {
        return Err("mlx_analyze.py script not found".to_string());
    }

    // Log for debugging
    tracing::info!(
        engine = "MLX-LLM",
        task = "emotion",
        chars = text.len(),
        model = %model,
        python = ?python_path,
        "MLX-LLM: Starting emotion analysis"
    );

    // Run Python script with timeout
    // Note: First run may take 3-5 minutes to download model from HuggingFace
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(300), // 5 minutes timeout (generous for first download)
        Command::new(&python_path)
            .args(&[
                script_path.to_string_lossy().to_string(),
                "emotion".to_string(),
                text,
                "--model".to_string(),
                model,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output(),
    )
    .await
    .map_err(|_| "MLX-Emotion timeout (5min exceeded - model download issue?)".to_string())?
    .map_err(|e| format!("Failed to run mlx-emotion: {}", e))?;

    // Log output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        tracing::info!(
            engine = "MLX-LLM",
            task = "emotion",
            status = "success",
            "MLX-LLM: Emotion analysis completed"
        );
    } else {
        tracing::warn!(
            engine = "MLX-LLM",
            task = "emotion",
            status = ?output.status,
            stderr = %stderr,
            "MLX-LLM: Process failed"
        );
    }

    tracing::debug!(
        stdout = %stdout,
        stderr = %stderr,
        "MLX-Emotion: Raw output"
    );

    if !output.status.success() {
        // Try to parse error from stderr
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&stderr) {
            if let Some(error) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(format!("MLX-Emotion error: {}", error));
            }
        }
        return Err(format!(
            "MLX-Emotion failed (exit {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    // Parse JSON output
    let result: MlxEmotionResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse MLX-Emotion output: {}. Output: {}", e, stdout))?;

    Ok(result)
}

/// Analyze fallacies in text using MLX-LLM with CEG prompting
async fn analyze_fallacy_mlx(
    text: String,
    model: String,
    mlx_paths: Option<&MlxPaths>,
) -> Result<MlxFallacyResult, String> {
    // Resolve Python path
    let python_path = resolve_mlx_python_path(mlx_paths.map(|p| p.python_path.as_str()));

    let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("scripts/mlx_analyze.py"))
        .unwrap_or_default();

    if !python_path.exists() {
        return Err(format!(
            "MLX-LLM Python venv not found at {}. Install mlx-lm: pip install mlx-lm",
            python_path.display()
        ));
    }

    if !script_path.exists() {
        return Err("mlx_analyze.py script not found".to_string());
    }

    // Log for debugging
    tracing::info!(
        engine = "MLX-LLM",
        task = "fallacy",
        chars = text.len(),
        model = %model,
        python = ?python_path,
        "MLX-LLM: Starting fallacy analysis"
    );

    // Run Python script with timeout
    // Note: First run may take 3-5 minutes to download model from HuggingFace
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(300), // 5 minutes timeout (generous for first download)
        Command::new(&python_path)
            .args(&[
                script_path.to_string_lossy().to_string(),
                "fallacy".to_string(),
                text,
                "--model".to_string(),
                model,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output(),
    )
    .await
    .map_err(|_| "MLX-Fallacy timeout (5min exceeded - model download issue?)".to_string())?
    .map_err(|e| format!("Failed to run mlx-fallacy: {}", e))?;

    // Log output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        tracing::info!(
            engine = "MLX-LLM",
            task = "fallacy",
            status = "success",
            "MLX-LLM: Fallacy analysis completed"
        );
    } else {
        tracing::warn!(
            engine = "MLX-LLM",
            task = "fallacy",
            status = ?output.status,
            stderr = %stderr,
            "MLX-LLM: Process failed"
        );
    }

    tracing::debug!(
        stdout = %stdout,
        stderr = %stderr,
        "MLX-Fallacy: Raw output"
    );

    if !output.status.success() {
        // Try to parse error from stderr
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&stderr) {
            if let Some(error) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(format!("MLX-Fallacy error: {}", error));
            }
        }
        return Err(format!(
            "MLX-Fallacy failed (exit {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    // Parse JSON output
    let result: MlxFallacyResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse MLX-Fallacy output: {}. Output: {}", e, stdout))?;

    Ok(result)
}

/// Check if MLX-LLM is available (Python venv + mlx-lm package)
#[tauri::command]
pub async fn check_mlx_available(python_path: String) -> Result<bool, String> {
    let python = expand_tilde(&python_path);

    if !python.exists() {
        return Ok(false);
    }

    // Check if mlx-lm is installed
    let output = Command::new(&python)
        .args(&["-c", "import mlx_lm; print('ok')"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to check mlx-lm: {}", e))?;

    Ok(output.status.success())
}

/// Analyze emotion using MLX-LLM (3-4x faster than Ollama)
#[tauri::command]
pub async fn analyze_emotion_mlx_cmd(
    text: String,
    model: String,
    mlx_paths: Option<MlxPaths>,
) -> Result<MlxEmotionResult, String> {
    analyze_emotion_mlx(text, model, mlx_paths.as_ref()).await
}

/// Analyze fallacies using MLX-LLM with CEG prompting (3-4x faster than Ollama)
#[tauri::command]
pub async fn analyze_fallacy_mlx_cmd(
    text: String,
    model: String,
    mlx_paths: Option<MlxPaths>,
) -> Result<MlxFallacyResult, String> {
    analyze_fallacy_mlx(text, model, mlx_paths.as_ref()).await
}
