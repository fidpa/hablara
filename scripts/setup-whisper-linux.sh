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
#   ./setup-whisper-linux.sh [model] [cuda] [options]
#
# Arguments:
#   model - Model name (default: base)
#           Valid: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en
#   cuda  - Enable CUDA acceleration (default: false)
#           Set to "true" for NVIDIA GPU acceleration
#
# Options:
#   --auto-install   - Install dependencies automatically without prompt
#   --dry-run        - Show what would be done without executing
#   --no-version-check - Skip minimum version checks for tools
#
# Examples:
#   ./setup-whisper-linux.sh                     # base model, CPU only
#   ./setup-whisper-linux.sh small               # small model, CPU only
#   ./setup-whisper-linux.sh base true           # base model with CUDA
#   ./setup-whisper-linux.sh --auto-install      # auto-install dependencies
#   ./setup-whisper-linux.sh --dry-run           # show commands only
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

# sudo credential management
SUDO_KEEPALIVE_PID=""

# Parse arguments
MODEL="base"
ENABLE_CUDA="false"
AUTO_INSTALL="false"
DRY_RUN="false"
SKIP_VERSION_CHECK="false"

# Process positional and optional arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto-install)
            AUTO_INSTALL="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --no-version-check)
            SKIP_VERSION_CHECK="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [model] [cuda] [options]"
            echo "See script header for detailed documentation"
            exit 0
            ;;
        *)
            # Positional arguments
            if [[ -z "${MODEL_SET:-}" ]]; then
                MODEL="$1"
                MODEL_SET=true
            elif [[ -z "${CUDA_SET:-}" ]]; then
                ENABLE_CUDA="$1"
                CUDA_SET=true
            else
                echo "Unknown argument: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

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

    # Stop sudo keep-alive if running
    stop_sudo_keepalive

    if [[ $exit_code -ne 0 ]]; then
        log_error "Build failed - cleaning up partial artifacts"

        # Safe cleanup with lock to prevent race conditions
        local lock_file="$BUILD_DIR/.cleanup.lock"
        if mkdir "$lock_file" 2>/dev/null; then
            # Remove build artifacts
            rm -rf "$BUILD_DIR/build" 2>/dev/null || true
            rmdir "$lock_file" 2>/dev/null
        fi
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

