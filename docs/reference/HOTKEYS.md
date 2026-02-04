# Tastenkürzel & Konfiguration

Globale Hotkeys für Hablará anpassen.

---

## Standard-Hotkey

**macOS:** `Ctrl+Shift+D`

**Funktion:** Aufnahme starten/stoppen

---

## Hotkey ändern

### Schritt 1: Einstellungen öffnen

1. Hablará starten
2. Zahnrad-Icon (⚙️) oben rechts klicken
3. **Allgemein-Tab** wählen

### Schritt 2: Hotkey ändern

1. Unter **Hotkey** das Eingabefeld finden
2. Aktueller Wert: `CommandOrControl+Shift+D`
3. Nach Wunsch ändern (siehe Format unten)
4. **Speichern** klicken

---

## Hotkey-Format

### Syntax

```
Modifier+Modifier+Key
```

Beispiel: `Command+Shift+R`

### Verfügbare Modifier

| Modifier | macOS | Beschreibung |
|----------|-------|--------------|
| `Command` | ⌘ | Command-Taste |
| `Control` | ^ | Control-Taste |
| `Option` | ⌥ | Option/Alt-Taste |
| `Shift` | ⇧ | Shift-Taste |
| `CommandOrControl` | ⌘/^ | Command (Mac) oder Ctrl (Windows) |

### Beispiele

```
# Standard (plattformübergreifend)
CommandOrControl+Shift+D

# macOS-spezifisch
Command+Shift+R
Command+Option+V
Option+Shift+M

# Mit Control
Control+Shift+R
Control+Shift+Space
```

---

## Konflikte vermeiden

**System-Shortcuts nicht verwenden:**

| Shortcut | Funktion | Warum vermeiden? |
|----------|----------|------------------|
| `Command+C/V/X/Z` | Copy/Paste/Cut/Undo | Universal |
| `Command+Q` | App beenden | Versehentliches Schließen |
| `Command+W` | Fenster schließen | Versehentliches Schließen |
| `Command+Tab` | App-Wechsel | System-Funktion |
| `Command+Space` | Spotlight | macOS-Standard |
| `Command+H` | Fenster verstecken | System-Funktion |

---

## Hotkey funktioniert nicht?

### 1. Shortcut-Konflikt prüfen

**macOS:**
1. **Systemeinstellungen** öffnen
2. **Tastatur** → **Tastatur-Kurzbefehle**
3. Alle Kategorien durchgehen
4. Überschneidung deaktivieren oder Hablará-Hotkey ändern

### 2. Bedienungshilfen-Berechtigung

Für globale Hotkeys benötigt Hablará Zugriff:

**macOS:**
1. **Systemeinstellungen** → **Datenschutz & Sicherheit**
2. **Bedienungshilfen**
3. **Hablará** in der Liste aktivieren
4. App neu starten

### 3. App-spezifischer Konflikt

**Prüfen:**
- Andere Apps mit globalem Hotkey (z.B. Screenshot-Tools, Clipboard-Manager)
- Diese Apps deaktivieren oder deren Shortcuts ändern

---

## Siehe auch

- [FAQ](../guides/FAQ.md) - Häufige Probleme lösen
- [Aufnahme-Qualität optimieren](../guides/RECORDING_QUALITY.md) - LED-Meter, Speech Ratio
