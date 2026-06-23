# GigWheels video factory — ComfyUI render backend.
#
# The RTX 5080/5090 are Blackwell (sm_120), which REQUIRES CUDA 12.8 + PyTorch
# >= 2.7. Older CUDA 12.4 images fail with "sm_120 not supported". Models are NOT
# baked (FLUX/Wan are tens of GB) — they live on a PVC mounted at /models and are
# pulled once at deploy time. The build env has egress; runtime pulls models from
# HF into the PVC.
FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git ffmpeg libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
# PyTorch for Blackwell (cu128 wheels — first stable sm_120 support is 2.7).
RUN pip3 install --break-system-packages \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

# Base ComfyUI only. The custom nodes (controlnet_aux, WanVideoWrapper, KJNodes,
# essentials) are NOT installed here: cloning 5 repos + their heavy requirements
# (mediapipe, onnxruntime, ...) blew past the CI's 3600s build deadline. The
# first render (FLUX text-to-image) needs ZERO custom nodes. They're installed
# at runtime via ComfyUI-Manager onto the PVC when the video stage needs them,
# or added in a later dedicated build. Base + torch builds well within budget.
RUN git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git /opt/ComfyUI
WORKDIR /opt/ComfyUI
RUN pip3 install --break-system-packages -r requirements.txt

# Models, inputs, outputs all live on the PVC (mounted at /data) — symlink the
# ComfyUI dirs to it so a model pull persists across restarts.
RUN rm -rf models input output && \
    ln -s /data/models models && ln -s /data/input input && ln -s /data/output output

EXPOSE 8188
# --listen exposes the API; clients POST workflows to /prompt.
CMD ["python3", "main.py", "--listen", "0.0.0.0", "--port", "8188"]
