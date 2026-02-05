# Häufig gestellte Fragen (FAQ)

Schnelle Lösungen für die 10 häufigsten Probleme.

---

## 1. Ollama nicht verfügbar

**Symptom:** "LLM nicht verfügbar" oder "Ollama antwortet nicht"

**Lösung:**
```bash
# Ollama starten
ollama serve

# Model herunterladen
ollama pull qwen2.5:7b
```

**Alternative:** Cloud-LLM verwenden (Settings → KI-Modelle → OpenAI/Anthropic)

---

## 2. Transkription fehlgeschlagen

**Symptom:** "0% Speech detected" oder leerer Transkript-Text

**Ursachen & Lösungen:**

| Ursache | Lösung |
|---------|--------|
| Zu leise gesprochen | Lauter sprechen, näher ans Mikrofon |
| Hintergrundgeräusche | Ruhige Umgebung wählen |
| Mikrofon-Permission fehlt | Systemeinstellungen → Datenschutz → Mikrofon |

**Prüfen:** LED-Meter sollte 4-6 grüne Segmente zeigen → [Aufnahme-Qualität optimieren](./RECORDING_QUALITY.md)

---

## 3. Hotkey reagiert nicht

**Symptom:** `Ctrl+Shift+D` löst nichts aus

**Lösungen:**

1. **Shortcut-Konflikt:** Anderes Programm belegt denselben Hotkey
   - **Prüfen:** Systemeinstellungen → Tastatur → Tastatur-Kurzbefehle
   - **Lösung:** Alternative wählen → [Hotkeys konfigurieren](../reference/HOTKEYS.md)

2. **Permission fehlt:** macOS Bedienungshilfen
   - **Prüfen:** Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen
   - **Lösung:** Hablará aktivieren

3. **Nur im Browser:** Tauri Dev Mode starten
   - **Lösung:** App richtig starten (nicht im Browser öffnen)

---

## 4. Aufnahmen werden nicht gespeichert

**Symptom:** Keine Dateien im Aufnahme-Ordner

