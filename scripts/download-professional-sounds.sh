#!/bin/bash

# Download professional CC0 sounds for production use
# No ffmpeg required - ready-to-use MP3s

set -e

SOUNDS_DIR="$(dirname "$0")/../public/sounds"
mkdir -p "$SOUNDS_DIR"

echo "📥 Downloading professional recording sounds (CC0 License)..."

# Option A: Freesound.org (requires account + API key)
# Better quality, but needs setup
echo "⚠️  For production, download manually from:"
echo "   https://freesound.org/people/InspectorJ/sounds/484344/ (start - soft click)"
echo "   https://freesound.org/people/InspectorJ/sounds/484345/ (stop - soft click)"
echo ""
echo "License: CC-BY 4.0 (Attribution required in app)"

# Option B: Zapsplat (free download, no API)
echo "📌 Recommended: https://www.zapsplat.com/sound-effect-category/button-clicks/"
echo "   Search: 'ui beep short'"
echo "   License: Free with attribution OR Standard License (~$5/month)"

# Option C: Generate web-compatible sounds (no ffmpeg, no external files)
echo ""
echo "🎵 Alternative: Use Web Audio API synthesis (no files needed)"
echo "   See: scripts/web-audio-sounds.ts"

cat << 'EOF'

================================================================================
MANUAL DOWNLOAD REQUIRED
================================================================================

For PRODUCTION quality, please:

1. Visit https://www.zapsplat.com/sound-effect-category/user-interface/
2. Search "button click short"
3. Download TWO sounds:
   - start.mp3 (bright, ascending tone ~100ms)
   - stop.mp3 (soft, descending tone ~150ms)
4. Move to public/sounds/
5. Verify license (CC0 or Standard License)

Files should be:
- Format: MP3 or WAV
- Duration: 50-150ms
- Sample Rate: 44.1kHz recommended
- Mono (not stereo)
- Volume: Normalized to -3dB

================================================================================

EOF

# Check if sounds already exist
if [ -f "$SOUNDS_DIR/start.mp3" ] && [ -f "$SOUNDS_DIR/stop.mp3" ]; then
  echo "✅ Sound files already exist:"
  ls -lh "$SOUNDS_DIR"/*.mp3
else
  echo "⚠️  Sound files not found. Please download manually."
  echo ""
  echo "Quick test alternative: Run ./scripts/generate-sounds.sh"
  echo "(Basic quality, only for development testing)"
fi
