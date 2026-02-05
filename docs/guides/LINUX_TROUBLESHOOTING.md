# Ubuntu 24.04 LTS - Troubleshooting Guide

## Übersicht

Dieser Guide behandelt häufige Probleme bei der Installation und Nutzung von Hablará auf Ubuntu 24.04 LTS.

---

## Inhaltsverzeichnis

- [Installation](#installation)
- [Audio](#audio)
- [Globale Hotkeys](#globale-hotkeys)
- [Ollama / LLM](#ollama--llm)
- [Whisper / Transkription](#whisper--transkription)
- [Keyring / API Keys](#keyring--api-keys)
- [Desktop Integration](#desktop-integration)
- [Performance](#performance)
- [Logs & Debugging](#logs--debugging)
- [Bekannte Limitierungen](#bekannte-limitierungen)
- [Deinstallation](#deinstallation)
- [Support](#support)

---


## Installation

### .deb Package Installation

**Problem:** `dpkg: dependency problems prevent configuration`

**Lösung:**
```bash
# Fehlende Dependencies automatisch installieren
sudo apt-get install -f

# Dann erneut installieren
sudo dpkg -i Hablara_1.0.3_amd64.deb
```

---

### Fehlende Dependencies

**Problem:** App startet nicht, fehlerhafte GTK/WebKit Libraries

**Lösung:**
```bash
# Alle erforderlichen Dependencies installieren
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    libasound2t64 \
    libssl3
```

**Hinweis:** Ubuntu 24.04 verwendet `libasound2t64` statt `libasound2` (transitional package existiert).

---

## Audio

### Mikrofon nicht erkannt

**Problem:** Keine Aufnahme möglich, Mikrofon erscheint nicht in der Liste

**Lösung:**
```bash
# PulseAudio Status prüfen
systemctl --user status pulseaudio

# Falls nicht aktiv, starten
systemctl --user start pulseaudio

# Verfügbare Audio-Eingänge prüfen
pactl list sources short
```

---

### ALSA-Fehler beim Recording

**Problem:** `ALSA lib ... Unknown PCM`

**Lösung:**
```bash
# ALSA Packages installieren/reparieren
sudo apt-get install --reinstall alsa-base alsa-utils

# Audio-Konfiguration neu laden
sudo alsactl restore
```

---

### PipeWire Audio (Ubuntu 24.04 Standard)

**Problem:** Audio funktioniert nicht, PulseAudio-Befehle zeigen Fehler

**Hinweis:** Ubuntu 24.04 verwendet standardmäßig PipeWire mit PulseAudio-Kompatibilitätsschicht.

**Lösung:**
```bash
# PipeWire Status prüfen
systemctl --user status pipewire pipewire-pulse wireplumber

# Falls nicht aktiv, starten
systemctl --user start pipewire pipewire-pulse wireplumber

# Restart bei Problemen
systemctl --user restart pipewire pipewire-pulse wireplumber

# Audio-Geräte prüfen (funktioniert auch mit PipeWire)
pactl list sources short
```

---

## Globale Hotkeys

### Hotkeys funktionieren nicht (Wayland)

**Problem:** Ctrl+Shift+D startet keine Aufnahme unter Wayland

**Grund:** Globale Hotkeys werden unter Wayland aus Sicherheitsgründen nicht unterstützt.

**Lösungen:**

**Option 1: X11 Session verwenden (Empfohlen)**
1. Beim Login auf das Zahnrad-Symbol klicken
2. "Ubuntu on Xorg" auswählen
3. Einloggen
4. Hablará starten → Hotkeys funktionieren

**Option 2: Manueller Start-Button**
- Verwende den "Start Recording" Button in der App
- Keine Session-Änderung erforderlich

**Wayland-Erkennung:**
```bash
# Aktuelle Session prüfen
echo $XDG_SESSION_TYPE

# wayland → Hotkeys funktionieren nicht
# x11 → Hotkeys funktionieren
```

---

## Ollama / LLM

### Ollama nicht erreichbar

**Problem:** `Status: Nicht erreichbar` in Settings

**Lösung:**
```bash
# Ollama Service Status prüfen
# Prüfe ob User- oder System-Service
systemctl --user status ollama 2>/dev/null || sudo systemctl status ollama

# Falls nicht aktiv, starten
systemctl --user start ollama 2>/dev/null || sudo systemctl start ollama

# Autostart aktivieren
systemctl --user enable ollama 2>/dev/null || sudo systemctl enable ollama

# Manuell starten (falls systemd nicht verfügbar)
ollama serve &
```

**Port prüfen:**
```bash
# Sollte 11434 zeigen
ss -tlnp | grep 11434

# API testen
curl http://localhost:11434/api/tags
```

---

### Model fehlt

**Problem:** `Status: Modell fehlt`

**Lösung:**
```bash
# Verfügbare Models prüfen
ollama list

# qwen2.5:7b herunterladen
ollama pull qwen2.5:7b

# Custom Model erstellen (optional)
cd /path/to/hablara  # Verzeichnis wo Hablara geklont wurde
ollama create qwen2.5:7b-custom -f scripts/ollama/qwen2.5-7b-custom.modelfile
```

---

## Whisper / Transkription

### Transkription funktioniert nicht

**Problem:** Aufnahme erfolgreich, aber keine Transkription

**Lösung:**

1. **Prüfe whisper.cpp Binary:**
```bash
# Binary sollte existieren
ls -lh /usr/lib/Hablara/resources/binaries/whisper-*

# Ausführbar?
file /usr/lib/Hablara/resources/binaries/whisper-*
```

2. **Prüfe German Turbo Model:**
```bash
# Model sollte ~1.6 GB sein
ls -lh /usr/lib/Hablara/resources/models/ggml-german-turbo.bin
```

3. **Manuelle Transkription testen:**
```bash
cd /usr/lib/Hablara/resources
./binaries/whisper-x86_64-unknown-linux-gnu \
  -m models/ggml-german-turbo.bin \
  -f ~/Hablara/recordings/test.wav \
  --language de
```

---

### Langsame Transkription

**Problem:** Transkription dauert >60s für 30s Audio

**Lösung:**

1. **CPU-Auslastung prüfen:**
```bash
# Während Transkription
top -p $(pgrep whisper)
```

2. **ONNX Runtime Probleme:**
```bash
# Library verfügbar?
ldconfig -p | grep onnxruntime

# Falls nicht:
sudo cp /path/to/onnxruntime/lib/* /usr/local/lib/
sudo ldconfig
```

3. **Model-Größe reduzieren (Trade-off Qualität):**
- German Turbo (1.6 GB) → base (142 MB)
- Siehe `scripts/setup-whisper-linux.sh` für Optionen


### NVIDIA GPU nicht erkannt

**Problem:** Whisper nutzt nur CPU trotz NVIDIA-GPU

**Lösung:**
```bash
# NVIDIA Treiber prüfen
nvidia-smi

# CUDA Version prüfen
nvcc --version

# Falls nicht installiert:
sudo apt-get install nvidia-driver-535 nvidia-cuda-toolkit

# Reboot erforderlich
sudo reboot
```

**Hinweis:** Nach Treiber-Installation muss whisper.cpp mit CUDA neu kompiliert werden:
```bash
./scripts/setup-whisper-linux.sh base true
```

---

## Keyring / API Keys

### API Key nicht gespeichert

**Problem:** API Key muss nach jedem Start neu eingegeben werden

**Lösung:**

1. **Secret Service prüfen:**
```bash
# GNOME Keyring läuft?
ps aux | grep gnome-keyring

# Falls nicht, installieren
sudo apt-get install gnome-keyring
```

2. **Seahorse (Keyring Manager) öffnen:**
```bash
seahorse
```

3. **Manuell prüfen:**
- Suche nach "hablara-vip"
- Account: `openai-api-key` oder `anthropic-api-key`
- Falls nicht vorhanden: App neu starten, Key erneut eingeben

**Alternative (Browser/Dev):**
- Nutze sessionStorage (temporär)
- Nur für Development, nicht für Production

---

## Desktop Integration

### Icon fehlt im Application Launcher

**Problem:** Hablará erscheint nicht im App-Menü

**Lösung:**
```bash
# Desktop Entry prüfen
cat /usr/share/applications/Hablara.desktop

# Cache neu laden
update-desktop-database ~/.local/share/applications
gtk-update-icon-cache /usr/share/icons/hicolor/

# GNOME Shell neu laden (Alt+F2, dann "r")
```


### AppImage startet nicht

**Problem:** `./Hablara_*.AppImage` öffnet sich nicht

**Lösung:**
```bash
# Ausführbar machen
chmod +x Hablara_1.0.3_amd64.AppImage

# FUSE prüfen (erforderlich für AppImage)
sudo apt-get install libfuse2t64

# Starten
./Hablara_1.0.3_amd64.AppImage
```

**Hinweis:** AppImage benötigt FUSE2. Ubuntu 24.04 verwendet `libfuse2t64`.

---

### Window State nicht gespeichert

**Problem:** Fenster-Position/Größe wird nicht erinnert

**Lösung:**
```bash
# Config-Verzeichnis prüfen
ls -la ~/.config/com.fidpa.hablara/

# Falls leer: App einmal öffnen, verschieben, schließen
# State sollte dann in ~/.config/com.fidpa.hablara/ gespeichert werden
```

---

## Performance

### Hohe CPU-Auslastung

**Ursachen & Lösungen:**

1. **VAD (Voice Activity Detection) während Recording:**
   - Normal: ~10-15% CPU
   - Kein Fix nötig (endet nach Recording)

2. **LLM Analysis (Ollama):**
   - Normal: 80-100% CPU während Inference
   - Dauert 2-5s, dann wieder idle

3. **Whisper Transkription:**
   - Normal: 100% CPU während Transkription
   - Siehe "Langsame Transkription" oben

---

## Logs & Debugging

### App-Logs anzeigen

**Tauri Logs:**
```bash
# App im Terminal starten für Logs
/usr/bin/hablara

# Oder systemd journal (falls als Service)
journalctl --user -u hablara -n 50
```

**Browser DevTools (Development):**
```bash
# In App: Rechtsklick → "Inspect Element"
# Console-Logs sind sichtbar
```

---

## Bekannte Limitierungen

### Wayland

- ❌ Globale Hotkeys funktionieren nicht
- ✅ Manuelle Recording-Buttons funktionieren
- **Workaround:** X11 Session verwenden

### MLX (Apple Silicon)

- ❌ Nicht verfügbar auf Linux (nur macOS)
- ✅ Standard Ollama funktioniert auf Linux

### Auto-Updater

- ⚠️ `__TAURI_BUNDLE_TYPE` Warnung beim Build
- Betrifft nur Auto-Update Plugin
- .deb muss manuell aktualisiert werden

---

## Deinstallation

### Sauber entfernen

```bash
# Package deinstallieren (empfohlen)
sudo apt remove hablara

# Oder mit Purge (inkl. Konfiguration):
# sudo apt purge hablara

# Config & Daten entfernen (optional)
# ACHTUNG: Löscht alle Aufnahmen und Einstellungen!
rm -rf ~/.config/com.fidpa.hablara
rm -rf ~/Hablara

# Keyring-Einträge entfernen (optional)
# Öffne Seahorse → Suche "hablara-vip" → Löschen
seahorse
```

---

## Support

**Issues melden:** https://github.com/fidpa/hablara/issues

**System-Info sammeln:**
```bash
# Für Bug-Reports hilfreich
uname -a
lsb_release -a
dpkg -l | grep hablara
ollama --version
# Prüfe ob User- oder System-Service
systemctl --user status ollama 2>/dev/null || sudo systemctl status ollama
ldconfig -p | grep onnxruntime
echo $XDG_SESSION_TYPE
```

---

## Siehe auch

- **[Setup Scripts](../../scripts/README.md)** - Ollama & Whisper Installation
- **[Haupt-README](../../README.md)** - Projekt-Übersicht
- **[Ollama Models](../../scripts/ollama/README.md)** - Custom Model Konfiguration
