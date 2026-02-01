#!/usr/bin/env python3
"""ONNX Model Quantization: FP32 → INT8 (Dynamic Quantization)

This script quantizes the paraphrase-multilingual-MiniLM-L12-v2 ONNX model
from Full Precision (FP32) to INT8 for reduced bundle size while maintaining
accuracy for RAG semantic search.

Target: 470 MB → ~200 MB (57% reduction)

Exit codes:
    0: Quantization successful
    1: Quantization failed (validation error)
    2: Runtime error (file not found, permission denied, etc.)
"""

import os
import shutil
import sys
from typing import Tuple

import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# Configuration
MODEL_DIR = "public/models/onnx-models/paraphrase-multilingual-MiniLM-L12-v2-onnx"
INPUT_MODEL = os.path.join(MODEL_DIR, "model.onnx")
OUTPUT_MODEL = os.path.join(MODEL_DIR, "model_quantized.onnx")
BACKUP_MODEL = os.path.join(MODEL_DIR, "model_fp32_backup.onnx")

# UI formatting
SEPARATOR_WIDTH = 60
MB_DIVISOR = 1024 * 1024


def get_file_size_mb(path: str) -> float:
    """Get file size in megabytes.

    Args:
        path: File path

    Returns:
        File size in MB

    Raises:
        FileNotFoundError: If file doesn't exist
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")

    return os.path.getsize(path) / MB_DIVISOR


def quantize_model() -> Tuple[float, float, float]:
    """Quantize ONNX model from FP32 to INT8.

    Returns:
        Tuple of (original_size_mb, quantized_size_mb, reduction_percent)

    Raises:
        FileNotFoundError: If input model doesn't exist
        RuntimeError: If quantization or validation fails
    """
    print("=" * SEPARATOR_WIDTH)
    print("ONNX Model Quantization: FP32 → INT8")
    print("=" * SEPARATOR_WIDTH)

    # 1. Validate input model exists
    if not os.path.exists(INPUT_MODEL):
        raise FileNotFoundError(f"Input model not found: {INPUT_MODEL}")

    # 2. Create backup
    print("\n[1/4] Creating backup...")
    print(f"      Source: {INPUT_MODEL}")
    print(f"      Backup: {BACKUP_MODEL}")
    try:
        shutil.copy2(INPUT_MODEL, BACKUP_MODEL)
        print("      ✅ Backup created")
    except Exception as e:
        raise RuntimeError(f"Backup creation failed: {e}") from e

    # 3. Validate original model
    print("\n[2/4] Validating original model...")
    try:
        model = onnx.load(INPUT_MODEL)
        onnx.checker.check_model(model)
        original_size = get_file_size_mb(INPUT_MODEL)
        print("      Model structure: OK")
        print(f"      Original size: {original_size:.1f} MB")
    except Exception as e:
        raise RuntimeError(f"Model validation failed: {e}") from e

    # 4. Quantize to INT8
    print("\n[3/4] Quantizing FP32 → INT8...")
    print("      Method: Dynamic Quantization")
    print("      Weight type: QUInt8")
    print("      Per-channel: False")

    try:
        quantize_dynamic(
            model_input=INPUT_MODEL,
            model_output=OUTPUT_MODEL,
            weight_type=QuantType.QUInt8,
        )
        print("      ✅ Quantization completed")
    except Exception as e:
        raise RuntimeError(f"Quantization failed: {e}") from e

    # 5. Validate quantized model
    print("\n[4/4] Validating quantized model...")
    try:
        quantized = onnx.load(OUTPUT_MODEL)
        onnx.checker.check_model(quantized)
        quantized_size = get_file_size_mb(OUTPUT_MODEL)
        reduction = (1 - quantized_size / original_size) * 100

        print("      Model structure: OK")
        print(f"      Quantized size: {quantized_size:.1f} MB")
    except Exception as e:
        raise RuntimeError(f"Quantized model validation failed: {e}") from e

    return original_size, quantized_size, reduction


def main() -> int:
    """Main entry point.

    Returns:
        Exit code (0=success, 1=validation_fail, 2=error)
    """
    try:
        original_size, quantized_size, reduction = quantize_model()

        # Print summary
        print(f"\n{'=' * SEPARATOR_WIDTH}")
        print("QUANTIZATION SUMMARY")
        print(f"{'=' * SEPARATOR_WIDTH}")
        print(f"Original (FP32):   {original_size:7.1f} MB")
        print(f"Quantized (INT8):  {quantized_size:7.1f} MB")
        print(f"Size reduction:    {reduction:7.1f}%")
        print(f"{'=' * SEPARATOR_WIDTH}")
        print(f"\n✅ Output saved: {OUTPUT_MODEL}")
        print(f"💾 Backup saved: {BACKUP_MODEL}")
        print("\n⚠️  Next: Run 'python3 scripts/validate-quantized-model.py'")

        return 0

    except FileNotFoundError as e:
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        print("⚠️  Make sure the input model exists", file=sys.stderr)
        return 2

    except Exception as e:
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 2


if __name__ == "__main__":
    sys.exit(main())
