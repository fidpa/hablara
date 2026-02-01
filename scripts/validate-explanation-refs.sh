#!/bin/bash
# Validate all docs/explanation/ architecture references

echo "=== Validating docs/explanation/architecture/ References ==="

ERRORS=0
CHECKED=0

# List of architecture files that should be in architecture/ subdir
ARCH_FILES=(
  "ARCHITECTURE.md"
  "ARCHITECTURE_DIAGRAMS.md"
  "NATIVE_AUDIO_ARCHITECTURE.md"
  "STORAGE_ARCHITECTURE.md"
  "TRANSCRIPTION_ARCHITECTURE.md"
  "EMOTION_ANALYSIS.md"
  "CEG_PROMPTING.md"
  "RAG_ARCHITECTURE.md"
  "ENRICHMENT_DEFINITION.md"
  "LLM_INFERENCE_ENGINES.md"
  "EMOTION_BLENDING.md"
  "STEMMING_VS_EMBEDDINGS.md"
  "MLX_TOOLS_COMPARISON.md"
)

# Check if any files still reference old architecture paths
for arch_file in "${ARCH_FILES[@]}"; do
  # Look for references to docs/explanation/FILE.md (should be docs/explanation/architecture/FILE.md)
  if grep -r "docs/explanation/${arch_file}" docs/ .claude/ 2>/dev/null | grep -v "MIGRATION_NOTICE" | grep -v "architecture/${arch_file}"; then
    echo "❌ BROKEN: Found old reference to docs/explanation/${arch_file}"
    echo "    Should be: docs/explanation/architecture/${arch_file}"
    ERRORS=$((ERRORS + 1))
  fi
  CHECKED=$((CHECKED + 1))
done

echo "Checked $CHECKED architecture files"

if [ $ERRORS -eq 0 ]; then
  echo "✅ All architecture references use correct paths"
  exit 0
else
  echo "❌ Found $ERRORS outdated references"
  exit 1
fi
