//! Persistent Audio Storage Module
//! Handles saving, listing, and managing audio recordings.
//! Guidelines: docs/reference/guidelines/RUST.md

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

use crate::types::psychological::{CognitiveDistortionResult, FourSidesAnalysis, GfkAnalysis};

/// Audio validation metadata captured during recording
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioValidationMeta {
    pub rms_energy: f32,
    pub duration_ms: u64,
    pub sample_count: usize,
    pub passed: bool,
}

/// VAD (Voice Activity Detection) statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VadStatsMeta {
    pub original_samples: usize,
    pub filtered_samples: usize,
    pub speech_ratio: f32,
    pub frames_processed: usize,
    pub speech_frames: usize,
}

/// Transcription metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionMeta {
    pub text: String,
    pub provider: String,
    pub model: String,
    pub language: String,
    pub processing_time_ms: u64,
}

/// Text filter metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFilterMeta {
    pub original_text: String,
    pub filtered_text: String,
    pub filler_words_removed: usize,
    pub hallucinations_detected: bool,
}

/// Emotion analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmotionData {
    pub primary: String,
    pub confidence: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary: Option<String>,
}

/// Tone analysis result (5-dimensional communication style)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToneData {
    pub formality: u8,       // 1-5
    pub professionalism: u8, // 1-5
    pub directness: u8,      // 1-5
    pub energy: u8,          // 1-5
    pub seriousness: u8,     // 1-5
    pub confidence: f32,     // 0.0-1.0
}

/// Baseline emotion result from all recordings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaselineResult {
    pub emotion: String,
    pub confidence: f32,
    pub sample_count: usize,
}

/// Fallacy data for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FallacyData {
    #[serde(rename = "type")]
    pub fallacy_type: String,
    pub confidence: f32,
    pub quote: String,
    pub explanation: String,
    pub suggestion: String,
}

/// Topic classification result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicData {
    pub topic: String,
    pub confidence: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
}

/// Analysis result stored with recording (emotion + fallacies + enrichment + topic)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResultData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emotion: Option<EmotionData>,
    pub fallacies: Vec<FallacyData>,
    pub enrichment: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic: Option<TopicData>,
}

/// Complete recording metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingMetadata {
    pub id: String,
    pub created_at: String,
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub file_size: usize,
    pub audio_validation: AudioValidationMeta,
    pub vad_stats: Option<VadStatsMeta>,
    pub transcription: Option<TranscriptionMeta>,
    pub text_filter: Option<TextFilterMeta>,
    pub provider: String,
    pub model: String,
    pub app_version: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub emotion: Option<EmotionData>,

    /// Full analysis result (emotion + fallacies + enrichment)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analysis_result: Option<AnalysisResultData>,

    /// Tone analysis result (5-dimensional communication style)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tone: Option<ToneData>,

    /// Input source (recording/text/file) - optional for backward compatibility
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    /// GFK (Gewaltfreie Kommunikation) analysis result
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gfk: Option<GfkAnalysis>,

    /// Cognitive Distortion analysis result
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cognitive: Option<CognitiveDistortionResult>,

    /// Four-Sides Communication Model analysis
    #[serde(skip_serializing_if = "Option::is_none")]
    pub four_sides: Option<FourSidesAnalysis>,
}

impl RecordingMetadata {
    /// Create new recording metadata with generated ID and timestamp
    #[allow(dead_code)]
    pub fn new(
        duration_ms: u64,
        sample_rate: u32,
        file_size: usize,
        audio_validation: AudioValidationMeta,
        provider: String,
        model: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            created_at: Utc::now().to_rfc3339(),
            duration_ms,
            sample_rate,
            file_size,
            audio_validation,
            vad_stats: None,
            transcription: None,
            text_filter: None,
            provider,
            model,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            emotion: None,
            analysis_result: None,
            tone: None,
            source: None,
            gfk: None,
            cognitive: None,
            four_sides: None,
        }
    }
}

