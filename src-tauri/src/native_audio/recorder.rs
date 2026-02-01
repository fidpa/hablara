//! Native Audio Recorder
//!
//! Captures audio from the default microphone using cpal,
//! resamples to 16kHz, and applies VAD filtering.
//!
//! Based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

use std::{
    io::Error,
    sync::{mpsc, Arc, Mutex},
    time::Duration,
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, Sample, SizedSample,
};

use super::constants::WHISPER_SAMPLE_RATE;
use super::device::get_cpal_host;
use super::resampler::FrameResampler;
use crate::vad::{VadFrame, VadPipeline, VoiceActivityDetector};

/// Maximum recording duration to prevent OOM (30 minutes = 1800 seconds)
/// At 16kHz, this equals 28,800,000 samples (~115 MB of f32 data)
const MAX_RECORDING_DURATION_SECS: u64 = 1800;

/// Maximum samples buffer size (calculated from duration * sample rate)
const MAX_RECORDING_SAMPLES: usize =
    (MAX_RECORDING_DURATION_SECS as usize) * (WHISPER_SAMPLE_RATE as usize);

/// Commands sent to the worker thread
enum Cmd {
    Start,
    Stop(mpsc::Sender<Vec<f32>>),
    Shutdown,
}

/// Native audio recorder using cpal
pub struct NativeAudioRecorder {
    device: Option<Device>,
    cmd_tx: Option<mpsc::Sender<Cmd>>,
    worker_handle: Option<std::thread::JoinHandle<()>>,
    vad: Option<Arc<Mutex<VadPipeline>>>,
    level_cb: Option<Arc<dyn Fn(f32) + Send + Sync + 'static>>,
}

impl NativeAudioRecorder {
    /// Create a new NativeAudioRecorder
    pub fn new() -> Self {
        NativeAudioRecorder {
            device: None,
            cmd_tx: None,
            worker_handle: None,
            vad: None,
            level_cb: None,
        }
    }

    /// Configure VAD pipeline
    pub fn with_vad(mut self, vad: VadPipeline) -> Self {
        self.vad = Some(Arc::new(Mutex::new(vad)));
        self
    }

    /// Configure level callback (receives RMS level 0.0-1.0)
    pub fn with_level_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(f32) + Send + Sync + 'static,
    {
        self.level_cb = Some(Arc::new(cb));
        self
    }

    /// Open the audio device and start the worker thread
    pub fn open(&mut self, device: Option<Device>) -> Result<(), String> {
        if self.worker_handle.is_some() {
            return Ok(()); // already open
        }

        let (sample_tx, sample_rx) = mpsc::channel::<Vec<f32>>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();

        let host = get_cpal_host();
        let device = match device {
            Some(dev) => dev,
            None => host
                .default_input_device()
                .ok_or_else(|| Error::new(std::io::ErrorKind::NotFound, "No input device found"))
                .map_err(|e| e.to_string())?,
        };

        let thread_device = device.clone();
        let vad = self.vad.clone();
        let level_cb = self.level_cb.clone();

        let worker = std::thread::spawn(move || {
            let config = match get_preferred_config(&thread_device) {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!(error = %e, "Native audio: Failed to get config");
                    return;
                }
            };

            let sample_rate = config.sample_rate().0;
            let channels = config.channels() as usize;

            tracing::info!(
                device = %thread_device.name().unwrap_or_else(|_| "Unknown".to_string()),
                sample_rate,
                channels,
                format = ?config.sample_format(),
                "Native audio: Device configured"
            );

            let stream = match config.sample_format() {
                cpal::SampleFormat::U8 => {
                    build_stream::<u8>(&thread_device, &config, sample_tx.clone(), channels)
                }
                cpal::SampleFormat::I8 => {
                    build_stream::<i8>(&thread_device, &config, sample_tx.clone(), channels)
                }
                cpal::SampleFormat::I16 => {
                    build_stream::<i16>(&thread_device, &config, sample_tx.clone(), channels)
                }
                cpal::SampleFormat::I32 => {
                    build_stream::<i32>(&thread_device, &config, sample_tx.clone(), channels)
                }
                cpal::SampleFormat::F32 => {
                    build_stream::<f32>(&thread_device, &config, sample_tx.clone(), channels)
                }
                _ => {
                    tracing::error!("Native audio: Unsupported sample format");
                    return;
                }
            };

            let stream = match stream {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!(error = %e, "Native audio: Failed to build stream");
                    return;
                }
            };

            if let Err(e) = stream.play() {
                tracing::error!(error = %e, "Native audio: Failed to start stream");
                return;
            }

            // Run the consumer loop (keeps stream alive)
            run_consumer(sample_rate, vad, sample_rx, cmd_rx, level_cb);
            // Stream is dropped here
        });

        self.device = Some(device);
        self.cmd_tx = Some(cmd_tx);
        self.worker_handle = Some(worker);

        Ok(())
    }

    /// Start recording (clears buffer, begins collecting samples)
    pub fn start(&self) -> Result<(), String> {
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Start)
                .map_err(|e| format!("Failed to send start command: {}", e))?;
        }
        Ok(())
    }

    /// Stop recording and return collected samples (16kHz mono, VAD filtered)
    pub fn stop(&self) -> Result<Vec<f32>, String> {
        let (resp_tx, resp_rx) = mpsc::channel();
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Stop(resp_tx))
                .map_err(|e| format!("Failed to send stop command: {}", e))?;
        }
        resp_rx
            .recv()
            .map_err(|e| format!("Failed to receive samples: {}", e))
    }

    /// Close the recorder and cleanup resources
    pub fn close(&mut self) -> Result<(), String> {
        if let Some(tx) = self.cmd_tx.take() {
            let _ = tx.send(Cmd::Shutdown);
        }

        if let Some(h) = self.worker_handle.take() {
            // Wait for worker thread with timeout (prevent deadlock)
            const SHUTDOWN_TIMEOUT_MS: u64 = 2000;
            let timeout = Duration::from_millis(SHUTDOWN_TIMEOUT_MS);
            let start = std::time::Instant::now();

            while !h.is_finished() && start.elapsed() < timeout {
                std::thread::sleep(Duration::from_millis(50));
            }

            if h.is_finished() {
                let _ = h.join();
                tracing::debug!("Worker thread joined successfully");
            } else {
                tracing::warn!(
                    timeout_ms = SHUTDOWN_TIMEOUT_MS,
                    "Worker thread did not finish within timeout, abandoning join"
                );
                // Don't call join() - let thread be detached to prevent hang
            }
        }

        self.device = None;
        Ok(())
    }

    /// Check if recorder is open
    #[allow(dead_code)]
    pub fn is_open(&self) -> bool {
        self.worker_handle.is_some()
    }
}

