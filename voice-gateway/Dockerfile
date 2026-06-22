# GigWheels voice-gateway — pipecat phone bot bridging Telnyx Media Streaming to
# our in-cluster faster-whisper STT + Kokoro TTS + chat-brain RAG LLM.
#
# CPU-only: the gateway just orchestrates + runs Silero VAD (onnx, CPU); the
# heavy STT/TTS run in their own GPU/CPU services. The Silero VAD model ships
# inside the pipecat wheel, so there is no runtime model download.
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

COPY bot.py ./
EXPOSE 8080
CMD ["uvicorn", "bot:app", "--host", "0.0.0.0", "--port", "8080"]
