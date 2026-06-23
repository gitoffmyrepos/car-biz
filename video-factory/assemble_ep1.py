#!/usr/bin/env python3
"""Assemble GigWheels Episode 1 ('New in Town') into a 9:16 MP4.

Inputs (must exist):
  - scenes/ep1_<id>_*.png       scene frames (collected from ComfyUI)
  - narration/out/ep01_NN.wav   per-beat narration (Kokoro am_onyx, RAW)
  - narration/episode01.txt      narration beats (for subtitle text)
  - narration/episode01_chars.txt  CHAR|voice|text dialogue

Pipeline: narration beats get the titan DSP per clip; character lines are
synthesized via Kokoro (per-cast voice); each line becomes a segment (still +
Ken-Burns zoom + its audio + a burned subtitle); segments concat in story order.

Run with a Kokoro port-forward up:  KOKORO=http://localhost:8880 python assemble_ep1.py
"""
import glob, json, os, subprocess, sys, urllib.request, wave

ROOT = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.join(ROOT, "scenes")
NARR = os.path.join(ROOT, "narration", "out")
WORK = os.path.join(ROOT, "build_ep1")
KOKORO = os.environ.get("KOKORO", "http://localhost:8880")
W, H = 1080, 1920
# Bright, vibrant narration treatment (NOT the old dull deep titan): clean low
# rumble, a touch quicker for energy, lift presence/air for an optimistic tone.
UPLIFT = ("highpass=f=90,atempo=1.04,treble=g=2.5:f=3500:w=0.7,bass=g=1:f=120,"
          "dynaudnorm=f=200,alimiter=limit=0.95")
LOGO = os.path.join(ROOT, "assets", "gigwheels_logo.png")    # real web-app logo
MUSIC = os.path.join(ROOT, "assets", "music_bed.wav")        # soft ambient bed
# Scenes that show the GigWheels brand (Kelvin's lot/office) get the real logo
# overlaid (FLUX garbles rendered text); the end card gets a big hero logo.
LOGO_SCENES = {"07_lot": "badge", "08_intro": "badge", "09_explain": "badge",
               "11_keys": "badge", "13_card": "hero"}

# Story timeline: each segment = (scene id-prefix, audio source, subtitle text).
# audio source: ("narr", beat_index) uses a pre-rendered narration beat (titan);
#               ("char", voice, text) synthesizes a character line via Kokoro.
NARR_BEATS = [  # subtitle text per narration beat (order matches episode01.txt)
    "A new city has a way of testing you.",
    "Chara had just arrived. Ready for anything but one thing.",
    "A car.",
    "The apps were hiring. But with no wheels, the city stayed out of reach.",
    "Then she met Alex.",
    "Alex had driven these streets. And Alex knew a name.",
    "Go see Kelvin, he said. He puts new drivers on the road.",
    "So the two of them went to find him.",
    "No car, and new in town? That is not the end of the road.",
    "It is where GigWheels begins.",
    "Apply, get verified, and your week is ready to roll.",
    "GigWheels. Ask for Kelvin.",
]
CONVO = [  # (voice, text) — from episode01_chars.txt
    ("am_onyx",   "Kelvin. This is Chara. Just moved here, ready to work, needs a car."),
    ("am_michael","Welcome to GigWheels, Chara. You drive, you earn, one simple weekly price. Insurance and maintenance on us."),
    ("af_heart",  "And if I have never rented before?"),
    ("am_michael","We get you verified first — usually a day or two. Once you are cleared, the keys are yours."),
    ("af_heart",  "No dealership. No loan."),
    ("am_michael","No dealership, no loan. A fair weekly rate, and a car ready when you are."),
    ("am_onyx",   "Told you. Kelvin looks after his drivers."),
    ("af_heart",  "Then let us get me verified. I have a city to work."),
]
# segment order: (scene_prefix, kind, payload)
TIMELINE = [
    ("01_city",   "narr", 0), ("02_arrive", "narr", 1), ("03_phone", "narr", 2),
    ("04_reach",  "narr", 3), ("05_meet",   "narr", 4), ("06_tip",   "narr", 5),
    ("06_tip",    "narr", 6), ("07_lot",    "narr", 7),
    ("08_intro",  "char", 0), ("09_explain","char", 1), ("10_relief","char", 2),
    ("09_explain","char", 3), ("10_relief", "char", 4), ("09_explain","char", 5),
    ("08_intro",  "char", 6), ("11_keys",   "char", 7),
    ("12_drive",  "narr", 8), ("12_drive",  "narr", 9), ("12_drive", "narr", 10),
    ("13_card",   "narr", 11),
]


