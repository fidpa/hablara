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

/// Expand ~ to home directory (cross-platform)
///
/// Uses dirs::home_dir() for Windows/macOS/Linux compatibility
/// instead of $HOME environment variable (Unix-only).
pub fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(&path[2..])
    } else if path == "~" {
        dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
    } else {
        PathBuf::from(path)
    }
}

/// Resolve MLX Python path with priority: env var > user setting > default
///
/// Note: MLX is macOS-only (Apple Silicon). On other platforms, this function
/// still works but will return a non-existent fallback path.
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

    // 3. Default paths (macOS only - MLX requires Apple Silicon)
    #[cfg(target_os = "macos")]
    {
        let default = expand_tilde("~/Repos/cli/mac/venvs/vllm-mlx/bin/python");
        if default.exists() {
            return default;
        }

        let fallback = expand_tilde("~/.venvs/mlx-whisper/bin/python");
        if fallback.exists() {
            return fallback;
        }
    }

    // 4. Fallback: return a path that likely won't exist (MLX not available on this platform)
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

/// Convert path to Windows Long Path format if needed (>260 chars)
///
/// Windows has a traditional 260-character path limit. For paths exceeding this,
/// the `\\?\` prefix enables long path support (Windows 10 1607+).
///
/// On non-Windows platforms, returns the path unchanged.
#[cfg(target_os = "windows")]
pub fn to_long_path(path: &std::path::Path) -> std::path::PathBuf {
    let path_str = path.to_string_lossy();
    // Already a long path or UNC path
    if path_str.starts_with("\\\\?\\") || path_str.starts_with("\\\\") {
        return path.to_path_buf();
    }
    // Only convert if path exceeds Windows limit
    if path_str.len() > 260 {
        std::path::PathBuf::from(format!("\\\\?\\{}", path.display()))
    } else {
        path.to_path_buf()
    }
}

#[cfg(not(target_os = "windows"))]
pub fn to_long_path(path: &std::path::Path) -> std::path::PathBuf {
    path.to_path_buf()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_long_path_short_path() {
        let short = PathBuf::from("/some/short/path");
        let result = to_long_path(&short);
        // Short paths should remain unchanged
        assert_eq!(result, short);
    }

    #[test]
    fn test_to_long_path_preserves_path_unchanged_on_non_windows() {
        // On non-Windows, paths should always be returned unchanged
        let path = PathBuf::from("/a/very/normal/path/to/some/file.txt");
        let result = to_long_path(&path);
        assert_eq!(result, path);
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_to_long_path_already_long_path_format() {
        let already_long = PathBuf::from("\\\\?\\C:\\some\\path");
        let result = to_long_path(&already_long);
        // Already prefixed paths should remain unchanged
        assert_eq!(result, already_long);
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_to_long_path_unc_path() {
        let unc = PathBuf::from("\\\\server\\share\\path");
        let result = to_long_path(&unc);
        // UNC paths should remain unchanged
        assert_eq!(result, unc);
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_to_long_path_converts_long_path() {
        // Create a path > 260 characters
        let long_component = "a".repeat(250);
        let long_path = PathBuf::from(format!("C:\\{}\\file.txt", long_component));
        let result = to_long_path(&long_path);
        // Should be prefixed with \\?\
        assert!(result.to_string_lossy().starts_with("\\\\?\\"));
    }

    #[test]
    fn test_expand_tilde_home() {
        let result = expand_tilde("~");
        // Should return home directory or fallback
        assert!(!result.to_string_lossy().contains("~"));
    }

    #[test]
    fn test_expand_tilde_with_path() {
        let result = expand_tilde("~/some/path");
        assert!(!result.to_string_lossy().starts_with("~/"));
        assert!(result.to_string_lossy().contains("some"));
    }

    #[test]
    fn test_expand_tilde_absolute_path() {
        let path = "/absolute/path";
        let result = expand_tilde(path);
        assert_eq!(result, PathBuf::from(path));
    }
}
