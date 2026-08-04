# bake_sladania.py v7 — FULL-LENGTH animal motion on levi (Sladania)
#
# Root cause of "front half only":
#   Hierarchy under dou_1 is a star, but WORLD bind positions stack along Y:
#     head → core → dou_5..8 → dou_9..12 → dou_13..17 (tip)
#   v6 ordered head → dou_13..17 (tip) → JUMP BACK to dou_5 mid — wrong path,
#   double-counted length, and left mid-body phase/weight dead.
#
# Ice worm was never length-matched (mesh ~13k× levi, rest spine collapsed);
# we do NOT retarget ice clips. Motion is authored on the measured levi line.
#
# blender --background --python scripts/bake_sladania.py
import bpy
import math
import os
import json
from mathutils import Quaternion, Euler, Vector

LEVI = r"C:\Users\nugye\Documents\Grudge-Builder\client\public\models\cinema\leviathan.glb"
OUT_DIR = r"C:\Users\nugye\Documents\Grudge-Builder\client\public\models\cinema\Sladania"
OUT_GLB = os.path.join(OUT_DIR, "Sladania.glb")
OUT_MAP = os.path.join(OUT_DIR, "bone_map.json")
OUT_README = os.path.join(OUT_DIR, "README.md")
os.makedirs(OUT_DIR, exist_ok=True)

FPS = 24

# FULL animal line by measured bind long-axis order (head → tip).
# Includes mid chains 5–8 and 9–12 that skin the middle of the mesh.
SNAKE = [
    "atama_011",   # 0 head
    "dou_1_01",    # 1 core
    "dou_5_021",   # 2 mid-front
    "dou_6_022",
    "dou_7_023",
    "dou_8_024",
    "dou_9_07",    # 6 mid
    "dou_10_08",
    "dou_11_09",
    "dou_12_010",
    "dou_13_03",   # 10 rear
    "dou_14_02",
    "dou_15_04",
    "dou_16_05",
    "dou_17_06",   # 14 tip
]
# fins / chest — follow nearby body phase (not a separate spine)
SIDE = ["dou_2_027", "dou_3_028", "L_munabire_029", "R_munabire_030",
        "R_asihire_025", "L_asihire_026"]
JAW = "kuchi_012"


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_gltf(path):
    bpy.ops.import_scene.gltf(filepath=path)


def find_arm():
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    return max(arms, key=lambda a: len(a.data.bones))


def euler_delta(pitch, yaw, roll):
    """Local bend: pitch=X (up/down), yaw=Y (left/right S), roll=Z."""
    return Euler((pitch, yaw, roll), "XYZ").to_quaternion()


def set_joint(arm, name, rest_q, pitch, yaw, roll, frame):
    pb = arm.pose.bones.get(name)
    if not pb:
        return
    pb.rotation_mode = "QUATERNION"
    # rest * delta — pure local bend, never root spin
    pb.rotation_quaternion = (rest_q @ euler_delta(pitch, yaw, roll)).normalized()
    pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)


