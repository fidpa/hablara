#!/usr/bin/env python3
"""Validate INT8 vs FP32 embedding accuracy

This script compares embeddings from FP32 and INT8-quantized models
to ensure accuracy remains above the similarity threshold.

Test corpus: 8 sentences covering German/English, emotions, fallacies,
GFK (Gewaltfreie Kommunikation), cognitive distortions, and communication models.

Exit codes:
    0: Validation passed (similarity >= threshold)
    1: Validation failed (similarity < threshold)
    2: Runtime error (file not found, model load failure, etc.)
"""

import os
import sys
from typing import Tuple

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

# Configuration
MODEL_DIR = "public/models/onnx-models/paraphrase-multilingual-MiniLM-L12-v2-onnx"
FP32_MODEL = os.path.join(MODEL_DIR, "model_fp32_backup.onnx")
INT8_MODEL = os.path.join(MODEL_DIR, "model_quantized.onnx")

# Validation parameters
SIMILARITY_THRESHOLD = 0.98
EMBEDDING_DIM = 384

# UI formatting
SEPARATOR_WIDTH = 70
TEXT_COLUMN_WIDTH = 50

TEST_SENTENCES = [
    "Was ist Stress?",
    "Gewaltfreie Kommunikation nach Rosenberg",
    "Kognitive Verzerrungen erkennen",
    "Ich bin wütend und frustriert.",
    "Das ist ein Strohmann-Argument.",
    "Emotionen verstehen und regulieren",
    "Vier-Seiten-Modell von Schulz von Thun",
    "How does emotion detection work?",
]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors.

    Args:
        a: First embedding vector
        b: Second embedding vector

    Returns:
        Cosine similarity in range [-1, 1]

    Raises:
        ValueError: If vectors have different dimensions or zero magnitude
    """
    if a.shape != b.shape:
        raise ValueError(f"Vector dimension mismatch: {a.shape} vs {b.shape}")

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        raise ValueError("Cannot compute similarity for zero-magnitude vectors")

    return float(np.dot(a, b) / (norm_a * norm_b))


def embed(
    session: ort.InferenceSession,
    tokenizer: AutoTokenizer,
    text: str,
) -> np.ndarray:
    """Generate sentence embedding using ONNX model.

    Args:
        session: ONNX Runtime inference session
        tokenizer: HuggingFace tokenizer
        text: Input text to embed

    Returns:
        384-dim embedding vector (mean-pooled)

    Raises:
        RuntimeError: If inference fails
    """
    # Tokenize input
    inputs = tokenizer(
        text,
        return_tensors="np",
        padding=True,
        truncation=True,
        max_length=512,
    )

    # Prepare ONNX inputs (including token_type_ids for BERT-based models)
    onnx_inputs = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64),
    }

    # Add token_type_ids if not present (zeros for sentence-transformers)
    if "token_type_ids" not in inputs:
        onnx_inputs["token_type_ids"] = np.zeros_like(
            inputs["input_ids"], dtype=np.int64
        )
    else:
        onnx_inputs["token_type_ids"] = inputs["token_type_ids"].astype(np.int64)

    try:
        # Run inference
        outputs = session.run(None, onnx_inputs)
    except Exception as e:
        raise RuntimeError(f"ONNX inference failed: {e}") from e

    # Mean pooling
    token_embeddings = outputs[0]
    attention_mask = inputs["attention_mask"].astype(float)
    mask_expanded = np.expand_dims(attention_mask, -1)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask = np.sum(mask_expanded, axis=1)

    # Avoid division by zero
    sum_mask = np.where(sum_mask == 0, 1, sum_mask)
    pooled = sum_embeddings / sum_mask

    return pooled[0]


def validate_models() -> Tuple[float, float, float]:
    """Run validation comparing FP32 and INT8 models.

    Returns:
        Tuple of (average_similarity, min_similarity, max_similarity)

    Raises:
        FileNotFoundError: If model files don't exist
        RuntimeError: If model loading or inference fails
    """
    # Check file existence
    if not os.path.exists(FP32_MODEL):
        raise FileNotFoundError(f"FP32 model not found: {FP32_MODEL}")
    if not os.path.exists(INT8_MODEL):
        raise FileNotFoundError(f"INT8 model not found: {INT8_MODEL}")

    print("=" * SEPARATOR_WIDTH)
    print("ONNX Model Accuracy Validation: FP32 vs INT8")
    print("=" * SEPARATOR_WIDTH)

    # Load tokenizer
    print("\n[1/3] Loading tokenizer...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        print(f"      ✅ Tokenizer loaded: {tokenizer.__class__.__name__}")
    except Exception as e:
        raise RuntimeError(f"Tokenizer load failed: {e}") from e

    # Load models
    print("\n[2/3] Loading models...")
    print(f"      FP32:  {FP32_MODEL}")
    try:
        fp32_session = ort.InferenceSession(
            FP32_MODEL, providers=["CPUExecutionProvider"]
        )
        print("      ✅ FP32 model loaded")
    except Exception as e:
        raise RuntimeError(f"FP32 model load failed: {e}") from e

    print(f"      INT8:  {INT8_MODEL}")
    try:
        int8_session = ort.InferenceSession(
            INT8_MODEL, providers=["CPUExecutionProvider"]
        )
        print("      ✅ INT8 model loaded")
    except Exception as e:
        raise RuntimeError(f"INT8 model load failed: {e}") from e

    # Run accuracy tests
    print("\n[3/3] Running accuracy tests...")
    print(f"\n{'Test Sentence':<{TEXT_COLUMN_WIDTH}} {'Similarity':>12}")
    print("-" * SEPARATOR_WIDTH)

    similarities = []
    for text in TEST_SENTENCES:
        try:
            # Generate embeddings
            fp32_emb = embed(fp32_session, tokenizer, text)
            int8_emb = embed(int8_session, tokenizer, text)

            # Calculate similarity
            sim = cosine_similarity(fp32_emb, int8_emb)
            similarities.append(sim)

            # Format output
            short = text[: TEXT_COLUMN_WIDTH - 3] + "..." if len(text) > TEXT_COLUMN_WIDTH else text
            status = "✅" if sim >= SIMILARITY_THRESHOLD else "❌"
            print(f"{short:<{TEXT_COLUMN_WIDTH}} {sim:11.6f} {status}")
        except Exception as e:
            print(f"⚠️  Failed to process: {text[:30]}... ({e})")
            continue

    if not similarities:
        raise RuntimeError("All embedding comparisons failed")

    print("-" * SEPARATOR_WIDTH)

    # Calculate statistics
    avg = float(np.mean(similarities))
    min_sim = float(min(similarities))
    max_sim = float(max(similarities))

    print(f"{'Average Similarity:':<{TEXT_COLUMN_WIDTH}} {avg:11.6f}")
    print(f"{'Min Similarity:':<{TEXT_COLUMN_WIDTH}} {min_sim:11.6f}")
    print(f"{'Max Similarity:':<{TEXT_COLUMN_WIDTH}} {max_sim:11.6f}")

    return avg, min_sim, max_sim


def main() -> int:
    """Main entry point.

    Returns:
        Exit code (0=pass, 1=fail, 2=error)
    """
    try:
        avg, min_sim, max_sim = validate_models()

        print(f"\n{'=' * SEPARATOR_WIDTH}")
        if avg >= SIMILARITY_THRESHOLD:
            print(f"✅ PASS: Average similarity {avg:.6f} >= {SIMILARITY_THRESHOLD}")
            print("✅ Quantization maintains accuracy for RAG search")
            print(f"{'=' * SEPARATOR_WIDTH}")
            return 0
        else:
            print(f"❌ FAIL: Average similarity {avg:.6f} < {SIMILARITY_THRESHOLD}")
            print("⚠️  Consider using FP16 instead of INT8")
            print(f"{'=' * SEPARATOR_WIDTH}")
            return 1

    except FileNotFoundError as e:
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        print("⚠️  Run quantize-onnx-model.py first to generate quantized model", file=sys.stderr)
        return 2

    except Exception as e:
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 2


if __name__ == "__main__":
    sys.exit(main())
