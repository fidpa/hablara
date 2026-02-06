//! Keyring Commands - OS-native Credential Storage
//!
//! Provides Tauri commands for secure credential storage via the `keyring` crate.
//! All D-Bus/Keychain operations use `spawn_blocking` to prevent thread starvation.
//!
//! Platform backends:
//! - macOS: Keychain (AES-256-GCM)
//! - Windows: Credential Manager (DPAPI)
//! - Linux: Secret Service API (D-Bus, GNOME Keyring / KWallet / ksecretd)

use serde::Serialize;

/// Test user for keyring diagnostics ping
const KEYRING_PING_USER: &str = "__keyring_ping__";

/// OS identifier resolved at compile time
#[cfg(target_os = "macos")]
const CURRENT_OS: &str = "macos";
#[cfg(target_os = "windows")]
const CURRENT_OS: &str = "windows";
#[cfg(target_os = "linux")]
const CURRENT_OS: &str = "linux";
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
const CURRENT_OS: &str = "unknown";

/// Diagnostics result for Secret Service availability checks.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyringDiagnostics {
    /// Whether the keyring backend is functional
    pub available: bool,
    /// Operating system (linux, macos, windows)
    pub os: String,
    /// Error message if unavailable
    pub error: Option<String>,
}

/// Validate keyring parameters (non-empty, reasonable length).
fn validate_params(service: &str, user: &str) -> Result<(), String> {
    if service.is_empty() || user.is_empty() {
        return Err("Service and user must not be empty".to_string());
    }
    if service.len() > 256 || user.len() > 256 {
        return Err("Service and user must not exceed 256 characters".to_string());
    }
    Ok(())
}

/// Get a password from the OS keyring.
///
/// Returns `Ok(Some(password))` if found, `Ok(None)` if not found,
/// or `Err` on backend failure (e.g. D-Bus unavailable).
#[tauri::command]
pub async fn keyring_get_password(service: String, user: String) -> Result<Option<String>, String> {
    validate_params(&service, &user)?;

    tokio::task::spawn_blocking(move || {
        let entry = keyring::Entry::new(&service, &user)
            .map_err(|e| format!("Keyring entry creation failed for '{}': {}", service, e))?;
        match entry.get_password() {
            Ok(pw) => {
                tracing::debug!(service = %service, "Keyring: password retrieved");
                Ok(Some(pw))
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => {
                tracing::error!(service = %service, error = %e, "Keyring: get_password failed");
                Err(format!("Failed to get password for '{}': {}", service, e))
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Store a password in the OS keyring.
///
/// Overwrites any existing entry for the same service/user pair.
#[tauri::command]
pub async fn keyring_set_password(
    service: String,
    user: String,
    password: String,
) -> Result<(), String> {
    validate_params(&service, &user)?;

    tokio::task::spawn_blocking(move || {
        let entry = keyring::Entry::new(&service, &user)
            .map_err(|e| format!("Keyring entry creation failed for '{}': {}", service, e))?;
        entry.set_password(&password).map_err(|e| {
            tracing::error!(service = %service, error = %e, "Keyring: set_password failed");
            format!("Failed to store password for '{}': {}", service, e)
        })?;
        tracing::info!(service = %service, "Keyring: password stored");
        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Delete a password from the OS keyring.
///
/// Returns `Ok(())` even if no entry existed (idempotent).
#[tauri::command]
pub async fn keyring_delete_password(service: String, user: String) -> Result<(), String> {
    validate_params(&service, &user)?;

    tokio::task::spawn_blocking(move || {
        let entry = keyring::Entry::new(&service, &user)
            .map_err(|e| format!("Keyring entry creation failed for '{}': {}", service, e))?;
        match entry.delete_credential() {
            Ok(()) => {
                tracing::info!(service = %service, "Keyring: password deleted");
                Ok(())
            }
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => {
                tracing::error!(service = %service, error = %e, "Keyring: delete_credential failed");
                Err(format!("Failed to delete password for '{}': {}", service, e))
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Diagnose keyring backend availability.
///
/// Attempts a read operation on a test key to verify the backend is functional.
/// Returns structured diagnostics for the frontend to display.
#[tauri::command]
pub async fn keyring_diagnose(service: String) -> Result<KeyringDiagnostics, String> {
    tokio::task::spawn_blocking(move || {
        let os = CURRENT_OS.to_string();

        // Try creating an entry and reading (will get NoEntry, which is fine)
        let entry = match keyring::Entry::new(&service, KEYRING_PING_USER) {
            Ok(e) => e,
            Err(e) => {
                tracing::warn!(service = %service, error = %e, "Keyring: diagnose entry creation failed");
                return Ok(KeyringDiagnostics {
                    available: false,
                    os,
                    error: Some(e.to_string()),
                });
            }
        };

        match entry.get_password() {
            Ok(_) => Ok(KeyringDiagnostics {
                available: true,
                os,
                error: None,
            }),
            Err(keyring::Error::NoEntry) => Ok(KeyringDiagnostics {
                available: true,
                os,
                error: None,
            }),
            Err(e) => {
                tracing::warn!(service = %service, error = %e, "Keyring: diagnose backend unavailable");
                Ok(KeyringDiagnostics {
                    available: false,
                    os,
                    error: Some(e.to_string()),
                })
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
