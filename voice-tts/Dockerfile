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

# Bake the Kokoro weights (KPipeline init downloads hexgrad/Kokoro-82M from HF).
RUN python3 -c "from kokoro import KPipeline; KPipeline(lang_code='a')"

COPY server.py ./
EXPOSE 8880
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8880"]
