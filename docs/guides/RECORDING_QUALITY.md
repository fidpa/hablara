# Aufnahme-Qualität optimieren

Wie Sie optimale Audio-Qualität für präzise Transkription und Analyse erreichen.

---

## LED-Level-Meter interpretieren

Das Level-Meter zeigt den Audio-Pegel in Echtzeit mit 10 Segmenten:

```
[■][■][■][■][■][■][□][□][□][□]
 └──────────┘ └──┘ └──────┘
   Grün (6)   Orange(2)  Rot(2)
   0-60%      60-80%     80-100%
```

| Zone | Segmente | Bedeutung | Aktion |
|------|----------|-----------|--------|
| 🟢 Grün | 1-6 | Optimal | Beibehalten |
| 🟠 Orange | 7-8 | Laut | Etwas leiser sprechen |
| 🔴 Rot | 9-10 | Zu laut (Clipping) | Abstand erhöhen oder leiser |

**Ziel:** 4-6 grüne Segmente bei normalem Sprechen.

---

## Mikrofon-Einstellungen

| Aspekt | Empfehlung |
|--------|------------|
| **Abstand** | 15-30 cm zum Mikrofon |
| **Winkel** | Leicht seitlich (reduziert Plosive) |
| **Umgebung** | Ruhig, wenig Nachhall |
| **Position** | Mikrofon auf Mundhöhe |

### Häufige Probleme

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Level-Meter zeigt 0 | Mikrofon-Permission fehlt | Systemeinstellungen → Datenschutz → Mikrofon |
| Immer im roten Bereich | Zu nah am Mikrofon | Abstand auf 20-30 cm erhöhen |
| Nur 1-2 Segmente | Zu leise/weit weg | Näher ans Mikrofon oder lauter sprechen |
| Schwankende Pegel | Kopfbewegungen | Position beibehalten |

---

## Transkriptions-Qualität prüfen

### Speech Ratio (VAD)

Die Speech Ratio zeigt, wie viel der Aufnahme als Sprache erkannt wurde:

| Speech Ratio | Bewertung | Bedeutung |
|--------------|-----------|-----------|
| >80% | Sehr gut | Fast nur Sprache |
| 60-80% | Gut | Normale Pausen |
| 30-60% | Akzeptabel | Viele Pausen oder leise Passagen |
| <30% | Problematisch | Zu leise, zu viel Hintergrund |

**Niedrige Speech Ratio beheben:**
- Lauter und deutlicher sprechen
- Hintergrundgeräusche reduzieren
- Mikrofon näher positionieren

---

## Checkliste vor der Aufnahme

- [ ] Mikrofon angeschlossen und ausgewählt
- [ ] Ruhige Umgebung
- [ ] Test-Aufnahme: 4-6 grüne Segmente
- [ ] Keine anderen Apps mit Mikrofon-Zugriff

---

## Siehe auch

- [FAQ](./FAQ.md) - Häufige Probleme lösen
- [Hotkeys konfigurieren](../reference/HOTKEYS.md) - Tastenkürzel anpassen
