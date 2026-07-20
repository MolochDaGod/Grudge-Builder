# Caves & respawnable dungeons

## Assets

| Prefab | File | Access |
|--------|------|--------|
| Twin Mouth | `models/caves/2cave.glb` | mouth_a, mouth_b |
| Lethal Ape Redux | `models/caves/old_cave_lethal_ape_redux.glb` | mouth_main |

Local source (dev): `C:\Users\nugye\Documents\*.glb` → copy to `public/models/caves/`  
Production: `assets.grudge-studio.com/models/caves/` (gitignored from repo due to size)

## Rules

1. **Access point** — every cave has ≥1 mouth (enter/exit radius).
2. **Navmesh** — `bakeCaveNavmesh` samples floor meshes on a grid.
3. **Water exclusion** — interior sets `physics.waterLevel = -1e6` and `caveInteriorActive`; ocean never treats cave as swim volume even if world Y &lt; 0. Meshes tagged `suppressWater`.
4. **On-island** — `CaveInteriorSystem.placeCaveOnIsland`
5. **Respawn dungeon** — `cave_lethal_ape` default `respawnMs` 4h

## Code

- `shared/definitions/caveDungeonContract.ts`
- `client/src/island3d/dungeon/CaveInteriorSystem.ts`
- `CavePortal3D` prefers 2cave / lethal ape GLBs
- Engine seeds 1–2 caves on zone islands; **E** enter/exit via `tryInteract`