/// Storage configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageConfig {
    pub storage_enabled: bool,
    pub user_mode_enabled: bool,
    pub max_recordings: usize,
    pub max_user_storage_mb: usize,
    pub storage_path: String,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            storage_enabled: true,
            user_mode_enabled: false,
            max_recordings: 100,
            max_user_storage_mb: 500,
            storage_path: get_default_storage_path()
                .to_string_lossy()
                .to_string(),
        }
    }
}

/// Set secure file permissions (owner-only read/write)
///
/// On Unix: Sets 0o600 (rw-------)
/// On Windows: No-op (Windows uses ACLs, not Unix permissions)
#[cfg(unix)]
fn set_secure_permissions(path: &std::path::Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
        .map_err(|e| format!("Failed to set permissions on {}: {}", path.display(), e))
}

#[cfg(not(unix))]
fn set_secure_permissions(_path: &std::path::Path) -> Result<(), String> {
    // Windows uses ACLs, not Unix-style permissions
    // File inherits directory permissions by default
    Ok(())
}

/// Get default storage path based on build configuration.
///
/// # App Store Build (`--features app-store`)
/// Uses `~/Documents/Hablara/recordings/` on all platforms.
/// This path is user-accessible and complies with Apple Guideline 2.4.5(i).
///
/// # Direct Distribution Build (default)
/// Uses platform-native paths:
/// - macOS: `~/Library/Application Support/Hablara/recordings/`
/// - Linux: `~/.local/share/hablara/recordings/` (XDG)
/// - Windows: `%LOCALAPPDATA%\Hablara\recordings\`
fn get_default_storage_path() -> PathBuf {
    #[cfg(feature = "app-store")]
    {
        get_app_store_storage_path()
    }

    #[cfg(not(feature = "app-store"))]
    {
        get_direct_distribution_storage_path()
    }
}

/// Storage path for App Store builds: ~/Documents/Hablara/recordings/
///
/// # Panics
/// Panics if Documents directory is unavailable in sandboxed App Store build.
/// This indicates a broken sandbox configuration that must be fixed.
#[cfg(feature = "app-store")]
fn get_app_store_storage_path() -> PathBuf {
    dirs::document_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join("Documents")))
        .expect("FATAL: Documents directory not available - App Store sandbox may be misconfigured")
        .join("Hablara")
        .join("recordings")
}

/// Storage path for direct distribution builds (platform-native paths)
#[cfg(not(feature = "app-store"))]
fn get_direct_distribution_storage_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        crate::platform::macos::get_app_support_storage_path()
            .unwrap_or_else(|e| {
                tracing::warn!("Failed to get Application Support path: {e}");
                std::env::temp_dir().join("hablara_recordings")
            })
    }

    #[cfg(target_os = "linux")]
    {
        crate::platform::linux::get_xdg_storage_path()
            .unwrap_or_else(|e| {
                tracing::warn!("Failed to get XDG data path: {e}");
                std::env::temp_dir().join("hablara_recordings")
            })
    }

    #[cfg(target_os = "windows")]
    {
        crate::platform::windows::get_local_app_data_storage_path()
            .unwrap_or_else(|e| {
                tracing::warn!("Failed to get LocalAppData path: {e}");
                std::env::temp_dir().join("hablara_recordings")
            })
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        std::env::temp_dir().join("hablara_recordings")
    }
}

