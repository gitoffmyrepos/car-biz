#!/usr/bin/env python3
"""Render the GigWheels cast as stylized 3D Pixar-style frames via ComfyUI API."""
import json, time, urllib.request

API = "http://localhost:8188"
STYLE = ("stylized 3D Pixar DreamWorks animated cartoon character, big expressive "
         "friendly eyes, warm rounded proportions, cinematic soft lighting, high "
         "quality 3d character render, vibrant, wholesome, champagne gold and dark "
         "teal color accents. The car is plain, clean and unmarked with no text, "
         "no writing, no letters and no logos on it")
NEG = ("ugly, deformed, blurry, low quality, watermark, photorealistic, scary, "
       "extra fingers, text, letters, words, writing, captions, signage, brand "
       "logo, license plate text, any text on the car")

CAST = [
    ("chara", 101,
     "Chara, a beautiful young Black woman gig-economy driver, slightly round oval "
     "face shape, long black dreadlocks, radiant warm smile, standing confidently "
     "beside a compact car on a sunlit city street, " + STYLE),
    ("kelvin", 202,
     "Kelvin, a friendly light-skinned Black man who runs GigWheels, tall and broad "
     "athletic muscular build (six foot three, 240 pounds), clean bald fade haircut, "
     "neat well-groomed beard, a small birthmark mole in the center of his forehead, "
     "wearing a sharp stylish dark tailored suit with a black dress shirt and a black "
     "tie, dapper and swaggy like a charming dapper gentleman boss, but with a warm "
     "happy genuine friendly smile, standing by cars at a bright car lot, " + STYLE),
    ("alex", 303,
     "Alex, a cheerful young Mexican man gig-economy driver, short dark hair, a full "
     "thick beard that is fuller and slightly more rugged and unkempt than a neatly "
     "groomed one, friendly grin, standing beside a compact car on a city street, " + STYLE),
]


def workflow(prompt, seed, prefix):
    return {"prompt": {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": prompt}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": NEG}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 768, "height": 1344, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
              "latent_image": ["4", 0], "seed": seed, "steps": 4, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": f"gw_{prefix}"}},
    }}


def post(wf):
    req = urllib.request.Request(API + "/prompt", data=json.dumps(wf).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]


ids = {}
for name, seed, prompt in CAST:
    ids[name] = post(workflow(prompt, seed, name))
    print(f"queued {name} -> {ids[name]}")

done = set()
for _ in range(120):
    for name, pid in ids.items():
        if name in done:
            continue
        try:
            h = json.load(urllib.request.urlopen(f"{API}/history/{pid}", timeout=10))
            if h.get(pid, {}).get("status", {}).get("completed"):
                done.add(name)
                print(f"DONE {name}")
        except Exception:
            pass
    if len(done) == len(ids):
        print("ALL_DONE")
        break
    time.sleep(5)
