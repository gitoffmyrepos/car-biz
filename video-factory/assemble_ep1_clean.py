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
# Clean voice polish: tame rumble, lift presence for clarity/expression, tiny
# edge fades so joins never click. NO per-segment loudnorm — single-pass loudnorm
# silenced ~half the short clips (the dialogue skips/breaks). One loudnorm runs
# on the final mix instead. No atempo (it caused artifacts).
# NOTE: afade=t=out needs a start time; without st it fades from t=0 and silences
# the whole clip (that was the dialogue dropout bug). Use only a leading fade-in;
# the silence gaps between segments mask any trailing click.
VPOLISH = "highpass=f=85,equalizer=f=3000:t=q:w=1.2:g=2.5,afade=t=in:d=0.02"


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
            # Prefer the expressive Chatterbox narration (cached by the cbx batch);
            # fall back to Kokoro if a beat's cbx wav is missing.
            cbx = os.path.join(ROOT, "narration", "cbx", f"ep01_{payload:02d}.wav")
            if os.path.exists(cbx) and os.path.getsize(cbx) > 1000:
                raw = cbx
            else:
                kok(NARR_BEATS[payload], NVOICE, raw)
            text = NARR_BEATS[payload]
        else:
            voice, text = CONVO[payload]
            kok(text, voice, raw)
        # Force ONE uniform PCM format (16-bit / 24k / mono) on every segment so
        # the concat has no format seams (the cause of the dialogue clicks/skips).
        sh("ffmpeg", "-y", "-i", raw, "-af", VPOLISH,
           "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", aud)
        segs.append((aud, dur(aud), text, prefix))

    # 2) ONE continuous VO track: seg, gap, seg, gap ... (smooth, no hard cuts).
    sil = os.path.join(WORK, "gap.wav")
    sh("ffmpeg", "-y", "-f", "lavfi", "-t", str(GAP), "-i", "anullsrc=r=24000:cl=mono",
       "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", sil)
    listf = os.path.join(WORK, "vo_list.txt")
    with open(listf, "w") as f:
        for aud, *_ in segs:
            f.write(f"file '{aud}'\nfile '{sil}'\n")
    vo = os.path.join(WORK, "vo.wav")
    # Re-encode (NOT copy) so the whole track is one clean stream — no seam glitches.
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf,
       "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", vo)

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
    # Voice MUST dominate (it's an ad): VO up front, music + SFX kept low under it.
    # Output stereo AAC for max player/WhatsApp compatibility.
    sh("ffmpeg", "-y", "-i", silent, "-i", vo, "-i", MUSIC, "-i", SFX,
       "-filter_complex",
       f"[0:v]subtitles={srtf}:force_style='{style}'[v];"
       "[1:a]volume=1.4[vo];[2:a]volume=0.08[m];[3:a]volume=0.14[s];"
       "[vo][m][s]amix=inputs=3:duration=first:dropout_transition=0,"
       "loudnorm=I=-14:TP=-1.5,aformat=channel_layouts=stereo[a]",
       "-map", "[v]", "-map", "[a]", "-shortest",
       # WhatsApp/IG-safe: H.264 High@4.0, yuv420p, CFR 30fps, AAC-LC 44.1k stereo,
       # and +faststart (moov atom at front) — without faststart WhatsApp rejects
       # the upload ("could not be sent").
       "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
       "-r", "30", "-vsync", "cfr",
       "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "44100",
       "-movflags", "+faststart", out)
    print(f"CLEAN EPISODE -> {out}  ({t:.1f}s, voice={NVOICE})")


if __name__ == "__main__":
    main()
