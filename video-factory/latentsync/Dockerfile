# LatentSync lip-sync service for GigWheels — refines S2V dialogue clips so the
# mouth matches the words exactly. Runs on a Blackwell GPU (sm_120) so torch is
# cu128. Model weights are pulled at runtime to a PVC (kept small image, no 5GB bake).
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1 HF_HOME=/data/hf
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ffmpeg libgl1 libglib2.0-0 libsndfile1 build-essential wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Blackwell-compatible torch (cu128) BEFORE LatentSync's own requirements so its
# older torch pin doesn't downgrade us onto an sm_120-incompatible build.
RUN pip install --index-url https://download.pytorch.org/whl/cu128 \
        torch==2.7.0 torchvision==0.22.0 torchaudio==2.7.0

RUN git clone --depth 1 https://github.com/bytedance/LatentSync.git /app/LatentSync
WORKDIR /app/LatentSync
# Install LatentSync deps but DROP its torch pins (we already set cu128 above).
RUN sed -i '/^torch/d; /^torchvision/d; /^torchaudio/d; /^triton/d' requirements.txt && \
    pip install -r requirements.txt && \
    pip install "huggingface_hub>=0.23" fastapi "uvicorn[standard]" python-multipart

COPY server.py /app/server.py
WORKDIR /app
EXPOSE 8800
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8800"]
