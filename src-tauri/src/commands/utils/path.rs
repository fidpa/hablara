//! Path resolution utilities
//!
//! This module handles path resolution for:
//! - Home directory expansion (~)
//! - MLX Python interpreter and models
//! - Whisper binaries and models
//! - VAD model files
//! - Target platform triple detection

use std::path::PathBuf;
use tauri::Manager;

/// Expand ~ to home directory
pub fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join(&path[2..])
    } else if path == "~" {
        PathBuf::from(std::env::var("HOME").unwrap_or_default())
    } else {
        PathBuf::from(path)
    }
}

/// Resolve MLX Python path with priority: env var > user setting > default
pub fn resolve_mlx_python_path(user_path: Option<&str>) -> PathBuf {
    // 1. Check environment variable
    if let Ok(env_path) = std::env::var("MLX_WHISPER_PYTHON") {
        let path = expand_tilde(&env_path);
        if path.exists() {
            return path;
        }
    }

    // 2. Check user-configured path
    if let Some(user) = user_path {
        let path = expand_tilde(user);
        if path.exists() {
            return path;
        }
    }

    // 3. Default path (vllm-mlx venv with mlx_audio)
    let default = expand_tilde("~/Repos/cli/mac/venvs/vllm-mlx/bin/python");
    if default.exists() {
        return default;
    }

    // 4. Fallback for other installations
    expand_tilde("~/.venvs/mlx-whisper/bin/python")
}

/// Resolve MLX models directory with priority: env var > user setting > default
pub fn resolve_mlx_models_dir(user_dir: Option<&str>) -> PathBuf {
    // 1. Check environment variable
    if let Ok(env_dir) = std::env::var("MLX_WHISPER_DIR") {
        let path = expand_tilde(&env_dir);
        if path.exists() {
            return path;
        }
    }

    // 2. Check user-configured path
    if let Some(user) = user_dir {
        let path = expand_tilde(user);
        if path.exists() {
            return path;
        }
    }

    // 3. Default path
    expand_tilde("~/mlx-whisper")
}

/// Find the base directory for whisper binaries and models.
/// In development: src-tauri/binaries and src-tauri/models
/// In production: bundled resources
pub fn find_whisper_paths(
    app_handle: &tauri::AppHandle,
) -> Result<(PathBuf, PathBuf), String> {
    // Try development paths first (src-tauri/)
    let dev_base = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dev_binaries = dev_base.join("binaries");
    let dev_models = dev_base.join("models");

    if dev_binaries.exists() && dev_models.exists() {
        return Ok((dev_binaries, dev_models));
    }

    // Try resource directory (production)
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    Ok((resource_dir.join("binaries"), resource_dir.join("models")))
}

/// Find the VAD model path
/// In development: src-tauri/resources/models/silero_vad_v4.onnx
/// In production: bundled resources
pub fn find_vad_model_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try development path first (src-tauri/)
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("models")
        .join("silero_vad_v4.onnx");

    if dev_path.exists() {
        return Ok(dev_path);
    }

    // Try resource directory (production)
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let prod_path = resource_dir
        .join("resources")
        .join("models")
        .join("silero_vad_v4.onnx");

    if prod_path.exists() {
        return Ok(prod_path);
    }

    Err(format!(
        "VAD model not found. Checked: {} and {}",
        dev_path.display(),
        prod_path.display()
    ))
}

/// Get the target triple for the current platform
pub fn get_target_triple() -> Result<&'static str, String> {
    if cfg!(target_arch = "aarch64") && cfg!(target_os = "macos") {
        Ok("aarch64-apple-darwin")
    } else if cfg!(target_arch = "x86_64") && cfg!(target_os = "macos") {
        Ok("x86_64-apple-darwin")
    } else if cfg!(target_arch = "x86_64") && cfg!(target_os = "linux") {
        Ok("x86_64-unknown-linux-gnu")
    } else if cfg!(target_arch = "x86_64") && cfg!(target_os = "windows") {
        Ok("x86_64-pc-windows-msvc")
    } else {
        Err("Unsupported platform".to_string())
    }
}
