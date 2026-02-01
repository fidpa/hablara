#!/bin/bash
# =============================================================================
# Hablará Version Bump Script
# =============================================================================
# Synchronisiert Versionen in package.json, Cargo.toml und tauri.conf.json
# nach SemVer (Semantic Versioning).
#
# Usage: ./scripts/bump-version.sh [patch|minor|major|prerelease] [--dry-run]
#
# Arguments:
#   patch      Bump patch version (0.0.1 -> 0.0.2) - Bug fixes
#   minor      Bump minor version (0.1.0 -> 0.2.0) - New features
#   major      Bump major version (1.0.0 -> 2.0.0) - Breaking changes
#   prerelease Bump prerelease    (0.0.1 -> 0.0.2-alpha.0)
#
# Flags:
#   --dry-run  Show what would happen without making changes
#   -h, --help Show this help message
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments or missing dependencies
#   2 - Git working directory not clean
#   3 - Tests failed
#   4 - Version sync failed
#   5 - User aborted
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly PROJECT_ROOT

readonly CARGO_TOML="$PROJECT_ROOT/src-tauri/Cargo.toml"
readonly TAURI_CONF="$PROJECT_ROOT/src-tauri/tauri.conf.json"
readonly PACKAGE_JSON="$PROJECT_ROOT/package.json"
readonly TYPES_TS="$PROJECT_ROOT/src/lib/types.ts"
readonly README_MD="$PROJECT_ROOT/README.md"
readonly CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Valid bump types
readonly VALID_TYPES=("patch" "minor" "major" "prerelease")

# -----------------------------------------------------------------------------
# Cleanup & Signal Handling
# -----------------------------------------------------------------------------

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 && $exit_code -ne 5 ]]; then
        echo ""
        log_error "Script failed with exit code: $exit_code"
        echo "  Run with --help for usage information"
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

log_info() {
    echo -e "    $1"
}

log_success() {
    echo -e "    ${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "    ${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗ Error:${NC} $1"
}

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is required but not installed."
        case "$1" in
            node) echo "  Install with: brew install node" ;;
            npm)  echo "  Install with: brew install node" ;;
            cargo) echo "  Install with: https://rustup.rs" ;;
            jq)   echo "  Install with: brew install jq (optional, sed fallback available)" ;;
        esac
        return 1
    fi
    return 0
}

show_help() {
    # Extract header comment block (lines 2-27)
    sed -n '2,27p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

validate_bump_type() {
    local type="$1"
    for valid in "${VALID_TYPES[@]}"; do
        if [[ "$type" == "$valid" ]]; then
            return 0
        fi
    done
    return 1
}

get_version() {
    local file="$1"
    case "$file" in
        *.json)
            grep '"version"' "$file" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/'
            ;;
        *.toml)
            grep '^version = ' "$file" | head -1 | sed 's/version = "\([^"]*\)"/\1/'
            ;;
    esac
}

set_version_toml() {
    local file="$1"
    local version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/^version = \".*\"/version = \"$version\"/" "$file"
    else
        sed -i "s/^version = \".*\"/version = \"$version\"/" "$file"
    fi
}

set_version_json() {
    local file="$1"
    local version="$2"
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
    local file="$1"
    local version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$version\"/" "$file"
    else
        sed -i "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$version\"/" "$file"
    fi
}

set_version_readme_badge() {
    local file="$1"
    local version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        # Update shield.io badge: version-X.Y.Z-blue
        sed -i '' "s/version-[0-9][0-9.]*-blue/version-$version-blue/g" "$file"
    else
        sed -i "s/version-[0-9][0-9.]*-blue/version-$version-blue/g" "$file"
    fi
}

