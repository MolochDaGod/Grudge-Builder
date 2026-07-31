# Pinata home-island harvest (ore / rock / trees)

Real-physics break for home-island harvestables using
[`@dgreenheck/three-pinata`](https://github.com/dgreenheck/three-pinata).

**Trees** use a **firewood-style** flow (not pure HP spam) — see
[`docs/FIREWOOD_CHOP.md`](../../../docs/FIREWOOD_CHOP.md) and
[screen.toys/firewood](https://screen.toys/firewood/).

## Pipeline

```
R-radial tool (axe / pickaxe / knife)
        │
        ▼
 handleClick ray → node group
        │
        ▼
 TREE (axe) → FirewoodChopSystem
   · base notch at correct angle/height
   · directed fall
   · ground log segments + pinata splits
   · walk-near collectibles
        │
 ROCK/ORE → HarvestNodeRecognition + HP/chip
        │
        ▼
 PinataHarvestBreakSystem.breakNode
   · chip  = partial Voronoi (impact-biased)
   · shatter = full break on HP ≤ 0 / segment done
   · manifold proxy (icosphere / trunk cylinder / octahedron)
        │
        ▼
 fragments → Rapier dynamic (if attachHarvestPhysics) else kinematic bounce
 loot → collectibles / emitHarvestDrops / stump after full split
```

## Files

| File | Role |
|------|------|
| `HarvestNodeRecognition.ts` | Smart node class + tool gates |
| `PinataHarvestBreak.ts` | three-pinata fracture + fragment sim |
| `PhysicsWorld.addDynamicFragment` | Rapier convex hull debris |
| `Island3DEngine` | wire hit path + `attachHarvestPhysics` |

## Tool SSOT (radial)

| Node | Tool |
|------|------|
| Tree | Hatchet (`axe`) |
| Rock / ore / crystal | Pickaxe |
| Fiber / flower | Knife |
| Scrap | Pickaxe or hammer |

## Performance

- Fragment counts: chip 5–8, shatter 12–22 (pinata sweet spot 10–50)
- Live fragment cap ~120; auto-despawn 3–6 s with fade
- Network: damage + drops only — never serialize shard meshes

## Optional Rapier

```ts
const physics = await PhysicsWorld.create({ gravity: -30 });
physics.addTerrainCollider(terrainMesh);
engine.attachHarvestPhysics(physics);
// each frame: physics.update(dt)
```
