# LatentSync lip-sync service for GigWheels — refines S2V dialogue clips so the
# mouth matches the words exactly. Runs on a Blackwell GPU (sm_120) so torch is
# cu128. Model weights are pulled at runtime to a PVC (kept small image, no 5GB bake).
# python 3.10, NOT 3.11: LatentSync pins decord==0.6.0 and insightface==0.7.3, and neither
# publishes cp311 wheels. On 3.11 pip falls back to building both from source and the image
# build dies. 3.10 has prebuilt wheels for the whole pinned set.
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1 HF_HOME=/data/hf
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ffmpeg libgl1 libglib2.0-0 libsndfile1 build-essential cmake pkg-config wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# torch cu128 goes in BEFORE LatentSync's requirements, and its own torch pins plus the
# cu121 --extra-index-url are stripped, so nothing downgrades us off an sm_120-capable build.
RUN git clone --depth 1 https://github.com/bytedance/LatentSync.git /app/LatentSync
WORKDIR /app/LatentSync

# ONE layer for the whole Python stack. Kaniko snapshots the full filesystem after every RUN,
# and the torch + CUDA tree is ~10GB; snapshotting it twice is what exhausted the build's
# ephemeral storage and killed three earlier attempts at exactly this step.
RUN pip install --upgrade pip setuptools wheel Cython && \
    pip install --index-url https://download.pytorch.org/whl/cu128 \
        torch==2.7.0 torchvision==0.22.0 torchaudio==2.7.0 && \
    sed -i '/^torch/d; /^torchvision/d; /^torchaudio/d; /^triton/d; /extra-index-url/d' requirements.txt && \
    pip install -r requirements.txt && \
    pip install "huggingface_hub>=0.23" fastapi "uvicorn[standard]" python-multipart && \
    rm -rf /root/.cache /tmp/*

COPY server.py /app/server.py
WORKDIR /app
EXPOSE 8800
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8800"]
