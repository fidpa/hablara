# Datenschutzerklärung / Privacy Policy

**Hablará**

*Letzte Aktualisierung: 2. Februar 2026*

---

## Deutsch

### 1. Verantwortlicher

Marc Allgeier
E-Mail: marc@hablara.de
GitHub: https://github.com/fidpa/hablara

### 2. Überblick

Hablará ist eine Desktop-Anwendung für macOS, die Sprachaufnahmen transkribiert und mit KI-gestützter Analyse anreichert. **Datenschutz steht im Mittelpunkt:** Die Verarbeitung erfolgt standardmäßig lokal auf deinem Mac.

### 3. Welche Daten werden verarbeitet?

#### 3.1 Sprachaufnahmen (Audio)

| Aspekt | Details |
|--------|---------|
| **Was** | Mikrofonaufnahmen während der Nutzung |
| **Wo verarbeitet** | Lokal auf deinem Mac |
| **Wo gespeichert** | `~/Hablara/recordings/` |
| **Wie lange** | Bis du sie manuell löschst |
| **An Dritte gesendet** | ❌ Nein (niemals) |

#### 3.2 Transkripte (Text)

| Aspekt | Details |
|--------|---------|
| **Was** | Textausgabe der Spracherkennung |
| **Wo verarbeitet** | Lokal (Whisper) oder Cloud (optional) |
| **Wo gespeichert** | Lokal auf deinem Mac |
| **An Dritte gesendet** | ⚠️ Nur bei Cloud-LLM (siehe 4.2) |

#### 3.3 API-Schlüssel

| Aspekt | Details |
|--------|---------|
| **Was** | OpenAI/Anthropic API Keys (optional) |
| **Wo gespeichert** | macOS Keychain (AES-256 verschlüsselt) |
| **An Dritte gesendet** | ❌ Nein |

### 4. Datenverarbeitung

#### 4.1 Lokale Verarbeitung (Standard)

Standardmäßig werden alle Daten **ausschließlich lokal** verarbeitet:

- **Spracherkennung:** whisper.cpp (läuft auf deinem Mac)
- **KI-Analyse:** Ollama (läuft auf deinem Mac)
- **Speicherung:** Lokaler Ordner, keine Cloud

**Keine Daten verlassen deinen Mac**, solange du keine Cloud-Dienste aktivierst.

#### 4.2 Cloud-Verarbeitung (Optional)

Wenn du in den Einstellungen einen Cloud-LLM-Anbieter wählst:

