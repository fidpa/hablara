# Scripts Directory

## TL;DR

Setup-Scripts für die Hablará Installation (Whisper, Ollama) - Cross-Platform (Bash + PowerShell).

---

## Übersicht

**Zweck**: Installation von LLM (Ollama) und STT (Whisper) für Hablará.

**Enthaltene Scripts**:
- `setup-whisper.sh` / `.ps1` - whisper.cpp (macOS: Metal, Windows: MSVC/CUDA)
- `setup-whisper-linux.sh` - whisper.cpp (Linux: CPU/CUDA)
- `setup-ollama-quick.sh` / `.ps1` - Ollama + qwen2.5:7b-custom
- `setup-ollama-linux.sh` - Ollama für Linux (systemd-Integration)
- `bump-version.sh` - Versionsnummern synchronisieren

---

## Quick-Start

### macOS
```bash
# 1. Ollama + LLM installieren (One-liner)
./scripts/setup-ollama-quick.sh

# 2. Whisper installieren (optional - fuer lokale Transkription)
./scripts/setup-whisper.sh

# 3. App starten
pnpm run dev
```

### Linux
```bash
# 1. Ollama + LLM installieren (One-liner)
./scripts/setup-ollama-linux.sh

# 2. Whisper installieren (optional - fuer lokale Transkription)
./scripts/setup-whisper-linux.sh

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

---

<details id="setup--installation-macoslinux">
<summary><b>Setup & Installation (macOS/Linux)</b> - Whisper + Ollama Scripts</summary>

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

### setup-whisper-linux.sh

Installiert whisper.cpp fuer Linux (Ubuntu/Debian/Fedora/Arch).

**Verwendung:**
```bash
# Standard-Installation mit "base" Model (142 MB)
./scripts/setup-whisper-linux.sh

# Mit spezifischem Model
./scripts/setup-whisper-linux.sh small    # 466 MB
./scripts/setup-whisper-linux.sh medium   # 1.5 GB

# Mit CUDA-Unterstuetzung (NVIDIA GPU)
./scripts/setup-whisper-linux.sh base true
```

**Was das Script macht:**
1. Prueft Dependencies (cmake, build-essential, git, curl)
2. Klont whisper.cpp nach `.whisper-build/`
3. Kompiliert mit cmake (optional CUDA)
4. Laedt das gewaehlte Model herunter
5. Kopiert Binary und Model nach `src-tauri/binaries/` und `src-tauri/models/`

**Voraussetzungen:**
- Ubuntu 24.04 LTS / Debian 12+ (oder kompatible Distribution)
- cmake, build-essential: `sudo apt-get install cmake build-essential`
- Optional: CUDA Toolkit fuer GPU-Beschleunigung

---

### setup-ollama-linux.sh

**One-Liner Installer** fuer Ollama + optimiertes qwen2.5:7b-custom Model.

**Verwendung:**
```bash
# Lokal
./scripts/setup-ollama-linux.sh

# Remote (GitHub)
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-linux.sh | bash
```

**Was das Script macht:**
1. Prueft Disk-Space (10 GB minimum)
2. Installiert Ollama (via offizielles Install-Script)
3. Startet Ollama Server (systemd oder nohup)
4. Laedt qwen2.5:7b Model (~4.7 GB)
5. Erstellt qwen2.5:7b-custom mit optimierten Parametern
6. Verifiziert Installation

**Systemd Service Management:**
```bash
# Status pruefen
systemctl --user status ollama

# Starten/Stoppen
systemctl --user start ollama
systemctl --user stop ollama

# Autostart aktivieren
systemctl --user enable ollama
```

**Dauer:** ~5-10 Min (abhaengig von Download-Speed)

</details>

---

<details id="setup--installation-windows">
<summary><b>Setup & Installation (Windows)</b> - Whisper + Ollama Scripts</summary>

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

</details>

---

<details id="version-management">
<summary><b>Version Management</b> - bump-version.sh</summary>

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

</details>

---

<details id="ollama-configuration">
<summary><b>Ollama Configuration</b> - Modelfiles</summary>

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

</details>

---

<details id="troubleshooting">
<summary><b>Troubleshooting</b> - Haeufige Probleme</summary>

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

### Ollama Server startet nicht (Linux)

```bash
# Status pruefen
systemctl --user status ollama

# Logs anzeigen
journalctl --user -u ollama -n 50

# Manuell starten
ollama serve

# Port-Check
ss -tlnp | grep 11434
```

### Dependencies fehlen (Linux)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y cmake build-essential git curl

# Fedora
sudo dnf install cmake gcc-c++ git curl

# Arch Linux
sudo pacman -S cmake base-devel git curl
```

</details>

---

<details id="exit-codes">
<summary><b>Exit Codes</b> - Standardisierte Rueckgabewerte</summary>

## Exit Codes

Alle Scripts verwenden standardisierte Exit-Codes fuer CI/CD-Integration:

### Whisper Scripts (setup-whisper*.sh/ps1)

| Code | Bedeutung |
|------|-----------|
| 0 | Erfolg |
| 1 | Fehlende Dependencies |
| 2 | Build fehlgeschlagen |
| 3 | Model-Download fehlgeschlagen |
| 4 | Installation fehlgeschlagen (nur Linux) |
| 5 | Verifikation fehlgeschlagen (nur Linux) |
| 6 | Unzureichende Ressourcen (nur Linux) |

### Ollama Scripts (setup-ollama*.sh/ps1)

| Code | Bedeutung |
|------|-----------|
| 0 | Erfolg |
| 1 | Allgemeiner Fehler |
| 2 | Unzureichender Speicherplatz |
| 3 | Netzwerk-Fehler |
| 4 | Plattform nicht unterstuetzt |

</details>

---

## Weitere Dokumentation

- **[Haupt-README](../README.md)** - Projekt-Übersicht und Schnellstart
- **[Ollama Modelfiles](ollama/README.md)** - Custom Model Konfiguration

