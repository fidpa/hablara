//! Audio Device Enumeration
//!
//! Provides functions to list available audio input/output devices.
//!
//! Based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

/// Information about an audio device (serializable for frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpalDeviceInfo {
    /// Device index (for selection)
    pub index: String,
    /// Human-readable device name
    pub name: String,
    /// Whether this is the system default device
    pub is_default: bool,
    /// Device sample rate (0 if unknown)
    pub sample_rate: u32,
}

/// Get the appropriate cpal host for the current platform
/// On Linux, uses ALSA host. On other platforms, uses the default host.
pub fn get_cpal_host() -> cpal::Host {
    #[cfg(target_os = "linux")]
    {
        cpal::host_from_id(cpal::HostId::Alsa).unwrap_or_else(|_| cpal::default_host())
    }
    #[cfg(not(target_os = "linux"))]
    {
        cpal::default_host()
    }
}

/// List available input (microphone) devices
pub fn list_input_devices() -> Result<Vec<CpalDeviceInfo>, String> {
    let host = get_cpal_host();
    let default_name = host.default_input_device().and_then(|d| d.name().ok());

    let mut out = Vec::new();

    let devices = host
        .input_devices()
        .map_err(|e| format!("Failed to enumerate input devices: {}", e))?;

    for (index, device) in devices.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let is_default = Some(name.clone()) == default_name;

        // Try to get the sample rate
        let sample_rate = device
            .default_input_config()
            .map(|c| c.sample_rate().0)
            .unwrap_or(0);

        out.push(CpalDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
            sample_rate,
        });
    }

    Ok(out)
}
