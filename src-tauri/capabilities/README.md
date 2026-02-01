# Tauri Capabilities

This directory contains Tauri 2.0 capability definitions that control which system APIs the frontend can access.

## Files

- **`default.json`**: Production capabilities (loaded by all windows)

## Security

For a detailed security analysis of each permission, see:

**📖 [Security Capabilities Documentation](../../docs/reference/SECURITY_CAPABILITIES.md)**

Key findings:
- ✅ **P0 Fixed:** Added missing `fs:allow-*-read` permissions (recordings load correctly)
- ✅ **P2 Fixed:** Removed unused permissions (`core:window:allow-create`, `core:webview:allow-print`)
- ⚠️ **shell:allow-execute:** Required for MLX-Python (dynamic paths, user-configurable)
  - **Mitigations:** Input validation, no user input in args, timeouts, script integrity

## Schema Validation

Capabilities must conform to Tauri 2.0 schema:

```bash
# Validate schema (auto-validates during build)
npm run build
```

**Common errors:**
- ❌ `description` property not allowed (removed in this version)
- ❌ Invalid permission names (check `tauri-plugin-*` docs)

## References

- **Tauri Capabilities Guide:** https://tauri.app/v2/reference/acl/
- **Security Best Practices:** https://tauri.app/v2/security/
