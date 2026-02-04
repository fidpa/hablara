//! Windows-specific implementations
//!
//! This module contains code that only runs on Windows:
//! - WASAPI audio tuning
//! - Credential Manager handling
//! - DirectML/ONNX acceleration utilities
//!
//! # Implementation Roadmap
//!
//! - **Phase B**: WASAPI latency tuning, basic Windows support
//! - **Phase E**: DirectML initialization for GPU acceleration

/// Check if MLX is available (always false on Windows - MLX is Apple Silicon only)
pub fn is_mlx_available() -> bool {
    false
}
