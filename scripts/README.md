---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-01-28
---

# Scripts - Hablará Development Utilities

## TL;DR (20 words)

Development-Scripts für Hablará: setup-whisper.sh (whisper.cpp + Metal), setup-mlx-whisper.sh (MLX), ollama/ Scripts (LLM-Setup), dev.sh (Unified Development).

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: Entwickler, die Hablará-Entwicklungsumgebung einrichten

**Zweck**: Automatisierte Setup-Scripts für AI/ML-Pipeline (whisper.cpp, MLX-Whisper, Ollama) und Development-Workflows (dev.sh).

**Scope**: 5 Kategorien - Whisper-Setup, MLX-Setup, Ollama-Setup, Development-Scripts, Icon-Conversion.

**Key Points**:
- setup-whisper.sh installiert whisper.cpp mit Metal-Acceleration (Default: base model)
- setup-mlx-whisper.sh installiert MLX-Whisper (optional, 3x schneller)
- ollama/ Scripts richten LLM-Provider ein (qwen2.5:7b-custom)
- dev.sh unified Development mit 3 Cleanup-Levels

**Quick Access**:
- [Whisper-Setup](#setup-whispersh)
- [MLX-Whisper-Setup](#setup-mlx-whispersh)
- [Ollama-Scripts](#ollama-scripts)
- [Development-Scripts](#development-scripts)

---

## setup-whisper.sh

Installiert whisper.cpp mit Metal-Acceleration für macOS.

### Verwendung

```bash
# Standard-Installation mit "base" Model (142 MB, gute Balance)
./scripts/setup-whisper.sh

# Mit spezifischem Model
./scripts/setup-whisper.sh small    # 466 MB, bessere Qualitaet
./scripts/setup-whisper.sh tiny     # 75 MB, schnellste Option
./scripts/setup-whisper.sh medium   # 1.5 GB, hohe Qualitaet (empfohlen max. fuer live)
```

### Was das Script macht

1. Installiert cmake falls nicht vorhanden (via Homebrew)
2. Klont whisper.cpp nach `.whisper-build/`
3. Kompiliert mit cmake + Metal-Acceleration (M1/M2/M3/M4)
4. Laedt das gewaehlte Model herunter
5. Kopiert Binary und Model nach `src-tauri/binaries/` und `src-tauri/models/`

### Voraussetzungen

- macOS mit Xcode Command Line Tools
- Homebrew (fuer cmake Installation)
- Git, Curl

### Nach der Installation

Starte die Tauri-App neu:

```bash
npm run tauri dev
```

Die Transkription sollte jetzt funktionieren.

---

<details id="whisper-models">
<summary><b>Verfügbare Whisper Models</b> - Größe, Qualität, Geschwindigkeit (click to expand)</summary>

## Verfügbare Whisper Models

| Model | Groesse | Qualitaet | Geschwindigkeit | Live-Tauglich |
|-------|---------|-----------|-----------------|---------------|
| tiny | 75 MB | Niedrig | Sehr schnell | Ja |
| base | 142 MB | Gut | Schnell | Ja |
| small | 466 MB | Besser | Mittel | Ja |
| medium | 1.5 GB | Hoch | Langsamer | Grenzwertig |

**Hinweis:** Modelle groesser als medium (z.B. large-v3) sind zu gross fuer Live-Transkription und wurden entfernt.

**Empfehlung:**
- **Development:** base (142 MB) - gute Balance
- **Production:** small (466 MB) - bessere Qualität
- **Testing:** tiny (75 MB) - schnellste Tests

</details>

---

<details id="whisper-troubleshooting">
<summary><b>Whisper Troubleshooting</b> - Häufige Probleme und Lösungen (click to expand)</summary>

## Whisper Troubleshooting

**"Whisper binary not found"**
- Fuehre `./scripts/setup-whisper.sh` aus

**"Model not found"**
- Pruefe ob `src-tauri/models/ggml-*.bin` existiert
- Fuehre das Script mit dem gewuenschten Model-Namen aus

**Build schlaegt fehl**
- Stelle sicher dass Xcode Command Line Tools installiert sind: `xcode-select --install`
- Pruefe ob genug Speicherplatz vorhanden ist

**Metal-Acceleration funktioniert nicht**
- Pruefe macOS Version (Metal erfordert macOS 10.13+)
- Stelle sicher dass ein Apple Silicon Mac verwendet wird (M1/M2/M3/M4)

</details>

---

## setup-mlx-whisper.sh

Installiert MLX-Whisper (optional, 3x schneller als whisper.cpp auf Apple Silicon).

### Verwendung

```bash
./scripts/setup-mlx-whisper.sh
```

### Was das Script macht

1. Erstellt Python venv in `.mlx-whisper-venv/`
2. Installiert mlx-whisper + Dependencies
3. Laedt german-turbo Model herunter
4. Erstellt `mlx_transcribe.py` Wrapper-Script

### Voraussetzungen

- macOS mit Apple Silicon (M1/M2/M3/M4)
- Python 3.9+ (via Homebrew empfohlen)
- ~2 GB freier Speicherplatz

### Performance

**Benchmarks (M4 24GB):**
- whisper.cpp (german-turbo): ~1.04s für 5.5s Audio
- MLX-Whisper (german-turbo): ~1.02s für 5.5s Audio

**Siehe:** [docs/reference/benchmarks/WHISPER_BENCHMARKS.md](../docs/reference/benchmarks/WHISPER_BENCHMARKS.md)

---

<details id="ollama-scripts">
<summary><b>Ollama Scripts</b> - LLM-Setup und Model-Management (click to expand)</summary>

## Ollama Scripts

**Location:** `scripts/ollama/`

### create-qwen-custom.sh

Erstellt `qwen2.5:7b-custom` Modelfile mit optimierten Parametern für Hablará.

```bash
./scripts/ollama/create-qwen-custom.sh
```

**Features:**
- Temperature: 0.3 (konsistenter Output)
- Top-P: 0.9 (Fokus auf wahrscheinlichste Tokens)
- System Prompt: JSON-Mode für strukturierte Outputs

### pull-models.sh

Lädt empfohlene Ollama Models herunter.

```bash
./scripts/ollama/pull-models.sh
```

**Models:**
- qwen2.5:7b (~4.7 GB) - Default
- llama3.1:8b (~4.9 GB) - Alternative
- phi4:latest (~7.8 GB) - Premium (höchste Qualität)

**Voraussetzungen:**
- Ollama installiert (`brew install ollama`)
- Ollama Server läuft (`ollama serve`)

</details>

---

<details id="development-scripts">
<summary><b>Development Scripts</b> - dev.sh und Workflow-Automation (click to expand)</summary>

## Development Scripts

### dev.sh - Unified Development Script

Unified Script für sichere Development-Starts mit 3 Cleanup-Levels.

**Location:** `scripts/dev.sh`

**Usage:**
```bash
# EMPFOHLEN: Kill + Clean Next.js (~5s)
npm run dev:safe
# Intern: ./scripts/dev.sh --safe

# + WebView Cache Cleanup (~7s)
npm run dev:clean
# Intern: ./scripts/dev.sh --clean

# Nuclear: + Rust + node_modules (~2-3min)
npm run dev:ultra
# Intern: ./scripts/dev.sh --ultra
```

**Features:**
- Next.js Readiness-Wait (verhindert "Unexpected EOF")
- WebView Cache Cleanup (behebt Stale-Content)
- Rust Clean (bei Dependency-Changes)
- Process Cleanup (kill stuck dev servers)

**Siehe:** [docs/explanation/decisions/ADR-009-tauri-webview-race-condition.md](../docs/explanation/decisions/ADR-009-tauri-webview-race-condition.md)

### next-dev-wait.sh

Wartet auf Next.js Readiness bevor Tauri startet.

**Was es prüft:**
- HTTP 200 auf `localhost:3000`
- `.next/server/app/layout.js` existiert mit Inhalt

**Verwendung:**
```bash
# Automatisch via tauri.conf.json → beforeDevCommand
npm run dev:safe
```

</details>

---

<details id="icon-scripts">
<summary><b>Icon-Conversion Scripts</b> - App-Icon Workflow (click to expand)</summary>

## Icon-Conversion Scripts

### convert_icon.sh

Generiert alle Icon-Größen aus 1024x1024px PNG.

**Location:** `icons/convert_icon.sh`

**Usage:**
```bash
cd icons/
./convert_icon.sh icon.png
```

**Output:**
- 10 PNG-Größen (16px - 1024px)
- icon.icns (macOS Bundle)
- icon.ico (Windows, future)

**Requirements:**
- ImageMagick (via Homebrew)
- libpng (optional, bessere Kompression)

**Siehe:** [docs/how-to/icon/CREATE_MACOS_APP_ICON.md](../docs/how-to/icon/CREATE_MACOS_APP_ICON.md)

</details>

---

## Script-Übersicht

| Script | Zweck | Dauer | Voraussetzungen |
|--------|-------|-------|-----------------|
| **setup-whisper.sh** | whisper.cpp + Metal | ~2-5min | Xcode CLI Tools, Homebrew |
| **setup-mlx-whisper.sh** | MLX-Whisper (optional) | ~3-7min | Python 3.9+, Apple Silicon |
| **ollama/create-qwen-custom.sh** | qwen2.5:7b-custom | ~30s | Ollama installiert |
| **ollama/pull-models.sh** | Ollama Models laden | ~5-15min | Ollama Server läuft |
| **dev.sh --safe** | Dev Start (empfohlen) | ~5s | - |
| **dev.sh --clean** | + WebView Cache | ~7s | - |
| **dev.sh --ultra** | + Rust + node_modules | ~2-3min | - |
| **next-dev-wait.sh** | Next.js Readiness-Wait | Auto | - |
| **icons/convert_icon.sh** | Icon-Größen generieren | ~10s | ImageMagick |

---

## Cross-References

### Setup-Guides
- **[docs/how-to/USER_SETUP_GUIDE.md](../docs/how-to/USER_SETUP_GUIDE.md)** - Vollständiger User-Setup-Flow
- **[docs/how-to/LLM_SETUP.md](../docs/how-to/LLM_SETUP.md)** - Ollama + MLX-LLM Setup
- **[docs/how-to/APP_RESTART.md](../docs/how-to/APP_RESTART.md)** - App-Neustart nach Code-Änderungen

### Benchmarks & Performance
- **[docs/reference/benchmarks/WHISPER_BENCHMARKS.md](../docs/reference/benchmarks/WHISPER_BENCHMARKS.md)** - Whisper Performance-Vergleich
- **[docs/reference/benchmarks/LLM_BENCHMARKS.md](../docs/reference/benchmarks/LLM_BENCHMARKS.md)** - LLM-Provider Benchmarks

### Architecture
- **[docs/explanation/decisions/ADR-009-tauri-webview-race-condition.md](../docs/explanation/decisions/ADR-009-tauri-webview-race-condition.md)** - Warum dev.sh mit Readiness-Wait
- **[docs/explanation/TRANSCRIPTION_ARCHITECTURE.md](../docs/explanation/TRANSCRIPTION_ARCHITECTURE.md)** - Whisper-Integration

### Project Documentation
- **[CLAUDE.md](../CLAUDE.md)** - Projekt-Einstiegspunkt
- **[.claude/context.md](../.claude/context.md)** - Tech-Stack Übersicht

---

**Version**: 1.0.0
**Created**: 28. Januar 2026
**Last Updated**: 28. Januar 2026
**Status**: Production
