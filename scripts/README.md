---
diataxis-type: reference
status: production
version: 1.1.0
last_updated: 2026-02-04
---

# Scripts Directory

## Public Scripts (End-Users)

This directory contains **user-facing scripts** for setup and installation:

### Bash Scripts (macOS/Linux)
- `setup-whisper.sh` - Installs whisper.cpp with Metal acceleration
- `setup-ollama-quick.sh` - One-liner installer for Ollama + qwen2.5:7b-custom
- `bump-version.sh` - Version bump tool for releases

### PowerShell Scripts (Windows)
- `setup-whisper.ps1` - Installs whisper.cpp with MSVC (optional CUDA)
- `setup-ollama-quick.ps1` - Installer for Ollama + qwen2.5:7b-custom

### Shared Resources
- `ollama/` - Ollama model configurations

## Development Scripts

**Development-only scripts have been moved to `scripts-dev/` (gitignored).**

See `scripts-dev/README.md` for:
- Development Tools (run-dev.sh, next-dev-wait.sh, etc.)
- RAG & Embeddings (build-knowledge-db.ts, generate-embeddings.ts, etc.)
- MLX Scripts (scripts-dev/mac/mlx-transcribe.py, mlx-analyze.py, mlx-serve-dev.py)
- Benchmarks & Testing
- Audio & Sound utilities
- Validation scripts

---

## TL;DR (20 words)

Public Setup-Scripts fuer Hablara Installation (Whisper, Ollama) - Cross-Platform (Bash + PowerShell) - Development-Scripts in scripts-dev/.

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: End-Users installing Hablara + Release Engineers

**Zweck**: User-facing installation scripts fuer LLM (Ollama) und STT (Whisper), plus Versionierungs-Tool.

**Scope**: 5 Public Scripts (3 Bash, 2 PowerShell) + ollama/ directory.

**Key Points**:
- setup-whisper.sh/ps1 installiert whisper.cpp (macOS: Metal, Windows: MSVC/CUDA)
- setup-ollama-quick.sh/ps1 installiert Ollama + qwen2.5:7b-custom
- bump-version.sh synchronisiert Version ueber package.json, Cargo.toml, tauri.conf.json
- Development scripts in scripts-dev/ (nicht fuer End-User)

