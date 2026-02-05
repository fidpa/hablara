#!/bin/bash
#
# Whisper.cpp Setup Script for Hablará - macOS
#
# Usage: ./setup-whisper.sh [model]
#   model: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en
#
# Exit codes: 0=Success, 1=Dependencies, 2=Build, 3=Model

set -euo pipefail
IFS=$'\n\t'

if [[ -t 1 ]]; then
    RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BLUE='\033[0;34m' NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BINARIES_DIR="$TAURI_DIR/binaries"
MODELS_DIR="$TAURI_DIR/models"
BUILD_DIR="$PROJECT_ROOT/.whisper-build"

MODEL="${1:-base}"

valid_models=("tiny" "tiny.en" "base" "base.en" "small" "small.en" "medium" "medium.en")
model_valid=false
for valid in "${valid_models[@]}"; do [[ "$MODEL" == "$valid" ]] && model_valid=true && break; done
[[ "$model_valid" == false ]] && { echo -e "${RED}✗ Invalid model '$MODEL'${NC}"; echo "Valid: ${valid_models[*]}"; exit 1; }

# ============================================================================
# Helper Functions
# ============================================================================

log_step() { echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"; }
log_info() { echo -e "    ${YELLOW}•${NC} $1"; }
log_success() { echo -e "    ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "    ${YELLOW}⚠${NC} $1" >&2; }
log_error() { echo -e "${RED}✗ Error: $1${NC}" >&2; }

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Build failed - cleaning up"
        local lock_file="$BUILD_DIR/.cleanup.lock"
        if mkdir "$lock_file" 2>/dev/null; then
            rm -rf "$BUILD_DIR/build" 2>/dev/null || true
            rmdir "$lock_file" 2>/dev/null
        fi
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

check_dependency() { command -v "$1" &> /dev/null || { log_error "$1 is required but not installed."; exit 1; }; }

# ============================================================================
# Pre-flight Checks
# ============================================================================

log_step "Checking dependencies..."

check_dependency "git"
check_dependency "curl"

if ! command -v cmake &> /dev/null; then
    log_info "cmake not found, installing via Homebrew..."
    command -v brew &> /dev/null && brew install cmake || { log_error "cmake required - install with: brew install cmake"; exit 1; }
fi

xcode-select -p &> /dev/null || { log_error "Xcode Command Line Tools required: xcode-select --install"; exit 1; }

log_success "All dependencies found"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    BINARY_NAME="whisper-aarch64-apple-darwin"
    log_info "Apple Silicon (arm64) - Metal acceleration enabled"
elif [[ "$ARCH" == "x86_64" ]]; then
    BINARY_NAME="whisper-x86_64-apple-darwin"
    log_info "Intel (x86_64)"
else
    log_error "Unsupported architecture: $ARCH"
    exit 1
fi

# ============================================================================
# Clone whisper.cpp
# ============================================================================

log_step "Setting up whisper.cpp..."

if [[ -d "$BUILD_DIR" ]]; then
    log_info "Updating existing repository..."
    cd "$BUILD_DIR"

    # Supply chain attack prevention
    EXPECTED_REMOTE="https://github.com/ggml-org/whisper.cpp.git"
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    [[ "$CURRENT_REMOTE" != "$EXPECTED_REMOTE" ]] && {
        log_error "Unexpected git remote: $CURRENT_REMOTE"
        exit 1
    }
    git -c http.sslVerify=true pull --quiet
else
    log_info "Cloning whisper.cpp..."
    git -c http.sslVerify=true clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$BUILD_DIR"
    cd "$BUILD_DIR"
fi

# ============================================================================
# Build whisper.cpp
# ============================================================================

log_step "Building whisper.cpp with Metal acceleration..."

rm -rf build 2>/dev/null || true

if [[ "$ARCH" == "arm64" ]]; then
    cmake -B build -DGGML_METAL=ON -DCMAKE_BUILD_TYPE=Release
else
    cmake -B build -DCMAKE_BUILD_TYPE=Release
fi

cmake --build build --config Release -j"$(sysctl -n hw.ncpu)"

WHISPER_BIN="build/bin/whisper-cli"
[[ ! -f "$WHISPER_BIN" ]] && WHISPER_BIN="build/bin/main"
[[ ! -f "$WHISPER_BIN" ]] && { log_error "Build failed - binary not found"; ls -la build/bin/ 2>/dev/null || true; exit 1; }

log_success "Build successful: $WHISPER_BIN"

# ============================================================================
# Download Model
# ============================================================================

log_step "Downloading model: $MODEL..."

bash ./models/download-ggml-model.sh "$MODEL"

MODEL_FILE="models/ggml-${MODEL}.bin"

# Path traversal prevention
CANONICAL_MODEL_PATH=$(realpath -m "$MODEL_FILE" 2>/dev/null || echo "$MODEL_FILE")
CANONICAL_MODELS_DIR=$(realpath -m "$BUILD_DIR/models" 2>/dev/null || echo "$BUILD_DIR/models")
[[ "$CANONICAL_MODEL_PATH" != "$CANONICAL_MODELS_DIR"* ]] && { log_error "Path traversal detected"; exit 1; }

[[ ! -f "$MODEL_FILE" ]] && { log_error "Model download failed"; exit 1; }

MODEL_SIZE=$(du -h "$MODEL_FILE" | cut -f1)
log_success "Model downloaded: $MODEL_SIZE"

# ============================================================================
# Install to Tauri
# ============================================================================

log_step "Installing to Tauri..."

mkdir -p "$BINARIES_DIR" "$MODELS_DIR"

cp "$WHISPER_BIN" "$BINARIES_DIR/$BINARY_NAME"
chmod +x "$BINARIES_DIR/$BINARY_NAME"
log_success "Binary: $BINARIES_DIR/$BINARY_NAME"

cp "$MODEL_FILE" "$MODELS_DIR/"
log_success "Model: $MODELS_DIR/ggml-${MODEL}.bin"

# ============================================================================
# Verification
# ============================================================================

log_step "Verifying installation..."

"$BINARIES_DIR/$BINARY_NAME" --help &>/dev/null && log_success "Binary: OK" || { log_error "Binary verification failed"; exit 1; }
[[ -f "$MODELS_DIR/ggml-${MODEL}.bin" ]] && log_success "Model: OK" || { log_error "Model not found"; exit 1; }

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Whisper Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installed:"
echo "  Binary: $BINARIES_DIR/$BINARY_NAME"
echo "  Model:  $MODELS_DIR/ggml-${MODEL}.bin"
echo ""
echo "Models: tiny(75MB) base(142MB) small(466MB) medium(1.5GB)"
echo ""
echo -e "Additional models: ${YELLOW}./scripts/setup-whisper.sh <model>${NC}"
echo ""
echo -e "${BLUE}Next: pnpm run tauri dev${NC}"
echo ""
