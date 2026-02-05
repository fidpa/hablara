//! macOS-specific implementations
//!
//! This module contains code that only runs on macOS:
//! - MLX Framework integration (Apple Silicon)
//! - Keychain handling
//! - Metal acceleration utilities
//!
//! # Current Features
//!
//! - `is_mlx_available()`: Checks if MLX (Apple Silicon ML framework) is available
//! - `get_app_support_storage_path()`: Application Support storage path for direct distribution

use std::path::PathBuf;

/// Check if MLX (Apple Silicon ML framework) is available.
///
/// Returns `true` on ARM64 (Apple Silicon), `false` on Intel Macs.
#[allow(dead_code)]  // Reserved for future MLX-Whisper integration
pub fn is_mlx_available() -> bool {
    #[cfg(target_arch = "aarch64")]
    {
        true
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        false
    }
}

/// Application Support storage path for direct distribution.
///
/// Returns `~/Library/Application Support/Hablara/recordings/`
pub fn get_app_support_storage_path() -> Result<PathBuf, String> {
    dirs::data_dir()
        .ok_or_else(|| "Application Support directory not found".to_string())
        .map(|p| p.join("Hablara").join("recordings"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    fn test_get_app_support_storage_path() {
        let result = get_app_support_storage_path();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("Application Support"));
        assert!(path.ends_with("Hablara/recordings"));
    }

    #[test]
    #[cfg(not(target_os = "macos"))]
    fn test_get_app_support_storage_path_non_macos() {
        // On non-macOS, dirs::data_dir() returns a platform-specific path
        let result = get_app_support_storage_path();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.ends_with("Hablara/recordings"));
    }
}
