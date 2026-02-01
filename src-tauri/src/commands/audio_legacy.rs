//! Web Audio API Commands (Legacy Fallback)
//!
//! These commands are used only as a fallback when native cpal audio fails.
//! In production (Desktop app), native audio (audio_native.rs) is the primary path.

use crate::audio::AudioState;
use tauri::State;

/// Start audio recording
#[tauri::command]
pub async fn start_recording(
    state: State<'_, AudioState>,
    sample_rate: Option<u32>,
) -> Result<(), String> {
    let rate = sample_rate.unwrap_or(16000);
    state.start_recording(rate);
    Ok(())
}

/// Stop recording and return audio data
#[tauri::command]
pub async fn stop_recording(state: State<'_, AudioState>) -> Result<Vec<f32>, String> {
    Ok(state.stop_recording())
}

/// Get current audio input level (0-1)
#[tauri::command]
pub async fn get_audio_level(state: State<'_, AudioState>) -> Result<f32, String> {
    Ok(state.get_level())
}

/// Add audio samples from frontend
#[tauri::command]
pub async fn add_audio_samples(
    state: State<'_, AudioState>,
    samples: Vec<f32>,
) -> Result<(), String> {
    state.add_samples(&samples);
    Ok(())
}
