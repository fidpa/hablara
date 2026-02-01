use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Path traversal detected: {0}")]
    PathTraversal(String),
    #[error("Path not in allowed directories: {0}")]
    NotInAllowedDir(String),
    #[error("Symlink not allowed: {0}")]
    SymlinkNotAllowed(String),
    #[error("Invalid file extension: expected {expected}, got {got}")]
    InvalidExtension { expected: String, got: String },
    #[error("File too large: {size} bytes exceeds limit of {limit} bytes")]
    FileTooLarge { size: u64, limit: u64 },
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Path does not exist: {0}")]
    PathNotFound(String),
    #[error("Invalid storage path: {0}")]
    InvalidStoragePath(String),
}

/// Allowed audio file extensions
const ALLOWED_AUDIO_EXTENSIONS: &[&str] = &["wav", "mp3", "m4a", "ogg", "flac", "aac"];

/// Maximum audio file size (500 MB)
/// Prevents memory exhaustion attacks from extremely large files
const MAX_AUDIO_FILE_SIZE: u64 = 500 * 1024 * 1024; // 500 MB

/// Maximum HTML file size (10 MB)
/// HTML exports should be small; larger files are suspicious
const MAX_HTML_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB

/// Allowed HTML file extensions
const ALLOWED_HTML_EXTENSIONS: &[&str] = &["html", "htm"];

/// Validate audio file path for security
///
/// # Security Compliance
/// * CWE-22: Path Traversal protection
/// * CWE-59: Symlink following protection
/// * CWE-400: Resource exhaustion protection (file size limits)
/// * OWASP A01:2021: Broken Access Control
///
/// # Checks
/// 1. No path traversal (.. or ./)
/// 2. Not a symlink (checked BEFORE canonicalize to prevent TOCTOU)
/// 3. Path canonicalization
/// 4. File type validation (not directory)
/// 5. File size limit (max 500 MB, prevents memory exhaustion)
/// 6. Valid audio extension (whitelist: wav, mp3, m4a, ogg, flac, aac)
/// 7. Within allowed directories (user's home or temp)
#[must_use = "validation result must be checked to ensure security"]
pub fn validate_audio_file_path(path: &str) -> Result<PathBuf, SecurityError> {
    // 1. Reject path traversal attempts
    if path.contains("..") || path.contains("./") {
        return Err(SecurityError::PathTraversal(path.to_string()));
    }

    // 2. Symlink check BEFORE canonicalize (prevents TOCTOU vulnerability)
    // CRITICAL: Check symlink status on the original path BEFORE following it
    let path_buf = Path::new(path);

    if path_buf.exists() {
        let metadata = std::fs::symlink_metadata(path_buf)?;
        if metadata.is_symlink() {
            return Err(SecurityError::SymlinkNotAllowed(path.to_string()));
        }
    }

    // 3. Canonicalize to absolute path (safe now, we know it's not a symlink)
    let canonical = path_buf.canonicalize().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            SecurityError::PathNotFound(path.to_string())
        } else {
            SecurityError::Io(e)
        }
    })?;

    // 4. Check if file (not directory)
    if !canonical.is_file() {
        return Err(SecurityError::PathNotFound(format!(
            "{} is not a file",
            canonical.display()
        )));
    }

    // 5. File size check (prevents memory exhaustion)
    let metadata = std::fs::metadata(&canonical)?;
    if metadata.len() > MAX_AUDIO_FILE_SIZE {
        return Err(SecurityError::FileTooLarge {
            size: metadata.len(),
            limit: MAX_AUDIO_FILE_SIZE,
        });
    }

    // 6. Verify audio extension
    let extension = canonical
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| SecurityError::InvalidExtension {
            expected: ALLOWED_AUDIO_EXTENSIONS.join(", "),
            got: "none".to_string(),
        })?;

    if !ALLOWED_AUDIO_EXTENSIONS.contains(&extension.as_str()) {
        return Err(SecurityError::InvalidExtension {
            expected: ALLOWED_AUDIO_EXTENSIONS.join(", "),
            got: extension,
        });
    }

    // 7. Verify within allowed directories (user's home or /tmp)
    let home_dir = dirs::home_dir().ok_or_else(|| {
        SecurityError::InvalidStoragePath("Cannot determine home directory".to_string())
    })?;
    let tmp_dir = std::env::temp_dir();

    // Canonicalize tmp_dir to handle macOS /private/var/folders symlink
    let canonical_tmp = tmp_dir.canonicalize().unwrap_or(tmp_dir.clone());

    let is_in_allowed_dir = canonical.starts_with(&home_dir) || canonical.starts_with(&canonical_tmp);

    if !is_in_allowed_dir {
        return Err(SecurityError::NotInAllowedDir(canonical.display().to_string()));
    }

    Ok(canonical)
}

