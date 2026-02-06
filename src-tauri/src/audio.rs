//! Audio State Management
//!
//! Thread-safe state container for audio recording using atomic primitives.
//! Coordinates native audio recorder and VAD pipeline.
//! Provides safe concurrent access via AtomicBool, AtomicU32, and Mutex.

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use crate::native_audio::NativeAudioRecorder;
use crate::vad::VadPipeline;

// AudioState that is Send + Sync for Tauri
pub struct AudioState {
    pub is_recording: AtomicBool,
    pub audio_buffer: Mutex<Vec<f32>>,
    pub current_level: AtomicU32, // Store as u32 bits, convert to f32
    sample_rate: AtomicU32,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            is_recording: AtomicBool::new(false),
            audio_buffer: Mutex::new(Vec::new()),
            current_level: AtomicU32::new(0),
            sample_rate: AtomicU32::new(16000),
        }
    }

    pub fn start_recording(&self, sample_rate: u32) {
        // Clear previous recording
        {
            let mut buffer = self.audio_buffer.lock().unwrap_or_else(|poisoned| {
                tracing::warn!("audio_buffer Mutex poisoned, recovering");
                poisoned.into_inner()
            });
            buffer.clear();
        }

        self.sample_rate.store(sample_rate, Ordering::SeqCst);
        self.is_recording.store(true, Ordering::SeqCst);
        self.current_level.store(0, Ordering::SeqCst);

        // Note: Actual audio capture will be done via Web Audio API in the frontend
        // The Rust backend provides the state management and audio processing
        // For native recording, we would spawn a separate thread with cpal
    }

    pub fn stop_recording(&self) -> Vec<f32> {
        self.is_recording.store(false, Ordering::SeqCst);

        let buffer = self.audio_buffer.lock().unwrap_or_else(|poisoned| {
            tracing::warn!("audio_buffer Mutex poisoned, recovering");
            poisoned.into_inner()
        });

        buffer.clone()
    }

    pub fn add_samples(&self, samples: &[f32]) {
        if !self.is_recording.load(Ordering::SeqCst) {
            return;
        }

        let mut buffer = self.audio_buffer.lock().unwrap_or_else(|poisoned| {
            tracing::warn!("audio_buffer Mutex poisoned, recovering");
            poisoned.into_inner()
        });
        buffer.extend_from_slice(samples);

        // Calculate RMS level
        let sum: f32 = samples.iter().map(|s| s * s).sum();
        let rms = (sum / samples.len() as f32).sqrt();

        // Store as u32 bits
        self.current_level.store(rms.to_bits(), Ordering::SeqCst);
    }

    pub fn get_level(&self) -> f32 {
        f32::from_bits(self.current_level.load(Ordering::SeqCst))
    }

    /// Check if currently recording (for future native recording)
    #[allow(dead_code)]
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }

    /// Get current sample rate (for future native recording)
    #[allow(dead_code)]
    pub fn get_sample_rate(&self) -> u32 {
        self.sample_rate.load(Ordering::SeqCst)
    }
}

// Make AudioState safe to share across threads
unsafe impl Send for AudioState {}
unsafe impl Sync for AudioState {}

/// Audio feature extraction for emotion analysis
///
/// # Fields (12 total)
///
/// **Legacy Features (3):**
/// - `pitch`: Mean pitch (Hz) via zero-crossing rate
/// - `energy`: RMS energy
/// - `speech_rate`: Speech duration / total duration (from VAD)
///
/// **Prosodic Features (5):**
/// - `pitch_variance`: Pitch stability (variance in Hz²)
/// - `pitch_range`: Max - Min pitch (Hz)
/// - `energy_variance`: Energy stability (variance)
/// - `pause_duration_avg`: Average pause length (milliseconds)
/// - `pause_frequency`: Pauses per second
///
/// **Spectral Features (4):**
/// - `zcr_mean`: Zero-crossing rate (normalized)
/// - `spectral_centroid`: Brightness (Hz)
/// - `spectral_rolloff`: High-frequency cutoff (Hz)
/// - `spectral_flux`: Spectral change rate
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AudioFeatures {
    // Legacy features (3)
    pub pitch: f32,
    pub energy: f32,
    pub speech_rate: f32,

    /// MFCC coefficients (placeholder for future DSP implementation)
    #[allow(dead_code)]
    pub mfcc: Vec<f32>,

    // Prosodic features (5)
    pub pitch_variance: f32,
    pub pitch_range: f32,
    pub energy_variance: f32,
    pub pause_duration_avg: f32,
    pub pause_frequency: f32,

    // Spectral features (4)
    pub zcr_mean: f32,
    pub spectral_centroid: f32,
    pub spectral_rolloff: f32,
    pub spectral_flux: f32,
}

