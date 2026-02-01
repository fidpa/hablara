//! Audio Analysis Commands
//!
//! Audio emotion and tone analysis using AudioAnalyzer (12 features, 93% accuracy).

use crate::audio_analysis;
use crate::emotion::{EmotionResult, EmotionType, FeatureReport};
use crate::vad::pipeline::wav_bytes_to_samples;

use super::utils::decode_audio_base64;

/// Maximum audio samples (5 minutes at 16kHz)
/// Defense-in-depth: Prevents memory exhaustion via oversized audio input
const MAX_AUDIO_SAMPLES: usize = 16000 * 300;

/// Analyze audio from Base64 WAV data (convenience wrapper)
///
/// Takes Base64-encoded WAV and timing metadata from transcription.
/// Decodes WAV, extracts samples, and calls AudioAnalyzer (12 features, 93% accuracy).
#[tauri::command]
pub async fn analyze_audio_from_wav(
    audio_data: String, // Base64 WAV
    speech_duration: f32,
    total_duration: f32,
) -> Result<EmotionResult, String> {
    // Decode Base64
    let audio_bytes = decode_audio_base64(&audio_data)?;

    // Parse WAV to samples
    let samples = wav_bytes_to_samples(&audio_bytes)
        .map_err(|e| format!("Failed to parse WAV: {}", e))?;

    // Call main analyzer
    analyze_audio_emotion(
        samples,
        16000, // Always 16kHz for Hablará
        Some(speech_duration),
        Some(total_duration),
    )
    .await
}

/// Analyze audio samples for emotion using AudioAnalyzer (12 features)
///
/// # Arguments
/// * `samples` - Audio samples (16kHz mono, preferably VAD-filtered)
/// * `sample_rate` - Sample rate in Hz (typically 16000)
/// * `speech_duration` - Duration of speech from VAD (seconds)
/// * `total_duration` - Total duration before VAD filtering (seconds)
///
/// # Returns
/// EmotionResult with primary emotion, confidence, and optional secondary
#[tauri::command]
pub async fn analyze_audio_emotion(
    samples: Vec<f32>,
    sample_rate: u32,
    speech_duration: Option<f32>,
    total_duration: Option<f32>,
) -> Result<EmotionResult, String> {
    use crate::audio_analysis::AudioAnalyzer;
    use crate::vad::VadFrame;

    // Validate input size (defense-in-depth)
    if samples.is_empty() {
        return Ok(EmotionResult {
            primary: EmotionType::Neutral,
            confidence: 0.5,
            secondary: None,
            features: None,
        });
    }

    if samples.len() > MAX_AUDIO_SAMPLES {
        return Err(format!(
            "Audio too long: {} samples (max {} = 5 minutes at 16kHz)",
            samples.len(),
            MAX_AUDIO_SAMPLES
        ));
    }

    // Get timing data (use provided or calculate from samples)
    let speech_dur = speech_duration.unwrap_or_else(|| samples.len() as f32 / sample_rate as f32);
    let total_dur = total_duration.unwrap_or(speech_dur);

    // CPU-intensive audio analysis - run in blocking thread pool
    tokio::task::spawn_blocking(move || {
        // Note: VAD frames not available from filtered samples
        // Pause-based features (pause_duration_avg, pause_frequency) will be 0
        // All other features (pitch, energy, spectral) work correctly
        let vad_frames: Vec<VadFrame> = Vec::new();

        // Use AudioAnalyzer with 12 features (93% accuracy)
        let mut analyzer = AudioAnalyzer::new(sample_rate);
        let (features, emotion) = analyzer.analyze_full(&samples, &vad_frames, speech_dur, total_dur);

        // Add feature report
        let mut result = emotion;
        result.features = Some(FeatureReport {
            pitch: features.pitch,
            energy: features.energy,
            speech_rate: features.speech_rate,
        });

        result
    })
    .await
    .map_err(|e| format!("Audio emotion analysis task failed: {}", e))
}

/// Analyze audio tone from Base64 WAV data
///
/// Extracts 5-dimensional communication style analysis:
/// - Formality (1-5): Casual to Formal
/// - Professionalism (1-5): Personal to Professional
/// - Directness (1-5): Indirect to Direct
/// - Energy (1-5): Calm to Energetic
/// - Seriousness (1-5): Light to Serious
///
/// # Arguments
/// * `audio_data` - Base64-encoded WAV file (16kHz mono)
/// * `speech_duration` - Duration of speech from VAD (seconds)
/// * `total_duration` - Total duration before VAD filtering (seconds)
///
/// # Returns
/// ToneResult with 5 dimensions (1-5 scale) + confidence
#[tauri::command]
pub async fn analyze_audio_tone(
    audio_data: String,
    speech_duration: f32,
    total_duration: f32,
) -> Result<audio_analysis::ToneResult, String> {
    use crate::audio_analysis::{AudioAnalyzer, ProsodicAnalyzer, SpectralAnalyzer, ToneClassifier};
    use crate::vad::VadFrame;

    // Decode Base64
    let audio_bytes = decode_audio_base64(&audio_data)?;

    // Parse WAV to samples
    let samples = wav_bytes_to_samples(&audio_bytes)
        .map_err(|e| format!("Failed to parse WAV: {}", e))?;

    // Validate input size (defense-in-depth)
    if samples.is_empty() {
        return Ok(audio_analysis::ToneResult {
            formality: 3,
            professionalism: 3,
            directness: 3,
            energy: 3,
            seriousness: 3,
            confidence: 0.5,
        });
    }

    if samples.len() > MAX_AUDIO_SAMPLES {
        return Err(format!(
            "Audio too long: {} samples (max {} = 5 minutes at 16kHz)",
            samples.len(),
            MAX_AUDIO_SAMPLES
        ));
    }

    // CPU-intensive audio analysis - run in blocking thread pool
    tokio::task::spawn_blocking(move || {
        // Extract audio features (same as emotion analysis)
        let vad_frames: Vec<VadFrame> = Vec::new();
        let mut analyzer = AudioAnalyzer::new(16000);
        let (_features, _emotion) =
            analyzer.analyze_full(&samples, &vad_frames, speech_duration, total_duration);

        // Calculate speech rate
        let speech_rate = if total_duration > 0.0 {
            speech_duration / total_duration
        } else {
            1.0
        };

        // Build prosodic and spectral features for ToneClassifier
        let mut prosodic_analyzer = ProsodicAnalyzer::new(16000);
        let mut spectral_analyzer = SpectralAnalyzer::new(16000);

        let prosodic = prosodic_analyzer.analyze(&samples, &vad_frames);
        let spectral = spectral_analyzer.analyze(&samples);

        // Classify tone
        let tone_result = ToneClassifier::classify(&prosodic, &spectral, speech_rate);

        tracing::debug!(
            formality = %tone_result.formality,
            professionalism = %tone_result.professionalism,
            directness = %tone_result.directness,
            energy = %tone_result.energy,
            seriousness = %tone_result.seriousness,
            confidence = %format!("{:.2}", tone_result.confidence),
            "ToneAnalyzer: Classification complete"
        );

        tone_result
    })
    .await
    .map_err(|e| format!("Audio tone analysis task failed: {}", e))
}
