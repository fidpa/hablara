#!/bin/bash
#
# Hablará Version Bump Script
#
# Usage: ./scripts/bump-version.sh [patch|minor|major|prerelease] [--dry-run]
#
# Exit codes: 0=Success, 1=Args, 2=Git dirty, 3=Tests, 4=Sync failed, 5=Aborted

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

readonly CARGO_TOML="$PROJECT_ROOT/src-tauri/Cargo.toml"
readonly TAURI_CONF="$PROJECT_ROOT/src-tauri/tauri.conf.json"
readonly PACKAGE_JSON="$PROJECT_ROOT/package.json"
readonly TYPES_TS="$PROJECT_ROOT/src/lib/types.ts"
readonly README_MD="$PROJECT_ROOT/README.md"
readonly CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"

readonly RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BLUE='\033[0;34m' NC='\033[0m'
readonly VALID_TYPES=("patch" "minor" "major" "prerelease")

# ============================================================================
# Helper Functions
# ============================================================================

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 && $exit_code -ne 5 ]]; then
        echo ""; log_error "Script failed with exit code: $exit_code"
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

log_step() { echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"; }
log_info() { echo -e "    $1"; }
log_success() { echo -e "    ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "    ${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗ Error:${NC} $1"; }

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is required but not installed."
        return 1
    fi
    return 0
}

show_help() {
    cat <<'EOF'
Hablará Version Bump Script

Usage: ./scripts/bump-version.sh [TYPE] [--dry-run]

Types:
  patch      0.0.1 -> 0.0.2 (bug fixes) [DEFAULT]
  minor      0.1.0 -> 0.2.0 (new features)
  major      1.0.0 -> 2.0.0 (breaking changes)
  prerelease 0.0.1 -> 0.0.2-alpha.0

Flags:
  --dry-run  Show what would happen without changes
  -h, --help Show this help
EOF
    exit 0
}

validate_bump_type() {
    local type="$1"
    for valid in "${VALID_TYPES[@]}"; do
        [[ "$type" == "$valid" ]] && return 0
    done
    return 1
}

get_version() {
    local file="$1"
    case "$file" in
        *.json) grep '"version"' "$file" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/' ;;
        *.toml) grep '^version = ' "$file" | head -1 | sed 's/version = "\([^"]*\)"/\1/' ;;
    esac
}

set_version_toml() {
    local file="$1" version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/^version = \".*\"/version = \"$version\"/" "$file"
    else
        sed -i "s/^version = \".*\"/version = \"$version\"/" "$file"
    fi
}

set_version_json() {
    local file="$1" version="$2"
    if command -v jq &> /dev/null; then
        jq --arg v "$version" '.version = $v' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    else
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s/\"version\": *\"[^\"]*\"/\"version\": \"$version\"/" "$file"
        else
            sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$version\"/" "$file"
        fi
    fi
}

set_version_types_ts() {
    local file="$1" version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$version\"/" "$file"
    else
        sed -i "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$version\"/" "$file"
    fi
}

set_version_readme() {
    local file="$1" new_version="$2" old_version="$3"
    local sed_i=(-i)
    [[ "$(uname)" == "Darwin" ]] && sed_i=(-i '')

    # 1. Badge: version-X.Y.Z-blue
    sed "${sed_i[@]}" "s/version-[0-9][0-9.]*-blue/version-$new_version-blue/g" "$file"

    # 2. Filenames in install commands: hablara_X.Y.Z_ and hablara-X.Y.Z-
    #    (underscore/hyphen before version, NOT "v" prefix = not historical)
    sed "${sed_i[@]}" "s/hablara_${old_version}_/hablara_${new_version}_/g" "$file"
    sed "${sed_i[@]}" "s/hablara-${old_version}-/hablara-${new_version}-/g" "$file"

    # 3. Footer: **Version:** X.Y.Z
    sed "${sed_i[@]}" "s/\*\*Version:\*\* ${old_version}/\*\*Version:\*\* ${new_version}/g" "$file"
}