impl AudioFeatures {
    /// Extract audio features with VAD timing metadata (recommended)
    ///
    /// # Arguments
    /// * `samples` - Audio samples (speech-only, after VAD filtering)
    /// * `sample_rate` - Sample rate in Hz (typically 16000)
    /// * `speech_duration` - Duration of speech in seconds (from VAD)
    /// * `total_duration` - Total duration before VAD filtering
    ///
    /// # Returns
    /// AudioFeatures with calculated speech_rate based on actual VAD timing
    #[allow(dead_code)]
    pub fn extract_with_timing(
        samples: &[f32],
        sample_rate: u32,
        speech_duration: f32,
        total_duration: f32,
    ) -> Self {
        if samples.is_empty() {
            return Self {
                pitch: 0.0,
                energy: 0.0,
                speech_rate: 1.0,
                mfcc: vec![0.0; 13],
                pitch_variance: 0.0,
                pitch_range: 0.0,
                energy_variance: 0.0,
                pause_duration_avg: 0.0,
                pause_frequency: 0.0,
                zcr_mean: 0.0,
                spectral_centroid: 0.0,
                spectral_rolloff: 0.0,
                spectral_flux: 0.0,
            };
        }

        // Energy (RMS)
        let energy = {
            let sum: f32 = samples.iter().map(|s| s * s).sum();
            (sum / samples.len() as f32).sqrt()
        };

        // Simple pitch estimation via zero-crossing rate
        let pitch = {
            let mut crossings = 0;
            for i in 1..samples.len() {
                if (samples[i] >= 0.0 && samples[i - 1] < 0.0)
                    || (samples[i] < 0.0 && samples[i - 1] >= 0.0)
                {
                    crossings += 1;
                }
            }
            (crossings as f32 / 2.0) * (sample_rate as f32 / samples.len() as f32)
        };

        // ACTUAL speech rate calculation from VAD timing
        // speech_rate = speech_duration / total_duration
        // Values: 0.0 (no speech) to 1.0 (continuous speech)
        // Fast speech: >0.7, Normal: 0.5-0.7, Slow: <0.5
        let speech_rate = if total_duration > 0.0 {
            speech_duration / total_duration
        } else {
            1.0 // Fallback to neutral if no timing available
        };

        tracing::debug!(
            pitch = %format!("{:.1}", pitch),
            energy = %format!("{:.3}", energy),
            speech_rate = %format!("{:.2}", speech_rate),
            speech_sec = %format!("{:.2}", speech_duration),
            total_sec = %format!("{:.2}", total_duration),
            "AudioFeatures: Extracted"
        );

        // MFCC placeholder (would need proper DSP implementation)
        let mfcc = vec![0.0; 13];

        Self {
            pitch,
            energy,
            speech_rate,
            mfcc,
            // New fields initialized to 0.0 (will be filled by AudioAnalyzer)
            pitch_variance: 0.0,
            pitch_range: 0.0,
            energy_variance: 0.0,
            pause_duration_avg: 0.0,
            pause_frequency: 0.0,
            zcr_mean: 0.0,
            spectral_centroid: 0.0,
            spectral_rolloff: 0.0,
            spectral_flux: 0.0,
        }
    }

    /// Extract audio features without timing metadata (backward compat)
    ///
    /// Note: speech_rate will be 1.0 (neutral). For accurate speech_rate,
    /// use extract_with_timing() instead.
    #[allow(dead_code)]
    pub fn extract(samples: &[f32], sample_rate: u32) -> Self {
        Self::extract_with_timing(samples, sample_rate, 1.0, 1.0)
    }
}

// ============================================================================
// Native Audio State (cpal-based recording)
// ============================================================================

