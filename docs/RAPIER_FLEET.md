# Rapier fleet SSOT — grudgewarlords.com / Island3D

**Official JS 3D API:** https://rapier.rs/docs/api/javascript/JavaScript3D  
**Skill:** `grudge-rapier` (`~/.agents/skills/grudge-rapier/SKILL.md`)

## Code

| Piece | Path |
|-------|------|
| Island3D world | `client/src/island3d/physics/PhysicsWorld.ts` |
| Fleet presets | `client/src/island3d/physics/fleet/*` |
| Pinata harvest | `PhysicsWorld.addDynamicFragment` + `PinataHarvestBreak` |
| Package | `@dimforge/rapier3d-compat@^0.19.3` |

## Deploy surfaces

| Domain | Host | Physics |
|--------|------|---------|
| **grudgewarlords.com** | Vercel (`vercel.json` alias) | Island3D PhysicsWorld |
| client.grudge-studio.com | same project | same |
| Mine-Loader | separate monorepo | WorldPhysics + same presets |

## Quick API

```ts
import { PhysicsWorld } from "@/island3d/physics/PhysicsWorld";
import { RAPIER_FLEET, HUMAN_CCT } from "@/island3d/physics/fleet";

const phys = await PhysicsWorld.create({ gravity: RAPIER_FLEET.gravityY });
// terrain trimesh, CCT capsule, dynamic fragments, raycast, snapshot…
const bytes = phys.takeSnapshot();
phys.restoreSnapshot(bytes); // same Rapier version required
```

## Load-gate (all Warlords scenes)

Player entry is **blocked** until terrain walkable + a dry ground sample exist.

| Stage | What happens |
|-------|----------------|
| `rest` | `yieldToBrowser()` so the tab can paint the loadscreen / decode WASM |
| `assets` | Meshopt + Rapier `PhysicsWorld.create()` |
| `terrain` | Island / lobby / zone meshes in the scene |
| `physics` | BVH walk collider (`LobbyColliderSystem`) + Rapier spawn pad + optional trimesh |
| `player` | `CharacterController3D` planted; `entryLocked` until snap |
| `ready` | Host may `start()` and hide `WarlordsPvpLoadscreen` |

Code: `client/src/island3d/physics/sceneLoadGate.ts`  
Hosts: `play.tsx` · `Island3DRenderer` · lobby · zone · home island

**Do not** `engine.start()` + hide the canvas on `init()` failure — that starts gravity against missing ground (fall-through + hitch).

| Layer | Role |
|-------|------|
| BVH `sampleHeight` | Per-frame feet / foot IK (not the whole `zoneScene.root`) |
| Rapier `PhysicsWorld` | Spawn pad + trimesh (≤ 80k tris) + harvest fragments |
| `entryLocked` | No gravity until the gate unlocks |

Large sectors (ethereal_falls, 10–14 km): first physics layer is **meshes near spawn** (`PHYSICS_NEAR_SPAWN_M`), not every island.

## Rules

- Fixed **1/60** step, SI meters, density > 0 on dynamics  
- CCT kinematic + `setNextKinematicTranslation`  
- Trimesh **fixed only**  
- Events: `EventQueue(true)` + `ActiveEvents` on colliders  
- Debug: `?physicsDebug=1` only  
- **No player entry** until `isPhysicsReadyForEntry` (walkable + finite ground Y above water)  

## AI workers

Physics is client WASM. Deploy AI gateway for agent tooling:

```bash
cd workers/ai && npx wrangler deploy
# CORS already allows grudgewarlords.com
```

Agents generating island physics must load **grudge-rapier** skill.
