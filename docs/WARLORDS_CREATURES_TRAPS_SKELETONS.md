# Warlords — Creatures, Traps, Skeleton Corpses

**Updated:** 2026-07-20  
**Status:** staged locally · R2 keys documented · runtime wired in GrudgeBuilder + Danger Room animator

## Overview

This pack adds:

1. **Combat wildlife / elites** for islands, open world, and dungeons  
2. **Mobile-game obstacles** as buildable defenses, camp traps, and dungeon hazards  
3. **Skeletons_Free** residuals after **2 minutes dead** or **skin/loot**

CDN base: `https://assets.grudge-studio.com/`  
Local dev: same paths under `public/` with CDN fallback in loaders.

---

## 1. Creatures (land)

| Manifest ID | Local / CDN key | Role | Biomes (catalog) |
|-------------|-----------------|------|------------------|
| `free_reptile` | `models/creatures/land/free_reptile.glb` | land combat | forest, desert, beach, tropical, storm, ethereal |
| `drake` | `models/creatures/land/drake.glb` | elite | desert, volcanic, abyssal |
| `ifrit` | `models/creatures/land/ifrit.glb` | fire elite | volcanic |
| `lava_golem` | `models/creatures/land/lava_golem.glb` | brute elite | volcanic |
| `monsters_x` | `models/creatures/land/monsters_x_free.glb` | thorn beast | forest, ethereal, abyssal |
| `creature_crab` | `models/creatures/land/creature_crab.glb` | armored crab | beach, tropical, storm, abyssal |

**Code:** `client/src/island3d/creatures/CreatureManifest.ts`  
**Biomes:** `shared/definitions/biomeEcosystemCatalog.ts` + `published/biome-ecosystems.json`

Dungeon GLB kinds (Danger Room): `free_reptile`, `drake`, `ifrit`, `lava_golem`, `thorn_beast`, `armored_crab`  
→ `artifacts/animator/public/models/enemies/*` and CDN `models/enemies/*`

---

## 2. Obstacles / traps

| Piece ID | Multipack node | Use |
|----------|----------------|-----|
| `trap_spike` | `spike-obstacle_8` | build + camp + dungeon |
| `trap_spike_tall` | `spike-obstacle.002_11` | build + dungeon |
| `trap_cylinder` | `CylinderObstacle_6` | spin barrel |
| `trap_gear` | `gear-base_7` | gear crusher |
| `trap_bomb` | `Bomb_5` | one-shot mine |
| `trap_spike_base` | `SpikeBase_16` | floor plate |
| `trap_spiral` | `SpiralBase_15` | spin plate |
| `trap_grid` | `GridGround_4` | hazard grid |
| `defense_door` | `GroundDoor01_2` | hatch / plate |

**Pack:** `models/obstacles/mobile_game_obstacles.glb` (PBR-upgraded)  
**SSOT:** `shared/definitions/mobileGameObstacles.ts`  
**Build:** `BuildAssetManifest.ts` (defense)  
**Camps:** trap upgrades in `npcCamps.ts` + auto-seed on hostile camps  
**Dungeon:** `DungeonHazards.ts` seeds 10–16 surface + 4–7 pit traps per map seed

---

## 3. Skeleton corpses

| Asset | CDN key |
|-------|---------|
| Humanoid residual | `models/skeletons/Skeleton.glb` |
| Archer residual | `models/skeletons/Skeleton_Archer.glb` |
| Texture | `models/skeletons/Texture.png` |
| FBX fallback | `models/skeletons/Skeleton.fbx` / `Skeleton_Archer.fbx` |

**Flow**

1. Death → flesh corpse  
2. Skin/loot **or** 120s → lying skeleton residual  
3. Skeleton lingers ~90s → despawn / respawn  

| Surface | Skin trigger | Time trigger |
|---------|--------------|--------------|
| Warlords creatures | harvest mode + **skinning knife** (`trySkinNear`) | 120s |
| Danger Room wildlife | Key **N** butcher | 120s |
| Dungeon enemies / sparring | — | 120s |

**Code**

- GrudgeBuilder: `client/src/island3d/creatures/SkeletonCorpse.ts` + `CreatureManager`  
- Animator: `src/three/corpse/SkeletonCorpse.ts` + Wildlife / DungeonEnemies / Targets  

**Bake:** headless Blender (`_convert_skeletons.py`) → `grudge-convert glb2glb`  
See `public/models/skeletons/README.md`.

---

## Upload

```bash
# From GrudgeBuilder root (wrangler auth required)
node scripts/upload-session-warlords-assets-to-r2.mjs --dry-run
node scripts/upload-session-warlords-assets-to-r2.mjs
```

Verify:

```bash
curl -sI "https://assets.grudge-studio.com/models/skeletons/Skeleton.glb" | head -n 5
curl -sI "https://assets.grudge-studio.com/models/obstacles/mobile_game_obstacles.glb" | head -n 5
curl -sI "https://assets.grudge-studio.com/models/creatures/land/drake.glb" | head -n 5
```

---

## Smoke checklist

- [ ] Island volcanic biome spawns ifrit / lava_golem / drake  
- [ ] Coastal biome spawns armored crab  
- [ ] Kill creature → 2 min → skeleton residual  
- [ ] Skinning knife on corpse → loot toast + skeleton  
- [ ] Danger Room enter dungeon → traps on floor  
- [ ] Kill dungeon enemy → skeleton after 2 min  
- [ ] Wildlife N butcher → skeleton  
- [ ] Build panel lists trap_* defense pieces  
- [ ] Hostile camp has perimeter traps  

---

## Related files

| Area | Path |
|------|------|
| Manifest | `client/src/island3d/creatures/CreatureManifest.ts` |
| Manager | `client/src/island3d/creatures/CreatureManager.ts` |
| Build | `client/src/island3d/building/BuildAssetManifest.ts` |
| Camps | `shared/definitions/npcCamps.ts`, `camps/NpcCampSystem.ts` |
| Biomes | `shared/definitions/biomeEcosystemCatalog.ts` |
| Dungeon hazards | `threejs-rapier…/dungeon/DungeonHazards.ts` |
| Catalog | `threejs-rapier…/game/dangerRoomGameCatalog.ts` |
