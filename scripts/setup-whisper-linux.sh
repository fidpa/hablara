#!/bin/bash
# =============================================================================
# Whisper.cpp Setup Script for Hablará (Voice Intelligence Pipeline) - Linux
# =============================================================================
# Dieses Script:
# 1. Klont whisper.cpp
# 2. Kompiliert mit cmake (optional CUDA für NVIDIA GPUs)
# 3. Laedt das gewuenschte Model herunter
# 4. Kopiert Binary und Model in src-tauri/
# =============================================================================
#
# Usage:
#   ./setup-whisper-linux.sh [model] [cuda]
#
# Arguments:
#   model - Model name (default: base)
#           Valid: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en
#   cuda  - Enable CUDA acceleration (default: false)
#           Set to "true" for NVIDIA GPU acceleration
#
# Examples:
#   ./setup-whisper-linux.sh                # base model, CPU only
#   ./setup-whisper-linux.sh small          # small model, CPU only
#   ./setup-whisper-linux.sh base true      # base model with CUDA
#
# Exit codes:
#   0 - Success
#   1 - Missing dependencies
#   2 - Build failed
#   3 - Model download failed
#   4 - Installation failed
#   5 - Verification failed
#   6 - Insufficient resources
#
# Version: 1.0.0
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safe word splitting

# Colors for output (with fallback for non-TTY)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BINARIES_DIR="$TAURI_DIR/binaries"
MODELS_DIR="$TAURI_DIR/models"
BUILD_DIR="$PROJECT_ROOT/.whisper-build"

# Arguments
MODEL="${1:-base}"
ENABLE_CUDA="${2:-false}"

# Validate model argument
valid_models=("tiny" "tiny.en" "base" "base.en" "small" "small.en" "medium" "medium.en")
model_valid=false
for valid in "${valid_models[@]}"; do
    if [[ "$MODEL" == "$valid" ]]; then
        model_valid=true
        break
    fi
done

if [[ "$model_valid" == false ]]; then
    echo -e "${RED}✗ Error: Invalid model '$MODEL'${NC}"
    echo "Valid models: ${valid_models[*]}"
    exit 1
fi

# Validate CUDA argument
if [[ "$ENABLE_CUDA" != "true" && "$ENABLE_CUDA" != "false" ]]; then
    echo -e "${RED}✗ Error: CUDA argument must be 'true' or 'false', got: '$ENABLE_CUDA'${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

log_info() {
    echo -e "    ${YELLOW}•${NC} $1"
}

log_success() {
    echo -e "    ${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "    ${YELLOW}⚠${NC} $1" >&2
}

log_error() {
    echo -e "${RED}✗ Error: $1${NC}" >&2
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
        return 1
    fi
    return 0
}

# Get Linux distribution name
get_distro() {
    if [[ -f /etc/os-release ]]; then
        # Parse instead of sourcing for security
        grep -E "^ID=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "unknown"
    else
        echo "unknown"
    fi
}

# Get package manager based on distribution
get_package_manager() {
    local distro
    distro=$(get_distro)

    case "$distro" in
        ubuntu|debian|linuxmint|pop)
            echo "apt"
            ;;
        fedora|rhel|centos|rocky|almalinux)
            echo "dnf"
            ;;
        arch|manjaro|endeavouros)
            echo "pacman"
            ;;
        opensuse*|suse)
            echo "zypper"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Get free disk space in GB
get_free_space_gb() {
    local path="${1:-$HOME}"
    local free_space

    # Linux: df -BG outputs in gigabytes with 'G' suffix
    free_space=$(df -BG "$path" 2>/dev/null | tail -1 | awk '{print $4}')

    # Strip 'G' suffix
    free_space="${free_space%G}"

    # Validate numeric
    if ! [[ "$free_space" =~ ^[0-9]+$ ]]; then
        echo "0"
        return
    fi

    echo "$free_space"
}

# Get available RAM in GB
get_ram_gb() {
    local ram_kb
    ram_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')

    # Validate numeric
    if [[ -n "$ram_kb" ]] && [[ "$ram_kb" =~ ^[0-9]+$ ]]; then
        echo $(( ram_kb / 1024 / 1024 ))
    else
        echo "0"
    fi
}

