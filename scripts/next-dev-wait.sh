#!/bin/bash
# Next.js Dev Server with Readiness Wait
# Used by tauri.conf.json beforeDevCommand
#
# Purpose: Ensures Next.js is fully compiled before Tauri loads WebView
#          Prevents "SyntaxError: Unexpected EOF" race condition
#          Checks for page.js (Next.js 14+ no longer generates layout.js)
#
# Exit Codes:
#   0 - Success (Next.js ready)
#   1 - Error (Next.js failed to start or timeout)

set -euo pipefail

# Constants
readonly SCRIPT_NAME="next-dev-wait"
readonly DEV_PORT=3000
readonly DEV_URL="http://localhost:$DEV_PORT"
readonly PAGE_FILE=".next/server/app/page.js"
readonly MAX_WAIT=120  # seconds
readonly POLL_INTERVAL=1  # seconds

# Track Next.js PID for cleanup
NEXT_PID=""

# Cleanup function - ensures Next.js is killed on exit/interrupt
cleanup() {
    local exit_code=$?
    if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "[$SCRIPT_NAME] Cleaning up Next.js process (PID: $NEXT_PID)..."
        kill "$NEXT_PID" 2>/dev/null || true
        # Wait briefly for graceful shutdown
        sleep 1
        # Force kill if still running
        if kill -0 "$NEXT_PID" 2>/dev/null; then
            kill -9 "$NEXT_PID" 2>/dev/null || true
        fi
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

# Check if port is already in use
if lsof -ti:"$DEV_PORT" >/dev/null 2>&1; then
    echo "[$SCRIPT_NAME] WARNING: Port $DEV_PORT already in use, killing existing process..."
    lsof -ti:"$DEV_PORT" | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start Next.js in background
echo "[$SCRIPT_NAME] Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

# Verify Next.js actually started
sleep 1
if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "[$SCRIPT_NAME] ERROR: Next.js failed to start!"
    exit 1
fi

echo "[$SCRIPT_NAME] Next.js started (PID: $NEXT_PID), waiting for compilation..."

# Wait for compilation to complete
WAITED=0
while [[ $WAITED -lt $MAX_WAIT ]]; do
    # Check if Next.js process is still alive
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "[$SCRIPT_NAME] ERROR: Next.js process died unexpectedly!"
        exit 1
    fi

    # Check readiness: HTTP 200 AND page.js exists with content
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEV_URL" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]] && [[ -s "$PAGE_FILE" ]]; then
        echo "[$SCRIPT_NAME] Next.js ready after ${WAITED}s (HTTP $HTTP_CODE, page.js exists)"
        break
    fi

    # Progress indicator every 10 seconds
    if [[ $((WAITED % 10)) -eq 0 ]] && [[ $WAITED -gt 0 ]]; then
        echo "[$SCRIPT_NAME] Still waiting... (${WAITED}s, HTTP: $HTTP_CODE)"
    fi

    sleep $POLL_INTERVAL
    WAITED=$((WAITED + POLL_INTERVAL))
done

# Check if we timed out
if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo "[$SCRIPT_NAME] WARNING: Timeout after ${MAX_WAIT}s, proceeding anyway"
    echo "[$SCRIPT_NAME] This may cause 'Unexpected EOF' errors in WebView"
fi

# Keep the script running (Next.js is in background)
# This allows Tauri to use this as beforeDevCommand
echo "[$SCRIPT_NAME] Handing off to Tauri..."
wait "$NEXT_PID"
