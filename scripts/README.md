---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-02-01
---

# Scripts Directory

## Public Scripts (End-Users)

This directory contains **user-facing scripts** for setup and installation:

- `setup-whisper.sh` - Installs whisper.cpp with Metal acceleration
- `setup-ollama-quick.sh` - One-liner installer for Ollama + qwen2.5:7b-custom
- `bump-version.sh` - Version bump tool for releases
- `ollama/` - Ollama model configurations

## Development Scripts

**Development-only scripts have been moved to `scripts-dev/` (gitignored).**

See `scripts-dev/README.md` for:
- Development Tools (run-dev.sh, next-dev-wait.sh, etc.)
- RAG & Embeddings (build-knowledge-db.ts, generate-embeddings.ts, etc.)
- MLX Scripts (mlx-transcribe.py, mlx-analyze.py, mlx-serve-dev.py)
- Benchmarks & Testing
- Audio & Sound utilities
- Validation scripts

---

## TL;DR (20 words)

3 Public Setup-Scripts für Hablará Installation (Whisper, Ollama, Versioning) - Development-Scripts in scripts-dev/ (gitignored).

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: End-Users installing Hablará + Release Engineers

**Zweck**: User-facing installation scripts für LLM (Ollama) und STT (Whisper), plus Versionierungs-Tool.

**Scope**: 3 Public Scripts (setup-whisper.sh, setup-ollama-quick.sh, bump-version.sh) + ollama/ directory.

**Key Points**:
- setup-whisper.sh installiert whisper.cpp mit Metal-Acceleration (optional)
- setup-ollama-quick.sh installiert Ollama + qwen2.5:7b-custom (One-liner)
- bump-version.sh synchronisiert Version über package.json, Cargo.toml, tauri.conf.json
- Development scripts in scripts-dev/ (nicht für End-User)

**Quick Access**:
- [Setup & Installation](#setup--installation)
- [Version Management](#version-management)
- [Ollama Configuration](#ollama-configuration)

---

## Setup & Installation

### setup-whisper.sh

Installiert whisper.cpp mit Metal-Acceleration für macOS.

**Verwendung:**
```bash
# Standard-Installation mit "base" Model (142 MB)
./scripts/setup-whisper.sh

# Mit spezifischem Model
./scripts/setup-whisper.sh small    # 466 MB, bessere Qualität
./scripts/setup-whisper.sh tiny     # 75 MB, schnellste Option
./scripts/setup-whisper.sh medium   # 1.5 GB, hohe Qualität
```

**Was das Script macht:**
1. Installiert cmake falls nicht vorhanden (via Homebrew)
2. Klont whisper.cpp nach `.whisper-build/`
3. Kompiliert mit cmake + Metal-Acceleration (M1/M2/M3/M4)
4. Lädt das gewählte Model herunter
5. Kopiert Binary und Model nach `src-tauri/binaries/` und `src-tauri/models/`

**Voraussetzungen:**
- macOS mit Xcode Command Line Tools
- Homebrew (für cmake)
- Git, Curl

---

### setup-ollama-quick.sh

**One-Liner Installer** für Ollama + optimiertes qwen2.5:7b-custom Model.

**Verwendung:**
```bash
# Lokal
./scripts/setup-ollama-quick.sh

# Remote (GitHub)
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh | bash
```

**Was das Script macht:**
1. Prüft Disk-Space (10 GB minimum)
2. Installiert Ollama (via offizielles Install-Script)
3. Startet Ollama Server
4. Lädt qwen2.5:7b Model (~4.7 GB)
5. Erstellt qwen2.5:7b-custom mit optimierten Parametern
6. Verifiziert Installation

**Features:**
- Temperature: 0.3 (konsistenter Output)
- Top-P: 0.9 (Fokus auf wahrscheinlichste Tokens)
- System Prompt: JSON-Mode für strukturierte Outputs
- Automatische Error-Recovery
- Exit-Codes für CI/CD Integration

**Dauer:** ~5-10 Min (abhängig von Download-Speed)

---

## Version Management

### bump-version.sh

Synchronisiert Versionsnummern über package.json, Cargo.toml, tauri.conf.json.

**Verwendung:**
```bash
./scripts/bump-version.sh 1.0.1  # Patch
./scripts/bump-version.sh 1.1.0  # Minor
./scripts/bump-version.sh 2.0.0  # Major
```

**Features:**
- Aktualisiert alle 3 Version-Files
- Validiert SemVer-Format
- Erstellt Git-Commit (optional)

---

## Ollama Configuration

**Location:** `scripts/ollama/`

### Modelfiles

Ollama Modelfile-Konfigurationen für optimierte LLM-Performance.

**Verfügbare Modelfiles:**
- `qwen2.5-7b-custom.modelfile` - Default (4.7 GB)
- `qwen2.5-14b-custom.modelfile` - Enhanced (8.9 GB)
- `qwen2.5-32b-custom.modelfile` - Premium (19 GB)

**Verwendung:**
```bash
# qwen2.5:7b-custom erstellen (Default)
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile

# 14b Variante
ollama create qwen2.5:14b-custom -f scripts/ollama/qwen2.5-14b-custom.modelfile
```

**Optimierungen:**
- Temperature: 0.3 (konsistent)
- Top-P: 0.9 (fokussiert)
- System Prompt: JSON-Mode
- Context Window: 32k tokens

**Automatisch via:** `setup-ollama-quick.sh`

---

## Icon-Conversion Scripts

**Location:** `icons/`

### generate-sizes.sh

Generiert alle Icon-Größen aus 1024x1024px PNG.

**Verwendung:**
```bash
cd icons/
./generate-sizes.sh hablara-icon-1024.png
```

**Output:**
- 10 PNG-Größen (16px - 1024px)
- icon.icns (macOS Bundle)
- icon.ico (Windows, future)

**Requirements:**
- ImageMagick (via Homebrew)
- libpng (optional, bessere Kompression)

**Siehe:** [docs/how-to/icon/CREATE_MACOS_APP_ICON.md](../docs/how-to/icon/CREATE_MACOS_APP_ICON.md)

---

## Quick-Start

```bash
# 1. Ollama + LLM installieren (One-liner)
./scripts/setup-ollama-quick.sh

# 2. Whisper installieren (optional - für lokale Transkription)
./scripts/setup-whisper.sh

# 3. App starten
pnpm run dev
```

**Gesamtdauer:** ~5-15 Min (abhängig von Downloads)

**Development-Scripts:** Siehe `scripts-dev/README.md` für dev.sh, RAG-Tools, MLX, Benchmarks, etc.

---

## Cross-References

### Setup-Guides
- **[README.md](../README.md)** - Haupt-Dokumentation mit Schnellstart
- **[docs/how-to/setup/LLM_SETUP.md](../docs/how-to/setup/LLM_SETUP.md)** - Ollama + MLX-LLM Setup

### Ollama Configuration
- **[scripts/ollama/README.md](ollama/README.md)** - Modelfile-Konfiguration
- **[scripts/ollama/qwen2.5-7b-custom.modelfile](ollama/qwen2.5-7b-custom.modelfile)** - Default LLM Model

### Development
- **[scripts-dev/README.md](../scripts-dev/README.md)** - Development-Scripts (gitignored)

### Project Documentation
- **[CLAUDE.md](../CLAUDE.md)** - Projekt-Einstiegspunkt
- **[.claude/context.md](../.claude/context.md)** - Tech-Stack Übersicht

---

**Version**: 1.0.0
**Created**: 28. Januar 2026
**Last Updated**: 1. Februar 2026
**Status**: Production
