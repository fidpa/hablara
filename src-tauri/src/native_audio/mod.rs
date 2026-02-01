//! Native Audio Module
//!
//! Provides native audio capture using cpal with automatic resampling
//! to 16kHz and optional VAD filtering.
//!
//! Key components:
//! - `NativeAudioRecorder`: Main audio capture interface
//! - `FrameResampler`: Resamples audio to 16kHz in 30ms frames
//! - `CpalDeviceInfo`: Device enumeration
//!
//! Based on [cjpais/handy](https://github.com/cjpais/handy) (MIT License).

pub mod constants;
pub mod device;
pub mod recorder;
pub mod resampler;

pub use device::{list_input_devices, CpalDeviceInfo};
pub use recorder::NativeAudioRecorder;
