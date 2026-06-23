#!/usr/bin/env python3
"""Animate each Episode-1 scene still into a short motion clip via Wan 2.2 I2V
(native ComfyUI). Run against a ComfyUI port-forward; collects .webp outputs.

Each scene gets a motion prompt describing organic, ambient movement (cars in
transit, people moving, gestures, camera life) — Wan's strength. ~480x832, 81
frames (~3.4s @ 24fps), fp8 to fit the 16GB 5080 (~80-140s/clip)."""
import json, urllib.request

API = "http://localhost:8188"
W, H, LEN, FPS = 480, 832, 49, 24   # 49 frames (~2s) — 81 OOMed the VAE decode
NEG = "static, frozen, still image, no motion, blurry, distorted, warped, melting, watermark, text, deformed faces"

# scene id -> motion description (camera + subject motion that suits the shot)
MOTION = {
    "01_city":   "the city comes alive, cars driving by, people walking the sidewalks, slow gentle camera push in, warm sunlight",
    "02_arrive": "she looks around at the tall buildings, hair and clothes sway gently, cars pass behind her, soft breeze, subtle camera push",
    "03_phone":  "she glances at her phone, gentle breathing and small head movement, glowing notifications flicker, soft ambient motion",
    "04_reach":  "people walk past in the background, she turns her head, the busy city moves around her, gentle camera drift",
    "05_meet":   "the two friends talk and gesture warmly, nodding, smiling, cars pass behind, lively natural conversation",
    "06_tip":    "he gestures and points enthusiastically as he talks, animated friendly body language, warm smile",
    "07_lot":    "a slow gentle camera pan across the car lot, soft sunlight shifting, a calm bright morning",
    "08_intro":  "a warm handshake, the characters smile and nod, gentle natural movement, friendly greeting",
    "09_explain":"he gestures warmly toward the cars as he talks, confident friendly movement, smiling",
    "10_relief": "she smiles brightly with relief, a small happy nod, eyes light up, gentle motion",
    "11_keys":   "he hands over the keys, all three react with big happy smiles, warm celebratory movement",
    "12_drive":  "she drives the car forward through the sunny city, the road and buildings move past, wind, sense of freedom",
    "13_card":   "a slow gentle warm glow pulses softly, subtle cinematic ambient motion",
}


def workflow(image_name, motion, prefix, seed):
    return {"prompt": {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "wan2.2_ti2v_5B_fp16.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "2": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["1", 0], "shift": 8.0}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": "wan2.2_vae.safetensors"}},
        "5": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": f"{motion}, cinematic 3d pixar animation, smooth natural motion, high quality"}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": NEG}},
        "8": {"class_type": "WanImageToVideo", "inputs": {"positive": ["6", 0], "negative": ["7", 0], "vae": ["4", 0], "start_image": ["5", 0], "width": W, "height": H, "length": LEN, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["2", 0], "positive": ["8", 0], "negative": ["8", 1], "latent_image": ["8", 2], "seed": seed, "steps": 20, "cfg": 5.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["4", 0]}},
        "11": {"class_type": "SaveAnimatedWEBP", "inputs": {"images": ["10", 0], "filename_prefix": f"anim_{prefix}", "fps": float(FPS), "lossless": False, "quality": 90, "method": "default"}},
    }}


def post(wf):
    req = urllib.request.Request(API + "/prompt", data=json.dumps(wf).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["prompt_id"]


if __name__ == "__main__":
    for i, (sid, motion) in enumerate(MOTION.items()):
        print("queued", sid, post(workflow(f"in_{sid}.png", motion, sid, 100 + i)))
    print(f"all {len(MOTION)} animations queued")
