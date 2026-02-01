#!/bin/bash

# Generate simple beep sounds for recording feedback
# Requires ffmpeg: brew install ffmpeg

set -e

SOUNDS_DIR="$(dirname "$0")/../public/sounds"
mkdir -p "$SOUNDS_DIR"

echo "Generating start.mp3..."
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.1" -af "volume=0.3" -y "$SOUNDS_DIR/start.mp3"

echo "Generating stop.mp3..."
ffmpeg -f lavfi -i "sine=frequency=400:duration=0.15" -af "volume=0.3" -y "$SOUNDS_DIR/stop.mp3"

echo "✅ Sound files generated successfully"
ls -lh "$SOUNDS_DIR"/*.mp3
