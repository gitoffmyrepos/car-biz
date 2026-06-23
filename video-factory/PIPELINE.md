# GigWheels Video Factory — Production Pipeline ("Wheels Up" series)

Free, self-hosted, **commercially-clean** 3D-cartoon ad series rendered on our
GPU nodes. Hybrid: **Blender for the recurring cast** (perfect consistency
forever) + **AI for style, backgrounds, ambient motion** (cheap, fast). Output
is vertical 9:16 for **WhatsApp Status + Instagram Reels**.

## The verdict that shapes everything
AI-only cannot keep a brand mascot pixel-identical across 20+ shots (~80-90%
consistency + cumulative drift is the realistic ceiling). So the recurring cast
is **rigged once in Blender** = identical every episode, any pose, perfect
lip-sync. AI does what it's great at — the look and the world around them.

## Locked, license-verified stack (all commercial-clean)
| Stage | Tool | License | Notes |
|---|---|---|---|
| Still style base | **Z-Image Turbo** (primary) / FLUX.1-schnell / SDXL (fallbacks) | Apache / Apache / OpenRAIL++-M | Z-Image built for 16GB; **NOT** FLUX-dev |
| Style look | **own-trained 3D-style LoRA** | ours | 50-100 curated frames; avoids Civitai license+trademark traps |
| Character identity (AI shots) | **trained per-character LoRA** + **plain IP-Adapter/Plus** | Apache | **NO InsightFace** (FaceID/InstantID/PuLID/ReActor = non-commercial) |
| Pose/expression | **xinsir SDXL ControlNet** (OpenPose/Depth/Canny) | Apache | **NOT** FLUX ControlNets (non-commercial) |
| Animate stills | **Wan 2.2 TI2V-5B** I2V | Apache | 5s clips, ~3-6 min/clip on 5080; best OSS identity-preservation |
| Interpolate (3D-cartoon) | **RIFE-anime / FILM** | MIT / Apache | ToonCrafter is 2D-anime OOD — skip for 3D look |
| Recurring cast | **Blender** (Cycles/OptiX on 5080) | GPL tool, output yours | rigged once = perfect consistency |
| Lip-sync | **Rhubarb Lip Sync** (MIT) viseme → blendshapes | MIT | neural lip-sync (MuseTalk/SadTalker/Wav2Lip) fails/blocked on cartoon faces |
| Upscale | Real-ESRGAN | BSD | final polish |
| Script | Ollama gemma3 | — | beats/dialogue |
| **Storyteller VO** | **Chatterbox** narrator-tts (this repo `voice-narrator/`) | **MIT** | deep documentary delivery; exaggeration knob = gravitas |
| Character voices | Kokoro (existing) | Apache | per-character |
| Assemble | ffmpeg | LGPL | cut + mix + caption |
| Orchestrate/publish | n8n + render-worker + MinIO | — | YouTube/Bluesky auto, TikTok review-tap |

## Hard license rules (do not violate)
- No FLUX-**dev** anywhere (non-commercial) — and most Civitai "Pixar" LoRAs are dev-trained → train our own.
- No InsightFace-dependent face tools (antelopev2/buffalo_l = non-commercial research).
- No FLUX ControlNets / LTX-Video (revenue-capped/no-compete) for production output.
- Never use "Pixar"/"Disney" in public-facing copy — describe the look.

## Narration (the storyteller VO) — BUILT
`voice-narrator/` (Chatterbox, CPU, gigwheels-video ns, port 8890). Render-time
batch: POST a script line → WAV. Delivery knobs: `exaggeration` (gravitas),
`cfg_weight` (pacing). Optional **consent-gated** `/data/reference.wav` matches a
voice you OWN/are licensed for; default = clean synthetic deep voice.

Produce an episode VO:
```
kubectl -n gigwheels-video port-forward svc/narrator-tts 8890:8890 &
cd video-factory/narration && python narrate.py episode01.txt out/ep01
```
Script format: `narration/episode01.txt` (one beat per line; `[exag=.. cfg=..]`
markers steer delivery). Ep1 = "No Car, No Problem" (hero: Mia).

