# Warlords era — Sector world server deploy prep

**Date:** 2026-07-17  
**SSOT client:** `Desktop/grudge-builder` (Vercel grudge-builder / grudgewarlords.com)  
**SSOT index:** `Desktop/SOURCE_OF_TRUTH.md`  
**Map families:** `shared/definitions/mapRegistry.ts` (do not mix IDs)

This is the **prep checklist** for shipping a full multiplayer sector experience:

assets · textures · terrain · building grids · land-edit shovels · harvestables ·  
**9 ocean sectors fully built** · AI / NPCs · water travel with characters + boats.

---

## 0. Map families (keep separate)

| Family | Map / ID | Entry | Engine |
|--------|----------|-------|--------|
| **Tutorial (solo)** | procedural shipwreck | `/tutorial` | `ShipwreckRoom` + procedural island |
| **Chicken Gun lobby** | `pirate-islands` GLTF | `/island-3d?mode=lobby…`, `/rts-grudge` | `LobbyIslandLoader` + `LobbyGameplay` |
| **Home island** | personal 1024m seed | `/home-island` | `home_island` Colyseus |
| **Warlords 9 sectors** | `WORLD_SECTORS` | `/play?sector=…`, `/ocean` | zone mode + `sector` room |
| **Tactical Infinity** | sail view layer | water.grudge-studio.com | **not** lobby / not home-block |

---

## 1. Nine Warlords sectors (ocean map)

Source: `shared/definitions/worldMapSectors.ts` → `WORLD_SECTORS`

| # | Sector id | Name | Biome |
|---|-----------|------|-------|
| 1 | `frostbite_expanse` | Frostbite Expanse | frozen |
| 2 | `stormbreak_reef` | Stormbreak Reef | storm |
| 3 | `thornwood_wilds` | Thornwood Wilds | forest |
| 4 | `ashen_wastes` | Ashen Wastes | desert |
| 5 | `convergence_nexus` | Convergence Nexus | nexus |
| 6 | `ethereal_falls` | Ethereal Falls | ethereal |
| 7 | `abyssal_trench` | Abyssal Trench | abyssal |
| 8 | `ember_depths` | Ember Depths | volcanic |
| 9 | `haven_shore` | Haven Shore | tropical (human capital default) — **Fruzer foundation live** |

**Default land-in play:**  
`/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port`  
(see `shared/fleet/gameDeployments.ts`).

**Haven Shore foundation (2026-07-16):** Fruzer `fruzer_islands.glb` under  
`models/warlords/haven_shore/` — village + islands + enemy boats; map ocean only;  
DB harvest UUIDs + 4 vendors + mission givers. See `docs/HAVEN_SHORE_FOUNDATION.md`  
and `docs/WORLD_MAP_TRUTH.md`.

Per sector “fully built” means at minimum:

1. Terrain mesh + biome textures (PBR)
2. Capital / race city plaza (`ZoneCapitalSpawner`)
3. Harvest rings (wood/stone/ore…)
4. Building grid / foundation rules active
5. Dungeon portal hooks (`ZoneDungeonPortals`)
6. NPC / camp / guard set
7. Water edge + boat dock points
8. Colyseus `sector` room join with `sectorId` + `worldSeed`
9. Assets on R2 under stable keys (no broken `/api/assets` 404s)

---

## 2. Code map (where systems live)

### Terrain & textures
| System | Path |
|--------|------|
| Zone terrain | `client/src/island3d/terrain/ZoneTerrainGenerator.ts` |
| Island / home terrain | `IslandTerrainGenerator.ts` |
| Materials / water | `TerrainMaterial.ts`, `WaterMaterial.ts` |
| PolyHaven / lobby ground | `PolyHavenTextures.ts`, `LobbySurfaceLayers.ts`, `GroundPBRTextures.ts` |
| Board / build grid | `terrain/BoardGrid3D.ts` |

### Building & land edit
| System | Path |
|--------|------|
| Snap construction | `building/BuildingSystem.ts` |
| Asset catalog | `building/BuildAssetManifest.ts` (+ multipacks on CDN) |
| Survival kit SSOT | `shared/definitions/survivalKitBuildCatalog.ts` |
| Pack models | `building/PackModelLoader.ts` → R2 `models/buildings/…` |

**Shovel / terrain sculpt:** search home-island + studio editor paths (`Grudge-Studio-Forge` / studio editor for authoring; runtime place props via `BuildingSystem` terrain props). Confirm shovel tool binding in `ModePlayHUD` / build mode before server authoring.

### Harvestables
| System | Path |
|--------|------|
| Zone harvest spawn | `harvest/ZoneHarvestSpawner.ts`, `HarvestZonePlacer.ts` |
| Regenerative nodes | `RegenerativeHarvest.ts` |
| Trees / rocks | `objects/HarvestableTree.ts`, `HarvestableRock.ts` |
| Lobby harvest | `lobby/LobbyHarvestables.ts` (if present), `LobbyGameplay.ts` |

### AI / NPCs
| System | Path |
|--------|------|
| Town NPCs | `town/TownNPCManager.ts`, `ai/TownNPCController.ts` |
| Ally AI | `ai/AllyController.ts` |
| Creatures | `creatures/CreatureManager.ts`, `CreatureBrain.ts` |
| Camps | `camps/NpcCampSystem.ts` |
| Lobby vendors/guards | `engine/LobbyPlayZone.ts` |