**Quick Access**:
- [Setup & Installation (macOS/Linux)](#setup--installation-macoslinux)
- [Setup & Installation (Windows)](#setup--installation-windows)
- [Version Management](#version-management)
- [Ollama Configuration](#ollama-configuration)

---

## Setup & Installation (macOS/Linux)

### setup-whisper.sh

Installiert whisper.cpp mit Metal-Acceleration fuer macOS.

**Verwendung:**
```bash
# Standard-Installation mit "base" Model (142 MB)
./scripts/setup-whisper.sh

# Mit spezifischem Model
./scripts/setup-whisper.sh small    # 466 MB, bessere Qualitaet
./scripts/setup-whisper.sh tiny     # 75 MB, schnellste Option
./scripts/setup-whisper.sh medium   # 1.5 GB, hohe Qualitaet
```

**Was das Script macht:**
1. Installiert cmake falls nicht vorhanden (via Homebrew)
2. Klont whisper.cpp nach `.whisper-build/`
3. Kompiliert mit cmake + Metal-Acceleration (M1/M2/M3/M4)
4. Laedt das gewaehlte Model herunter
5. Kopiert Binary und Model nach `src-tauri/binaries/` und `src-tauri/models/`

**Voraussetzungen:**
- macOS mit Xcode Command Line Tools
- Homebrew (fuer cmake)
- Git, Curl

---

### setup-ollama-quick.sh

**One-Liner Installer** fuer Ollama + optimiertes qwen2.5:7b-custom Model.

**Verwendung:**
```bash
# Lokal
./scripts/setup-ollama-quick.sh

# Remote (GitHub)
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh | bash
```

**Was das Script macht:**
1. Prueft Disk-Space (10 GB minimum)
2. Installiert Ollama (via offizielles Install-Script)
3. Startet Ollama Server
4. Laedt qwen2.5:7b Model (~4.7 GB)
5. Erstellt qwen2.5:7b-custom mit optimierten Parametern
6. Verifiziert Installation

**Features:**
- Temperature: 0.3 (konsistenter Output)
- Top-P: 0.9 (Fokus auf wahrscheinlichste Tokens)
- System Prompt: JSON-Mode fuer strukturierte Outputs
- Automatische Error-Recovery
- Exit-Codes fuer CI/CD Integration

**Dauer:** ~5-10 Min (abhaengig von Download-Speed)

---

## Setup & Installation (Windows)

### setup-whisper.ps1

Installiert whisper.cpp mit MSVC fuer Windows (optional CUDA).

**Verwendung:**
```powershell
# Standard-Installation mit "base" Model (142 MB)
.\scripts\setup-whisper.ps1

# Mit spezifischem Model
.\scripts\setup-whisper.ps1 -Model small

# Mit CUDA-Acceleration (NVIDIA GPU erforderlich)
.\scripts\setup-whisper.ps1 -Model base -UseCuda
```

**Was das Script macht:**
1. Prueft Visual Studio Build Tools, CMake, Git
2. Klont whisper.cpp nach `.whisper-build\`
3. Kompiliert mit CMake/MSVC (optional CUDA)
4. Laedt das gewaehlte Model herunter
5. Kopiert Binary und Model nach `src-tauri\binaries\` und `src-tauri\models\`

**Voraussetzungen:**
- Windows 10/11
- Visual Studio Build Tools ("Desktop development with C++")
- CMake: `winget install Kitware.CMake`
- Git: `winget install Git.Git`
- Optional: CUDA Toolkit fuer GPU-Beschleunigung

---

### setup-ollama-quick.ps1

Installer fuer Ollama + optimiertes qwen2.5:7b-custom Model.

**Verwendung:**
```powershell
.\scripts\setup-ollama-quick.ps1
```

**Was das Script macht:**
1. Prueft Disk-Space (10 GB minimum)
2. Installiert Ollama (via winget oder manuelle Anleitung)
3. Startet Ollama Server
4. Laedt qwen2.5:7b Model (~4.7 GB)
5. Erstellt qwen2.5:7b-custom mit optimierten Parametern
6. Verifiziert Installation

**Voraussetzungen:**
- Windows 10/11
- 10 GB freier Speicher
- Internet-Verbindung

**Dauer:** ~5-10 Min (abhaengig von Download-Speed)

---

## Version Management

### bump-version.sh

Synchronisiert Versionsnummern ueber package.json, Cargo.toml, tauri.conf.json.

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

Ollama Modelfile-Konfigurationen fuer optimierte LLM-Performance.

**Verfuegbare Modelfiles:**
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

**Automatisch via:** `setup-ollama-quick.sh` oder `setup-ollama-quick.ps1`

---

## Icon-Conversion Scripts

**Location:** `scripts-dev/mac/` (macOS-spezifisch)

### generate-icon-sizes.sh

Generiert alle Icon-Groessen aus 1024x1024px PNG.

**Verwendung:**
```bash
./scripts-dev/mac/generate-icon-sizes.sh hablara-icon-1024.png
```

**Output:**
- 10 PNG-Groessen (16px - 1024px)
- icon.icns (macOS Bundle)

**Requirements:**
- ImageMagick (via Homebrew)
- macOS

**Siehe:** [docs/how-to/icon/CREATE_MACOS_APP_ICON.md](../docs/how-to/icon/CREATE_MACOS_APP_ICON.md)

---

## Quick-Start

### macOS/Linux
```bash
# 1. Ollama + LLM installieren (One-liner)
./scripts/setup-ollama-quick.sh

# 2. Whisper installieren (optional - fuer lokale Transkription)
./scripts/setup-whisper.sh

# 3. App starten
pnpm run dev
```

### Windows
```powershell
# 1. Ollama + LLM installieren
.\scripts\setup-ollama-quick.ps1

# 2. Whisper installieren (optional)
.\scripts\setup-whisper.ps1

# 3. App starten
pnpm run dev
```

**Gesamtdauer:** ~5-15 Min (abhaengig von Downloads)

**Development-Scripts:** Siehe `scripts-dev/README.md` fuer dev.sh, RAG-Tools, MLX, Benchmarks, etc.

---

## Troubleshooting

### PowerShell Execution Policy (Windows)

```powershell
# Fehler: "running scripts is disabled on this system"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Visual Studio Build Tools (Windows)

Falls CMake-Build fehlschlaegt:
1. Visual Studio Build Tools installieren: https://visualstudio.microsoft.com/downloads/
2. "Desktop development with C++" Workload waehlen
3. Script erneut ausfuehren

### Homebrew nicht gefunden (macOS)

```bash
# Homebrew installieren
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

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
- **[scripts-dev/mac/README.md](../scripts-dev/mac/README.md)** - macOS-spezifische Scripts
- **[scripts-dev/win/README.md](../scripts-dev/win/README.md)** - Windows-spezifische Scripts

### Project Documentation
- **[CLAUDE.md](../CLAUDE.md)** - Projekt-Einstiegspunkt
- **[.claude/context.md](../.claude/context.md)** - Tech-Stack Uebersicht

---

**Version**: 1.1.0
**Created**: 28. Januar 2026
**Last Updated**: 4. Februar 2026
**Status**: Production
