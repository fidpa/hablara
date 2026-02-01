//! Shared utility functions for Tauri commands
//!
//! This module contains reusable utilities organized by domain:
//! - **path**: Path resolution (MLX, Whisper, VAD models)
//! - **audio**: Audio validation, encoding, and VAD filtering
//! - **parsing**: Whisper output parsing
//! - **encoding**: Base64 encoding/decoding

pub(crate) mod audio;
pub(crate) mod encoding;
pub(crate) mod parsing;
pub(crate) mod path;

// Re-export public items used by consumer modules
// FilteredAudio, VAD_PIPELINE, find_vad_model_path are internal-only
pub use audio::{apply_vad_filter, validate_audio};
pub use encoding::{decode_audio_base64, encode_audio_base64};
pub use parsing::parse_whisper_stdout;
pub use path::{
    expand_tilde, find_whisper_paths, get_target_triple, resolve_mlx_models_dir,
    resolve_mlx_python_path,
};
