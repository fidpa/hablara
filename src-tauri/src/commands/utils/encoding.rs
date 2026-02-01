//! Base64 encoding/decoding utilities
//!
//! This module handles audio data encoding and decoding
//! for transmission between frontend and backend.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

/// Decode Base64 audio data
pub fn decode_audio_base64(audio_data: &str) -> Result<Vec<u8>, String> {
    BASE64
        .decode(audio_data)
        .map_err(|e| format!("Failed to decode audio: {}", e))
}

/// Encode audio bytes to Base64
pub fn encode_audio_base64(audio_bytes: &[u8]) -> String {
    BASE64.encode(audio_bytes)
}
