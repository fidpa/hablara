#!/bin/bash
# Uninstall Hablara Hotkey Agent
# Stops and removes the LaunchAgent

set -e

PLIST_NAME="de.hablara.hotkey-agent.plist"
LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCHAGENTS_DIR/$PLIST_NAME"

echo "[uninstall-agent] Uninstalling Hablara Hotkey Agent..."

# 1. Check if plist exists
if [ ! -f "$PLIST_PATH" ]; then
    echo "[uninstall-agent] Agent not installed (plist not found)"
    exit 0
fi

# 2. Stop the agent (ignore errors if not running)
echo "[uninstall-agent] Stopping agent..."
launchctl stop de.hablara.hotkey-agent 2>/dev/null || true

# 3. Unload the agent
echo "[uninstall-agent] Unloading agent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# 4. Remove plist
echo "[uninstall-agent] Removing plist..."
rm -f "$PLIST_PATH"

# 5. Verify it's gone
sleep 1
if launchctl list | grep -q "de.hablara.hotkey-agent"; then
    echo "[uninstall-agent] WARNING: Agent still listed. Try rebooting."
else
    echo "[uninstall-agent] ✓ Agent uninstalled successfully!"
fi
