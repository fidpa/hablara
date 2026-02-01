---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-01-28
scope: Ollama custom model configuration for Hablará LLM inference
---

# Ollama Custom Models für Hablará

## TL;DR (20 words)

Drei optimierte Qwen 2.5 Modelle (7B/14B/32B) mit Hablará-spezifischen Parametern für Emotion Analysis und Fallacy Detection.

---

## Essential Context

> **DIATAXIS Category:** Reference (Information-Oriented)
> **Audience:** Hablará-Entwickler und Power-User, die Ollama-Modelle optimieren wollen

**Zweck:** Dokumentiert die drei Custom Ollama Models (7B/14B/32B) mit Hablará-spezifischen Optimierungen (8K Context, Temperature 0.3, System Prompt).

**Scope:** Model-Konfiguration, Setup-Anleitung, Performance-Benchmarks, Troubleshooting für lokale LLM-Inferenz.

**Key Points:**
- qwen2.5:7b-custom ist Default (beste Balance Speed/Quality)
- 8K Context Window spart 40% RAM vs. 128K Default
- 92-94% JSON Validity durch deterministische Parameter

**Quick Access:**
- [Setup](#setup) - 3 Schritte zum Custom Model
- [Performance-Vergleich](#performance-vergleich) - M4 Pro Benchmarks
- [Troubleshooting](#troubleshooting) - Häufige Probleme

---

## Verfügbare Modelle

| Modell | MMLU | JSON Reliability | Emotion (M4 Pro) | Fallacy (M4 Pro) | RAM | Empfehlung |
|--------|------|------------------|------------------|------------------|-----|------------|
| **7B** | 74.8% | 92% | ~2.2s | ~4.3s | ~7 GB | **Default** - Beste Balance |
| **14B** | 78.0% | 93% | ~2.8s | ~5.5s | ~9 GB | Höhere Präzision |
| **32B** | 83.1% | 94% | ~3.5s | ~7.0s | ~20 GB | Maximale Qualität |

**Empfehlung:** `qwen2.5:7b-custom` als Default (aktuell in `.claude/context.md` konfiguriert).

---

## Setup

### 1. Base Model herunterladen
```bash
# Für 7B (empfohlen)
ollama pull qwen2.5:7b

# Für 14B
ollama pull qwen2.5:14b

# Für 32B
ollama pull qwen2.5:32b
```

### 2. Custom Model erstellen
```bash
# Aus Repo-Root (oder scripts/ollama/)
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile

# Für andere Varianten
ollama create qwen2.5:14b-custom -f scripts/ollama/qwen2.5-14b-custom.modelfile
ollama create qwen2.5:32b-custom -f scripts/ollama/qwen2.5-32b-custom.modelfile
```

### 3. Modell in Hablará konfigurieren
```typescript
// In App Settings UI:
// Provider: Ollama
// Model: qwen2.5:7b-custom

// Oder via Browser DevTools:
localStorage.setItem('llm-config', JSON.stringify({
  provider: 'ollama',
  model: 'qwen2.5:7b-custom',
  baseUrl: 'http://localhost:11434'
}));
```

---

## Verwendung

### Testen im Terminal
```bash
# Modell-Verfügbarkeit prüfen
ollama list | grep qwen2.5

# Interaktiver Test
ollama run qwen2.5:7b-custom

# Beispiel-Prompt
> Analysiere die Emotion in diesem Text: "Ich bin so frustriert, nichts klappt heute!"
```

### In Hablará
Nach Setup wird das Custom Model automatisch von `OllamaClient` verwendet:
- **Emotion Analysis** (`src/lib/llm/ollama-client.ts`)
- **Fallacy Detection** (`src/lib/llm/ollama-client.ts`)
- **Topic Classification** (`src/lib/llm/ollama-client.ts`)

---

## Wann welches Modell?

| Use Case | Empfehlung | Begründung |
|----------|------------|------------|
| **Development** | 7B | Schnelle Iteration, geringer RAM |
| **Production (Standard)** | 7B | Beste Speed/Quality Balance |
| **Production (High Quality)** | 14B | +3% Accuracy, akzeptable Latenz |
| **Research/Benchmarking** | 32B | Maximale Qualität, hoher RAM |
| **Batch-Processing** | 7B | Parallele Verarbeitung möglich |

---

<details id="optimierungen">
<summary><b>Optimierungen</b> - Hablará-spezifische Model-Konfiguration (click to expand)</summary>

## Optimierungen

Alle Custom Models nutzen Hablará-spezifische Optimierungen:

### 1. Context Window Reduzierung
```
num_ctx 8192  (statt 128K default)
```
- **Warum:** Hablará nutzt max. 650 tokens pro Prompt
- **Vorteil:** 8K Context = 6.8 GB RAM (statt 12.5 GB bei 128K) → +15% Geschwindigkeit

### 2. Deterministische Parameter
```
temperature 0.3   (niedrig für konsistente JSON)
top_p 0.9         (Nucleus Sampling)
repeat_penalty 1.1 (verhindert Halluzination-Loops)
```
- **Warum:** Strukturierte JSON-Outputs (EmotionState, FallacyDetection) erfordern Determinismus
- **Vorteil:** 92-94% JSON Validity (vs. ~85% bei höherer Temperature)

### 3. Hablará System Prompt
```
SYSTEM """Du bist ein KI-Assistent für emotionale und argumentative Textanalyse.

Deine Aufgaben:
1. Emotion Analysis: Erkenne die primäre Emotion in gesprochenen Texten (Deutsch)
2. Fallacy Detection: Identifiziere logische Fehlschlüsse in Argumenten
3. JSON Output: Antworte IMMER in gültigem JSON-Format
...
"""
```
- **Warum:** Pre-primes das Modell für Hablará-Domain
- **Vorteil:** Bessere First-Token Latenz, konsistentere Outputs

</details>

---

<details id="performance-vergleich">
<summary><b>Performance-Vergleich</b> - M4 Pro Benchmarks (click to expand)</summary>

## Performance-Vergleich

### M4 Pro (14 Cores, 64 GB RAM)

**Emotion Analysis (Single Call):**
```
7B:  2.2s (SCHNELLSTE)
14B: 2.8s (+27%)
32B: 3.5s (+59%)
```

**Fallacy Detection (Längere Prompts):**
```
7B:  4.3s (SCHNELLSTE)
14B: 5.5s (+28%)
32B: 7.0s (+63%)
```

**Gesamt-Pipeline (Recording → Enrichment):**
```
7B:  ~10-12s  (EMPFOHLEN)
14B: ~13-15s
32B: ~17-20s
```

### Quality Metrics

**JSON Validity (Basis: 500 Test-Prompts):**
```
7B:  92% (Ausreichend)
14B: Multi-Modal (+1%)
32B: 94% (+2%)
```

**Emotion Detection Accuracy:**
```
7B:  ~85%
14B: ~87%
32B: ~89%
```

**Fallacy Detection Recall:**
```
7B:  ~78%
14B: ~82%
32B: ~86%
```

</details>

---

<details id="troubleshooting">
<summary><b>Troubleshooting</b> - Häufige Probleme und Lösungen (click to expand)</summary>

## Troubleshooting

### "Model not found" Error
```bash
# Prüfen ob Base Model vorhanden
ollama list | grep qwen2.5

# Falls nicht: Base Model pullen
ollama pull qwen2.5:7b

# Custom Model neu erstellen
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile
```

### Ollama nicht erreichbar
```bash
# Ollama Service starten
ollama serve

# In separatem Terminal: Verfügbarkeit testen
curl http://localhost:11434/api/tags
```

### Langsame Inferenz
```bash
# 1. Prüfe Ollama CPU/GPU Usage
top -pid $(pgrep ollama)

# 2. Stelle sicher Metal Acceleration aktiv ist (macOS)
# Ollama nutzt automatisch Metal auf M-Series Chips

# 3. Reduziere Context Window falls nötig (bereits optimiert auf 8K)
```

### JSON Parsing Errors
```typescript
// Hablará hat robustes Fallback-Parsing in response-parsers.ts
// Falls wiederholt Errors auftreten:

// 1. Prüfe Ollama Version (min. 0.1.0)
ollama --version

// 2. Stelle sicher Custom Model aktiv (NICHT Base Model)
// Base Models haben keine Hablará-Optimierungen!
```

</details>

---

<details id="updates">
<summary><b>Updates</b> - Custom Model aktualisieren (click to expand)</summary>

## Updates

### Custom Model aktualisieren
```bash
# 1. Base Model updaten
ollama pull qwen2.5:7b

# 2. Custom Model neu erstellen (überschreibt altes)
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile

# 3. Altes Modell optional entfernen
ollama rm qwen2.5:7b-custom@<old-digest>
```

### Modelfile anpassen
Editiere `scripts/ollama/qwen2.5-7b-custom.modelfile` und erstelle neu:
```bash
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile
```

**Wichtig:** Nach Modelfile-Änderung App neu starten (`pnpm run dev:safe`).

</details>

---

## Related Documentation

### Parent Documentation
- **[../../README.md](../../README.md)** - Projekt-Übersicht und User-Setup

### Project Documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Projekt-Einstiegspunkt, Navigation Hub
- **[.claude/context.md](../../.claude/context.md)** - Tech-Stack, aktueller Stand
- **[.claude/instructions.md](../../.claude/instructions.md)** - Coding Standards

### Related Guides
- **[docs/how-to/LLM_SETUP.md](../../docs/how-to/LLM_SETUP.md)** - Vollständiger LLM Setup Guide
- **[docs/reference/enrichment/MULTI_PROVIDER_LLM.md](../../docs/reference/enrichment/MULTI_PROVIDER_LLM.md)** - Multi-Provider Architecture
- **[docs/explanation/decisions/ADR-019-llm-provider-strategy.md](../../docs/explanation/decisions/ADR-019-llm-provider-strategy.md)** - LLM Provider Strategy

### Implementation
- **[src/lib/llm/ollama-client.ts](../../src/lib/llm/ollama-client.ts)** - OllamaClient Implementation

### External Resources
- **[Ollama Modelfile Syntax](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)** - Official Documentation
- **[Qwen 2.5 Benchmarks](https://qwenlm.github.io/blog/qwen2.5/)** - Model Performance

---

**Version:** 1.0.0
**Created:** 28. Januar 2026
**Last Updated:** 28. Januar 2026
**Status:** Production
