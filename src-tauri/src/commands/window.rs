//! Window Commands
//!
//! Commands for retrieving window properties like size and position.
//! Includes validation layer for window state persistence edge cases.
//!
//! Reference: docs/reference/guidelines/RUST.md

use tauri::{AppHandle, Manager, WebviewWindow};

/// Window size information (physical and logical pixels)
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSize {
    // Inner size (content area, excludes decorations)
    inner_physical_width: u32,
    inner_physical_height: u32,
    inner_logical_width: f64,
    inner_logical_height: f64,
    // Outer size (full window, includes title bar)
    outer_physical_width: u32,
    outer_physical_height: u32,
    outer_logical_width: f64,
    outer_logical_height: f64,
    scale_factor: f64,
}

/// Get current window size (both inner and outer, physical and logical)
///
/// Returns comprehensive size information including:
/// - Inner size: Content area (excludes title bar and borders)
/// - Outer size: Full window (includes decorations)
/// - Physical pixels (actual screen pixels)
/// - Logical pixels (DPI-adjusted, what user sees in window manager)
/// - Scale factor (DPR/Retina scaling)
#[tauri::command]
pub async fn get_window_size(app: AppHandle) -> Result<WindowSize, String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // Get inner size (content area)
    let inner_physical = window
        .inner_size()
        .map_err(|e| format!("Failed to get inner size: {}", e))?;

    // Get outer size (full window with decorations)
    let outer_physical = window
        .outer_size()
        .map_err(|e| format!("Failed to get outer size: {}", e))?;

    let scale_factor = window
        .scale_factor()
        .map_err(|e| format!("Failed to get scale factor: {}", e))?;

    // Calculate logical sizes
    let inner_logical_width = inner_physical.width as f64 / scale_factor;
    let inner_logical_height = inner_physical.height as f64 / scale_factor;
    let outer_logical_width = outer_physical.width as f64 / scale_factor;
    let outer_logical_height = outer_physical.height as f64 / scale_factor;

    Ok(WindowSize {
        inner_physical_width: inner_physical.width,
        inner_physical_height: inner_physical.height,
        inner_logical_width,
        inner_logical_height,
        outer_physical_width: outer_physical.width,
        outer_physical_height: outer_physical.height,
        outer_logical_width,
        outer_logical_height,
        scale_factor,
    })
}

/// Validate and correct window state after plugin restore
///
/// Defensive validation layer on top of tauri-plugin-window-state.
/// Handles edge cases:
/// - DPI scaling issues (PhysicalSize vs LogicalSize mismatch)
/// - Multi-monitor position out of bounds
/// - Fullscreen state restoration bug (GitHub Issue #3215)
/// - Size constraints (MIN/MAX bounds)
///
/// Called from frontend after plugin restore completes (500ms delay).
///
/// # Errors
/// Returns error if window not found or Tauri API calls fail.
///
/// # References
/// - docs/explanation/debugging/WINDOW_STATE_EDGE_CASES_ANALYSIS.md
/// - docs/explanation/debugging/WINDOW_STATE_IMPLEMENTATION_VERIFICATION.md
/// - GitHub Issue #3215: Fullscreen restore bug
/// - GitHub Issue #7890: macOS position reporting bug
#[tauri::command]
pub async fn validate_window_state(app: AppHandle) -> Result<(), String> {
    use tauri::LogicalSize;

    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // 1. Fullscreen recovery FIRST (workaround for upstream bug #3215)
    check_fullscreen_recovery(&window).await?;

    // 2. Get current state (plugin already restored)
    let scale_factor = window
        .scale_factor()
        .map_err(|e| format!("Failed to get scale factor: {}", e))?;

    let inner_size = window
        .inner_size()
        .map_err(|e| format!("Failed to get inner size: {}", e))?;

    // 3. Convert to logical for DPI-independent comparison
    // (mitigates GitHub Issue #7890 - macOS physical position bug)
    let logical_width = (inner_size.width as f64 / scale_factor).round() as u32;
    let logical_height = (inner_size.height as f64 / scale_factor).round() as u32;

    // 4. Constrain to DEFAULT/MAX bounds
    // SYNC WITH types.ts: DEFAULT_WINDOW_STATE, MIN/MAX_WINDOW_WIDTH/HEIGHT
    // If types.ts changes, update these values accordingly!
    //
    // NOTE: We use DEFAULT (1280x1440) as minimum, NOT MIN (1024x768).
    // Reason: tauri-plugin-window-state has a bug (Issue #251) where
    // missing state results in {width: 0, height: 0}, which gets
    // constrained to minWidth/minHeight. We want DEFAULT instead.
    const DEFAULT_WIDTH: u32 = 1280;  // types.ts:627 DEFAULT_WINDOW_STATE.width
    const DEFAULT_HEIGHT: u32 = 1440; // types.ts:628 DEFAULT_WINDOW_STATE.height
    const MAX_WIDTH: u32 = 3840;      // types.ts:636 MAX_WINDOW_WIDTH
    const MAX_HEIGHT: u32 = 2160;     // types.ts:637 MAX_WINDOW_HEIGHT

    // If window is smaller than DEFAULT (likely from plugin bug #251),
    // set it to DEFAULT. If larger than MAX, constrain to MAX.
    let corrected_width = if logical_width < DEFAULT_WIDTH {
        DEFAULT_WIDTH
    } else if logical_width > MAX_WIDTH {
        MAX_WIDTH
    } else {
        logical_width
    };

    let corrected_height = if logical_height < DEFAULT_HEIGHT {
        DEFAULT_HEIGHT
    } else if logical_height > MAX_HEIGHT {
        MAX_HEIGHT
    } else {
        logical_height
    };

    // 5. Apply size corrections if needed
    if corrected_width != logical_width || corrected_height != logical_height {
        tracing::warn!(
            "Window size corrected: {}x{} → {}x{} (logical) [plugin bug #251 workaround]",
            logical_width,
            logical_height,
            corrected_width,
            corrected_height
        );

        window
            .set_size(LogicalSize::new(corrected_width, corrected_height))
            .map_err(|e| format!("Failed to set size: {}", e))?;
    }

    // 6. Multi-monitor position validation
    validate_position(&window, corrected_width, corrected_height, scale_factor)?;

    tracing::info!(
        "Window state validation completed: {}x{} @ scale {}",
        corrected_width,
        corrected_height,
        scale_factor
    );

    Ok(())
}

