//! Security Audit Verification Tests
//!
//! Tests for P1 security fixes:
//! 1. File Permissions (0o600 for WAV/JSON)
//! 2. Storage Path Validation (home directory only)

use hablara_lib::storage::{AudioValidationMeta, RecordingMetadata, StorageConfig, StorageManager};
use hablara_lib::security::path_validation::validate_storage_path;
use std::path::PathBuf;
use tempfile::tempdir;

#[test]
fn test_file_permissions_owner_only() {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        // Create temp storage directory
        let temp_dir = tempdir().unwrap();
        let storage_path = temp_dir.path().to_str().unwrap().to_string();

        // Create storage manager with temp config
        let config = StorageConfig {
            storage_enabled: true,
            user_mode_enabled: false,
            max_recordings: 100,
            max_user_storage_mb: 500,
            storage_path: storage_path.clone(),
        };
        let manager = StorageManager::with_config(config);

        // Create test metadata
        let metadata = RecordingMetadata::new(
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
        );

        // Create dummy WAV bytes
        let wav_bytes = vec![0u8; 100];

        // Save recording
        let recording_id = manager.save_recording(&wav_bytes, &metadata).unwrap();
        assert!(!recording_id.is_empty());

        // List recordings to get filename
        let recordings = manager.list_recordings().unwrap();
        let saved_recording = recordings.iter().find(|r| r.id == recording_id).unwrap();

        // Generate expected filenames
        let storage_dir = PathBuf::from(&storage_path);
        let base_name = format!(
            "{}_{}",
            chrono::DateTime::parse_from_rfc3339(&saved_recording.created_at)
                .unwrap()
                .format("%Y-%m-%d_%H-%M-%S"),
            &saved_recording.id[..8]
        );

        let wav_path = storage_dir.join(format!("{}.wav", base_name));
        let json_path = storage_dir.join(format!("{}.json", base_name));

        // Verify files exist
        assert!(wav_path.exists(), "WAV file should exist");
        assert!(json_path.exists(), "JSON file should exist");

        // Check WAV permissions (should be 0o600 = owner read/write only)
        let wav_metadata = std::fs::metadata(&wav_path).unwrap();
        let wav_mode = wav_metadata.permissions().mode();
        assert_eq!(
            wav_mode & 0o777,
            0o600,
            "WAV file should have 0o600 permissions (owner-only), got {:o}",
            wav_mode & 0o777
        );

        // Check JSON permissions (should be 0o600 = owner read/write only)
        let json_metadata = std::fs::metadata(&json_path).unwrap();
        let json_mode = json_metadata.permissions().mode();
        assert_eq!(
            json_mode & 0o777,
            0o600,
            "JSON file should have 0o600 permissions (owner-only), got {:o}",
            json_mode & 0o777
        );

        // Cleanup
        temp_dir.close().unwrap();
    }

    #[cfg(not(unix))]
    {
        // Skip test on non-Unix platforms (Windows doesn't use Unix permissions)
        println!("Skipping file permissions test on non-Unix platform");
    }
}

#[test]
fn test_storage_path_validation_rejects_tmp() {
    // Attempt to use /tmp as storage path (outside home directory)
    // Note: /tmp is often a symlink (e.g., to /private/tmp on macOS)
    let result = validate_storage_path("/tmp");

    assert!(
        result.is_err(),
        "validate_storage_path should reject /tmp (outside home)"
    );

    let error_msg = result.unwrap_err().to_string();
    // Accept multiple valid error messages:
    // 1. "not in allowed" or "must be within home" (path outside home)
    // 2. "Symlink not allowed" (if /tmp is a symlink, as on macOS)
    assert!(
        error_msg.contains("not in allowed")
            || error_msg.contains("must be within home")
            || error_msg.contains("Symlink not allowed"),
        "Error should mention home directory restriction or symlink, got: {}",
        error_msg
    );
}

#[test]
fn test_storage_path_validation_rejects_path_traversal() {
    // Attempt to use path traversal
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
    let malicious_path = format!("{}/Hablara/../../../etc/passwd", home);

    let result = validate_storage_path(&malicious_path);

    assert!(
        result.is_err(),
        "validate_storage_path should reject path traversal"
    );

    let error_msg = result.unwrap_err().to_string();
    assert!(
        error_msg.contains("Path traversal"),
        "Error should mention path traversal, got: {}",
        error_msg
    );
}

#[test]
fn test_storage_path_validation_accepts_home_subdirectory() {
    // Use valid path under home directory
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
    let valid_path = format!("{}/Hablara/recordings", home);

    let result = validate_storage_path(&valid_path);

    assert!(
        result.is_ok(),
        "validate_storage_path should accept home subdirectory: {:?}",
        result
    );

    let canonical = result.unwrap();
    let home_path = PathBuf::from(&home);
    assert!(
        canonical.starts_with(&home_path),
        "Canonical path should start with home directory"
    );
}

#[test]
fn test_storage_path_validation_rejects_symlink_in_home() {
    #[cfg(unix)]
    {
        // Create symlink WITHIN home directory (realistic attack scenario)
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        let temp_dir = tempdir().unwrap();
        let target_dir = temp_dir.path().to_path_buf();

        // Create a directory in home to hold the symlink
        let home_test_dir = PathBuf::from(&home).join(".hablara_test_symlink");
        std::fs::create_dir_all(&home_test_dir).unwrap();

        let symlink_path = home_test_dir.join("malicious_link");

        // Create symlink pointing OUTSIDE home (to temp directory)
        std::os::unix::fs::symlink(&target_dir, &symlink_path).unwrap();

        // Attempt to use symlink as storage path
        let result = validate_storage_path(symlink_path.to_str().unwrap());

        // Cleanup first
        let _ = std::fs::remove_file(&symlink_path);
        let _ = std::fs::remove_dir(&home_test_dir);

        // Now assert - symlink should be rejected
        // Either because it's a symlink, OR because it resolves outside home
        assert!(
            result.is_err(),
            "validate_storage_path should reject symlinks to external directories: {:?}",
            result
        );

        temp_dir.close().unwrap();
    }

    #[cfg(not(unix))]
    {
        println!("Skipping symlink test on non-Unix platform");
    }
}
