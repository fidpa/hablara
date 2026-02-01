//! Export Commands
//!
//! Commands for exporting chat history to PDF via browser

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use crate::security::path_validation::validate_html_path;

/// Open HTML file in default browser for printing to PDF
///
/// # Security
/// * Extension validation (only .html, .htm allowed)
/// * Path traversal protection
/// * Symlink following protection
///
/// # Arguments
/// * `app` - Tauri app handle (provides opener plugin access)
/// * `html_path` - Absolute path to HTML file
///
/// # Returns
/// * `Ok(())` if browser opened successfully
/// * `Err(String)` if opening failed
///
/// # Errors
/// * Security validation failed (invalid extension, path traversal, symlink)
/// * Failed to open browser
///
/// # Platform-specific behavior
/// * macOS: Opens in Safari/Chrome (user's default browser)
/// * Windows: Opens in Edge/Chrome (user's default browser)
/// * Linux: Opens via xdg-open
#[tauri::command]
pub async fn open_html_in_browser(
    app: AppHandle,
    html_path: String,
) -> Result<(), String> {
    // Security: Validate HTML path (extension, path traversal, symlinks)
    let validated_path = validate_html_path(&html_path)
        .map_err(|e| format!("Security validation failed: {}", e))?;

    // Open in browser (validated_path is guaranteed safe)
    // Convert PathBuf to String for opener API
    let path_str = validated_path
        .to_str()
        .ok_or_else(|| "Invalid UTF-8 in path".to_string())?;

    app.opener()
        .open_path(path_str, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))
}
