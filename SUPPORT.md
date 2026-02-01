# Hilfe erhalten

## Dokumentation

Bevor Sie ein Issue öffnen, prüfen Sie bitte:

- **[README.md](README.md)** - Schnellstart & Einrichtung
- **[Umfassende Dokumentation](docs/)** - 97+ Dokumente zu allen Aspekten
- **[Entry Points](docs/entry-points/)** - Themenspezifische Anleitungen (Recording, Transcription, Enrichment, Storage, Troubleshooting)
- **[Fehlerbehebung](docs/entry-points/TROUBLESHOOTING.md)** - Häufige Probleme & Lösungen

## Community

- **[GitHub Discussions](https://github.com/fidpa/hablara/discussions)** - Fragen stellen, Ideen teilen
- **[Issue Tracker](https://github.com/fidpa/hablara/issues)** - Fehler melden, Features anfragen

## Bevor Sie ein Issue öffnen

1. **Bestehende Issues durchsuchen** - Ihre Frage wurde möglicherweise bereits beantwortet
2. **Dokumentation lesen** - Prüfen Sie die [Entry Points](docs/entry-points/) zu Ihrem Thema
3. **Fehlerbehebung versuchen** - Siehe [TROUBLESHOOTING.md](docs/entry-points/TROUBLESHOOTING.md)
4. **Details angeben** - Nutzen Sie Issue-Vorlagen (Umgebung, Reproduktionsschritte, Logs)

## Wie Sie Hilfe erhalten

### Fragen & Diskussionen

Nutzen Sie [GitHub Discussions](https://github.com/fidpa/hablara/discussions) für:
- "Wie mache ich...?"-Fragen
- Feature-Ideen
- Allgemeines Feedback

### Fehlerberichte

Nutzen Sie den [Issue Tracker](https://github.com/fidpa/hablara/issues/new?template=bug_report.md) für:
- Unerwartetes Verhalten
- Abstürze oder Fehler
- Performance-Probleme

**Bitte angeben:**
- Hablará-Version
- macOS-Version (Chip: M-Series vs Intel)
- Schritte zur Reproduktion
- Logs (Developer Tools Console: Cmd+Shift+I, Terminal-Ausgabe)

### Feature-Anfragen

Nutzen Sie den [Issue Tracker](https://github.com/fidpa/hablara/issues/new?template=feature_request.md) für:
- Neue Features
- Verbesserungen bestehender Features

## Sicherheitsprobleme

Erstellen Sie **KEINE** öffentlichen Issues für Sicherheitslücken.

Siehe [SECURITY.md](SECURITY.md) für den Prozess zur verantwortungsvollen Offenlegung.

## Antwortzeiten

Dies ist ein Challenge-Projekt mit begrenzten Ressourcen:
- **Issues:** Antwort innerhalb von 1-3 Tagen
- **PRs:** Review innerhalb von 1-3 Tagen
- **Sicherheit:** Bestätigung innerhalb von 48 Stunden (siehe [SECURITY.md](SECURITY.md))

## Häufige Probleme

### Audio-Aufnahmeprobleme
- **Mikrofon nicht erkannt:** Prüfen Sie Systemeinstellungen → Datenschutz & Sicherheit → Mikrofon
- **Kein Audio-Pegel:** App mit `pnpm dev:safe` neu starten
- **Siehe:** [TROUBLESHOOTING.md](docs/entry-points/TROUBLESHOOTING.md)

### Transkriptionsprobleme
- **Modell nicht gefunden:** Stellen Sie sicher, dass `ggml-german-turbo.bin` in `src-tauri/models/` existiert
- **MLX-Whisper schlägt fehl:** Normal, falls nicht konfiguriert - whisper.cpp ist der Standard
- **Siehe:** [TRANSCRIPTION.md](docs/entry-points/TRANSCRIPTION.md)

### LLM-Integrationsprobleme
- **Ollama antwortet nicht:** Prüfen Sie mit `ollama list`, ob Modelle angezeigt werden
- **OpenAI/Anthropic-Fehler:** Überprüfen Sie API-Schlüssel in `.env.local`
- **Siehe:** [ENRICHMENT.md](docs/entry-points/ENRICHMENT.md)

---

Vielen Dank, dass Sie Hablará nutzen!
