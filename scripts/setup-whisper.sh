#!/bin/bash
# =============================================================================
# Whisper.cpp Setup Script for Hablará (Voice Intelligence Pipeline)
# =============================================================================
# Dieses Script:
# 1. Klont whisper.cpp
# 2. Kompiliert mit Metal Acceleration (M1/M2/M3/M4)
# 3. Laedt das gewuenschte Model herunter
# 4. Kopiert Binary und Model in src-tauri/
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safe word splitting

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BINARIES_DIR="$TAURI_DIR/binaries"
MODELS_DIR="$TAURI_DIR/models"
BUILD_DIR="$PROJECT_ROOT/.whisper-build"

# Default model (can be overridden via argument)
MODEL="${1:-base}"

# Validate model argument (large models excluded - too large for live transcription)
valid_models=("tiny" "tiny.en" "base" "base.en" "small" "small.en" "medium" "medium.en")
model_valid=false
for valid in "${valid_models[@]}"; do
    if [[ "$MODEL" == "$valid" ]]; then
        model_valid=true
        break
    fi
done

if [[ "$model_valid" == false ]]; then
    echo -e "${RED}Error: Invalid model '$MODEL'${NC}"
    echo "Valid models: ${valid_models[*]}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

log_info() {
    echo -e "    ${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Cleanup function for error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Build failed - cleaning up partial artifacts"
        [[ -d "$BUILD_DIR/build" ]] && rm -rf "$BUILD_DIR/build"
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is required but not installed."
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

log_step "Checking dependencies..."

check_dependency "git"
check_dependency "curl"

# Check for cmake (required for whisper.cpp build)
if ! command -v cmake &> /dev/null; then
    log_info "cmake not found, installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install cmake
    else
        log_error "cmake is required but not installed."
        echo "Install with: brew install cmake"
        exit 1
    fi
fi

# Check for Xcode Command Line Tools (needed for Metal)
if ! xcode-select -p &> /dev/null; then
    log_error "Xcode Command Line Tools not found."
    echo "Install with: xcode-select --install"
    exit 1
fi

log_info "All dependencies found"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    BINARY_NAME="whisper-aarch64-apple-darwin"
    log_info "Detected Apple Silicon (arm64) - Metal acceleration enabled"
elif [[ "$ARCH" == "x86_64" ]]; then
    BINARY_NAME="whisper-x86_64-apple-darwin"
    log_info "Detected Intel (x86_64)"
else
    log_error "Unsupported architecture: $ARCH"
    exit 1
fi

# -----------------------------------------------------------------------------
# Clone whisper.cpp
# -----------------------------------------------------------------------------

log_step "Setting up whisper.cpp..."

if [[ -d "$BUILD_DIR" ]]; then
    log_info "Build directory exists, updating..."
    cd "$BUILD_DIR"
    git pull --quiet
else
    log_info "Cloning whisper.cpp..."
    git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git "$BUILD_DIR"
    cd "$BUILD_DIR"
fi

# -----------------------------------------------------------------------------
# Build whisper.cpp
# -----------------------------------------------------------------------------

log_step "Building whisper.cpp with Metal acceleration..."

# Clean previous build
rm -rf build 2>/dev/null || true

# Build with cmake
if [[ "$ARCH" == "arm64" ]]; then
    # Metal acceleration for M1/M2/M3/M4
    cmake -B build -DGGML_METAL=ON -DCMAKE_BUILD_TYPE=Release
else
    # Standard build for Intel
    cmake -B build -DCMAKE_BUILD_TYPE=Release
fi

cmake --build build --config Release -j"$(sysctl -n hw.ncpu)"

# Verify build - binary is now in build/bin/
WHISPER_BIN="build/bin/whisper-cli"
if [[ ! -f "$WHISPER_BIN" ]]; then
    # Try alternative location
    WHISPER_BIN="build/bin/main"
    if [[ ! -f "$WHISPER_BIN" ]]; then
        log_error "Build failed - whisper binary not found"
        echo "Looked in: build/bin/whisper-cli and build/bin/main"
        ls -la build/bin/ 2>/dev/null || echo "build/bin/ does not exist"
        exit 1
    fi
fi

log_info "Build successful: $WHISPER_BIN"

# -----------------------------------------------------------------------------
# Download Model
# -----------------------------------------------------------------------------

log_step "Downloading Whisper model: $MODEL..."

# Use the built-in download script
bash ./models/download-ggml-model.sh "$MODEL"

MODEL_FILE="models/ggml-${MODEL}.bin"
if [[ ! -f "$MODEL_FILE" ]]; then
    log_error "Model download failed"
    exit 1
fi

MODEL_SIZE=$(du -h "$MODEL_FILE" | cut -f1)
log_info "Model downloaded: $MODEL_SIZE"

# -----------------------------------------------------------------------------
# Install to Tauri
# -----------------------------------------------------------------------------

log_step "Installing to Tauri..."

# Create directories
mkdir -p "$BINARIES_DIR"
mkdir -p "$MODELS_DIR"

# Copy binary with Tauri sidecar naming convention
# Tauri expects: name-target_triple (e.g., whisper-aarch64-apple-darwin)
cp "$WHISPER_BIN" "$BINARIES_DIR/$BINARY_NAME"
chmod +x "$BINARIES_DIR/$BINARY_NAME"
log_info "Binary installed: $BINARIES_DIR/$BINARY_NAME"

# Copy model
cp "$MODEL_FILE" "$MODELS_DIR/"
log_info "Model installed: $MODELS_DIR/ggml-${MODEL}.bin"

# -----------------------------------------------------------------------------
# Verify Installation
# -----------------------------------------------------------------------------

log_step "Verifying installation..."

# Test the binary
if "$BINARIES_DIR/$BINARY_NAME" --help &>/dev/null; then
    log_info "Binary verification: OK"
else
    log_error "Binary verification failed"
    exit 1
fi

# Check model file
if [[ -f "$MODELS_DIR/ggml-${MODEL}.bin" ]]; then
    log_info "Model verification: OK"
else
    log_error "Model file not found"
    exit 1
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Whisper Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installed components:"
echo "  Binary: $BINARIES_DIR/$BINARY_NAME"
echo "  Model:  $MODELS_DIR/ggml-${MODEL}.bin"
echo ""
echo "Model sizes reference:"
echo "  tiny   ~75 MB   (fastest, lowest quality)"
echo "  base   ~142 MB  (good balance)"
echo "  small  ~466 MB  (better quality)"
echo "  medium ~1.5 GB  (high quality, max recommended for live)"
echo ""
echo -e "To download additional models, run:"
echo -e "  ${YELLOW}./scripts/setup-whisper.sh <model-name>${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Run 'npm run tauri dev' to test"
echo "  2. The transcribe_audio command should now work"
echo ""
