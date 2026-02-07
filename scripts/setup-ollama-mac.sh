#!/usr/bin/env bash
#
# Hablará - Ollama Setup Script for macOS
#
# Usage: curl -fsSL https://raw.githubusercontent.com/fidpa/hablara/main/scripts/setup-ollama-mac.sh | bash
#        ./setup-ollama-mac.sh --model 3b
#
# Exit codes: 0=Success, 1=Error, 2=Disk space, 3=Network, 4=Platform

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# Configuration
# ============================================================================

readonly SCRIPT_VERSION="1.2.0"
readonly OLLAMA_API_URL="http://localhost:11434"
readonly OLLAMA_INSTALL_URL="https://ollama.com/install.sh"
readonly MIN_OLLAMA_VERSION="0.3.0"

MODEL_NAME=""
CUSTOM_MODEL_NAME=""
MODEL_SIZE=""
REQUIRED_DISK_SPACE_GB=0
RAM_WARNING=""
FORCE_UPDATE=false
STATUS_CHECK_MODE=false

# Model config lookup (Bash 3.2 compatible - no associative arrays)
# Returns: model_name|download_size|disk_gb|ram_warning_gb
get_model_config() {
  case "${1:-}" in
    3b)  echo "qwen2.5:3b|~2GB|5|" ;;
    7b)  echo "qwen2.5:7b|~4.7GB|10|" ;;
    14b) echo "qwen2.5:14b|~9GB|15|" ;;
    32b) echo "qwen2.5:32b|~20GB|25|48" ;;
    *)   return 1 ;;
  esac
}
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
log_error() { echo -e "${COLOR_RED}✗ Fehler: ${1}${COLOR_RESET}" >&2; }

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
  local free_space check_path="${HOME}/.ollama"
  mkdir -p "${check_path}" 2>/dev/null || check_path="${HOME}"

  if command_exists df; then
    free_space=$(df -g "${check_path}" 2>/dev/null | tail -1 | awk '{print $4}' || true)
    [[ "${free_space:-}" =~ ^[0-9]+$ ]] && echo "$free_space" || echo "0"
  else
    echo "0"
  fi
}

