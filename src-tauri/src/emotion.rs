//! Emotion Types and Result Structures
//!
//! Shared type definitions for emotion analysis across the codebase.
//! The actual classification logic is in `audio_analysis::emotion_classifier`.

use serde::{Deserialize, Serialize};

/// Emotion types detected from audio analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EmotionType {
    Neutral,
    Calm,
    Stress,
    Excitement,
    Uncertainty,
    Frustration,
    Joy,
    Doubt,
    Conviction,
    Aggression,
}

/// Result of emotion analysis with confidence scores
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmotionResult {
    pub primary: EmotionType,
    pub confidence: f32,
    pub secondary: Option<EmotionType>,
    pub features: Option<FeatureReport>,
}

/// Audio feature values for transparency in emotion detection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureReport {
    pub pitch: f32,
    pub energy: f32,
    pub speech_rate: f32,
}
