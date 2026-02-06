//! Whisper.cpp Transcription Backend
//!
//! Native whisper.cpp binary execution for speech-to-text.

use serde::Serialize;
use std::process::Stdio;
use tokio::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Windows creation flag to suppress visible console window for child processes.
/// See: https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use crate::commands::utils::{find_whisper_paths, get_target_triple, parse_whisper_stdout};

/// Platform-aware setup script hint for error messages
fn setup_hint() -> &'static str {
    if cfg!(target_os = "windows") {
        ".\\scripts\\setup-whisper.ps1"
    } else {
        "./scripts/setup-whisper.sh"
    }
}

const MAX_WHISPER_THREADS: usize = 8;
const DEFAULT_WHISPER_THREADS: usize = 4;

/// Detect available CPU threads for whisper.cpp, capped for optimal performance
fn thread_count() -> String {
    let threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(DEFAULT_WHISPER_THREADS)
        .clamp(1, MAX_WHISPER_THREADS);
    threads.to_string()
}

/// Construct whisper binary filename with platform-appropriate extension
fn whisper_binary_name(target_triple: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("whisper-{}.exe", target_triple)
    } else {
        format!("whisper-{}", target_triple)
    }
}

/// Whisper status
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperStatus {
    pub installed: bool,
    pub binary_path: Option<String>,
    pub models: Vec<String>,
    pub error: Option<String>,
}

/// Transcribe audio using whisper.cpp binary
///
/// This is the internal implementation called by the dispatcher in mod.rs.
/// It handles temp file management, binary execution, and output parsing.
pub(crate) async fn transcribe_whisper_cpp(
    audio_bytes: &[u8],
    model: &str,
    language: &str,
    speech_duration: f32,
    total_duration: f32,
    app_handle: &tauri::AppHandle,
) -> Result<String, String> {
    // Find whisper paths
    let (binaries_dir, models_dir) = find_whisper_paths(app_handle)?;
    let target_triple = get_target_triple()?;

    let sidecar_path = binaries_dir.join(whisper_binary_name(target_triple));

    // Check if whisper binary exists
    if !sidecar_path.exists() {
        return Ok(format!("[Whisper not installed - run: {}]", setup_hint()));
    }

    // Model path
    let model_path = models_dir.join(format!("ggml-{}.bin", model));

    if !model_path.exists() {
        return Err(format!(
            "Model '{}' not found. Run: {} {}",
            model, setup_hint(), model
        ));
    }

    // Create temp file for audio input
    let temp_dir = std::env::temp_dir();
    let audio_path = temp_dir.join("vip_input.wav");
    let output_path = temp_dir.join("vip_output.txt");

    // Write audio to temp file
    tokio::fs::write(&audio_path, audio_bytes)
        .await
        .map_err(|e| format!("Failed to write audio: {}", e))?;

    // Log for debugging
    tracing::debug!(
        path = ?audio_path,
        bytes = audio_bytes.len(),
        model = ?model_path,
        binary = ?sidecar_path,
        speech_duration,
        total_duration,
        "Whisper: Starting transcription"
    );

    // Run whisper with VAD and speech detection parameters
    let thread_count = thread_count();
    let output_stem = output_path
        .to_str()
        .expect("output_path contains invalid UTF-8")
        .trim_end_matches(".txt");

    let mut args: Vec<&str> = vec![
        "-m",
        model_path
            .to_str()
            .expect("model_path contains invalid UTF-8"),
        "-f",
        audio_path
            .to_str()
            .expect("audio_path contains invalid UTF-8"),
        "-l",
        language,
        "-otxt",
        "-of",
        output_stem,
        "-et",
        "2.4", // Entropy threshold (default, stricter = fewer hallucinations)
        "-nf", // No temperature fallback (reduces "[Musik]" labels)
        "-t",
        &thread_count,
    ];

    // Disable GPU on Linux and Windows (no GPU acceleration support in current builds).
    // On macOS ARM, Metal acceleration is available and handled by the binary itself.
    // Without this flag, whisper.cpp attempts GPU backend init which crashes on systems
    // without GPU hardware/drivers (exit None = signal termination).
    if cfg!(target_os = "linux") || cfg!(target_os = "windows") {
        args.push("-ng"); // --no-gpu: force CPU-only inference
    }

    let mut cmd = Command::new(&sidecar_path);
    cmd.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Suppress visible console window on Windows (no effect on pipe functionality)
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run whisper: {}", e))?;

    // Log whisper output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    tracing::debug!(
        status = ?output.status,
        stdout = %stdout,
        stderr = %stderr,
        "Whisper: Process completed"
    );

    if !output.status.success() {
        let _ = tokio::fs::remove_file(&audio_path).await;
        let _ = tokio::fs::remove_file(&output_path).await;
        return Err(format!(
            "Whisper failed (exit {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    // Extract text from stdout (format: [00:00:00.000 --> 00:00:02.000]   Text here)
    // This is more reliable than reading the output file
    let text = parse_whisper_stdout(&stdout).unwrap_or_else(|| {
        // Fallback: try reading from output file
        tracing::debug!("Whisper: stdout parsing failed, trying output file");
        String::new()
    });

    // If stdout parsing yielded no text, try reading from file
    let text = if text.is_empty() {
        // Small delay to ensure file is fully written
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        match tokio::fs::read_to_string(&output_path).await {
            Ok(content) => content.trim().to_string(),
            Err(e) => {
                let _ = tokio::fs::remove_file(&audio_path).await;
                return Err(format!(
                    "Failed to read whisper output: {}. stdout: {}",
                    e,
                    stdout.trim()
                ));
            }
        }
    } else {
        text
    };

    // Cleanup temp files
    let _ = tokio::fs::remove_file(&audio_path).await;
    let _ = tokio::fs::remove_file(&output_path).await;

    Ok(text)
}

/// Check if Whisper is installed and ready (implementation)
pub(crate) async fn check_whisper_status_impl(
    app_handle: &tauri::AppHandle,
) -> Result<WhisperStatus, String> {
    // Find whisper paths
    let (binaries_dir, models_dir) = match find_whisper_paths(app_handle) {
        Ok(paths) => paths,
        Err(e) => {
            return Ok(WhisperStatus {
                installed: false,
                binary_path: None,
                models: vec![],
                error: Some(e),
            });
        }
    };

    // Check binary
    let target_triple = get_target_triple().unwrap_or("unknown");
    let binary_path = binaries_dir.join(whisper_binary_name(target_triple));
    let binary_exists = binary_path.exists();

    // Check models
    let models: Vec<String> = if models_dir.exists() {
        std::fs::read_dir(&models_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter_map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if name.starts_with("ggml-") && name.ends_with(".bin") {
                            Some(
                                name.trim_start_matches("ggml-")
                                    .trim_end_matches(".bin")
                                    .to_string(),
                            )
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    } else {
        vec![]
    };

    let has_models = !models.is_empty();
    let error = if !binary_exists {
        Some(format!("Whisper binary not found. Run: {}", setup_hint()))
    } else if !has_models {
        Some(format!("No models found. Run: {} base", setup_hint()))
    } else {
        None
    };

    Ok(WhisperStatus {
        installed: binary_exists && has_models,
        binary_path: if binary_exists {
            Some(binary_path.to_string_lossy().to_string())
        } else {
            None
        },
        models,
        error,
    })
}
