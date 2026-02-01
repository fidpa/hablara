# Audio Sounds - DEPRECATED (Web Audio API Used)

⚠️ **This directory is NO LONGER USED for production sounds.**

## Current Implementation

Hablará uses **Web Audio API synthesis** for recording feedback sounds (start/stop beeps).

**Benefits:**
- ✅ Zero file dependencies (no MP3s needed)
- ✅ Professional quality with ADSR envelope
- ✅ ~1KB code vs ~50KB MP3 files
- ✅ Consistent cross-platform
- ✅ Runtime-generated, customizable

**Implementation:** `src/lib/audio-feedback.ts`

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

## Testing

```bash
# Run audio feedback tests
pnpm test src/__tests__/lib/audio-feedback.test.ts
```

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

## Development Scripts (Legacy)

**These scripts are ONLY for development/testing, NOT for production:**

```bash
# Generate basic test sounds (requires ffmpeg)
./scripts/generate-sounds.sh

# Download professional sounds (manual process)
./scripts/download-professional-sounds.sh
```

**For production DMG builds, the Web Audio API implementation is used automatically.**