/// Native audio state for cpal-based recording
/// Thread-safe wrapper around NativeAudioRecorder
pub struct NativeAudioState {
    recorder: Mutex<Option<NativeAudioRecorder>>,
    is_recording: AtomicBool,
    current_level: Arc<AtomicU32>,
    shutdown_flag: Arc<AtomicBool>,
    vad_model_path: Mutex<Option<String>>,
}

impl NativeAudioState {
    /// Create a new NativeAudioState
    pub fn new() -> Self {
        Self {
            recorder: Mutex::new(None),
            is_recording: AtomicBool::new(false),
            current_level: Arc::new(AtomicU32::new(0)),
            shutdown_flag: Arc::new(AtomicBool::new(false)),
            vad_model_path: Mutex::new(None),
        }
    }

    /// Try to create VAD pipeline, returning None on failure (graceful degradation).
    /// On Windows with load-dynamic, ONNX Runtime DLL must be present.
    fn create_vad_pipeline(&self) -> Option<VadPipeline> {
        let vad_path_guard = match self.vad_model_path.lock() {
            Ok(guard) => guard,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to lock VAD model path - recording without VAD");
                return None;
            }
        };

        let vad_path = match vad_path_guard.as_ref() {
            Some(path) => path,
            None => {
                tracing::warn!("VAD model path not set - recording without VAD filtering");
                return None;
            }
        };

        match VadPipeline::new(vad_path) {
            Ok(vad) => {
                tracing::debug!("VAD pipeline initialized successfully");
                Some(vad)
            }
            Err(e) => {
                tracing::warn!(error = %e, "VAD initialization failed - recording without VAD filtering");
                None
            }
        }
    }

    /// Set the VAD model path (called once during app setup)
    pub fn set_vad_model_path(&self, path: String) {
        let mut guard = self.vad_model_path.lock().unwrap_or_else(|poisoned| {
            tracing::warn!("vad_model_path Mutex poisoned, recovering");
            poisoned.into_inner()
        });
        *guard = Some(path);
    }

    /// Open the audio device and initialize the recorder
    ///
    /// If VAD initialization fails (e.g. ONNX Runtime not found on Windows),
    /// recording continues without VAD filtering (graceful degradation).
    pub fn open(&self) -> Result<(), String> {
        let mut guard = self.recorder.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // Already open
        }

        // Try to create VAD pipeline (may fail on Windows if ONNX Runtime DLL is missing)
        let vad = self.create_vad_pipeline();

        // Reset shutdown flag for new recorder
        self.shutdown_flag.store(false, Ordering::SeqCst);

        // Clone Arc for Worker Thread ownership
        let level_atomic = Arc::clone(&self.current_level);
        let shutdown_flag = Arc::clone(&self.shutdown_flag);

        let level_callback = move |level: f32| {
            // Check shutdown signal BEFORE storing
            if shutdown_flag.load(Ordering::SeqCst) {
                return; // Graceful Exit - Worker Thread beendet sich
            }

            // Level speichern (kein unsafe, Arc garantiert Gueltigkeit)
            level_atomic.store(level.to_bits(), Ordering::SeqCst);
        };

        // Create recorder with optional VAD and level callback
        let mut recorder = NativeAudioRecorder::new();
        if let Some(vad) = vad {
            recorder = recorder.with_vad(vad);
        }
        recorder = recorder.with_level_callback(level_callback);

        // Open the default audio device
        recorder.open(None)?;

        *guard = Some(recorder);
        tracing::info!("NativeAudioState: Audio device opened");
        Ok(())
    }

    /// Start recording
    pub fn start(&self) -> Result<(), String> {
        let guard = self.recorder.lock().map_err(|e| e.to_string())?;
        let recorder = guard.as_ref().ok_or("Recorder not open")?;

        // Reset shutdown flag für neuen Recording-Zyklus
        self.shutdown_flag.store(false, Ordering::SeqCst);

        recorder.start()?;
        self.is_recording.store(true, Ordering::SeqCst);
        self.current_level.store(0, Ordering::SeqCst);
        Ok(())
    }

    /// Stop recording and return samples (16kHz mono, VAD filtered)
    pub fn stop(&self) -> Result<Vec<f32>, String> {
        let guard = self.recorder.lock().map_err(|e| e.to_string())?;
        let recorder = guard.as_ref().ok_or("Recorder not open")?;

        self.is_recording.store(false, Ordering::SeqCst);
        recorder.stop()
    }

    /// Close the recorder and release resources
    pub fn close(&self) -> Result<(), String> {
        // Signal Worker Thread to stop (before taking recorder)
        self.shutdown_flag.store(true, Ordering::SeqCst);

        let mut guard = self.recorder.lock().map_err(|e| e.to_string())?;
        if let Some(mut recorder) = guard.take() {
            recorder.close()?;
        }
        self.is_recording.store(false, Ordering::SeqCst);
        self.current_level.store(0, Ordering::SeqCst);
        tracing::info!("NativeAudioState: Audio device closed");
        Ok(())
    }

    /// Get current audio level (0.0 - 1.0)
    pub fn get_level(&self) -> f32 {
        f32::from_bits(self.current_level.load(Ordering::SeqCst))
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }

    /// Check if recorder is open
    pub fn is_open(&self) -> bool {
        self.recorder
            .lock()
            .map(|g| g.is_some())
            .unwrap_or(false)
    }
}

