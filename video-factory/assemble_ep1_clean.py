#!/usr/bin/env python3
"""Clean shippable Episode 1 (stills). Fixes the audio 'breakings': the voice is
ONE continuous, smoothed track laid under silent scene clips — no per-clip audio
cuts/pops. Balanced loudness, clean end card, warm expressive voice.

Needs a Kokoro port-forward.  KOKORO=http://localhost:8880 python assemble_ep1_clean.py
"""
import os, subprocess, sys, wave
from assemble_ep1 import (TIMELINE, NARR_BEATS, CONVO, LOGO, MUSIC, LOGO_SCENES,
                          KOKORO, W, H, NARR, ts)

ROOT = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.join(ROOT, "scenes")
SFX = os.path.join(ROOT, "assets", "sfx_bed.wav")
ENDCARD = os.path.join(ROOT, "assets", "endcard_bg.png")
WORK = os.path.join(ROOT, "build_clean")
NVOICE = os.environ.get("NARRATOR_KOKORO_VOICE", "af_bella")   # warm + expressive
GAP = 0.26   # natural breath between lines (smooth, not a hard cut)
# Clean voice polish: tame rumble, lift presence for clarity/expression, even
# loudness, tiny edge fades so joins never click. No atempo (it caused artifacts).
VPOLISH = ("highpass=f=85,equalizer=f=3000:t=q:w=1.2:g=2.5,"
           "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.02,afade=t=out:d=0.04")


def sh(*a):
    subprocess.run(a, check=True, capture_output=True)


def kok(text, voice, dest):
    import json, urllib.request
    body = json.dumps({"input": text, "voice": voice, "sample_rate": 24000}).encode()
    req = urllib.request.Request(f"{KOKORO}/v1/audio/speech", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())


def dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def scene_png(prefix):
    import glob
    if prefix == "13_card":
        return ENDCARD
    g = sorted(glob.glob(os.path.join(SCENES, f"ep1_{prefix}_*.png")))
    return g[-1]


def main():
    os.makedirs(WORK, exist_ok=True)
    # 1) per-segment audio, polished. Collect (audio, dur, text, scene).
    segs = []
    for i, (prefix, kind, payload) in enumerate(TIMELINE):
        raw = os.path.join(WORK, f"a{i:02d}_raw.wav")
        aud = os.path.join(WORK, f"a{i:02d}.wav")
        if kind == "narr":
            kok(NARR_BEATS[payload], NVOICE, raw)
            text = NARR_BEATS[payload]
        else:
            voice, text = CONVO[payload]
            kok(text, voice, raw)
        sh("ffmpeg", "-y", "-i", raw, "-af", VPOLISH, "-ar", "24000", aud)
        segs.append((aud, dur(aud), text, prefix))

    # 2) ONE continuous VO track: seg, gap, seg, gap ... (smooth, no hard cuts)
    sil = os.path.join(WORK, "gap.wav")
    sh("ffmpeg", "-y", "-f", "lavfi", "-t", str(GAP), "-i", "anullsrc=r=24000:cl=mono", sil)
    listf = os.path.join(WORK, "vo_list.txt")
    with open(listf, "w") as f:
        for aud, *_ in segs:
            f.write(f"file '{aud}'\nfile '{sil}'\n")
    vo = os.path.join(WORK, "vo.wav")
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", vo)

    # 3) silent scene clips (Ken Burns), logo overlay on brand scenes; subtitle cues
    clips, srt, t = [], [], 0.0
    for i, (aud, d, text, prefix) in enumerate(segs):
        seg_len = d + GAP
        png = scene_png(prefix)
        clip = os.path.join(WORK, f"c{i:02d}.mp4")
        z = "z='min(zoom+0.0009,1.10)'" if i % 2 == 0 else "z='if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0009))'"
        base = (f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
                f"zoompan={z}:d={int(seg_len*25)}:s={W}x{H}:fps=25,setsar=1")
        kl = LOGO_SCENES.get(prefix)
        if kl:
            lw = int(W * 0.78) if kl == "hero" else int(W * 0.40)
            ly = "(H-h)/2" if kl == "hero" else "140"
            fc = f"{base}[bg];[1:v]scale={lw}:-1[lg];[bg][lg]overlay=(W-w)/2:{ly}[v]"
            sh("ffmpeg", "-y", "-loop", "1", "-i", png, "-i", LOGO, "-t", f"{seg_len:.2f}",
               "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", clip)
        else:
            sh("ffmpeg", "-y", "-loop", "1", "-i", png, "-t", f"{seg_len:.2f}",
               "-filter_complex", f"{base}[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", clip)
        clips.append(clip)
        srt.append(f"{i+1}\n{ts(t)} --> {ts(t+d)}\n{text}\n")   # caption only while speaking
        t += seg_len

    listv = os.path.join(WORK, "v_list.txt")
    open(listv, "w").write("".join(f"file '{c}'\n" for c in clips))
    silent = os.path.join(WORK, "silent.mp4")
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listv, "-c", "copy", silent)

    # 4) mux: silent video + continuous VO (front) + music + SFX, burn subtitles
    srtf = os.path.join(WORK, "ep01.srt"); open(srtf, "w").write("\n".join(srt))
    out = os.path.join(ROOT, "ep01_clean.mp4")
    style = ("FontName=DejaVu Sans,Bold=1,Fontsize=9,PrimaryColour=&H00FFFFFF,"
             "OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,"
             "Alignment=2,MarginV=64,MarginL=70,MarginR=70,WrapStyle=0")
    sh("ffmpeg", "-y", "-i", silent, "-i", vo, "-i", MUSIC, "-i", SFX,
       "-filter_complex",
       f"[0:v]subtitles={srtf}:force_style='{style}'[v];"
       "[1:a]volume=1.0[vo];[2:a]volume=0.12[m];[3:a]volume=0.4[s];"
       "[vo][m][s]amix=inputs=3:duration=first:dropout_transition=0,loudnorm=I=-15:TP=-1.5[a]",
       "-map", "[v]", "-map", "[a]", "-shortest",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out)
    print(f"CLEAN EPISODE -> {out}  ({t:.1f}s, voice={NVOICE})")


if __name__ == "__main__":
    main()
