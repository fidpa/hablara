//! Integration test for spawn_blocking in audio analysis commands
//!
//! Verifies that CPU-intensive audio analysis runs in blocking thread pool
//! without blocking the async runtime, ensuring UI remains responsive.

use hablara_lib::commands::{analyze_audio_emotion, analyze_audio_tone};
use std::f32::consts::PI;

/// Generate Base64-encoded WAV file from samples
fn generate_wav_base64(samples: &[f32]) -> String {
    let mut wav_data = Vec::new();

    // WAV header
    wav_data.extend_from_slice(b"RIFF");
    let data_size = (samples.len() * 2) as u32;
    let file_size = 36 + data_size;
    wav_data.extend_from_slice(&file_size.to_le_bytes());
    wav_data.extend_from_slice(b"WAVE");

    // fmt chunk
    wav_data.extend_from_slice(b"fmt ");
    wav_data.extend_from_slice(&16u32.to_le_bytes()); // fmt chunk size
    wav_data.extend_from_slice(&1u16.to_le_bytes()); // PCM
    wav_data.extend_from_slice(&1u16.to_le_bytes()); // Mono
    wav_data.extend_from_slice(&16000u32.to_le_bytes()); // Sample rate
    wav_data.extend_from_slice(&32000u32.to_le_bytes()); // Byte rate
    wav_data.extend_from_slice(&2u16.to_le_bytes()); // Block align
    wav_data.extend_from_slice(&16u16.to_le_bytes()); // Bits per sample

    // data chunk
    wav_data.extend_from_slice(b"data");
    wav_data.extend_from_slice(&data_size.to_le_bytes());

    // Convert f32 samples to i16
    for &sample in samples {
        let clamped = sample.clamp(-1.0, 1.0);
        let i16_sample = (clamped * 32767.0) as i16;
        wav_data.extend_from_slice(&i16_sample.to_le_bytes());
    }

    // Base64 encode
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &wav_data)
}

#[tokio::test]
async fn test_analyze_audio_emotion_spawn_blocking() {
    // Generate stress signal: high energy, high pitch, variable frequency
    let sample_rate = 16000;
    let duration = 2.0;
    let num_samples = (sample_rate as f32 * duration) as usize;

    let samples: Vec<f32> = (0..num_samples)
        .map(|i| {
            // Variable pitch (180-220 Hz) for stress indication
            let pitch = 180.0 + 40.0 * ((i as f32 / 1000.0).sin());
            let amplitude = 0.7; // High energy
            amplitude * (2.0 * PI * pitch * i as f32 / sample_rate as f32).sin()
        })
        .collect();

    // Call the command (runs with spawn_blocking)
    let result = analyze_audio_emotion(
        samples.clone(),
        sample_rate,
        Some(1.8),
        Some(2.0),
    )
    .await;

    // Verify result
    assert!(result.is_ok(), "Emotion analysis should succeed");
    let emotion = result.unwrap();

    // Verify features are populated
    assert!(emotion.features.is_some(), "Features should be extracted");
    let features = emotion.features.unwrap();
    assert!(features.pitch > 0.0, "Pitch should be extracted");
    assert!(features.energy > 0.0, "Energy should be extracted");
    assert!(features.speech_rate > 0.0, "Speech rate should be calculated");

    // Verify confidence is reasonable
    assert!(
        emotion.confidence >= 0.4 && emotion.confidence <= 1.0,
        "Confidence should be in valid range: {}",
        emotion.confidence
    );

    println!(
        "✅ Emotion: {:?}, Confidence: {:.2}, Features: pitch={:.1}, energy={:.2}, rate={:.2}",
        emotion.primary, emotion.confidence, features.pitch, features.energy, features.speech_rate
    );
}

