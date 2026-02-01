#!/usr/bin/env python3
"""
MLX-Whisper HTTP Server for Browser Development Mode
WARNING: Only for development! Production uses Tauri CLI calls.

Usage:
    python scripts/mlx_server_dev.py

Config:
    - Port: 8080
    - Max Upload: 100MB
    - CORS: Enabled for localhost:3000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import json
from pathlib import Path

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Increase max upload size to 100MB
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

@app.route('/health')
def health():
    """Health check endpoint for debugging connection issues."""
    return jsonify({"status": "ok", "service": "mlx-whisper-dev"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio = request.files['audio']

    # Validate file extension (H2 Security Fix)
    ALLOWED_EXTENSIONS = {'.wav', '.mp3', '.m4a', '.ogg'}
    filename = audio.filename or ''
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Invalid file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    model = request.form.get('model', 'german-turbo')
    language = request.form.get('language', 'de')

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        audio.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Call mlx_transcribe.py (M2 Fix: Absolute path)
        script_dir = Path(__file__).parent.resolve()
        mlx_script = script_dir / 'mlx_transcribe.py'

        result = subprocess.run(
            ['python3', str(mlx_script), tmp_path, '--model', model, '--language', language],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            return jsonify({"error": result.stderr}), 500

        # Parse JSON output
        output = json.loads(result.stdout)
        return jsonify(output)

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Transcription timeout (>30s). File too large or model too slow."}), 504

    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

if __name__ == '__main__':
    print("MLX-Whisper Dev Server")
    print("WARNING: Development only! Production uses Tauri CLI.")
    print(f"Running on http://localhost:8080")
    print(f"Max upload: 100MB")
    print(f"CORS: localhost:3000")
    print()

    # H1 Security Fix: Bind to localhost only (NOT 0.0.0.0)
    # L1 Fix: Debug mode via env var
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(host='127.0.0.1', port=8080, debug=debug)
