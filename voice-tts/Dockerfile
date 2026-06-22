# GigWheels voice TTS — Kokoro (OSS, natural female), weights BAKED at build.
# espeak-ng provides phonemes; libsndfile for WAV. Build env has egress (model
# downloads here); the running container needs ZERO internet.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip espeak-ng libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Pre-install the spaCy English model misaki's G2P needs. Without this,
# KPipeline(lang_code='a') shells out to `pip install en_core_web_sm` at
# RUNTIME (from a GitHub release) — which fails the build's bake subprocess
# AND would fail in the no-egress namespace. Pin the exact version misaki
# wants so its presence check skips the runtime download.
RUN pip3 install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

# Bake everything the runtime needs into the image: Kokoro-82M weights AND the
# af_heart voice pack + espeak/spaCy caches. A real synth call forces all the
# lazy HF/voice downloads now, so the container needs ZERO internet at runtime.
RUN python3 -c "from kokoro import KPipeline; p=KPipeline(lang_code='a'); list(p('GigWheels voice check.', voice='af_heart'))"

COPY server.py ./
EXPOSE 8880
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8880"]
