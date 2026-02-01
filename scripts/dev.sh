#!/bin/bash
# Hablará Development Script - Unified entry point
# Usage: ./scripts/dev.sh [--clean|--ultra] [--no-start]
#
# Modes:
#   (default)  safe  - Kill processes + clean Next.js cache
#   --clean    clean - + clear WebView cache
#   --ultra    ultra - + rebuild Rust target + node_modules (~2-3min)
#
# Flags:
#   --no-start       - Run cleanup only, don't start app
#
# Exit Codes:
#   0 - Success
#   1 - Error (invalid flags, wrong directory, npm install failed)

set -euo pipefail

# Constants
SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
readonly DEV_PORT=3000
readonly HABLARA_PROCESS_PATTERN="target/debug/hablara"
readonly NEXT_SERVER_PATTERN="next-server"

# Cleanup function for graceful shutdown
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        echo ""
        echo "[$SCRIPT_NAME] Interrupted or failed (exit code: $exit_code)"
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

# Validate working directory
if [[ ! -f "package.json" ]] || [[ ! -d "src-tauri" ]]; then
    echo "ERROR: Must be run from Hablará project root (where package.json and src-tauri/ exist)"
    exit 1
fi

# Parse flags
MODE="safe"
NO_START=false
for arg in "$@"; do
    case $arg in
        --clean) MODE="clean" ;;
        --ultra) MODE="ultra" ;;
        --no-start) NO_START=true ;;
        -h|--help)
            echo "Usage: $SCRIPT_NAME [--clean|--ultra] [--no-start]"
            echo ""
            echo "Modes:"
            echo "  (default)  Kill processes + clean Next.js cache (~5s)"
            echo "  --clean    + clear WebView cache (~7s)"
            echo "  --ultra    + rebuild Rust + node_modules (~2-3min)"
            echo ""
            echo "Flags:"
            echo "  --no-start  Run cleanup only, don't start app"
            echo "  -h, --help  Show this help"
            exit 0
            ;;
        *)
            echo "ERROR: Unknown flag: $arg"
            echo "Usage: $SCRIPT_NAME [--clean|--ultra] [--no-start]"
            exit 1
            ;;
    esac
done

echo "=== Hablará DEV ($MODE) ==="
[[ "$MODE" == "ultra" ]] && echo "WARNING: Ultra mode rebuilds node_modules (~2-3min)"
echo ""

# Track current step for dynamic numbering
STEP=1

# Helper function for step output
step() {
    echo "[$STEP] $1"
    STEP=$((STEP + 1))
}

# [1] Kill existing processes
step "Killing Hablará processes..."
pkill -9 -f "$HABLARA_PROCESS_PATTERN" 2>/dev/null || true
pkill -9 -f "$NEXT_SERVER_PATTERN" 2>/dev/null || true
# Kill process on dev port (more precise than generic node pattern)
lsof -ti:"$DEV_PORT" | xargs kill -9 2>/dev/null || true

# Verify processes killed (for clean/ultra - more thorough)
if [[ "$MODE" != "safe" ]]; then
    sleep 1
    if pgrep -f "$HABLARA_PROCESS_PATTERN" >/dev/null 2>&1; then
        echo "  Hablará process still running - force kill retry"
        pkill -9 -f "$HABLARA_PROCESS_PATTERN" 2>/dev/null || true
        sleep 1
    fi
    if pgrep -f "$NEXT_SERVER_PATTERN" >/dev/null 2>&1; then
        echo "  Next.js process still running - force kill retry"
        pkill -9 -f "$NEXT_SERVER_PATTERN" 2>/dev/null || true
        sleep 1
    fi
else
    sleep 2
fi
echo "  Done"

# [2] Clean Next.js cache (all modes)
step "Removing Next.js cache..."
NEXTJS_CLEARED=0
[[ -d ".next" ]] && { rm -rf .next; NEXTJS_CLEARED=$((NEXTJS_CLEARED + 1)); }
[[ -d "out" ]] && { rm -rf out; NEXTJS_CLEARED=$((NEXTJS_CLEARED + 1)); }
[[ -d "node_modules/.cache" ]] && { rm -rf node_modules/.cache; NEXTJS_CLEARED=$((NEXTJS_CLEARED + 1)); }
echo "  Cleared $NEXTJS_CLEARED location(s)"

# [3] Clear WebView cache (clean + ultra)
if [[ "$MODE" != "safe" ]]; then
    step "Clearing WebView cache..."
    CACHE_COUNT=0
    case "$(uname)" in
        Darwin)
            if ls ~/Library/WebKit/vip* >/dev/null 2>&1; then
                rm -rf ~/Library/WebKit/vip* 2>/dev/null || true
                CACHE_COUNT=$((CACHE_COUNT + 1))
            fi
            if ls ~/Library/Caches/vip* >/dev/null 2>&1; then
                rm -rf ~/Library/Caches/vip* 2>/dev/null || true
                CACHE_COUNT=$((CACHE_COUNT + 1))
            fi
            echo "  Cleared $CACHE_COUNT location(s) (macOS)"
            ;;
        Linux)
            if ls ~/.cache/vip* >/dev/null 2>&1; then
                rm -rf ~/.cache/vip* 2>/dev/null || true
                CACHE_COUNT=$((CACHE_COUNT + 1))
            fi
            if ls ~/.local/share/vip* >/dev/null 2>&1; then
                rm -rf ~/.local/share/vip* 2>/dev/null || true
                CACHE_COUNT=$((CACHE_COUNT + 1))
            fi
            echo "  Cleared $CACHE_COUNT location(s) (Linux)"
            ;;
        *)
            echo "  Unknown OS ($(uname)) - WebView cache skipped"
            ;;
    esac
fi

# [4] Remove Rust target (ultra only)
if [[ "$MODE" == "ultra" ]]; then
    step "Removing Rust build cache..."
    if [[ -d "src-tauri/target" ]]; then
        RUST_SIZE=$(du -sh src-tauri/target 2>/dev/null | cut -f1 || echo "unknown")
        rm -rf src-tauri/target
        echo "  Cleared src-tauri/target ($RUST_SIZE)"
    else
        echo "  No Rust cache found"
    fi
fi

# [5] Reinstall node_modules (ultra only)
if [[ "$MODE" == "ultra" ]]; then
    step "Removing node_modules..."
    if [[ -d "node_modules" ]]; then
        rm -rf node_modules
        echo "  Removed"
    else
        echo "  Already removed"
    fi

    step "Reinstalling dependencies..."
    if pnpm install; then
        echo "  Dependencies installed successfully"
    else
        echo "ERROR: pnpm install failed!"
        echo "Try running manually: pnpm install"
        exit 1
    fi
fi

echo ""
echo "=== DEV-$MODE COMPLETE ==="
echo ""

# Start app (unless --no-start)
if [[ "$NO_START" == "true" ]]; then
    echo "Cache cleared. App not started (--no-start flag)"
    exit 0
fi

echo "Starting Hablará in development mode..."
exec pnpm run tauri dev