| Anbieter | Was wird gesendet | Datenschutz |
|----------|-------------------|-------------|
| **OpenAI** | Transkript-Text (NICHT Audio) | [OpenAI Privacy](https://openai.com/privacy) |
| **Anthropic** | Transkript-Text (NICHT Audio) | [Anthropic Privacy](https://www.anthropic.com/privacy) |

**Wichtig:**
- Du musst der Cloud-Nutzung explizit zustimmen
- Audio-Dateien werden **niemals** an Cloud-Dienste gesendet
- Du kannst jederzeit zu lokaler Verarbeitung zurückwechseln

### 5. Deine Rechte (DSGVO Art. 15-22)

Du hast folgende Rechte:

| Recht | Wie ausüben |
|-------|-------------|
| **Auskunft** | Alle Daten liegen in `~/Hablara/recordings/` |
| **Löschung** | Einstellungen → Speicher → "Alle Aufnahmen löschen" |
| **Widerspruch** | Cloud-LLM in Einstellungen deaktivieren |
| **Datenportabilität** | Aufnahmen als WAV + JSON exportierbar |

### 6. Keine Tracking, Keine Werbung

Hablará:
- ❌ Sammelt keine Nutzungsstatistiken
- ❌ Zeigt keine Werbung
- ❌ Verwendet keine Cookies
- ❌ Teilt keine Daten mit Werbepartnern
- ❌ Erstellt keine Nutzerprofile

### 7. Datensicherheit

| Maßnahme | Details |
|----------|---------|
| **API-Keys** | AES-256 verschlüsselt in macOS Keychain |
| **Netzwerk** | HTTPS für alle Cloud-Verbindungen |
| **Lokale Daten** | Unverschlüsselt (dein Mac, deine Verantwortung) |

### 8. Änderungen

Bei wesentlichen Änderungen dieser Datenschutzerklärung informieren wir dich über die App oder GitHub.

### 9. Kontakt

Bei Fragen zum Datenschutz:
- E-Mail: marc@hablara.de
- GitHub Issues: https://github.com/fidpa/hablara/issues

---

## English

### 1. Data Controller

Marc Allgeier
Email: marc@hablara.de
GitHub: https://github.com/fidpa/hablara

### 2. Overview

Hablará is a macOS desktop application that transcribes voice recordings and enriches them with AI-powered analysis. **Privacy is core:** Processing happens locally on your Mac by default.

### 3. What Data is Processed?

#### 3.1 Voice Recordings (Audio)

| Aspect | Details |
|--------|---------|
| **What** | Microphone recordings during use |
| **Where processed** | Locally on your Mac |
| **Where stored** | `~/Hablara/recordings/` |
| **How long** | Until you manually delete them |
| **Sent to third parties** | ❌ No (never) |

#### 3.2 Transcripts (Text)

| Aspect | Details |
|--------|---------|
| **What** | Text output from speech recognition |
| **Where processed** | Locally (Whisper) or Cloud (optional) |
| **Where stored** | Locally on your Mac |
| **Sent to third parties** | ⚠️ Only with Cloud LLM (see 4.2) |

#### 3.3 API Keys

| Aspect | Details |
|--------|---------|
| **What** | OpenAI/Anthropic API keys (optional) |
| **Where stored** | macOS Keychain (AES-256 encrypted) |
| **Sent to third parties** | ❌ No |

### 4. Data Processing

#### 4.1 Local Processing (Default)

By default, all data is processed **exclusively locally**:

- **Speech recognition:** whisper.cpp (runs on your Mac)
- **AI analysis:** Ollama (runs on your Mac)
- **Storage:** Local folder, no cloud

**No data leaves your Mac** unless you enable cloud services.

#### 4.2 Cloud Processing (Optional)

If you select a cloud LLM provider in settings:

| Provider | What is sent | Privacy Policy |
|----------|--------------|----------------|
| **OpenAI** | Transcript text (NOT audio) | [OpenAI Privacy](https://openai.com/privacy) |
| **Anthropic** | Transcript text (NOT audio) | [Anthropic Privacy](https://www.anthropic.com/privacy) |

**Important:**
- You must explicitly consent to cloud usage
- Audio files are **never** sent to cloud services
- You can switch back to local processing anytime

### 5. Your Rights (GDPR Art. 15-22)

You have the following rights:

| Right | How to exercise |
|-------|-----------------|
| **Access** | All data is in `~/Hablara/recordings/` |
| **Deletion** | Settings → Storage → "Delete all recordings" |
| **Objection** | Disable Cloud LLM in settings |
| **Portability** | Recordings exportable as WAV + JSON |

### 6. No Tracking, No Ads

Hablará:
- ❌ Does not collect usage statistics
- ❌ Does not show advertisements
- ❌ Does not use cookies
- ❌ Does not share data with advertising partners
- ❌ Does not create user profiles

### 7. Data Security

| Measure | Details |
|---------|---------|
| **API Keys** | AES-256 encrypted in macOS Keychain |
| **Network** | HTTPS for all cloud connections |
| **Local Data** | Unencrypted (your Mac, your responsibility) |

### 8. Changes

We will inform you of material changes to this privacy policy via the app or GitHub.

### 9. Contact

For privacy questions:
- Email: marc@hablara.de
- GitHub Issues: https://github.com/fidpa/hablara/issues

---

**Version:** 1.0.0
**Effective Date:** February 2, 2026
