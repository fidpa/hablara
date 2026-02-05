#!/bin/bash
#
# Whisper.cpp Setup Script for Hablará - Linux
#
# Usage: ./setup-whisper-linux.sh [model] [cuda] [options]
#   model: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en
#   cuda:  true/false (NVIDIA GPU acceleration)
#
# Options:
#   --auto-install     Install dependencies without prompt
#   --dry-run          Show commands without executing
#   --no-version-check Skip tool version checks
#
# Exit codes: 0=Success, 1=Dependencies, 2=Build, 3=Model, 4=Install, 5=Verify, 6=Resources

set -euo pipefail
IFS=$'\n\t'

if [[ -t 1 ]]; then
    RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BLUE='\033[0;34m' NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BINARIES_DIR="$TAURI_DIR/binaries"
MODELS_DIR="$TAURI_DIR/models"
BUILD_DIR="$PROJECT_ROOT/.whisper-build"

SUDO_KEEPALIVE_PID=""
MODEL="base"
ENABLE_CUDA="false"
AUTO_INSTALL="false"
DRY_RUN="false"
SKIP_VERSION_CHECK="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto-install) AUTO_INSTALL="true"; shift ;;
        --dry-run) DRY_RUN="true"; shift ;;
        --no-version-check) SKIP_VERSION_CHECK="true"; shift ;;
        --help|-h) echo "Usage: $0 [model] [cuda] [options] - see script header"; exit 0 ;;
        *)
            if [[ -z "${MODEL_SET:-}" ]]; then MODEL="$1"; MODEL_SET=true
            elif [[ -z "${CUDA_SET:-}" ]]; then ENABLE_CUDA="$1"; CUDA_SET=true
            else echo "Unknown argument: $1"; exit 1; fi
            shift ;;
    esac
done

valid_models=("tiny" "tiny.en" "base" "base.en" "small" "small.en" "medium" "medium.en")
model_valid=false
for valid in "${valid_models[@]}"; do [[ "$MODEL" == "$valid" ]] && model_valid=true && break; done

[[ "$model_valid" == false ]] && { echo -e "${RED}✗ Invalid model '$MODEL'${NC}"; echo "Valid: ${valid_models[*]}"; exit 1; }
[[ "$ENABLE_CUDA" != "true" && "$ENABLE_CUDA" != "false" ]] && { echo -e "${RED}✗ CUDA must be 'true' or 'false'${NC}"; exit 1; }

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
    stop_sudo_keepalive
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

check_dependency() { command -v "$1" &> /dev/null || { log_error "$1 is required but not installed."; return 1; }; }

get_distro() {
    [[ -f /etc/os-release ]] && grep -E "^ID=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "unknown"
}

get_package_manager() {
    local distro; distro=$(get_distro)
    case "$distro" in
        ubuntu|debian|linuxmint|pop) echo "apt" ;;
        fedora|rhel|centos|rocky|almalinux) echo "dnf" ;;
        arch|manjaro|endeavouros) echo "pacman" ;;
        opensuse*|suse) echo "zypper" ;;
        *) echo "unknown" ;;
    esac
}

get_free_space_gb() {
    local path="${1:-$HOME}" free_space
    free_space=$(df -BG "$path" 2>/dev/null | tail -1 | awk '{print $4}')
    free_space="${free_space%G}"
    [[ "$free_space" =~ ^[0-9]+$ ]] && echo "$free_space" || echo "0"
}

get_ram_gb() {
    local ram_kb; ram_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
    [[ -n "$ram_kb" && "$ram_kb" =~ ^[0-9]+$ ]] && echo $(( ram_kb / 1024 / 1024 )) || echo "0"
}

get_file_size() { stat -c%s "$1" 2>/dev/null || echo "0"; }

