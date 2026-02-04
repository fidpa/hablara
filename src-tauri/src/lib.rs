//! Tauri Backend Entry Point
//! Guidelines: docs/reference/guidelines/RUST.md

mod audio;
mod audio_analysis;
pub mod commands;  // Public for integration tests
mod emotion;
mod native_audio;
pub mod security;  // Public for security audit tests
pub mod storage;   // Public for security audit tests
mod text;
mod types;
mod vad;
/// Platform-specific modules providing cross-platform abstractions.
///
/// Currently supports:
/// - macOS: MLX availability check, Metal acceleration utilities
/// - Windows: Placeholder for Phase B (WASAPI, DirectML)
/// - Linux: Wayland detection, XDG Base Directory paths
mod platform;

use tauri::Manager;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize structured logging
    // Control via RUST_LOG env var: RUST_LOG=debug, RUST_LOG=hablara=trace, etc.
    tracing_subscriber::registry()
        .with(fmt::layer().with_target(true).with_level(true))
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("hablara=debug,warn")),
        )
        .init();

    tracing::info!("Hablará Backend starting");

    // Build base plugins (cross-platform)
    let base_builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .plugin(tauri_plugin_http::init());

    // Add macOS-specific plugin conditionally
    #[cfg(target_os = "macos")]
    let app_builder = base_builder.plugin(tauri_plugin_macos_permissions::init());

    #[cfg(not(target_os = "macos"))]
    let app_builder = base_builder;

    app_builder
        .setup(|app| {
            // Initialize audio state (Web Audio API based - legacy)
            let audio_state = audio::AudioState::new();
            app.manage(audio_state);

            // Initialize native audio state (cpal-based)
            let native_audio_state = audio::NativeAudioState::new();

            // Set VAD model path for native audio
            // Try development path first (src-tauri/)
            let dev_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("models")
                .join("silero_vad_v4.onnx");

            if dev_path.exists() {
                native_audio_state.set_vad_model_path(dev_path.to_string_lossy().to_string());
            } else {
                // Try resource directory (production)
                if let Ok(resource_dir) = app.path().resource_dir() {
                    let prod_path = resource_dir
                        .join("resources")
                        .join("models")
                        .join("silero_vad_v4.onnx");
                    if prod_path.exists() {
                        native_audio_state.set_vad_model_path(prod_path.to_string_lossy().to_string());
                    }
                }
            }

            app.manage(native_audio_state);

            #[cfg(debug_assertions)]
            {
                // DevTools available via right-click → "Inspect Element"
                // Auto-open disabled to prevent extra black window
                tracing::debug!("Development mode: DevTools available via context menu");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_recording,
            commands::stop_recording,
            commands::transcribe_audio,
            commands::get_audio_level,
            commands::add_audio_samples,
            commands::analyze_audio_emotion,
            commands::analyze_audio_from_wav,
            commands::analyze_audio_tone,
            commands::check_whisper_status,
            commands::check_mlx_whisper_status,
            commands::list_mlx_whisper_models,
            // Native audio commands (cpal-based)
            commands::list_audio_devices,
            commands::native_open_audio,
            commands::native_start_recording,
            commands::native_stop_recording,
            commands::native_get_audio_level,
            commands::native_close_audio,
            commands::native_is_recording,
            // Storage commands
            commands::save_recording,
            commands::list_recordings,
            commands::get_recording_audio,
            commands::delete_recording,
            commands::clear_all_recordings,
            commands::get_storage_config,
            commands::update_storage_config,
            commands::get_storage_stats,
            commands::calculate_baseline_emotion,
            commands::get_personalized_feedback,
            // MLX-LLM commands (Emotion + Fallacy Analysis)
            commands::check_mlx_available,
            commands::analyze_emotion_mlx_cmd,
            commands::analyze_fallacy_mlx_cmd,
            // Export commands
            commands::open_html_in_browser,
            // File I/O commands
            commands::read_audio_file,
            commands::get_file_metadata,
            // Window commands
            commands::get_window_size,
            commands::validate_window_state,
            // System commands
            commands::get_session_type,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
