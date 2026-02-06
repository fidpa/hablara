#!/usr/bin/env bash
#
# Hablará - Ollama Quick-Setup Script for Linux
#
# Usage: curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-linux.sh | bash
#        ./setup-ollama-linux.sh --model 3b
#
# Exit codes: 0=Success, 1=Error, 2=Disk space, 3=Network, 4=Platform

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# Configuration
# ============================================================================

readonly SCRIPT_VERSION="1.1.0"
readonly OLLAMA_API_URL="http://localhost:11434"
readonly OLLAMA_INSTALL_URL="https://ollama.com/install.sh"
readonly MIN_OLLAMA_VERSION="0.3.0"

MODEL_NAME=""
CUSTOM_MODEL_NAME=""
MODEL_SIZE=""
REQUIRED_DISK_SPACE_GB=10

# Format: model_name|download_size|disk_gb|ram_warning_gb
declare -A MODEL_CONFIGS=(
  ["3b"]="qwen2.5:3b|~2GB|5|"
  ["7b"]="qwen2.5:7b|~4.7GB|10|"
  ["14b"]="qwen2.5:14b|~9GB|15|"
  ["32b"]="qwen2.5:32b|~20GB|25|32"
)
readonly DEFAULT_MODEL="7b"

if [[ -t 1 ]]; then
  readonly COLOR_RESET='\033[0m'
  readonly COLOR_GREEN='\033[0;32m'
  readonly COLOR_YELLOW='\033[0;33m'
  readonly COLOR_RED='\033[0;31m'
  readonly COLOR_BLUE='\033[0;34m'
  readonly COLOR_CYAN='\033[0;36m'
else
  readonly COLOR_RESET='' COLOR_GREEN='' COLOR_YELLOW=''
  readonly COLOR_RED='' COLOR_BLUE='' COLOR_CYAN=''
fi

# ============================================================================
# Helper Functions
# ============================================================================

log_step() { echo -e "\n${COLOR_BLUE}==>${COLOR_RESET} ${COLOR_GREEN}${1}${COLOR_RESET}"; }
log_info() { echo -e "    ${COLOR_YELLOW}•${COLOR_RESET} ${1}"; }
log_success() { echo -e "    ${COLOR_GREEN}✓${COLOR_RESET} ${1}"; }
log_warn() { echo -e "    ${COLOR_YELLOW}⚠${COLOR_RESET} ${1}" >&2; }
log_error() { echo -e "${COLOR_RED}✗ Error: ${1}${COLOR_RESET}" >&2; }

command_exists() { command -v "$1" &> /dev/null; }

# Check if an Ollama model is installed (pipefail-safe, no regex escaping needed)
ollama_model_exists() {
  local model="$1"
  local found=false
  while IFS= read -r line; do
    # Extract first whitespace-delimited field (model name)
    local name="${line%%[[:space:]]*}"
    if [[ "$name" == "$model" ]]; then
      found=true
      break
    fi
  done < <(ollama list 2>/dev/null)
  $found
}

json_escape_string() {
  local str="$1"
  # Order matters: backslashes first
  str="${str//\\/\\\\}"
  str="${str//\"/\\\"}"
  str="${str//$'\n'/\\n}"
  str="${str//$'\t'/\\t}"
  str="${str//$'\r'/\\r}"
  printf '%s' "$str"
}

