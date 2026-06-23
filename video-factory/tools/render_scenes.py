#!/usr/bin/env python3
"""Render Episode 1 ('New in Town') scene frames via ComfyUI — one key frame per
beat, 9:16, cast seeds for rough consistency."""
import json, time, urllib.request

API = "http://localhost:8188"
STYLE = ("stylized 3D Pixar DreamWorks animated cartoon, big expressive friendly "
         "eyes, warm rounded proportions, cinematic soft lighting, vibrant, "
         "wholesome, champagne gold and dark teal color accents, high quality 3d render")
NEG = ("ugly, deformed, blurry, low quality, watermark, photorealistic, scary, extra "
       "fingers, text, letters, words, writing, captions, signage, logo, any text")

CHARA = "Chara, a beautiful young Black woman, slightly round oval face, long black dreadlocks, warm radiant smile"
KELVIN = ("Kelvin, a light-skinned Black man, clean bald fade, neat beard, a small birthmark mole "
          "in the center of his forehead, tall broad athletic build, sharp dark tailored suit with "
          "a black dress shirt and black tie, dapper and warm")
ALEX = "Alex, a cheerful young Mexican man, short dark hair, full thick rugged beard, friendly grin"

# (id, seed, prompt) — prompts end with STYLE appended
SCENES = [
    ("01_city",   11,  "wide establishing shot of a vibrant sunlit big-city skyline in the morning, busy streets and small cars below"),
    ("02_arrive", 101, f"{CHARA}, standing on a city sidewalk holding a small suitcase, looking up at the tall buildings, hopeful yet a little overwhelmed, a plain unmarked car passing by"),
    ("03_phone",  101, f"{CHARA}, sitting on a bench looking at her phone showing glowing delivery gig-app notifications, no car around her, determined expression"),
    ("04_reach",  101, f"{CHARA}, standing on a busy sidewalk holding her phone with floating glowing delivery order icons around her, the bright city just out of reach, wistful"),
    ("05_meet",   303, f"{CHARA} on the left talking with {ALEX} on the right, two friends having a warm friendly conversation on a sunny street corner, plain unmarked car behind"),
    ("06_tip",    303, f"{ALEX}, smiling and gesturing as he points the way, enthusiastically telling a friend about a place called GigWheels"),
    ("07_lot",    22,  "a bright clean friendly used-car lot at GigWheels, neat rows of plain unmarked compact cars, champagne gold and teal blank signage with no text, sunny day"),
    ("08_intro",  202, f"{KELVIN} in his sharp suit warmly shaking hands and welcoming {CHARA}, with {ALEX} smiling beside them, at the bright car lot"),
    ("09_explain",202, f"{KELVIN}, gesturing warmly toward a row of plain unmarked cars, confidently and happily explaining, dapper"),
    ("10_relief", 101, f"{CHARA}, smiling with relief and bright excitement, hopeful and happy, at the car lot"),
    ("11_keys",   202, f"the three of them — {KELVIN}, {CHARA} and {ALEX} — smiling happily together beside a plain unmarked car as Kelvin hands over the keys"),
    ("12_drive",  101, f"{CHARA} driving a plain unmarked compact car through the sunny city, a big happy confident smile, sense of freedom"),
    ("13_card",   33,  "a clean minimal end card, champagne gold and dark teal, a simple stylized car-wheel emblem in the center, elegant, no text"),
]


def workflow(prompt, seed, prefix):
    return {"prompt": {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": f"{prompt}, {STYLE}"}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": NEG}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 768, "height": 1344, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
              "latent_image": ["4", 0], "seed": seed, "steps": 4, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": f"ep1_{prefix}"}},
    }}


def post(wf):
    req = urllib.request.Request(API + "/prompt", data=json.dumps(wf).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]


if __name__ == "__main__":
    for sid, seed, prompt in SCENES:
        print("queued", sid, post(workflow(prompt, seed, sid)))
    print(f"all {len(SCENES)} scenes queued")
