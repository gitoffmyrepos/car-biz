"""GigWheels cinematic narrator TTS.

Chatterbox (Resemble AI, MIT) drives a deep, dramatic documentary-style
narrator for the "Wheels Up" video series. Offline batch — clients POST text,
get a WAV back. No GPU required (CPU synth is slow but latency-irrelevant for
render-time narration); set NARRATOR_DEVICE=cuda to move it onto a GPU.

Voice control:
  - exaggeration (0.3 calm .. 0.8 theatrical) = storyteller gravitas knob
  - cfg_weight   (0.2 slow/deliberate .. 0.7 brisk) — lower = more measured
  - reference WAV: if /data/reference.wav exists (or `reference` is passed),
    Chatterbox matches that timbre. CONSENT-GATED: only drop a reference you
    own or are licensed to use. With no reference, Chatterbox's own synthetic
    deep voice is used — fully clean.
"""
import io
import logging
import os

import soundfile as sf
from fastapi import FastAPI, Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("narrator")

DEVICE = os.environ.get("NARRATOR_DEVICE", "cpu")
DEFAULT_REF = os.environ.get("NARRATOR_REFERENCE", "/data/reference.wav")
DEFAULT_EXAG = float(os.environ.get("NARRATOR_EXAGGERATION", "0.65"))
DEFAULT_CFG = float(os.environ.get("NARRATOR_CFG_WEIGHT", "0.3"))

app = FastAPI(title="gigwheels-narrator")
_model = None  # ponytail: lazy single global — one replica, one model


def model():
    global _model
    if _model is None:
        from chatterbox.tts import ChatterboxTTS

        log.info("loading Chatterbox on %s", DEVICE)
        _model = ChatterboxTTS.from_pretrained(device=DEVICE)
        log.info("Chatterbox ready (sr=%s)", _model.sr)
    return _model


class TTSRequest(BaseModel):
    text: str
    exaggeration: float | None = None
    cfg_weight: float | None = None
    reference: str | None = None  # path to a reference WAV you have rights to


@app.get("/healthz")
def healthz():
    return {"ok": True, "device": DEVICE, "model_loaded": _model is not None}


@app.post("/tts")
def tts(req: TTSRequest):
    if not req.text.strip():
        return Response(status_code=400, content="empty text")
    m = model()
    ref = req.reference or (DEFAULT_REF if os.path.exists(DEFAULT_REF) else None)
    wav = m.generate(
        req.text,
        audio_prompt_path=ref,
        exaggeration=req.exaggeration if req.exaggeration is not None else DEFAULT_EXAG,
        cfg_weight=req.cfg_weight if req.cfg_weight is not None else DEFAULT_CFG,
    )
    audio = wav.squeeze(0).cpu().numpy()  # chatterbox returns torch [1, N]
    buf = io.BytesIO()
    sf.write(buf, audio, m.sr, format="WAV")
    log.info("synth %d chars -> %.1fs, ref=%s", len(req.text), len(audio) / m.sr, ref)
    return Response(content=buf.getvalue(), media_type="audio/wav")