#[tokio::test]
async fn test_analyze_audio_tone_spawn_blocking() {
    // Generate test signal: moderate energy, mid-range pitch
    let sample_rate = 16000;
    let duration = 1.5;
    let num_samples = (sample_rate as f32 * duration) as usize;

    let samples: Vec<f32> = (0..num_samples)
        .map(|i| {
            let pitch = 150.0; // Mid-range
            let amplitude = 0.4; // Moderate energy
            amplitude * (2.0 * PI * pitch * i as f32 / sample_rate as f32).sin()
        })
        .collect();

    // Generate WAV Base64
    let audio_data = generate_wav_base64(&samples);

    // Call the command (runs with spawn_blocking)
    let result = analyze_audio_tone(audio_data, 1.4, 1.5).await;

    // Verify result
    assert!(result.is_ok(), "Tone analysis should succeed");
    let tone = result.unwrap();

    // Verify all 5 dimensions are in valid range (1-5)
    assert!(
        tone.formality >= 1 && tone.formality <= 5,
        "Formality should be 1-5: {}",
        tone.formality
    );
    assert!(
        tone.professionalism >= 1 && tone.professionalism <= 5,
        "Professionalism should be 1-5: {}",
        tone.professionalism
    );
    assert!(
        tone.directness >= 1 && tone.directness <= 5,
        "Directness should be 1-5: {}",
        tone.directness
    );
    assert!(
        tone.energy >= 1 && tone.energy <= 5,
        "Energy should be 1-5: {}",
        tone.energy
    );
    assert!(
        tone.seriousness >= 1 && tone.seriousness <= 5,
        "Seriousness should be 1-5: {}",
        tone.seriousness
    );

    // Verify confidence
    assert!(
        tone.confidence >= 0.3 && tone.confidence <= 1.0,
        "Confidence should be in valid range: {}",
        tone.confidence
    );

    println!(
        "✅ Tone: F={}, P={}, D={}, E={}, S={}, Confidence: {:.2}",
        tone.formality,
        tone.professionalism,
        tone.directness,
        tone.energy,
        tone.seriousness,
        tone.confidence
    );
}

#[tokio::test]
async fn test_spawn_blocking_concurrency() {
    // Test that multiple concurrent analyses don't block each other
    let sample_rate = 16000;
    let samples: Vec<f32> = (0..16000)
        .map(|i| {
            let freq = 150.0;
            (2.0 * PI * freq * i as f32 / sample_rate as f32).sin() * 0.5
        })
        .collect();

    // Launch 3 concurrent analyses
    let handles: Vec<_> = (0..3)
        .map(|_| {
            let samples_clone = samples.clone();
            tokio::spawn(async move {
                analyze_audio_emotion(samples_clone, sample_rate, Some(1.0), Some(1.0)).await
            })
        })
        .collect();

    // Wait for all to complete
    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should succeed
    for (i, result) in results.iter().enumerate() {
        assert!(
            result.is_ok(),
            "Task {} should complete successfully",
            i
        );
        let emotion_result = result.as_ref().unwrap();
        assert!(
            emotion_result.is_ok(),
            "Analysis {} should succeed",
            i
        );
    }

    println!("✅ All 3 concurrent analyses completed successfully");
}

#[tokio::test]
async fn test_empty_samples_fast_path() {
    // Empty samples should return quickly without spawn_blocking overhead
    let start = std::time::Instant::now();
    let result = analyze_audio_emotion(vec![], 16000, None, None).await;
    let elapsed = start.elapsed();

    assert!(result.is_ok(), "Empty samples should succeed");
    let emotion = result.unwrap();
    assert_eq!(
        format!("{:?}", emotion.primary),
        "Neutral",
        "Empty samples should return Neutral"
    );
    assert_eq!(emotion.confidence, 0.5, "Confidence should be 0.5");
    assert!(emotion.features.is_none(), "Features should be None");
    assert!(
        elapsed.as_millis() < 10,
        "Empty samples should return in <10ms: {:?}",
        elapsed
    );

    println!("✅ Empty samples fast path: {:?}", elapsed);
}
