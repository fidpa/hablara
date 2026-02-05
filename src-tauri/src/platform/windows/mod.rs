//! Windows-specific implementations
//!
//! This module contains code that only runs on Windows:
//! - WASAPI audio tuning
//! - Credential Manager handling
//! - DirectML/ONNX acceleration utilities
//!
//! # Current Features
//!
//! - `is_mlx_available()`: Always false (MLX is Apple Silicon only)
//! - `get_local_app_data_storage_path()`: LocalAppData storage path for direct distribution
//!
//! # Implementation Roadmap
//!
//! - **Phase B**: WASAPI latency tuning, basic Windows support
//! - **Phase E**: DirectML initialization for GPU acceleration

use std::path::PathBuf;

/// Check if MLX is available (always false on Windows - MLX is Apple Silicon only)
pub fn is_mlx_available() -> bool {
    false
}

/// LocalAppData storage path for direct distribution.
///
/// Returns `%LOCALAPPDATA%\Hablara\recordings\`
pub fn get_local_app_data_storage_path() -> Result<PathBuf, String> {
    dirs::data_local_dir()
        .ok_or_else(|| "LocalAppData directory not found".to_string())
        .map(|p| p.join("Hablara").join("recordings"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_local_app_data_storage_path() {
        let result = get_local_app_data_storage_path();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.ends_with("Hablara\\recordings") || path.ends_with("Hablara/recordings"));
    }
}