/// Check if window is in fullscreen and apply recovery logic
///
/// Workaround for upstream bug (GitHub Issue #3215):
/// Plugin cannot restore window size after exiting fullscreen.
///
/// Strategy: Exit fullscreen on startup + apply default size + center.
///
/// # Errors
/// Returns error if Tauri API calls fail.
async fn check_fullscreen_recovery(window: &WebviewWindow) -> Result<(), String> {
    use tauri::LogicalSize;

    let is_fullscreen = window
        .is_fullscreen()
        .map_err(|e| format!("Failed to check fullscreen: {}", e))?;

    if is_fullscreen {
        tracing::warn!("Fullscreen detected on startup → exiting fullscreen mode (upstream bug #3215 workaround)");

        // Exit fullscreen
        window
            .set_fullscreen(false)
            .map_err(|e| format!("Failed to exit fullscreen: {}", e))?;

        // Apply default size - SYNC WITH types.ts:627-628 DEFAULT_WINDOW_STATE
        // width: 1280, height: 1440
        window
            .set_size(LogicalSize::new(1280, 1440))
            .map_err(|e| format!("Failed to set default size: {}", e))?;

        // Center on screen
        window
            .center()
            .map_err(|e| format!("Failed to center window: {}", e))?;
    }

    Ok(())
}

