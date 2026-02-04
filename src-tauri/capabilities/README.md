---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-02-04
---

# Tauri Capabilities

## Übersicht (20 words)

Tauri 2.0 Capability-Definitionen fuer Hablará: Kontrolliert Frontend-Zugriff auf System-APIs (fs, shell, window, dialog).

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: Entwickler, die Tauri-Permissions verstehen oder anpassen wollen

**Zweck**: Dokumentiert die Tauri 2.0 Capability-Konfiguration fuer sichere System-API-Zugriffe.

**Scope**: Permission-Dateien, Security-Analyse, Schema-Validierung.

**Key Points**:
- `default.json` definiert Production-Capabilities
- Minimale Permissions nach Principle of Least Privilege
- Shell-Execute fuer MLX-Python mit Mitigations

**Quick Access**:
- [Files](#files)
- [Security](#security)
- [Schema Validation](#schema-validation)

---

## Files

- **`default.json`**: Production capabilities (loaded by all windows)
- **`windows.json`**: Windows-spezifische Overrides (falls vorhanden)

---

## Security

Fuer detaillierte Security-Analyse jeder Permission, siehe:

**[Security Capabilities Documentation](../../docs/reference/security/SECURITY_CAPABILITIES.md)**

**Key Findings:**
- **P0 Fixed:** Added missing `fs:allow-*-read` permissions (recordings load correctly)
- **P2 Fixed:** Removed unused permissions (`core:window:allow-create`, `core:webview:allow-print`)
- **shell:allow-execute:** Required for MLX-Python (dynamic paths, user-configurable)
  - **Mitigations:** Input validation, no user input in args, timeouts, script integrity

---

## Schema Validation

Capabilities muessen dem Tauri 2.0 Schema entsprechen:

```bash
# Validate schema (auto-validates during build)
pnpm tauri build
```

**Common Errors:**
- `description` property not allowed (removed in Tauri 2.0)
- Invalid permission names (check `tauri-plugin-*` docs)

---

## Cross-References

### Security Documentation
- **[../../docs/reference/security/SECURITY_CAPABILITIES.md](../../docs/reference/security/SECURITY_CAPABILITIES.md)** - Detaillierte Permission-Analyse

### Project Documentation
- **[../../CLAUDE.md](../../CLAUDE.md)** - Projekt-Einstiegspunkt

### External Resources
- **[Tauri Capabilities Guide](https://tauri.app/v2/reference/acl/)** - Official Documentation
- **[Tauri Security Best Practices](https://tauri.app/v2/security/)** - Security Guidelines

---

**Version**: 1.0.0
**Created**: 28. Januar 2026
**Last Updated**: 4. Februar 2026
**Status**: Production