# Get file size in bytes
get_file_size() {
    local file="$1"
    stat -c%s "$file" 2>/dev/null || echo "0"
}

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

log_step "Checking system requirements..."

# Detect distribution
DISTRO=$(get_distro)
PKG_MANAGER=$(get_package_manager)
log_info "Distribution: ${DISTRO}"
log_info "Package Manager: ${PKG_MANAGER}"

# Check architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        BINARY_NAME="whisper-x86_64-unknown-linux-gnu"
        log_info "Architecture: x86_64 (64-bit)"
        ;;
    aarch64|arm64)
        BINARY_NAME="whisper-aarch64-unknown-linux-gnu"
        log_info "Architecture: ARM64"
        ;;
    *)
        log_error "Unsupported architecture: $ARCH"
        log_info "Supported: x86_64, aarch64"
        exit 1
        ;;
esac

# Check disk space (minimum 5GB for build + models)
FREE_SPACE=$(get_free_space_gb "$HOME")
if [[ $FREE_SPACE -lt 5 ]]; then
    log_error "Insufficient disk space"
    log_info "Required: 5GB, Available: ${FREE_SPACE}GB"
    exit 6
fi
log_success "Disk space: ${FREE_SPACE}GB available"

# Check RAM (warn if < 4GB for medium/large models)
RAM_GB=$(get_ram_gb)
if [[ "$MODEL" == "medium" || "$MODEL" == "medium.en" ]] && [[ $RAM_GB -lt 4 ]]; then
    log_warn "Low RAM (${RAM_GB}GB) detected - medium model may be slow"
    log_info "Consider using 'small' or 'base' model instead"
fi

# Check CUDA availability if requested
CUDA_AVAILABLE=false
CUDA_VERSION=""
if [[ "$ENABLE_CUDA" == "true" ]]; then
    if command -v nvcc &> /dev/null; then
        CUDA_VERSION=$(nvcc --version 2>/dev/null | grep "release" | sed -n 's/.*release \([0-9.]*\).*/\1/p')
        if [[ -n "$CUDA_VERSION" ]]; then
            CUDA_AVAILABLE=true
            log_success "CUDA detected: ${CUDA_VERSION}"
        else
            log_warn "nvcc found but version detection failed"
        fi
    else
        log_warn "CUDA requested but nvcc not found - falling back to CPU"
        log_info "Install CUDA Toolkit: https://developer.nvidia.com/cuda-downloads"
    fi
fi

# Check dependencies
log_step "Checking dependencies..."

MISSING_DEPS=()

if ! check_dependency "git"; then
    MISSING_DEPS+=("git")
fi

if ! check_dependency "curl"; then
    MISSING_DEPS+=("curl")
fi

if ! check_dependency "cmake"; then
    MISSING_DEPS+=("cmake")
fi

# Check for build tools
if ! check_dependency "gcc" && ! check_dependency "clang"; then
    MISSING_DEPS+=("build-essential")  # Ubuntu/Debian
fi

if ! check_dependency "make"; then
    MISSING_DEPS+=("make")
fi

# If dependencies are missing, provide installation instructions
if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
    log_error "Missing dependencies: ${MISSING_DEPS[*]}"
    echo ""
    echo "Installation instructions by distribution:"
    echo ""

    case "$PKG_MANAGER" in
        apt)
            echo "  Ubuntu/Debian:"
            echo "    sudo apt-get update"
            echo "    sudo apt-get install -y git curl cmake build-essential"
            ;;
        dnf)
            echo "  Fedora/RHEL:"
            echo "    sudo dnf install -y git curl cmake gcc-c++ make"
            ;;
        pacman)
            echo "  Arch Linux:"
            echo "    sudo pacman -S git curl cmake base-devel"
            ;;
        zypper)
            echo "  openSUSE:"
            echo "    sudo zypper install -y git curl cmake gcc-c++ make"
            ;;
        *)
            echo "  Unknown distribution - please install manually:"
            echo "    - git"
            echo "    - curl"
            echo "    - cmake"
            echo "    - C++ compiler (gcc/g++ or clang)"
            echo "    - make"
            ;;
    esac

    echo ""
    exit 1