/// # Safety
///
/// NativeAudioState is safe to share across threads because:
/// - `recorder: Mutex<Option<NativeAudioRecorder>>` - Mutex provides synchronization
/// - `is_recording: AtomicBool` - Atomic is inherently thread-safe
/// - `current_level: Arc<AtomicU32>` - Arc provides thread-safe shared ownership
/// - `shutdown_flag: Arc<AtomicBool>` - Arc provides thread-safe shared ownership
/// - `vad_model_path: Mutex<Option<String>>` - Mutex provides synchronization
///
/// All fields are either atomics (lock-free) or protected by Mutex (synchronized).
unsafe impl Send for NativeAudioState {}
unsafe impl Sync for NativeAudioState {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_speech_rate_calculation_fast() {
        // Fast speech: 80% of time is speech (high speech rate)
        let samples = vec![0.5; 16000]; // 1 second of audio
        let speech_duration = 0.8; // 800ms speech
        let total_duration = 1.0; // 1000ms total

        let features = AudioFeatures::extract_with_timing(
            &samples,
            16000,
            speech_duration,
            total_duration,
        );

        assert!(
            features.speech_rate > 0.7,
            "Fast speech should have speech_rate > 0.7, got {}",
            features.speech_rate
        );
        assert!(
            (features.speech_rate - 0.8).abs() < 0.01,
            "Expected speech_rate ~0.8, got {}",
            features.speech_rate
        );
    }

    #[test]
    fn test_speech_rate_calculation_slow() {
        // Slow speech: 40% of time is speech (low speech rate, lots of pauses)
        let samples = vec![0.3; 16000];
        let speech_duration = 0.4;
        let total_duration = 1.0;

        let features = AudioFeatures::extract_with_timing(
            &samples,
            16000,
            speech_duration,
            total_duration,
        );

        assert!(
            features.speech_rate < 0.5,
            "Slow speech should have speech_rate < 0.5, got {}",
            features.speech_rate
        );
        assert!(
            (features.speech_rate - 0.4).abs() < 0.01,
            "Expected speech_rate ~0.4, got {}",
            features.speech_rate
        );
    }

    #[test]
    fn test_speech_rate_calculation_normal() {
        // Normal speech: 60% of time is speech
        let samples = vec![0.4; 16000];
        let speech_duration = 0.6;
        let total_duration = 1.0;

        let features = AudioFeatures::extract_with_timing(
            &samples,
            16000,
            speech_duration,
            total_duration,
        );

        assert!(
            features.speech_rate >= 0.5 && features.speech_rate <= 0.7,
            "Normal speech should have speech_rate 0.5-0.7, got {}",
            features.speech_rate
        );
    }

    #[test]
    fn test_speech_rate_fallback_on_zero_duration() {
        // Edge case: zero total duration should fallback to 1.0
        let samples = vec![0.2; 16000];
        let speech_duration = 0.0;
        let total_duration = 0.0;

        let features = AudioFeatures::extract_with_timing(
            &samples,
            16000,
            speech_duration,
            total_duration,
        );

        assert_eq!(
            features.speech_rate, 1.0,
            "Zero duration should fallback to neutral speech_rate 1.0"
        );
    }

