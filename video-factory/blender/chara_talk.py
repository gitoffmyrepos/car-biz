"""Blender headless: build a stylized Chara (Black woman, dreadlocks, big eyes),
lip-sync her to a Rhubarb viseme timeline, render toon frames.
  blender -b -P chara_talk.py -- <rhubarb.json> <out_dir> <fps> <total_frames>
"""
import bpy, json, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
RHUBARB, OUTDIR, FPS, NFRAMES = argv[0], argv[1], int(argv[2]), int(argv[3])

# Rhubarb mouth shape -> (jaw_open, lip_round). Preston-Blair basic set.
VISEME = {"A": (0.0, 0.0), "B": (0.30, 0.0), "C": (0.62, 0.0), "D": (1.0, 0.0),
          "E": (0.45, 0.45), "F": (0.18, 0.85), "G": (0.22, 0.1), "H": (0.4, 0.1),
          "X": (0.0, 0.0)}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS
sc.render.resolution_x, sc.render.resolution_y = 768, 1344   # 9:16


def toon_mat(name, color, size=0.55, smooth=0.05):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    toon = nt.nodes.new("ShaderNodeBsdfToon")
    toon.inputs["Color"].default_value = (*color, 1)
    toon.inputs["Size"].default_value = size
    toon.inputs["Smooth"].default_value = smooth
    nt.links.new(toon.outputs[0], out.inputs["Surface"])
    return m


def add_sphere(r, loc, scale, mat, segs=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=segs, ring_count=rings)
    o = bpy.context.object; o.scale = scale
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat)
    return o


def add_cyl(r, depth, loc, rot, mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=12)
    o = bpy.context.object; o.rotation_euler = rot
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat)
    return o


SKIN = toon_mat("skin", (0.34, 0.18, 0.10))
SKIN_D = toon_mat("skin_d", (0.26, 0.13, 0.07))
WHITE = toon_mat("white", (0.97, 0.97, 0.95))
IRIS = toon_mat("iris", (0.20, 0.10, 0.04))
DARK = toon_mat("dark", (0.03, 0.02, 0.02))
LIP = toon_mat("lip", (0.50, 0.18, 0.16))
HAIR = toon_mat("hair", (0.06, 0.04, 0.03))
COAT = toon_mat("coat", (0.62, 0.46, 0.30))   # her tan coat
TOP = toon_mat("top", (0.20, 0.20, 0.22))

# ---- body: torso + neck (so she's not a floating head) ----
add_sphere(1.0, (0, 0.1, -2.5), (1.25, 0.9, 1.1), COAT)          # shoulders/coat
add_sphere(0.42, (0, 0.05, -1.35), (1, 1, 1.1), SKIN_D)          # neck
add_sphere(0.55, (0, -0.15, -2.0), (0.7, 0.5, 0.7), TOP)         # inner top (collar)

# ---- head: oval-round ----
head = add_sphere(1.0, (0, 0, 0), (0.94, 0.92, 1.08), SKIN)

# ---- eyes (big Pixar): white + brown iris + pupil + upper lid + lashes ----
for sx in (-0.40, 0.40):
    add_sphere(0.30, (sx, -0.80, 0.16), (1.0, 0.62, 1.05), WHITE)        # white
    add_sphere(0.165, (sx, -1.02, 0.13), (1, 1, 1), IRIS)               # iris
    add_sphere(0.075, (sx, -1.10, 0.13), (1, 1, 1), DARK)              # pupil
    lid = add_sphere(0.31, (sx, -0.74, 0.30), (1.02, 0.62, 0.55), SKIN)  # upper lid
    lid.rotation_euler = (math.radians(-18), 0, 0)
    br = add_sphere(0.20, (sx, -0.92, 0.52), (1.0, 0.22, 0.16), HAIR)    # brow
    br.rotation_euler = (0, 0, math.radians(8 if sx > 0 else -8))
add_sphere(0.15, (0, -1.05, -0.14), (0.62, 0.9, 0.72), SKIN)            # nose

# ---- mouth with shape keys (jaw_open, lip_round) ----
bpy.ops.mesh.primitive_circle_add(vertices=24, radius=0.30, fill_type='NGON', location=(0, -1.02, -0.50))
mouth = bpy.context.object
mouth.rotation_euler = (math.radians(90), 0, 0)
mouth.scale = (1.05, 0.42, 0.85)
mouth.data.materials.append(LIP); bpy.ops.object.shade_smooth()
mouth.shape_key_add(name="Basis")
ko = mouth.shape_key_add(name="open"); kr = mouth.shape_key_add(name="round")
for v in mouth.data.vertices:
    co = v.co
    ko.data[v.index].co = co + Vector((0, 0, 0.32) if co.z > 0 else (0, 0, -0.32))
    kr.data[v.index].co = co + Vector((-co.x * 0.5, -0.20, 0.0))
ko.value = kr.value = 0.0

# ---- dreadlocks: draping locs framing the face + reaching the shoulders ----
import random
random.seed(7)
for ang in range(0, 360, 18):
    a = math.radians(ang)
    fx, fy = math.sin(a), math.cos(a)
    if fy < -0.35:                 # skip the lower-front face
        continue
    x = 0.92 * fx; y = 0.86 * fy
    length = random.uniform(1.8, 2.8)
    z = -0.4 - length / 2
    loc = add_cyl(random.uniform(0.07, 0.10), length, (x, y * 0.95 + 0.05, z),
                  (math.radians(random.uniform(2, 12)), 0, math.radians(random.uniform(-8, 8))), HAIR)
# a few front-frame locs beside the face
for sx in (-0.95, 0.95, -0.82, 0.82):
    add_cyl(0.08, 2.4, (sx, -0.25, -1.2), (math.radians(6), 0, math.radians(10 if sx > 0 else -10)), HAIR)
# scalp cap
add_sphere(0.98, (0, 0.18, 0.35), (0.96, 0.9, 0.7), HAIR)

# ---- lip-sync keyframes from rhubarb ----
cues = json.load(open(RHUBARB))["mouthCues"]
sc.frame_start = 1; sc.frame_end = NFRAMES


def key(frame, o, r):
    ko.value, kr.value = o, r
    ko.keyframe_insert("value", frame=frame); kr.keyframe_insert("value", frame=frame)


key(1, 0, 0)
for c in cues:
    f = max(1, int(c["start"] * FPS) + 1)
    o, r = VISEME.get(c["value"], (0, 0)); key(f, o, r)
key(NFRAMES, 0, 0)

# ---- camera / lights / toon / render ----
bpy.ops.object.camera_add(location=(0, -5.4, -0.35), rotation=(math.radians(92), 0, 0))
sc.camera = bpy.context.object
for loc, e in [((3.5, -4, 4), 800), ((-4, -3, 2), 380), ((0, 3.5, 3.5), 300)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    bpy.context.object.data.energy = e; bpy.context.object.data.size = 6
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.93, 0.84, 0.74, 1)

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'; sc.cycles.samples = 24
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = OUTDIR + "/frame_"
bpy.ops.render.render(animation=True)
print("CHARA_RENDER_DONE")
