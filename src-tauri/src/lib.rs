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

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Set ORT_DYLIB_PATH for ONNX Runtime dynamic loading on Windows.
/// Searches candidate paths and sets the env var to the first found DLL.
#[cfg(target_os = "windows")]
fn setup_ort_dylib_path(candidates: &[std::path::PathBuf]) {
    for candidate in candidates {
        if candidate.exists() {
            // SAFETY: Called during single-threaded setup() before any
            // worker threads access ORT_DYLIB_PATH. The ort crate reads
            // this env var lazily on first ONNX session creation.
            unsafe { std::env::set_var("ORT_DYLIB_PATH", candidate) };
            tracing::info!(path = %candidate.display(), "ORT_DYLIB_PATH set for ONNX Runtime");
            return;
        }
    }
    tracing::warn!(
        searched = ?candidates.iter().map(|p| p.display().to_string()).collect::<Vec<_>>(),
        "onnxruntime.dll not found - VAD may fail on Windows"
    );
}

// Menu item IDs as constants to prevent typos
const MENU_OPEN_SETTINGS: &str = "open_settings";
const MENU_HELP_WEBSITE: &str = "help_website";
const MENU_HELP_SHORTCUTS: &str = "help_shortcuts";
const MENU_HELP_FEEDBACK: &str = "help_feedback";

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

                // Windows dev: Set ORT_DYLIB_PATH for ONNX Runtime dynamic loading
                #[cfg(target_os = "windows")]
                setup_ort_dylib_path(&[
                    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                        .join("resources")
                        .join("onnxruntime.dll"),
                ]);
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

                    // Windows: Set ORT_DYLIB_PATH for ONNX Runtime dynamic loading
                    #[cfg(target_os = "windows")]
                    setup_ort_dylib_path(&[
                        resource_dir.join("resources").join("onnxruntime.dll"),
                        resource_dir.join("onnxruntime.dll"),
                    ]);
                }
            }

            app.manage(native_audio_state);

            // Build custom application menu
            // Settings menu item (emits event to frontend)
            let settings_item = MenuItemBuilder::new("Einstellungen...")
                .id(MENU_OPEN_SETTINGS)
                .accelerator("CmdOrCtrl+,")
                .build(app)?;

            // Help menu items
            let help_website = MenuItemBuilder::new("Hablará Website")
                .id(MENU_HELP_WEBSITE)
                .build(app)?;

            let help_shortcuts = MenuItemBuilder::new("Tastaturkürzel")
                .id(MENU_HELP_SHORTCUTS)
                .accelerator("CmdOrCtrl+?")
                .build(app)?;

            let help_feedback = MenuItemBuilder::new("Feedback geben...")
                .id(MENU_HELP_FEEDBACK)
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Hilfe")
                .item(&help_shortcuts)
                .separator()
                .item(&help_website)
                .item(&help_feedback)
                .build()?;

            // Platform-specific menu setup
            #[cfg(target_os = "macos")]
            {
                // macOS: Include app menu with standard items + Settings (⌘,)
                let app_menu = SubmenuBuilder::new(app, "Hablará")
                    .about(None)
                    .separator()
                    .item(&settings_item)
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;

                let edit_menu = SubmenuBuilder::new(app, "Bearbeiten")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;

                let window_menu = SubmenuBuilder::new(app, "Fenster")
                    .minimize()
                    .separator()
                    .close_window()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_menu)
                    .item(&edit_menu)
                    .item(&window_menu)
                    .item(&help_menu)
                    .build()?;

                app.set_menu(menu)?;
            }

            #[cfg(not(target_os = "macos"))]
            {
                // Windows/Linux: File menu with Settings + Help menu
                let file_menu = SubmenuBuilder::new(app, "Datei")
                    .item(&settings_item)
                    .separator()
                    .quit()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&file_menu)
                    .item(&help_menu)
                    .build()?;

                app.set_menu(menu)?;
            }

            #[cfg(debug_assertions)]
            {
                // DevTools available via right-click → "Inspect Element"
                // Auto-open disabled to prevent extra black window
                tracing::debug!("Development mode: DevTools available via context menu");
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();
            match event_id {
                id if id == MENU_HELP_WEBSITE => {
                    // Open Hablará website in default browser
                    if let Err(e) = open::that("https://www.hablara.de") {
                        tracing::error!("Failed to open help website: {}", e);
                    }
                }
                id if id == MENU_HELP_FEEDBACK => {
                    // Open GitHub Issues for feedback
                    if let Err(e) = open::that("https://github.com/fidoriel/hablara/issues") {
                        tracing::error!("Failed to open feedback page: {}", e);
                    }
                }
                id if id == MENU_OPEN_SETTINGS => {
                    // Emit event to frontend to open Settings panel
                    if let Err(e) = app.emit("menu:open-settings", ()) {
                        tracing::error!("Failed to emit open-settings event: {}", e);
                    }
                }
                id if id == MENU_HELP_SHORTCUTS => {
                    // Emit event to frontend to show shortcuts modal
                    if let Err(e) = app.emit("menu:show-shortcuts", ()) {
                        tracing::error!("Failed to emit show-shortcuts event: {}", e);
                    }
                }
                _ => {}
            }
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
