# Sicherheitsrichtlinie

## Unterstützte Versionen

| Version | Unterstützt        |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Sicherheitslücken melden

Wir nehmen Sicherheitslücken ernst. Wenn Sie ein Sicherheitsproblem entdecken,
melden Sie es bitte verantwortungsvoll.

### BITTE NICHT

- Öffentliche GitHub Issues für Sicherheitslücken erstellen
- Sicherheitslücken öffentlich bekannt geben, bevor sie behoben sind
- Sicherheitslücken über das zur Demonstration Notwendige hinaus ausnutzen

### So melden Sie eine Sicherheitslücke

1. **GitHub**: Nutzen Sie [Private Vulnerability Reporting](https://github.com/fidpa/hablara/security/advisories/new)
2. **E-Mail**: Senden Sie Details an den Repository-Besitzer über sein GitHub-Profil

### Was Sie angeben sollten

- Beschreibung der Sicherheitslücke
- Schritte zur Reproduktion
- Mögliche Auswirkungen
- Lösungsvorschlag (falls vorhanden)
- Ihre Umgebung (macOS-Version, App-Version)

### Was Sie erwarten können

- **Bestätigung**: Innerhalb von 48 Stunden
- **Erste Bewertung**: Innerhalb von 7 Tagen
- **Behebungszeitraum**: Abhängig vom Schweregrad
  - Kritisch: 24-72 Stunden
  - Hoch: 1-2 Wochen
  - Mittel: 2-4 Wochen
  - Niedrig: Nächstes Release

### Nach der Behebung

- Sie werden in den Release Notes erwähnt (sofern Sie nicht anonym bleiben möchten)
- Ein Security Advisory wird veröffentlicht
- Behobene Versionen werden klar dokumentiert

## Sicherheitsaspekte

### Audio-Datenschutz

Hablará verarbeitet Audioaufnahmen standardmäßig lokal:

- **Lokale Transkription**: MLX-Whisper und whisper.cpp laufen vollständig auf dem Gerät
- **Lokales LLM**: Ollama verarbeitet Emotions-/Fehlschluss-Analysen lokal
- **Keine Cloud erforderlich**: Cloud-Anbieter (OpenAI, Anthropic) sind optional
- **Audio-Bereinigung**: Aufnahmen können nach der Verarbeitung automatisch gelöscht werden

### Datenspeicherung

- Aufnahmen werden in `~/Library/Application Support/hablara/recordings/` gespeichert
- Metadaten werden als JSON neben den Aufnahmen gespeichert
- Speicherbereinigung ist konfigurierbar (max. Aufnahmen, Aufbewahrungsdauer)
- API-Schlüssel werden separat im OS-Schlüsselbund gespeichert (verschlüsselt)

### API-Schlüssel

Bei Verwendung von Cloud-Anbietern (OpenAI, Anthropic):

- **Desktop-App (Tauri):** API-Schlüssel werden im nativen verschlüsselten Speicher des OS gespeichert
  - macOS: Keychain (AES-256-GCM)
  - Windows: Credential Manager (DPAPI)
  - Linux: Secret Service API
- **Browser (Entwicklung):** API-Schlüssel werden in sessionStorage gespeichert (flüchtig, beim Tab-Schließen gelöscht)
- Schlüssel werden nie übertragen, außer an ihre jeweiligen APIs
- Schlüssel werden nicht geloggt oder in Aufnahmen gespeichert
- **Migration:** Alte localStorage-Schlüssel werden automatisch in verschlüsselten Speicher migriert

## Geltungsbereich

Diese Sicherheitsrichtlinie umfasst:

- Die Hablará Desktop-Anwendung
- Alle Tauri-Befehle und IPC-Kommunikation
- Die Audio-Verarbeitungspipeline
- LLM-Integration (lokal und Cloud)
- Speicher- und Persistenzschicht

## Außerhalb des Geltungsbereichs

- Sicherheitslücken in Abhängigkeiten (melden Sie diese an die jeweiligen Projekte)
- Sicherheitslücken in Ollama, OpenAI oder Anthropic-Diensten
- Probleme durch Benutzermodifikationen
- macOS- oder systemweite Sicherheitslücken

---

Vielen Dank, dass Sie helfen, Hablará sicher zu halten!
