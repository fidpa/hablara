# Hablará

> **Finde heraus, was du sagst**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/fidpa/hablara/releases)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos)
[![Stack](https://img.shields.io/badge/stack-Tauri%202.0%20%7C%20Next.js%2014%20%7C%20Rust%201.70+-blue.svg)](https://tauri.app/)

Desktop-App für Selbstreflexion durch Voice-to-Text + psychologisch-informierte AI-Analyse. 100% offline (mit Ollama), Multi-Modal Emotions-Erkennung, DSGVO-konform.

**Über Hablará:** "Er/sie wird sprechen" (Spanisch, Futur). Voice Intelligence analysiert und strukturiert das Gesprochene auf mehreren Ebenen.

**3 Alleinstellungsmerkmale**:
1. **Privacy-First**: 100% lokale Verarbeitung (Ollama + whisper.cpp)
2. **Psychologisch fundiert**: 12-Feature Emotions-Erkennung (Dual-Track Audio+Text)
3. **Selbstreflexion**: Coaching-ähnliches Feedback statt nur Transkription

---

## Schnellstart (macOS)

**Voraussetzungen:** macOS 10.15+ (Apple Silicon)

**Hinweis:** Ohne LLM-Provider funktioniert nur die Transkription. Alle psychologischen Features (Emotion, Fallacy, GFK) benötigen Ollama, OpenAI oder Anthropic.

### 3-Schritte Setup

**1. Hablará installieren**
- **Download:** [www.hablara.de](https://www.hablara.de) oder [GitHub Releases](https://github.com/fidpa/hablara/releases) (1.5 GB DMG)
- DMG öffnen → `Hablará.app` in `Programme` ziehen
- Sicherheitseinstellungen: "Trotzdem öffnen" (einmalig)

**2. Ollama Setup (Schnellste Methode: One-liner)**

```bash
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh | bash
```

**Dauer:** ~2-5 Minuten | Script ist [Open-Source](scripts/setup-ollama-quick.sh) und verifizierbar

**Was macht dieser Befehl?**
1. Installiert Ollama
2. Lädt qwen2.5:7b Modell herunter (~4.7GB)
3. Erstellt optimiertes Custom-Modell (deutsche Sprachoptimierung)
4. Verifiziert Installation automatisch

<details>
<summary>Inspect before execute (empfohlen für Security-conscious Users)</summary>

Wenn du das Script vor Ausführung inspizieren möchtest:

```bash
# Script herunterladen
curl -fsSL -o setup-ollama-quick.sh \
  https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh

# Script inspizieren (359 Zeilen)
less setup-ollama-quick.sh

# Ausführen
bash setup-ollama-quick.sh
```

**Optional: Hash-Verification (macOS)**

```bash
shasum -a 256 setup-ollama-quick.sh
# Erwarteter Hash: cd3d8900073b07050f6e53a847750b5e855a96a5e69187d6cba31c03d5869504
```

**Security-Hinweis:** Hash-Verification schützt gegen Download-Korruption, aber NICHT gegen Repository-Kompromittierung (Attacker könnte Script UND Hash ändern). Für maximale Sicherheit: Script manuell lesen.

</details>

<details>
<summary>Alternative: Manuelle Ollama-Installation</summary>

**Option A: Ollama.app (GUI, Empfohlen für Nicht-Developer)**

1. **Download:** https://ollama.ai/download → "Download for macOS"
2. **Installation:** DMG öffnen → `Ollama.app` nach `/Applications` ziehen
3. **App starten:** Ollama aus Dock/Spotlight starten → Menu-Bar-Icon (🦙) erscheint oben
4. **Modell herunterladen:**
   ```bash
   ollama pull qwen2.5:7b
   ollama create qwen2.5:7b-custom -f \
       /Applications/Hablará.app/Contents/Resources/scripts/ollama/qwen2.5-7b-custom.modelfile
   ```

**Option B: Homebrew (CLI, für Developer)**

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:7b
ollama create qwen2.5:7b-custom -f \
    /Applications/Hablará.app/Contents/Resources/scripts/ollama/qwen2.5-7b-custom.modelfile
```

**Verifizierung (beide Methoden):**

```bash
curl http://localhost:11434/api/version
# Sollte JSON mit Version zurückgeben
```

</details>

<details>
<summary>Alternative: Cloud-LLM (OpenAI/Anthropic)</summary>

Wenn Ollama-Installation nicht möglich ist oder Probleme bereitet:

1. **Hablará öffnen** → Settings (Zahnrad-Icon) → LLM Provider
2. **Provider wählen**: OpenAI oder Anthropic
3. **API Key eingeben**:
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
4. **Kosten**: ~$0.0002-0.0024 pro Aufnahme (je nach Provider)

Cloud-LLM erfordert DSGVO-Consent (wird automatisch beim ersten Start abgefragt)

**Details:** [docs/how-to/setup/USE_CLOUD_LLM.md](docs/how-to/setup/USE_CLOUD_LLM.md)

</details>

**3. Erste Aufnahme**
- App öffnen → `Ctrl+Shift+D` drücken
- Mikrofon-Berechtigung erlauben (einmalig)
- Sprechen → Transkript + Analyse nach ~5-10s

---

## Im Vergleich

| Feature | Hablará | Otter.ai | Fireflies.ai | Whisper (plain) |
|---------|---------|----------|--------------|-----------------|
| **Privacy (Offline)** | Ja (100%) | Nein | Nein | Ja |
| **Emotions-Erkennung** | Ja (12 Features) | Nein | Nein | Nein |
| **Fehlschluss-Erkennung** | Ja (16 Typen) | Nein | Nein | Nein |
| **Selbstreflexion** | Ja | Nein | Nein | Nein |
| **Psychol. Frameworks** | Ja (7) | Nein | Nein | Nein |
| **Meeting-Features** | Nein | Ja | Ja | Nein |
| **Preis** | Open-Source | $16.99/mo | $10/mo | Kostenlos |

---

## Psychologische Intelligenz

Hablará analysiert deine Sprache auf **7 psychologisch-fundierten Ebenen**:

| Analyse | Framework | Beschreibung |
|---------|-----------|--------------|
| **Emotionserkennung** | Plutchik, Russell | 10 Emotionstypen, Dual-Track (Audio 40% + Text 60%) |
| **Argumentationsfehler** | CEG-Prompting | 16 Fehlschluss-Typen (Tier 1+2) |
| **GFK-Analyse** | Rosenberg (1960s) | Beobachtungen, Gefühle, Bedürfnisse, Bitten |
| **Kognitive Verzerrungen** | Beck (CBT, 1960s) | 7 Denkmuster + Reframe-Vorschläge |
| **Vier-Seiten-Modell** | Schulz von Thun (1981) | Sachinhalt, Selbstoffenbarung, Beziehung, Appell |
| **Tonalität** | Sprechweise-Analyse | Formal/Informal, Assertive/Passive, Optimistic/Pessimistic |
| **Topic-Klassifizierung** | 7 Kategorien | Work, Health, Relationships, Finances, Development, Hobbies, Other |

<details>
<summary><b>12-Feature Audio Analysis (Dual-Track V2)</b></summary>

**Audio-Track (40% Weight, ~12ms Latenz):**

| Kategorie | Features | Differenzierung |
|-----------|----------|-----------------|
| **Legacy (3)** | Pitch, Energy, Speech Rate | Basis-Indikatoren |
| **Prosodic (5)** | Pitch Variance/Range, Energy Variance, Pause Duration/Frequency | Stress vs. Excitement |
| **Spectral (4)** | ZCR, Spectral Centroid/Rolloff/Flux | Aggression vs. Conviction |

**Text-Track (60% Weight):** LLM-Semantik (Ollama/OpenAI/Anthropic)

**Fusion:** Weighted Average + 15% Confidence-Boost bei Übereinstimmung

**Ziel-Genauigkeit:** 85-90% (Multi-Modal Fusion Research, Poria et al. 2017)

</details>

<details>
<summary><b>Psychologische Frameworks im Detail</b></summary>

**GFK (Gewaltfreie Kommunikation - Marshall Rosenberg):**
- 6 Sections: Beobachtungen, Gefühle, Bedürfnisse, Bitten, GFK-Übersetzung, Reflexionsfrage
- Ziel: Kommunikations-Awareness, Bedürfnis-Erkennung

**Kognitive Verzerrungen (CBT - Aaron Beck):**
- 7 Typen: Catastrophizing, All-or-Nothing, Overgeneralization, Mind-Reading, Personalization, Emotional Reasoning, Should Statements
- Output: Thinking Style Badge (Ausgewogen/Leicht verzerrt/Stark verzerrt) + Reframe-Vorschläge

**Vier-Seiten-Modell (Schulz von Thun):**
- 4 Quadranten: Sachinhalt (blau), Selbstoffenbarung (lila), Beziehung (pink), Appell (orange)
- Output: Potenzielle Missverständnisse + Kommunikations-Tipps

**Wichtig:** Alle Features dienen der **Selbstreflexion**, nicht der klinischen Diagnostik. Hablará ist kein medizinisches Produkt.

</details>

**Hinweis zur KI-Analyse:**
- Ergebnisse dienen der Selbstreflexion und können fehlerhaft sein
- Kein Ersatz für professionelle psychologische Beratung
- Bei psychischen Belastungen: Telefonseelsorge 0800 111 0 111 (24/7, kostenlos)

---

## Funktionen

**Core-Features:**
- **Hotkey-Aktivierung** – Starte Recording mit Ctrl+Shift+D aus jeder Anwendung
- **Native Audio-Aufnahme** – Professionelle Audioqualität für präzise Transkription (cpal @ 16kHz)
- **Lokale Speech-to-Text** – Deine Audio-Daten bleiben auf deinem Gerät (whisper.cpp + MLX-Whisper optional)
- **Echtzeit Audio-Level Meter** – Visuelle Rückmeldung während der Aufnahme (grün/gelb/rot)

**AI-Enrichment:**
- **7 Psychologische Analysen** – Siehe [Psychologische Intelligenz](#psychologische-intelligenz)
- **RAG-Wissensassistent** – Fragen zur App beantworten (94-95% Accuracy)

**Technisch:**
- **Flexible LLM-Wahl** – Ollama (lokal/kostenlos), OpenAI, oder Anthropic Claude
- **Persistente Speicherung** – Alle Aufnahmen mit Metadaten automatisch gespeichert
- **Intelligenter Cancel & Retry** – Verarbeitung abbrechen mit 1-Klick-Neuversuch (kontextbewusst)
- **Chat-Export** – 5 Formate (Markdown/TXT/PDF/HTML/DOCX) mit Full Metadata Export
- **Recording PDF Export** – Einzelne Aufnahmen als PDF exportieren (10 Sektionen: Transkript + alle Analysen)
- **Privacy-First** – 100% lokale Verarbeitung möglich, keine Cloud-Pflicht
- **Sichere API Key Speicherung** – OS-native Verschlüsselung (Keychain/Credential Manager)
- **Performance-Optimiert** – INT8-Quantization (-75% Model Size), DMG: 1.5 GB, App: 1.9 GB

**Distribution & Deployment:**
- **PKG Installer mit Custom UI** – Logo, README, License, 24 KB Package Size
- **macOS-native Integration** – System Keychain, Code-Signed, Window State Persistence

<details>
<summary><b>Beispiel-Workflow</b> – Demo einer typischen Analyse</summary>

**Demo-Aufnahme** (15 Sekunden):
```text
"Ich bin gestresst wegen der Deadline. Aber das ist kein Problem,
denn wir schaffen das schon. Oder etwa nicht? Alle anderen
haben es auch geschafft, also werden wir das auch hinbekommen."
```

**Analyse-Ergebnisse:**

| Analyse | Ergebnis |
|---------|----------|
| **Emotion** | Stress (85% Confidence) - Pitch Variance ↑, Speech Rate 1.15x |
| **Fallacy** | Bandwagon ("Alle anderen haben es auch geschafft...") |
| **Selbstreflexion** | "Was genau belastet dich an der Deadline? Kannst du das Problem in kleinere Schritte aufteilen?" |

</details>

---

<details>
<summary><b>Technical Highlights</b> – AI-Innovation, DSGVO, Performance</summary>

### AI-Innovation

**Dual-Track Emotions-Erkennung**:
- **Audio-Track (40%)**: 12 Features (Prosodic + Spectral)
  - 3 Legacy: Pitch, Energy, Speech Rate
  - 5 Prosodic: Pitch Variance/Range, Energy Variance, Pause Duration/Frequency
  - 4 Spectral: ZCR, Spectral Centroid/Rolloff/Flux
- **Text-Track (60%)**: LLM-Semantik (Ollama/OpenAI/Anthropic)
- **Fusion**: Weighted Average + 15% Confidence-Boost bei Übereinstimmung

**Methodik**: Dual-Track Fusion (Audio 40% + Text 60%, Poria et al. 2017) mit Confidence-Boosting

**Differenzierung**:
- Stress vs. Excitement: Pitch Variance (unsteady vs. steady)
- Aggression vs. Conviction: Spectral Flux (abrupt vs. smooth)

**Research-Fundierung**: Plutchik (1980), Russell (1980), PAD Model, IEMOCAP Dataset

**Dokumentation:** [MULTI_MODAL_ANALYSIS.md](docs/reference/enrichment/MULTI_MODAL_ANALYSIS.md), [IMPLEMENT_AUDIO_FEATURES.md](docs/how-to/features/IMPLEMENT_AUDIO_FEATURES.md), [MULTI_MODAL_RESEARCH.md](docs/explanation/research/MULTI_MODAL_RESEARCH.md)

### Privacy & DSGVO

**DSGVO Art. 6 (Einwilligung), NICHT Art. 9 (Gesundheitsdaten)**:
- Emotion-Tracking = Self-Awareness, nicht klinische Diagnostik
- Fehlschluss-Erkennung = Kognitions-Awareness, kein ICD-10-Bezug
- 100% lokale Verarbeitung mit Ollama (offline) + whisper.cpp

**Abgrenzung zu Mood-Apps**:
- Daylio (lokal, aber nur Mood-Logging)
- MindDoc (klinisch, Art. 9 Gesundheitsdaten)
- Hablará: Selbstreflexion ohne klinischen Kontext

**API Key Security**:
- **macOS:** Keychain (AES-256-GCM)
- **Windows:** Credential Manager (DPAPI)
- **Linux:** Secret Service (Platform-dependent)
- Keys nie im Klartext auf Disk

### Technical Excellence

**Performance**:
- **Audio Analysis**: ~12ms für 10s Recording (Audio V2)
- **LLM Enrichment**: 6.5s total (Emotion 2.2s + Fallacy 4.3s, Ollama qwen2.5:7b-custom)
- **MLX-LLM (optional)**: 2.25s total (3x schneller)
- **Bundle Size**: Optimiert via INT8 ONNX Quantization (113 MB Model statt 449 MB, 100% Privacy-First)

**Robustheit**:
- **105 Rust Unit Tests**: text.rs (17), emotion_v2.rs (7), tone.rs (6), audio.rs (5), spectral.rs (5), prosodic.rs (5), storage.rs (4), emotion.rs (3), + weitere Module
- **spawn_blocking Pattern**: Non-blocking I/O für Storage (verhindert 500-Errors)
- **Memory Leak Prevention**: Named EventListeners + Cleanup (AudioPlayer gefixt)
- **ML Engineering**: Self-quantized ONNX model (FP32→INT8, 75% Reduktion, <2% Accuracy-Loss)
- **Safety Guardrails**: 7-Pattern LLM Output Filter (Defense-in-Depth) verhindert klinische Aussagen (ICD-10, Dosierungen). Keine Diagnosen, Arztvorbehalt gewahrt

**Code-Qualität**:
- TypeScript strict mode, Rust mit serde
- <400 Zeilen pro Datei (SOLID, SRP)
- Immutability-Patterns (kein `obj.prop = value`)

### Tastenkürzel & Accessibility

- `Ctrl+Shift+D` – Aufnahme starten/stoppen (global)
- `Tab` / `Shift+Tab` – Navigation
- `Ctrl+Enter` – Text absenden
- WCAG 2.1 AA konform, Screen-Reader-kompatibel

</details>

<details>
<summary><b>Architecture</b> – Tauri Desktop App, Native Audio, LLM Pipeline</summary>

```text
┌─────────────────────────────────────────────────────────┐
│  Tauri Desktop App                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (Static Export)               │   │
│  │  - Audio Recording (Native cpal via Tauri IPC)  │   │
│  │  - Web Audio API (Development Fallback)         │   │
│  │  - UI/Visualisierung                            │   │
│  │  - Hotkey-Listener                              │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tauri Rust Backend                             │   │
│  │  - whisper.cpp Integration (Sidecar)            │   │
│  │  - Audio-Processing (12 Features)               │   │
│  │  - Global Shortcuts                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   Ollama    │ │  OpenAI API │ │ Anthropic   │
   │   (lokal)   │ │   (Cloud)   │ │   (Cloud)   │
   │   :11434    │ │             │ │             │
   └─────────────┘ └─────────────┘ └─────────────┘
        Alle LLM-Provider sind gleichwertig wählbar
```

### Design-Entscheidungen

#### Architektur

**Warum Tauri 2.0 statt Electron?**
- Kleineres Base-Framework, schnellerer Startup (~200ms vs. ~800ms)
- Native Rust ohne FFI-Overhead, Security-Sandbox by Default

**Warum Native Audio (cpal) statt Web Audio API?**
- Browser ignoriert 16kHz Request (liefert 48kHz). VAD: 0% vs. >90% mit cpal
- FFT-Resampling (rubato) garantiert Whisper-kompatible Sample-Rate

#### AI/ML Pipeline

**Warum Dual-Track Emotion (Audio 40% + Text 60%)?**
- Single-Track limitiert (nur Audio ODER Text), Dual-Track Fusion deutlich robuster
- Audio erkennt Sarkasmus (Prosody), Text erkennt Semantik

**Warum 12 Audio Features statt 3?**
- V1 (3 Legacy Features) vs. V2 (+9 Prosodic/Spectral). Signifikante Verbesserung
- Differenziert: Stress/Excitement (Pitch Variance), Aggression/Conviction (Spectral Flux)

**Warum whisper.cpp (lokal) statt Cloud-STT?**
- 100% Privacy, $0 Kosten, M4 Pro: RTF ~0.2 (1.04s für 5.5s Audio)

**Warum Ollama als Default-LLM?**
- Privacy-First, $0, 2-Command Setup, Persistent RAM (2-4s/call, kein Cold-Start)

**Warum Qwen 2.5 als Modell?**
- **Mehrsprachig trainiert:** Alibaba's Qwen2.5 wurde auf umfangreichen mehrsprachigen Daten trainiert (inkl. Deutsch)
- **Balanced Size:** 7B Parameter - guter Kompromiss zwischen Qualität und Latenz
- **JSON Compliance:** Zuverlässige strukturierte Outputs für unsere Prompt-Architektur
- **Custom-optimiert:** Angepasstes Modelfile - reduzierter Context (8K statt 32K) für beschleunigte Inferenz, Temperature 0.3 für konsistente Outputs
- **Praktisch bewährt:** Funktioniert gut für unsere deutschen Analyse-Prompts

**Warum Multi-Provider LLM?**
- User-Choice: Privacy (Ollama) vs. Speed (OpenAI, 0.5-2s) vs. Quality (Anthropic)
- 9 LLM-Methods identisch, kein Vendor Lock-in

**Warum RAG Chatbot (78 Chunks)?**
- LLM-Only halluziniert App-Fakten, RAG: 94-95% Accuracy
- Context-Grounding reduziert Hallucinations signifikant (42-68% reduction, research-backed)

#### Security & Privacy

**Warum OS-Native Keychain statt localStorage?**
- localStorage: XSS-anfällig, Klartext auf Disk
- Keychain: AES-256-GCM (macOS), DPAPI (Windows), Zero Plaintext

**Warum DSGVO Art. 6 statt Art. 9?**
- Selbstreflexion (Art. 6: Einwilligung) - keine klinische Diagnostik
- Art. 9 (Gesundheitsdaten) erfordert DPIA + MDR-Zertifizierung (50.000+ EUR)

</details>

<details>
<summary><b>Developer Setup</b> – Voraussetzungen, Installation, Build</summary>

### Voraussetzungen

- **Node.js** >= 18
- **Rust** >= 1.70
- **pnpm** (oder npm)
- **Ollama** (optional, für lokales LLM)
- **Git LFS** (erforderlich für ONNX-Modelle)

### 0. Repository clonen mit Git LFS

**Wichtig:** Hablará nutzt Git LFS für große ONNX-Modelle (113 MB, erforderlich für RAG-Feature).

```bash
# Git LFS installieren (einmalig)
brew install git-lfs
git lfs install

# Repository clonen (LFS-Dateien werden automatisch heruntergeladen)
git clone https://github.com/fidpa/challenge.git
cd challenge

# Verifizieren: ONNX-Modell sollte ~112 MB groß sein
ls -lh public/models/onnx-models/paraphrase-multilingual-MiniLM-L12-v2-onnx/onnx/model_quantized.onnx
# Erwartete Ausgabe: -rw-r--r--  1 user  staff  112M  model_quantized.onnx
```

**Ohne Git LFS:** RAG-Feature (Chatbot) funktioniert nicht (kein Embedding-Modell verfügbar).

**Troubleshooting:** Falls das Modell nur wenige KB groß ist (LFS-Pointer statt Binärdatei):
```bash
git lfs pull  # LFS-Dateien manuell herunterladen
```

### 1. Dependencies installieren

```bash
pnpm install
```

### 2. Whisper Model herunterladen (optional)

```bash
# Erstelle Verzeichnisse
mkdir -p src-tauri/binaries src-tauri/models

# whisper.cpp binary kompilieren (oder herunterladen)
# Siehe: https://github.com/ggerganov/whisper.cpp

# Model herunterladen (german-turbo empfohlen)
curl -L -o src-tauri/models/ggml-german-turbo.bin \
  https://huggingface.co/cstr/whisper-large-v3-turbo-german-ggml/resolve/main/ggml-german-turbo.bin
```

### 3. Ollama einrichten (Production Default für LLM)

**Ollama ist der empfohlene LLM-Provider** für optimale Performance (persistent server, 2-4s pro Call).

**Quick Check:** Ollama bereits installiert?
```bash
ollama --version  # Falls installiert: Springe zu Schritt 2
```

**Schritt 1: Ollama installieren**

**Option A: Homebrew (Empfohlen für Entwickler)**
```bash
brew install ollama
```

**Option B: Direkter Download** (falls kein Homebrew):
- Besuche [Ollama.ai](https://ollama.ai) → Download for macOS → DMG installieren

**Schritt 2: Hablará-Modell einrichten**
```bash
ollama pull qwen2.5:7b                    # 4.7 GB, einmalig
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile  # Hablará-optimiert
```

**LLM-Provider Alternativen:**
- **MLX-LLM** (Optional, Power-User): 3x schneller, manuelle Setup erforderlich
- **OpenAI/Anthropic API**: API Key in Settings konfigurieren

### 4. Development starten

```bash
# Development-Server (Frontend-only, Web Audio Fallback)
pnpm dev

# Desktop-App (EMPFOHLEN - Native Audio, volle Features)
# BEST PRACTICE: Readiness-Wait verhindert "Unexpected EOF" Errors
pnpm run dev:safe

# Alternative: + WebView Cache Cleanup
pnpm run dev:clean

# Full Rebuild: + Rust + node_modules
pnpm run dev:ultra
```

**Hinweis:** `dev:safe` ist empfohlen, da es Race Conditions beim WebView-Start vermeidet.

### Build

```bash
# macOS App Bundle erstellen
pnpm tauri build
```

Die App wird unter `src-tauri/target/release/bundle/` erstellt.

</details>

<details>
<summary><b>Privacy & DSGVO</b> – 100% lokale Verarbeitung möglich</summary>

Hablará wurde mit Privacy-First-Ansatz entwickelt:

- **100% lokale Verarbeitung möglich** (Ollama + whisper.cpp)
- **Keine Cloud-Übertragung** von Audio-Daten (bei lokalem Setup)
- **Volle Kontrolle** über gespeicherte Aufnahmen
- **Einfache Löschung** aller Daten (Clear All Button)
- **Open-Source** – Transparenz durch offenen Code

**Wichtiger Hinweis:** Bei Verwendung von Cloud-Providern (OpenAI, Anthropic) gelten deren Datenschutzbestimmungen. Für 100% DSGVO-Konformität empfehlen wir die lokale Konfiguration (Ollama + whisper.cpp).

### DSGVO Compliance Details

| Aspekt | Details |
|--------|---------|
| **Rechtliche Basis** | DSGVO Art. 6(1)(a) - Einwilligung (NICHT Art. 9 Gesundheitsdaten) |
| **Datenklassifizierung** | Nicht-sensible personenbezogene Daten |
| **Zweckbindung** | Audio ausschließlich für Transkription & Selbstreflexion |
| **Speicherort** | `~/Hablara/recordings/` (lokal, kein Cloud-Sync) |
| **Auto-Cleanup** | Konfigurierbar (Standard: 25-500 Aufnahmen) |

</details>

<details>
<summary><b>LLM-Provider</b> – Ollama, OpenAI, Anthropic</summary>

Hablará unterstützt 3 gleichwertige LLM-Provider - wähle nach deinen Präferenzen:

| Provider | Vorteile | Setup-Aufwand | Kosten | DSGVO | Empfehlung |
|----------|----------|---------------|--------|-------|------------|
| **Ollama** | 100% lokal, keine API-Keys | Niedrig (15min) | Kostenlos | Konform | **Standard** |
| **OpenAI** | Schnellste Antworten, GPT-4o | Sehr niedrig (2min) | Pay-per-Use | Cloud | Bei Bedarf |
| **Anthropic** | Claude Sonnet, thoughtful | Sehr niedrig (2min) | Pay-per-Use | Cloud | Bei Bedarf |

### Wechsel mit einem Klick

```typescript
// Settings → LLM Provider → wählen
// KEINE Code-Änderung notwendig
```

### Performance-Vergleich

| Provider | Emotions-Analyse | Fehlschluss-Erkennung | Total |
|----------|------------------|-------------------|-------|
| **Ollama (qwen2.5:7b-custom)** | ~2.2s | ~4.3s | **6.5s** |
| **MLX (optional, 3x schneller)** | ~0.75s | ~1.5s | **2.25s** |
| **OpenAI/Anthropic** | ~1-2s (netzwerkabhängig) | ~1-2s | **~2-4s** |

</details>

<details>
<summary><b>FAQ</b> – Häufige Fragen</summary>

### Wie lange dauert ein Setup?
**15 Minuten** (Ollama-Installation 10 Min + App-Start 5 Min)

### Kann ich es ohne Ollama testen?
**Ja**, mit OpenAI/Anthropic API-Key (Cloud-basiert). Setup: 2 Minuten.

### Funktioniert es auf Windows/Linux?
**Noch nicht**. Aktuell nur macOS. Windows/Linux geplant (Post-Challenge).

### Wie groß ist das Ollama-Model?
**6 GB** (qwen2.5:7b). Kleinere Alternative: qwen2.5:3b (2 GB).

### Ist Hablará Production-Ready?
**Ja** – Version 1.0.0 ist bereit für Evaluation. Core-Features vollständig, macOS-optimiert.

### Wo speichert Hablará Daten?
**Lokal**: `~/Hablara/recordings/` (keine Cloud-Sync)

### Kann ich alte Aufnahmen ansehen?
**Ja** – Folder-Icon in der Kopfzeile → RecordingsLibrary Drawer öffnet sich. Du kannst Aufnahmen abspielen, als WAV exportieren oder löschen.

### Kann ich den Chat-Verlauf exportieren?
**Ja** – 5 Export-Formate verfügbar:
- **Markdown (.md)** – YAML Frontmatter + Full Metadata (GFK, Cognitive, FourSides)
- **Plain Text (.txt)** – ASCII Art Separators, simplified Metadata
- **PDF** – Via jsPDF, Print-optimized Styling
- **HTML** – Fallback für Popup-Blocker
- **Word (.docx)** – Rich Formatting mit Farben, professionelle Dokumente

**Export-Button** in der Chat-Ansicht (neben RAG-Chatbot). Alle Metadaten (Emotion, Fallacies, Audio Features) werden inkludiert, wenn aktiviert.

### Wie kann ich zwischen LLM-Providern wechseln?
**Settings → LLM Provider** – Ollama/OpenAI/Anthropic mit einem Klick wählbar.

---

### Fehlerbehebung

**"Ollama nicht verfügbar" Fehler**

**Symptom:** App zeigt Fehler beim ersten Start oder während der Aufnahme

**Lösung:**
```bash
# 1. Prüfen ob Ollama installiert ist
which ollama
# Sollte ausgeben: /opt/homebrew/bin/ollama

# 2. Ollama.app starten
open -a Ollama
# Menu-Bar-Icon (🦙) sollte erscheinen

# 3. Modell prüfen
ollama list
# Sollte qwen2.5:7b anzeigen

# 4. Falls Modell fehlt
ollama pull qwen2.5:7b
```

**Ollama läuft, aber Hablará findet es nicht**

Prüfen Sie, ob Ollama auf Port 11434 läuft:
```bash
curl http://localhost:11434/api/version
# Sollte JSON mit Version zurückgeben
```

Falls der Port blockiert ist, App neu starten:
```bash
# App beenden und neu starten
killall Ollama
open -a Ollama
```

**Alternative für CLI-User (Homebrew):**
```bash
# Falls du Ollama via brew installiert hast
brew services restart ollama
```

**Alternative: Cloud-LLM verwenden**

Wenn Ollama-Installation nicht möglich ist oder Probleme bereitet:

1. **Hablará öffnen** → Settings (Zahnrad-Icon) → LLM Provider
2. **Provider wählen**: OpenAI oder Anthropic
3. **API Key eingeben**:
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
4. **Kosten**: ~$0.0002-0.0024 pro Aufnahme (je nach Provider)

Cloud-LLM erfordert DSGVO-Consent (wird automatisch beim ersten Start abgefragt)

**App zeigt nur Transcription, keine Emotion/Fallacy**

Kein LLM-Provider konfiguriert.

**Lösung:** Siehe "Ollama nicht verfügbar" oben - ohne LLM funktionieren nur Basis-Features (Transcription)

**Mehr Hilfe:** [docs/how-to/setup/USER_SETUP_GUIDE.md](docs/how-to/setup/USER_SETUP_GUIDE.md)

</details>

---

**Autor:** Marc Allgeier | **Version:** 1.0.0 | **Stand:** 2026-02-01
