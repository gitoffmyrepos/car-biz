# GigWheels voice STT — faster-whisper, OpenAI-compatible, model BAKED at build.
# CUDA+cuDNN runtime base (ctranslate2 needs them). The build env has egress, so
# the model downloads here; the running container needs ZERO internet.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Bake the Whisper weights into the image (device=cpu just downloads; runtime uses GPU).
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('small.en', device='cpu')"

COPY server.py ./
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