version_compare() {
    local v1="$1" v2="$2"
    [[ ${#v1} -gt 50 || ${#v2} -gt 50 ]] && { log_error "Version string too long"; return 1; }
    [[ ! "$v1" =~ ^[0-9]+(\.[0-9]+)*$ ]] && { log_warn "Invalid version: '$v1'"; return 1; }
    [[ ! "$v2" =~ ^[0-9]+(\.[0-9]+)*$ ]] && { log_warn "Invalid version: '$v2'"; return 1; }

    IFS='.' read -ra V1 <<< "$v1"
    IFS='.' read -ra V2 <<< "$v2"
    local max_len=${#V1[@]}; [[ ${#V2[@]} -gt $max_len ]] && max_len=${#V2[@]}

    for ((i=0; i<max_len; i++)); do
        local n1="${V1[i]:-0}" n2="${V2[i]:-0}"
        n1="${n1#0*}"; n2="${n2#0*}"; n1="${n1:-0}"; n2="${n2:-0}"
        ((n1 > n2)) && return 0
        ((n1 < n2)) && return 1
    done
    return 0
}

check_tool_version() {
    local tool="$1" min_version="$2" current_version=""
    case "$tool" in
        cmake) current_version=$(cmake --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0") ;;
        gcc|g++) current_version=$(gcc --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0") ;;
        git) current_version=$(git --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0") ;;
        *) return 0 ;;
    esac

    if version_compare "$current_version" "$min_version"; then
        log_success "$tool version $current_version (>= $min_version)"
        return 0
    else
        log_warn "$tool version $current_version < $min_version"
        return 1
    fi
}

declare -A MIN_VERSIONS=([cmake]="3.10" [gcc]="7.0" [git]="2.0")
declare -A INSTALL_CMDS=(
    [apt]="sudo apt-get update && sudo apt-get install -y git curl cmake build-essential"
    [dnf]="sudo dnf install -y git curl cmake gcc-c++ make"
    [pacman]="sudo pacman -S --needed --noconfirm git curl cmake base-devel"
    [zypper]="sudo zypper install -y git curl cmake gcc-c++ make"
)

is_ci_environment() {
    [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" || "${GITLAB_CI:-}" == "true" || "${JENKINS_HOME:-}" != "" || ! -t 0 ]]
}

check_sudo() {
    command -v sudo &> /dev/null || { log_error "sudo not available"; return 1; }
    sudo -v || { log_error "Sudo authentication failed"; return 1; }
    log_success "Sudo validated"
}

start_sudo_keepalive() {
    sudo -v || return 1
    ( while true; do sudo -n true; sleep 50; kill -0 "$$" 2>/dev/null || exit; done ) &
    SUDO_KEEPALIVE_PID=$!
    log_info "Sudo keep-alive started (PID: $SUDO_KEEPALIVE_PID)"
}

stop_sudo_keepalive() {
    [[ -n "$SUDO_KEEPALIVE_PID" ]] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
}

show_install_instructions() {
    local pkg_manager="$1"
    echo ""; echo "Installation instructions:"
    case "$pkg_manager" in
        apt) echo "  Ubuntu/Debian: ${INSTALL_CMDS[apt]}" ;;
        dnf) echo "  Fedora/RHEL: ${INSTALL_CMDS[dnf]}" ;;
        pacman) echo "  Arch Linux: ${INSTALL_CMDS[pacman]}" ;;
        zypper) echo "  openSUSE: ${INSTALL_CMDS[zypper]}" ;;
        *) echo "  Install manually: git, curl, cmake, C++ compiler, make" ;;
    esac
    echo ""
}

do_install_dependencies() {
    local pkg_manager="$1" max_retries=2 retry_count=0
    [[ -z "${INSTALL_CMDS[$pkg_manager]:-}" ]] && { log_error "Unknown package manager: $pkg_manager"; return 1; }

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: ${INSTALL_CMDS[$pkg_manager]}"
        return 0
    fi

    while [[ $retry_count -lt $max_retries ]]; do
        [[ $retry_count -gt 0 ]] && { log_warn "Retry $((retry_count + 1))/$max_retries..."; sleep 2; }
        if bash -c "${INSTALL_CMDS[$pkg_manager]}"; then
            log_success "Dependencies installed"
            return 0
        fi
        retry_count=$((retry_count + 1))
    done
    log_error "Installation failed after $max_retries attempts"
    return 1
}

