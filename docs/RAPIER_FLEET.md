# Rapier fleet SSOT — grudgewarlords.com / Island3D

**Official JS 3D API:** https://rapier.rs/docs/api/javascript/JavaScript3D  
**Skill:** `grudge-rapier` (`~/.agents/skills/grudge-rapier/SKILL.md`)

## Code

| Piece | Path |
|-------|------|
| Island3D world | `client/src/island3d/physics/PhysicsWorld.ts` |
| Fleet presets | `client/src/island3d/physics/fleet/*` |
| Pinata harvest / debris | `PhysicsWorld.addDynamicFragment` + optional `@dgreenheck/three-pinata` |
| Sectional damage (hide chunk) | `client/src/island3d/damage/SectionalDamageSystem.ts` |
| Hammer repair (RMB→LMB, 1 wood) | `client/src/island3d/damage/BuildHammerRepair.ts` |
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

## Rules

- Fixed **1/60** step, SI meters, density > 0 on dynamics  
- CCT kinematic + `setNextKinematicTranslation`  
- Trimesh **fixed only**  
- Events: `EventQueue(true)` + `ActiveEvents` on colliders  
- Debug: `?physicsDebug=1` only  

## AI workers

Physics is client WASM. Deploy AI gateway for agent tooling:

```bash
cd workers/ai && npx wrangler deploy
# CORS already allows grudgewarlords.com
```

Agents generating island physics must load **grudge-rapier** skill.
