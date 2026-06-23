#!/usr/bin/env python3
"""Assemble the ANIMATED Episode 1: Wan motion clips (motion/<id>.mp4) instead of
still Ken-Burns frames. Each clip is boomeranged (forward+reverse = seamless
loop) and stretched to its line's audio length, logo overlaid on brand scenes,
then VO + music + SFX mixed and subtitles burned.

Reuses the timeline/voice logic from assemble_ep1. Needs a Kokoro port-forward.
"""
import glob, os, subprocess, sys, wave
from assemble_ep1 import (TIMELINE, NARR_BEATS, CONVO, UPLIFT, LOGO, MUSIC,
                          LOGO_SCENES, KOKORO, W, H, NARR, kokoro, ts)

ROOT = os.path.dirname(os.path.abspath(__file__))
MOTION = os.path.join(ROOT, "motion")
SFX = os.path.join(ROOT, "assets", "sfx_bed.wav")
WORK = os.path.join(ROOT, "build_ep1m")


def sh(*a):
    subprocess.run(a, check=True, capture_output=True)


def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def boomerang(prefix):
    """clip + reversed clip = a seamless palindrome that loops without a jump."""
    src = os.path.join(MOTION, f"{prefix}.mp4")
    if not os.path.exists(src):
        sys.exit(f"missing motion clip: {src}")
    boom = os.path.join(WORK, f"{prefix}_boom.mp4")
    if not os.path.exists(boom):
        sh("ffmpeg", "-y", "-i", src, "-filter_complex",
           "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]",
           "-map", "[v]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", boom)
    return boom


def main():
    os.makedirs(WORK, exist_ok=True)
    clips, srt, t = [], [], 0.0
    booms = {p: boomerang(p) for p in set(s[0] for s in TIMELINE)}
    for i, (prefix, kind, payload) in enumerate(TIMELINE):
        raw = os.path.join(WORK, f"a{i:02d}_raw.wav")
        aud = os.path.join(WORK, f"a{i:02d}.wav")
        if kind == "narr":
            src = os.path.join(NARR, f"ep01_{payload:02d}.wav")
            sh("ffmpeg", "-y", "-i", src, "-af", UPLIFT, aud)
            text = NARR_BEATS[payload]
        else:
            voice, text = CONVO[payload]
            kokoro(text, voice, raw)
            sh("ffmpeg", "-y", "-i", raw, "-ar", "24000", aud)
        dur = wav_dur(aud) + 0.35
        clip = os.path.join(WORK, f"c{i:02d}.mp4")
        # loop the boomerang to cover dur, scale/crop to 9:16, overlay brand logo
        scale = f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=24,setsar=1"
        kl = LOGO_SCENES.get(prefix)
        if kl:
            lw = int(W * 0.78) if kl == "hero" else int(W * 0.40)
            ly = "(H-h)/2" if kl == "hero" else "140"
            fc = f"{scale}[bg];[2:v]scale={lw}:-1[lg];[bg][lg]overlay=(W-w)/2:{ly}[v]"
            sh("ffmpeg", "-y", "-stream_loop", "-1", "-i", booms[prefix], "-i", aud,
               "-i", LOGO, "-t", f"{dur:.2f}", "-filter_complex", fc, "-map", "[v]",
               "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
               "-shortest", clip)
        else:
            sh("ffmpeg", "-y", "-stream_loop", "-1", "-i", booms[prefix], "-i", aud,
               "-t", f"{dur:.2f}", "-filter_complex", f"{scale}[v]", "-map", "[v]",
               "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
               "-shortest", clip)
        clips.append(clip)
        srt.append(f"{i+1}\n{ts(t)} --> {ts(t+dur-0.2)}\n{text}\n")
        t += dur
        print(f"[{i:02d}] {prefix:9s} {kind} {dur:4.1f}s")

    listf = os.path.join(WORK, "list.txt")
    open(listf, "w").write("".join(f"file '{c}'\n" for c in clips))
    srtf = os.path.join(WORK, "ep01.srt"); open(srtf, "w").write("\n".join(srt))
    silent = os.path.join(WORK, "silent.mp4")
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", silent)
    out = os.path.join(ROOT, "ep01_animated.mp4")
    style = ("FontName=DejaVu Sans,Bold=1,Fontsize=9,PrimaryColour=&H00FFFFFF,"
             "OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,"
             "Alignment=2,MarginV=60,MarginL=70,MarginR=70,WrapStyle=0")
    # subtitles + mix VO with soft music bed and the city/honk SFX bed
    sh("ffmpeg", "-y", "-i", silent, "-i", MUSIC, "-i", SFX,
       "-filter_complex",
       f"[0:v]subtitles={srtf}:force_style='{style}'[v];"
       "[1:a]volume=0.14[m];[2:a]volume=0.5[s];"
       "[0:a][m][s]amix=inputs=3:duration=first:dropout_transition=0,dynaudnorm=f=250[a]",
       "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out)
    print(f"\nANIMATED EPISODE -> {out}  ({t:.1f}s)")


if __name__ == "__main__":
    main()
