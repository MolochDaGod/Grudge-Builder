# Spiritual Swords — color pack VFX

FreeSwords (Blink LowPoly) textures, **organized by color**, used as magical combat FX — not only equip meshes.

## Colors (deployable)

| Color | FreeSword | School | Paths |
|-------|-----------|--------|-------|
| **blue** | Sword6 | frost / ice / water | `/models/vfx/spiritual-swords/blue/` |
| **green** | Sword7 | nature | `/models/vfx/spiritual-swords/green/` |
| **white** | Sword8 | holy / spirit | `/models/vfx/spiritual-swords/white/` |
| **lava** | Sword15 | fire | `/models/vfx/spiritual-swords/lava/` |

Each folder: `albedo.png` + `emission.png` (lean deploy; full normal/metallic stay in Unity source pack).

## Modes

| Mode | Use |
|------|-----|
| `projectile` | Ranged spiritual blade → target |
| `aura` | Orbit ring around caster |
| `spin` | Quick multi-blade magic spin slash |
| `fall` | Multi rain with **gravity + plant** (fixed fall) |
| `block` | Fan of blades in front of caster |
| `stack_player` | **1 small sword per stack**, orbiting player |
| `stack_enemy` | **1 small sword per stack**, over enemy head |

## Code

- Catalog: `shared/definitions/spiritualSwords.ts`
- Runtime: `client/src/island3d/vfx/SpiritualSwordSystem.ts`
- Wired: `ProductionSkillCombatRuntime` uses spiritual projectiles for elemental/holy magic (not arrows/bullets)

```ts
const ss = combatRuntime.getSpiritualSwords();
ss?.fireProjectile(from, to, { color: 'lava' });
ss?.rainFall(center, { color: 'blue', count: 8 });
ss?.spinSlash(playerRoot, { color: 'white', count: 4 });
ss?.spawn({ mode: 'block', attachTo: player, yaw, color: 'green' });
ss?.setStacksOnPlayer(id, playerRoot, 3, 'lava');
ss?.setStacksOnEnemy(enemyId, enemyRoot, 5, 'blue');
```

## Stacks

- Max **8** stacks.
- Player: radius ~1.15 m, height ~1.15 m, rotate continuously.
- Enemy: hover ~2.15 m above root, spread by stack count.
- Setting stacks to N rebuilds exactly N blades (add/remove one per stack).

## Fall fix

Previous “sword fall” snaps are replaced by:

1. Spawn high (8–12 m + stagger)
2. `velocityY` gravity (−28 m/s²)
3. Spin while falling
4. Plant tip-into-ground when `y ≤ ground + 0.45`
5. Hold 1.2 s → fade 0.5 s → dispose

## Mesh note

FreeSwords Unity pack on disk had **textures only** (no FBX). Runtime builds a procedural SI blade (~0.95 m) and binds color albedo/emission. When a production GLB per color is baked, set `meshPath` on the color def and load via `SharedGltfPipeline`.

## Source (Unity)

`Desktop/FRESH GRUDGE/Assets/Blink NEW TEXTURE NEW WEP/.../FreeSwords/{Sword6,7,8,15}/Textures/`
