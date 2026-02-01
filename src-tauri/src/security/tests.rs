use super::path_validation::*;
use std::fs;
use std::path::PathBuf;

    /// Helper: Create temp audio file for testing
    fn create_temp_audio_file(extension: &str) -> PathBuf {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("test_audio_{}.{}", uuid::Uuid::new_v4(), extension));
        fs::write(&file_path, b"fake audio data").expect("Failed to create test file");
        file_path
    }

    /// Helper: Create temp HTML file for testing
    fn create_temp_html_file() -> PathBuf {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("test_{}.html", uuid::Uuid::new_v4()));
        fs::write(&file_path, b"<html></html>").expect("Failed to create test file");
        file_path
    }

    #[test]
    fn test_path_traversal_rejection() {
        // Path traversal attempts should be rejected
        assert!(
            validate_audio_file_path("../../../etc/passwd").is_err(),
            "Should reject ../ path traversal"
        );
        assert!(
            validate_audio_file_path("./etc/passwd").is_err(),
            "Should reject ./ path traversal"
        );
        assert!(
            validate_audio_file_path("/etc/passwd").is_err(),
            "Should reject absolute path outside allowed dirs"
        );
    }

    #[test]
    fn test_invalid_extension_rejection() {
        let temp_dir = std::env::temp_dir();
        let txt_file = temp_dir.join("test.txt");
        fs::write(&txt_file, b"not audio").expect("Failed to create test file");

        let result = validate_audio_file_path(txt_file.to_str().unwrap());
        assert!(result.is_err(), "Should reject .txt extension");

        // Cleanup
        fs::remove_file(&txt_file).ok();
    }

    #[test]
    fn test_valid_audio_extensions_allowed() {
        let valid_extensions = vec!["wav", "mp3", "m4a", "ogg", "flac", "aac"];

        for ext in valid_extensions {
            let audio_file = create_temp_audio_file(ext);
            let result = validate_audio_file_path(audio_file.to_str().unwrap());

            assert!(
                result.is_ok(),
                "Should allow .{} extension, got error: {:?}",
                ext,
                result.err()
            );

            // Cleanup
            fs::remove_file(&audio_file).ok();
        }
    }

    #[test]
    fn test_nonexistent_file_rejection() {
        let result = validate_audio_file_path("/tmp/nonexistent_audio_file_12345.wav");
        assert!(
            matches!(result, Err(SecurityError::PathNotFound(_))),
            "Should reject non-existent file"
        );
    }

    #[test]
    #[cfg(unix)] // Symlinks work differently on Windows
    fn test_symlink_rejection() {
        use std::os::unix::fs::symlink;

        let real_file = create_temp_audio_file("wav");
        let temp_dir = std::env::temp_dir();
        let symlink_path = temp_dir.join(format!("symlink_{}.wav", uuid::Uuid::new_v4()));

        // Create symlink
        symlink(&real_file, &symlink_path).expect("Failed to create symlink");

        let result = validate_audio_file_path(symlink_path.to_str().unwrap());
        assert!(
            matches!(result, Err(SecurityError::SymlinkNotAllowed(_))),
            "Should reject symlinks"
        );

        // Cleanup
        fs::remove_file(&symlink_path).ok();
        fs::remove_file(&real_file).ok();
    }

    #[test]
    fn test_storage_path_validation_rejects_root() {
        let result = validate_storage_path("/");
        assert!(result.is_err(), "Should reject root directory");
    }

    #[test]
    fn test_storage_path_validation_rejects_outside_home() {
        let result = validate_storage_path("/tmp");
        assert!(
            matches!(result, Err(SecurityError::NotInAllowedDir(_))),
            "Should reject /tmp (outside $HOME)"
        );
    }

    #[test]
    fn test_storage_path_validation_allows_home_subdirs() {
        let home = dirs::home_dir().expect("Home dir not found");
        let test_path = home.join("test_storage_dir");

        let result = validate_storage_path(test_path.to_str().unwrap());
        assert!(
            result.is_ok(),
            "Should allow subdirectory of home, got error: {:?}",
            result.err()
        );
    }

    #[test]
    fn test_storage_path_validation_tilde_expansion() {
        let result = validate_storage_path("~/test_storage");
        assert!(
            result.is_ok(),
            "Should expand ~ to home directory, got error: {:?}",
            result.err()
        );

        if let Ok(expanded) = result {
            let home = dirs::home_dir().expect("Home dir not found");
            assert!(
                expanded.starts_with(&home),
                "Expanded path should start with home directory"
            );
        }
    }

    #[test]
    fn test_storage_path_validation_tilde_only() {
        // Edge case: Just "~" should expand to home directory
        let result = validate_storage_path("~");
        assert!(
            result.is_ok(),
            "Should accept tilde-only path, got error: {:?}",
            result.err()
        );

        if let Ok(expanded) = result {
            let home = dirs::home_dir().expect("Home dir not found");
            assert_eq!(
                expanded, home,
                "Tilde-only should expand to home directory"
            );
        }
    }

    #[test]
    fn test_storage_path_path_traversal_rejection() {
        let result = validate_storage_path("~/../../etc");
        assert!(
            matches!(result, Err(SecurityError::PathTraversal(_))),
            "Should reject path traversal in storage path"
        );
    }

    #[test]
    fn test_html_path_validation_extension() {
        let html_file = create_temp_html_file();
        let result = validate_html_path(html_file.to_str().unwrap());

        assert!(
            result.is_ok(),
            "Should allow .html extension, got error: {:?}",
            result.err()
        );

        // Cleanup
        fs::remove_file(&html_file).ok();
    }

    #[test]
    fn test_html_path_validation_rejects_non_html() {
        let temp_dir = std::env::temp_dir();
        let txt_file = temp_dir.join("test.txt");
        fs::write(&txt_file, b"not html").expect("Failed to create test file");

        let result = validate_html_path(txt_file.to_str().unwrap());
        assert!(
            matches!(result, Err(SecurityError::InvalidExtension { .. })),
            "Should reject non-.html extension"
        );

        // Cleanup
        fs::remove_file(&txt_file).ok();
    }

    #[test]
    fn test_html_path_validation_path_traversal() {
        let result = validate_html_path("../../../etc/passwd.html");
        assert!(
            matches!(result, Err(SecurityError::PathTraversal(_))),
            "Should reject path traversal in HTML path"
        );
    }

    #[test]
    fn test_audio_file_size_limit() {
        // Create temp file larger than limit (501 MB)
        let temp_dir = std::env::temp_dir();
        let large_file = temp_dir.join(format!("large_audio_{}.wav", uuid::Uuid::new_v4()));

        // Create 501 MB file (exceeds 500 MB limit)
        let size = 501 * 1024 * 1024u64;
        {
            let file = std::fs::File::create(&large_file).expect("Failed to create large file");
            file.set_len(size).expect("Failed to set file size");
        }

        let result = validate_audio_file_path(large_file.to_str().unwrap());
        assert!(
            matches!(result, Err(SecurityError::FileTooLarge { .. })),
            "Should reject audio file larger than 500 MB"
        );

        // Cleanup
        fs::remove_file(&large_file).ok();
    }

    #[test]
    fn test_audio_file_size_limit_boundary() {
        // Create temp file exactly at limit (500 MB)
        let temp_dir = std::env::temp_dir();
        let boundary_file = temp_dir.join(format!("boundary_audio_{}.wav", uuid::Uuid::new_v4()));

        // Create 500 MB file (exactly at limit, should pass)
        let size = 500 * 1024 * 1024u64;
        {
            let file = std::fs::File::create(&boundary_file).expect("Failed to create boundary file");
            file.set_len(size).expect("Failed to set file size");
        }

        let result = validate_audio_file_path(boundary_file.to_str().unwrap());
        assert!(
            result.is_ok(),
            "Should allow audio file exactly at 500 MB limit, got error: {:?}",
            result.err()
        );

        // Cleanup
        fs::remove_file(&boundary_file).ok();
    }

    #[test]
    fn test_html_file_size_limit() {
        // Create temp HTML file larger than limit (11 MB)
        let temp_dir = std::env::temp_dir();
        let large_html = temp_dir.join(format!("large_{}.html", uuid::Uuid::new_v4()));

        // Create 11 MB HTML file (exceeds 10 MB limit)
        let size = 11 * 1024 * 1024u64;
        {
            let file = std::fs::File::create(&large_html).expect("Failed to create large HTML");
            file.set_len(size).expect("Failed to set file size");
        }

        let result = validate_html_path(large_html.to_str().unwrap());
        assert!(
            matches!(result, Err(SecurityError::FileTooLarge { .. })),
            "Should reject HTML file larger than 10 MB"
        );

        // Cleanup
        fs::remove_file(&large_html).ok();
    }

    #[test]
    fn test_small_audio_file_allowed() {
        // Create small audio file (1 KB)
        let small_file = create_temp_audio_file("wav");

        let result = validate_audio_file_path(small_file.to_str().unwrap());
        assert!(
            result.is_ok(),
            "Should allow small audio file, got error: {:?}",
            result.err()
        );

        // Cleanup
        fs::remove_file(&small_file).ok();
    }