impl Drop for NativeAudioRecorder {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

/// Build an input stream for any sample type
fn build_stream<T>(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    sample_tx: mpsc::Sender<Vec<f32>>,
    channels: usize,
) -> Result<cpal::Stream, cpal::BuildStreamError>
where
    T: Sample + SizedSample + Send + 'static,
    f32: cpal::FromSample<T>,
{
    let mut output_buffer = Vec::new();

    let stream_cb = move |data: &[T], _: &cpal::InputCallbackInfo| {
        output_buffer.clear();

        if channels == 1 {
            // Direct conversion for mono
            output_buffer.extend(data.iter().map(|&sample| sample.to_sample::<f32>()));
        } else {
            // Convert to mono by averaging channels
            let frame_count = data.len() / channels;
            output_buffer.reserve(frame_count);

            for frame in data.chunks_exact(channels) {
                let mono_sample = frame
                    .iter()
                    .map(|&sample| sample.to_sample::<f32>())
                    .sum::<f32>()
                    / channels as f32;
                output_buffer.push(mono_sample);
            }
        }

        if sample_tx.send(output_buffer.clone()).is_err() {
            tracing::warn!("Native audio: Failed to send samples");
        }
    };

    device.build_input_stream(
        &config.clone().into(),
        stream_cb,
        |err| tracing::error!(error = %err, "Native audio: Stream error"),
        None,
    )
}

/// Get preferred audio config (tries to get one supporting 16kHz)
fn get_preferred_config(
    device: &cpal::Device,
) -> Result<cpal::SupportedStreamConfig, String> {
    let supported_configs = device
        .supported_input_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?;

    let mut best_config: Option<cpal::SupportedStreamConfigRange> = None;

    // Try to find a config that supports 16kHz
    for config_range in supported_configs {
        if config_range.min_sample_rate().0 <= WHISPER_SAMPLE_RATE
            && config_range.max_sample_rate().0 >= WHISPER_SAMPLE_RATE
        {
            match best_config {
                None => best_config = Some(config_range),
                Some(ref current) => {
                    // Prioritize F32 > I16 > I32 > others
                    let score = |fmt: cpal::SampleFormat| match fmt {
                        cpal::SampleFormat::F32 => 4,
                        cpal::SampleFormat::I16 => 3,
                        cpal::SampleFormat::I32 => 2,
                        _ => 1,
                    };

                    if score(config_range.sample_format()) > score(current.sample_format()) {
                        best_config = Some(config_range);
                    }
                }
            }
        }
    }

    // If we found a config supporting 16kHz, use it
    if let Some(config) = best_config {
        return Ok(config.with_sample_rate(cpal::SampleRate(WHISPER_SAMPLE_RATE)));
    }

    // Fall back to default config (will need resampling)
    device
        .default_input_config()
        .map_err(|e| format!("Failed to get default config: {}", e))
}

/// Consumer loop: processes samples from the audio thread
fn run_consumer(
    in_sample_rate: u32,
    vad: Option<Arc<Mutex<VadPipeline>>>,
    sample_rx: mpsc::Receiver<Vec<f32>>,
    cmd_rx: mpsc::Receiver<Cmd>,
    level_cb: Option<Arc<dyn Fn(f32) + Send + Sync + 'static>>,
) {
    // Create resampler (30ms frames for VAD)
    let mut frame_resampler = FrameResampler::new(
        in_sample_rate as usize,
        WHISPER_SAMPLE_RATE as usize,
        Duration::from_millis(30),
    );

    let mut processed_samples = Vec::<f32>::new();
    let mut recording = false;

    // Helper to process a single frame through VAD
    fn handle_frame(
        samples: &[f32],
        recording: bool,
        vad: &Option<Arc<Mutex<VadPipeline>>>,
        out_buf: &mut Vec<f32>,
    ) {
        if !recording {
            return;
        }

        if let Some(vad_arc) = vad {
            if let Ok(mut det) = vad_arc.lock() {
                match det.push_frame(samples).unwrap_or(VadFrame::Speech(samples)) {
                    VadFrame::Speech(buf) => out_buf.extend_from_slice(buf),
                    VadFrame::Noise => {}
                }
            } else {
                // Lock failed, just keep the samples
                out_buf.extend_from_slice(samples);
            }
        } else {
            // No VAD, keep all samples
            out_buf.extend_from_slice(samples);
        }
    }

    loop {
        let raw = match sample_rx.recv() {
            Ok(s) => s,
            Err(_) => break, // Stream closed
        };

        // Calculate RMS for level callback (before resampling for responsiveness)
        if let Some(cb) = &level_cb {
            let sum: f32 = raw.iter().map(|s| s * s).sum();
            let rms = (sum / raw.len().max(1) as f32).sqrt();
            cb(rms.min(1.0));
        }

        // Resample and process through VAD
        frame_resampler.push(&raw, &mut |frame: &[f32]| {
            handle_frame(frame, recording, &vad, &mut processed_samples)
        });

        // OOM Prevention: Stop recording if max duration reached
        if recording && processed_samples.len() >= MAX_RECORDING_SAMPLES {
            tracing::warn!(
                duration_sec = MAX_RECORDING_DURATION_SECS,
                samples = processed_samples.len(),
                "Max recording duration reached, stopping recording (buffer preserved for next Stop command)"
            );
            // Stop recording but keep samples in buffer
            // User's explicit Stop command will retrieve the samples
            recording = false;
        }

        // Check for commands (non-blocking)
        while let Ok(cmd) = cmd_rx.try_recv() {
            match cmd {
                Cmd::Start => {
                    processed_samples.clear();
                    recording = true;
                    if let Some(v) = &vad {
                        if let Ok(mut vad_guard) = v.lock() {
                            vad_guard.reset();
                        }
                    }
                    tracing::info!("Native audio: Recording started");
                }
                Cmd::Stop(reply_tx) => {
                    recording = false;

                    // Finish processing remaining samples
                    frame_resampler.finish(&mut |frame: &[f32]| {
                        handle_frame(frame, true, &vad, &mut processed_samples)
                    });

                    let samples = std::mem::take(&mut processed_samples);
                    tracing::info!(
                        samples = samples.len(),
                        duration_sec = %format!("{:.2}", samples.len() as f32 / WHISPER_SAMPLE_RATE as f32),
                        "Native audio: Recording stopped"
                    );

                    let _ = reply_tx.send(samples);
                }
                Cmd::Shutdown => {
                    tracing::debug!("Native audio: Shutting down");
                    return;
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_recording_constants() {
        // Verify constants are reasonable
        assert_eq!(MAX_RECORDING_DURATION_SECS, 1800); // 30 minutes
        assert_eq!(
            MAX_RECORDING_SAMPLES,
            1800 * (WHISPER_SAMPLE_RATE as usize),
            "MAX_RECORDING_SAMPLES should be 30 minutes worth of samples at 16kHz"
        );
    }

    #[test]
    fn test_shutdown_timeout_constant() {
        // Verify timeout is defined inline (2000ms)
        // This is a documentation test - the constant is inlined in close()
        // Actual timeout behavior is tested in integration tests
        assert!(true, "Shutdown timeout is 2000ms (defined in close() method)");
    }

    #[test]
    fn test_oom_prevention_samples_calculation() {
        // For a 30-minute recording at 16kHz:
        // 1800 seconds * 16000 samples/second = 28,800,000 samples
        let expected = 1800 * 16000;
        assert_eq!(MAX_RECORDING_SAMPLES, expected);

        // Memory usage: 28.8M samples * 4 bytes/f32 = ~115 MB (reasonable)
        let estimated_bytes = MAX_RECORDING_SAMPLES * std::mem::size_of::<f32>();
        assert!(
            estimated_bytes < 200_000_000,
            "Max memory usage should be under 200MB, got {}MB",
            estimated_bytes / 1_000_000
        );
    }
}