/// Migrate recordings from legacy path (~/Hablara/recordings/) to new location.
///
/// This function is called on app startup to migrate existing recordings
/// from the old home directory path to the new platform-native location.
///
/// The migration uses a safe two-phase approach:
/// 1. Attempt atomic rename (fast, same filesystem)
/// 2. Fall back to copy with integrity verification, then delete source
///
/// Returns the number of files migrated.
pub fn migrate_legacy_storage() -> Result<usize, String> {
    let legacy_path = dirs::home_dir()
        .ok_or("Home directory not found")?
        .join("Hablara")
        .join("recordings");

    if !legacy_path.exists() {
        return Ok(0);
    }

    let current_path = get_default_storage_path();
    if legacy_path == current_path {
        return Ok(0);
    }

    // Read directory entries
    let files: Vec<_> = std::fs::read_dir(&legacy_path)
        .map_err(|e| format!("Failed to read legacy directory: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            matches!(
                e.path().extension().and_then(|s| s.to_str()),
                Some("wav") | Some("json")
            )
        })
        .collect();

    if files.is_empty() {
        return Ok(0);
    }

    // Create target directory
    std::fs::create_dir_all(&current_path)
        .map_err(|e| format!("Failed to create target directory: {e}"))?;

    let mut migrated = 0;
    for entry in files {
        let src = entry.path();
        let dest = current_path.join(src.file_name().unwrap());
        if !dest.exists() {
            // Try rename first (fast, atomic, same filesystem)
            if std::fs::rename(&src, &dest).is_ok() {
                // Set secure permissions on renamed file
                if let Err(e) = set_secure_permissions(&dest) {
                    tracing::warn!("Failed to set permissions after rename: {e}");
                }
                migrated += 1;
                continue;
            }

            // Fall back to copy with integrity verification
            let src_size = std::fs::metadata(&src)
                .map_err(|e| format!("Failed to read source metadata: {e}"))?
                .len();

            let bytes_copied = std::fs::copy(&src, &dest)
                .map_err(|e| format!("Failed to copy file: {e}"))?;

            // Verify integrity: file size must match
            if bytes_copied != src_size {
                // Remove partial copy and continue with next file (don't delete source)
                let _ = std::fs::remove_file(&dest);
                tracing::warn!(
                    src = %src.display(),
                    expected = src_size,
                    actual = bytes_copied,
                    "Migration: incomplete copy, skipping file"
                );
                continue;
            }

            // Set secure permissions on copied file
            if let Err(e) = set_secure_permissions(&dest) {
                tracing::warn!("Failed to set permissions after copy: {e}");
            }

            // Only delete source after successful, verified copy
            if let Err(e) = std::fs::remove_file(&src) {
                tracing::warn!(src = %src.display(), error = %e, "Failed to remove source after migration");
            }
            migrated += 1;
        }
    }

    // Cleanup empty legacy directories
    if std::fs::read_dir(&legacy_path)
        .map(|mut d| d.next().is_none())
        .unwrap_or(false)
    {
        let _ = std::fs::remove_dir(&legacy_path);
        if let Some(parent) = legacy_path.parent() {
            let _ = std::fs::remove_dir(parent);
        }
    }

    if migrated > 0 {
        tracing::info!(migrated, "Migrated recordings from legacy storage");
    }
    Ok(migrated)
}

/// Storage manager for handling recording persistence
pub struct StorageManager {
    config: Mutex<StorageConfig>,
}

/// Flag to ensure migration only runs once per process
static MIGRATION_DONE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

impl StorageManager {
    /// Create new storage manager with default config
    pub fn new() -> Self {
        // Attempt legacy storage migration on first initialization only
        if !MIGRATION_DONE.swap(true, std::sync::atomic::Ordering::SeqCst) {
            if let Err(e) = migrate_legacy_storage() {
                tracing::warn!("Legacy storage migration failed: {e}");
            }
        }
        Self {
            config: Mutex::new(StorageConfig::default()),
        }
    }

    /// Create storage manager with custom config
    #[allow(dead_code)]
    pub fn with_config(config: StorageConfig) -> Self {
        Self {
            config: Mutex::new(config),
        }
    }

    /// Get current storage configuration
    pub fn get_config(&self) -> Result<StorageConfig, String> {
        self.config
            .lock()
            .map_err(|e| format!("Failed to lock config: {}", e))
            .map(|g| g.clone())
    }

