"""
LatentSync lip-sync service.

POST /lipsync  (multipart: video=<mp4>, audio=<wav>)  -> lip-synced mp4
Takes an existing talking clip + the spoken audio and re-renders the mouth region
so the lips match the words. Weights download once to /data/hf (PVC) on first call.

GigWheels use: refine each Wan2.2-S2V dialogue clip (keeps gesture/face, fixes lips).
"""
import os
import subprocess
import tempfile
import logging

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("latentsync")

LS = "/app/LatentSync"
CKPT_DIR = os.environ.get("LS_CKPT_DIR", "/data/latentsync/checkpoints")

# LatentSync hard-rejects a face smaller than 50x80 px (image_processor.py) with a
# RuntimeError, and below ~250px the mouth is too few pixels for sync to be visible at all.
# Measured on our first pass: wide shots put the face at 55-105px. Dialogue must therefore be
# rendered as close-ups (see production/period.py PERIOD_CU) before this service is worth
# calling. 1.6 + stage2_512 gives a 512 face crop instead of 1.5's 256.
# LatentSync 1.5 unet + the whisper tiny it needs, from the official HF repo.
HF_REPO = os.environ.get("LS_HF_REPO", "ByteDance/LatentSync-1.6")
UNET = os.path.join(CKPT_DIR, "latentsync_unet.pt")
WHISPER = os.path.join(CKPT_DIR, "whisper", "tiny.pt")
CONFIG = os.path.join(LS, "configs", "unet", "stage2_512.yaml")

app = FastAPI()
_ready = {"weights": False}


def _ensure_weights() -> None:
    if _ready["weights"]:
        return
    from huggingface_hub import snapshot_download
    os.makedirs(CKPT_DIR, exist_ok=True)
    if not (os.path.exists(UNET) and os.path.exists(WHISPER)):
        log.info("downloading LatentSync weights from %s ...", HF_REPO)
        snapshot_download(repo_id=HF_REPO, local_dir=CKPT_DIR,
                          allow_patterns=["latentsync_unet.pt", "whisper/tiny.pt", "*.json"])
    _ready["weights"] = True


@app.get("/healthz")
def healthz():
    return {"ok": True, "weights": _ready["weights"]}


@app.post("/lipsync")
async def lipsync(video: UploadFile = File(...), audio: UploadFile = File(...)):
    try:
        _ensure_weights()
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"weights: {e}"}, status_code=500)

    tmp = tempfile.mkdtemp(prefix="ls_")
    vin = os.path.join(tmp, "in.mp4")
    ain = os.path.join(tmp, "in.wav")
    out = os.path.join(tmp, "out.mp4")
    with open(vin, "wb") as f:
        f.write(await video.read())
    with open(ain, "wb") as f:
        f.write(await audio.read())

    cmd = [
        "python", "-m", "scripts.inference",
        "--unet_config_path", CONFIG,
        "--inference_ckpt_path", UNET,
        "--video_path", vin,
        "--audio_path", ain,
        "--video_out_path", out,
        "--inference_steps", os.environ.get("LS_STEPS", "20"),
        "--guidance_scale", os.environ.get("LS_GUIDANCE", "1.5"),
    ]
    log.info("running LatentSync: %s", " ".join(cmd))
    p = subprocess.run(cmd, cwd=LS, capture_output=True, text=True)
    if p.returncode != 0 or not os.path.exists(out):
        log.error("LatentSync failed: %s", p.stderr[-1500:])
        return JSONResponse({"error": "inference failed", "stderr": p.stderr[-1500:]}, status_code=500)
    return FileResponse(out, media_type="video/mp4", filename="lipsync.mp4")