    #[test]
    fn test_backward_compat_extract() {
        // Old extract() method should default to neutral speech_rate
        let samples = vec![0.3; 16000];

        let features = AudioFeatures::extract(&samples, 16000);

        assert_eq!(
            features.speech_rate, 1.0,
            "Backward compat extract() should use neutral speech_rate 1.0"
        );
    }

    // ========================================================================
    // Native Audio Safety Tests
    // ========================================================================

    #[test]
    fn test_native_arc_ownership_after_drop() {
        let state = NativeAudioState::new();
        let level_clone = Arc::clone(&state.current_level);

        // Store value via state
        state.current_level.store(0.42f32.to_bits(), Ordering::SeqCst);

        // Drop original state
        drop(state);

        // Clone should still be valid (Arc keeps data alive)
        let value = f32::from_bits(level_clone.load(Ordering::SeqCst));
        assert_eq!(value, 0.42, "Arc should keep data alive after state drop");
    }

    #[test]
    fn test_native_shutdown_flag_stops_callback() {
        let state = NativeAudioState::new();
        let level_atomic = Arc::clone(&state.current_level);
        let shutdown_flag = Arc::clone(&state.shutdown_flag);

        // Simulate level callback
        let callback = move |level: f32| {
            if shutdown_flag.load(Ordering::SeqCst) {
                return; // Exit gracefully
            }
            level_atomic.store(level.to_bits(), Ordering::SeqCst);
        };

        // Store should work (shutdown_flag = false)
        callback(1.0);
        assert_eq!(
            f32::from_bits(state.current_level.load(Ordering::SeqCst)),
            1.0,
            "Callback should store when shutdown_flag = false"
        );

        // Set shutdown flag
        state.shutdown_flag.store(true, Ordering::SeqCst);

        // Store should be skipped (shutdown_flag = true)
        callback(2.0);
        assert_eq!(
            f32::from_bits(state.current_level.load(Ordering::SeqCst)),
            1.0,
            "Callback should skip store when shutdown_flag = true"
        );
    }

    #[test]
    fn test_mutex_poison_graceful_recovery() {
        use std::thread;

        let state = Arc::new(AudioState::new());
        let state_clone = Arc::clone(&state);

        // Spawn thread that poisons mutex
        let handle = thread::spawn(move || {
            let _guard = state_clone.audio_buffer.lock().unwrap();
            panic!("Intentional panic to poison mutex");
        });

        // Wait for thread to panic (ignore result)
        let _ = handle.join();

        // add_samples should recover (not panic) after Consistency Fix
        // BEFORE FIX: This would panic with "audio_buffer lock poisoned"
        // AFTER FIX: This should log warning and recover
        state.add_samples(&[0.5, 0.3, 0.7]);

        // Verify we can still use the state
        let level = state.get_level();
        assert!(
            level >= 0.0 && level <= 1.0,
            "Level should be valid after poison recovery"
        );
    }

    #[test]
    fn test_concurrent_level_access() {
        use std::thread;
        use std::sync::atomic::AtomicUsize;

        let state = Arc::new(NativeAudioState::new());
        let write_count = Arc::new(AtomicUsize::new(0));
        let read_count = Arc::new(AtomicUsize::new(0));

        let state_writer = Arc::clone(&state);
        let wc = Arc::clone(&write_count);
        let writer = thread::spawn(move || {
            for i in 0..1000 {
                state_writer.current_level.store((i as f32).to_bits(), Ordering::SeqCst);
                wc.fetch_add(1, Ordering::SeqCst);
            }
        });

        let state_reader = Arc::clone(&state);
        let rc = Arc::clone(&read_count);
        let reader = thread::spawn(move || {
            for _ in 0..1000 {
                let _ = state_reader.get_level();
                rc.fetch_add(1, Ordering::SeqCst);
            }
        });

        writer.join().unwrap();
        reader.join().unwrap();

        assert_eq!(write_count.load(Ordering::SeqCst), 1000);
        assert_eq!(read_count.load(Ordering::SeqCst), 1000);
    }
}
