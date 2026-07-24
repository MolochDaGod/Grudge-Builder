# CodePen particle FX (smoke / barrel / trail / steam)

**Source pen:** https://codepen.io/MolochDaGod/pen/KwaNNap  
**Title:** Three.js smoke, fire, trace, steam  

## What we pulled in

| Pen system | Fleet API | Use |
|------------|-----------|-----|
| Smoke emitters (cone `radius_1`→`radius_2`, wind, color lerp, scale growth) | `WorldFxBus.smokePlume` / `spawnCodepen('smoke_column')` | campfires, wrecks, vents |
| Fire plume | `spawnCodepen('fire_plume')` | damaged hulls, braziers |
| Steam | `WorldFxBus.steamVent` | kettles, pipes, geysers |
| Trace / trail quads | `WorldFxBus.spawnTrail` | slash streaks, dash ribbons |
| Barrel / muzzle (tight throat, bright→dark) | `WorldFxBus.barrelMuzzle` | ship cannons, guns |

## Code

| File | Role |
|------|------|
| `client/src/island3d/vfx/CodepenParticleFx.ts` | Emitter + trail port |
| `client/src/island3d/vfx/WorldFxBus.ts` | Scene bus API |
| `client/src/game/dock/ShipBoardingController.ts` | Cannon → `barrelMuzzle` |
| `client/src/island3d/combat/ProductionSkillCombatRuntime.ts` | Dash trail ribbon |

## Usage

```ts
import { getWorldFxBus } from '@/island3d/vfx/WorldFxBus';

const bus = getWorldFxBus();
if (!bus) return;

// Continuous smoke column
bus.smokePlume(worldPos, { intensity: 'heavy' });

// Cannon
bus.barrelMuzzle(muzzleWorld, barrelForwardDir);

// Slash / projectile trail
bus.spawnTrail(origin, direction, { length: 1.4, life: 0.25, color: 0xffaa66 });

// Steam
bus.steamVent(pipeObject, { localOffset: new THREE.Vector3(0, 0.3, 0) });
```

## Consistency rules

1. Prefer **WorldFxBus** CodePen presets for plumes/barrels/trails — not ad-hoc Points.
2. Soft procedural textures (no CodePen base64 CDN deps) so R2-less deploys work.
3. `update(dt)` already runs on the bus each frame — no extra loop needed.
4. Keep supernova impacts for skill hits; layer CodePen smoke as support VFX.

## Pen → preset map

| Pen demo stack (left→right) | Preset id |
|-----------------------------|-----------|
| Bright fire | `fire_plume` |
| Dark smoke | `smoke_column` |
| Thin white | `steam` |
| Wide haze | `ambient_haze` |
| Moving fire (emitter 4) | attach + animate position yourself |
| Cannon (new) | `barrel_muzzle` + `barrel_smoke` |
| Trace beams | `spawnTrail` / `trail_sparks` |
