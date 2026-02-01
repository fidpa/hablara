#!/bin/bash
# Install Hablara Hotkey Agent as LaunchAgent
# Copies plist to ~/Library/LaunchAgents/ and starts the agent

set -e

PLIST_NAME="de.hablara.hotkey-agent.plist"
LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LAUNCHAGENTS_DIR/$PLIST_NAME"

# Source paths (from app bundle)
APP_BUNDLE="/Applications/Hablará.app"
PLIST_SOURCE="$APP_BUNDLE/Contents/Resources/hablara-agent/$PLIST_NAME"
AGENT_BINARY="$APP_BUNDLE/Contents/MacOS/hablara-agent"

echo "[install-agent] Installing Hablara Hotkey Agent..."

# 1. Check if app bundle exists
if [ ! -d "$APP_BUNDLE" ]; then
    echo "[install-agent] ERROR: Hablara.app not found at: $APP_BUNDLE"
    echo "[install-agent] Please install Hablara first."
    exit 1
fi

# 2. Check if agent binary exists
if [ ! -f "$AGENT_BINARY" ]; then
    echo "[install-agent] ERROR: Agent binary not found at: $AGENT_BINARY"
    echo "[install-agent] Please rebuild the app."
    exit 1
fi

# 3. Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCHAGENTS_DIR"

# 4. Check if plist source exists
if [ ! -f "$PLIST_SOURCE" ]; then
    echo "[install-agent] ERROR: plist not found at: $PLIST_SOURCE"
    echo "[install-agent] Please rebuild the app."
    exit 1
fi

# 5. Copy plist to LaunchAgents
echo "[install-agent] Copying plist to: $PLIST_DEST"
cp "$PLIST_SOURCE" "$PLIST_DEST"

# 6. Unload if already loaded (ignore errors)
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# 7. Load the agent
echo "[install-agent] Loading agent..."
launchctl load "$PLIST_DEST"

# 8. Start the agent
echo "[install-agent] Starting agent..."
launchctl start de.hablara.hotkey-agent

# 9. Verify it's running
sleep 1
if launchctl list | grep -q "de.hablara.hotkey-agent"; then
    echo "[install-agent] ✓ Agent installed and running!"
    echo "[install-agent] Press Ctrl+Shift+D to launch Hablara (even when app is closed)"
    echo "[install-agent] Logs: /tmp/hablara-agent.log"
else
    echo "[install-agent] WARNING: Agent loaded but not running. Check permissions."
    echo "[install-agent] Go to System Settings > Privacy & Security > Input Monitoring"
    echo "[install-agent] Enable 'hablara-agent' to allow hotkey detection"
fi
