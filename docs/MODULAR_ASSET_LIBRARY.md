# Modular Asset Library — 9 sectors · lobby · home islands

**Version:** 1.0.0  
**Code SSOT:** `shared/definitions/modularAssetLibrary.ts`  
**Related:** `biomeEcosystemCatalog.ts`, `fantasyVillageBuildCatalog.ts`, `iceBiomeCatalog.ts`, `buildSystem.ts`

---

## Goal

One library for the rebuild:

| Surface | Map family | Terrain / textures | Nature (trees/rocks) | Placeables / modular | Spawnables DB |
|---------|------------|--------------------|----------------------|----------------------|---------------|
| **9 sectors** | `warlords_sector` | Sector `groundPBR` + biome PBR | **Ecosystem** (snow_pine on frostbite) | survival + fantasy + ice(if cold) | `world_placements` + harvest nodes |
| **Lobby** | `chicken_gun_lobby` | PolyHaven coastal lobby | Ecosystem / lobby harvest rings | survival + fantasy | lobby props |
| **Home island** | `home_island` | Seed foundation PBR | Ecosystem by seed biome | survival + fantasy + ice if cold seed | island state + placements |
| **Event snow** | `event_island` | Snow PBR + ice kit terrain scatter | Ecosystem snow_pine **+** ice path rocks | ice kit heavy + survival | event seed + E-learn |

---

## Layer model (compose, don’t replace)

```
┌─────────────────────────────────────────────────────────────┐
│ 5. Database: placements · harvest_nodes · unlocked_recipes  │
├─────────────────────────────────────────────────────────────┤
│ 4. Spawnables: density · biome filter · map_family           │
├─────────────────────────────────────────────────────────────┤
│ 3. Multipacks (node extract): survival | fantasy | ice       │
├─────────────────────────────────────────────────────────────┤
│ 2. Nature ecosystem: snow_pine, rocks, animals (KEEP)        │
├─────────────────────────────────────────────────────────────┤
│ 1. Terrain PBR / PolyHaven / ground_7 frozen (KEEP)          │
└─────────────────────────────────────────────────────────────┘
```

### Cold biome rule (critical)

| Keep (existing) | Add (new ice kit) | Never |
|-----------------|-------------------|--------|
| `snow_pine` harvest trees | Chests, barrels, stations | Replace default frostbite canopy with ice kit `Tree_*` |
| `ground_7` / `frozen_glacier` | Path rocks, fences, panels | Use ice kit atlas as sector ground material |
| Snowfall / fog FX | Boat, sled, campfire, E-learn | Mix pirate lobby map id with sector ids |

Ice kit **props** enrich camps and event islands; **ecosystem** still owns “real” wood harvest trees.

---

## Multipack library

| Pack id | Path | Primary use |
|---------|------|-------------|
| `survival_kit` | `/models/buildings/survival/free_survival_asset_kit.glb` | Camp, benches, T1 modular wood |
| `fantasy_village_kit` | `/models/buildings/fantasy/fantasy_village_kit.glb` | Walls, towers, gates, houses, carts (no trees) |
| `ice_biome_kit` | `/models/biomes/ice/ice_biome_kit.glb` | Snow event props, stations, chests, icebergs |
| `medieval_towers` | `/models/buildings/towers/3_medieval_towers.glb` | Defense towers |

**Render API (all multipacks):**

```
BUILD_ASSETS[id] = {
  id, name, modelPath, nodeName, category, placement, buildLayer, cost
}
PackModelLoader → getObjectByName(nodeName).clone() → recenter → place
```

---

## 9 sectors binding

| Sector | Biome | Ground | Trees | Extra multipacks |
|--------|-------|--------|-------|------------------|
| frostbite_expanse | frozen | ground_7 | snow_pine (eco) | + ice kit props |
| stormbreak_reef | storm | ground_4 | eco | fantasy + survival |
| thornwood_wilds | forest | … | eco | fantasy + survival |
| ashen_wastes | desert | … | eco | fantasy + survival |
| convergence_nexus | nexus | … | eco | fantasy + survival |
| ethereal_falls | ethereal | … | eco | fantasy + survival |
| abyssal_trench | abyssal | … | eco | fantasy + survival |
| ember_depths | volcanic | … | eco | fantasy + survival |
| haven_shore | tropical | … | eco palm/pine | fantasy + survival |

See `SECTOR_LIBRARY_BINDINGS` in code for exact multipack lists.

---

## Modular building best practices

### Layers (`buildSystem.ts`)

1. **quick** — bag craft, no mesh  
2. **camp** — tent/fire/bedroll  
3. **bench** — profession stations  
4. **modular** — Conan snap (foundation → wall → ceiling → door/gate/tower)  
5. **rts** — full faction buildings (house, tavern, windmill)  
6. **dock** — waterfront + boats  
7. **race_home** — per-race housing  