/// Validate storage path for security
///
/// # Security Compliance
/// * CWE-22: Path Traversal protection
/// * CWE-59: Symlink following protection
/// * OWASP A01:2021: Broken Access Control
///
/// # Checks
/// 1. No path traversal
/// 2. Within user's home directory
/// 3. Path is directory (or can be created as directory)
/// 4. Not a symlink
#[must_use = "validation result must be checked to ensure security"]
pub fn validate_storage_path(path: &str) -> Result<PathBuf, SecurityError> {
    // 1. Reject path traversal attempts
    if path.contains("..") {
        return Err(SecurityError::PathTraversal(path.to_string()));
    }

    // 2. Expand ~ to home directory if present
    let expanded_path = if path.starts_with("~/") || path == "~" {
        let home_dir = dirs::home_dir().ok_or_else(|| {
            SecurityError::InvalidStoragePath("Cannot determine home directory".to_string())
        })?;
        if path == "~" {
            home_dir
        } else {
            home_dir.join(&path[2..])
        }
    } else {
        PathBuf::from(path)
    };

    // 3. Canonicalize if path exists, otherwise check parent
    let canonical = if expanded_path.exists() {
        expanded_path.canonicalize()?
    } else {
        // For non-existent paths, validate parent directory
        let parent = expanded_path.parent().ok_or_else(|| {
            SecurityError::InvalidStoragePath("Path has no parent directory".to_string())
        })?;

        if !parent.exists() {
            return Err(SecurityError::PathNotFound(format!(
                "Parent directory does not exist: {}",
                parent.display()
            )));
        }

        let canonical_parent = parent.canonicalize()?;
        canonical_parent.join(
            expanded_path
                .file_name()
                .ok_or_else(|| SecurityError::InvalidStoragePath("Invalid path".to_string()))?,
        )
    };

    // 4. Must be within user's home directory
    let home_dir = dirs::home_dir().ok_or_else(|| {
        SecurityError::InvalidStoragePath("Cannot determine home directory".to_string())
    })?;

    if !canonical.starts_with(&home_dir) {
        return Err(SecurityError::NotInAllowedDir(format!(
            "Storage path must be within home directory: {}",
            canonical.display()
        )));
    }

    // 5. Symlink check (AFTER home check, to prevent symlink-to-home attack)
    if expanded_path.exists() {
        let metadata = std::fs::symlink_metadata(&expanded_path)?;
        if metadata.is_symlink() {
            return Err(SecurityError::SymlinkNotAllowed(expanded_path.display().to_string()));
        }
    }

    // 6. If exists, verify it's a directory
    if canonical.exists() {
        if !canonical.is_dir() {
            return Err(SecurityError::InvalidStoragePath(format!(
                "Path exists but is not a directory: {}",
                canonical.display()
            )));
        }
    }

    Ok(canonical)
}

/// Validate HTML file path for browser opening
///
/// # Security Compliance
/// * CWE-22: Path Traversal protection
/// * CWE-59: Symlink following protection
/// * CWE-400: Resource exhaustion protection (file size limits)
/// * OWASP A01:2021: Broken Access Control
///
/// # Checks
/// 1. Extension is .html or .htm
/// 2. No path traversal
/// 3. File exists
/// 4. Not a symlink (checked BEFORE canonicalize to prevent TOCTOU)
/// 5. File size limit (max 10 MB, HTML exports should be small)
/// 6. Path canonicalization
/// 7. Within temp directory only (exports only)
#[must_use = "validation result must be checked to ensure security"]
pub fn validate_html_path(path: &str) -> Result<PathBuf, SecurityError> {
    // 1. Extension check
    let path_buf = Path::new(path);
    let extension = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| SecurityError::InvalidExtension {
            expected: ALLOWED_HTML_EXTENSIONS.join(", "),
            got: "none".to_string(),
        })?;

    if !ALLOWED_HTML_EXTENSIONS.contains(&extension.as_str()) {
        return Err(SecurityError::InvalidExtension {
            expected: ALLOWED_HTML_EXTENSIONS.join(", "),
            got: extension,
        });
    }

    // 2. Reject path traversal
    if path.contains("..") {
        return Err(SecurityError::PathTraversal(path.to_string()));
    }

    // 3. Verify file exists
    if !path_buf.exists() {
        return Err(SecurityError::PathNotFound(path.to_string()));
    }

    // 4. Symlink check BEFORE canonicalize (prevents TOCTOU)
    let metadata = std::fs::symlink_metadata(path_buf)?;
    if metadata.is_symlink() {
        return Err(SecurityError::SymlinkNotAllowed(path.to_string()));
    }

    // 5. File size check (HTML exports should be small)
    if metadata.len() > MAX_HTML_FILE_SIZE {
        return Err(SecurityError::FileTooLarge {
            size: metadata.len(),
            limit: MAX_HTML_FILE_SIZE,
        });
    }

    // 6. Canonicalize (safe now, we know it's not a symlink)
    let canonical = path_buf.canonicalize()?;

    // 7. Verify within temp directory (HTML exports should only be in temp)
    let tmp_dir = std::env::temp_dir();
    // Canonicalize tmp_dir to handle macOS /private/var/folders symlink
    let canonical_tmp = tmp_dir.canonicalize().unwrap_or(tmp_dir.clone());

    if !canonical.starts_with(&canonical_tmp) {
        return Err(SecurityError::NotInAllowedDir(format!(
            "HTML files must be in temp directory, got: {}",
            canonical.display()
        )));
    }

    Ok(canonical)
}
