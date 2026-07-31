# Ember Spire — volcanic infinite climb

**Reference:** [threejs-games Random boxes](https://threejs-games.github.io/examples/80-scenes/random-boxes/)

| Layer | Path |
|-------|------|
| **SSOT config / loot / layout** | `shared/definitions/volcanicClimb.ts` |
| **BC re-export** | `shared/definitions/floatingIslandBossAssets.ts` |
| **Runtime tower** | `client/src/island3d/zone/VolcanicClimbIslandSystem.ts` |
| **E-key priority** | `client/src/island3d/zone/zoneInteract.ts` |
| **Jump presets** | `client/src/island3d/physics/PlatformerJump.ts` → `resolvePlatformerJumpForSector` |
| **Launcher card** | `shared/fleet/gameDeployments.ts` → `ember-spire` / `THREE_EMBER_SPIRE_PATH` |
| **Jump docs** | `docs/PLATFORMER_JUMP.md` |

## Ownership matrix (no double-duty)

| System | Host sectors | Role |
|--------|--------------|------|
| **VolcanicClimbIslandSystem** | `ember_depths` (primary), `ashen_wastes` (**XZ offset**) | Infinite climb + summit chests |
| **EtherealFloatingIslandSystem** | `ethereal_falls` only | Lyoko orbit décor (not climb) |
| **EventIslandSystem** (spiral) | thornwood, haven, **ashen** | Sink/raise event plate |
| Spiral GLB on climb | climb summit/event pads only | **Mesh reuse** + volcanic tint — not EventIsland |

**Conflict rule:** on `ashen_wastes`, climb origin is offset NE (`originOffsetBySector`) so spiral event islands keep their spawn arc.

## Assets (CDN)

| Piece | Key |
|-------|-----|
| Rock shelves | `models/nature/stylized/rocks/volcanic_rocks.glb` |
| Nature pads | `models/nature/stylized/biome/volcanicnature.glb` |
| Island shelves | Lyoko mountain sector (volcanic tint) |
| Large / summit | Spiral mountain reimagined (skybox stripped) |
| Summit chest | Procedural gold chest + tiered loot table |

## Play

```
/play?sector=ember_depths&mode=zone&worldSeed=grudge-world-1&feature=ember_spire
/play?sector=ashen_wastes&mode=zone&worldSeed=grudge-world-1&feature=ember_spire
```

Launcher home card: **Ember Spire Climb** (`id: ember-spire`).

## Controls

| Input | Effect |
|-------|--------|
| WASD | Move |
| Space hold | Variable-height FLY_JUMP |
| E near chest | Open summit cache (loot grants) |

## Runtime rules

- Live window ~28 floors; floor step 7.5 m  
- Summit every 12 floors; event pad every 6  
- Loot: `rollSummitChestLoot(floor)` — deterministic tiers  
- Walk disks carry `userData.collider` proxy for future Rapier static bodies  
- Ground: `makeGroundSampler(islandMeshes)` — climb first, terrain fallback  

## Events

```js
window.addEventListener('grudge:volcanic-climb', (e) => {
  // { type: 'chest', floor, grants: [{ itemId, name, qty }] }
  // { type: 'event', floor, pos }
  // { type: 'prompt', prompt }
});
```

## Organization rules (agents)

1. **Config / loot / layout** → only `volcanicClimb.ts`  
2. **Jump by sector** → only `resolvePlatformerJumpForSector`  
3. **E interact** → only `resolveZoneInteract`  
4. **Do not** spawn Ethereal float stacks outside ethereal_falls  
5. **Do not** treat climb spiral clones as EventIsland instances  
