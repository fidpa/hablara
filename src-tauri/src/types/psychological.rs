//! Psychological Enrichment Type Definitions
//! Types for GFK, Cognitive Distortions, and Four-Sides Model
//! Guidelines: docs/reference/guidelines/RUST.md

use serde::{Deserialize, Serialize};

/// GFK (Gewaltfreie Kommunikation) Analysis Result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GfkAnalysis {
    pub observations: Vec<String>,
    pub feelings: Vec<String>,
    pub needs: Vec<String>,
    pub requests: Vec<String>,
    pub gfk_translation: String,
    pub reflection_question: String,
}

/// Individual Cognitive Distortion
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CognitiveDistortion {
    #[serde(rename = "type")]
    pub distortion_type: String,
    pub quote: String,
    pub explanation: String,
    pub reframe: String,
}

/// Cognitive Distortion Analysis Result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CognitiveDistortionResult {
    pub distortions: Vec<CognitiveDistortion>,
    pub overall_thinking_style: String,
}

/// Four-Sides Communication Model (Schulz von Thun)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FourSidesAnalysis {
    /// Sachinhalt - Factual content layer
    pub sachinhalt: String,
    /// Selbstoffenbarung - Self-revelation layer
    pub selbstoffenbarung: String,
    /// Beziehung - Relationship layer
    pub beziehung: String,
    /// Appell - Appeal/Request layer
    pub appell: String,
    /// Potential misunderstandings
    pub potentielle_missverstaendnisse: Vec<String>,
}
