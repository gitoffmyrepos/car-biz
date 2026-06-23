# GigWheels cinematic narrator TTS — Chatterbox (MIT), CPU build.
#
# CPU-only on purpose: narration is render-time batch, not real-time, so latency
# doesn't matter and we avoid the multi-GB CUDA wheels that broke the TTS image
# push before. torch/torchaudio CPU are installed FIRST so chatterbox-tts sees
# its torch requirement already satisfied and does not pull the CUDA build.
#
# The Chatterbox weights are BAKED at build time (zero runtime egress, same as
# the whisper/kokoro images) — the gigwheels-video namespace has no internet.
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/opt/hf NUMBA_CACHE_DIR=/tmp/numba

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU torch first — chatterbox pins torch==2.6.0; 2.6.0+cpu satisfies it and
# stops pip from grabbing the CUDA wheel.
RUN pip install --no-cache-dir torch==2.6.0 torchaudio==2.6.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the model weights into the image (HF_HOME cached at build time).
RUN python -c "from chatterbox.tts import ChatterboxTTS; ChatterboxTTS.from_pretrained(device='cpu')"

COPY server.py .
EXPOSE 8890
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8890"]
