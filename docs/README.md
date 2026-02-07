---
diataxis-type: reference
status: production
version: 1.0.4
last_updated: 2026-02-05
---

# Hablará Documentation

## Übersicht (20 words)

End-User Dokumentation fuer Hablará: Guides (Recording, Storage, FAQ), Reference (Hotkeys), Legal (Privacy, Licenses).

---

## Essential Context

> **DIATAXIS Category**: Reference (Navigation Hub)
> **Audience**: End-Users und Contributors

**Zweck**: Zentrale Navigation fuer alle End-User-Dokumentation (Guides, Reference, Legal).

**Scope**: 7 Dokumente in 4 Kategorien (Getting Started, Guides, Reference, Legal).

**Key Points**:
- Guides: Recording-Qualität, Storage-Management, FAQ
- Reference: Hotkey-Konfiguration
- Legal: Privacy, Support, Third-Party Licenses

**Quick Access**:
- [Schnelleinstieg](#schnelleinstieg)
- [Guides](#guides)
- [Reference](#reference)
- [Legal](#legal)

---

## Schnelleinstieg

| Ich möchte... | Dokument |
|---------------|----------|
| Hablará installieren | [../README.md](../README.md) (Haupt-README) |
| Linux-Probleme lösen | [guides/LINUX_TROUBLESHOOTING.md](./guides/LINUX_TROUBLESHOOTING.md) |
| Aufnahme-Qualität optimieren | [guides/RECORDING_QUALITY.md](./guides/RECORDING_QUALITY.md) |
| Aufnahmen verwalten | [guides/STORAGE.md](./guides/STORAGE.md) |
| Häufige Probleme lösen | [guides/FAQ.md](./guides/FAQ.md) |
| Ollama einrichten | [reference/OLLAMA_SETUP.md](./reference/OLLAMA_SETUP.md) |
| Hotkeys konfigurieren | [reference/HOTKEYS.md](./reference/HOTKEYS.md) |
| Rechtliche Informationen | [legal/](./legal/) |

---

## Struktur

```
docs/
├── getting-started/       # Tutorials – Schritt für Schritt lernen
├── guides/                # How-To – Spezifische Aufgaben lösen
│   ├── RECORDING_QUALITY.md   # LED-Meter, Mikrofon-Tipps, Speech Ratio
│   ├── STORAGE.md             # Aufnahmen verwalten, WAV-Export
│   ├── FAQ.md                 # 10 häufigste Probleme
│   └── LINUX_TROUBLESHOOTING.md  # Ubuntu/Linux Troubleshooting
├── reference/             # Reference – Technische Details
│   ├── OLLAMA_SETUP.md        # Ollama Setup Scripts (CLI-Referenz)
│   └── HOTKEYS.md             # Tastenkürzel & Konfiguration
└── legal/                 # Rechtliches – Privacy, Lizenzen, Support
    ├── PRIVACY.md
    ├── SUPPORT.md
    └── THIRD_PARTY_LICENSES.md
```

---

## Guides

- [Aufnahme-Qualität optimieren](./guides/RECORDING_QUALITY.md) - LED-Meter interpretieren, Mikrofon-Einstellungen, Speech Ratio
- [Aufnahmen verwalten](./guides/STORAGE.md) - Auto-Save, RecordingsLibrary, WAV-Export
- [FAQ](./guides/FAQ.md) - 10 häufigste Probleme und Lösungen
- [Linux Troubleshooting](./guides/LINUX_TROUBLESHOOTING.md) - Ubuntu 20.04+, .deb/.rpm Installation, AppImage, Audio, Hotkeys

---

## Reference

- [Ollama Setup Scripts](./reference/OLLAMA_SETUP.md) - CLI-Referenz für `--status`, `--diagnose`, `--cleanup`, Modell-Varianten
- [Hotkeys konfigurieren](./reference/HOTKEYS.md) - Tastenkürzel anpassen, Konflikte vermeiden

---

## Legal

- [Datenschutzerklärung](./legal/PRIVACY.md)
- [Support & Kontakt](./legal/SUPPORT.md)
- [Drittanbieter-Lizenzen](./legal/THIRD_PARTY_LICENSES.md)

---

## Cross-References

### Project Documentation
- **[../README.md](../README.md)** - Haupt-README mit Installation
- **[../CLAUDE.md](../CLAUDE.md)** - Projekt-Einstiegspunkt

---

**Version**: 1.0.4
**Created**: 28. Januar 2026
**Last Updated**: 5. Februar 2026
**Status**: Production
