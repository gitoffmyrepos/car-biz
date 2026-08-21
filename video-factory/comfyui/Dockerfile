# GigWheels video factory — ComfyUI render backend.
#
# Base is python-slim, NOT nvidia/cuda: torch's cu128 wheels already bundle the
# full CUDA + cuDNN runtime (nvidia-*-cu12), and the GPU driver comes from the
# nvidia runtimeClass at run time. The nvidia/cuda:12.8-cudnn base added ~4GB of
# redundant libraries, ballooning the image to 13GB — too big for kaniko to
# snapshot/push in CI. python-slim + the cu128 wheels still gives Blackwell
# sm_120 support (it lives in the torch kernels, not the base) at ~8.9GB, which
# the CI build can push. Verified to build + serve locally (HTTP 200).
#
# Models are NOT baked (FLUX/Wan are tens of GB) — they live on the PVC at /data
# and are pulled at runtime (the build/run env has egress).
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
# PyTorch for Blackwell (cu128 wheels — first stable sm_120 support is 2.7; the
# wheels carry their own CUDA/cuDNN, so no CUDA base image is needed).
RUN pip3 install \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

# Base ComfyUI only. Custom nodes (controlnet_aux, WanVideoWrapper, KJNodes,
# essentials) are NOT installed here: cloning 5 repos + their heavy requirements
# (mediapipe, onnxruntime, ...) blew the CI build budget. The first render (FLUX
# text-to-image) needs ZERO custom nodes — they're added at runtime via
# ComfyUI-Manager onto the PVC, or in a later dedicated build.
RUN git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git /opt/ComfyUI
WORKDIR /opt/ComfyUI
RUN pip3 install -r requirements.txt

# Models, inputs, outputs and user state all live on the PVC (mounted at /data) —
# symlink the ComfyUI dirs to it so pulls and saved work persist across restarts.
# `user/` holds saved workflows and UI settings; left in the image layer it is wiped
# on every pod restart (hit 2026-08-21 — installed workflows vanished on rollout).
RUN rm -rf models input output user && \
    ln -s /data/models models && ln -s /data/input input && \
    ln -s /data/output output && ln -s /data/user user

EXPOSE 8188
# --listen exposes the API; clients POST workflows to /prompt.
CMD ["python3", "main.py", "--listen", "0.0.0.0", "--port", "8188"]
