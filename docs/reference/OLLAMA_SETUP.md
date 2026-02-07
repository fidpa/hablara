# Ollama Setup Scripts

Automatisierte Einrichtung von [Ollama](https://ollama.com) mit optimiertem Hablará-Modell (qwen2.5).

## Schnellstart

```bash
# macOS
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-mac.sh | bash

# Linux
curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-linux.sh | bash
```

```powershell
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-win.ps1" -OutFile "$env:TEMP\setup-ollama-win.ps1"; & "$env:TEMP\setup-ollama-win.ps1"
```

## Optionen

| Flag | PowerShell | Beschreibung |
|------|------------|--------------|
| `--model <3b\|7b\|14b\|32b>` | `-Model <Variante>` | Modell-Variante wählen |
| `--update` | `-Update` | Hablará-Modell aktualisieren |
| `--status` | `-Status` | Health-Check (7-Punkte-Prüfung) |
| `--diagnose` | `-Diagnose` | Support-Report für GitHub Issues |
| `--cleanup` | `-Cleanup` | Installierte Modelle aufräumen |
| `--help` | `-Help` | Hilfe anzeigen |

Ohne Flags startet ein interaktives Menü mit allen Optionen.

## Modell-Varianten

| Variante | Modell | Download | Mindest-RAM | Empfehlung |
|----------|--------|----------|-------------|------------|
| `3b` | qwen2.5:3b | ~2 GB | 8 GB | Ältere/schwächere Hardware |
| **`7b`** | **qwen2.5:7b** | **~4.7 GB** | **16 GB** | **Standard** |
| `14b` | qwen2.5:14b | ~9 GB | 16 GB | Bessere Analyse-Qualität |
| `32b` | qwen2.5:32b | ~20 GB | 48 GB | Maximale Qualität |

Das Setup erstellt zusätzlich ein `*-custom` Modell (z.B. `qwen2.5:7b-custom`) mit optimierten Parametern für Hablará.

## Beispiele

```bash
# 3b-Variante installieren
./setup-ollama-mac.sh --model 3b

# Hablará-Modell aktualisieren (nach Script-Update)
./setup-ollama-mac.sh --update

# Installation prüfen
./setup-ollama-mac.sh --status

# Diagnose-Report für Bug-Report erstellen
./setup-ollama-mac.sh --diagnose

# Variante wechseln (alte entfernen, neue installieren)
./setup-ollama-mac.sh --cleanup
./setup-ollama-mac.sh --model 14b

# Via Pipe mit Argument
curl -fsSL URL | bash -s -- --model 14b
```

## --status (Health-Check)

Prüft 7 Punkte mit ✓/✗:

1. Ollama installiert + Version
2. Server erreichbar
3. GPU-Erkennung
4. Basis-Modell vorhanden
5. Hablará-Modell vorhanden
6. Modell antwortet (Inference-Test)
7. Speicherverbrauch

## --diagnose (Support-Report)

Generiert einen kopierbaren Plain-Text-Report für GitHub Issues:

```
=== Hablará Diagnose-Report ===

System:
  OS:           macOS 26.2 (arm64)
  RAM:          64 GB (20 GB verfügbar)
  Speicher:     97 GB frei
  Shell:        bash 5.3.9

Ollama:
  Version:      0.15.5
  Server:       läuft
  API-URL:      http://localhost:11434
  GPU:          Apple Silicon (Metal)

Hablará-Modelle:
    qwen2.5:7b          4.7 GB  ✓
    qwen2.5:7b-custom   4.7 GB  ✓ (antwortet)

Speicher (Hablará):  ~9.4 GB

Ollama-Log (letzte Fehler):
    [keine Fehler gefunden]

---
Erstellt: 2026-02-07 14:30:12
Script:   setup-ollama-mac.sh v1.2.0
```

Der Report enthält keine ANSI-Farben — direkt in GitHub Issues einfügbar.

## --cleanup (Modelle aufräumen)

Interaktives Menü zum Entfernen installierter Hablará-Varianten. Löscht jeweils Basis- und Custom-Modell gemeinsam. Erfordert eine interaktive Sitzung (kein Pipe-Modus).

## Plattform-Unterschiede

| Aspekt | macOS | Linux | Windows |
|--------|-------|-------|---------|
| GPU | Apple Silicon (Metal) | NVIDIA (CUDA), AMD (ROCm), Intel (oneAPI) | NVIDIA (CUDA), AMD (ROCm) |
| Ollama-Log | `~/.ollama/logs/server.log` | `journalctl -u ollama` | `%USERPROFILE%\.ollama\logs\server.log` |
| Ollama-Daten | `~/.ollama/` | `$XDG_DATA_HOME/ollama/` | `%USERPROFILE%\.ollama\` |
| Server-Start | Ollama.app / launchd / nohup | systemd / nohup | Ollama App / `ollama serve` |
| Paketmanager | Homebrew | curl-Installer | winget |

## Exit Codes

| Code | Bedeutung |
|------|-----------|
| 0 | Erfolg |
| 1 | Allgemeiner Fehler |
| 2 | Nicht genügend Speicherplatz |
| 3 | Keine Netzwerkverbindung |
| 4 | Falsche Plattform |

## App-Einstellungen nach Setup

Nach dem Setup in Hablará einstellen:

- **Provider:** Ollama
- **Modell:** `qwen2.5:7b-custom` (oder gewählte Variante)
- **Base URL:** `http://localhost:11434`
