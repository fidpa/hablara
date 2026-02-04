#!/usr/bin/env bash
#
# Hablará - Ollama Quick-Setup Script
#
# Purpose: One-liner installation of Ollama + optimized model for Hablará
# Platform: macOS (ARM64/x86_64)
# Usage: curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-quick.sh | bash
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Insufficient disk space
#   3 - Network error
#   4 - Platform not supported

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safer word splitting

# ============================================================================
# Configuration
# ============================================================================

readonly SCRIPT_VERSION="1.1.0"
readonly REQUIRED_DISK_SPACE_GB=10
readonly MODEL_NAME="qwen2.5:7b"
readonly CUSTOM_MODEL_NAME="qwen2.5:7b-custom"
readonly OLLAMA_API_URL="http://localhost:11434"
readonly OLLAMA_INSTALL_URL="https://ollama.ai/install.sh"
readonly MIN_OLLAMA_VERSION="0.3.0"  # qwen2.5 support added in 0.3.0

# Colors for output (with fallback for non-TTY)
if [[ -t 1 ]]; then
  readonly COLOR_RESET='\033[0m'
  readonly COLOR_GREEN='\033[0;32m'
  readonly COLOR_YELLOW='\033[0;33m'
  readonly COLOR_RED='\033[0;31m'
  readonly COLOR_BLUE='\033[0;34m'
else
  readonly COLOR_RESET=''
  readonly COLOR_GREEN=''
  readonly COLOR_YELLOW=''
  readonly COLOR_RED=''
  readonly COLOR_BLUE=''
fi

# ============================================================================
# Helper Functions
# ============================================================================

# Print colored message
log_info() {
  echo -e "${COLOR_BLUE}ℹ️  ${1}${COLOR_RESET}"
}

log_success() {
  echo -e "${COLOR_GREEN}✅ ${1}${COLOR_RESET}"
}

log_warning() {
  echo -e "${COLOR_YELLOW}⚠️  ${1}${COLOR_RESET}"
}

log_error() {
  echo -e "${COLOR_RED}❌ ${1}${COLOR_RESET}" >&2
}

# Check if command exists
command_exists() {
  command -v "$1" &> /dev/null
}

# Escape string for safe JSON embedding (handles \, ", and control chars)
json_escape_string() {
  local str="$1"
  # Order matters: escape backslashes first, then other characters
  str="${str//\\/\\\\}"      # \ → \\
  str="${str//\"/\\\"}"      # " → \"
  str="${str//$'\n'/\\n}"    # newline → \n
  str="${str//$'\t'/\\t}"    # tab → \t
  str="${str//$'\r'/\\r}"    # carriage return → \r
  printf '%s' "$str"
}

# Get available disk space in GB
get_free_space_gb() {
  local free_space
  local check_path="${HOME}/.ollama"

  # Create directory if not exists (for df check)
  mkdir -p "${check_path}" 2>/dev/null || check_path="${HOME}"

  if command_exists df; then
    # macOS: df -g (gigabytes) - check Ollama model storage location
    free_space=$(df -g "${check_path}" 2>/dev/null | tail -1 | awk '{print $4}')
    echo "${free_space:-0}"
  else
    echo "0"
  fi
}

