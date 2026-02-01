#!/bin/bash
# Hablará Icon Size Generator
# Converts 1024x1024 source icon to all macOS app icon sizes

set -e  # Exit on error

SOURCE="icons/hablara-icon-1024.png"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Hablará Icon Size Generator                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check if source file exists
if [ ! -f "$SOURCE" ]; then
  echo -e "${RED}Error: $SOURCE not found${NC}"
  echo ""
  echo "Please:"
  echo "1. Generate your icon in DALL-E (1024x1024)"
  echo "2. Save it as 'icons/hablara-icon-1024.png'"
  echo "3. Run this script again"
  echo ""
  exit 1
fi

# Check if imagemagick is installed
if ! command -v convert &> /dev/null; then
  echo -e "${RED}Error: ImageMagick not installed${NC}"
  echo ""
  echo "Install via Homebrew:"
  echo "  brew install imagemagick"
  echo ""
  exit 1
fi

echo "Source: $SOURCE"
echo "Generating icon sizes with Lanczos resampling + sharpening..."
echo ""

# High-quality resize function with Lanczos + Sharpening + RGBA
resize_hq() {
  local size=$1
  local output=$2
  magick "$SOURCE" \
    -alpha on \
    -background none \
    -filter Lanczos \
    -resize ${size}x${size} \
    -unsharp 0x1 \
    "$output"
}

# Generate all sizes with high-quality resampling
resize_hq 16 icons/16x16.png
echo -e "${GREEN}✓${NC} 16x16.png (Lanczos + Sharpen)"

resize_hq 32 icons/32x32.png
echo -e "${GREEN}✓${NC} 32x32.png (Lanczos + Sharpen)"

resize_hq 64 icons/64x64.png
echo -e "${GREEN}✓${NC} 64x64.png (Lanczos + Sharpen)"

resize_hq 128 icons/128x128.png
echo -e "${GREEN}✓${NC} 128x128.png (Lanczos + Sharpen)"

resize_hq 256 icons/128x128@2x.png
echo -e "${GREEN}✓${NC} 128x128@2x.png (Lanczos + Sharpen)"

resize_hq 256 icons/256x256.png
echo -e "${GREEN}✓${NC} 256x256.png (Lanczos + Sharpen)"

resize_hq 512 icons/256x256@2x.png
echo -e "${GREEN}✓${NC} 256x256@2x.png (Lanczos + Sharpen)"

resize_hq 512 icons/512x512.png
echo -e "${GREEN}✓${NC} 512x512.png (Lanczos + Sharpen)"

cp "$SOURCE" icons/512x512@2x.png
echo -e "${GREEN}✓${NC} 512x512@2x.png (copied original)"

echo ""
echo -e "${GREEN}✅ All icon sizes generated successfully!${NC}"
echo ""

# Optional: Generate .icns bundle for macOS
read -p "Generate macOS .icns bundle? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Creating .icns bundle..."

  # Create iconset directory
  mkdir -p icons/icon.iconset

  # Copy with Apple naming convention
  cp icons/16x16.png icons/icon.iconset/icon_16x16.png
  cp icons/32x32.png icons/icon.iconset/icon_16x16@2x.png
  cp icons/32x32.png icons/icon.iconset/icon_32x32.png
  cp icons/64x64.png icons/icon.iconset/icon_32x32@2x.png
  cp icons/128x128.png icons/icon.iconset/icon_128x128.png
  cp icons/256x256.png icons/icon.iconset/icon_128x128@2x.png
  cp icons/256x256.png icons/icon.iconset/icon_256x256.png
  cp icons/512x512.png icons/icon.iconset/icon_256x256@2x.png
  cp icons/512x512.png icons/icon.iconset/icon_512x512.png
  cp "$SOURCE" icons/icon.iconset/icon_512x512@2x.png

  # Convert to .icns
  iconutil -c icns icons/icon.iconset -o icons/icon.icns

  # Cleanup
  rm -rf icons/icon.iconset

  echo -e "${GREEN}✓${NC} macOS .icns bundle created: icons/icon.icns"
  echo ""
fi

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Next Steps:                                        ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  1. Verify icons in icons/ directory                ║"
echo "║  2. Update src-tauri/tauri.conf.json                ║"
echo "║  3. Rebuild app: npm run tauri build --debug        ║"
echo "║  4. Test in Dock, Finder, App Switcher              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