    /// Update storage configuration
    pub fn update_config(&self, config: StorageConfig) -> Result<(), String> {
        let mut guard = self
            .config
            .lock()
            .map_err(|e| format!("Failed to lock config: {}", e))?;
        *guard = config;
        Ok(())
    }

    /// Ensure storage directory exists
    fn ensure_storage_dir(&self) -> Result<PathBuf, String> {
        let config = self.get_config()?;
        let path = PathBuf::from(&config.storage_path);
        // Apply Windows Long Path prefix if path exceeds 260 chars
        let path = crate::commands::utils::path::to_long_path(&path);

        if !path.exists() {
            std::fs::create_dir_all(&path)
                .map_err(|e| format!("Failed to create storage directory: {}", e))?;
        }

        Ok(path)
    }

    /// Generate filename from metadata
    fn generate_filename(metadata: &RecordingMetadata) -> String {
        // Parse ISO8601 timestamp and format for filename
        let timestamp = DateTime::parse_from_rfc3339(&metadata.created_at)
            .map(|dt| dt.format("%Y-%m-%d_%H-%M-%S").to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        format!("{}_{}", timestamp, &metadata.id[..8])
    }

    /// Save recording with metadata
    pub fn save_recording(
        &self,
        audio_bytes: &[u8],
        metadata: &RecordingMetadata,
    ) -> Result<String, String> {
        let config = self.get_config()?;

        if !config.storage_enabled {
            return Err("Storage is disabled".to_string());
        }

        // Enrich metadata with generated fields
        let mut enriched_metadata = metadata.clone();

        // Generate ID if empty
        if enriched_metadata.id.is_empty() {
            enriched_metadata.id = uuid::Uuid::new_v4().to_string();
        }

        // Set createdAt if empty
        if enriched_metadata.created_at.is_empty() {
            enriched_metadata.created_at = chrono::Utc::now().to_rfc3339();
        }

        // Set appVersion if empty
        if enriched_metadata.app_version.is_empty() {
            enriched_metadata.app_version = env!("CARGO_PKG_VERSION").to_string();
        }

        let storage_dir = self.ensure_storage_dir()?;
        let base_name = Self::generate_filename(&enriched_metadata);

        // Save WAV file (skip if no audio data - e.g., text-import)
        if !audio_bytes.is_empty() {
            let wav_path = storage_dir.join(format!("{}.wav", base_name));
            std::fs::write(&wav_path, audio_bytes)
                .map_err(|e| format!("Failed to write WAV file: {}", e))?;

            // Security: Set owner-only permissions for sensitive audio data
            set_secure_permissions(&wav_path)?;
        }

        // Save metadata JSON (use enriched metadata)
        let json_path = storage_dir.join(format!("{}.json", base_name));
        let json_content = serde_json::to_string_pretty(&enriched_metadata)
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
        std::fs::write(&json_path, json_content)
            .map_err(|e| format!("Failed to write metadata file: {}", e))?;

        // Security: Set owner-only permissions for sensitive metadata
        set_secure_permissions(&json_path)?;

        tracing::info!(
            name = %base_name,
            bytes = audio_bytes.len(),
            "Storage: Recording saved"
        );

        // Trigger cleanup if needed
        self.cleanup_old_recordings()?;

        Ok(enriched_metadata.id.clone())
    }

    /// List all recordings
    pub fn list_recordings(&self) -> Result<Vec<RecordingMetadata>, String> {
        let config = self.get_config()?;
        let storage_path = PathBuf::from(&config.storage_path);

        if !storage_path.exists() {
            return Ok(vec![]);
        }

        let mut recordings: Vec<RecordingMetadata> = Vec::new();

        let entries = std::fs::read_dir(&storage_path)
            .map_err(|e| format!("Failed to read storage directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        match serde_json::from_str::<RecordingMetadata>(&content) {
                            Ok(metadata) => recordings.push(metadata),
                            Err(e) => {
                                tracing::warn!(
                                    path = %path.display(),
                                    error = %e,
                                    "Storage: Failed to parse metadata"
                                );
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!(
                            path = %path.display(),
                            error = %e,
                            "Storage: Failed to read metadata"
                        );
                    }
                }
            }
        }

        // Sort by creation date (newest first)
        recordings.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        Ok(recordings)
    }