set_version_claude_md() {
    local file="$1" version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/\*\*Version:\*\* [0-9][0-9.]*/\*\*Version:\*\* $version/g" "$file"
        sed -i '' "s/Hablará v[0-9][0-9.]*/Hablará v$version/g" "$file"
    else
        sed -i "s/\*\*Version:\*\* [0-9][0-9.]*/\*\*Version:\*\* $version/g" "$file"
        sed -i "s/Hablará v[0-9][0-9.]*/Hablará v$version/g" "$file"
    fi
}

# ============================================================================
# Argument Parsing
# ============================================================================

BUMP_TYPE=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        patch|minor|major|prerelease)
            [[ -n "$BUMP_TYPE" ]] && { log_error "Multiple bump types: '$BUMP_TYPE' and '$arg'"; exit 1; }
            BUMP_TYPE="$arg" ;;
        --dry-run) DRY_RUN=true ;;
        -h|--help) show_help ;;
        *) log_error "Unknown argument: $arg"; exit 1 ;;
    esac
done

[[ -z "$BUMP_TYPE" ]] && BUMP_TYPE="patch"

# ============================================================================
# Pre-flight Checks
# ============================================================================

log_step "Pre-flight checks"

if [[ ! -f "$PACKAGE_JSON" ]] || [[ ! -f "$CARGO_TOML" ]]; then
    log_error "Must be run from Hablará project root"
    exit 1
fi
log_success "Working directory: $PROJECT_ROOT"

DEPS_OK=true
for dep in node npm cargo; do
    check_dependency "$dep" && log_success "$dep found" || DEPS_OK=false
done
command -v jq &> /dev/null && log_success "jq found" || log_warn "jq not found - using sed fallback"
[[ "$DEPS_OK" == "false" ]] && exit 1

UNCOMMITTED_CHANGES=$(git -C "$PROJECT_ROOT" status --porcelain)
if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
    log_warn "Uncommitted changes detected - will be included in commit"
    echo "$UNCOMMITTED_CHANGES" | head -10 | while read -r line; do log_info "  $line"; done
    CHANGE_COUNT=$(echo "$UNCOMMITTED_CHANGES" | wc -l | tr -d ' ')
    [[ "$CHANGE_COUNT" -gt 10 ]] && log_info "  ... and $((CHANGE_COUNT - 10)) more"
else
    log_success "Git working directory clean"
fi

CURRENT_BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    log_warn "Not on main branch (current: $CURRENT_BRANCH)"
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "    Continue anyway? (y/N) " -n 1 -r; echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && { log_info "Aborted"; exit 5; }
    fi
else
    log_success "On branch: $CURRENT_BRANCH"
fi

# ============================================================================
# Version Analysis
# ============================================================================

log_step "Analyzing current versions"

CURRENT_NPM=$(get_version "$PACKAGE_JSON")
CURRENT_CARGO=$(get_version "$CARGO_TOML")
CURRENT_TAURI=$(get_version "$TAURI_CONF")

log_info "package.json:      $CURRENT_NPM"
log_info "Cargo.toml:        $CURRENT_CARGO"
log_info "tauri.conf.json:   $CURRENT_TAURI"

if [[ "$CURRENT_NPM" != "$CURRENT_CARGO" || "$CURRENT_CARGO" != "$CURRENT_TAURI" ]]; then
    log_error "Versions are not synchronized!"
    exit 4
fi
log_success "All versions synchronized: $CURRENT_NPM"

# ============================================================================
# Calculate New Version
# ============================================================================

log_step "Calculating new version ($BUMP_TYPE)"

IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_NPM%-*}"
PRERELEASE="${CURRENT_NPM#*-}"
[[ "$PRERELEASE" == "$CURRENT_NPM" ]] && PRERELEASE=""

case "$BUMP_TYPE" in
    patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
    minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
    major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    prerelease)
        if [[ -n "$PRERELEASE" ]]; then
            PRE_NUM="${PRERELEASE##*.}"; PRE_TAG="${PRERELEASE%.*}"
            NEW_VERSION="$MAJOR.$MINOR.$PATCH-$PRE_TAG.$((PRE_NUM + 1))"
        else
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))-alpha.0"
        fi ;;