/// Validate window position against available monitors
///
/// Checks if window is within bounds of any available monitor.
/// If not, centers window on primary monitor.
///
/// Handles multi-monitor edge cases:
/// - Position on disconnected monitor (x/y out of bounds)
/// - Position after fullscreen on secondary monitor
///
/// # Arguments
/// - `window`: The window to validate
/// - `width`: Window width in logical pixels
/// - `height`: Window height in logical pixels
/// - `scale_factor`: Current scale factor (for coordinate conversion)
///
/// # Errors
/// Returns error if Tauri API calls fail.
fn validate_position(
    window: &WebviewWindow,
    width: u32,
    height: u32,
    scale_factor: f64,
) -> Result<(), String> {
    let position = window
        .outer_position()
        .map_err(|e| format!("Failed to get position: {}", e))?;

    let monitors = window
        .available_monitors()
        .map_err(|e| format!("Failed to get monitors: {}", e))?;

    // Convert to logical for DPI-independent comparison
    // (mitigates GitHub Issue #7890 - macOS reports PhysicalPosition inconsistently)
    let logical_x = (position.x as f64 / scale_factor).round() as i32;
    let logical_y = (position.y as f64 / scale_factor).round() as i32;

    // Check if window fits within any monitor
    for monitor in monitors.iter() {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();

        // Convert monitor bounds to logical
        let mon_x = (mon_pos.x as f64 / scale_factor).round() as i32;
        let mon_y = (mon_pos.y as f64 / scale_factor).round() as i32;
        let mon_width = (mon_size.width as f64 / scale_factor).round() as u32;
        let mon_height = (mon_size.height as f64 / scale_factor).round() as u32;

        // Check if window is within monitor bounds
        if logical_x >= mon_x
            && logical_x + width as i32 <= mon_x + mon_width as i32
            && logical_y >= mon_y
            && logical_y + height as i32 <= mon_y + mon_height as i32
        {
            // Position valid
            return Ok(());
        }
    }

    // Invalid position → Center on primary monitor
    tracing::warn!(
        "Window position out of bounds: ({}, {}) → centering on primary monitor",
        logical_x,
        logical_y
    );

    window
        .center()
        .map_err(|e| format!("Failed to center window: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Module-level test constants - SYNC WITH types.ts
    // types.ts:627-628 DEFAULT_WINDOW_STATE.width/height
    // types.ts:636-637 MAX_WINDOW_WIDTH/HEIGHT
    const DEFAULT_WIDTH: u32 = 1280;
    const DEFAULT_HEIGHT: u32 = 1440;
    const MAX_WIDTH: u32 = 3840;
    const MAX_HEIGHT: u32 = 2160;

    /// Helper: Apply the same correction logic as validate_window_state()
    fn correct_size(width: u32, height: u32) -> (u32, u32) {
        let corrected_width = if width < DEFAULT_WIDTH {
            DEFAULT_WIDTH
        } else if width > MAX_WIDTH {
            MAX_WIDTH
        } else {
            width
        };

        let corrected_height = if height < DEFAULT_HEIGHT {
            DEFAULT_HEIGHT
        } else if height > MAX_HEIGHT {
            MAX_HEIGHT
        } else {
            height
        };

        (corrected_width, corrected_height)
    }

    #[test]
    fn test_size_constants_are_sane() {
        assert!(DEFAULT_WIDTH < MAX_WIDTH);
        assert!(DEFAULT_HEIGHT < MAX_HEIGHT);
        assert!(DEFAULT_WIDTH >= 800); // Reasonable default
        assert!(MAX_WIDTH <= 7680); // 8K resolution
    }

    #[test]
    fn test_logical_size_within_bounds() {
        // Normal size (within bounds) - keeps original
        let (corrected_width, corrected_height) = correct_size(1500, 1600);
        assert_eq!(corrected_width, 1500);
        assert_eq!(corrected_height, 1600);
    }

    #[test]
    fn test_logical_size_at_default() {
        // Exactly at DEFAULT - keeps original
        let (corrected_width, corrected_height) = correct_size(DEFAULT_WIDTH, DEFAULT_HEIGHT);
        assert_eq!(corrected_width, DEFAULT_WIDTH);
        assert_eq!(corrected_height, DEFAULT_HEIGHT);
    }

    #[test]
    fn test_logical_size_below_default_plugin_bug_251() {
        // Too small (below DEFAULT) - corrected to DEFAULT
        // This tests the plugin bug #251 workaround
        let (corrected_width, corrected_height) = correct_size(1024, 768);
        assert_eq!(corrected_width, DEFAULT_WIDTH);
        assert_eq!(corrected_height, DEFAULT_HEIGHT);
    }

    #[test]
    fn test_logical_size_zero_plugin_bug_251() {
        // Zero size (plugin bug #251 worst case) - corrected to DEFAULT
        let (corrected_width, corrected_height) = correct_size(0, 0);
        assert_eq!(corrected_width, DEFAULT_WIDTH);
        assert_eq!(corrected_height, DEFAULT_HEIGHT);
    }

    #[test]
    fn test_logical_size_above_max() {
        // Too large (above MAX) - corrected to MAX
        let (corrected_width, corrected_height) = correct_size(5000, 3000);
        assert_eq!(corrected_width, MAX_WIDTH);
        assert_eq!(corrected_height, MAX_HEIGHT);
    }

    #[test]
    fn test_dpi_scaling_conversion() {
        // Simulate 2x Retina display
        let physical_width = 2560_u32;
        let physical_height = 2880_u32;
        let scale_factor = 2.0_f64;

        let logical_width = (physical_width as f64 / scale_factor).round() as u32;
        let logical_height = (physical_height as f64 / scale_factor).round() as u32;

        assert_eq!(logical_width, 1280);
        assert_eq!(logical_height, 1440);
    }

    #[test]
    fn test_dpi_scaling_conversion_non_integer() {
        // Simulate 1.25x scaling (Windows)
        let physical_width = 1600_u32;
        let physical_height = 1000_u32;
        let scale_factor = 1.25_f64;

        let logical_width = (physical_width as f64 / scale_factor).round() as u32;
        let logical_height = (physical_height as f64 / scale_factor).round() as u32;

        assert_eq!(logical_width, 1280);
        assert_eq!(logical_height, 800);
    }

    #[test]
    fn test_position_conversion_logical() {
        // Test coordinate conversion to logical
        let physical_x = 5120_i32;
        let physical_y = 272_i32;
        let scale_factor = 2.0_f64;

        let logical_x = (physical_x as f64 / scale_factor).round() as i32;
        let logical_y = (physical_y as f64 / scale_factor).round() as i32;

        assert_eq!(logical_x, 2560);
        assert_eq!(logical_y, 136);
    }
}