def bake_clip(arm, snake, rest, name, frames, fn):
    """fn(i, u, n) -> (pitch, yaw, roll) for joint i, u in 0..1."""
    act = bpy.data.actions.new(name=name)
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = act
    n = len(snake)
    for f in range(frames + 1):
        u = f / max(1, frames)
        bpy.context.scene.frame_set(f)
        for i, bname in enumerate(snake):
            pitch, yaw, roll = fn(i, u, n)
            set_joint(arm, bname, rest[bname], pitch, yaw, roll, f)
        # fins / chest follow nearby body phase (softer)
        mid_i = max(1, (n - 1) // 3)
        for j, bname in enumerate(SIDE):
            if bname not in rest:
                continue
            p, y, r = fn(mid_i + j * 0.2, u, n)
            set_joint(arm, bname, rest[bname], p * 0.45, y * 0.45, r * 0.35, f)
        # jaw rides head pitch a bit
        if JAW in rest:
            p, y, r = fn(0, u, n)
            set_joint(arm, JAW, rest[JAW], p * 0.35 + 0.08 * math.sin(u * math.pi * 2), 0, 0, f)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    return act


# ── motion recipes (radians) ─────────────────────────────────────────────

def swim_s(i, u, n, amp=0.38, waves=2.2, lag=0.42):
    """Lateral S-wave: yaw dominant, phase lag head → tip along FULL length."""
    t = i / max(1, n - 1)
    phase = u * math.pi * 2 * waves - i * lag
    # stronger toward tip (propulsion) — full chain so mid + rear both live
    a = amp * (0.55 + 0.85 * t)
    yaw = math.sin(phase) * a
    pitch = math.sin(phase * 0.5 + 0.3) * a * 0.16
    roll = math.cos(phase) * a * 0.18
    return pitch, yaw, roll


def dive_follow(i, u, n, amp=0.55, lag=0.065):
    """Head pitches down first; body then tip follow (traveling pitch)."""
    # longer chain → smaller per-joint lag so pulse still reaches tip in clip
    span = 1.0 + (n - 1) * lag
    local = u * span - i * lag
    if local <= 0 or local >= 1.0:
        w = 0.0
    else:
        w = math.sin(local * math.pi)
    pitch = -amp * w  # negative = head/body down
    yaw = math.sin(u * math.pi * 2 - i * 0.25) * amp * 0.08 * w
    return pitch, yaw, 0.0


def emerge_follow(i, u, n, amp=0.5, lag=0.065):
    """Head rises first; body then tip follow (pitch up)."""
    span = 1.0 + (n - 1) * lag
    local = u * span - i * lag
    if local <= 0 or local >= 1.0:
        w = 0.0
    else:
        w = math.sin(local * math.pi)
    pitch = amp * w
    yaw = math.sin(u * math.pi * 2 - i * 0.25) * amp * 0.08 * w
    return pitch, yaw, 0.0


def tail_whip(i, u, n, amp=0.7):
    """Rear half of FULL chain yaws hard; head holds."""
    t = i / max(1, n - 1)
    stroke = math.sin(u * math.pi)
    phase = u * math.pi * 2 - i * 0.35
    # only rear 55% really whips
    w = max(0.0, (t - 0.45) / 0.55) ** 1.2
    yaw = math.sin(phase) * amp * w * (0.4 + 0.6 * stroke)
    pitch = math.sin(phase * 0.7) * amp * 0.15 * w
    return pitch, yaw, yaw * 0.2


def breach_region(i, u, n, focus, amp=0.65):
    """focus 0=head 0.5=mid 1=tail — pitch pulse centered there."""
    pos = i / max(1, n - 1)
    fall = math.exp(-((pos - focus) ** 2) / 0.08)
    w = math.sin(u * math.pi) * fall
    pitch = amp * w
    yaw = math.sin(u * math.pi * 3 - i * 0.5) * amp * 0.12 * w
    return pitch, yaw, 0.0


def roar_fn(i, u, n):
    t = i / max(1, n - 1)
    head = math.exp(-(t ** 2) / 0.15)
    w = math.sin(u * math.pi)
    pitch = 0.25 * w * head
    yaw = math.sin(u * math.pi * 4) * 0.12 * head
    # body residual S
    phase = u * math.pi * 2 - i * 0.4
    yaw += math.sin(phase) * 0.08 * (1 - head)
    return pitch, yaw, 0.0


def flinch_fn(i, u, n):
    t = i / max(1, n - 1)
    w = math.sin(min(1.0, u * 1.8) * math.pi)
    pitch = -0.35 * w * math.exp(-t * 1.2)
    yaw = math.sin(u * math.pi * 5 - i) * 0.2 * w
    return pitch, yaw, 0.0


def poke_fn(i, u, n):
    t = i / max(1, n - 1)
    head = math.exp(-(t ** 2) / 0.12)
    w = math.sin(u * math.pi)
    pitch = 0.4 * w * head
    yaw = math.sin(u * math.pi * 2) * 0.1 * head
    return pitch, yaw, 0.0


# ── run ──────────────────────────────────────────────────────────────────
clear()
import_gltf(LEVI)
arm = find_arm()
arm.name = "Sladania"

snake = [n for n in SNAKE if n in arm.pose.bones]
print("SNAKE", len(snake), snake)

for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"

# rest
if arm.animation_data is None:
    arm.animation_data_create()
arm.animation_data.action = None
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
rest = {b.name: b.matrix_basis.to_quaternion().copy() for b in arm.pose.bones}

bpy.context.scene.render.fps = FPS

specs = [
    # name, frames, fn — lag scaled for 15-joint full chain
    ("swim_idle", int(8.4 * FPS), lambda i, u, n: swim_s(i, u, n, amp=0.30, waves=2.0, lag=0.38)),
    ("swim", int(8.4 * FPS), lambda i, u, n: swim_s(i, u, n, amp=0.44, waves=2.5, lag=0.42)),
    ("dive", int(2.7 * FPS), lambda i, u, n: dive_follow(i, u, n, amp=0.62, lag=0.07)),
    ("emerge", int(3.5 * FPS), lambda i, u, n: emerge_follow(i, u, n, amp=0.55, lag=0.07)),
    ("tail_whip", int(2.5 * FPS), lambda i, u, n: tail_whip(i, u, n, amp=0.78)),
    ("breach", int(1.1 * FPS), lambda i, u, n: breach_region(i, u, n, focus=0.12, amp=0.7)),
    ("breach_mid", int(1.1 * FPS), lambda i, u, n: breach_region(i, u, n, focus=0.50, amp=0.65)),
    ("breach_tail", int(1.1 * FPS), lambda i, u, n: breach_region(i, u, n, focus=0.88, amp=0.72)),
    ("roar", int(3.4 * FPS), roar_fn),
    ("flinch", int(2.5 * FPS), flinch_fn),
    ("poke_out", int(2.1 * FPS), poke_fn),
]

baked = []
for name, frames, fn in specs:
    print("BAKE", name, "frames", frames)
    bake_clip(arm, snake, rest, name, frames, fn)
    baked.append({"clip": name, "frames": frames, "dur_s": frames / FPS})
    print("  done", name)

# keep stock attack clips if still on armature actions from import
keep = {b["clip"] for b in baked}
for a in list(bpy.data.actions):
    if a.name in keep or a.name.startswith("idle") or a.name.startswith("attack"):
        continue
    # drop junk
    if "IW_" in a.name or "Object_" in a.name:
        bpy.data.actions.remove(a)

if arm.animation_data:
    arm.animation_data.action = None

bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for o in bpy.data.objects:
    if o.type == "MESH" and o.find_armature() == arm:
        o.select_set(True)
    if o.parent == arm:
        o.select_set(True)
bpy.context.view_layer.objects.active = arm

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_nla_strips=False,
    export_force_sampling=True,
    export_apply=False,
    export_yup=True,
)
print("WROTE", OUT_GLB, os.path.getsize(OUT_GLB))