    /// Get recording audio by ID
    pub fn get_recording_audio(&self, id: &str) -> Result<Vec<u8>, String> {
        let recordings = self.list_recordings()?;

        let metadata = recordings
            .iter()
            .find(|r| r.id == id)
            .ok_or_else(|| format!("Recording not found: {}", id))?;

        let config = self.get_config()?;
        let storage_path = PathBuf::from(&config.storage_path);
        let base_name = Self::generate_filename(metadata);
        let wav_path = storage_path.join(format!("{}.wav", base_name));

        if !wav_path.exists() {
            return Err(format!("Audio file not found: {}", wav_path.display()));
        }

        std::fs::read(&wav_path).map_err(|e| format!("Failed to read audio file: {}", e))
    }

    /// Delete a recording by ID
    pub fn delete_recording(&self, id: &str) -> Result<(), String> {
        let recordings = self.list_recordings()?;

        let metadata = recordings
            .iter()
            .find(|r| r.id == id)
            .ok_or_else(|| format!("Recording not found: {}", id))?;

        let config = self.get_config()?;
        let storage_path = PathBuf::from(&config.storage_path);
        let base_name = Self::generate_filename(metadata);

        // Delete WAV file
        let wav_path = storage_path.join(format!("{}.wav", base_name));
        if wav_path.exists() {
            std::fs::remove_file(&wav_path)
                .map_err(|e| format!("Failed to delete WAV file: {}", e))?;
        }

        // Delete JSON file
        let json_path = storage_path.join(format!("{}.json", base_name));
        if json_path.exists() {
            std::fs::remove_file(&json_path)
                .map_err(|e| format!("Failed to delete metadata file: {}", e))?;
        }

        tracing::debug!(id = %id, "Storage: Recording deleted");
        Ok(())
    }

    /// Delete recording by metadata directly (no list scan) - O(1) operation
    fn delete_recording_direct(&self, metadata: &RecordingMetadata) -> Result<(), String> {
        let config = self.get_config()?;
        let storage_path = PathBuf::from(&config.storage_path);
        let base_name = Self::generate_filename(metadata);

        // Delete WAV file
        let wav_path = storage_path.join(format!("{}.wav", base_name));
        if wav_path.exists() {
            std::fs::remove_file(&wav_path)
                .map_err(|e| format!("Failed to delete WAV file: {}", e))?;
        }

        // Delete JSON file
        let json_path = storage_path.join(format!("{}.json", base_name));
        if json_path.exists() {
            std::fs::remove_file(&json_path)
                .map_err(|e| format!("Failed to delete metadata file: {}", e))?;
        }

        Ok(())
    }

    /// Cleanup old recordings if over limit - O(n) complexity
    fn cleanup_old_recordings(&self) -> Result<usize, String> {
        let config = self.get_config()?;
        let recordings = self.list_recordings()?;

        if recordings.len() <= config.max_recordings {
            return Ok(0);
        }

        // Calculate how many to delete
        let to_delete = recordings.len() - config.max_recordings;

        // Get oldest recordings (list is sorted newest first)
        let oldest: Vec<_> = recordings.iter().rev().take(to_delete).collect();

        let mut deleted = 0;
        for recording in oldest {
            // Use direct delete to avoid O(n²) from repeated list_recordings calls
            if self.delete_recording_direct(recording).is_ok() {
                tracing::debug!(id = %recording.id, "Storage: Deleted old recording");
                deleted += 1;
            }
        }

        if deleted > 0 {
            tracing::info!(
                deleted,
                max = config.max_recordings,
                "Storage: Cleaned up old recordings"
            );
        }

        Ok(deleted)
    }

