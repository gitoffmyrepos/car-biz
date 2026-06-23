# GigWheels video factory — Blender headless render + character-animation node.
#
# Blender 4.5 LTS is required for Blackwell (sm_120) on the RTX 5080: it ships
# the CUDA 12.8 / OptiX kernels. Runs headless (`blender -b ... -P script.py`)
# driven by Python; the GPU comes from the nvidia runtimeClass at run time.
# Bundles Rhubarb Lip Sync (MIT) for audio->viseme lip-sync, and the Python
# deps for our pipeline scripts (mocap retarget, viseme->shapekey, asset import).
FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget xz-utils ca-certificates python3 python3-pip ffmpeg \
    libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libglu1-mesa libxkbcommon0 \
    libsm6 libice6 libxext6 unzip && rm -rf /var/lib/apt/lists/*

# Blender 4.5 LTS (headless). Pinned; OptiX kernels for the 5080 ship inside.
WORKDIR /opt
RUN wget -q https://download.blender.org/release/Blender4.5/blender-4.5.3-linux-x64.tar.xz && \
    tar -xf blender-4.5.3-linux-x64.tar.xz && \
    mv blender-4.5.3-linux-x64 blender && rm blender-4.5.3-linux-x64.tar.xz
ENV PATH="/opt/blender:${PATH}"

# Rhubarb Lip Sync (MIT) — audio WAV -> timed mouth-shape (viseme) cues.
RUN wget -q -O /tmp/rhubarb.zip \
    https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip && \
    unzip -q /tmp/rhubarb.zip -d /opt && mv /opt/Rhubarb-Lip-Sync-1.13.0-Linux /opt/rhubarb && \
    chmod +x /opt/rhubarb/rhubarb && rm /tmp/rhubarb.zip
ENV PATH="/opt/rhubarb:${PATH}"

# Pipeline Python deps (Blender has its own bundled python; these are for host-side
# helper scripts that prep assets/mocap before invoking blender -b).
RUN pip3 install --break-system-packages --no-cache-dir numpy requests

WORKDIR /work
# Default: print versions so a smoke-test pod confirms the toolchain.
CMD ["sh", "-c", "blender --version && rhubarb --version && echo BLENDER_NODE_READY && sleep infinity"]
