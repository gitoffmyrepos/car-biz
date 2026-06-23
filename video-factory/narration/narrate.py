#!/usr/bin/env python3
"""Render a storyteller voiceover from a script file via the narrator-tts service.

Each non-empty, non-comment line of the script is one VO beat. We POST each to
narrator-tts (Chatterbox), save per-beat WAVs, then concat into one vo.wav with
a short pause between beats. Run against a port-forward:

    kubectl -n gigwheels-video port-forward svc/narrator-tts 8890:8890 &
    python narrate.py episode01.txt out/ep01

Lines starting with `#` are comments. A line `[exag=0.7 cfg=0.25]` on its own
overrides delivery for the beats that follow (gravitas / pacing).
"""
import os
import re
import subprocess
import sys
import wave

import requests

NARRATOR = os.environ.get("NARRATOR_URL", "http://localhost:8890")
PAUSE_S = float(os.environ.get("BEAT_PAUSE_S", "0.6"))


def beats(path):
    exag, cfg = None, None
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.fullmatch(r"\[exag=([\d.]+)\s+cfg=([\d.]+)\]", line)
        if m:
            exag, cfg = float(m.group(1)), float(m.group(2))
            continue
        yield line, exag, cfg


def synth(text, exag, cfg, dest):
    body = {"text": text}
    if exag is not None:
        body["exaggeration"] = exag
    if cfg is not None:
        body["cfg_weight"] = cfg
    r = requests.post(f"{NARRATOR}/tts", json=body, timeout=600)
    r.raise_for_status()
    with open(dest, "wb") as f:
        f.write(r.content)
    with wave.open(dest) as w:
        return w.getframerate()


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: narrate.py <script.txt> <out-prefix>")
    script, prefix = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(prefix) or ".", exist_ok=True)
    parts, sr = [], 24000
    for i, (text, exag, cfg) in enumerate(beats(script)):
        dest = f"{prefix}_{i:02d}.wav"
        sr = synth(text, exag, cfg, dest)
        parts.append(dest)
        print(f"[{i:02d}] {len(text):>3}c -> {dest}")
    # concat with silence padding between beats via ffmpeg concat filter
    silence = f"{prefix}_sil.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-t", str(PAUSE_S),
         "-i", f"anullsrc=r={sr}:cl=mono", silence],
        check=True, capture_output=True,
    )
    listfile = f"{prefix}_list.txt"
    with open(listfile, "w") as f:
        for p in parts:
            f.write(f"file '{os.path.abspath(p)}'\n")
            f.write(f"file '{os.path.abspath(silence)}'\n")
    out = f"{prefix}_vo.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", out],
        check=True, capture_output=True,
    )
    print(f"\nVO -> {out}")


if __name__ == "__main__":
    main()