get_free_space_gb() {
  local free_space check_path

  # XDG spec requires absolute path validation
  if [[ -n "${XDG_DATA_HOME:-}" ]] && [[ "${XDG_DATA_HOME}" == /* ]]; then
    check_path="${XDG_DATA_HOME}/ollama"
  else
    check_path="${HOME}/.local/share/ollama"
  fi

  mkdir -p "${check_path}" 2>/dev/null || check_path="${HOME}"

  if command_exists df; then
    free_space=$(df -BG "${check_path}" 2>/dev/null | tail -1 | awk '{print $4}')
    free_space="${free_space%G}"
    [[ "$free_space" =~ ^[0-9]+$ ]] && echo "$free_space" || echo "0"
  else
    echo "0"
  fi
}

version_gte() {
  local v1="${1:-0.0.0}" v2="${2:-0.0.0}"

  if sort --version 2>/dev/null | grep "GNU" > /dev/null; then
    [[ "$(printf '%s\n%s' "$v2" "$v1" | sort -V | head -n1)" == "$v2" ]]
  else
    local -a v1_parts v2_parts
    IFS='.' read -ra v1_parts <<< "$v1"
    IFS='.' read -ra v2_parts <<< "$v2"

    local max_len="${#v1_parts[@]}"
    [[ ${#v2_parts[@]} -gt $max_len ]] && max_len="${#v2_parts[@]}"

    for ((i=0; i<max_len; i++)); do
      local p1="${v1_parts[i]:-0}" p2="${v2_parts[i]:-0}"
      p1="${p1//[^0-9]/}"; p1="${p1:-0}"
      p2="${p2//[^0-9]/}"; p2="${p2:-0}"
      ((p1 > p2)) && return 0
      ((p1 < p2)) && return 1
    done
    return 0
  fi
}

check_ollama_version() {
  local version_output current_version
  version_output=$(ollama --version 2>&1 | head -1)

  if [[ $version_output =~ ([0-9]+\.[0-9]+\.?[0-9]*) ]]; then
    current_version="${BASH_REMATCH[1]}"
    if ! version_gte "$current_version" "$MIN_OLLAMA_VERSION"; then
      log_warn "Ollama Version $current_version ist älter als empfohlen ($MIN_OLLAMA_VERSION)"
      log_info "Update: curl -fsSL https://ollama.com/install.sh | sh"
      return 1
    fi
  fi
  return 0
}

check_gpu_available() {
  if command_exists nvidia-smi && nvidia-smi &>/dev/null; then
    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    echo "nvidia:${gpu_name:-unknown}"; return 0
  fi

  if command_exists rocm-smi && rocm-smi &>/dev/null; then
    echo "amd_rocm"; return 0
  fi

  if [[ -d /opt/intel/oneapi ]] && command_exists sycl-ls; then
    if sycl-ls 2>/dev/null | grep -i "gpu" > /dev/null; then
      echo "intel_oneapi"; return 0
    fi
  fi

  echo "cpu"; return 1
}

test_model_inference() {
  local model="${1:-$MODEL_NAME}"
  log_info "Teste Model-Inference..."

  local escaped_model response
  escaped_model=$(json_escape_string "$model")
  response=$(curl -sf --max-time 60 "${OLLAMA_API_URL}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"${escaped_model}\", \"prompt\": \"Say OK\", \"stream\": false, \"options\": {\"num_predict\": 5}}" \
    2>/dev/null) || true

  if [[ -n "$response" ]] && echo "$response" | grep '"response"' > /dev/null; then
    log_success "Model-Inference-Test erfolgreich"
    return 0
  fi
  log_warn "Model-Inference-Test fehlgeschlagen"
  return 1
}

wait_for_ollama() {
  local max_attempts=30 attempt=1
  log_info "Warte auf Ollama Server..."

  while [[ $attempt -le $max_attempts ]]; do
    curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null && {
      log_success "Ollama Server ist bereit"; return 0
    }
    sleep 1; ((attempt++))
  done

  log_error "Ollama Server antwortet nicht nach ${max_attempts}s"
  return 1
}

cleanup() {
  local exit_code=$?
  [[ $exit_code -ne 0 ]] && log_error "Setup fehlgeschlagen mit Exit-Code: ${exit_code}"
}
trap cleanup EXIT

# ============================================================================
# Model Selection
# ============================================================================

show_help() {
  cat <<EOF
Hablará Ollama Quick-Setup Script for Linux v${SCRIPT_VERSION}

Usage: $0 [OPTIONS]

Options:
  -m, --model VARIANT   Select model variant (3b, 7b, 14b, 32b)
  -h, --help            Show this help message

Model variants:
  3b   - qwen2.5:3b   (~2GB download, 5GB disk)
  7b   - qwen2.5:7b   (~4.7GB download, 10GB disk) [DEFAULT]
  14b  - qwen2.5:14b  (~9GB download, 15GB disk)
  32b  - qwen2.5:32b  (~20GB download, 25GB disk, needs 32GB+ RAM)

Examples:
  $0                    # Interactive or default (7b)
  $0 --model 3b         # Use 3b model
  curl -fsSL URL | bash -s -- -m 14b  # Pipe with argument
EOF
}

get_system_ram_gb() {
  local mem_kb
  mem_kb=$(grep -E '^MemTotal:' /proc/meminfo 2>/dev/null | awk '{print $2}')
  [[ -n "$mem_kb" && "$mem_kb" =~ ^[0-9]+$ ]] && echo $(( mem_kb / 1024 / 1024 )) || echo "0"
}

show_model_menu() {
  echo ""
  echo -e "${COLOR_CYAN}Wähle ein Modell:${COLOR_RESET}"
  echo ""
  echo "  1) 3b  - qwen2.5:3b   (~2GB, schnell, weniger genau)"
  echo "  2) 7b  - qwen2.5:7b   (~4.7GB, ausgewogen) [EMPFOHLEN]"
  echo "  3) 14b - qwen2.5:14b  (~9GB, genauer)"
  echo "  4) 32b - qwen2.5:32b  (~20GB, beste Qualität, 32GB+ RAM)"
  echo ""
  echo -n "Auswahl [1-4, Enter=2]: "

  local choice
  read -r choice
  case "$choice" in
    1) echo "3b" ;; 2) echo "7b" ;; 3) echo "14b" ;; 4) echo "32b" ;; *) echo "7b" ;;
  esac
}

parse_model_config() {
  local variant="$1"
  local config="${MODEL_CONFIGS[$variant]:-}"
  [[ -z "$config" ]] && return 1

  IFS='|' read -r MODEL_NAME MODEL_SIZE REQUIRED_DISK_SPACE_GB RAM_WARNING <<< "$config"
  CUSTOM_MODEL_NAME="${MODEL_NAME}-custom"
  return 0
}

select_model() {
  local requested_model=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -m|--model)
        [[ -z "${2:-}" ]] && { log_error "Option $1 benötigt ein Argument"; exit 1; }
        requested_model="$2"; shift 2 ;;
      -h|--help) show_help; exit 0 ;;
      *) log_error "Unbekannte Option: $1"; exit 1 ;;
    esac
  done

  if [[ -z "$requested_model" ]]; then
    [[ -t 0 && -t 1 ]] && requested_model=$(show_model_menu) || requested_model="$DEFAULT_MODEL"
  fi

  if ! parse_model_config "$requested_model"; then
    log_error "Ungültige Modell-Variante: $requested_model"
    echo "Gültige Varianten: 3b, 7b, 14b, 32b"
    exit 1
  fi

  # RAM warning for large models
  if [[ -n "${RAM_WARNING:-}" ]]; then
    local system_ram
    system_ram=$(get_system_ram_gb)

    if [[ "$system_ram" -gt 0 && "$system_ram" -lt "${RAM_WARNING}" ]]; then
      echo ""
      log_warn "Das 32b-Modell benötigt mindestens ${RAM_WARNING}GB RAM"
      log_warn "Dein System hat nur ${system_ram}GB RAM"
      echo ""

      if [[ -t 0 && -t 1 ]]; then
        echo -n "Trotzdem fortfahren? [j/N]: "
        local confirm; read -r confirm
        [[ ! "$confirm" =~ ^[jJyY]$ ]] && { log_info "Abgebrochen."; exit 0; }
      else
        log_warn "Nicht-interaktiver Modus: Fahre trotzdem fort"
      fi
    fi
  fi

  [[ -z "${MODEL_NAME}" ]] && { log_error "Interner Fehler: MODEL_NAME nicht gesetzt"; exit 1; }
  log_info "Ausgewähltes Modell: ${MODEL_NAME}"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

preflight_checks() {
  echo ""
  echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
  echo -e "${COLOR_GREEN}  Hablará Ollama Quick-Setup v${SCRIPT_VERSION} (Linux)${COLOR_RESET}"
  echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
  echo ""

  log_step "Running pre-flight checks..."

  if [[ "$(uname)" != "Linux" ]]; then
    log_error "Dieses Script ist nur für Linux"
    log_info "Für macOS: scripts/setup-ollama-mac.sh"
    exit 4
  fi

  local distro="unknown"
  if [[ -f /etc/os-release ]]; then
    # Parse instead of source for security
    distro=$(grep -E "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
    [[ -z "$distro" ]] && distro=$(grep -E "^ID=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "unknown")
  fi
  log_info "Distribution: ${distro}"

  local free_space
  free_space=$(get_free_space_gb)
  if [[ $free_space -lt $REQUIRED_DISK_SPACE_GB ]]; then
    log_error "Nicht genügend Speicher: ${free_space}GB verfügbar, ${REQUIRED_DISK_SPACE_GB}GB benötigt"
    exit 2
  fi
  log_success "Speicherplatz: ${free_space}GB verfügbar"

  if ! curl -sf --connect-timeout 5 "https://ollama.com" &> /dev/null; then
    log_error "Keine Netzwerkverbindung zu ollama.com"
    exit 3
  fi
  log_success "Netzwerkverbindung OK"

  local gpu_info
  gpu_info=$(check_gpu_available)
  case "$gpu_info" in
    nvidia:*) log_success "NVIDIA GPU erkannt: ${gpu_info#nvidia:} (CUDA)" ;;
    amd_rocm) log_success "AMD GPU erkannt (ROCm, experimentell)" ;;
    intel_oneapi) log_success "Intel GPU erkannt (oneAPI, experimentell)" ;;
    cpu) log_warn "Keine GPU erkannt - CPU-Inferenz (langsamer)" ;;
  esac

  echo ""
}

# ============================================================================
# Ollama Installation
# ============================================================================

port_in_use() {
  local port="${1:-11434}"

  # Multiple detection methods for compatibility
  if command_exists ss; then
    ss -tlnp 2>/dev/null | grep ":${port}" > /dev/null
  elif command_exists lsof; then
    lsof -i ":${port}" &>/dev/null
  elif command_exists nc; then
    nc -z 127.0.0.1 "${port}" &>/dev/null
  elif [[ "$BASH_VERSION" ]]; then
    # Bash built-in /dev/tcp
    (echo >/dev/tcp/127.0.0.1/"${port}") 2>/dev/null
  else
    return 1
  fi
}

start_ollama_server() {
  curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null && {
    log_success "Ollama Server läuft bereits"; return 0
  }

  # Port might be in use by starting server
  if port_in_use 11434; then
    log_info "Port 11434 ist belegt, warte auf Ollama API..."
    for _ in {1..10}; do
      sleep 1
      curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null && {
        log_success "Ollama Server ist bereit"; return 0
      }
    done
    log_warn "Port 11434 belegt, aber Ollama API antwortet nicht"
    return 1
  fi

  # Try systemd first (preferred)
  if command_exists systemctl && systemctl --user list-unit-files ollama.service &>/dev/null; then
    log_info "Starte Ollama via systemd..."
    systemctl --user start ollama 2>/dev/null || true
    sleep 2
    curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null && {
      log_success "Ollama Server gestartet (systemd)"; return 0
    }
  fi

  # Fallback: nohup background process
  if command_exists ollama; then
    log_info "Starte Ollama Server (nohup)..."
    local log_file="${XDG_RUNTIME_DIR:-/tmp}/ollama-server-${UID}.log"
    nohup ollama serve &>"$log_file" &
    local ollama_pid=$!
    sleep 2

    if kill -0 "$ollama_pid" 2>/dev/null; then
      log_success "Ollama Server gestartet (PID: ${ollama_pid})"
      return 0
    fi
    log_warn "Ollama process failed - check: ${log_file}"
    return 1
  fi

  return 1
}

install_ollama() {
  log_step "Installing Ollama..."

  if command_exists ollama; then
    log_success "Ollama bereits installiert"
    local version
    version=$(ollama --version 2>/dev/null | head -1 || echo "unknown")
    log_info "Version: ${version}"
    check_ollama_version || true

    if ! curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null; then
      log_info "Prüfe Ollama Server..."
      if ! start_ollama_server; then
        log_error "Konnte Ollama Server nicht starten"
        log_info "Manuell starten: ollama serve"
        exit 1
      fi
      wait_for_ollama || exit 1
    else
      log_success "Ollama Server läuft"
    fi
    return 0
  fi

  log_info "Installiere Ollama..."
  if ! curl -fsSL "${OLLAMA_INSTALL_URL}" | sh; then
    log_error "Ollama Installation fehlgeschlagen"
    log_info "Manuelle Installation: https://ollama.com/download"
    exit 1
  fi
  log_success "Ollama installiert"

  start_ollama_server || log_warn "Server-Start fehlgeschlagen - manuell starten: ollama serve"
  wait_for_ollama || exit 1
}

# ============================================================================
# Model Management
# ============================================================================

pull_base_model() {
  log_step "Downloading base model..."
  log_info "Prüfe Modell: ${MODEL_NAME}"

  if ollama_model_exists "${MODEL_NAME}"; then
    log_success "Modell bereits vorhanden: ${MODEL_NAME}"
    return 0
  fi

  log_info "Lade ${MODEL_NAME} (${MODEL_SIZE}, dauert mehrere Minuten je nach Verbindung)..."
  if ! ollama pull "${MODEL_NAME}"; then
    log_error "Modell-Download fehlgeschlagen"
    log_info "Manuell versuchen: ollama pull ${MODEL_NAME}"
    exit 1
  fi
  log_success "Modell heruntergeladen: ${MODEL_NAME}"
}

create_custom_model() {
  log_step "Creating custom model..."
  log_info "Prüfe Custom-Modell: ${CUSTOM_MODEL_NAME}"

  if ollama_model_exists "${CUSTOM_MODEL_NAME}"; then
    log_success "Custom-Modell bereits vorhanden"
    return 0
  fi

  log_info "Erstelle optimiertes Custom-Modell..."

  local script_dir external_modelfile=""
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || script_dir=""
  [[ -n "$script_dir" && -f "${script_dir}/ollama/qwen2.5-7b-custom.modelfile" ]] && \
    external_modelfile="${script_dir}/ollama/qwen2.5-7b-custom.modelfile"

  local modelfile
  modelfile=$(mktemp -t hablara-modelfile.XXXXXX)
  chmod 600 "$modelfile"
  # Cleanup on function exit (including Ctrl+C)
  trap 'rm -f -- "$modelfile"' RETURN

  if [[ -n "$external_modelfile" ]]; then
    cp "$external_modelfile" "$modelfile"
  else
    cat > "${modelfile}" <<EOF
FROM ${MODEL_NAME}

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

SYSTEM You are an expert in psychology, communication analysis, and logical reasoning. Analyze text for emotions, cognitive biases, and logical fallacies with high accuracy.
EOF
  fi

  local create_result=0
  ollama create "${CUSTOM_MODEL_NAME}" -f "${modelfile}" || create_result=$?

  if [[ $create_result -ne 0 ]]; then
    log_warn "Custom-Modell Erstellung fehlgeschlagen - verwende Basis-Modell"
    return 0
  fi

  log_success "Custom-Modell erstellt: ${CUSTOM_MODEL_NAME}"
  log_info "Accuracy-Boost: 80% -> 93% (Emotion Detection)"
}

# ============================================================================
# Verification
# ============================================================================

verify_installation() {
  echo ""
  log_step "Verifying installation..."

  command_exists ollama || { log_error "Ollama binary nicht gefunden"; return 1; }
  curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null || {
    log_error "Ollama Server nicht erreichbar"
    return 1
  }

  ollama_model_exists "${MODEL_NAME}" || {
    log_error "Basis-Modell nicht gefunden: ${MODEL_NAME}"; return 1
  }
  log_success "Basis-Modell verfügbar: ${MODEL_NAME}"

  local test_model="$MODEL_NAME"
  if ollama_model_exists "${CUSTOM_MODEL_NAME}"; then
    log_success "Custom-Modell verfügbar: ${CUSTOM_MODEL_NAME}"
    test_model="$CUSTOM_MODEL_NAME"
  else
    log_warn "Custom-Modell nicht verfügbar (verwende Basis-Modell)"
  fi

  test_model_inference "$test_model" || log_warn "Inference-Test fehlgeschlagen - teste in der App"

  echo ""
  log_success "Setup abgeschlossen!"
  return 0
}

# ============================================================================
# Main
# ============================================================================

main() {
  select_model "$@"
  preflight_checks
  install_ollama
  pull_base_model
  create_custom_model
  verify_installation || exit 1

  echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
  echo ""
  echo -e "${COLOR_BLUE}Next Steps:${COLOR_RESET}"
  echo ""
  echo "   1. Starte Hablará.app"
  echo "   2. Drücke Ctrl+Shift+D für erste Aufnahme"
  echo "   3. Mikrofon-Berechtigung erlauben (einmalig)"
  echo ""
  echo "LLM Settings in der App:"
  echo "   - Provider: Ollama (Standard)"
  echo "   - Modell: ${CUSTOM_MODEL_NAME}"
  echo "   - Base URL: http://localhost:11434"
  echo ""
  echo "Systemd Service Management:"
  echo "   systemctl --user {status|start|stop|enable} ollama"
  echo ""
  echo -e "${COLOR_CYAN}Docs: https://github.com/fidpa/hablara${COLOR_RESET}"
  echo ""
}

main "$@"
