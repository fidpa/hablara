//! Hotkey Agent Commands
//!
//! Commands for managing the Hablara Hotkey Agent (LaunchAgent on macOS).
//! The agent runs in the background and launches Hablara when Ctrl+Shift+D is pressed.

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

const PLIST_NAME: &str = "de.hablara.hotkey-agent.plist";
const AGENT_LABEL: &str = "de.hablara.hotkey-agent";

/// Get path to LaunchAgents directory
fn get_launchagents_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| format!("Failed to get HOME: {}", e))?;
    Ok(PathBuf::from(home)
        .join("Library")
        .join("LaunchAgents"))
}

/// Get path to plist in LaunchAgents
fn get_plist_path() -> Result<PathBuf, String> {
    Ok(get_launchagents_dir()?.join(PLIST_NAME))
}

/// Install the hotkey agent as LaunchAgent
///
/// Implementation:
/// 1. Copies plist from app bundle to ~/Library/LaunchAgents/
/// 2. Unloads existing agent if running (idempotent)
/// 3. Loads the agent with launchctl
/// 4. Starts the agent
///
/// # Returns
/// - Ok(()) if installation succeeded
/// - Err(String) with error message if failed
#[tauri::command]
pub async fn install_hotkey_agent(app_handle: AppHandle) -> Result<(), String> {
    tracing::info!("Installing hotkey agent...");

    // 1. Get plist from app bundle resources (no I/O, synchronous)
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let plist_source = resource_dir
        .join("hablara-agent")
        .join(PLIST_NAME);

    let launchagents_dir = get_launchagents_dir()?;
    let plist_dest = launchagents_dir.join(PLIST_NAME);

    // Clone for move into spawn_blocking closure
    let plist_source_clone = plist_source.clone();
    let plist_dest_clone = plist_dest.clone();
    let launchagents_dir_clone = launchagents_dir.clone();

    // 2-3. File I/O operations in spawn_blocking (CRITICAL: prevents thread pool starvation)
    tokio::task::spawn_blocking(move || {
        // Check existence inside spawn_blocking to avoid TOCTOU race
        if !plist_source_clone.exists() {
            return Err(format!(
                "plist not found in app bundle: {}",
                plist_source_clone.display()
            ));
        }

        tracing::debug!("Found plist source: {}", plist_source_clone.display());

        // Create LaunchAgents directory if needed
        fs::create_dir_all(&launchagents_dir_clone)
            .map_err(|e| format!("Failed to create LaunchAgents dir: {}", e))?;

        // Copy plist to destination
        fs::copy(&plist_source_clone, &plist_dest_clone)
            .map_err(|e| format!("Failed to copy plist: {}", e))?;

        tracing::info!("Copied plist to: {}", plist_dest_clone.display());
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    // 4. Unload if already loaded (idempotent, ignore errors)
    let _ = Command::new("launchctl")
        .arg("unload")
        .arg(&plist_dest)
        .output();

    // 5. Load the agent
    let output = Command::new("launchctl")
        .arg("load")
        .arg(&plist_dest)
        .output()
        .map_err(|e| format!("Failed to load agent: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Sanitize stderr for frontend display (C2 fix)
        let sanitized_error = stderr
            .chars()
            .take(200)
            .filter(|c| c.is_ascii_alphanumeric() || c.is_ascii_whitespace() || *c == ':' || *c == '-')
            .collect::<String>();
        tracing::error!("launchctl load failed: {}", stderr);
        return Err(format!("Failed to load agent: {}", sanitized_error));
    }

    tracing::info!("Loaded agent with launchctl");

    // 6. Start the agent
    let output = Command::new("launchctl")
        .arg("start")
        .arg(AGENT_LABEL)
        .output()
        .map_err(|e| format!("Failed to start agent: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let sanitized_error = stderr
            .chars()
            .take(200)
            .filter(|c| c.is_ascii_alphanumeric() || c.is_ascii_whitespace() || *c == ':' || *c == '-')
            .collect::<String>();
        tracing::warn!("Agent start returned error (may already be running): {}", sanitized_error);
    }

    tracing::info!("Hotkey agent installed successfully");
    Ok(())
}

/// Uninstall the hotkey agent
///
/// Implementation:
/// 1. Stops the agent with launchctl (idempotent)
/// 2. Unloads the agent
/// 3. Removes plist from ~/Library/LaunchAgents/
///
/// # Returns
/// - Ok(()) if uninstallation succeeded
/// - Err(String) with error message if failed
#[tauri::command]
pub async fn uninstall_hotkey_agent() -> Result<(), String> {
    tracing::info!("Uninstalling hotkey agent...");

    let plist_path = get_plist_path()?;
    let plist_path_clone = plist_path.clone();

    // 1. Check existence and remove plist in spawn_blocking (C1 fix)
    let plist_exists = tokio::task::spawn_blocking(move || {
        if !plist_path_clone.exists() {
            return Ok::<bool, String>(false);
        }
        Ok(true)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    if !plist_exists {
        tracing::info!("Agent not installed (plist not found)");
        return Ok(());
    }

    // 2. Stop the agent (ignore errors if not running)
    let _ = Command::new("launchctl")
        .arg("stop")
        .arg(AGENT_LABEL)
        .output();

    tracing::debug!("Stopped agent (or was not running)");

    // 3. Unload the agent
    let output = Command::new("launchctl")
        .arg("unload")
        .arg(&plist_path)
        .output()
        .map_err(|e| format!("Failed to unload agent: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let sanitized_error = stderr
            .chars()
            .take(200)
            .filter(|c| c.is_ascii_alphanumeric() || c.is_ascii_whitespace() || *c == ':' || *c == '-')
            .collect::<String>();
        tracing::warn!("Unload returned error (may already be unloaded): {}", sanitized_error);
    }

    tracing::debug!("Unloaded agent");

    // 4. Remove plist (file I/O in spawn_blocking)
    let plist_path_clone = plist_path.clone();
    tokio::task::spawn_blocking(move || {
        fs::remove_file(&plist_path_clone)
            .map_err(|e| format!("Failed to remove plist: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    tracing::info!("Hotkey agent uninstalled successfully");
    Ok(())
}

/// Check if the hotkey agent is running
///
/// Uses launchctl list to check if the agent is loaded and running.
///
/// # Returns
/// - Ok(true) if agent is running
/// - Ok(false) if agent is not running
/// - Err(String) if check failed
#[tauri::command]
pub async fn is_hotkey_agent_running() -> Result<bool, String> {
    // Run launchctl list and check for agent
    let output = Command::new("launchctl")
        .arg("list")
        .output()
        .map_err(|e| format!("Failed to run launchctl: {}", e))?;

    if !output.status.success() {
        return Err("Failed to list LaunchAgents".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let is_running = stdout.contains(AGENT_LABEL);

    tracing::debug!("Hotkey agent running: {}", is_running);
    Ok(is_running)
}
