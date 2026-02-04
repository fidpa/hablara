//! System Commands
//!
//! Cross-platform system information commands.
//! Provides display server type detection for frontend adaptation.

/// Get the current display session type.
///
/// Returns the display server/session type for the current platform:
/// - Linux: `XDG_SESSION_TYPE`, with `WAYLAND_DISPLAY` fallback, or "x11" default
/// - Windows: "windows"
/// - macOS: "aqua"
#[tauri::command]
pub fn get_session_type() -> String {
    #[cfg(target_os = "linux")]
    {
        if let Ok(session_type) = std::env::var("XDG_SESSION_TYPE") {
            session_type.to_lowercase()
        } else if std::env::var("WAYLAND_DISPLAY").is_ok() {
            "wayland".to_string()
        } else {
            "x11".to_string()
        }
    }

    #[cfg(target_os = "windows")]
    {
        "windows".to_string()
    }

    #[cfg(target_os = "macos")]
    {
        "aqua".to_string()
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        "unknown".to_string()
    }
}