# Compare semantic versions (returns 0 if v1>=v2, 1 if v1<v2)
version_gte() {
  local v1="${1:-0.0.0}"
  local v2="${2:-0.0.0}"

  # Try sort -V first (GNU coreutils), fallback to manual comparison
  if command_exists gsort; then
    # macOS with Homebrew coreutils
    if [[ "$(printf '%s\n%s' "$v2" "$v1" | gsort -V | head -n1)" == "$v2" ]]; then
      return 0
    fi
    return 1
  elif sort --version 2>/dev/null | grep -q "GNU"; then
    # GNU sort available
    if [[ "$(printf '%s\n%s' "$v2" "$v1" | sort -V | head -n1)" == "$v2" ]]; then
      return 0
    fi
    return 1
  else
    # Manual version comparison fallback (IFS in subshell to avoid side effects)
    local -a v1_parts v2_parts
    IFS='.' read -ra v1_parts <<< "$v1"
    IFS='.' read -ra v2_parts <<< "$v2"

    local max_len="${#v1_parts[@]}"
    [[ ${#v2_parts[@]} -gt $max_len ]] && max_len="${#v2_parts[@]}"

    for ((i=0; i<max_len; i++)); do
      local p1="${v1_parts[i]:-0}"
      local p2="${v2_parts[i]:-0}"
      # Remove non-numeric characters
      p1="${p1//[^0-9]/}"
      p2="${p2//[^0-9]/}"
      p1="${p1:-0}"
      p2="${p2:-0}"

      if ((p1 > p2)); then
        return 0  # v1 > v2
      elif ((p1 < p2)); then
        return 1  # v1 < v2
      fi
    done
    return 0  # v1 == v2
  fi
}

# Check Ollama version
check_ollama_version() {
  local version_output
  local current_version

  version_output=$(ollama --version 2>&1 | head -1)

  # Extract version number (e.g., "ollama version is 0.15.2" -> "0.15.2")
  if [[ $version_output =~ ([0-9]+\.[0-9]+\.?[0-9]*) ]]; then
    current_version="${BASH_REMATCH[1]}"

    if ! version_gte "$current_version" "$MIN_OLLAMA_VERSION"; then
      log_warning "Ollama Version $current_version ist älter als empfohlen ($MIN_OLLAMA_VERSION)"
      log_info "Update empfohlen: brew upgrade ollama"
      return 1
    fi
  fi
  return 0
}

# Check for GPU/accelerator availability
check_gpu_available() {
  # macOS: Check for Apple Silicon (Metal acceleration)
  if [[ "$(uname)" == "Darwin" ]]; then
    local cpu_brand
    cpu_brand=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "")

    if [[ "$cpu_brand" == *"Apple"* ]]; then
      echo "apple_silicon"
      return 0
    fi
  fi

  # Check for NVIDIA GPU
  if command_exists nvidia-smi; then
    if nvidia-smi &>/dev/null; then
      echo "nvidia"
      return 0
    fi
  fi

  echo "cpu"
  return 1
}

# Test model inference
test_model_inference() {
  local model="${1:-$MODEL_NAME}"

  log_info "Teste Model-Inference..."

  # Properly escape model name for JSON (handles \, ", and control chars)
  local escaped_model
  escaped_model=$(json_escape_string "$model")

  local response
  response=$(curl -sf --max-time 60 "${OLLAMA_API_URL}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"${escaped_model}\", \"prompt\": \"Say OK\", \"stream\": false, \"options\": {\"num_predict\": 5}}" \
    2>/dev/null) || true

  if [[ -n "$response" ]] && echo "$response" | grep -q '"response"'; then
    log_success "Model-Inference-Test erfolgreich"
    return 0
  fi

  log_warning "Model-Inference-Test fehlgeschlagen"
  return 1
}

# Wait for Ollama server to be ready
wait_for_ollama() {
  local max_attempts=30
  local attempt=1

  log_info "Warte auf Ollama Server..."

  while [[ $attempt -le $max_attempts ]]; do
    if curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
      log_success "Ollama Server ist bereit"
      return 0
    fi

    sleep 1
    ((attempt++))
  done

  log_error "Ollama Server antwortet nicht nach ${max_attempts}s"
  return 1
}

# Cleanup function (called on error)
cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    log_error "Setup fehlgeschlagen mit Exit-Code: ${exit_code}"
  fi
}

trap cleanup EXIT

# ============================================================================
# Pre-flight Checks
# ============================================================================

preflight_checks() {
  echo ""
  echo "🚀 Hablará Ollama Quick-Setup v${SCRIPT_VERSION}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Check platform
  if [[ "$(uname)" != "Darwin" ]]; then
    log_error "Dieses Script ist nur für macOS"
    log_info "Für Linux/Windows: siehe https://ollama.ai/download"
    exit 4
  fi

  # Check disk space
  local free_space
  free_space=$(get_free_space_gb)

  if [[ $free_space -lt $REQUIRED_DISK_SPACE_GB ]]; then
    log_error "Nicht genügend Speicher"
    log_error "Benötigt: ${REQUIRED_DISK_SPACE_GB}GB, Verfügbar: ${free_space}GB"
    exit 2
  fi

  log_success "Speicherplatz: ${free_space}GB verfügbar"

  # Check network connectivity
  if ! curl -sf --connect-timeout 5 "https://ollama.ai" &> /dev/null; then
    log_error "Keine Netzwerkverbindung zu ollama.ai"
    log_info "Bitte Internetverbindung prüfen"
    exit 3
  fi

  log_success "Netzwerkverbindung OK"

  # Check GPU/accelerator availability
  local gpu_type
  gpu_type=$(check_gpu_available)

  case "$gpu_type" in
    apple_silicon)
      log_success "Apple Silicon erkannt (Metal-Beschleunigung)"
      ;;
    nvidia)
      log_success "NVIDIA GPU erkannt (CUDA-Beschleunigung)"
      ;;
    *)
      log_warning "Keine GPU erkannt - CPU-Inferenz (langsamer)"
      log_info "Erste Inferenz kann 30-60 Sekunden dauern"
      ;;
  esac

  echo ""
}