**Speicherpfade (ab v1.0.4):**
- macOS (Direct): `~/Library/Application Support/Hablara/recordings/`
- macOS (App Store): `~/Documents/Hablara/recordings/`
- Linux: `~/.local/share/hablara/recordings/`
- Windows: `%LOCALAPPDATA%\Hablara\recordings\`

**Lösungen:**

1. **Auto-Save deaktiviert:**
   - Settings → Speicher → "Automatische Speicherung" aktivieren

2. **Ordner nicht erreichbar:**
   ```bash
   # macOS (Direct)
   mkdir -p ~/Library/Application\ Support/Hablara/recordings/

   # Linux
   mkdir -p ~/.local/share/hablara/recordings/
   ```

3. **Berechtigungen prüfen:**
   ```bash
   # macOS
   ls -la ~/Library/Application\ Support/Hablara/

   # Linux
   ls -la ~/.local/share/hablara/
   ```

**Details:** [Aufnahmen verwalten](./STORAGE.md)

---

## 5. Audio-Level zeigt 0

**Symptom:** LED-Meter bleibt auf 0, keine Balken

**Lösungen:**

| Ursache | Lösung |
|---------|--------|
| Mikrofon-Permission fehlt | Systemeinstellungen → Datenschutz → Mikrofon |
| Falsches Input-Device | Anderes Mikrofon in macOS wählen |
| Mikrofon-Lautstärke zu niedrig | Input-Level in Systemeinstellungen erhöhen |

**Test:** Andere App (z.B. QuickTime) → Aufnahme starten → funktioniert es dort?

---

## 6. LLM antwortet nicht

**Symptom:** Chat-Antwort bleibt aus oder "LLM-Fehler"

**Lösungen:**

1. **Ollama nicht gestartet:**
   ```bash
   ollama serve
   ```

2. **Model fehlt:**
   ```bash
   ollama pull qwen2.5:7b
   ```

3. **Cloud-LLM ohne API Key:**
   - Settings → KI-Modelle → API Key eingeben

4. **Offline (Cloud-Provider):**
   - Internetverbindung prüfen
   - Oder: Zu Ollama wechseln (offline-fähig)

---

## 7. Langsame Verarbeitung

**Symptom:** Transkription/Analyse dauert >10 Sekunden

**Optimierungen:**

| Problem | Lösung | Impact |
|---------|--------|--------|
| Cloud-LLM mit Netzwerk-Lag | Ollama lokal nutzen | -50% Latenz |
| Große Audio-Datei (>2 Min) | Kürzere Clips aufnehmen | -70% Zeit |
| Viele Analysen aktiviert | Unnötige Features deaktivieren | -30% Zeit |

**Settings optimieren:**
- Nur benötigte Analysen aktivieren (Emotion, GFK, etc.)
- MLX-Whisper nutzen (falls installiert) → schneller als whisper.cpp

---

## 8. PDF-Export wird blockiert

**Symptom:** "PDF-Export fehlgeschlagen" oder Browser-Download-Dialog öffnet sich nicht

**Ursachen:**

1. **Browser-Permission:** Download-Berechtigung fehlt
   - **Lösung:** Download in Browser erlauben

2. **Tauri File-Dialog Fehler:** Native Dialog schlägt fehl
   - **Lösung:** Anderer Speicherort (z.B. Desktop statt Network-Share)

**Alternative:** WAV-Export funktioniert immer → [Aufnahmen verwalten](./STORAGE.md)

---

## 9. App startet nicht

**Symptom:** Weißer Bildschirm oder "SyntaxError: Unexpected EOF"

**Lösungen:**

1. **Cache-Problem:**
   ```bash
   # macOS
   rm -rf ~/Library/WebKit/com.fidpa.hablara
   rm -rf ~/Library/Caches/com.fidpa.hablara
   ```

2. **Alte App-Version:**
   - Deinstallieren: `rm -rf /Applications/Hablara.app`
   - Neueste DMG von GitHub installieren

3. **macOS Gatekeeper:**
   - Rechtsklick auf App → "Öffnen"
   - Oder: Systemeinstellungen → Datenschutz → "Trotzdem öffnen"

---

## 10. Mikrofon-Berechtigung fehlt

**Symptom:** "Mikrofon-Zugriff verweigert" oder LED-Meter zeigt 0

**Lösung (macOS):**

1. **Systemeinstellungen** öffnen
2. **Datenschutz & Sicherheit** → **Mikrofon**
3. **Hablará** in der Liste aktivieren
4. **App neu starten**

**Berechtigung zurücksetzen:**
```bash
tccutil reset Microphone
```
(App erneut starten → Permission-Dialog erscheint)

---

## 11. Linux: AppImage startet nicht

**Symptom:** `./Hablara_*.AppImage` zeigt "FUSE error" oder startet nicht

**Lösungen:**

```bash
# 1. Ausführbar machen
chmod +x Hablara_*.AppImage

# 2. FUSE installieren (Ubuntu 22.04+)
sudo apt install libfuse2t64

# 3. Alternativ: Ohne FUSE extrahieren
./Hablara_*.AppImage --appimage-extract
./squashfs-root/AppRun
```

**Details:** [Linux Troubleshooting](./LINUX_TROUBLESHOOTING.md)

---

## 12. Linux: Hotkeys funktionieren nicht (Wayland)

**Symptom:** `Ctrl+Shift+D` löst keine Aufnahme aus

**Grund:** Wayland blockiert globale Hotkeys aus Sicherheitsgründen.

**Lösungen:**

1. **X11-Session verwenden (empfohlen):**
   - Beim Login: Zahnrad-Symbol → "Ubuntu on Xorg" wählen

2. **Session prüfen:**
   ```bash
   echo $XDG_SESSION_TYPE
   # wayland → Hotkeys nicht möglich
   # x11 → Hotkeys funktionieren
   ```

3. **Alternative:** Start-Button in der App verwenden

---

## Weitere Hilfe

**Kontakt:** Siehe [Support & Kontakt](../legal/SUPPORT.md)

**Fehler melden:** [GitHub Issues](https://github.com/fidpa/hablara/issues)

---

## Siehe auch

- [Aufnahme-Qualität optimieren](./RECORDING_QUALITY.md) - LED-Meter, Speech Ratio
- [Aufnahmen verwalten](./STORAGE.md) - Storage, Export
- [Hotkeys konfigurieren](../reference/HOTKEYS.md) - Tastenkürzel anpassen

---

**Version:** 1.0.4
