#!/usr/bin/env python3
"""
MLX-Whisper wrapper fuer Hablará Desktop App.
Output: Reines JSON zu stdout (kompatibel mit TranscriptionResult).
Errors: JSON zu stderr mit exit code 1.

Usage:
    python mlx_transcribe.py audio.wav --model german-turbo --language de
    python mlx_transcribe.py audio.wav --model german-turbo --models-dir ~/my-models

Environment Variables:
    MLX_WHISPER_DIR: Override default models directory

Requirements:
    - Python venv with vllm_mlx.audio.stt installed
    - Local models in models directory
"""

import argparse
import json
import os
import sys
import wave
from pathlib import Path

# vllm_mlx ist im venv installiert
try:
    from vllm_mlx.audio.stt import STTEngine
except ImportError as e:
    print(json.dumps({"error": f"vllm_mlx not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

# Model subdirectory names
# Note: large-v3 removed (too large for live transcription ~2.9GB)
MODEL_SUBDIRS = {
    "german-turbo": "whisper-large-v3-turbo-german-f16",
}


def get_models_dir() -> Path:
    """Get models directory from env var or default."""
    env_dir = os.environ.get("MLX_WHISPER_DIR")
    if env_dir:
        return Path(env_dir).expanduser()
    return Path.home() / "mlx-whisper"


def get_model_path(model: str, models_dir: Path | None = None) -> Path:
    """Get full path to model directory."""
    base_dir = models_dir or get_models_dir()
    subdir = MODEL_SUBDIRS.get(model)
    if not subdir:
        raise ValueError(f"Unknown model: {model}")
    return base_dir / subdir


def get_audio_duration(audio_file: Path) -> float:
    """Get duration of WAV file in seconds."""
    try:
        with wave.open(str(audio_file), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return frames / float(rate)
    except Exception as e:
        print(
            json.dumps({"warning": f"Failed to get audio duration: {e}"}),
            file=sys.stderr,
        )
        return 0.0


def main():
    parser = argparse.ArgumentParser(description="MLX-Whisper Transkription")
    parser.add_argument("audio_file", type=Path, help="WAV-Datei")
    parser.add_argument(
        "--model",
        default="german-turbo",
        choices=list(MODEL_SUBDIRS.keys()),
        help="MLX-Modell (default: german-turbo)",
    )
    parser.add_argument(
        "--language",
        default=None,
        help="Sprach-Code (de, en, etc.) oder None fuer Auto-Detect",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=None,
        help="Verzeichnis mit MLX-Whisper Modellen (default: ~/mlx-whisper oder MLX_WHISPER_DIR)",
    )
    args = parser.parse_args()

    # Validierung
    if not args.audio_file.exists():
        print(
            json.dumps({"error": f"Audio file not found: {args.audio_file}"}),
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        model_path = get_model_path(args.model, args.models_dir)
    except ValueError as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

    if not model_path.exists():
        print(
            json.dumps({"error": f"Model not found: {args.model} at {model_path}"}),
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        # Model laden (lazy loading beim ersten transcribe())
        engine = STTEngine(str(model_path))
        engine.load()

        # Transkribieren mit temperature=0.0 fuer deterministische Ausgabe
        # (reduziert Kreativitaet/Halluzinationen)
        transcribe_kwargs = {"language": args.language}

        # Versuche temperature zu setzen falls unterstuetzt
        try:
            result = engine.transcribe(
                str(args.audio_file),
                temperature=0.0,  # Deterministisch
                **transcribe_kwargs,
            )
        except TypeError:
            # Falls temperature nicht unterstuetzt wird
            result = engine.transcribe(str(args.audio_file), **transcribe_kwargs)

        # Halluzinations-Check via no_speech_prob und avg_logprob
        no_speech_prob = getattr(result, "no_speech_prob", 0.0)
        avg_logprob = getattr(result, "avg_logprob", 0.0)

        # Kombinierter Halluzinations-Score (aus Gemini Review)
        is_hallucination = False
        if (no_speech_prob > 0.5 and avg_logprob < -0.8) or no_speech_prob > 0.8:
            is_hallucination = True
            # Log zu stderr fuer Debugging
            print(
                json.dumps(
                    {
                        "warning": f"Hallucination detected: no_speech_prob={no_speech_prob:.2f}, avg_logprob={avg_logprob:.2f}"
                    }
                ),
                file=sys.stderr,
            )

        # Get audio duration for timing metadata
        # Note: MLX-Whisper doesn't do VAD filtering, so speech_duration == total_duration
        audio_duration = get_audio_duration(args.audio_file)

        # Output im TranscriptionResult-Format
        text = "" if is_hallucination else result.text
        output = {
            "text": text,
            "language": getattr(result, "language", None) or args.language or "de",
            "segments": [],
            "speech_duration_sec": audio_duration,
            "total_duration_sec": audio_duration,
        }

        # Segments falls vorhanden (und keine Halluzination)
        if not is_hallucination and hasattr(result, "segments") and result.segments:
            segments = []
            for seg in result.segments:
                # Handle both dict and object formats
                if isinstance(seg, dict):
                    segments.append({
                        "start": float(seg.get("start", 0)),
                        "end": float(seg.get("end", 0)),
                        "text": seg.get("text", "")
                    })
                else:
                    segments.append({
                        "start": float(getattr(seg, "start", 0)),
                        "end": float(getattr(seg, "end", 0)),
                        "text": getattr(seg, "text", "")
                    })
            output["segments"] = segments

        # Reines JSON zu stdout (keine print-Ausgaben!)
        print(json.dumps(output, ensure_ascii=False))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