set_version_claude_md() {
    local file="$1"
    local version="$2"
    if [[ "$(uname)" == "Darwin" ]]; then
        # Update "**Version:** X.Y.Z" pattern
        sed -i '' "s/\*\*Version:\*\* [0-9][0-9.]*/\*\*Version:\*\* $version/g" "$file"
        # Update "v1.0.0" in header (Hablará v1.0.0)
        sed -i '' "s/Hablará v[0-9][0-9.]*/Hablará v$version/g" "$file"
    else
        sed -i "s/\*\*Version:\*\* [0-9][0-9.]*/\*\*Version:\*\* $version/g" "$file"
        sed -i "s/Hablará v[0-9][0-9.]*/Hablará v$version/g" "$file"
    fi
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------

BUMP_TYPE=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        patch|minor|major|prerelease)
            if [[ -n "$BUMP_TYPE" ]]; then
                log_error "Multiple bump types specified: '$BUMP_TYPE' and '$arg'"
                exit 1
            fi
            BUMP_TYPE="$arg"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        -h|--help)
            show_help
            ;;
        *)
            log_error "Unknown argument: $arg"
            echo "Usage: $SCRIPT_NAME [patch|minor|major|prerelease] [--dry-run]"
            echo "Run '$SCRIPT_NAME --help' for more information."
            exit 1
            ;;
    esac
done

# Default to patch if no type specified
if [[ -z "$BUMP_TYPE" ]]; then
    BUMP_TYPE="patch"
fi

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

log_step "Pre-flight checks"

# Check working directory
if [[ ! -f "$PACKAGE_JSON" ]] || [[ ! -f "$CARGO_TOML" ]]; then
    log_error "Must be run from Hablará project root"
    log_info "Expected: package.json and src-tauri/Cargo.toml"
    exit 1
fi
log_success "Working directory: $PROJECT_ROOT"

# Check dependencies
DEPS_OK=true
for dep in node npm cargo; do
    if check_dependency "$dep"; then
        log_success "$dep found"
    else
        DEPS_OK=false
    fi
done

# jq is optional (sed fallback)
if command -v jq &> /dev/null; then
    log_success "jq found (JSON editing)"
else
    log_warn "jq not found - using sed fallback for JSON"
fi

if [[ "$DEPS_OK" == "false" ]]; then
    exit 1
fi

# Check git status - uncommitted changes will be included in version bump commit
UNCOMMITTED_CHANGES=$(git -C "$PROJECT_ROOT" status --porcelain)
if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
    log_warn "Uncommitted changes detected - will be included in version bump commit"
    log_info "Changed files:"
    echo "$UNCOMMITTED_CHANGES" | head -10 | while read -r line; do
        log_info "  $line"
    done
    CHANGE_COUNT=$(echo "$UNCOMMITTED_CHANGES" | wc -l | tr -d ' ')
    if [[ "$CHANGE_COUNT" -gt 10 ]]; then
        log_info "  ... and $((CHANGE_COUNT - 10)) more files"
    fi
else
    log_success "Git working directory clean"
fi

# Check branch (warning only)
CURRENT_BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    log_warn "Not on main branch (current: $CURRENT_BRANCH)"
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "    Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted by user"
            exit 5
        fi
    fi
else
    log_success "On branch: $CURRENT_BRANCH"
fi

# -----------------------------------------------------------------------------
# Version Analysis
# -----------------------------------------------------------------------------

log_step "Analyzing current versions"

CURRENT_NPM=$(get_version "$PACKAGE_JSON")
CURRENT_CARGO=$(get_version "$CARGO_TOML")
CURRENT_TAURI=$(get_version "$TAURI_CONF")

log_info "package.json:      $CURRENT_NPM"
log_info "Cargo.toml:        $CURRENT_CARGO"
log_info "tauri.conf.json:   $CURRENT_TAURI"

# Check version sync
if [[ "$CURRENT_NPM" != "$CURRENT_CARGO" || "$CURRENT_CARGO" != "$CURRENT_TAURI" ]]; then
    log_error "Versions are not synchronized!"
    log_info "Synchronize manually before bumping."
    exit 4
