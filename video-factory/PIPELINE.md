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

## Per-episode flow (~2-3 min, ≈25-40 short clips, overnight batch)
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