version_gte() {
  local v1="${1:-0.0.0}" v2="${2:-0.0.0}"

  if command_exists gsort; then
    # macOS with Homebrew coreutils
    [[ "$(printf '%s\n%s' "$v2" "$v1" | gsort -V | head -n1)" == "$v2" ]]
  elif sort --version 2>/dev/null | grep "GNU" > /dev/null; then
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

# Returns version string (e.g. "0.6.2") or "unbekannt" — no log output
get_ollama_version_string() {
  local version_output
  version_output=$(ollama --version 2>&1 | head -1)
  if [[ $version_output =~ ([0-9]+\.[0-9]+\.?[0-9]*) ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "unbekannt"
  fi
}

check_ollama_version() {
  local current_version
  current_version=$(get_ollama_version_string)

  if [[ "$current_version" != "unbekannt" ]]; then
    if ! version_gte "$current_version" "$MIN_OLLAMA_VERSION"; then
      log_warn "Ollama Version $current_version ist älter als empfohlen ($MIN_OLLAMA_VERSION)"
      log_info "Update: brew upgrade ollama"
      return 1
    fi
  fi
  return 0
}

check_gpu_available() {
  if [[ "$(uname)" == "Darwin" ]]; then
    # uname -m is more reliable than sysctl for detecting Apple Silicon
    [[ "$(uname -m)" == "arm64" ]] && { echo "apple_silicon"; return 0; }
  fi

  if command_exists nvidia-smi && nvidia-smi &>/dev/null; then
    echo "nvidia"; return 0
  fi

  echo "cpu"; return 1
}

# Silent inference check: returns 0 if model responds, 1 otherwise (no log output)
_check_model_responds() {
  local model="$1"
  local escaped_model response
  escaped_model=$(json_escape_string "$model")
  response=$(curl -sf --max-time 60 "${OLLAMA_API_URL}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"${escaped_model}\", \"prompt\": \"Sage OK\", \"stream\": false, \"options\": {\"num_predict\": 5}}" \
    2>/dev/null) || true

  [[ -n "$response" ]] && echo "$response" | grep '"response"' > /dev/null
}

test_model_inference() {
  local model="${1:-$MODEL_NAME}"
  log_info "Teste Modell..."

  if _check_model_responds "$model"; then
    log_success "Modell-Test erfolgreich"
    return 0
  fi
  log_warn "Modell-Test fehlgeschlagen"
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
  if [[ $exit_code -ne 0 && "$STATUS_CHECK_MODE" == "false" ]]; then
    log_error "Setup fehlgeschlagen"
  fi
}
trap cleanup EXIT

# ============================================================================
# Status Check
# ============================================================================

run_status_check() {
  STATUS_CHECK_MODE=true
  local errors=0

  echo ""
  echo "=== Hablará Ollama Status ==="
  echo ""

  # 1. Ollama installed?
  if command_exists ollama; then
    local current_version
    current_version=$(get_ollama_version_string)
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Ollama installiert (v${current_version})"
    if [[ "$current_version" != "unbekannt" ]] && ! version_gte "$current_version" "$MIN_OLLAMA_VERSION"; then
      echo -e "    ${COLOR_YELLOW}↳ Update empfohlen (mindestens v${MIN_OLLAMA_VERSION}): brew upgrade ollama${COLOR_RESET}"
    fi
  else
    echo -e "  ${COLOR_RED}✗${COLOR_RESET} Ollama nicht gefunden"
    errors=$((errors + 1))
  fi

  # 2. Server reachable?
  local server_reachable=false
  if curl -sf --max-time 5 "${OLLAMA_API_URL}/api/version" &> /dev/null; then
    server_reachable=true
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Server läuft"
  else
    echo -e "  ${COLOR_RED}✗${COLOR_RESET} Server nicht erreichbar"
    errors=$((errors + 1))
  fi

  # 3. GPU detected?
  local gpu_type
  gpu_type=$(check_gpu_available) || true
  case "$gpu_type" in
    apple_silicon) echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} GPU: Apple Silicon (Metal-Beschleunigung)" ;;
    nvidia)        echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} GPU: NVIDIA (CUDA-Beschleunigung)" ;;
    *)             echo -e "  ${COLOR_YELLOW}•${COLOR_RESET} Keine GPU — Verarbeitung ohne GPU-Beschleunigung" ;;
  esac

  # 4. Base models present? (scan all variants, largest first)
  local base_models_found=()
  local variant
  for variant in 32b 14b 7b 3b; do
    local config_line
    config_line=$(get_model_config "$variant") || continue
    local model_name="${config_line%%|*}"
    if ollama_model_exists "$model_name"; then
      base_models_found+=("$model_name")
    fi
  done

  if [[ ${#base_models_found[@]} -eq 1 ]]; then
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Basis-Modell: ${base_models_found[0]}"
  elif [[ ${#base_models_found[@]} -gt 1 ]]; then
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Basis-Modelle:"
    for model in "${base_models_found[@]}"; do
      echo -e "    ${COLOR_GREEN}✓${COLOR_RESET} ${model}"
    done
  else
    echo -e "  ${COLOR_RED}✗${COLOR_RESET} Kein Basis-Modell gefunden"
    errors=$((errors + 1))
  fi

  # 5. Custom models present? (scan all variants, largest first)
  local custom_models_found=()
  for variant in 32b 14b 7b 3b; do
    local config_line
    config_line=$(get_model_config "$variant") || continue
    local model_name="${config_line%%|*}"
    if ollama_model_exists "${model_name}-custom"; then
      custom_models_found+=("${model_name}-custom")
    fi
  done

  if [[ ${#custom_models_found[@]} -eq 1 ]]; then
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Hablará-Modell: ${custom_models_found[0]}"
    if [[ ${#base_models_found[@]} -eq 0 ]]; then
      echo -e "    ${COLOR_YELLOW}↳ Basis-Modell fehlt — Hablará-Modell benötigt es als Grundlage${COLOR_RESET}"
    fi
  elif [[ ${#custom_models_found[@]} -gt 1 ]]; then
    echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Hablará-Modelle:"
    for model in "${custom_models_found[@]}"; do
      echo -e "    ${COLOR_GREEN}✓${COLOR_RESET} ${model}"
    done
    if [[ ${#base_models_found[@]} -eq 0 ]]; then
      echo -e "    ${COLOR_YELLOW}↳ Basis-Modell fehlt — Hablará-Modell benötigt es als Grundlage${COLOR_RESET}"
    fi
  else
    echo -e "  ${COLOR_RED}✗${COLOR_RESET} Kein Hablará-Modell gefunden"
    errors=$((errors + 1))
  fi

  # 6. Model inference works? (use smallest model for fastest check)
  local last_custom=${#custom_models_found[@]}
  local last_base=${#base_models_found[@]}
  local test_model=""
  if [[ $last_custom -gt 0 ]]; then
    test_model="${custom_models_found[$((last_custom - 1))]}"
  elif [[ $last_base -gt 0 ]]; then
    test_model="${base_models_found[$((last_base - 1))]}"
  fi
  if [[ "$server_reachable" != "true" ]]; then
    echo -e "  ${COLOR_YELLOW}•${COLOR_RESET} Modell-Test übersprungen (Server nicht erreichbar)"
  elif [[ -n "$test_model" ]]; then
    if _check_model_responds "$test_model"; then
      echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} Modell antwortet"
    else
      echo -e "  ${COLOR_RED}✗${COLOR_RESET} Modell antwortet nicht"
      errors=$((errors + 1))
    fi
  else
    echo -e "  ${COLOR_RED}✗${COLOR_RESET} Modell antwortet nicht"
    errors=$((errors + 1))
  fi

  # 7. Storage usage (only Hablará-relevant qwen2.5 models, parsed from ollama list)
  local all_models=("${base_models_found[@]}" "${custom_models_found[@]}")
  if [[ ${#all_models[@]} -gt 0 ]] && command_exists ollama; then
    local total_gb=0 ollama_list
    ollama_list=$(ollama list 2>/dev/null) || true
    for model in "${all_models[@]}"; do
      local size_str
      size_str=$(echo "$ollama_list" | awk -v m="$model" '$1 == m {print $3, $4}')
      if [[ "$size_str" =~ ([0-9.]+)[[:space:]]*([KMGT]?B) ]]; then
        local val="${BASH_REMATCH[1]}" unit="${BASH_REMATCH[2]}"
        case "$unit" in
          GB) total_gb=$(awk "BEGIN {printf \"%.1f\", $total_gb + $val}") ;;
          MB) total_gb=$(awk "BEGIN {printf \"%.1f\", $total_gb + $val / 1024}") ;;
          KB) total_gb=$(awk "BEGIN {printf \"%.1f\", $total_gb + $val / 1048576}") ;;
        esac
      fi
    done
    echo -e "  ${COLOR_YELLOW}•${COLOR_RESET} Speicherverbrauch (Hablará): ~${total_gb} GB"
  else
    echo -e "  ${COLOR_YELLOW}•${COLOR_RESET} Speicherverbrauch: nicht ermittelbar"
  fi

  echo ""
  if [[ $errors -eq 0 ]]; then
    echo -e "${COLOR_GREEN}Alles in Ordnung.${COLOR_RESET}"
  else
    echo -e "${COLOR_RED}Probleme gefunden. Starte das Setup erneut oder prüfe die Ollama-Installation.${COLOR_RESET}"
  fi
  echo ""

  [[ $errors -eq 0 ]]
}

# ============================================================================
# Model Selection
# ============================================================================

show_help() {
  cat <<EOF
Hablará Ollama Setup für macOS v${SCRIPT_VERSION}

Verwendung: $0 [OPTIONEN]

Optionen:
  -m, --model VARIANTE  Modell-Variante wählen (3b, 7b, 14b, 32b)
  --update              Hablará-Modell aktualisieren
  --status              Ollama-Installation prüfen (Health-Check)
  -h, --help            Diese Hilfe anzeigen

Modell-Varianten:
  3b   - qwen2.5:3b   Schnelle Ergebnisse, läuft auf jedem modernen Gerät
  7b   - qwen2.5:7b   Gute Qualität, benötigt leistungsfähige Hardware [STANDARD]
  14b  - qwen2.5:14b  Hohe Qualität, benötigt starke Hardware
  32b  - qwen2.5:32b  Beste Qualität, benötigt sehr starke Hardware

Beispiele:
  $0                    # Interaktiv oder Standard (7b)
  $0 --model 3b         # 3b-Modell verwenden
  $0 --update           # Hablará-Modell aktualisieren
  $0 --status           # Installation prüfen
  curl -fsSL URL | bash -s -- -m 14b  # Pipe mit Argument
  curl -fsSL URL | bash -s -- --update  # Update via Pipe
EOF
}

get_system_ram_gb() {
  local mem_bytes
  mem_bytes=$(sysctl -n hw.memsize 2>/dev/null)
  [[ -n "$mem_bytes" && "$mem_bytes" =~ ^[0-9]+$ ]] && echo $(( mem_bytes / 1024 / 1024 / 1024 )) || echo "0"
}

show_model_menu() {
  # Print menu to stderr so stdout only contains the result
  echo "" >&2
  echo -e "${COLOR_CYAN}Wähle ein Modell:${COLOR_RESET}" >&2
  echo "" >&2
  echo "  1) 3b  - Schnelle Ergebnisse, läuft auf jedem modernen Gerät" >&2
  echo "  2) 7b  - Gute Qualität, benötigt leistungsfähige Hardware [EMPFOHLEN]" >&2
  echo "  3) 14b - Hohe Qualität, benötigt starke Hardware" >&2
  echo "  4) 32b - Beste Qualität, benötigt sehr starke Hardware" >&2
  echo "" >&2
  echo -n "Auswahl [1-4, Enter=2]: " >&2

  local choice
  read -r choice </dev/tty || choice=""
  case "$choice" in
    1) echo "3b" ;; 2) echo "7b" ;; 3) echo "14b" ;; 4) echo "32b" ;; *) echo "7b" ;;
  esac
}

# IMPORTANT: Must run in parent shell (not subshell) - sets global variables
parse_model_config() {
  local variant="$1"
  local config
  config=$(get_model_config "$variant") || return 1

  IFS='|' read -r MODEL_NAME MODEL_SIZE REQUIRED_DISK_SPACE_GB RAM_WARNING <<< "$config"
  CUSTOM_MODEL_NAME="${MODEL_NAME}-custom"
  return 0
}

show_main_menu() {
  echo "" >&2
  echo -e "${COLOR_CYAN}Wähle eine Aktion:${COLOR_RESET}" >&2
  echo "" >&2
  echo "  1) Ollama einrichten oder aktualisieren" >&2
  echo "  2) Status prüfen" >&2
  echo "" >&2
  echo -n "Auswahl [1-2, Enter=1]: " >&2

  local choice
  read -r choice </dev/tty || choice=""
  case "$choice" in
    2) echo "status" ;;
    *) echo "setup" ;;
  esac
}

select_model() {
  local requested_model=""
  local has_explicit_flags=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -m|--model)
        [[ -z "${2:-}" ]] && { log_error "Option $1 benötigt ein Argument"; exit 1; }
        requested_model="$2"; has_explicit_flags=true; shift 2 ;;
      --update) FORCE_UPDATE=true; has_explicit_flags=true; shift ;;
      --status) local _rc=0; run_status_check || _rc=$?; exit $_rc ;;
      -h|--help) show_help; exit 0 ;;
      *) log_error "Unbekannte Option: $1"; exit 1 ;;
    esac
  done

  # Interactive main menu (only when no explicit flags and TTY available)
  if [[ "$has_explicit_flags" == "false" && -z "$requested_model" && -r /dev/tty ]]; then
    local action
    action=$(show_main_menu) || action="setup"
    if [[ "$action" == "status" ]]; then
      local _rc=0; run_status_check || _rc=$?; exit $_rc
    fi
  fi

  if [[ -z "$requested_model" ]]; then
    # /dev/tty allows interactive input even when piped via curl | bash
    if [[ -r /dev/tty ]]; then
      requested_model=$(show_model_menu) || requested_model="$DEFAULT_MODEL"
    else
      requested_model="$DEFAULT_MODEL"
    fi
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
      log_warn "Das 32b-Modell empfiehlt mindestens ${RAM_WARNING}GB RAM"
      log_warn "Dein System hat ${system_ram}GB RAM"
      echo ""

      if [[ -r /dev/tty ]]; then
        echo -n "Trotzdem fortfahren? [j/N]: "
        local confirm; read -r confirm </dev/tty || confirm=""
        [[ ! "$confirm" =~ ^[jJyY]$ ]] && { log_info "Abgebrochen."; exit 0; }
      else
        log_warn "Fahre fort..."
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
  echo -e "${COLOR_GREEN}  Hablará Ollama Setup v${SCRIPT_VERSION} (macOS)${COLOR_RESET}"
  echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
  echo ""

  log_step "Führe Vorab-Prüfungen durch..."

  if [[ "$(uname)" != "Darwin" ]]; then
    log_error "Dieses Script ist nur für macOS"
    log_info "Für Linux: scripts/setup-ollama-linux.sh"
    exit 4
  fi

  local free_space
  free_space=$(get_free_space_gb)
  if [[ $free_space -lt $REQUIRED_DISK_SPACE_GB ]]; then
    log_error "Nicht genügend Speicher: ${free_space}GB verfügbar, ${REQUIRED_DISK_SPACE_GB}GB benötigt"
    exit 2
  fi
  log_success "Speicherplatz: ${free_space}GB verfügbar"

  if ! curl -sf --connect-timeout 5 --max-time 10 "https://ollama.com" &> /dev/null; then
    log_error "Keine Netzwerkverbindung zu ollama.com"
    exit 3
  fi
  log_success "Netzwerkverbindung OK"

  local gpu_type
  gpu_type=$(check_gpu_available) || true
  case "$gpu_type" in
    apple_silicon) log_success "Apple Silicon erkannt (Metal-Beschleunigung)" ;;
    nvidia) log_success "NVIDIA GPU erkannt (CUDA-Beschleunigung)" ;;
    *) log_warn "Keine GPU erkannt - Verarbeitung ohne GPU-Beschleunigung" ;;
  esac

  echo ""
}

# ============================================================================
# Ollama Installation
# ============================================================================

port_in_use() {
  local port="${1:-11434}"
  if command_exists lsof; then
    # -sTCP:LISTEN filters out ESTABLISHED/TIME_WAIT false positives
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN &>/dev/null
  elif command_exists nc; then
    nc -z 127.0.0.1 "${port}" &>/dev/null
  elif [[ "$BASH_VERSION" ]]; then
    (echo >/dev/tcp/127.0.0.1/"${port}") 2>/dev/null
  else
    return 1
  fi
}

start_ollama_server() {
  curl -sf "${OLLAMA_API_URL}/api/version" &> /dev/null && {
    log_success "Ollama Server läuft bereits"; return 0
  }

  # Port might be in use by starting server - delegate to wait_for_ollama (30s)
  if port_in_use 11434; then
    log_info "Port 11434 ist belegt, warte auf Ollama API..."
    wait_for_ollama && return 0
    log_warn "Port 11434 belegt, aber Ollama API antwortet nicht"
    return 1
  fi

  # Try launchd (Ollama.app installation)
  if [[ -f ~/Library/LaunchAgents/com.ollama.ollama.plist ]]; then
    launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist 2>/dev/null || true
    sleep 2
    curl -sf "${OLLAMA_API_URL}/api/version" &>/dev/null && return 0
    # launchd start didn't produce API - fall through to next method
  fi

  # Try Ollama.app
  if [[ -d "/Applications/Ollama.app" ]]; then
    open -a Ollama 2>/dev/null || true
    sleep 3
    curl -sf "${OLLAMA_API_URL}/api/version" &>/dev/null && return 0
    # Ollama.app start didn't produce API - fall through to nohup
  fi

  # Fallback: nohup
  if command_exists ollama; then
    nohup ollama serve &>/dev/null &
    local ollama_pid=$!
    sleep 2
    kill -0 "$ollama_pid" 2>/dev/null && return 0
    log_warn "Ollama Prozess konnte nicht gestartet werden"
    return 1
  fi

  return 1
}

install_ollama() {
  log_step "Installiere Ollama..."

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

  if command_exists brew; then
    log_info "Verwende Homebrew..."
    if ! brew install ollama; then
      log_error "Homebrew Installation fehlgeschlagen"
      log_info "Alternative: https://ollama.com/download"
      exit 1
    fi
    log_success "Ollama via Homebrew installiert"
    start_ollama_server || log_warn "Server-Start fehlgeschlagen - manuell starten: ollama serve"
  else
    log_info "Verwende Ollama-Installer..."
    if ! curl -fsSL "${OLLAMA_INSTALL_URL}" | sh; then
      log_error "Ollama Installation fehlgeschlagen"
      log_info "Manuelle Installation: https://ollama.com/download"
      exit 1
    fi
    log_success "Ollama installiert"
    start_ollama_server || log_warn "Server-Start fehlgeschlagen - manuell starten: ollama serve"
  fi

  wait_for_ollama || exit 1
}

# ============================================================================
# Model Management
# ============================================================================

pull_base_model() {
  log_step "Lade Basis-Modell herunter..."

  if ollama_model_exists "${MODEL_NAME}"; then
    log_success "Modell bereits vorhanden: ${MODEL_NAME}"
    return 0
  fi

  log_info "Lade ${MODEL_NAME} (${MODEL_SIZE}, dauert mehrere Minuten je nach Verbindung)..."
  log_info "Tipp: Bei Abbruch (Ctrl+C) setzt ein erneuter Start den Download fort"

  local pull_success=false
  for attempt in 1 2 3; do
    if ollama pull "${MODEL_NAME}"; then
      pull_success=true
      break
    fi
    if [[ $attempt -lt 3 ]]; then
      log_warn "Download fehlgeschlagen, Versuch $((attempt + 1))/3..."
      sleep 3
    fi
  done

  if ! $pull_success; then
    log_error "Modell-Download fehlgeschlagen nach 3 Versuchen"
    log_info "Manuell versuchen: ollama pull ${MODEL_NAME}"
    exit 1
  fi
  log_success "Modell heruntergeladen: ${MODEL_NAME}"
}

# Subshell function: isolates EXIT trap for temp file cleanup (no RETURN trap leak)
create_custom_model() (
  set -euo pipefail
  log_step "Erstelle Hablará-Modell..."

  local action_verb="erstellt"

  if ollama_model_exists "${CUSTOM_MODEL_NAME}"; then
    # FORCE_UPDATE from parent scope (subshell copy; changes don't propagate back)
    if [[ "$FORCE_UPDATE" == "true" ]]; then
      log_info "Aktualisiere bestehendes Hablará-Modell..."
      action_verb="aktualisiert"
    elif exec 3<>/dev/tty; then
      # Interaktiv: Menü über FD3 (TTY), damit stderr-Redirect den Prompt nicht versteckt
      printf "\n" >&3
      printf "    • Hablará-Modell %s bereits vorhanden.\n" "${CUSTOM_MODEL_NAME}" >&3
      printf "\n" >&3
      printf "  1) Überspringen (keine Änderung)\n" >&3
      printf "  2) Hablará-Modell aktualisieren\n" >&3
      printf "\n" >&3
      printf "Auswahl [1-2, Enter=1]: " >&3
      local update_choice
      IFS= read -r -t 30 update_choice <&3 || update_choice=""
      exec 3>&- 3<&-
      if [[ "$update_choice" != "2" ]]; then
        log_success "Hablará-Modell beibehalten"
        return 0
      fi
      log_info "Aktualisiere bestehendes Hablará-Modell..."
      action_verb="aktualisiert"
    else
      # Kein nutzbares TTY → wie non-interaktiv behandeln (Skip)
      log_success "Hablará-Modell bereits vorhanden"
      return 0
    fi
  fi

  # Dynamic modelfile path based on selected model variant (e.g. qwen2.5:7b → qwen2.5-7b-custom.modelfile)
  local script_dir="" external_modelfile=""
  if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || script_dir=""
  fi
  local modelfile_name="${MODEL_NAME/:/-}-custom.modelfile"
  [[ -n "$script_dir" && -f "${script_dir}/ollama/${modelfile_name}" ]] && \
    external_modelfile="${script_dir}/ollama/${modelfile_name}"

  local modelfile
  modelfile=$(mktemp "${TMPDIR:-/tmp}/hablara-modelfile.XXXXXX")
  chmod 600 "$modelfile"
  # Cleanup on subshell exit (EXIT trap is subshell-scoped, no leak to parent)
  trap 'rm -f -- "$modelfile"' EXIT

  if [[ -n "$external_modelfile" ]]; then
    log_info "Verwende Hablará-Konfiguration"
    cp "$external_modelfile" "$modelfile"
  else
    log_info "Verwende Standard-Konfiguration"
    cat > "${modelfile}" <<EOF
FROM ${MODEL_NAME}

PARAMETER num_ctx 8192
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

SYSTEM """Du bist ein KI-Assistent für die Hablará Voice Intelligence Platform.

Deine Aufgaben:
1. Textanalyse: Emotionen, Argumente, Tonalität und psychologische Muster erkennen
2. Wissensassistenz: Fragen zu Hablará-Features beantworten

Wichtig:
- Sei präzise und objektiv
- Berücksichtige deutschen Sprachgebrauch und Kultur
- Folge dem im Prompt angegebenen Antwortformat (JSON oder natürliche Sprache)
- Keine Halluzinationen oder erfundene Details
"""
EOF
  fi

  local create_result=0
  ollama create "${CUSTOM_MODEL_NAME}" -f "${modelfile}" || create_result=$?

  if [[ $create_result -ne 0 ]]; then
    log_warn "Hablará-Modell konnte nicht ${action_verb} werden - verwende Basis-Modell"
    return 0
  fi

  log_success "Hablará-Modell ${action_verb}: ${CUSTOM_MODEL_NAME}"
)

# ============================================================================
# Verification
# ============================================================================

verify_installation() {
  echo ""
  log_step "Überprüfe Installation..."

  command_exists ollama || { log_error "Ollama nicht gefunden"; return 1; }
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
    log_success "Hablará-Modell verfügbar: ${CUSTOM_MODEL_NAME}"
    test_model="$CUSTOM_MODEL_NAME"
  else
    log_warn "Hablará-Modell nicht verfügbar (verwende Basis-Modell)"
  fi

  test_model_inference "$test_model" || log_warn "Modell-Test fehlgeschlagen, teste in der App"

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
  echo -e "${COLOR_BLUE}Nächste Schritte:${COLOR_RESET}"
  echo ""
  echo "   1. Starte Hablará"
  echo "   2. Drücke Ctrl+Shift+D für erste Aufnahme"
  echo "   3. Mikrofon-Berechtigung erlauben (einmalig)"
  echo ""
  local final_model="${MODEL_NAME}"
  ollama_model_exists "${CUSTOM_MODEL_NAME}" && final_model="${CUSTOM_MODEL_NAME}"

  echo "LLM-Einstellungen in der App:"
  echo "   - Provider: Ollama (Standard)"
  echo "   - Modell: ${final_model}"
  echo "   - Base URL: http://localhost:11434"
  echo ""
  echo -e "${COLOR_CYAN}Dokumentation: https://github.com/fidpa/hablara${COLOR_RESET}"
  echo ""
}

main "$@"