def sh(*a):
    subprocess.run(a, check=True, capture_output=True)


def scene_png(prefix):
    g = sorted(glob.glob(os.path.join(SCENES, f"ep1_{prefix}_*.png")))
    if not g:
        sys.exit(f"missing scene: {prefix}")
    return g[-1]


def kokoro(text, voice, dest):
    body = json.dumps({"input": text, "voice": voice, "sample_rate": 24000}).encode()
    req = urllib.request.Request(f"{KOKORO}/v1/audio/speech", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())


def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def ts(s):
    h, s = divmod(s, 3600); m, s = divmod(s, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"


def main():
    os.makedirs(WORK, exist_ok=True)
    clips, srt, t = [], [], 0.0
    for i, (prefix, kind, payload) in enumerate(TIMELINE):
        png = scene_png(prefix)
        raw = os.path.join(WORK, f"a{i:02d}_raw.wav")
        aud = os.path.join(WORK, f"a{i:02d}.wav")
        if kind == "narr":
            src = os.path.join(NARR, f"ep01_{payload:02d}.wav")
            sh("ffmpeg", "-y", "-i", src, "-af", UPLIFT, aud)         # bright/vibrant narration
            text = NARR_BEATS[payload]
        else:
            voice, text = CONVO[payload]
            kokoro(text, voice, raw)
            sh("ffmpeg", "-y", "-i", raw, "-ar", "24000", aud)        # normalize
        dur = wav_dur(aud) + 0.35                                      # small tail pause
        # Ken Burns: slow zoom-in on the still, scaled/cropped to 9:16
        clip = os.path.join(WORK, f"c{i:02d}.mp4")
        zoom = "z='min(zoom+0.0010,1.12)'" if i % 2 == 0 else "z='if(lte(zoom,1.0),1.12,max(1.001,zoom-0.0010))'"
        base = (f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
                f"zoompan={zoom}:d={int(dur*25)}:s={W}x{H}:fps=25,setsar=1")
        kind_logo = LOGO_SCENES.get(prefix)
        if kind_logo:  # overlay the real GigWheels logo (brand-consistent, no FLUX text)
            lw = int(W * 0.78) if kind_logo == "hero" else int(W * 0.40)
            ly = "(H-h)/2" if kind_logo == "hero" else "140"
            fc = f"{base}[bg];[2:v]scale={lw}:-1[lg];[bg][lg]overlay=(W-w)/2:{ly}[v]"
            sh("ffmpeg", "-y", "-loop", "1", "-i", png, "-i", aud, "-i", LOGO,
               "-t", f"{dur:.2f}", "-filter_complex", fc, "-map", "[v]", "-map", "1:a",
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clip)
        else:
            sh("ffmpeg", "-y", "-loop", "1", "-i", png, "-i", aud, "-t", f"{dur:.2f}",
               "-filter_complex", f"{base}[v]", "-map", "[v]", "-map", "1:a",
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clip)
        clips.append(clip)
        srt.append(f"{i+1}\n{ts(t)} --> {ts(t+dur-0.2)}\n{text}\n")
        t += dur
        print(f"[{i:02d}] {prefix:9s} {kind} {dur:4.1f}s  {text[:42]}")

    # concat + burn subtitles
    listf = os.path.join(WORK, "list.txt")
    with open(listf, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    srtf = os.path.join(WORK, "ep01.srt")
    open(srtf, "w").write("\n".join(srt))
    silent = os.path.join(WORK, "ep01_silent.mp4")
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", silent)
    out = os.path.join(ROOT, "ep01.mp4")
    # Subtitles: smaller, lower, thin outline, auto-wrapped — no longer covering the frame.
    style = ("FontName=DejaVu Sans,Bold=1,Fontsize=9,PrimaryColour=&H00FFFFFF,"
             "OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,"
             "Alignment=2,MarginV=60,MarginL=70,MarginR=70,WrapStyle=0")
    # Burn subtitles + duck the soft music bed under the voice.
    sh("ffmpeg", "-y", "-i", silent, "-i", MUSIC,
       "-filter_complex",
       f"[0:v]subtitles={srtf}:force_style='{style}'[v];"
       "[1:a]volume=0.16[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]",
       "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out)
    print(f"\nEPISODE -> {out}  ({t:.1f}s)")


if __name__ == "__main__":
    main()
