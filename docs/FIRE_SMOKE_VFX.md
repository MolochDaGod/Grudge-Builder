# Fire & Smoke VFX

Inspired by [threejs-games smoke](https://threejs-games.github.io/examples/20-particles/smoke/) and [fire](https://threejs-games.github.io/examples/20-particles/fire/) particle demos, plus foot plant on dash (LegIK spirit).

## Module

| Path | Role |
|------|------|
| `client/src/island3d/vfx/FireSmokeParticles.ts` | Soft billboard emitters + presets |
| `client/src/island3d/vfx/WorldFxBus.ts` | Scene bus: boats, campfires, attacks, teleports, dash feet |
| `client/src/island3d/player/CharacterIK.ts` | `pulseDashFootIK()` on dash impact |

## Presets

| Id | Use |
|----|-----|
| `boat_fire` / `boat_smoke` | Damaged / sinking enemy boats |
| `campfire` | Camp fires / fireplaces |
| `attack_burst` | Combat combo / lunge impact sparks |
| `teleport_smoke` | Teleport depart + arrive |
| `dash_foot` | Dust/smoke at both feet on dash impact |
| `fire` / `smoke` | Generic continuous |

## Wiring

- **Enemy ships** — `setEnemyShipDamageState` attaches fire+smoke when `damaged` / `sunk`
- **Zone patrol boats** — hostile/pirate/legion markers get `attachBoatDamage`
- **Camps** — `camp_fire` upgrade spawns continuous campfire
- **Player** — attack burst, teleport smoke, dash foot smoke + foot IK pulse
- **Engine** — `worldFx.update(dt)` every frame

## Manual spawn

```ts
import { getWorldFxBus } from '@/island3d/vfx/WorldFxBus';

const bus = getWorldFxBus();
bus?.attackBurst(worldPos);
bus?.teleportSmoke(worldPos);
bus?.attachCampfire(campfireMesh);
bus?.attachBoatDamage(shipRoot, 'damaged');
bus?.dashFootSmoke(feetWorld, yaw);
```