# Compare semantic versions (returns 0 if v1>=v2, 1 if v1<v2)
version_compare() {
    local v1="$1"
    local v2="$2"

    # Validate input length (prevent DoS via excessive memory)
    if [[ ${#v1} -gt 50 ]] || [[ ${#v2} -gt 50 ]]; then
        log_error "Version string too long (max 50 chars)"
        return 1
    fi

    # Strict validation: only digits and dots (prevent malformed input)
    if ! [[ "$v1" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then
        log_warn "Invalid version format: '$v1' (expected: X.Y.Z)"
        return 1
    fi
    if ! [[ "$v2" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then
        log_warn "Invalid version format: '$v2' (expected: X.Y.Z)"
        return 1
    fi

    # Split versions into arrays
    IFS='.' read -ra V1 <<< "$v1"
    IFS='.' read -ra V2 <<< "$v2"

    # Compare each component
    local max_len=${#V1[@]}
    [[ ${#V2[@]} -gt $max_len ]] && max_len=${#V2[@]}

    for ((i=0; i<max_len; i++)); do
        local n1="${V1[i]:-0}"
        local n2="${V2[i]:-0}"

        # Remove leading zeros and validate numeric
        n1="${n1#0*}"
        n2="${n2#0*}"
        n1="${n1:-0}"
        n2="${n2:-0}"

        if ((n1 > n2)); then
            return 0  # v1 >= v2
        elif ((n1 < n2)); then
            return 1  # v1 < v2
        fi
    done

    return 0  # v1 == v2
}

# Check tool version against minimum requirement
check_tool_version() {
    local tool="$1"
    local min_version="$2"
    local current_version=""

    case "$tool" in
        cmake)
            current_version=$(cmake --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0")
            ;;
        gcc|g++)
            current_version=$(gcc --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0")
            ;;
        clang)
            current_version=$(clang --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0")
            ;;
        git)
            current_version=$(git --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0")
            ;;
        *)
            log_warn "Version check für $tool nicht implementiert"
            return 0
            ;;
    esac

    if version_compare "$current_version" "$min_version"; then
        log_success "$tool version $current_version (>= $min_version required)"
        return 0
    else
        log_warn "$tool version $current_version ist älter als empfohlen ($min_version)"
        log_info "Installation könnte fehlschlagen - bitte aktualisieren"
        return 1
    fi
}

# Minimum required versions
declare -A MIN_VERSIONS=(
    [cmake]="3.10"
    [gcc]="7.0"
    [git]="2.0"
)

# Package installation commands (DRY principle)
declare -A INSTALL_CMDS=(
    [apt]="sudo apt-get update && sudo apt-get install -y git curl cmake build-essential"
    [dnf]="sudo dnf install -y git curl cmake gcc-c++ make"
    [pacman]="sudo pacman -S --needed --noconfirm git curl cmake base-devel"
    [zypper]="sudo zypper install -y git curl cmake gcc-c++ make"
)

# Check if running in CI/CD environment
is_ci_environment() {
    [[ "${CI:-}" == "true" ]] ||
    [[ "${GITHUB_ACTIONS:-}" == "true" ]] ||
    [[ "${GITLAB_CI:-}" == "true" ]] ||
    [[ "${JENKINS_HOME:-}" != "" ]] ||
    [[ "${NONINTERACTIVE:-}" == "true" ]] ||
    [[ ! -t 0 ]]  # No TTY = non-interactive
}

# Check sudo availability and validate credentials
check_sudo() {
    if ! command -v sudo &> /dev/null; then
        log_error "sudo nicht verfügbar"
        log_info "Als root ausführen oder sudo installieren"
        return 1
    fi

    # Validate sudo credentials (prompt if needed)
    if ! sudo -v; then
        log_error "Sudo-Authentifizierung fehlgeschlagen"
        return 1
    fi

    log_success "Sudo-Berechtigung validiert"
    return 0
}

# Start sudo credential keep-alive background process
start_sudo_keepalive() {
    # Validate sudo first
    if ! sudo -v; then
        return 1
    fi

    # Keep-alive: update sudo timestamp every 50 seconds
    (
        while true; do
            sudo -n true
            sleep 50
            # Exit if parent process (script) is gone
            kill -0 "$$" 2>/dev/null || exit
        done
    ) &

    SUDO_KEEPALIVE_PID=$!
    log_info "Sudo keep-alive aktiviert (PID: $SUDO_KEEPALIVE_PID)"
}

# Stop sudo credential keep-alive
stop_sudo_keepalive() {
    if [[ -n "$SUDO_KEEPALIVE_PID" ]]; then
        kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
        log_info "Sudo keep-alive beendet"
    fi
}

# Show installation instructions for current package manager
show_install_instructions() {
    local pkg_manager="$1"

    echo "Installation instructions by distribution:"
    echo ""

    case "$pkg_manager" in
        apt)
            echo "  Ubuntu/Debian:"
            echo "    ${INSTALL_CMDS[apt]}"
            ;;
        dnf)
            echo "  Fedora/RHEL:"
            echo "    ${INSTALL_CMDS[dnf]}"
            ;;
        pacman)
            echo "  Arch Linux:"
            echo "    ${INSTALL_CMDS[pacman]}"
            ;;
        zypper)
            echo "  openSUSE:"
            echo "    ${INSTALL_CMDS[zypper]}"
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
}

# Execute package installation
do_install_dependencies() {
    local pkg_manager="$1"
    local max_retries=2
    local retry_count=0

    if [[ -z "${INSTALL_CMDS[$pkg_manager]:-}" ]]; then
        log_error "Unbekannter Package Manager: $pkg_manager"
        return 1
    fi

    # Dry-run mode: show commands only
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        log_info "[DRY-RUN] Würde ausführen:"
        echo "  ${INSTALL_CMDS[$pkg_manager]}"
        echo ""
        log_success "[DRY-RUN] Dependencies würden installiert werden"
        return 0
    fi

    # Execute installation with retry logic
    while [[ $retry_count -lt $max_retries ]]; do
        if [[ $retry_count -gt 0 ]]; then
            log_warn "Wiederhole Installation (Versuch $((retry_count + 1))/$max_retries)..."
            sleep 2  # Brief pause before retry
        else
            log_info "Installiere Dependencies mit $pkg_manager..."
        fi

        # Execute with bash -c instead of eval to prevent code injection
        if bash -c "${INSTALL_CMDS[$pkg_manager]}"; then
            log_success "Dependencies installiert"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [[ $retry_count -lt $max_retries ]]; then
                log_warn "Installation fehlgeschlagen - versuche erneut..."
            fi
        fi
    done

    log_error "Installation nach $max_retries Versuchen fehlgeschlagen"
    return 1
}

# Interactive dependency installation (main function)
install_dependencies() {
    local missing_deps=("$@")

    if [[ ${#missing_deps[@]} -eq 0 ]]; then
        return 0
    fi

    log_warn "Fehlende Dependencies: ${missing_deps[*]}"
    echo ""

    # Detect package manager
    local pkg_manager
    pkg_manager=$(get_package_manager)

    # CI/CD mode: Show instructions only (unless dry-run or auto-install)
    if is_ci_environment && [[ "${DRY_RUN}" != "true" ]] && [[ "${AUTO_INSTALL}" != "true" ]]; then
        log_info "CI/CD-Umgebung erkannt - zeige Installationsanweisungen:"
        show_install_instructions "$pkg_manager"
        exit 1
    fi

    # Dry-run mode: Show what would happen
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Würde folgende Dependencies installieren:"
        show_install_instructions "$pkg_manager"
        do_install_dependencies "$pkg_manager"  # Will only show commands
        return 0
    fi

    # Auto-install mode: Install directly without prompt
    if [[ "${AUTO_INSTALL}" == "true" ]]; then
        log_info "Auto-Install-Modus aktiviert"

        if ! check_sudo; then
            show_install_instructions "$pkg_manager"
            exit 1
        fi

        # Start sudo keep-alive for long installations
        start_sudo_keepalive || {
            log_error "Sudo keep-alive konnte nicht gestartet werden"
            exit 1
        }

        if ! do_install_dependencies "$pkg_manager"; then
            show_install_instructions "$pkg_manager"
            exit 1
        fi
        return 0
    fi

    # Interactive mode: Check sudo and prompt user
    if ! check_sudo; then
        show_install_instructions "$pkg_manager"
        exit 1
    fi

    # Interactive prompt with timeout
    read -t 30 -p "Dependencies jetzt installieren? (sudo erforderlich) [y/N] " -n 1 -r
    local read_status=$?
    echo ""

    # Handle timeout
    if [[ $read_status -gt 128 ]]; then
        log_warn "Timeout - überspringe Installation"
        show_install_instructions "$pkg_manager"
        exit 1
    fi

    # Process user response
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Start sudo keep-alive for long installations
        start_sudo_keepalive || {
            log_error "Sudo keep-alive konnte nicht gestartet werden"
            exit 1
        }

        if ! do_install_dependencies "$pkg_manager"; then
            show_install_instructions "$pkg_manager"
            exit 1
        fi
    else
        log_info "Installation abgebrochen - bitte manuell installieren:"
        show_install_instructions "$pkg_manager"
        exit 1
    fi
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

# Install missing dependencies (interactive or CI-friendly)
install_dependencies "${MISSING_DEPS[@]}"

log_success "All dependencies found"

# Version checks (skip if --no-version-check flag is set)
if [[ "${SKIP_VERSION_CHECK}" != "true" ]]; then
    log_step "Checking tool versions..."

    VERSION_WARNINGS=0

    for tool in "${!MIN_VERSIONS[@]}"; do
        if command -v "$tool" &> /dev/null; then
            if ! check_tool_version "$tool" "${MIN_VERSIONS[$tool]}"; then
                VERSION_WARNINGS=$((VERSION_WARNINGS + 1))
            fi
        fi
    done

    if [[ $VERSION_WARNINGS -eq 0 ]]; then
        log_success "All tool versions meet minimum requirements"
    else
        log_warn "$VERSION_WARNINGS tool(s) have older versions than recommended"
        log_info "Build may still succeed, but consider updating for best results"
        echo ""
        read -t 10 -p "Continue anyway? [Y/n] " -n 1 -r || true
        echo ""
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            log_info "Aborted by user"
            exit 1
        fi
    fi
else
    log_info "Version checks skipped (--no-version-check)"
fi

# -----------------------------------------------------------------------------
# Clone whisper.cpp
# -----------------------------------------------------------------------------

log_step "Setting up whisper.cpp..."

if [[ -d "$BUILD_DIR" ]]; then
    log_info "Build directory exists, updating..."
    cd "$BUILD_DIR"

    # Verify remote URL before pull (prevent supply chain attack)
    EXPECTED_REMOTE="https://github.com/ggml-org/whisper.cpp.git"
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

    if [[ "$CURRENT_REMOTE" != "$EXPECTED_REMOTE" ]]; then
        log_error "Unexpected git remote detected"
        log_error "  Expected: $EXPECTED_REMOTE"
        log_error "  Found:    $CURRENT_REMOTE"
        log_info "Repository may be compromised - aborting"
        exit 2
    fi

    # Pull with SSL verification enabled
    git -c http.sslVerify=true pull --quiet

else
    log_info "Cloning whisper.cpp..."
    # Clone with SSL verification
    git -c http.sslVerify=true clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$BUILD_DIR"
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

# Validate model path (prevent path traversal)
CANONICAL_MODEL_PATH=$(realpath -m "$MODEL_FILE" 2>/dev/null || echo "$MODEL_FILE")
CANONICAL_MODELS_DIR=$(realpath -m "$BUILD_DIR/models" 2>/dev/null || echo "$BUILD_DIR/models")

if [[ "$CANONICAL_MODEL_PATH" != "$CANONICAL_MODELS_DIR"* ]]; then
    log_error "Path traversal detected in model file: $MODEL_FILE"
    exit 3
fi

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
