# Hablará

> **Finde heraus, was du sagst**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/fidpa/hablara/releases)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos)
[![Stack](https://img.shields.io/badge/stack-Tauri%202.0%20%7C%20Next.js%2014%20%7C%20Rust%201.70+-blue.svg)](https://tauri.app/)

Desktop-App für Selbstreflexion durch Voice-to-Text + psychologisch-informierte AI-Analyse. 100% offline (mit Ollama), Multi-Modal Emotions-Erkennung, DSGVO-konform.

**Hablará** – „Er/sie wird sprechen" (Spanisch, Futur).

Erkennt Emotionen, Argumentationsmuster und Kommunikationsstile im Gesprochenen.

---

## Schnellstart

**Voraussetzungen:** macOS 10.15+ (Apple Silicon)

**Hinweis:** Ohne LLM-Anbieter funktioniert nur die Transkription. Alle psychologischen Features (Emotion, Fallacy, GFK) benötigen Ollama, OpenAI oder Anthropic.

### 3-Schritte Setup

**1. Hablará installieren**
- **Download:** [GitHub Releases](https://github.com/fidpa/hablara/releases) (1.5 GB DMG)
- DMG öffnen → `Hablará.app` in `Programme` ziehen
- Sicherheitseinstellungen: "Trotzdem öffnen" (einmalig)

**2. Ollama Setup (Schnellste Methode: One-liner)**

```bash
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh | bash
```

Skript ist verifizierbar (siehe unten)

**Was macht dieser Befehl?**
1. Installiert Ollama
2. Lädt qwen2.5:7b Modell herunter (~4.7GB)
3. Erstellt optimiertes angepasstes Modell (deutsche Sprachoptimierung)
4. Verifiziert Installation automatisch

<details>
<summary>Skript prüfen</summary>

Skript vor Ausführung inspizieren:

```bash
# Skript herunterladen
curl -fsSL -o setup-ollama-quick.sh \
  https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh

# Skript inspizieren
less setup-ollama-quick.sh

# Ausführen
bash setup-ollama-quick.sh
```

**Optional: Hash-Verification (macOS)**

```bash
shasum -a 256 setup-ollama-quick.sh
# Erwarteter Hash: cd3d8900073b07050f6e53a847750b5e855a96a5e69187d6cba31c03d5869504
```

**Security-Hinweis:** Hash-Verification schützt gegen Download-Korruption, aber NICHT gegen Repository-Kompromittierung (Attacker könnte Skript UND Hash ändern). Für maximale Sicherheit: Skript manuell lesen.

</details>

<details>
<summary>Alternative: Manuelle Ollama-Installation</summary>

**Option A: Ollama.app (GUI, für Nicht-Entwickler)**

1. **Download:** https://ollama.ai/download → "Download for macOS"
2. **Installation:** DMG öffnen → `Ollama.app` nach `/Applications` ziehen
3. **App starten:** Ollama aus Dock/Spotlight starten → Menu-Bar-Icon (🦙) erscheint oben
4. **Modell herunterladen:**
   ```bash
   ollama pull qwen2.5:7b
   ollama create qwen2.5:7b-custom -f \
       /Applications/Hablará.app/Contents/Resources/scripts/ollama/qwen2.5-7b-custom.modelfile
   ```

**Option B: Homebrew (CLI, für Entwickler)**

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

1. **Hablará öffnen** → Einstellungen (Zahnrad-Icon) → LLM Anbieter
2. **Anbieter wählen**: OpenAI oder Anthropic
3. **API Key eingeben**:
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
4. **Kosten**: ~$0.0002-0.0024 pro Aufnahme (je nach Anbieter)

Cloud-LLM erfordert DSGVO-Consent (wird automatisch beim ersten Start abgefragt)

</details>

**3. Erste Aufnahme**
- App öffnen → `Ctrl+Shift+D` drücken
- Mikrofon-Berechtigung erlauben
- Sprechen → Transkript + Analyse erscheint automatisch

---

## Im Vergleich

| Funktion | Hablará | Otter.ai | Fireflies.ai | Whisper (plain) |
|---------|---------|----------|--------------|-----------------|
| **Privacy (Offline)** | Ja (100%) | Nein | Nein | Ja |
| **Emotions-Erkennung** | Ja (12 Features) | Nein | Ja (3-Tier Sentiment)* | Nein |
| **Fehlschluss-Erkennung** | Ja (16 Typen) | Nein | Nein | Nein |
| **Selbstreflexion** | Ja | Nein | Nein | Nein |
| **Psychol. Frameworks** | Ja (7) | Nein | Nein | Nein |
| **Meeting-Features** | Nein | Ja | Ja | Nein |
| **Preis** | Open-Source | $16.99/mo | $10/mo (annual)* | Kostenlos |

\*Fireflies bietet Sentiment-Analyse (positiv/negativ/neutral) ab Business-Plan — keine granulare Emotion-Detection wie Hablará (10 Emotionstypen, Dual-Track Audio+Text).
\*Fireflies Pro: $18/mo (monthly) / $10/mo (annual). Otter.ai Pro: $16.99/mo (monthly) / $8.33/mo (annual).

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hablará Desktop App                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Frontend (Next.js 14 + React 18)                         │  │
│  │  • UI Components (Audio Recorder, Emotion Indicator)      │  │
│  │  • State Management (React Hooks)                         │  │
│  │  • Hotkey Listener (Ctrl+Shift+D)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │ IPC (Tauri Commands)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Rust Backend (Tauri 2.0)                                 │  │
│  │  • Native Audio (cpal @ 16kHz)                            │  │
│  │  • Audio Analysis (12 Features)                           │  │
│  │  • Storage Manager (SQLite Metadata)                      │  │
│  │  • whisper.cpp Integration (Sidecar)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌───────────┐     ┌───────────┐     ┌───────────┐
     │  Ollama   │     │  OpenAI   │     │ Anthropic │
     │  (lokal)  │     │  (Cloud)  │     │  (Cloud)  │
     │  :11434   │     │           │     │           │
     └───────────┘     └───────────┘     └───────────┘
          │
          ▼
     ┌───────────┐
     │whisper.cpp│
     │ (lokal)   │
     └───────────┘
```

### Verarbeitungs-Pipeline

```
Aufnahme → whisper.cpp → LLM-Analyse → Speicherung → UI
  │           │              │             │          │
  ▼           ▼              ▼             ▼          ▼
Hotkey    Transkription   Dual-Track   Auto-Save   Ergebnis
(Ctrl+    (lokal)         Emotion +    (lokal)     anzeigen
Shift+D)                  Fallacy
                          (parallel)
```

### Tech-Stack (3-Tier Architektur)

| Layer | Technologie | Zweck |
|-------|-------------|-------|
| **Frontend** | Next.js 14, React 18, TailwindCSS | UI, State Management |
| **Desktop** | Tauri 2.0, Rust 1.70+ | Native Audio, IPC, Storage |
| **AI/ML** | whisper.cpp (german-turbo), Ollama (qwen2.5:7b) | STT, LLM Enrichment |
| **Embedding** | paraphrase-multilingual-MiniLM-L12-v2 (INT8) | RAG Semantic Search |
| **Security** | tauri-plugin-keyring | API Key Verschlüsselung |

---

## Datenschutzkonzept

**100% lokale Verarbeitung möglich** – Keine Cloud-Pflicht, volle Kontrolle über deine Daten.

```
┌───────────────────────────────────────────────────────────┐
│                   100% Lokale Option                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Audio     │───▶│ whisper.cpp │───▶│   Ollama    │    │
│  │   (cpal)    │    │   (lokal)   │    │   (lokal)   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│        │                                     │            │
│        ▼                                     ▼            │
│  ┌─────────────┐                     ┌─────────────┐      │
│  │  Speicher   │◀────────────────────│  Analyse    │      │
│  │ ~/Hablara/  │                     │  Ergebnis   │      │
│  └─────────────┘                     └─────────────┘      │
│                                                           │
│  Keine Cloud-Übertragung bei lokalem Setup                │
└───────────────────────────────────────────────────────────┘
```

### DSGVO-Compliance

| Aspekt | Details |
|--------|---------|
| **Rechtliche Basis** | DSGVO Art. 6(1)(a) - Einwilligung (NICHT Art. 9 Gesundheitsdaten) |
| **Datenklassifizierung** | Nicht-sensible personenbezogene Daten |
| **Zweckbindung** | Audio ausschließlich für Transkription & Selbstreflexion |
| **Speicherort** | `~/Hablara/recordings/` (lokal, kein Cloud-Sync) |
| **Cloud-Option** | Nur mit expliziter Einwilligung (OpenAI/Anthropic) |
| **Auto-Cleanup** | Konfigurierbar (Standard: 25-500 Aufnahmen) |

### Technische Maßnahmen

| Maßnahme | Implementierung |
|----------|-----------------|
| **API Key Verschlüsselung** | OS-native Keychain (macOS: AES-256-GCM) |
| **Keine Cloud-Pflicht** | Ollama + whisper.cpp vollständig offline |
| **Datenlöschung** | "Alle löschen"-Button, konfigurierbare Aufbewahrung |
| **Open-Source** | Transparenz durch offenen Code |

### Abgrenzung zu Gesundheits-Apps

Hablará ist ein **Selbstreflexions-Tool**, kein medizinisches Produkt:

- **Art. 6 (Einwilligung):** Emotion-Tracking = Self-Awareness, keine klinische Diagnostik
- **NICHT Art. 9 (Gesundheitsdaten):** Kein ICD-10-Bezug, keine Diagnosen
- **Abgrenzung:** Anders als MindDoc (klinisch, Art. 9) oder Daylio (nur Mood-Logging)

**Wichtiger Hinweis:** Bei Verwendung von Cloud-Anbietern (OpenAI, Anthropic) gelten deren Datenschutzbestimmungen.

---

## Funktionen

**Core-Features:**
- **Hotkey-Aktivierung** – Starte die Aufnahme mit Ctrl+Shift+D aus jeder Anwendung
- **Native Audio-Aufnahme** – Professionelle Audioqualität für präzise Transkription (cpal @ 16kHz)
- **Lokale Transkription** – Deine Audio-Daten bleiben auf deinem Gerät (whisper.cpp + MLX-Whisper optional)
- **Echtzeit Audio-Level Meter** – Visuelle Rückmeldung während der Aufnahme (grün/gelb/rot)

**AI-Enrichment (7 psychologisch-fundierte Analysen):**

| Analyse | Framework | Output |
|---------|-----------|--------|
| **Emotionserkennung** | Plutchik, Russell | 10 Emotionstypen, Dual-Track (Audio 40% + Text 60%) |
| **Argumentationsfehler** | CEG-Prompting | 16 Fehlschluss-Typen erkennen |
| **GFK-Analyse** | Rosenberg | Beobachtungen, Gefühle, Bedürfnisse, Bitten |
| **Kognitive Verzerrungen** | Beck (CBT) | 7 Denkmuster + Reframe-Vorschläge |
| **Vier-Seiten-Modell** | Schulz von Thun | Sachinhalt, Selbstoffenbarung, Beziehung, Appell |
| **Tonalität** | Sprechweise-Analyse | Formal/Informal, Assertive/Passive |
| **Topic-Klassifizierung** | 7 Kategorien | Work, Health, Relationships, etc. |

- **RAG-Wissensassistent** – Fragen zur App beantworten (94-95% Accuracy)

<details>
<summary><b>12-Feature Audio Analysis (Dual-Track V2)</b></summary>

**Audio-Track (40% Weight):**

| Kategorie | Features | Differenzierung |
|-----------|----------|-----------------|
| **Legacy (3)** | Pitch, Energy, Speech Rate | Basis-Indikatoren |
| **Prosodic (5)** | Pitch Variance/Range, Energy Variance, Pause Duration/Frequency | Stress vs. Excitement |
| **Spectral (4)** | ZCR, Spectral Centroid/Rolloff/Flux | Aggression vs. Conviction |

**Text-Track (60% Weight):** LLM-Semantik (Ollama/OpenAI/Anthropic)

**Fusion:** Weighted Average + 15% Confidence-Boost bei Übereinstimmung

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

**Wichtig:** Alle Features dienen der **Selbstreflexion**, nicht der klinischen Diagnostik.

</details>

**Technisch:**
- **Flexible LLM-Wahl** – Ollama (lokal/kostenlos), OpenAI, oder Anthropic Claude
- **Persistente Speicherung** – Alle Aufnahmen mit Metadaten automatisch gespeichert
- **Abbrechen & Wiederholen** – Verarbeitung abbrechen mit 1-Klick-Neuversuch (kontextbewusst)
- **Chat-Export** – 5 Formate (Markdown/TXT/PDF/HTML/DOCX) mit Export aller Metadaten
- **PDF Export** – Einzelne Aufnahmen als PDF exportieren (10 Sektionen: Transkript + alle Analysen)
- **Sichere API Key Speicherung** – OS-native Verschlüsselung (Keychain/Credential Manager)
- **Performance-Optimiert** – INT8-Quantization (-75% Model Size), DMG: 1.5 GB, App: 1.9 GB

**Distribution & Deployment:**
- **PKG Installer mit eigene UI** – Logo, README, License, 24 KB Package Size
- **macOS-native Integration** – System Keychain, Code-Signed, Window State Persistence

<details>
<summary><b>Beispiel-Workflow</b> – Demo einer typischen Analyse</summary>

**Beispiel 1:**
```text
"Das Gespräch mit Lisa hat mir gut getan.
Sie hat einen Punkt angesprochen, den ich so nicht gesehen hatte.
Ich werde das morgen anders angehen."
```

| Analyse | Ergebnis |
|---------|----------|
| **Emotion** | Ruhe (78% Confidence) - Stabile Stimmlage, moderate Speech Rate |
| **GFK** | Bedürfnis nach Verständnis und Verbindung erkannt |
| **Selbstreflexion** | Offenheit für neue Perspektiven, konstruktive Haltung |

**Beispiel 2:**
```text
"Nach dem Spaziergang bin ich viel klarer.
Die frische Luft hat geholfen, die Gedanken zu sortieren.
Jetzt weiß ich, wie ich das angehen will."
```

| Analyse | Ergebnis |
|---------|----------|
| **Emotion** | Klarheit/Zuversicht (82% Confidence) - Ruhiger Tonfall |
| **Vier-Seiten** | Selbstoffenbarung: Reflexion über eigene Strategien |
| **Selbstreflexion** | Erkenntnis über wirksame Bewältigungsmethoden |

</details>

### Bekannte Einschränkungen

- **Plattform:** Aktuell nur macOS mit Apple Silicon (Windows/Linux geplant)
- **LLM-Abhängigkeit:** Ohne Ollama/OpenAI/Anthropic nur Basis-Transkription
- **Sprache:** Optimiert für Deutsch (andere Sprachen möglich, aber ungetestet)

**Hinweise:**
- **Verarbeitungsdauer** hängt ab von: Aufnahmelänge, Analyseebenen, Hardware, LLM-Anbieter
- **KI-Ergebnisse** dienen der Selbstreflexion und können fehlerhaft sein
- Kein Ersatz für professionelle psychologische Beratung
- Bei psychischen Belastungen: Telefonseelsorge 0800 111 0 111 (24/7, kostenlos)

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

### Security

**API Key Verschlüsselung** (Details: siehe [Datenschutzkonzept](#datenschutzkonzept)):
- **macOS:** Keychain (AES-256-GCM)
- **Windows:** Credential Manager (DPAPI)
- **Linux:** Secret Service (Platform-dependent)
- Keys nie im Klartext auf Disk

### Technical Excellence

**Performance**:
- **Audio Analysis**: Rust-native, optimiert
- **LLM Enrichment**: Parallel-Processing für minimale Latenz
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
<summary><b>Design-Entscheidungen</b> – Warum Tauri, Native Audio, Ollama?</summary>

*Architektur-Diagramm: Siehe [System-Architektur](#system-architektur) oben.*

#### Architektur

**Warum Tauri 2.0 statt Electron?**
- Kleineres Base-Framework, schnellerer Startup (~200ms vs. ~800ms)
- Native Rust ohne FFI-Overhead, integrierte Security-Sandbox

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
- 100% Privacy, $0 Kosten, schnelle lokale Inferenz

**Warum Ollama als Standard-LLM?**
- Privacy-First, $0, 2-Command Setup, Persistent RAM (kein Cold-Start)

**Warum Qwen 2.5 als Modell?**
- **Mehrsprachig trainiert:** Alibaba's Qwen2.5 wurde auf umfangreichen mehrsprachigen Daten trainiert (inkl. Deutsch)
- **Balanced Size:** 7B Parameter - guter Kompromiss zwischen Qualität und Latenz
- **JSON Compliance:** Zuverlässige strukturierte Outputs für unsere Prompt-Architektur
- **Angepasstes Modelfile:** - reduzierter Context (8K statt 32K) für beschleunigte Inferenz, Temperature 0.3 für konsistente Outputs
- **Praktisch bewährt:** Funktioniert gut für unsere deutschen Analyse-Prompts

**Warum Multi-Anbieter LLM?**
- User-Choice: Privacy (Ollama) vs. Speed (OpenAI) vs. Quality (Anthropic)
- 9 LLM-Methods identisch, kein Vendor Lock-in

**Warum RAG Chatbot (78 Chunks)?**
- LLM-Only halluziniert App-Fakten, RAG: 94-95% Accuracy
- Context-Grounding reduziert Hallucinations signifikant (42-68% reduction, research-backed)

#### Security & Privacy

**Warum OS-Native Keychain statt localStorage?**
- localStorage: XSS-anfällig, Klartext auf Disk
- Keychain: AES-256-GCM (macOS), DPAPI (Windows), Zero Plaintext

**Warum DSGVO Art. 6 statt Art. 9?**
- Art. 9 erfordert DPIA + MDR-Zertifizierung (~50.000 EUR) – unverhältnismäßig für Selbstreflexions-Tool

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
git clone https://github.com/fidpa/hablara.git
cd hablara

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

### 3. Ollama einrichten (Produktions-Standard für LLM)

**Ollama ist der empfohlene LLM-Anbieter** für optimale Performance (persistent server).

**Bereits installiert?** Prüfen mit:
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

**LLM-Anbieter Alternativen:**
- **MLX-LLM** (Optional, Power-User): 3x schneller, manuelles Setup erforderlich
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
<summary><b>LLM-Anbieter</b> – Ollama, OpenAI, Anthropic</summary>

Hablará unterstützt 3 gleichwertige LLM-Anbieter - wähle nach deinen Präferenzen:

| Anbieter | Vorteile | Setup-Aufwand | Kosten | DSGVO | Empfehlung |
|----------|----------|---------------|--------|-------|------------|
| **Ollama** | 100% lokal, keine API-Keys | Niedrig | Kostenlos | Konform | **Standard** |
| **OpenAI** | Schnellste Antworten, GPT-4o | Sehr niedrig | Pay-per-Use | Cloud | Bei Bedarf |
| **Anthropic** | Claude Sonnet, thoughtful | Sehr niedrig | Pay-per-Use | Cloud | Bei Bedarf |

### Wechsel mit einem Klick

```typescript
// Settings → LLM Anbieter → wählen
// KEINE Code-Änderung notwendig
```

### Performance-Vergleich

| Anbieter | Geschwindigkeit | Abhängigkeit |
|----------|-----------------|--------------|
| **Ollama** | Mittel | Hardware |
| **MLX-LLM (optional)** | Schnell | Hardware + MLX-Setup |
| **OpenAI/Anthropic** | Schnell | Netzwerk-Latenz |

</details>

<details>
<summary><b>FAQ</b> – Häufige Fragen</summary>

### Kann ich es ohne Ollama testen?
**Ja**, mit OpenAI/Anthropic API-Key (Cloud-basiert).

### Funktioniert es auf Windows/Linux?
**Noch nicht**. Aktuell nur macOS. Windows/Linux geplant.

### Wie groß ist das Ollama-Model?
**6 GB** (qwen2.5:7b). Leistungsstärkere Alternative: qwen2.5:14b (~9 GB).

### Ist Hablará Production-Ready?
**Ja** – Version 1.0.1 ist bereit für Evaluation. Core-Features vollständig, macOS-optimiert.

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

### Wie kann ich zwischen LLM-Anbietern wechseln?
**Settings → LLM Anbieter** – Ollama/OpenAI/Anthropic mit einem Klick wählbar.

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

Siehe [Cloud-LLM Setup](#schnellstart-macos) → "Alternative: Cloud-LLM" Collapsible.

**App zeigt nur Transcription, keine Emotion/Fallacy**

Kein LLM-Anbieter konfiguriert.

**Lösung:** Siehe "Ollama nicht verfügbar" oben - ohne LLM funktionieren nur Basis-Features (Transcription)

</details>

---

**Autor:** Marc Allgeier | **Version:** 1.0.2 | **Stand:** 2026-02-01
