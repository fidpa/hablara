#!/bin/bash
# Complete macOS Icon Cache Cleanup for Tauri Apps
# Based on: https://developer.apple.com/forums/thread/676723

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Hablará - Complete Icon Cache Cleanup              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Clear global icon cache"
echo "  2. Clear user-specific icon caches"
echo "  3. Delete build artifacts"
echo "  4. Touch /Applications to force refresh"
echo "  5. Restart Dock and Finder"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "🗑️  Clearing icon caches (requires password)..."

# 1. Clear global icon service cache
sudo rm -rfv /Library/Caches/com.apple.iconservices.store

# 2. Clear user-specific caches
sudo find /private/var/folders/ \( \
  -name com.apple.dock.iconcache \
  -or -name com.apple.iconservices \
\) -exec rm -rfv {} \; 2>/dev/null || true

echo ""
echo "🗑️  Cleaning build artifacts..."

# 3. Delete Tauri build folder
rm -rf src-tauri/target

# 4. Delete Next.js build folder
rm -rf .next
rm -rf out

echo ""
echo "🔄  Forcing macOS to refresh app icons..."

# 5. Touch /Applications to force LaunchServices refresh
sudo touch /Applications/*

echo ""
echo "🔄  Restarting Dock and Finder..."

# 6. Restart Dock and Finder
sleep 3
killall Dock
killall Finder

echo ""
echo "✅ Icon cache cleared successfully!"
echo ""
echo "Next steps:"
echo "  1. Rebuild app: npm run tauri build --debug"
echo "  2. Open app from: src-tauri/target/debug/bundle/macos/"
echo "  3. New icon should appear in Dock"
echo ""
