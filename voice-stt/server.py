"""Minimal OpenAI-compatible faster-whisper STT server.

We own this (instead of the upstream faster-whisper-server image, which pip-builds
at startup and needs pypi — broken in the no-egress GPU namespace). The model is
baked into the image at build time, so the container needs zero runtime internet.

Endpoints:
  POST /v1/audio/transcriptions  (multipart: file=<audio>)  -> {"text": "..."}
  GET  /healthz
"""
from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel

MODEL = os.environ.get("WHISPER_MODEL", "small.en")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
COMPUTE = os.environ.get("WHISPER_COMPUTE", "float16")  # int8_float16 if VRAM-tight

app = FastAPI(title="voice-stt")
_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL, device=DEVICE, compute_type=COMPUTE)
    return _model


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "model": MODEL, "device": DEVICE}


@app.post("/v1/audio/transcriptions")
async def transcribe(file: UploadFile = File(...)) -> dict:
    suffix = os.path.splitext(file.filename or "a.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(await file.read())
        tmp.flush()
        segments, info = _get_model().transcribe(tmp.name, language="en", vad_filter=True)
        text = " ".join(s.text.strip() for s in segments).strip()
    return {"text": text, "language": getattr(info, "language", "en")}
