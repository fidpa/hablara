//! Whisper output parsing utilities
//!
//! This module handles parsing of whisper.cpp stdout output,
//! including:
//! - Timestamp extraction
//! - Non-speech marker filtering
//! - Hallucination detection and removal

/// Parse whisper.cpp stdout output to extract transcription text
/// Format: [00:00:00.000 --> 00:00:02.000]   Text here
/// Filters out non-speech markers like "[Musik]", "[Music]", "* Musik *"
pub fn parse_whisper_stdout(stdout: &str) -> Option<String> {
    let mut text_parts: Vec<&str> = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        // Skip empty lines
        if trimmed.is_empty() {
            continue;
        }

        // Match timestamp format: [HH:MM:SS.mmm --> HH:MM:SS.mmm]
        if let Some(bracket_end) = trimmed.find(']') {
            if trimmed.starts_with('[') && trimmed.contains("-->") {
                // Extract text after the timestamp bracket
                let text_part = trimmed[bracket_end + 1..].trim();
                if !text_part.is_empty() {
                    // Filter out non-speech markers and hallucination patterns
                    let lower = text_part.to_lowercase();
                    let trimmed_lower = lower.trim();

                    // Skip non-speech markers
                    if lower.contains("[musik]")
                        || lower.contains("[music]")
                        || lower.contains("* musik *")
                        || lower.contains("* music *")
                        || lower.contains("[applaus]")
                        || lower.contains("[applause]")
                        || lower.contains("[laughter]")
                        || lower.contains("[lachen]")
                        // Silence markers
                        || lower.contains("[stille]")
                        || lower.contains("[silence]")
                        || lower.contains("[blank_audio]")
                        || lower.contains("[no speech]")
                        || lower.contains("(silence)")
                        || lower.contains("(stille)")
                        // YouTube hallucinations
                        || lower.contains("danke fürs zuschauen")
                        || lower.contains("danke fuer's zuschauen")
                        || lower.contains("danke für's zuschauen")
                        || lower.contains("thanks for watching")
                        || lower.contains("abonnieren")
                        || lower.contains("subscribe")
                        || lower.contains("like and subscribe")
                        || lower.contains("gefällt mir")
                        || lower.contains("kanal")
                        || lower.contains("channel")
                        // Whisper artifacts - pure punctuation or minimal content
                        || trimmed_lower == "..."
                        || trimmed_lower == ".."
                        || trimmed_lower == "."
                        || trimmed_lower == "-"
                        || trimmed_lower == "--"
                        || trimmed_lower == "♪"
                        || trimmed_lower == "♪♪"
                        || trimmed_lower.is_empty()
                        // German filler words as standalone
                        || trimmed_lower == "äh"
                        || trimmed_lower == "ähm"
                        || trimmed_lower == "äähm"
                        || trimmed_lower == "mhm"
                        || trimmed_lower == "hmm"
                    {
                        continue;
                    }
                    text_parts.push(text_part);
                }
            }
        }
    }

    if text_parts.is_empty() {
        None
    } else {
        Some(text_parts.join(" "))
    }
}
