# Aufnahmen verwalten

Wie Sie Ihre Aufnahmen speichern, organisieren und exportieren.

---

## Automatische Speicherung

**Standard:** Aktiviert

Alle Aufnahmen werden automatisch gespeichert mit vollständigen Metadaten.

### Speicherpfade nach Plattform

| Plattform | Build | Pfad |
|-----------|-------|------|
| **macOS** | App Store | `~/Documents/Hablara/recordings/` |
| **macOS** | Direct | `~/Library/Application Support/Hablara/recordings/` |
| **Linux** | Direct | `~/.local/share/hablara/recordings/` |
| **Windows** | Direct | `%LOCALAPPDATA%\Hablara\recordings\` |

> **Hinweis:** App Store Builds speichern in `~/Documents/`, damit Nutzer direkten Zugriff auf ihre Daten haben (Apple Guideline 2.4.5).

**Beispiel-Struktur:**
```
recordings/
├── 2026-01-25_20-30-45_a1b2c3d4.wav   # 16kHz Mono WAV
└── 2026-01-25_20-30-45_a1b2c3d4.json  # Metadaten
```

**Jede Aufnahme enthält:**
- Transkription (Text + Filterung)
- Emotion Analysis
- VAD-Statistiken (Speech Ratio)
- Processing Times
- App-Version

---

## Einstellungen konfigurieren

1. **Settings öffnen:** ⚙️ Button in der Kopfzeile
2. **Speicher-Tab** wählen
3. **Optionen:**
   - "Automatische Speicherung" (Default: AN)
   - "Maximale Aufnahmen": 25-500 (Default: 100)
   - "Alle Aufnahmen löschen" für Cleanup

---

## RecordingsLibrary verwenden

### Öffnen

1. **Folder-Button** (📁) in der Kopfzeile klicken
2. Drawer öffnet sich von rechts
3. Liste aller Aufnahmen (neueste zuerst)

### Aktionen

| Button | Aktion | Beschreibung |
|--------|--------|--------------|
| ▶️ Play | Playback | Aufnahme abspielen |
| ⬇️ Download | WAV-Export | Native Save Dialog |
| 🗑️ Delete | Löschen | Entfernt WAV + Metadaten |
| 📄 Expand | Details | VAD-Stats, Processing Time |

---

## WAV-Export

1. **Download-Button** klicken
2. Native Save-Dialog öffnet sich
3. **Filename:** `Hablara_YYYY-MM-DD_HH-MM-SS.wav` (vorausgefüllt)
4. Speicherort wählen
5. Bestätigung: "Download erfolgreich"

**Ergebnis:** WAV-Datei im gewählten Ordner (16kHz Mono, kompatibel mit allen Audio-Tools)

---

## Auto-Cleanup

**Was passiert:**
- Automatisch bei Überschreitung von "Maximale Aufnahmen"
- FIFO-Strategie: Älteste zuerst
- Loggt Anzahl gelöschter Aufnahmen

**Anpassen:**
- Settings → Speicher → "Maximale Aufnahmen" erhöhen (z.B. 100 → 200)

---

## AudioPlayer Controls

- **Play/Pause:** Aufnahme abspielen/pausieren
- **Seek:** Zeitbasierter Slider
- **Volume:** Lautstärkeregler + Mute-Button
- **Speed:** 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

---

## Speicher-Statistiken

Im Settings-Panel sichtbar:

- **Aufnahmen:** Anzahl gespeicherter Recordings
- **Speicher:** Gesamtgröße in KB/MB
- **Dauer:** Gesamtdauer aller Aufnahmen
- **Pfad:** Plattformspezifisch (siehe oben)

---

## Häufige Probleme

### Aufnahmen werden nicht gespeichert

**Prüfen:**
1. Settings → Speicher → "Automatische Speicherung" aktiviert?
2. Pfad erreichbar? (siehe Plattform-Pfade oben)

**Lösung nach Plattform:**

```bash
# macOS (Direct Distribution)
ls -la ~/Library/Application\ Support/Hablara/recordings/

# Linux
ls -la ~/.local/share/hablara/recordings/

# macOS (App Store) / Windows
# Pfad im Finder/Explorer prüfen: Documents/Hablara/recordings/
```

### Speicherort nicht erreichbar

**Ordner manuell erstellen:**
```bash
# macOS (Direct)
mkdir -p ~/Library/Application\ Support/Hablara/recordings/

# Linux
mkdir -p ~/.local/share/hablara/recordings/
```

### Auto-Cleanup zu aggressiv

**Lösung:** Settings → "Maximale Aufnahmen" erhöhen (100 → 200)

### Migration von älteren Versionen

Ab Version 1.0.4 werden Aufnahmen in plattform-nativen Verzeichnissen gespeichert statt in `~/Hablara/recordings/`.

**Automatische Migration:** Beim ersten Start werden bestehende Aufnahmen automatisch migriert.

**Manuelle Migration (falls nötig):**
```bash
# macOS (Direct) - von alt nach neu
mv ~/Hablara/recordings/* ~/Library/Application\ Support/Hablara/recordings/

# Linux - von alt nach neu
mv ~/Hablara/recordings/* ~/.local/share/hablara/recordings/
```

---

## Siehe auch

- [FAQ](./FAQ.md) - Häufige Probleme lösen
- [Aufnahme-Qualität optimieren](./RECORDING_QUALITY.md) - LED-Meter, Speech Ratio

---

**Version:** 1.0.4
