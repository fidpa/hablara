//! Text filtering for transcription output
//!
//! Removes filler words and stutter artifacts from Whisper output.
//!
//! Based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

use once_cell::sync::Lazy;
use regex::Regex;

/// Common Whisper hallucinations to filter out (German TV/Media patterns)
const HALLUCINATION_PATTERNS: &[&str] = &[
    "untertitelung des zdf",
    "untertitel des zdf",
    "copyright",
    "© 20",
    "untertitelung",
    "subtitles",
    "danke fürs zuschauen",
    "thanks for watching",
    "subscribe",
    "abonnieren",
];

/// Filler words to remove from transcriptions (English + German)
const FILLER_WORDS: &[&str] = &[
    // English filler words
    "uh", "um", "uhm", "umm", "uhh", "uhhh", "ah", "eh", "hmm", "hm", "mmm", "mm", "mh", "ha",
    "ehh", "er", "err",
    // German filler words
    "äh", "ähm", "äähm", "öhm", "ohm", "mhm", "hmm", "naja", "also", "halt", "eben", "genau",
    "quasi", "sozusagen", "eigentlich", "ja", "ne", "gell", "oder",
];

/// Pre-compiled multi-space pattern
static MULTI_SPACE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\s{2,}").expect("Multi-space regex compilation should never fail")
});

/// Pre-compiled filler word patterns (built lazily)
static FILLER_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    FILLER_WORDS
        .iter()
        .map(|word| {
            // Match filler word with word boundaries, optionally followed by comma or period
            Regex::new(&format!(r"(?i)\b{}\b[,.]?", regex::escape(word)))
                .expect("Filler word regex compilation should never fail")
        })
        .collect()
});

/// Collapses repeated 1-2 letter words (3+ repetitions) to a single instance.
/// E.g., "wh wh wh wh" -> "wh", "I I I I" -> "I"
fn collapse_stutters(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let word = words[i];
        let word_lower = word.to_lowercase();

        // Only process 1-2 letter words
        if word_lower.len() <= 2 && word_lower.chars().all(|c| c.is_alphabetic()) {
            // Count consecutive repetitions (case-insensitive)
            let mut count = 1;
            while i + count < words.len() && words[i + count].to_lowercase() == word_lower {
                count += 1;
            }

            // If 3+ repetitions, collapse to single instance
            if count >= 3 {
                result.push(word);
                i += count;
            } else {
                result.push(word);
                i += 1;
            }
        } else {
            result.push(word);
            i += 1;
        }
    }

    result.join(" ")
}

/// Filters transcription output by removing hallucinations, filler words, and stutter artifacts.
///
/// This function cleans up raw transcription text by:
/// 1. Detecting and removing common Whisper hallucinations (e.g., "Untertitelung des ZDF")
/// 2. Removing filler words (uh, um, hmm, äh, ähm, etc.)
/// 3. Collapsing repeated 1-2 letter stutters (e.g., "wh wh wh" -> "wh")
/// 4. Cleaning up excess whitespace
///
/// # Arguments
/// * `text` - The raw transcription text to filter
///
/// # Returns
/// The filtered text, or empty string if entire text is a hallucination
pub fn filter_transcription_output(text: &str) -> String {
    let text_lower = text.to_lowercase();

    // Check if entire text is a known hallucination pattern
    for pattern in HALLUCINATION_PATTERNS {
        if text_lower.contains(pattern) {
            tracing::debug!(
                text = %text,
                pattern = %pattern,
                "Text filter: Hallucination detected"
            );
            return String::new();  // Return empty string for hallucinations
        }
    }

    let mut filtered = text.to_string();

    // Remove filler words
    for pattern in FILLER_PATTERNS.iter() {
        filtered = pattern.replace_all(&filtered, "").to_string();
    }

    // Collapse repeated 1-2 letter words (stutter artifacts like "wh wh wh wh")
    filtered = collapse_stutters(&filtered);

    // Clean up multiple spaces to single space
    filtered = MULTI_SPACE_PATTERN.replace_all(&filtered, " ").to_string();

    // Trim leading/trailing whitespace
    filtered.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_filler_words() {
        let text = "So um I was thinking uh about this";
        let result = filter_transcription_output(text);
        assert_eq!(result, "So I was thinking about this");
    }

    #[test]
    fn test_filter_filler_words_case_insensitive() {
        let text = "UM this is UH a test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "this is a test");
    }

    #[test]
    fn test_filter_hallucination_zdf() {
        let text = "Untertitelung des ZDF, 2020";
        let result = filter_transcription_output(text);
        assert_eq!(result, "");  // Should return empty for hallucination
    }

    #[test]
    fn test_filter_hallucination_case_insensitive() {
        let text = "UNTERTITELUNG DES ZDF";
        let result = filter_transcription_output(text);
        assert_eq!(result, "");
    }

    #[test]
    fn test_filter_hallucination_partial_match() {
        let text = "Some text with untertitelung des zdf in it";
        let result = filter_transcription_output(text);
        assert_eq!(result, "");  // Entire text rejected if contains hallucination
    }

    #[test]
    fn test_filter_german_filler_words() {
        let text = "Also äh ich denke ähm dass das richtig ist";
        let result = filter_transcription_output(text);
        assert_eq!(result, "ich denke dass das richtig ist");
    }

    #[test]
    fn test_filter_filler_words_with_punctuation() {
        let text = "Well, um, I think, uh. that's right";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Well, I think, that's right");
    }

    #[test]
    fn test_filter_cleans_whitespace() {
        let text = "Hello    world   test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world test");
    }

    #[test]
    fn test_filter_trims() {
        let text = "  Hello world  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn test_filter_combined() {
        let text = "  Um, so I was, uh, thinking about this  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "so I was, thinking about this");
    }

    #[test]
    fn test_filter_preserves_valid_text() {
        let text = "This is a completely normal sentence.";
        let result = filter_transcription_output(text);
        assert_eq!(result, "This is a completely normal sentence.");
    }

    #[test]
    fn test_filter_stutter_collapse() {
        let text = "w wh wh wh wh wh wh wh wh wh why";
        let result = filter_transcription_output(text);
        assert_eq!(result, "w wh why");
    }

    #[test]
    fn test_filter_stutter_short_words() {
        let text = "I I I I think so so so so";
        let result = filter_transcription_output(text);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_stutter_mixed_case() {
        let text = "No NO no NO no";
        let result = filter_transcription_output(text);
        assert_eq!(result, "No");
    }

    #[test]
    fn test_filter_stutter_preserves_two_repetitions() {
        let text = "no no is fine";
        let result = filter_transcription_output(text);
        assert_eq!(result, "no no is fine");
    }

    #[test]
    fn test_empty_string() {
        let text = "";
        let result = filter_transcription_output(text);
        assert_eq!(result, "");
    }

    #[test]
    fn test_only_filler_words() {
        let text = "um uh hmm äh";
        let result = filter_transcription_output(text);
        assert_eq!(result, "");
    }
}
