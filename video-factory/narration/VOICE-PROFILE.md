# Narrator Voice Profile — "Titan" (the deep storyteller)

We are NOT cloning anyone's voice. We measured the acoustic *profile* of a
reference clip and a known archetype, then designed an **original** synthetic
voice that lands in the same sonic territory. Nothing from the reference clip's
content is reproduced — only numbers (pitch, pace, timbre) inform our settings.

## Measured reference profile (acoustic analysis only)
A deep male voiceover over a music bed. After band-limiting to the vocal range
to reject the backing track:

| Metric | Value | Reading |
|---|---|---|
| f0 median | **~80 Hz** | very deep bass-baritone (typical male ~110-130 Hz) |
| f0 IQR | 78 – 107 Hz | sits low, occasional lift |
| f0 floor (p5) | ~75 Hz | true sub-bass chest weight |
| pitch std | ~23 Hz | measured, deliberate — not monotone, not animated |
| timbre | dark / chesty | low spectral centroid; big-vocal-tract "thickness" |
| cadence | slow, weighty | long syllables, deliberate pacing |

Archetype match: the "imposing titan" narrator — deep, slow, commanding,
a little menace. (Same family as the big-villain movie-narrator sound.)

## Our original target (intelligibility-adjusted)
- **f0 ~95-100 Hz** — deep enough to read as a titan, clear enough for a 9:16
  ad on a phone speaker (a literal 80 Hz muddies on small speakers).
- **Formants lowered with pitch** (asetrate method) → the "bigger speaker" body,
  not just a low-pitched normal voice.
- **Slow pace** via low `cfg_weight` (~0.25); **measured variation** via moderate
  `exaggeration` (~0.6) — gravitas, not theatrics.
- Light low-shelf bass + a touch of room/space for cinematic weight.

## Implementation
`narrate.py` preset `NARRATOR_VOICE=titan` (Chatterbox synth + ffmpeg color):
`asetrate*0.80 → atempo restore → bass +6dB@100Hz → subtle echo → limiter`.

## Calibration (do once the narrator-tts service is live)
Chatterbox's neutral base f0 isn't known until it runs. To hit the target:
1. `NARRATOR_VOICE=titan python narrate.py probe.txt out/probe` on a 1-line script.
2. Measure the result f0 (the `narrate.py` analysis snippet / ffprobe + the f0
   script in the build log).
3. Adjust the `asetrate` ratio so median f0 lands ~95-100 Hz; lower ratio = deeper.
4. (Optional, for cross-episode consistency) synth one neutral male line, deepen
   it once, save as our OWN `reference.wav`, and pass it as the Chatterbox
   reference so every episode starts from the same deep base before coloring.

## See also
- [[narrate.py]] — the VO renderer + presets
- `../PIPELINE.md` — full video-factory stack