### Naming

| Field | Rule | Example |
|-------|------|---------|
| `id` | stable `snake` | `fv_wooden_wall_1`, `ice_chest` |
| `name` | player label | Wooden Wall 1 |
| `nodeName` | exact GLB parent | `WoodenWall_1` |
| Never | material leaves | `*_M_Sandman_0`, `*_bark_0` |

### Conan UX

- **B** open build panel (Structure tab first)  
- Ghost + **R** rotate + click place  
- Snap sockets on structural pieces (`BuildingSystem`)  
- Cost row on each card  
- Search by id / name / nodeName  

### E-learn recipes

- Stand over chest/station/fence/camp prop  
- **E** once → `unlocked_recipes` + local cache  
- Client: `recipeLearn.ts`  
- Engine: `nearestLearnAssetId`  

---

## Database usage

| Table | Purpose |
|-------|---------|
| `world_placements` | Player modular builds (map_family, map_key, asset_id, x/y/z, rot) |
| `world_harvest_nodes` | Trees/rocks, regen 4h (`HARVEST_REGEN_MS`) |
| `unlocked_recipes` | E-once recipe learn (exists in scheme.ts) |
| `sector_instances` | Colyseus sector shard metadata |
| `home_islands.state` | Home island seed + builds (existing) |

**Map keys:**

- Sector: `sectorId` + `worldSeed`  
- Home: `homeIslandId` / character island id  
- Lobby: `lobby` + map id `pirate-islands`  
- Event: `eventId` + biome  

---

## Spawnables pipeline

1. Resolve **map family** + **biome**  
2. Load **ecosystem** palette (trees/rocks/animals)  
3. Load **multipack catalogs** allowed for that binding  
4. Seed harvest nodes (4h regen)  
5. Seed camps/chests on cold/event with learnable flags  
6. Player places modular pieces → write `world_placements`  

---

## CDN layout (R2)

```
assets.grudge-studio.com/
  models/buildings/survival/...
  models/buildings/fantasy/fantasy_village_kit.glb
  models/buildings/fantasy/fantasy_village_kit.catalog.json
  models/biomes/ice/ice_biome_kit.glb
  models/biomes/ice/ice_biome_kit.catalog.json
  models/nature/...                    # snow_pine etc. (KEEP)
  textures/pbr/ground/...              # ground_7 + future snow_*
  textures/polyhaven/lobby/...         # pirate lobby coastal
```

---

## Rebuild checklist

### Library setup
- [x] Fantasy village multipack + catalog  
- [x] Ice biome multipack + recipes + E-learn  
- [x] `modularAssetLibrary.ts` bindings  
- [ ] Publish catalogs to ObjectStore / info hub  
- [ ] R2 upload multipacks  

### Per surface
- [ ] Frostbite: ecosystem snow_pine + ice props + ground_7  
- [ ] Other 8 sectors: ecosystem + fantasy modular + capitals  
- [ ] Lobby: pirate GLTF + fantasy/survival props only  
- [ ] Home: seed biome → multipack filter  
- [ ] Event snow: ice kit learnables + chests  

### Server
- [ ] `world_placements` migration  
- [ ] `world_harvest_nodes` migration  
- [ ] `POST /api/characters/:id/recipes/unlock`  
- [ ] Sector room loads placements by sectorId+seed  

### Client
- [ ] Proximity → `nearestLearnAssetId` for ice learnables  
- [ ] Zone spawner reads `resolveSectorLibrary(sectorId)`  
- [ ] Build panel filters by map multipacks  

---

## Anti-patterns

| Don’t | Do |
|-------|-----|
| One giant GLB per sector | Multipack node extract + ecosystem |
| Replace snow_pine with ice Tree_* | Ice kit for props; eco for harvest canopy |
| Hardcode paths in spawner | `MULTIPACK_LIBRARY` + bindings |
| Mix lobby map id into sector seed | Strict `mapFamily` |
| Learn recipe every E | Once per `recipeId` / character |

---

## Code entry points

```ts
import {
  SECTOR_LIBRARY_BINDINGS,
  LOBBY_LIBRARY_BINDING,
  HOME_ISLAND_LIBRARY_BINDING,
  MULTIPACK_LIBRARY,
  COLD_BIOME_EXISTING,
  resolveSectorLibrary,
  SPAWN_BEST_PRACTICES,
} from '@shared/definitions/modularAssetLibrary';

import { resolveBiomePalette } from '@shared/definitions/biomeHarvestAssets';
import { BIOME_ECOSYSTEMS } from '@shared/definitions/biomeEcosystemCatalog';
```