esac

log_info "Current: $CURRENT_NPM"
log_info "New:     $NEW_VERSION"

# ============================================================================
# Dry Run
# ============================================================================

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}DRY RUN - No changes made${NC}"
    echo ""
    echo "Would bump: $CURRENT_NPM -> $NEW_VERSION"
    echo ""
    echo "Files to modify: package.json, package-lock.json, Cargo.toml, Cargo.lock,"
    echo "                 tauri.conf.json, types.ts, README.md, CLAUDE.md"
    echo ""
    echo "Git: git add -A && git commit && git tag v$NEW_VERSION"
    echo ""
    echo "Run without --dry-run to apply."
    exit 0
fi

# ============================================================================
# Run Tests
# ============================================================================

log_step "Running tests"

log_info "Frontend tests..."
if npm test --prefix "$PROJECT_ROOT" -- --run 2>/dev/null; then
    log_success "Frontend tests passed"
else
    log_error "Frontend tests failed"; exit 3
fi

log_info "Rust tests..."
if cargo test --manifest-path "$CARGO_TOML" --quiet 2>/dev/null; then
    log_success "Rust tests passed"
else
    log_error "Rust tests failed"; exit 3
fi

# ============================================================================
# Apply Version Bump
# ============================================================================

log_step "Applying version bump"

cd "$PROJECT_ROOT"

log_info "Updating package.json..."
set_version_json "$PACKAGE_JSON" "$NEW_VERSION"
[[ -f "$PROJECT_ROOT/package-lock.json" ]] && set_version_json "$PROJECT_ROOT/package-lock.json" "$NEW_VERSION"
log_success "package.json: $NEW_VERSION"

log_info "Updating Cargo.toml..."
set_version_toml "$CARGO_TOML" "$NEW_VERSION"
log_success "Cargo.toml: $NEW_VERSION"

log_info "Updating tauri.conf.json..."
set_version_json "$TAURI_CONF" "$NEW_VERSION"
log_success "tauri.conf.json: $NEW_VERSION"

log_info "Updating types.ts..."
set_version_types_ts "$TYPES_TS" "$NEW_VERSION"
log_success "types.ts: $NEW_VERSION"

log_info "Updating README.md..."
set_version_readme "$README_MD" "$NEW_VERSION" "$CURRENT_NPM" && log_success "README.md: badge + filenames + footer updated" || log_warn "README.md: update failed"

log_info "Updating CLAUDE.md..."
grep -q "Version:" "$CLAUDE_MD" && set_version_claude_md "$CLAUDE_MD" "$NEW_VERSION" && log_success "CLAUDE.md: updated" || log_warn "CLAUDE.md: no version refs"

log_info "Updating Cargo.lock..."
cargo generate-lockfile --manifest-path "$CARGO_TOML" 2>/dev/null || cargo build --manifest-path "$CARGO_TOML" --quiet 2>/dev/null || true
log_success "Cargo.lock updated"

# ============================================================================
# Verify & Commit
# ============================================================================

log_step "Verifying version sync"

FINAL_NPM=$(get_version "$PACKAGE_JSON")
FINAL_CARGO=$(get_version "$CARGO_TOML")
FINAL_TAURI=$(get_version "$TAURI_CONF")

if [[ "$FINAL_NPM" != "$NEW_VERSION" || "$FINAL_CARGO" != "$NEW_VERSION" || "$FINAL_TAURI" != "$NEW_VERSION" ]]; then
    log_error "Version sync verification failed!"
    git -C "$PROJECT_ROOT" checkout -- .
    exit 4
fi
log_success "All versions synchronized"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}Version Bump Complete!${NC}"
echo ""
echo "  Version:  ${BLUE}$CURRENT_NPM${NC} -> ${GREEN}$NEW_VERSION${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  git add -A && git commit -m \"chore: release v$NEW_VERSION\""
echo "  git tag v$NEW_VERSION"
echo "  git push origin $CURRENT_BRANCH --tags"
echo ""