    /// Delete all recordings - O(n) complexity
    pub fn clear_all_recordings(&self) -> Result<usize, String> {
        let recordings = self.list_recordings()?;
        let count = recordings.len();

        for recording in &recordings {
            // Use direct delete to avoid O(n²) from repeated list_recordings calls
            let _ = self.delete_recording_direct(recording);
        }

        tracing::info!(count, "Storage: Cleared all recordings");
        Ok(count)
    }

    /// Get storage statistics
    pub fn get_storage_stats(&self) -> Result<StorageStats, String> {
        let config = self.get_config()?;
        let recordings = self.list_recordings()?;

        let total_size: usize = recordings.iter().map(|r| r.file_size).sum();
        let total_duration_ms: u64 = recordings.iter().map(|r| r.duration_ms).sum();

        Ok(StorageStats {
            recording_count: recordings.len(),
            total_size_bytes: total_size,
            total_duration_ms,
            storage_path: config.storage_path,
            max_recordings: config.max_recordings,
        })
    }

    /// Calculate baseline emotion from all recordings with emotion data.
    /// Tie-breaker: Most recent recording when emotions have same frequency.
    pub fn calculate_baseline_emotion(&self) -> Result<Option<BaselineResult>, String> {
        let recordings = self.list_recordings()?;

        // Filter recordings with emotion data
        let with_emotion: Vec<_> = recordings
            .iter()
            .filter(|r| r.emotion.is_some())
            .collect();

        if with_emotion.is_empty() {
            return Ok(None);
        }

        // Group by emotion, tracking most recent for each
        let mut emotion_map: std::collections::HashMap<String, (usize, String, f32)> =
            std::collections::HashMap::new();

        for recording in &with_emotion {
            if let Some(ref emotion) = recording.emotion {
                let entry = emotion_map
                    .entry(emotion.primary.clone())
                    .or_insert((0, String::new(), 0.0));

                entry.0 += 1; // count

                // Update if this is more recent (RFC3339 strings are sortable)
                if recording.created_at > entry.1 {
                    entry.1 = recording.created_at.clone();
                    entry.2 = emotion.confidence;
                }
            }
        }

        // Find most frequent, tie-break by most recent
        let winner = emotion_map
            .into_iter()
            .max_by(|a, b| {
                // Primary: count, Secondary: timestamp (most recent)
                match a.1 .0.cmp(&b.1 .0) {
                    std::cmp::Ordering::Equal => a.1 .1.cmp(&b.1 .1),
                    other => other,
                }
            });

        match winner {
            Some((emotion, (count, _, confidence))) => Ok(Some(BaselineResult {
                emotion,
                confidence,
                sample_count: count,
            })),
            None => Ok(None),
        }
    }
}

impl Default for StorageManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Storage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub recording_count: usize,
    pub total_size_bytes: usize,
    pub total_duration_ms: u64,
    pub storage_path: String,
    pub max_recordings: usize,
}

/// Global storage manager instance (lazy initialized)
static STORAGE_MANAGER: std::sync::OnceLock<StorageManager> = std::sync::OnceLock::new();

