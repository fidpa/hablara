//! Hablará - Tauri Application Entry Point
//!
//! Desktop voice intelligence platform built with Tauri 2.0.
//! Delegates to library for modular architecture and testability.

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hablara_lib::run()
}