install_dependencies() {
    local missing_deps=("$@")
    [[ ${#missing_deps[@]} -eq 0 ]] && return 0

    log_warn "Missing: ${missing_deps[*]}"
    local pkg_manager; pkg_manager=$(get_package_manager)

    if is_ci_environment && [[ "${DRY_RUN}" != "true" && "${AUTO_INSTALL}" != "true" ]]; then
        log_info "CI environment - showing instructions:"
        show_install_instructions "$pkg_manager"
        exit 1
    fi

    if [[ "${DRY_RUN}" == "true" ]]; then
        show_install_instructions "$pkg_manager"
        do_install_dependencies "$pkg_manager"
        return 0
    fi

    if [[ "${AUTO_INSTALL}" == "true" ]]; then
        log_info "Auto-install mode"
        check_sudo || { show_install_instructions "$pkg_manager"; exit 1; }
        start_sudo_keepalive || exit 1
        do_install_dependencies "$pkg_manager" || { show_install_instructions "$pkg_manager"; exit 1; }
        return 0
    fi

    check_sudo || { show_install_instructions "$pkg_manager"; exit 1; }

    read -t 30 -p "Install dependencies now? (sudo required) [y/N] " -n 1 -r
    local read_status=$?; echo ""
    [[ $read_status -gt 128 ]] && { log_warn "Timeout"; show_install_instructions "$pkg_manager"; exit 1; }

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_sudo_keepalive || exit 1
        do_install_dependencies "$pkg_manager" || { show_install_instructions "$pkg_manager"; exit 1; }
    else
        show_install_instructions "$pkg_manager"
        exit 1
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

log_step "Checking system requirements..."

DISTRO=$(get_distro)
PKG_MANAGER=$(get_package_manager)
log_info "Distribution: ${DISTRO} (${PKG_MANAGER})"

ARCH=$(uname -m)
case "$ARCH" in
    x86_64) BINARY_NAME="whisper-x86_64-unknown-linux-gnu"; log_info "Architecture: x86_64" ;;
    aarch64|arm64) BINARY_NAME="whisper-aarch64-unknown-linux-gnu"; log_info "Architecture: ARM64" ;;
    *) log_error "Unsupported architecture: $ARCH"; exit 1 ;;
esac

FREE_SPACE=$(get_free_space_gb "$HOME")
[[ $FREE_SPACE -lt 5 ]] && { log_error "Need 5GB disk space, have ${FREE_SPACE}GB"; exit 6; }
log_success "Disk space: ${FREE_SPACE}GB"

RAM_GB=$(get_ram_gb)
[[ "$MODEL" == "medium"* && $RAM_GB -lt 4 ]] && log_warn "Low RAM (${RAM_GB}GB) - medium model may be slow"

CUDA_AVAILABLE=false
CUDA_VERSION=""
if [[ "$ENABLE_CUDA" == "true" ]]; then
    if command -v nvcc &> /dev/null; then
        CUDA_VERSION=$(nvcc --version 2>/dev/null | grep "release" | sed -n 's/.*release \([0-9.]*\).*/\1/p')
        [[ -n "$CUDA_VERSION" ]] && { CUDA_AVAILABLE=true; log_success "CUDA: ${CUDA_VERSION}"; } || log_warn "nvcc found but version detection failed"
    else
        log_warn "CUDA requested but nvcc not found - using CPU"
    fi
fi

log_step "Checking dependencies..."

MISSING_DEPS=()
check_dependency "git" || MISSING_DEPS+=("git")
check_dependency "curl" || MISSING_DEPS+=("curl")
check_dependency "cmake" || MISSING_DEPS+=("cmake")
check_dependency "gcc" || check_dependency "clang" || MISSING_DEPS+=("build-essential")
check_dependency "make" || MISSING_DEPS+=("make")

install_dependencies "${MISSING_DEPS[@]}"
log_success "All dependencies found"

if [[ "${SKIP_VERSION_CHECK}" != "true" ]]; then
    log_step "Checking tool versions..."
    VERSION_WARNINGS=0
    for tool in "${!MIN_VERSIONS[@]}"; do
        command -v "$tool" &> /dev/null && ! check_tool_version "$tool" "${MIN_VERSIONS[$tool]}" && VERSION_WARNINGS=$((VERSION_WARNINGS + 1))
    done
    [[ $VERSION_WARNINGS -gt 0 ]] && {
        log_warn "$VERSION_WARNINGS tool(s) below recommended version"
        read -t 10 -p "Continue? [Y/n] " -n 1 -r || true; echo ""
        [[ $REPLY =~ ^[Nn]$ ]] && exit 1
    }
else
    log_info "Version checks skipped"
fi

# ============================================================================
# Clone whisper.cpp
# ============================================================================

log_step "Setting up whisper.cpp..."

if [[ -d "$BUILD_DIR" ]]; then
    log_info "Updating existing repository..."
    cd "$BUILD_DIR"

    # Supply chain attack prevention: verify remote URL
    EXPECTED_REMOTE="https://github.com/ggml-org/whisper.cpp.git"
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    [[ "$CURRENT_REMOTE" != "$EXPECTED_REMOTE" ]] && {
        log_error "Unexpected git remote: $CURRENT_REMOTE"
        log_error "Expected: $EXPECTED_REMOTE"
        exit 2
    }
    git -c http.sslVerify=true pull --quiet
else
    log_info "Cloning whisper.cpp..."
    git -c http.sslVerify=true clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$BUILD_DIR"
    cd "$BUILD_DIR"
fi

COMMIT_HASH=$(git rev-parse --short HEAD)
log_info "Commit: ${COMMIT_HASH}"

# ============================================================================
# Build whisper.cpp
# ============================================================================

log_step "Building whisper.cpp..."

rm -rf build 2>/dev/null || true

CMAKE_OPTIONS=(-B build -S . -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_EXAMPLES=ON)
[[ "$CUDA_AVAILABLE" == "true" ]] && { CMAKE_OPTIONS+=(-DGGML_CUDA=ON); log_info "Building with CUDA..."; } || log_info "Building for CPU..."

cmake "${CMAKE_OPTIONS[@]}" || { log_error "CMake configuration failed"; exit 2; }

NUM_CORES=$(nproc)
log_info "Building with ${NUM_CORES} parallel jobs..."
cmake --build build --config Release -j"$NUM_CORES" || { log_error "Build failed"; exit 2; }

WHISPER_BIN=""
for location in "build/bin/whisper-cli" "build/bin/main" "build/whisper-cli"; do
    [[ -f "$location" ]] && { WHISPER_BIN="$location"; break; }
done

[[ -z "$WHISPER_BIN" ]] && {
    log_error "Binary not found after build"
    find build -name "whisper*" -type f 2>/dev/null || echo "(no whisper files)"
    exit 2
}

log_success "Build successful: $WHISPER_BIN"

if command -v ldd &> /dev/null; then
    NOT_FOUND=$(ldd "$WHISPER_BIN" 2>/dev/null | grep "not found" || true)
    [[ -n "$NOT_FOUND" ]] && { log_warn "Missing libraries:"; echo "$NOT_FOUND"; } || log_success "All libraries satisfied"
fi

# ============================================================================
# Download Model
# ============================================================================

log_step "Downloading model: $MODEL..."

bash ./models/download-ggml-model.sh "$MODEL" || { log_error "Model download failed"; exit 3; }

MODEL_FILE="models/ggml-${MODEL}.bin"

# Path traversal prevention
CANONICAL_MODEL_PATH=$(realpath -m "$MODEL_FILE" 2>/dev/null || echo "$MODEL_FILE")
CANONICAL_MODELS_DIR=$(realpath -m "$BUILD_DIR/models" 2>/dev/null || echo "$BUILD_DIR/models")
[[ "$CANONICAL_MODEL_PATH" != "$CANONICAL_MODELS_DIR"* ]] && { log_error "Path traversal detected"; exit 3; }

[[ ! -f "$MODEL_FILE" ]] && { log_error "Model file not found"; exit 3; }

MODEL_SIZE_BYTES=$(get_file_size "$MODEL_FILE")
MODEL_SIZE_MB=$(( MODEL_SIZE_BYTES / 1024 / 1024 ))

declare -A MIN_SIZES=(["tiny"]=70 ["tiny.en"]=70 ["base"]=135 ["base.en"]=135 ["small"]=450 ["small.en"]=450 ["medium"]=1400 ["medium.en"]=1400)
MIN_SIZE=${MIN_SIZES[$MODEL]:-50}
[[ $MODEL_SIZE_MB -lt $MIN_SIZE ]] && { log_error "Model appears corrupted (${MODEL_SIZE_MB}MB < ${MIN_SIZE}MB)"; exit 3; }

log_success "Model downloaded: ${MODEL_SIZE_MB}MB"

# ============================================================================
# Install to Tauri
# ============================================================================

log_step "Installing to Tauri..."

mkdir -p "$BINARIES_DIR" "$MODELS_DIR"

cp "$WHISPER_BIN" "$BINARIES_DIR/$BINARY_NAME" || { log_error "Failed to copy binary"; exit 4; }
chmod +x "$BINARIES_DIR/$BINARY_NAME"
command -v strip &> /dev/null && strip "$BINARIES_DIR/$BINARY_NAME" 2>/dev/null || true

BINARY_SIZE_MB=$(( $(get_file_size "$BINARIES_DIR/$BINARY_NAME") / 1024 / 1024 ))
log_success "Binary: $BINARIES_DIR/$BINARY_NAME (${BINARY_SIZE_MB}MB)"

cp "$MODEL_FILE" "$MODELS_DIR/" || { log_error "Failed to copy model"; exit 4; }
log_success "Model: $MODELS_DIR/ggml-${MODEL}.bin"

# ============================================================================
# Verification
# ============================================================================

log_step "Verifying installation..."

"$BINARIES_DIR/$BINARY_NAME" --help &>/dev/null && log_success "Binary: OK" || { log_error "Binary verification failed"; exit 5; }
[[ -f "$MODELS_DIR/ggml-${MODEL}.bin" ]] && log_success "Model: OK" || { log_error "Model not found"; exit 5; }
[[ -x "$BINARIES_DIR/$BINARY_NAME" ]] && log_success "Permissions: OK" || chmod +x "$BINARIES_DIR/$BINARY_NAME"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Whisper Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "System: ${DISTRO} / ${ARCH}"
[[ "$CUDA_AVAILABLE" == "true" ]] && echo "Acceleration: CUDA ${CUDA_VERSION}" || echo "Acceleration: CPU"
echo ""
echo "Installed:"
echo "  Binary: $BINARIES_DIR/$BINARY_NAME"
echo "  Model:  $MODELS_DIR/ggml-${MODEL}.bin"
echo "  Commit: ${COMMIT_HASH}"
echo ""
echo "Models: tiny(75MB) base(142MB) small(466MB) medium(1.5GB)"
echo ""
echo -e "Additional models: ${YELLOW}./scripts/setup-whisper-linux.sh <model>${NC}"
echo -e "With CUDA:         ${YELLOW}./scripts/setup-whisper-linux.sh <model> true${NC}"
echo ""
echo -e "${BLUE}Next: pnpm run tauri dev${NC}"
echo ""

[[ -d "$BUILD_DIR/build" ]] && echo -e "${YELLOW}Cleanup: rm -rf $BUILD_DIR/build ($(du -sh "$BUILD_DIR/build" | cut -f1))${NC}" && echo ""
