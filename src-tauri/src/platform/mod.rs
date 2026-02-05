//! Platform-specific modules for Cross-Platform Support
//!
//! This module provides conditional compilation for platform-specific code.
//! Each platform has its own submodule that is only compiled on that target.

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

// Re-export common platform utilities
#[cfg(target_os = "macos")]
#[allow(unused_imports)]
pub use macos::*;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
#[allow(unused_imports)]
pub use linux::*;
