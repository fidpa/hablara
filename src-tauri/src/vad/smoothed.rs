//! Smoothed VAD Implementation
//!
//! Wraps a boolean VAD detector to provide temporal smoothing:
//! - Prefill: Include audio context before speech onset
//! - Hangover: Continue including audio after speech ends
//! - Onset: Require multiple consecutive voice frames before triggering

use std::collections::VecDeque;

use anyhow::Result;

use super::{VadFrame, VoiceActivityDetector};

/// SmoothedVad wraps another VAD detector to provide temporal smoothing
pub struct SmoothedVad {
    inner_vad: Box<dyn VoiceActivityDetector>,
    /// Number of frames to include before speech onset (context)
    prefill_frames: usize,
    /// Number of frames to continue after speech ends (trailing context)
    hangover_frames: usize,
    /// Number of consecutive voice frames required to trigger speech
    onset_frames: usize,

    // Internal state
    frame_buffer: VecDeque<Vec<f32>>,
    hangover_counter: usize,
    onset_counter: usize,
    in_speech: bool,
    temp_out: Vec<f32>,
}

impl SmoothedVad {
    /// Create a new SmoothedVad instance
    ///
    /// # Arguments
    /// * `inner_vad` - The underlying VAD detector (e.g., SileroVad)
    /// * `prefill_frames` - Frames to include before speech (15 = 450ms)
    /// * `hangover_frames` - Frames to include after speech (15 = 450ms)
    /// * `onset_frames` - Consecutive voice frames to trigger (2 = 60ms)
    pub fn new(
        inner_vad: Box<dyn VoiceActivityDetector>,
        prefill_frames: usize,
        hangover_frames: usize,
        onset_frames: usize,
    ) -> Self {
        Self {
            inner_vad,
            prefill_frames,
            hangover_frames,
            onset_frames,
            frame_buffer: VecDeque::new(),
            hangover_counter: 0,
            onset_counter: 0,
            in_speech: false,
            temp_out: Vec::new(),
        }
    }
}

impl VoiceActivityDetector for SmoothedVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
        // 1. Buffer every incoming frame for possible pre-roll
        self.frame_buffer.push_back(frame.to_vec());
        while self.frame_buffer.len() > self.prefill_frames + 1 {
            self.frame_buffer.pop_front();
        }

        // 2. Delegate to the wrapped boolean VAD
        let is_voice = self.inner_vad.is_voice(frame)?;

        match (self.in_speech, is_voice) {
            // Potential start of speech - need to accumulate onset frames
            (false, true) => {
                self.onset_counter += 1;
                if self.onset_counter >= self.onset_frames {
                    // We have enough consecutive voice frames to trigger speech
                    self.in_speech = true;
                    self.hangover_counter = self.hangover_frames;
                    self.onset_counter = 0;

                    // Collect prefill + current frame
                    self.temp_out.clear();
                    for buf in &self.frame_buffer {
                        self.temp_out.extend(buf);
                    }
                    Ok(VadFrame::Speech(&self.temp_out))
                } else {
                    // Not enough frames yet, still silence
                    Ok(VadFrame::Noise)
                }
            }

            // Ongoing Speech
            (true, true) => {
                self.hangover_counter = self.hangover_frames;
                Ok(VadFrame::Speech(frame))
            }

            // End of Speech or interruption during onset phase
            (true, false) => {
                if self.hangover_counter > 0 {
                    self.hangover_counter -= 1;
                    Ok(VadFrame::Speech(frame))
                } else {
                    self.in_speech = false;
                    Ok(VadFrame::Noise)
                }
            }

            // Silence or broken onset sequence
            (false, false) => {
                self.onset_counter = 0;
                Ok(VadFrame::Noise)
            }
        }
    }

    fn reset(&mut self) {
        self.frame_buffer.clear();
        self.hangover_counter = 0;
        self.onset_counter = 0;
        self.in_speech = false;
        self.temp_out.clear();
        self.inner_vad.reset();
    }
}