# measure bind chain length for map
mw = arm.matrix_world
chain_len = 0.0
seg = []
prev_name = None
prev = None
for n in snake:
    b = arm.data.bones.get(n)
    if not b:
        continue
    p = mw @ b.head_local
    if prev is not None and prev_name is not None:
        d = (p - prev).length
        chain_len += d
        seg.append({"from_to": f"{prev_name}->{n}", "len": round(d, 4)})
    prev_name = n
    prev = p

with open(OUT_MAP, "w", encoding="utf8") as f:
    json.dump(
        {
            "version": 7,
            "method": "full-length authored S motion on measured levi chain",
            "snake": snake,
            "chain_length_model_units": round(chain_len, 4),
            "segments": seg,
            "baked": baked,
            "note": (
                "v7 fixes bone ORDER: head→dou_5..8→dou_9..12→dou_13..17 tip. "
                "v6 jumped head→tip then back to mid (front-half look). "
                "Ice worm not retargeted (scale/axes mismatch)."
            ),
            "lab": "/cinema/sladania-skeleton-lab.html",
        },
        f,
        indent=2,
    )

with open(OUT_README, "w", encoding="utf8") as f:
    f.write(
        "# Sladania v7 — full-length animal S motion\n\n"
        f"- **Chain**: {' → '.join(snake)}\n"
        f"- **Measured length**: {chain_len:.3f} model units (bind)\n"
        "- **swim / swim_idle**: lateral S-wave, phase lag head→tip on ALL mid+rear bones\n"
        "- **dive / emerge**: traveling pitch head→tip\n"
        "- **tail_whip**: rear half of full chain\n"
        "- Lab: `/cinema/sladania-skeleton-lab.html` — LMB drag head, joints follow\n"
        "- No ice-worm retarget (13k× mesh scale / collapsed rest spine)\n"
    )

print("BAKED", len(baked), "chain_len", round(chain_len, 4))
for b in baked:
    print(" ", b["clip"], b["dur_s"])
print("DONE v7 full-length")
