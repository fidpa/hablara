//! Frame-based Audio Resampler
//!
//! Resamples audio from device sample rate to 16kHz for Whisper.
//!
//! Based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

use rubato::{FftFixedIn, Resampler};
use std::time::Duration;

/// Fixed chunk size for resampler (1024 samples per chunk)
const RESAMPLER_CHUNK_SIZE: usize = 1024;

/// Frame-based resampler that outputs fixed-size frames at target sample rate.
/// Used to convert device audio (e.g., 48kHz) to 16kHz for VAD and Whisper.
pub struct FrameResampler {
    resampler: Option<FftFixedIn<f32>>,
    chunk_in: usize,
    in_buf: Vec<f32>,
    frame_samples: usize,
    pending: Vec<f32>,
}

impl FrameResampler {
    /// Create a new FrameResampler
    ///
    /// # Arguments
    /// * `in_hz` - Input sample rate (e.g., 48000)
    /// * `out_hz` - Output sample rate (e.g., 16000)
    /// * `frame_dur` - Duration of each output frame (e.g., 30ms for VAD)
    pub fn new(in_hz: usize, out_hz: usize, frame_dur: Duration) -> Self {
        let frame_samples = ((out_hz as f64 * frame_dur.as_secs_f64()).round()) as usize;
        assert!(frame_samples > 0, "frame duration too short");

        let chunk_in = RESAMPLER_CHUNK_SIZE;

        // Only create resampler if rates differ
        let resampler = (in_hz != out_hz).then(|| {
            tracing::debug!(
                input_hz = in_hz,
                output_hz = out_hz,
                frame_samples,
                "Resampler: Created"
            );
            FftFixedIn::<f32>::new(in_hz, out_hz, chunk_in, 1, 1)
                .expect("Failed to create resampler")
        });

        Self {
            resampler,
            chunk_in,
            in_buf: Vec::with_capacity(chunk_in),
            frame_samples,
            pending: Vec::with_capacity(frame_samples),
        }
    }

    /// Push audio samples and emit complete frames via callback
    ///
    /// # Arguments
    /// * `src` - Input audio samples at source rate
    /// * `emit` - Callback that receives each complete frame at target rate
    pub fn push(&mut self, mut src: &[f32], mut emit: impl FnMut(&[f32])) {
        // If no resampling needed, just emit frames directly
        if self.resampler.is_none() {
            self.emit_frames(src, &mut emit);
            return;
        }

        // Process input in chunks
        while !src.is_empty() {
            let space = self.chunk_in - self.in_buf.len();
            let take = space.min(src.len());
            self.in_buf.extend_from_slice(&src[..take]);
            src = &src[take..];

            // When we have a full chunk, resample it
            if self.in_buf.len() == self.chunk_in {
                // SAFETY: resampler.is_none() check at line 61 ensures this is Some
                if let Ok(out) = self
                    .resampler
                    .as_mut()
                    .expect("resampler should exist when rates differ")
                    .process(&[&self.in_buf[..]], None)
                {
                    self.emit_frames(&out[0], &mut emit);
                }
                self.in_buf.clear();
            }
        }
    }

    /// Finish processing and emit any remaining samples
    pub fn finish(&mut self, mut emit: impl FnMut(&[f32])) {
        // Process any remaining input samples
        if let Some(ref mut resampler) = self.resampler {
            if !self.in_buf.is_empty() {
                // Pad with zeros to reach chunk size
                self.in_buf.resize(self.chunk_in, 0.0);
                if let Ok(out) = resampler.process(&[&self.in_buf[..]], None) {
                    self.emit_frames(&out[0], &mut emit);
                }
            }
        }

        // Emit any remaining pending frame (padded with zeros)
        if !self.pending.is_empty() {
            self.pending.resize(self.frame_samples, 0.0);
            emit(&self.pending);
            self.pending.clear();
        }
    }

    /// Internal: emit complete frames from resampled data
    fn emit_frames(&mut self, mut data: &[f32], emit: &mut impl FnMut(&[f32])) {
        while !data.is_empty() {
            let space = self.frame_samples - self.pending.len();
            let take = space.min(data.len());
            self.pending.extend_from_slice(&data[..take]);
            data = &data[take..];

            if self.pending.len() == self.frame_samples {
                emit(&self.pending);
                self.pending.clear();
            }
        }
    }
}
