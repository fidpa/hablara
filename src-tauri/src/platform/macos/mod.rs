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

/// Check if MLX (Apple Silicon ML framework) is available.
///
/// Returns `true` on ARM64 (Apple Silicon), `false` on Intel Macs.
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