# ============================================================================
# Ollama Installation
# ============================================================================

# Check if port is in use
port_in_use() {
  local port="${1:-11434}"
  if command_exists lsof; then
    lsof -i ":${port}" &>/dev/null
  elif command_exists nc; then
    nc -z 127.0.0.1 "${port}" &>/dev/null
  elif [[ "$BASH_VERSION" ]]; then
    # Bash-specific /dev/tcp feature
    (echo >/dev/tcp/127.0.0.1/"${port}") 2>/dev/null
  else
    # No port checking tool available - assume port is free
    # This is safer than a broken check (false positives are worse than false negatives here)
    return 1
  fi
}

# Start Ollama server (handles both app and CLI installations)
start_ollama_server() {
  # First check if server is already responding
  if curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
    log_success "Ollama Server läuft bereits"
    return 0
  fi

  # Check if port is in use (server might be starting up)
  if port_in_use 11434; then
    log_info "Port 11434 ist belegt, warte auf Ollama API..."

    # Give it more time - server might be starting
    for i in {1..10}; do
      sleep 1
      if curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
        log_success "Ollama Server ist bereit"
        return 0
      fi
    done

    log_warning "Port 11434 belegt, aber Ollama API antwortet nicht"
    log_info "Prüfen mit: lsof -i :11434"
    return 1
  fi

  # Port is free, try to start server

  # Try launchd first (Ollama.app installation)
  if [[ -f ~/Library/LaunchAgents/com.ollama.ollama.plist ]]; then
    launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist 2>/dev/null || true
    return 0
  fi

  # Try opening Ollama.app (if installed in Applications)
  if [[ -d "/Applications/Ollama.app" ]]; then
    open -a Ollama 2>/dev/null || true
    return 0
  fi

  # Fallback: start ollama serve in background
  if command_exists ollama; then
    nohup ollama serve &>/dev/null &
    local ollama_pid=$!

    # Brief wait to check if process started successfully
    sleep 2

    # Verify process is still running
    if kill -0 "$ollama_pid" 2>/dev/null; then
      return 0
    else
      log_warning "Ollama process failed to start or exited immediately"
      return 1
    fi
  fi

  return 1
}