fi

log_success "All dependencies found"

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
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$BUILD_DIR"
    cd "$BUILD_DIR"
fi

# Get commit hash for reference
COMMIT_HASH=$(git rev-parse --short HEAD)
log_info "Repository at commit: ${COMMIT_HASH}"

# -----------------------------------------------------------------------------
# Build whisper.cpp
# -----------------------------------------------------------------------------

log_step "Building whisper.cpp..."

# Clean previous build
rm -rf build 2>/dev/null || true

# Configure cmake
CMAKE_OPTIONS=(
    -B build
    -S .
    -DCMAKE_BUILD_TYPE=Release
    -DWHISPER_BUILD_EXAMPLES=ON
)

if [[ "$CUDA_AVAILABLE" == "true" ]]; then
    CMAKE_OPTIONS+=(-DGGML_CUDA=ON)
    log_info "Building with CUDA acceleration..."
else
    log_info "Building for CPU..."
fi

# Run cmake configuration
if ! cmake "${CMAKE_OPTIONS[@]}"; then
    log_error "CMake configuration failed"
    exit 2
fi

# Build with parallel jobs
NUM_CORES=$(nproc)
log_info "Building with ${NUM_CORES} parallel jobs..."

if ! cmake --build build --config Release -j"$NUM_CORES"; then
    log_error "Build failed"
    exit 2
fi

# Verify build - binary location varies by version
WHISPER_BIN=""
POSSIBLE_LOCATIONS=(
    "build/bin/whisper-cli"
    "build/bin/main"
    "build/whisper-cli"
)

for location in "${POSSIBLE_LOCATIONS[@]}"; do
    if [[ -f "$location" ]]; then
        WHISPER_BIN="$location"
        break
    fi
done

if [[ -z "$WHISPER_BIN" ]]; then
    log_error "Build failed - whisper binary not found"
    echo "Searched in:"
    for location in "${POSSIBLE_LOCATIONS[@]}"; do
        echo "  - $location"
    done
    echo ""
    echo "Build directory contents:"
    find build -name "whisper*" -type f 2>/dev/null || echo "  (no whisper files found)"
    exit 2
fi

log_success "Build successful: $WHISPER_BIN"

# Check library dependencies
if command -v ldd &> /dev/null; then
    log_info "Checking library dependencies..."
    NOT_FOUND=$(ldd "$WHISPER_BIN" 2>/dev/null | grep "not found" || true)

    if [[ -n "$NOT_FOUND" ]]; then
        log_warn "Missing library dependencies:"
        echo "$NOT_FOUND"
    else
        log_success "All library dependencies satisfied"
    fi
fi

# -----------------------------------------------------------------------------
# Download Model
# -----------------------------------------------------------------------------

log_step "Downloading Whisper model: $MODEL..."

# Use the built-in download script
if ! bash ./models/download-ggml-model.sh "$MODEL"; then
    log_error "Model download failed"
    log_info "Check network connection and try again"
    exit 3
fi

MODEL_FILE="models/ggml-${MODEL}.bin"
if [[ ! -f "$MODEL_FILE" ]]; then
    log_error "Model file not found after download"
    exit 3
fi

# Verify model size (basic sanity check)
MODEL_SIZE_BYTES=$(get_file_size "$MODEL_FILE")
MODEL_SIZE_MB=$(( MODEL_SIZE_BYTES / 1024 / 1024 ))

# Minimum expected sizes (in MB) - allow some variance
declare -A MIN_SIZES
MIN_SIZES=(
    ["tiny"]=70
    ["tiny.en"]=70
    ["base"]=135
    ["base.en"]=135
    ["small"]=450
    ["small.en"]=450
    ["medium"]=1400
    ["medium.en"]=1400
)

MIN_SIZE=${MIN_SIZES[$MODEL]:-50}
if [[ $MODEL_SIZE_MB -lt $MIN_SIZE ]]; then
    log_error "Model file appears corrupted (${MODEL_SIZE_MB}MB < ${MIN_SIZE}MB)"
    log_info "Try downloading again: ./scripts/setup-whisper-linux.sh $MODEL"
    exit 3
