# GigWheels voice TTS — Kokoro (OSS, natural female), weights BAKED at build.
#
# Kokoro-82M is tiny (82M params) → CPU synth is sub-second for short phone
# utterances, so we run it CPU-only. That avoids dragging torch's multi-GB
# nvidia-*-cu* wheels on top of a CUDA base (which bloated the image to ~18GB
# and broke the kaniko snapshot/push). Slim base + CPU torch ≈ 2GB image.
#
# espeak-ng provides phonemes; libsndfile for WAV. Build env has egress (models
# download here); the running container needs ZERO internet.
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch FIRST so kokoro's torch dep is already satisfied and pip does
# NOT pull the CUDA build (the source of the image bloat).
RUN pip3 install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Pre-install the spaCy English model misaki's G2P needs. Without it,
# KPipeline(lang_code='a') shells out to `pip install en_core_web_sm` at
# RUNTIME (GitHub release) — fails the bake and the no-egress namespace.
RUN pip3 install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

# Bake everything the runtime needs: Kokoro-82M weights + af_heart voice pack +
# espeak/spaCy caches. A real synth forces all lazy downloads now → zero runtime
# internet.
RUN python3 -c "from kokoro import KPipeline; p=KPipeline(lang_code='a'); list(p('GigWheels voice check.', voice='af_heart'))"

COPY server.py ./
EXPOSE 8880
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8880"]
