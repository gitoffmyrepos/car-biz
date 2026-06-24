# GigWheels — TripoSR image-to-3D (MIT). Turns a character still into a 3D mesh
# we then retopo/rig/toon-shade in Blender. python-slim + cu128 wheels (the
# stack proven to run on the Blackwell sm_120 5080 for ComfyUI). TripoSR is
# mostly standard torch (transformer + triplane), so it's the lowest-risk AI-3D
# tool on Blackwell; the only native bit is marching-cubes (CPU fallback exists).
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/data/hf
RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential libgl1 libglib2.0-0 wget && rm -rf /var/lib/apt/lists/*

RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu128

WORKDIR /opt
RUN git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git
WORKDIR /opt/TripoSR
# TripoSR deps minus the pinned torch (we already have cu128). omegaconf, einops,
# transformers, trimesh, rembg, pillow, etc. Skip torchmcubes (compile risk on
# sm_120) — TripoSR falls back to scikit-image marching cubes.
RUN pip3 install omegaconf einops transformers trimesh rembg pillow numpy \
    huggingface_hub scikit-image onnxruntime "git+https://github.com/tatsy/torchmcubes.git" || \
    pip3 install omegaconf einops transformers trimesh rembg pillow numpy huggingface_hub scikit-image onnxruntime

WORKDIR /work
CMD ["sleep", "infinity"]
