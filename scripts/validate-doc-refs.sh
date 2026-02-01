#!/bin/bash
# scripts/validate-doc-refs.sh
# Cross-reference validation script for docs/how-to/ references
# Prevents reference rot by detecting broken markdown links

echo "=========================================="
echo "Validating docs/how-to/ references..."
echo "=========================================="
echo ""

# Change to repo root
cd "$(dirname "$0")/.."

broken=0
checked=0

# Extract all markdown links containing 'how-to' from all markdown files
echo "Scanning for how-to references..."
echo ""

# Find all markdown files and extract how-to references
grep -r "](.*how-to.*)" --include="*.md" docs/ .claude/ *.md 2>/dev/null | while IFS=: read -r file match; do
  # Extract the path from markdown link [text](path)
  target=$(echo "$match" | sed -n 's/.*](\([^)]*how-to[^)]*\)).*/\1/p')

  if [[ -z "$target" ]]; then
    continue
  fi

  ((checked++))

  # Remove anchor (#section) from path
  target_path="${target%%#*}"

  # Skip URLs (http://, https://)
  if [[ "$target_path" =~ ^https?:// ]]; then
    continue
  fi

  # Resolve relative path from file's directory
  file_dir=$(dirname "$file")

  if [[ "$target_path" == ../* ]] || [[ "$target_path" == ./* ]]; then
    # Relative path
    target_full="$file_dir/$target_path"
  elif [[ "$target_path" == /* ]]; then
    # Absolute path (shouldn't happen)
    target_full="$target_path"
  else
    # Relative to file's directory
    target_full="$file_dir/$target_path"
  fi

  # Normalize path
  target_full=$(cd "$file_dir" 2>/dev/null && cd "$(dirname "$target_path")" 2>/dev/null && pwd)/$(basename "$target_path") 2>/dev/null || echo "$target_full"

  # Check if target exists
  if [[ ! -f "$target_full" ]]; then
    echo "❌ BROKEN: $file"
    echo "   Link: $target_path"
    echo "   Resolved: $target_full"
    echo ""
    ((broken++))
  fi
done

echo "=========================================="
echo "Validation Complete"
echo "=========================================="
echo "References checked: $checked"
echo "Broken references: $broken"
echo ""

if [[ $broken -eq 0 ]]; then
  echo "✅ All references valid!"
  exit 0
else
  echo "⚠️  Found $broken broken reference(s)"
  echo ""
  echo "To fix: Update references or use post-deadline reorganization plan (ADR-030)"
  exit 1
fi
