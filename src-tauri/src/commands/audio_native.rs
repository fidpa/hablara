//! Native cpal Audio Commands (Primary Path)
//!
//! These commands use the native cpal audio system for production Desktop app.
//! This is the primary audio path - Web Audio API (audio_legacy.rs) is only a fallback.

use crate::audio::NativeAudioState;
use crate::native_audio::{list_input_devices as list_devices, CpalDeviceInfo};
use tauri::State;

use super::utils::encode_audio_base64;

/// List available audio input devices
#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<CpalDeviceInfo>, String> {
    list_devices()
}

/// Open native audio device (must be called before recording)
#[tauri::command]
pub async fn native_open_audio(state: State<'_, NativeAudioState>) -> Result<(), String> {
    state.open()
}

/// Start native audio recording
#[tauri::command]
pub async fn native_start_recording(state: State<'_, NativeAudioState>) -> Result<(), String> {
    // Auto-open if not already open
    if !state.is_open() {
        state.open()?;
    }
    state.start()
}

/// Stop native audio recording and return Base64 encoded WAV
#[tauri::command]
pub async fn native_stop_recording(state: State<'_, NativeAudioState>) -> Result<String, String> {
    let samples = state.stop()?;

    if samples.is_empty() {
        tracing::debug!("Native audio: No speech detected in recording");
        return Ok(String::new());
    }

    // Convert samples to WAV bytes
    let wav_bytes = crate::vad::pipeline::samples_to_wav_bytes(&samples, 16000);

    // Encode as Base64
    let base64 = encode_audio_base64(&wav_bytes);
    tracing::debug!(
        samples = samples.len(),
        wav_bytes = wav_bytes.len(),
        base64_chars = base64.len(),
        "Native audio: Recording converted"
    );

    Ok(base64)
}

/// Get current audio level from native recorder (0.0 - 1.0)
#[tauri::command]
pub fn native_get_audio_level(state: State<'_, NativeAudioState>) -> Result<f32, String> {
    Ok(state.get_level())
}

/// Close native audio device
#[tauri::command]
pub async fn native_close_audio(state: State<'_, NativeAudioState>) -> Result<(), String> {
    state.close()
}

/// Check if native audio is recording
#[tauri::command]
pub fn native_is_recording(state: State<'_, NativeAudioState>) -> Result<bool, String> {
    Ok(state.is_recording())
}