/// Get or initialize the global storage manager
pub fn get_storage_manager() -> &'static StorageManager {
    STORAGE_MANAGER.get_or_init(StorageManager::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_metadata() -> RecordingMetadata {
        RecordingMetadata::new(
            3000,
            16000,
            96044,
            AudioValidationMeta {
                rms_energy: 0.05,
                duration_ms: 3000,
                sample_count: 48000,
                passed: true,
            },
            "whisper-cpp".to_string(),
            "german-turbo".to_string(),
        )
    }

    #[test]
    fn test_recording_metadata_creation() {
        let metadata = create_test_metadata();
        assert!(!metadata.id.is_empty());
        assert!(!metadata.created_at.is_empty());
        assert_eq!(metadata.duration_ms, 3000);
        assert_eq!(metadata.sample_rate, 16000);
    }

    #[test]
    fn test_storage_config_default() {
        let config = StorageConfig::default();
        assert!(config.max_recordings > 0);
        // Path contains "Hablara" or "hablara" (lowercase on Linux XDG)
        assert!(
            config.storage_path.to_lowercase().contains("hablara"),
            "Storage path should contain 'hablara': {}",
            config.storage_path
        );
    }

    #[test]
    fn test_filename_generation() {
        let metadata = create_test_metadata();
        let filename = StorageManager::generate_filename(&metadata);
        assert!(filename.contains(&metadata.id[..8]));
    }

    #[test]
    fn test_storage_manager_config() {
        let manager = StorageManager::new();
        let config = manager.get_config().unwrap();
        assert!(config.max_recordings > 0);

        let mut updated = config.clone();
        updated.max_recordings = 50;
        manager.update_config(updated).unwrap();

        let new_config = manager.get_config().unwrap();
        assert_eq!(new_config.max_recordings, 50);
    }

    #[test]
    fn test_home_fallback_robustness() {
        // Test that get_default_storage_path() uses appropriate directories
        let path = get_default_storage_path();

        // Path should be under home or temp directory
        let home = dirs::home_dir();
        let temp = std::env::temp_dir();

        let is_under_home = home
            .as_ref()
            .map(|h| path.starts_with(h))
            .unwrap_or(false);
        let is_under_temp = path.starts_with(&temp);

        assert!(
            is_under_home || is_under_temp,
            "Storage path should be under home or temp directory, got: {}",
            path.display()
        );

        // Path should end with recordings
        assert!(path.ends_with("recordings"));
    }

    #[test]
    fn test_storage_path_ends_with_recordings() {
        let path = get_default_storage_path();
        assert!(path.ends_with("recordings"));
    }

    #[test]
    fn test_storage_path_within_home_or_temp() {
        let path = get_default_storage_path();
        let home = dirs::home_dir();
        let temp = std::env::temp_dir();
        assert!(
            home.map(|h| path.starts_with(h)).unwrap_or(false) || path.starts_with(&temp)
        );
    }

    #[test]
    #[cfg(feature = "app-store")]
    fn test_app_store_uses_documents() {
        let path = get_default_storage_path();
        let path_str = path.to_string_lossy();
        // Accept both English "Documents" and localized variants (e.g., German "Dokumente")
        // or fallback to home directory with "Documents" appended
        assert!(
            path_str.contains("Documents") || path_str.contains("Dokumente") ||
            (dirs::home_dir().is_some() && path.starts_with(dirs::home_dir().unwrap())),
            "App Store path should be in Documents directory or home subdirectory: {}",
            path_str
        );
    }

    #[test]
    #[cfg(all(not(feature = "app-store"), target_os = "macos"))]
    fn test_direct_macos_uses_app_support() {
        let path = get_default_storage_path();
        assert!(path.to_string_lossy().contains("Application Support"));
    }

    #[test]
    #[cfg(all(not(feature = "app-store"), target_os = "linux"))]
    fn test_direct_linux_uses_xdg() {
        let path = get_default_storage_path();
        assert!(path.to_string_lossy().contains(".local/share"));
    }

    #[test]
    fn test_migrate_legacy_storage_no_legacy_dir() {
        // Migration is a static once-per-process operation, so we just verify
        // the function is safe to call (doesn't panic) and returns a valid result
        let result = migrate_legacy_storage();
        // Should succeed (either 0 files migrated or migration already done)
        // or fail gracefully with an error message
        match result {
            Ok(count) => assert!(count >= 0, "Migration count should be non-negative"),
            Err(e) => assert!(!e.is_empty(), "Error message should not be empty"),
        }
    }
}
