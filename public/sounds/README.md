---
diataxis-type: reference
status: production
version: 1.0.0
last_updated: 2026-02-04
---

# Audio Sounds - Web Audio API Implementation

## TL;DR (20 words)

Recording-Feedback-Sounds werden via Web Audio API synthetisiert (880Hz Start, 440Hz Stop) - keine externen Dateien noetig.

---

## Essential Context

> **DIATAXIS Category**: Reference (Information-Oriented)
> **Audience**: Entwickler, die Audio-Feedback verstehen oder anpassen wollen

**Zweck**: Dokumentiert die Web Audio API Implementierung fuer Recording Start/Stop Sounds.

**Scope**: Sound-Spezifikationen, Implementation, Testing.

**Key Points**:
- Zero file dependencies (kein MP3 noetig)
- ~1KB Code vs ~50KB MP3 files
- ADSR Envelope fuer professionelle Qualitaet

**Quick Access**:
- [Sound Specifications](#sound-specifications)
- [Implementation](#implementation)
- [Testing](#testing)

---

## Current Implementation

Hablará verwendet **Web Audio API Synthese** fuer Recording-Feedback-Sounds.

**Benefits:**
- Zero file dependencies (keine MP3s noetig)
- Professionelle Qualitaet mit ADSR Envelope
- ~1KB Code vs ~50KB MP3 Dateien
- Konsistent cross-platform
- Runtime-generiert, anpassbar

**Implementation:** `src/lib/audio-feedback.ts`

---

## Sound Specifications

**Start Sound:**
- Frequency: 880 Hz (A5 - bright, attention-grabbing)
- Duration: 80ms
- Volume: 30% * user preference
- Envelope: 5ms attack, 20ms release
- Type: Sine wave (clean tone)

**Stop Sound:**
- Frequency: 440 Hz (A4 - one octave lower, calming)
- Duration: 120ms
- Volume: 25% * user preference
- Envelope: 5ms attack, 40ms release
- Type: Sine wave

---

## Testing

```bash
# Run audio feedback tests
pnpm test src/__tests__/lib/audio-feedback.test.ts
```

---

## Migration Notes

**Before (MP3-based):**
- Required external sound files (`start.mp3`, `stop.mp3`)
- Dependencies: ffmpeg OR manual downloads
- File size: ~50-100KB
- Licensing concerns (CC0/CC-BY attribution)

**After (Web Audio API):**
- Zero external dependencies
- Code-based implementation (~1KB)
- No licensing issues (own code)
- Better customization (parameters in code)

---

## Cross-References

### Implementation
- **[src/lib/audio-feedback.ts](../../src/lib/audio-feedback.ts)** - Web Audio API Implementation

### Project Documentation
- **[../../CLAUDE.md](../../CLAUDE.md)** - Projekt-Einstiegspunkt

---

**Version**: 1.0.0
**Created**: 28. Januar 2026
**Last Updated**: 4. Februar 2026
**Status**: Production
