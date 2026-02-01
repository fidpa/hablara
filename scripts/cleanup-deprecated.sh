#!/bin/bash
# scripts/cleanup-deprecated.sh
#
# Removes deprecated components identified by knip scan
# All files are recoverable from Git history (see docs/DEPRECATED.md)
#
# Usage: ./scripts/cleanup-deprecated.sh [OPTIONS]
#
# Options:
#   --dry-run    Preview changes without deleting files
#   --help, -h   Show this help message
#   --force      Skip all confirmations (use with caution)
#
# Exit codes:
#   0 - Success (all files removed or dry-run)
#   1 - Errors occurred during deletion
#   2 - User cancelled operation
#   3 - Repository not clean (uncommitted changes)

set -e
set -o pipefail

# ============================================================================
# Configuration
# ============================================================================

# Ensure script runs from repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT" || {
  echo "❌ Error: Could not change to repository root"
  exit 1
}

# Colors for output (portable via tput)
if command -v tput >/dev/null 2>&1 && [ -t 1 ]; then
  RED=$(tput setaf 1)
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  NC=$(tput sgr0)
else
  # Fallback if tput unavailable
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
fi

# Files to remove (relative to repo root)
DEPRECATED_FILES=(
  "src/components/AudioLevelMeter.tsx"
  "src/components/FallacyHighlight.tsx"
  "src/components/TranscriptView.tsx"
  "src/lib/export.ts"
  "src/app-dev/admin/generate-embeddings/page.tsx"
)

# Flags
DRY_RUN=false
FORCE=false
REMOVED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

# ============================================================================
# Functions
# ============================================================================

show_help() {
  cat << EOF
Usage: $0 [OPTIONS]

Removes deprecated components identified by knip scan.
All files are recoverable from Git history (see docs/DEPRECATED.md).

Options:
  --dry-run    Preview changes without deleting files
  --force      Skip all confirmations (use with caution)
  --help, -h   Show this help message

Exit codes:
  0 - Success (all files removed or dry-run)
  1 - Errors occurred during deletion
  2 - User cancelled operation
  3 - Repository has uncommitted changes (use git stash first)

Examples:
  $0 --dry-run              # Preview what would be deleted
  $0                        # Interactive mode (asks for confirmation)
  $0 --force                # Delete without confirmation

EOF
  exit 0
}

check_git_status() {
  if ! command -v git >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: git not found, skipping repository check${NC}"
    return 0
  fi

  # Check if we're in a git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Not a git repository${NC}"
    return 0
  fi

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}❌ Error: Repository has uncommitted changes${NC}"
    echo ""
    echo "Please commit or stash your changes first:"
    echo "  git stash"
    echo "  $0"
    echo "  git stash pop"
    echo ""
    return 1
  fi

  return 0
}

remove_file() {
  local file="$1"

  if [ ! -f "$file" ]; then
    echo -e "  ${YELLOW}⊘${NC} Skipped: $file (not found)"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} Would remove: $file"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
    return 0
  fi

  # Attempt removal with error handling
  if rm "$file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Removed: $file"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} Failed to remove: $file (check permissions)"
    FAILED_COUNT=$((FAILED_COUNT + 1))
    return 1
  fi
}

cleanup_empty_dirs() {
  local dir="src/app-dev/admin"

  if [ ! -d "$dir" ]; then
    return 0
  fi

  if [ -n "$(ls -A "$dir" 2>/dev/null)" ]; then
    # Directory not empty
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} Would remove empty directory: $dir"
  else
    if rmdir "$dir" 2>/dev/null; then
      echo -e "  ${GREEN}✓${NC} Removed empty directory: $dir"
    else
      echo -e "  ${YELLOW}⊘${NC} Could not remove directory: $dir"
    fi
  fi
}

# ============================================================================
# Main Script
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      show_help
      ;;
    *)
      echo -e "${RED}❌ Error: Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Show banner
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
  echo ""
fi

echo -e "${YELLOW}📋 Deprecated Components Cleanup${NC}"
echo "=================================================="
echo ""
echo "This script will remove the following files:"
echo ""

# Show files to be removed
for file in "${DEPRECATED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${RED}✗${NC} $file"
  else
    echo -e "  ${YELLOW}⊘${NC} $file (already removed)"
  fi
done

echo ""
echo "All files are documented in docs/DEPRECATED.md"
echo "Recovery instructions are included for each file"
echo ""

# Check git status (skip in dry-run or force mode)
if [ "$DRY_RUN" = false ] && [ "$FORCE" = false ]; then
  if ! check_git_status; then
    exit 3
  fi
fi

# Ask for confirmation (unless dry-run or force)
if [ "$DRY_RUN" = false ] && [ "$FORCE" = false ]; then
  read -p "Continue with deletion? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    exit 2
  fi
fi

echo ""
echo -e "${GREEN}🧹 Starting cleanup...${NC}"
echo ""

# Remove files
for file in "${DEPRECATED_FILES[@]}"; do
  remove_file "$file"
done

# Cleanup empty directories
cleanup_empty_dirs

# Summary
echo ""
echo "=================================================="

if [ $FAILED_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ Cleanup complete!${NC}"
else
  echo -e "${YELLOW}⚠️  Cleanup completed with errors${NC}"
fi

echo ""
echo "Summary:"
echo "  - Files removed: $REMOVED_COUNT"
echo "  - Files skipped: $SKIPPED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "  - ${RED}Files failed: $FAILED_COUNT${NC}"
fi

echo ""
echo "📖 Recovery instructions: docs/DEPRECATED.md"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}ℹ️  This was a dry run. Run without --dry-run to actually delete files.${NC}"
  echo ""
fi

# Suggest next steps (only if actually removed files)
if [ "$DRY_RUN" = false ] && [ $REMOVED_COUNT -gt 0 ]; then
  echo "Next steps:"
  echo "  1. Review changes: git status"
  echo "  2. Run build: pnpm build"
  echo "  3. Run tests: pnpm test"
  echo "  4. Commit: git add -A && git commit -m 'chore: remove deprecated components'"
  echo ""
fi

# Exit with appropriate code
if [ $FAILED_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
