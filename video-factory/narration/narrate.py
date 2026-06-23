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

# Voice presets. "titan" colors the raw synth into a thick, deep, slow, menacing
# narrator (the imposing-villain archetype) WITHOUT cloning any real actor:
#   - DEEPEN<1 drops pitch (asetrate) then restores duration (atempo) = deeper,
#     not chipmunk-fast. 0.82 is heavy; raise toward 0.90 for less.
#   - bass adds chest resonance; aecho a touch of cinematic space.
PRESETS = {
    "storyteller": "",  # no coloring — file [exag/cfg] markers carry the delivery
    # Calibrated to a measured reference profile (f0 ~80Hz, dark/chesty, slow).
    # asetrate<1 drops pitch AND formants together = a physically bigger speaker
    # (the "thickness"), then atempo restores duration. 0.80 takes a ~150Hz
    # Chatterbox base to ~120Hz; recalibrate the ratio once the service is live
    # (synth a probe, measure f0, aim ~95-100Hz — deep but ad-intelligible).
    "titan": (
        "asetrate=24000*0.80,atempo=1/0.80,aresample=24000,"
        "bass=g=6:f=100:w=0.5,"
        "aecho=0.85:0.9:55:0.18,"
        "alimiter=limit=0.95"
    ),
}
VOICE = os.environ.get("NARRATOR_VOICE", "storyteller")


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
    raw = f"{prefix}_raw.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", raw],
        check=True, capture_output=True,
    )
    out = f"{prefix}_vo.wav"
    flt = PRESETS.get(VOICE, "")
    if flt:
        subprocess.run(
            ["ffmpeg", "-y", "-i", raw, "-af", flt, out],
            check=True, capture_output=True,
        )
        print(f"\nVO ({VOICE}) -> {out}")
    else:
        os.replace(raw, out)
        print(f"\nVO -> {out}")


if __name__ == "__main__":
    main()