### Boats / water travel
| System | Path |
|--------|------|
| Ocean sail (in-client) | `/ocean`, `tactical-ocean/TacticalOceanScene.tsx` |
| Deploy URL builder | `lib/oceanNavigation.ts` → zone play |
| TI satellite | `FLEET_URLS.tacticalInfinity` = water.grudge-studio.com |
| Lobby boat dock | Lobby gameplay / E-dock notes in mapRegistry |
| Character board boat | Tutorial raft flow → expand to sector docks |

### Multiplayer server
| Room | File | Role |
|------|------|------|
| `tutorial` / `shipwreck` | `server/colyseus/rooms/ShipwreckRoom.ts` | Solo open |
| `lobby` | `LobbyRoom.ts` | Social / matchmaking hub |
| `home_island` | `HomeIslandRoom.ts` | Personal island |
| `sector` | Sector room | **9-sector live instances** |
| `town` / `world` / dungeon | colyseus index | Capitals / open world |

Register: `server/colyseus/index.ts`.

### Asset pipeline
| Concern | Source |
|---------|--------|
| Binary CDN | `https://assets.grudge-studio.com` · skill **grudge-assets-sync** |
| Lobby GLTF | `models/lobby/pirate-islands/` (scene.gltf + bin + textures) |
| Buildings multipacks | `models/buildings/survival|towers|benches/…` |
| Characters / races | `models/characters/races/{race}.glb`, arena packs |
| ObjectStore JSON | items, recipes, contracts — not binaries |

---

## 3. Deploy targets

| Layer | Host | Project |
|-------|------|---------|
| Client SPA | Vercel | **grudge-builder** → grudgewarlords.com, client.grudge-studio.com |
| Colyseus + game API | Railway | **grudge-api** (`grudge-api-production-0d46…`) |
| Assets | Cloudflare R2 | bucket `grudge-assets` via grudge-assets-sync |
| Identity | id.grudge-studio.com | accounts only — no game state |
| Ocean sail alt | Vercel / water.* | Tactical Infinity (view layer) |
| RTS satellite | rts-grudge.vercel.app | Optional; Warlords lobby host is in-builder `/rts-grudge` |

---

## 4. Phased ship plan (recommended)

### Phase A — Asset & texture baseline (CDN)
- [ ] Audit R2 keys for all 9 biomes (ground, rock, foliage, water)
- [ ] Ensure lobby `pirate-islands` loads 200 on production `/api/assets/…`
- [ ] Push building multipacks + harvest prop GLBs used by `BuildAssetManifest`
- [ ] Run `grudge-assets-sync` verify race/vehicle/building packs

### Phase B — Sector terrain pass
- [ ] For each `WORLD_SECTORS` id: generate/load zone terrain + biome material
- [ ] Capital spawner + city plaza footprint (`ZoneCapitalSpawner`)
- [ ] Water ring / shoreline colliders
- [ ] Smoke: `/play?sector=<id>&mode=zone&worldSeed=grudge-world-1`

### Phase C — Build grid + land tools
- [ ] Foundation grid active per sector (`BoardGrid3D` + `BuildingSystem`)
- [ ] Shovel / terrain-prop tool wired in build mode (home + sector)
- [ ] Persist builds to Railway (sector or island tables) with `grudge_id`

### Phase D — Harvestables
- [ ] Per-biome harvest tables (wood/stone/ore/herb)
- [ ] Regen timers + multiplayer authority on `sector` room
- [ ] Match lobby harvest patterns from `HarvestZonePlacer` rings

### Phase E — AI / NPCs
- [ ] Capital guards + vendors + quest givers per sector
- [ ] Creature packs by biome (`CreatureManifest`)
- [ ] Ally AI optional for co-op landings

### Phase F — Boats + character water travel
- [ ] Dock POIs on each capital shoreline
- [ ] Board boat with active Grudge6 character model
- [ ] Ocean handoff: sector dock → `/ocean` or TI → land back `/play?sector=…`
- [ ] Keep chicken-gun lobby docks separate from era-9 ocean

### Phase G — Server scale
- [ ] `sector` room filterBy `sectorId` + `worldSeed`
- [ ] Replica strategy (sticky or single room per sector shard)
- [ ] Health probes + grudge-dev doctor
- [ ] Load test haven_shore + one remote sector

---

## 5. Example URLs (production)

```
# Solo open
https://grudgewarlords.com/tutorial

# Chicken Gun live hub
https://grudgewarlords.com/rts-grudge
https://grudgewarlords.com/island-3d?mode=zone&sector=lobby

# Home island
https://grudgewarlords.com/home-island

# Sector 9 land (default capital)
https://grudgewarlords.com/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port

# Ocean sail
https://grudgewarlords.com/ocean?worldSeed=grudge-world-1
https://water.grudge-studio.com
```

---

## 6. Definition of done (sector fully built)

For **each** of the 9 sectors:

- [ ] Terrain + textures load without pink/missing mats  
- [ ] Capital city present + navigable  
- [ ] ≥1 harvest ring of each primary resource  
- [ ] Building place/ghost/snap works on sector ground  
- [ ] ≥3 NPC roles (vendor/guard/civilian or quest)  
- [ ] Boat dock + leave-to-ocean + return  
- [ ] 2+ clients see each other on `sector` room  
- [ ] No confusion with `pirate-islands` lobby map IDs  

---

## 7. Next engineering ticket (suggested first slice)

**Haven Shore (sector 9) gold path end-to-end**

1. Assets audit + fix 404s for haven tropical pack  
2. Zone terrain + capital + harvest + docks  
3. Building grid + one shovel/terrain prop  
4. 2-player Colyseus sector smoke  
5. Boat → ocean → re-land haven  

Then clone pack patterns across the other 8 biomes.