## Cast (recurring) — locked designs + base seeds for consistency
- **Chara** (hero driver, new in the city): beautiful young **Black woman**,
  slightly round oval face, long **black dreadlocks**, warm radiant smile. seed 101.
- **Kelvin** (runs GigWheels; named in every "ask for Kelvin" beat): **light-skinned
  Black man**, tall + broad **athletic build (6'3", 240 lb)**, clean **bald fade**,
  neat well-groomed **beard**, a small **birthmark mole in the center of his
  forehead**, dressed **dapper** — sharp dark tailored **suit, black shirt, black
  tie** (charming dapper-boss vibe, but warm/happy not menacing). seed 202.
- **Alex** (veteran driver friend; replaces "Deuce"): cheerful young **Mexican man**,
  short dark hair, **full thick beard** (fuller + more rugged/unkempt than Kelvin's
  neat one), friendly grin. seed 303.

Style: stylized 3D Pixar/DreamWorks cartoon, big expressive eyes, warm rounded
proportions, champagne-gold + teal accents. The character prompts live in
`tools/render_cast.py`-style workflows; lock each character's seed so frames stay
on-model. (For true cross-shot consistency, the recurring cast is rigged once in
Blender — these AI frames are concept/look-dev + backgrounds.)

## Ep1 = series-intro / origin film (~2 min, exception to the 30-45s rule)
The first video introduces the business: narrator carries Chara's arrival in a
new city and her need for a car, Deuce points her to Kelvin/GigWheels, narrator
brings them to the lot, then the 3 (Chara, Deuce, Kelvin) talk. TRUTH baked in:
new drivers are verified in ~24-48h before keys — only returning registered
drivers get same-day. Weekly episodes after this stay 30-45s.

## Subtitles (burned in — required every episode)
Every line, narration and character, gets an on-screen caption. We own the
exact script text, so we generate the SRT directly from script + WAV durations
(no STT drift, perfect sync):
- Narration: `narrate.py` emits `<prefix>.srt` alongside the VO.
- Character lines: same cue-builder over `episode01_chars.txt` (one cue per line).
Merge the narration + dialogue SRTs on the master timeline, then burn at assemble:
```
ffmpeg -i ep01.mp4 -vf "subtitles=ep01.srt:force_style=\
'FontName=Montserrat,Bold=1,Fontsize=15,PrimaryColour=&H00FFFFFF,\
OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=70'" \
-c:a copy ep01_subbed.mp4
```
(bold white + black outline, bottom-center, lifted off the edge — readable on a
phone with sound off, which is how Status/Reels are watched.)

## Episode length — SHORT on purpose
Target **30-45s** per episode (60s hard max). Status caps at 30s/item; Reels
retention dies after ~30s — 2-3 min would BORE, not enthrall. One use-case,
told tight: hook (3s) → problem → GigWheels/Kelvin → CTA. The series gets its
depth from MANY short episodes (a different driver each time), not long ones.
30-45s is also what's actually buildable in Blender per week (labor-bound). An
occasional ~90s "hero" film for the site/pinned post is fine; weekly = short.

## Per-episode flow (~30-45s, ≈8-15 short clips, overnight batch)
1. **Script** (Ollama) → beats + character dialogue + VO lines.
2. **VO** (narrator-tts) → `ep_vo.wav`. **Character voices** (Kokoro) → per-line WAVs.
3. **Cast** (Blender): pose rigged characters per shot; Rhubarb visemes drive mouths from the WAVs.
4. **Environments** (ComfyUI): Z-Image/SDXL + style LoRA → backgrounds/establishing frames.
5. **Composite + animate**: Blender render over AI backgrounds; Wan 2.2 for ambient AI-only shots.
6. **Assemble** (ffmpeg): hard cuts (hide drift), VO + music + character audio, burn captions, 9:16.
7. **Upscale** (Real-ESRGAN) → publish (n8n).

## Status
- [x] narrator-tts (Chatterbox) built + deployed — the storyteller VO
- [x] ComfyUI (AI half) building → first test render pending
- [ ] Blender headless on 5080 (cast half) — pending Blender-pipeline research
- [ ] Hero character "Mia" rig
- [ ] Episode 1 end-to-end
- [ ] n8n orchestration + auto-publish