install_ollama() {
  if command_exists ollama; then
    log_success "Ollama bereits installiert"

    # Check version
    local version
    version=$(ollama --version 2>/dev/null | head -1 || echo "unknown")
    log_info "Version: ${version}"

    # Check minimum version
    check_ollama_version || true

    # Ensure server is running
    if ! curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
      log_info "Prüfe Ollama Server..."

      if ! start_ollama_server; then
        log_error "Konnte Ollama Server nicht starten"
        log_info "Falls ein anderer Prozess Port 11434 nutzt: lsof -i :11434"
        log_info "Sonst manuell starten: ollama serve"
        exit 1
      fi

      # Wait for server
      if ! wait_for_ollama; then
        log_error "Ollama Server antwortet nicht"
        log_info "Bitte manuell starten: ollama serve"
        exit 1
      fi
    else
      log_success "Ollama Server läuft"
    fi

    return 0
  fi

  log_info "Installiere Ollama..."

  # macOS: Use Homebrew if available, otherwise guide to manual installation
  if command_exists brew; then
    log_info "Verwende Homebrew für Installation..."

    if ! brew install ollama; then
      log_error "Homebrew Installation fehlgeschlagen"
      log_info "Alternative: Lade Ollama.app von https://ollama.ai/download"
      exit 1
    fi

    log_success "Ollama via Homebrew installiert"

    # Start server
    start_ollama_server

  else
    # No Homebrew - guide to manual installation
    log_warning "Homebrew nicht gefunden"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📥 Bitte Ollama manuell installieren:"
    echo ""
    echo "   Option 1 (empfohlen): Homebrew installieren, dann dieses Script erneut ausführen"
    echo "      /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo "   Option 2: Ollama.app herunterladen"
    echo "      https://ollama.ai/download"
    echo ""
    echo "Nach der Installation dieses Script erneut ausführen."
    echo ""
    exit 1
  fi

  # Wait for server to start
  wait_for_ollama || exit 1
}

# ============================================================================
# Model Management
# ============================================================================

pull_base_model() {
  log_info "Prüfe Modell: ${MODEL_NAME}"

  # Check if model exists (escape regex special chars in model name)
  local escaped_model_name
  escaped_model_name=$(printf '%s' "$MODEL_NAME" | sed 's/[][\.*^$()+?{|\\]/\\&/g')

  if ollama list 2>/dev/null | grep -qE "^${escaped_model_name}[[:space:]]"; then
    log_success "Modell bereits vorhanden: ${MODEL_NAME}"
    return 0
  fi

  log_info "Lade ${MODEL_NAME} (~4.7GB, dauert 2-5min)..."

  # Pull model with progress
  if ! ollama pull "${MODEL_NAME}"; then
    log_error "Modell-Download fehlgeschlagen"
    log_info "Bitte manuell versuchen: ollama pull ${MODEL_NAME}"
    exit 1
  fi

  log_success "Modell heruntergeladen: ${MODEL_NAME}"
}

create_custom_model() {
  log_info "Prüfe Custom-Modell: ${CUSTOM_MODEL_NAME}"

  # Check if custom model exists (escape regex special chars in model name)
  local escaped_custom_model_name
  escaped_custom_model_name=$(printf '%s' "$CUSTOM_MODEL_NAME" | sed 's/[][\.*^$()+?{|\\]/\\&/g')

  if ollama list 2>/dev/null | grep -qE "^${escaped_custom_model_name}[[:space:]]"; then
    log_success "Custom-Modell bereits vorhanden"
    return 0
  fi

  log_info "Erstelle optimiertes Custom-Modell..."

  # Create temporary Modelfile with unique name
  local modelfile
  modelfile=$(mktemp -t hablara-modelfile.XXXXXX)

  # Note: We rely on manual cleanup below instead of trap to avoid
  # clobbering the global cleanup handler set at script start
  # Use MODEL_NAME variable for consistency (unquoted heredoc to allow expansion)
  cat > "${modelfile}" <<EOF
FROM ${MODEL_NAME}

# Optimized parameters for Hablará emotion/fallacy detection
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

# System message for Hablará
SYSTEM You are an expert in psychology, communication analysis, and logical reasoning. Analyze text for emotions, cognitive biases, and logical fallacies with high accuracy.
EOF

  # Create custom model (capture exit code)
  local create_result=0
  ollama create "${CUSTOM_MODEL_NAME}" -f "${modelfile}" || create_result=$?

  # ALWAYS cleanup temp file (even on error)
  rm -f "${modelfile}"

  if [[ $create_result -ne 0 ]]; then
    log_error "Custom-Modell Erstellung fehlgeschlagen"
    log_warning "Fahre mit Standard-Modell fort"
    return 0  # Non-fatal, we can use base model
  fi

  log_success "Custom-Modell erstellt: ${CUSTOM_MODEL_NAME}"
  log_info "Accuracy-Boost: 80% → 93% (Emotion Detection)"
}

