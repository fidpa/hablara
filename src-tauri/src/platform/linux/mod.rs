//! Linux-specific implementations
//!
//! This module contains code that only runs on Linux:
//! - Wayland/X11 session detection
//! - XDG Base Directory paths
//!
//! # Current Features
//!
//! - `is_mlx_available()`: Always false (MLX is Apple Silicon only)
//! - `is_wayland_session()`: Detects Wayland vs X11 display server
//! - `get_xdg_data_home()`: XDG data directory (`~/.local/share` fallback)
//! - `get_xdg_config_home()`: XDG config directory (`~/.config` fallback)
//!
//! # Roadmap
//!
//! - D-Bus integration for desktop notifications
//! - PipeWire audio backend detection

use std::path::PathBuf;

/// Check if MLX is available (always false on Linux - MLX is Apple Silicon only)
pub fn is_mlx_available() -> bool {
    false
}

/// Detect if the current session is running on Wayland.
///
/// Checks `XDG_SESSION_TYPE` first, falls back to `WAYLAND_DISPLAY`.
/// Returns `false` if neither indicates Wayland (assumes X11).
pub fn is_wayland_session() -> bool {
    if let Ok(session_type) = std::env::var("XDG_SESSION_TYPE") {
        return session_type.eq_ignore_ascii_case("wayland");
    }
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

/// Get the XDG data home directory.
///
/// Returns `$XDG_DATA_HOME` if set and absolute, otherwise `~/.local/share`.
/// Returns an error if the home directory cannot be determined.
pub fn get_xdg_data_home() -> Result<PathBuf, String> {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        let path = PathBuf::from(&xdg);
        if path.is_absolute() {
            return Ok(path);
        }
        tracing::warn!("XDG_DATA_HOME is not absolute ('{xdg}'), falling back to default");
    }
    let home = dirs::home_dir()
        .ok_or_else(|| "HOME directory not found".to_string())?;
    Ok(home.join(".local").join("share"))
}

/// Get the XDG config home directory.
///
/// Returns `$XDG_CONFIG_HOME` if set and absolute, otherwise `~/.config`.
/// Returns an error if the home directory cannot be determined.
pub fn get_xdg_config_home() -> Result<PathBuf, String> {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        let path = PathBuf::from(&xdg);
        if path.is_absolute() {
            return Ok(path);
        }
        tracing::warn!("XDG_CONFIG_HOME is not absolute ('{xdg}'), falling back to default");
    }
    let home = dirs::home_dir()
        .ok_or_else(|| "HOME directory not found".to_string())?;
    Ok(home.join(".config"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_mlx_available_always_false() {
        assert!(!is_mlx_available());
    }

    #[test]
    fn test_xdg_data_home_with_env() {
        std::env::set_var("XDG_DATA_HOME", "/custom/data");
        let path = get_xdg_data_home().unwrap();
        assert_eq!(path, PathBuf::from("/custom/data"));
        std::env::remove_var("XDG_DATA_HOME");
    }

    #[test]
    fn test_xdg_data_home_rejects_relative_path() {
        std::env::set_var("XDG_DATA_HOME", "relative/path");
        let path = get_xdg_data_home().unwrap();
        // Should fall back to default, not use relative path
        assert!(path.ends_with(".local/share"));
        std::env::remove_var("XDG_DATA_HOME");
    }

    #[test]
    fn test_xdg_config_home_with_env() {
        std::env::set_var("XDG_CONFIG_HOME", "/custom/config");
        let path = get_xdg_config_home().unwrap();
        assert_eq!(path, PathBuf::from("/custom/config"));
        std::env::remove_var("XDG_CONFIG_HOME");
    }

    #[test]
    fn test_xdg_config_home_rejects_relative_path() {
        std::env::set_var("XDG_CONFIG_HOME", "relative/path");
        let path = get_xdg_config_home().unwrap();
        // Should fall back to default, not use relative path
        assert!(path.ends_with(".config"));
        std::env::remove_var("XDG_CONFIG_HOME");
    }

    #[test]
    fn test_xdg_data_home_default() {
        std::env::remove_var("XDG_DATA_HOME");
        let path = get_xdg_data_home().unwrap();
        assert!(path.ends_with(".local/share"));
    }

    #[test]
    fn test_xdg_config_home_default() {
        std::env::remove_var("XDG_CONFIG_HOME");
        let path = get_xdg_config_home().unwrap();
        assert!(path.ends_with(".config"));
    }
}
