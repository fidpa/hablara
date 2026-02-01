#!/usr/bin/env python3
"""
MLX-LLM wrapper for Hablará Desktop App (Emotion + Fallacy Analysis).
Output: Pure JSON to stdout (compatible with Rust backend).
Errors: JSON to stderr with exit code 1.

Usage:
    python mlx_analyze.py emotion "Ich bin so frustriert!" --model qwen2.5-7b
    python mlx_analyze.py fallacy "Das ist doch Unsinn..." --model qwen2.5-7b

Environment Variables:
    MLX_LLM_MODELS_DIR: Override default models directory

Requirements:
    - Python venv with mlx-lm installed
    - Local quantized models in models directory
"""

import argparse
import json
import os
import sys
from pathlib import Path

# mlx-lm is installed in venv
try:
    from mlx_lm import load, generate
except ImportError as e:
    print(json.dumps({"error": f"mlx-lm not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

# Model subdirectory names (4-bit quantized for speed)
MODEL_SUBDIRS = {
    "qwen2.5-7b": "mlx-community/Qwen2.5-7B-Instruct-4bit",
    "qwen2.5-14b": "mlx-community/Qwen2.5-14B-Instruct-4bit",
    "qwen2.5-32b": "mlx-community/Qwen2.5-32B-Instruct-4bit",
}

# Emotion Analysis Prompt (German, matches Hablará requirements)
EMOTION_PROMPT = """Du bist ein Experte für emotionale Sprachanalyse. Analysiere die Emotion in folgendem Text.

Verfügbare Emotionen:
- neutral: Neutrale, sachliche Aussage
- calm: Ruhig, gelassen, entspannt
- stress: Gestresst, unter Druck, angespannt
- excitement: Aufgeregt, enthusiastisch, energiegeladen
- uncertainty: Unsicher, zweifelnd, unentschlossen
- frustration: Frustriert, genervt, ungeduldig
- joy: Freudig, glücklich, positiv
- doubt: Zweifelnd, skeptisch, hinterfragend
- conviction: Überzeugt, bestimmt, sicher
- aggression: Aggressiv, wütend, konfrontativ

Antworte NUR mit gültigem JSON in diesem Format:
{{
  "primary": "emotion_name",
  "confidence": 0.8,
  "markers": ["Textmarker 1", "Textmarker 2"]
}}

Text: {text}

JSON Output:"""

# Fallacy Detection Prompt (German, CEG-Prompting)
FALLACY_PROMPT = """Du bist ein Experte für logische Fehlschlüsse und kritisches Denken. Analysiere folgenden Text auf logische Fehlschlüsse.

Verfügbare Fehlschluss-Typen:
- ad_hominem: Angriff auf die Person statt auf das Argument
- straw_man: Verzerrung der Gegenposition
- false_dichotomy: Entweder-Oder ohne Alternativen
- appeal_authority: Unberechtigter Autoritätsverweis
- circular_reasoning: Schlussfolgerung = Prämisse
- slippery_slope: Übertriebene Kausalitätskette

Schritt 1 - Evidenz sammeln:
Welche Aussagen im Text könnten Fehlschlüsse sein? Liste alle verdächtigen Passagen.

Schritt 2 - Klassifizierung:
Ordne jede Passage einem Fehlschluss-Typ zu (wenn zutreffend).

Schritt 3 - JSON Output:
Antworte NUR mit gültigem JSON in diesem Format:
{{
  "fallacies": [
    {{
      "type": "ad_hominem",
      "confidence": 0.8,
      "quote": "Zitat aus dem Text",
      "explanation": "Erklärung des Fehlschlusses",
      "suggestion": "Verbesserungsvorschlag"
    }}
  ],
  "enrichment": "Zusammenfassende Analyse des Arguments"
}}

Text: {text}

Chain of Evidence Gathering:"""


def get_models_dir() -> Path:
    """Get models directory from env var or default."""
    env_dir = os.environ.get("MLX_LLM_MODELS_DIR")
    if env_dir:
        return Path(env_dir).expanduser()
    # Default: Same as Whisper models (~/mlx-whisper) or separate ~/mlx-models
    return Path.home() / "mlx-models"


def get_model_path(model: str, models_dir: Path | None = None) -> str:
    """Get model identifier (HuggingFace or local path)."""
    # MLX-LM can load from HuggingFace directly or local cache
    model_id = MODEL_SUBDIRS.get(model)
    if not model_id:
        raise ValueError(f"Unknown model: {model}. Available: {list(MODEL_SUBDIRS.keys())}")
    return model_id


def analyze_emotion(text: str, model_path: str) -> dict:
    """Analyze emotion in text using MLX-LLM."""
    try:
        # Load model (cached after first load)
        model, tokenizer = load(model_path)

        # Generate prompt
        prompt = EMOTION_PROMPT.format(text=text)

        # Generate with EOS token stopping
        response = generate(
            model,
            tokenizer,
            prompt=prompt,
            max_tokens=256,
            verbose=False,
        )

        # Parse JSON from response
        # MLX-LM might return full conversation, extract FIRST JSON block only
        response_text = response.strip()

        # Stop at EOS token if present
        if "<|endoftext|>" in response_text:
            response_text = response_text.split("<|endoftext|>")[0].strip()

        # Try to extract first complete JSON block
        if "{" in response_text:
            json_start = response_text.index("{")
            # Find matching closing brace
            brace_count = 0
            json_end = json_start
            for i in range(json_start, len(response_text)):
                if response_text[i] == "{":
                    brace_count += 1
                elif response_text[i] == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break

            if json_end <= json_start:
                raise ValueError("No complete JSON found in model response")

            json_str = response_text[json_start:json_end]
            result = json.loads(json_str)
        else:
            raise ValueError("No JSON found in model response")

        # Validate required fields
        if "primary" not in result or "confidence" not in result:
            raise ValueError("Invalid emotion JSON: missing required fields")

        return result

    except json.JSONDecodeError as e:
        # Better error message for JSON parsing failures
        print(f"[ERROR] Failed to parse JSON: {e}", file=sys.stderr)
        print(f"[ERROR] Raw response: {repr(response)}", file=sys.stderr)
        raise RuntimeError(f"Emotion analysis failed: Invalid JSON - {e}")
    except Exception as e:
        raise RuntimeError(f"Emotion analysis failed: {e}")


def analyze_fallacy(text: str, model_path: str) -> dict:
    """Analyze fallacies in text using MLX-LLM with CEG prompting."""
    try:
        # Load model
        model, tokenizer = load(model_path)

        # Generate prompt
        prompt = FALLACY_PROMPT.format(text=text)

        # Generate with EOS token stopping (longer output for CEG reasoning)
        response = generate(
            model,
            tokenizer,
            prompt=prompt,
            max_tokens=512,
            verbose=False,
        )

        # Parse JSON (extract FIRST complete JSON block only)
        response_text = response.strip()

        # Stop at EOS token if present
        if "<|endoftext|>" in response_text:
            response_text = response_text.split("<|endoftext|>")[0].strip()

        # Try to extract first complete JSON block
        if "{" in response_text:
            json_start = response_text.index("{")
            # Find matching closing brace
            brace_count = 0
            json_end = json_start
            for i in range(json_start, len(response_text)):
                if response_text[i] == "{":
                    brace_count += 1
                elif response_text[i] == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break

            if json_end <= json_start:
                raise ValueError("No complete JSON found in model response")

            json_str = response_text[json_start:json_end]
            result = json.loads(json_str)
        else:
            raise ValueError("No JSON found in model response")

        # Validate required fields
        if "fallacies" not in result or "enrichment" not in result:
            raise ValueError("Invalid fallacy JSON: missing required fields")

        return result

    except Exception as e:
        raise RuntimeError(f"Fallacy analysis failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="MLX-LLM Analysis for Hablará")
    parser.add_argument(
        "mode",
        choices=["emotion", "fallacy"],
        help="Analysis mode",
    )
    parser.add_argument(
        "text",
        type=str,
        help="Text to analyze",
    )
    parser.add_argument(
        "--model",
        default="qwen2.5-7b",
        choices=list(MODEL_SUBDIRS.keys()),
        help="MLX-LLM model (default: qwen2.5-7b)",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=None,
        help="Models directory (default: ~/mlx-models or MLX_LLM_MODELS_DIR)",
    )
    args = parser.parse_args()

    try:
        # Get model path
        model_path = get_model_path(args.model, args.models_dir)

        # Log to stderr (stdout reserved for JSON)
        print(f"[mlx-analyze] Mode: {args.mode}", file=sys.stderr)
        print(f"[mlx-analyze] Model: {model_path}", file=sys.stderr)
        print(f"[mlx-analyze] Text length: {len(args.text)} chars", file=sys.stderr)

        # Analyze
        if args.mode == "emotion":
            result = analyze_emotion(args.text, model_path)
        else:  # fallacy
            result = analyze_fallacy(args.text, model_path)

        # Output JSON to stdout
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except Exception as e:
        error = {
            "error": str(e),
            "mode": args.mode,
            "model": args.model,
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
