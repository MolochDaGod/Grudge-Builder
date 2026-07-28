# Heroes seaside cinema (`/heroes`) — PRODUCTION

**Status:** Production roster cinema on `client.grudge-studio.com/heroes` (2026-07).  
**Purged:** painted airship plate (`scene_airship.png`) / `HeroesBlackTideScene`.

**SSOT scene:** Full Three.js sector shelf — seaside treasure cave + islands on deep ocean.  
**Code:** `client/src/components/heroes/HeroesSeasideCinemaScene.tsx`  
**Sanitize:** `client/src/components/heroes/sanitizeSeasideGltf.ts`  
**Small craft:** `client/src/game/sailing/SmallCraftRowSystem.ts`  
**Landmarks:** `shared/definitions/sectorSeasideLandmarks.ts`  
**Page:** `client/src/pages/heroes.tsx`  
**Era:** **warlords only** (4 grudge6 slots) — no voxel merge

## Assets

| Path | Role |
|------|------|
| `/sector-assets/seaside/seaside_treasure_cave.glb` | Cave + capture shelf |
| `/sector-assets/seaside/sector_islands.glb` | Companion islands + **barca** boat |
| Global ocean plane | Procedural `DeepOcean` at sector `waterLevel − 8` |

### Mesh sanitize (required)

On load we **remove** person / futuristic / global-water meshes so the scene does not fight fleet water/characters:

| Strip | Keep |
|-------|------|
| `Man*`, `Hat`, `dude.*` | Rock, palm, sand, props |
| `Water`, `Acqua*` (ocean planes) | Stone water pillars (architecture) |
| Sci-fi / futuristic planes | **barca** (takeable dinghy) |

`sanitizeSeasideGltf` extracts `barca*` into a `TakeableBarca` group with `userData.takeableBoat`.

## Row lesson chain (no main ship)

Players learn oar technique on **small craft only** — no warship boarding required:

| Tier | Craft | How it appears | Lesson |
|------|-------|----------------|--------|
| 1 | **Raft** | Procedural near cave shore | Push oar with W, feel drag, A/D turn |
| 2 | **Dinghy (barca)** | Scene boat from islands GLB | Dual-oar rhythm, Space to feather/rest |
| 3 | **Fishing boat** | Procedural at island shallows | Oar to shallows, **F** cast, fish islands |

### Controls

| Key | Action |
|-----|--------|
| **E** | Board / leave nearest craft |
| **W/S** | Stroke forward / reverse (oar cycle) |
| **A/D** | Yaw / sweep |
| **Space** | Rest stroke / feather |
| **F** | Cast line (fishing boat only, near island fish spots) |

Camera follows while boarded. Selected crew root lerps onto the hull.

## Capture zone

Cylinder under the cave mouth (`CAPTURE_ZONE`) — conquerable visual + raycast volume. Once per sector via `seasideLandmarkForSector`.

## Modules

| File | Role |
|------|------|
| `sanitizeSeasideGltf.ts` | Strip people/water/futuristic; extract barca |
| `SmallCraftRowSystem.ts` | Oar physics, tiers, fishing cast, lesson progress |
| `sectorSeasideLandmarks.ts` | Asset URLs, waterLevel, capture SSOT |

## Relation to fleet sailing

- Main ship boarding remains `BoatBoardingSystem` / `ShipBoardingController`.
- Small craft is the **training + island fishing** path without launching the warship.
- Same oar feel is intended for raft → barca → fishing boat in open play.
