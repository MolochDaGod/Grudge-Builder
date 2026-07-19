# Map Scene Composition — Our Creation, Chunkable Assets

**SSOT:** `shared/definitions/mapSceneComposition.ts`  
**Runtime:** `client/src/island3d/map/MapChunkClassifier.ts` + `MapCompositionLoader.ts`  
**Version:** 1.0.0

## Principle

Maps are **our creation**, not a black-box monome.

Every placeable is a **chunk**:

| Field | Meaning |
|-------|---------|
| `chunkId` | Stable id |
| `kind` | house, wall, door, roof, tree, rock, rock_formation, dock, tent, flower, plant, boat, chest, npc, vendor, captain, enemy, animal, ocean_animal, weather, … |
| `layer` | ocean_floor → ocean → island_base → structure → nature → living → vehicle → vfx |
| `source` | gltf_mesh · multipack_node · cdn_glb · procedural · agent · height_param |
| `chunkable` | Can stream / unload independently |
| `interact` | harvest, vendor, boardable, combat, openable |

Even the Chicken Gun `pirate-islands` GLTF is **classified** on load: every mesh gets `userData.grudgeChunk`.

## Asset classes (what you asked for)

| Category | Kinds | Sources |
|----------|--------|---------|
| **Structure** | house, wall, door, roof, window, floor, foundation, dock, fence, tower | survival kit, fantasy village multipack, dock.glb |
| **Nature** | tree, rock, rock_formation, boulder, pebble, plant, flower, bush, grass, mushroom | `natureAssetCatalog` battle pack |
| **Camp / prop** | tent, campfire, chest, barrel, crate | survival kit nodes |
| **Island / water** | island, ocean, ocean_floor, water_height, ocean_floor_height, beach | composition.water + createOceanMesh |
| **Living** | npc, vendor, captain, traveler, bandit, enemy, guard, animal, ocean_animal, monster | Grudge6, ummorpgDeployables, CreatureManager |
| **Vehicles** | boat, ship, mount, siege | shipCatalog + uMMORPG vehicles |
| **Weather** | weather, cloud, fog | composition.weather + DayNightCycle |

## Heights (authoritative)

```ts
// grudge-open-world / pirate hub
waterLevel: 0
oceanFloorLevel: -24
```

Stored on ocean mesh `userData.waterLevel` / `oceanFloorLevel`.  
Sector maps use `sector.terrain3d.waterLevel` / `minHeight` via `compositionForSector()`.

## Production map: grudge-open-world

`GRUDGE_OPEN_WORLD_COMPOSITION` includes:

1. Base GLTF → **every mesh is a prefab** (`MeshPrefabRegistry`)  
2. **TI-quality ocean** (`PirateLobbyOcean`) — calm under piers/decks → shallow beach foam → mid → deep/abyss falloff **without wrecking shore angles**  
3. Sand/beach meshes **height-adjustable** with shovel (2 m brush)  
4. Overlay chunks: south dock, tent, campfire, chest, trees, rock formations, flowers  
5. Living templates: vendors, captain, bandit, boar, fish  
6. Water heights: `waterLevel=0`, `oceanFloorLevel=-24`  

Loaded in `Island3DEngine.initLobby()`.

### Production HUDs & entry

| Surface | Role |
|---------|------|
| `/open-world` | Character select + destination + editor flag |
| Lobby `LobbyProductionHUD` | Entry · Edit · Test · Deploy/Play |
| Lobby `LobbyMiniMap` | Islands · contents · activities · game zones (`lobbyIslands.ts`) |
| `ModePlayHUD` | Combat / Harvest / Build (Units·Siege·Monsters) |
| `Grudge6PlayShell` | Main panel / spellbook / inventory |

### Lobby islands (minimap SSOT)

`shared/definitions/lobbyIslands.ts` — Free Port hub, **Shipwreck Cove** (wrecked pirate ship), N/S/E/W capture lands.  
Agent skill: `client/src/island3d/skills/lobby-minimap/SKILL.md`.

### Water depth teaching (islands as skill model)

```
deck / pier   → wave amp ≈ 0 (angle preserved)
beach / sand  → shallow color + shore foam + sculptable height
shallow ring  → mid color + soft waves
open sea      → deep → abyss falloff
```

Shader: `client/src/island3d/terrain/PirateLobbyOcean.ts` (TI toonWater + DynamicOcean lineage).

## Editor / build mode

Place more chunks via Build tabs:

- Structure / Camp / Nature / Units / Siege / Monsters  
- Same multipacks + deployables as composition library  

## How to author a new island (our creation)

1. Add a `MapSceneComposition` entry (copy `GRUDGE_OPEN_WORLD_COMPOSITION`).  
2. List **every** house, wall, rock formation, dock, tree, etc. as a `MapChunkAsset`.  
3. Prefer multipack `nodeName` or CDN GLB — not one giant untagged mesh.  
4. Set `water.waterLevel` + `water.oceanFloorLevel`.  
5. Set `weather.preset`.  
6. Living agents: `kind: vendor|captain|enemy|animal` + agent path or GLB.  
7. Load with `loadMapComposition(scene, mapId)`.

## Debug

Console after lobby load:

```
[MapComposition] Racalvin's Free Port · waterY=0 · floorY=-24 · N chunks · tree:… rock:… · overlays=…
```

Mesh inspect: `mesh.userData.grudgeChunk.kind`.

## Related

- Modular packs: `modularAssetLibrary.ts`  
- Nature files: `natureAssetCatalog.ts`  
- Zone population: `zoneServerNodes.ts`  
- Deployables: `ummorpgDeployables.ts`  
- Open world entry: `/open-world`  