fi

log_success "Model downloaded: ${MODEL_SIZE_MB}MB"

# -----------------------------------------------------------------------------
# Install to Tauri
# -----------------------------------------------------------------------------

log_step "Installing to Tauri..."

# Create directories
mkdir -p "$BINARIES_DIR"
mkdir -p "$MODELS_DIR"

# Copy binary with Tauri naming convention
if ! cp "$WHISPER_BIN" "$BINARIES_DIR/$BINARY_NAME"; then
    log_error "Failed to copy binary"
    exit 4
fi

chmod +x "$BINARIES_DIR/$BINARY_NAME"

# Strip binary to reduce size (optional, non-fatal)
if command -v strip &> /dev/null; then
    strip "$BINARIES_DIR/$BINARY_NAME" 2>/dev/null || log_warn "Could not strip binary"
fi

BINARY_SIZE_MB=$(( $(get_file_size "$BINARIES_DIR/$BINARY_NAME") / 1024 / 1024 ))
log_success "Binary installed: $BINARIES_DIR/$BINARY_NAME (${BINARY_SIZE_MB}MB)"

# Copy model
if ! cp "$MODEL_FILE" "$MODELS_DIR/"; then
    log_error "Failed to copy model"
    exit 4
fi

log_success "Model installed: $MODELS_DIR/ggml-${MODEL}.bin"

# -----------------------------------------------------------------------------
# Verify Installation
# -----------------------------------------------------------------------------

log_step "Verifying installation..."

# Test the binary
if "$BINARIES_DIR/$BINARY_NAME" --help &>/dev/null; then
    log_success "Binary verification: OK"
else
    log_error "Binary verification failed"
    log_info "Binary may be corrupted or missing dependencies"
    exit 5
fi

# Check model file
if [[ -f "$MODELS_DIR/ggml-${MODEL}.bin" ]]; then
    log_success "Model verification: OK"
else
    log_error "Model file not found in $MODELS_DIR"
    exit 5
fi

# Check permissions
if [[ -x "$BINARIES_DIR/$BINARY_NAME" ]]; then
    log_success "Binary permissions: OK (executable)"
else
    log_warn "Binary is not executable"
    chmod +x "$BINARIES_DIR/$BINARY_NAME"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Whisper Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "System Information:"
echo "  Distribution: ${DISTRO}"
echo "  Architecture: ${ARCH}"
if [[ "$CUDA_AVAILABLE" == "true" ]]; then
    echo "  CUDA Version: ${CUDA_VERSION}"
    echo "  Acceleration: NVIDIA GPU (CUDA)"
else
    echo "  Acceleration: CPU only"
fi
echo ""
echo "Installed Components:"
echo "  Binary:  $BINARIES_DIR/$BINARY_NAME"
echo "  Model:   $MODELS_DIR/ggml-${MODEL}.bin"
echo "  Commit:  ${COMMIT_HASH}"
echo ""
echo "Model Sizes Reference:"
echo "  tiny   ~75 MB   (fastest, lowest quality)"
echo "  base   ~142 MB  (good balance, recommended)"
echo "  small  ~466 MB  (better quality)"
echo "  medium ~1.5 GB  (high quality, max for live)"
echo ""
echo -e "To download additional models, run:"
echo -e "  ${YELLOW}./scripts/setup-whisper-linux.sh <model-name>${NC}"
echo ""
echo -e "To enable CUDA acceleration (NVIDIA GPU):"
echo -e "  ${YELLOW}./scripts/setup-whisper-linux.sh <model-name> true${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Run 'pnpm run tauri dev' to test"
echo "  2. The transcribe_audio command should now work"
echo ""

# Optional: Offer to cleanup build directory
if [[ -d "$BUILD_DIR/build" ]]; then
    echo -e "${YELLOW}Build directory uses $(du -sh "$BUILD_DIR/build" | cut -f1)${NC}"
    echo "To free up space, you can remove it:"
    echo "  rm -rf $BUILD_DIR/build"
    echo ""
fi
