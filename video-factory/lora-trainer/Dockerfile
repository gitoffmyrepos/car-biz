# Character-LoRA trainer — musubi-tuner for Qwen-Image.
#
# Why musubi-tuner and not ai-toolkit: ai-toolkit on a 5090 is widely reported to silently
# spill past 32GB into shared/system memory, collapsing from ~3 s/it to 33-90 s/it with the
# GPU power-starved. musubi-tuner publishes measured VRAM tables and a working block-swap
# path, and kohya-ss develops it on Blackwell directly.
#   ostris/ai-toolkit#390, kohya-ss/musubi-tuner docs/qwen_image.md
#
# Measured expectation on a 5090 (Linux): ~5.3 s/it at 1328px rank128, ~4.6 with
# torch.compile. Character LoRAs train at 1024px and low rank, so meaningfully faster.
FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/data/hf \
    # the #1 cause of "training is inexplicably slow" is fragmentation-driven spill
    PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv git wget ca-certificates libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/kohya-ss/musubi-tuner.git /opt/musubi-tuner
WORKDIR /opt/musubi-tuner

# cu128 wheels FIRST — must match the driver the 5090 nodes run (sm_120). Installing torch
# up front means the editable install below sees "torch>=2.7.1" already satisfied and will
# not pull a CPU build over it.
RUN pip3 install --break-system-packages --no-cache-dir \
      torch torchvision --index-url https://download.pytorch.org/whl/cu128

# musubi-tuner has NO requirements.txt — it declares deps in pyproject.toml. Install the
# package itself; -r requirements.txt fails the build outright.
RUN pip3 install --break-system-packages --no-cache-dir -e . \
 && pip3 install --break-system-packages --no-cache-dir bitsandbytes

# Fail the BUILD, not a 3-hour training run, if CUDA or the 8-bit optimizer is broken.
RUN python3 -c "import torch, bitsandbytes; print('torch', torch.__version__)" \
 && python3 -c "import musubi_tuner" 2>/dev/null || \
    python3 -c "import sys; sys.path.insert(0,'src'); import musubi_tuner; print('musubi ok')"

# Datasets, base models and LoRA output all live on the shared PVC.
VOLUME ["/data"]
ENTRYPOINT ["python3"]
CMD ["-c", "print('lora-trainer image ready; run src/musubi_tuner/qwen_image_train_network.py')"]
