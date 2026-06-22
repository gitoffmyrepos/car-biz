"""Minimal OpenAI-compatible Kokoro TTS server (natural, non-Polly, OSS).

We own this so the model is baked into the image (no runtime egress). Returns
WAV; callers may request a sample_rate (we resample for 8kHz telephony).

Endpoints:
  POST /v1/audio/speech  {"input": "...", "voice": "af_heart", "sample_rate": 24000}  -> WAV bytes
  GET  /healthz
"""
from __future__ import annotations

import io
import os

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Request
from fastapi.responses import Response
from kokoro import KPipeline

LANG = os.environ.get("KOKORO_LANG", "a")  # 'a' = American English
DEFAULT_VOICE = os.environ.get("KOKORO_VOICE", "af_heart")  # warm female
NATIVE_SR = 24000

app = FastAPI(title="voice-tts")
_pipe: KPipeline | None = None


def _pipeline() -> KPipeline:
    global _pipe
    if _pipe is None:
        _pipe = KPipeline(lang_code=LANG)
    return _pipe


def _resample(audio: np.ndarray, src: int, dst: int) -> np.ndarray:
    if src == dst:
        return audio
    n = int(round(len(audio) * dst / src))
    x = np.linspace(0, 1, len(audio), endpoint=False)
    xi = np.linspace(0, 1, n, endpoint=False)
    return np.interp(xi, x, audio).astype(np.float32)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "voice": DEFAULT_VOICE, "lang": LANG}


@app.post("/v1/audio/speech")
async def speech(req: Request) -> Response:
    body = await req.json()
    text = (body.get("input") or body.get("text") or "").strip()
    voice = body.get("voice") or DEFAULT_VOICE
    out_sr = int(body.get("sample_rate") or NATIVE_SR)
    chunks = [audio for _gs, _ps, audio in _pipeline()(text, voice=voice)]
    audio = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
    audio = _resample(np.asarray(audio, dtype=np.float32), NATIVE_SR, out_sr)
    buf = io.BytesIO()
    sf.write(buf, audio, out_sr, format="WAV", subtype="PCM_16")
    return Response(content=buf.getvalue(), media_type="audio/wav")