fi
log_success "All versions synchronized: $CURRENT_NPM"

# -----------------------------------------------------------------------------
# Calculate New Version
# -----------------------------------------------------------------------------

log_step "Calculating new version ($BUMP_TYPE)"

# Calculate new version WITHOUT side effects (pure calculation)
# DO NOT use `npm version` here as it modifies package.json
IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_NPM%-*}"
PRERELEASE="${CURRENT_NPM#*-}"
[[ "$PRERELEASE" == "$CURRENT_NPM" ]] && PRERELEASE=""

case "$BUMP_TYPE" in
    patch)
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        ;;
    minor)
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        ;;
    major)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
    prerelease)
        if [[ -n "$PRERELEASE" ]]; then
            # Increment prerelease number
            PRE_NUM="${PRERELEASE##*.}"
            PRE_TAG="${PRERELEASE%.*}"
            NEW_VERSION="$MAJOR.$MINOR.$PATCH-$PRE_TAG.$((PRE_NUM + 1))"
        else
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))-alpha.0"
        fi
        ;;
esac

log_info "Current: $CURRENT_NPM"
log_info "New:     $NEW_VERSION"
log_success "Bump type: $BUMP_TYPE"

# -----------------------------------------------------------------------------
# Dry Run Check
# -----------------------------------------------------------------------------

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}DRY RUN - No changes made${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Would bump: $CURRENT_NPM -> $NEW_VERSION"
    echo ""
    echo "Version files that would be modified:"
    echo "  - package.json"
    echo "  - package-lock.json"
    echo "  - src-tauri/Cargo.toml"
    echo "  - src-tauri/Cargo.lock"
    echo "  - src-tauri/tauri.conf.json"
    echo "  - src/lib/types.ts (APP_VERSION)"
    echo "  - README.md (badge)"
    echo "  - CLAUDE.md (version references)"
    if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
        echo ""
        echo -e "${YELLOW}Uncommitted changes that would be included:${NC}"
        echo "$UNCOMMITTED_CHANGES" | while read -r line; do
            echo "  $line"
        done
    fi
    echo ""
    echo "Git operations that would be performed:"
    echo "  - git add -A (all changes)"
    if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
        echo "  - git commit -m \"chore: release v$NEW_VERSION\""
    else
        echo "  - git commit -m \"chore: bump version to v$NEW_VERSION\""
    fi
    echo "  - git tag \"v$NEW_VERSION\""
    echo ""
    echo "Run without --dry-run to apply changes."
    exit 0
fi

# -----------------------------------------------------------------------------
# Run Tests
# -----------------------------------------------------------------------------

log_step "Running tests"

log_info "Frontend tests..."
if npm test --prefix "$PROJECT_ROOT" -- --run 2>/dev/null; then
    log_success "Frontend tests passed"
else
    log_error "Frontend tests failed"
    log_info "Fix tests before version bump"
    exit 3
fi

log_info "Rust tests..."
if cargo test --manifest-path "$CARGO_TOML" --quiet 2>/dev/null; then
    log_success "Rust tests passed"
else
    log_error "Rust tests failed"
    log_info "Fix tests before version bump"
    exit 3
fi

# -----------------------------------------------------------------------------
# Apply Version Bump
# -----------------------------------------------------------------------------

log_step "Applying version bump"

# 1. Update package.json (using calculated version)
log_info "Updating package.json..."
cd "$PROJECT_ROOT"
set_version_json "$PACKAGE_JSON" "$NEW_VERSION"
# Also update package-lock.json if it exists
if [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
    set_version_json "$PROJECT_ROOT/package-lock.json" "$NEW_VERSION"
fi
log_success "package.json: $NEW_VERSION"

# 2. Sync Cargo.toml
log_info "Updating Cargo.toml..."
set_version_toml "$CARGO_TOML" "$NEW_VERSION"
log_success "Cargo.toml: $NEW_VERSION"

# 3. Sync tauri.conf.json
log_info "Updating tauri.conf.json..."
set_version_json "$TAURI_CONF" "$NEW_VERSION"
log_success "tauri.conf.json: $NEW_VERSION"

# 4. Sync types.ts (APP_VERSION constant)
log_info "Updating types.ts..."
set_version_types_ts "$TYPES_TS" "$NEW_VERSION"
log_success "types.ts: APP_VERSION = \"$NEW_VERSION\""

# 5. Sync README.md badge
log_info "Updating README.md badge..."
if grep -q "version-[0-9][0-9.]*-blue" "$README_MD"; then
    set_version_readme_badge "$README_MD" "$NEW_VERSION"
    log_success "README.md: badge updated"
else
    log_warn "README.md: no version badge found (skipped)"
fi

# 6. Sync CLAUDE.md version references
log_info "Updating CLAUDE.md..."
if grep -q "Version:" "$CLAUDE_MD"; then
    set_version_claude_md "$CLAUDE_MD" "$NEW_VERSION"
    log_success "CLAUDE.md: version references updated"
else
    log_warn "CLAUDE.md: no version references found (skipped)"
fi

# 7. Update Cargo.lock
log_info "Updating Cargo.lock..."
cargo generate-lockfile --manifest-path "$CARGO_TOML" 2>/dev/null || \
    cargo build --manifest-path "$CARGO_TOML" --quiet 2>/dev/null || true
log_success "Cargo.lock updated"

# -----------------------------------------------------------------------------
# Verify Sync
# -----------------------------------------------------------------------------

log_step "Verifying version sync"

FINAL_NPM=$(get_version "$PACKAGE_JSON")
FINAL_CARGO=$(get_version "$CARGO_TOML")
FINAL_TAURI=$(get_version "$TAURI_CONF")

log_info "package.json:      $FINAL_NPM"
log_info "Cargo.toml:        $FINAL_CARGO"
log_info "tauri.conf.json:   $FINAL_TAURI"

if [[ "$FINAL_NPM" != "$NEW_VERSION" || "$FINAL_CARGO" != "$NEW_VERSION" || "$FINAL_TAURI" != "$NEW_VERSION" ]]; then
    log_error "Version sync verification failed!"
    log_info "Expected all to be: $NEW_VERSION"
    log_info "Reverting changes..."
    git -C "$PROJECT_ROOT" checkout -- .
    exit 4
fi
log_success "All versions synchronized"

# -----------------------------------------------------------------------------
# Git Commit & Tag
# -----------------------------------------------------------------------------

log_step "Creating git commit and tag"

cd "$PROJECT_ROOT"

# Stage ALL changes (version files + any other uncommitted changes)
log_info "Staging all changes..."
git add -A

# Commit with appropriate message
log_info "Creating commit..."
if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
    # If there were uncommitted changes, use a release commit message
    git commit -m "chore: release v$NEW_VERSION"
    log_success "Commit created (includes all changes)"
else
    # Clean bump only
    git commit -m "chore: bump version to v$NEW_VERSION"
    log_success "Commit created"
fi

# Tag
log_info "Creating tag..."
git tag "v$NEW_VERSION"
log_success "Tag created: v$NEW_VERSION"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Version Bump Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Version:  ${BLUE}$CURRENT_NPM${NC} -> ${GREEN}$NEW_VERSION${NC}"
echo "  Type:     $BUMP_TYPE"
echo "  Tag:      v$NEW_VERSION"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review changes:     git show"
echo "  2. Push to remote:     git push origin $CURRENT_BRANCH --tags"
echo "  3. Create release:     gh release create v$NEW_VERSION"
echo ""
echo -e "${BLUE}Rollback (if needed):${NC}"
echo "  git reset --hard HEAD~1 && git tag -d v$NEW_VERSION"
echo ""
