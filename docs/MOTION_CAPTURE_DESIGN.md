# Motion Capture · Combos · Rigid-Body Safe Deploy

**Version:** 1.0.0  
**Pipeline:** 2–10s screen recording / motion watch → AI reconstruct → validate → AnimationClip → redeploy

## Goals

1. **Real motion** — recreate what was watched (screen recording or reference), not a frozen T-pose  
2. **Rigid body + mesh intact** — rotation-only bones, Y-hip lock, no skin tears, CCT owns world XZ  
3. **Combos** — multi-hit chains with link windows and fleet clip keys  
4. **AI deploy** — reconstruct, bake shape, play on character, redeploy updated take  

## Architecture

```
Screen recording (2–10s)
   │  description + optional pose keyframes
   ▼
POST anim-ai-worker /mocap/reconstruct
   │  AI (or template) → Mixamo pose frames
   │  sanitize: quats, drop position tracks, Y lock
   ▼
ReconstructedMotion + MotionDeployManifest
   │
   ├─► MotionDeployService.toAnimationClip() → THREE.AnimationClip
   ├─► mixer.clipAction().play()  (one mixer / SkeletonUtils instance)
   └─► toBakeJson() → /anims/baked/{pack}/{key}.json → CDN redeploy
```

## Rigid-body / mesh rules (non-negotiable)

| Rule | Why |
|------|-----|
| **Rotation-only bone tracks** | Position on bones stretches / breaks skinned mesh |
| **Y-hip lock** | Pelvis.y as feet → floating giant / sink |
| **Root XZ = controller** | CCT / kinematic player owns world motion |
| **SkeletonUtils.clone** | `Object3D.clone` leaves bones on source → T-pose |
| **One mixer per instance** | Shared mixer freezes / teleports clones |
| **Re-ground after sample** | Bind pose vs first frame bbox change |
| **Angular step clamp** | Instant 180° quat flips tear shoulders |
| **Human 1.8 m fit first** | Scale after anim = 100× bugs |

Policy SSOT: `shared/animation/mocap/types.ts` → `DEFAULT_RIGID_BODY_ANIM_POLICY`

## Definitions

| Module | Role |
|--------|------|
| `shared/animation/mocap/types.ts` | Brief, combo, deploy, validation types |
| `shared/animation/mocap/skeletons.ts` | Mixamo / Bip001 bone lists + retarget map |
| `shared/animation/mocap/rigidBodyGuard.ts` | Sanitize + step limit |
| `shared/animation/mocap/comboDefs.ts` | Samurai cleave, 3-hit melee, mocap dual slash |
| `shared/animation/mocap/reconstruct.ts` | Local reconstruct + track dump |
| `client/.../MotionDeployService.ts` | Worker + play + bake export |
| `workers/anim-ai-worker` | `/mocap/reconstruct` `/mocap/validate` `/combo/compile` |

## Video watch → track → mirror → save (primary UX)

**Production (Cloudflare):** https://anim.grudge-studio.com  
**Warlords mirror:** `/video-mocap` or `/mocap`

```
Video file / webcam record
  → MediaPipe PoseLandmarker (browser)
  → landmarks → mixamorig quats (optional L/R mirror)
  → rigid-body sanitize
  → THREE.AnimationClip preview
  → Save library (localStorage) + Download bake JSON
```

```ts
const motion = await getMotionDeployService().fromRecordedVideo(file, {
  sampleFps: 12,
  mirror: true, // selfie / facing camera
  maxDurationSec: 10,
  onProgress: (p) => console.log(p),
});

// Play on any character mixer
svc.play(motion, { mixer });

// Save / export
import { saveMocapClip, downloadMocapJson } from "@/lib/animation/videoMocap";
saveMocapClip(motion, { name: "my_combo", sourceFileName: file.name });
downloadMocapJson(motion, "my_combo.json");
```

Code: `client/src/lib/animation/videoMocap/*` · page `client/src/pages/video-mocap.tsx`

## NL / description brief (no video)

```ts
await getMotionDeployService().fromScreenRecording({
  description:
    "Warrior two-hit sword combo: windup right slash, recover, heavy left finisher",
  durationSec: 4.5,
  intent: "combo",
  skeleton: "mixamorig",
  fleetClipKey: "mocap_warrior_combo_01",
});
```

Optional: pass `poses[]` extracted client-side (vision / manual) for higher fidelity.

## Combos

```ts
import { COMBO_GS_SAMURAI_CLEAVE, resolveComboStep } from "@shared/animation/mocap";

// Runtime chain
const { nextIndex, finished } = resolveComboStep(combo, chainIndex, t, inputQueued);
```

Combat-map alignment: `greatsword_samurai/combat-map.json` slot 1 = two clips.

## API (anim-ai-worker v2.2)

```http
POST https://anim-ai-worker.grudge-studio.com/mocap/reconstruct
# or https://anim-ai-worker.grudge.workers.dev/mocap/reconstruct

{
  "brief": {
    "kind": "screen_recording",
    "description": "Quick dodge roll to the left then stand",
    "durationSec": 3,
    "intent": "dodge"
  },
  "target": {
    "skeleton": "mixamorig",
    "slot": "dodge",
    "fleetClipKey": "mocap_dodge_L",
    "animPack": "mocap"
  }
}
```

```http
POST /mocap/validate   { "clip": { "frames": [...] } }
POST /combo/compile    { "id": "my_combo", "motionIds": ["a","b"] }
```

## Redeploy pass

```ts
const svc = getMotionDeployService();
const first = await svc.fromScreenRecording({ description: "...", durationSec: 5, intent: "attack" });
// review in animator / island
const again = await svc.redeploy(first, {
  brief: { kind: "screen_recording", description: "Same attack, snappier recovery", durationSec: 4.2, intent: "attack" },
  target: { skeleton: "mixamorig", slot: "attack", fleetClipKey: first.id + "_v2" },
}, { mixer, fade: 0.12 });
// again.manifest.redeployOf === first.id
// bake: svc.toBakeJson(again.motion)
```

## Design review checklist

- [ ] Duration 2–10s for mocap pipeline  
- [ ] Intent classified (attack/combo/loco/dodge/cast)  
- [ ] No bone position tracks  
- [ ] Quats normalized; angular steps softened  
- [ ] Hips present; Y root locked  
- [ ] Fleet key named `{pack}_{role}` not raw vendor  
- [ ] Combo link windows set  
- [ ] Instance has own mixer + SkeletonUtils clone  
- [ ] Manifest status `validated` → `live` after play  

## Related

- [MODELS_AND_RETARGET_BEST_PRACTICES.md](./MODELS_AND_RETARGET_BEST_PRACTICES.md)  
- [ANIMATOR_AI_WORKER.md](./ANIMATOR_AI_WORKER.md)  
- [ANIMATIONS.md](./ANIMATIONS.md)  
