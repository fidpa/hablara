//! Tauri Command Registry
//!
//! This module organizes all Tauri commands into focused domain modules:
//! - audio_legacy: Web Audio API commands (legacy fallback)
//! - audio_native: Native cpal audio commands (primary)
//! - transcription: Whisper/MLX transcription commands
//! - analysis: Audio emotion/tone analysis commands
//! - storage: Recording storage commands
//! - mlx_llm: MLX-LLM integration commands
//! - export: Recording export commands
//! - file_io: File I/O commands (read audio files)
//! - window: Window management commands
//! - system: Cross-platform system info commands
//! - keyring: OS-native credential storage commands
//! - utils: Shared utility functions

// Module declarations
mod audio_legacy;
mod audio_native;
mod transcription;
mod analysis;
mod storage;
mod mlx_llm;
mod export;
mod file_io;
mod window;
mod system;
mod keyring;
pub(crate) mod utils; // pub(crate) for sub-module access

// Re-export all commands and types for frontend
pub use audio_legacy::*;
pub use audio_native::*;
pub use transcription::*;
pub use analysis::*;
pub use storage::*;
pub use mlx_llm::*;
pub use export::*;
pub use file_io::*;
pub use window::*;
pub use system::*;
pub use keyring::*;