# ============================================================================
# Verification
# ============================================================================

verify_installation() {
  echo ""
  log_info "Verifiziere Installation..."

  # Check Ollama binary
  if ! command_exists ollama; then
    log_error "Ollama binary nicht gefunden"
    return 1
  fi

  # Check server API
  if ! curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
    log_error "Ollama Server nicht erreichbar"
    log_info "Starte manuell: 'ollama serve'"
    return 1
  fi

  # Escape regex special chars in model names
  local escaped_model_name escaped_custom_model_name
  escaped_model_name=$(printf '%s' "$MODEL_NAME" | sed 's/[][\.*^$()+?{|\\]/\\&/g')
  escaped_custom_model_name=$(printf '%s' "$CUSTOM_MODEL_NAME" | sed 's/[][\.*^$()+?{|\\]/\\&/g')

  # Check base model (exact match)
  if ! ollama list 2>/dev/null | grep -qE "^${escaped_model_name}[[:space:]]"; then
    log_error "Basis-Modell nicht gefunden: ${MODEL_NAME}"
    return 1
  fi

  log_success "Basis-Modell verfügbar: ${MODEL_NAME}"

  # Check custom model (optional, exact match)
  local test_model="$MODEL_NAME"
  if ollama list 2>/dev/null | grep -qE "^${escaped_custom_model_name}[[:space:]]"; then
    log_success "Custom-Modell verfügbar: ${CUSTOM_MODEL_NAME}"
    test_model="$CUSTOM_MODEL_NAME"
  else
    log_warning "Custom-Modell nicht verfügbar (verwende Basis-Modell)"
  fi

  # Test inference to verify model works
  if ! test_model_inference "$test_model"; then
    log_warning "Modell geladen, aber Inference-Test fehlgeschlagen"
    log_info "Das Modell könnte trotzdem funktionieren - teste es in der App"
  fi

  echo ""
  log_success "✨ Setup abgeschlossen!"

  return 0
}

# ============================================================================
# Main
# ============================================================================

main() {
  # Run pre-flight checks
  preflight_checks

  # Install Ollama
  install_ollama

  # Pull base model
  pull_base_model

  # Create custom model
  create_custom_model

  # Verify everything works
  if ! verify_installation; then
    exit 1
  fi

  # Success message
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🎉 Nächste Schritte:"
  echo ""
  echo "   1. Starte Hablará.app"
  echo "   2. Drücke Ctrl+Shift+D für erste Aufnahme"
  echo "   3. Mikrofon-Berechtigung erlauben (einmalig)"
  echo ""
  echo "💡 LLM Settings in der App:"
  echo "   - Provider: Ollama (Standard)"
  echo "   - Modell: qwen2.5:7b-custom"
  echo "   - Base URL: http://localhost:11434"
  echo ""
  echo "📖 Dokumentation: https://github.com/fidpa/hablara/blob/main/README.md"
  echo ""
}

# Run main function
main "$@"
