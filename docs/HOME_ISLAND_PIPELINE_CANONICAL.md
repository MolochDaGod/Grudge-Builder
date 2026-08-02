# Home Island Pipeline — Canonical Operations

**Updated:** 2026-07-09  
**Spec version:** `HOME_ISLAND_SPEC_VERSION` 2.1.0  
**Character reference:** **2.0 m tall** (`CHARACTER_REFERENCE_HEIGHT_M`)

---

## Short answer

| Question | Status |
|----------|--------|
| Use **grudge-studio-editor** for islands? | **Yes** — primary design path via `studioEditorBridge` (`mode=home-island`) |
| Better biome trees/rocks/crystals? | **Yes (partial)** — CDN env GLBs + biome palettes; nature scatter catalog defined |
| Animals scaled vs 2m heroes? | **Yes (partial)** — `ISLAND_ANIMALS` meter heights + `WILDLIFE_SIZE_FACTOR` |
| Mountain / portal for events + PvE? | **Yes** — evil rock mountain triad + secret-peak dungeon portal |
| NPC AI + pathfinding? | **Yes (partial)** — `CreatureBrain`, `TerrainNavMesh`, ally + orc boss AI |
| D1 for island seeds? | **No — Railway Postgres `home_islands` is SSOT**; D1/R2 = ObjectStore **assets**, not island rows |

---

## Authority chain (do not reverse)

```
1. Design (optional but preferred)
   https://grudge-studio-editor.vercel.app/editor?mode=home-island&seed=…&characterId=…&islandId=…
   (also studio.grudge-studio.com)

2. Persist island seed + state
   Railway Postgres: home_islands  (SSOT)
   Cache: Puter KV grudge:island:{id}:state  (NOT authority)
   localStorage: offline only

3. Spec catalog (meters + assets)
   shared/definitions/homeIslandSpec.ts
   GET /api/island/spec  (Railway)
   ObjectStore: /api/v1/home-island-contract.json

4. Runtime play
   client.grudge-studio.com/home-island
   Island3DEngine (procedural + seed + mountain triad)
   Colyseus home_island room (1024m)

5. Binary assets
   assets.grudge-studio.com  (R2 grudge-assets)
   Trees/rocks/gems: /models/environment/*
   Nature scatter: /models/nature/*
   Mountains: /models/evil_rock_mountain*
   Creatures: CreatureManifest CDN paths
```

### Studio editor linkage (code)

| Piece | Location |
|-------|----------|
| URL builder | `client/src/lib/studioEditorBridge.ts` |
| Launch from reveal | `client/src/pages/island-reveal.tsx` → `openStudioEditorForHomeIsland` |
| Project → state map | `mapStudioProjectToHomeIslandState` |
| RTS export ingest | `POST /api/island/export-from-rts` |
| Config | `STUDIO_EDITOR_URL` = `https://grudge-studio-editor.vercel.app` |

Editor modes:

- `mode=home-island` — account island creation (returns to `/island-reveal`)
- `mode=explore` — generic island play/preview (`buildStudioEditorExploreUrl`)

---

## Scale contract (2m character)

| Entity | Canonical size |
|--------|----------------|
| Player (scale 1.0 race GLB) | **2.0 m** tall |
| Dwarf / barbarian / orc | ×0.85 / ×1.1 / ×1.15 of 2.0 m |
| Trees (harvest) | 5.5–9.5 m |
| Rocks | 1.8–3.8 m |
| Hare / fox / deer / boar | 0.38 / 0.55 / 1.35 / 0.95 m height |
| Island world | **1024 m** diameter |
| Size foundations | **Driftwood Bay** (coast) + **Ironfang Spire** (highland) — both 1024 m |
| Nature assets | Organized `/models/nature/realistic/*` only — **no low-poly megakit** |
| RTS core | 200 m (upsampled into 1024 m) |
| Mountain triad footprint | 10% of island ≈ **102.4 m** |
| Dungeon mouth | **4 m** high |

Helpers:

- `scaleFactorForTargetHeightM` / `wildlifeScaleForHeightM` in `homeIslandSpec.ts`
- `PLAYER_HEIGHT_M` / `fitMeshHeightToMeters` in `zoneWorldScale.ts`
- Wildlife apply: `def.scale * WILDLIFE_SIZE_FACTOR` in `CreatureManager`

**Rule:** When adding a new GLB, measure bbox height after load and fit to target meters with those helpers — do not invent arbitrary scales.

---

## Biome assets (high quality path)

**CDN audit (all layers):** `node scripts/audit-biome-assets.mjs`  
**SSOT:** `natureAssetCatalog.ts` → `WARLORDS_SURFACE_ASSETS` · `biomeEcosystemCatalog.ts` → `BIOME_SURFACE_LAYERS`

| Layer | Source |
|-------|--------|
| Biome palette (tints + wildlife pools) | `biomeHarvestAssets.ts` |
| Land scatter (trees/rocks/grass) | Battle Kenney pack `/models/nature/*` + stylized multipacks |
| Coast / palms | `tropical_plants.glb` + realistic palms |
| Water / ponds / fish | `pond_pack.glb` + `/models/creatures/fish/*` |
| Mountains | `evil_rock_mountain_peak_0|1|2` + triad |
| Ground PBR (10 mats) | `/textures/pbr/ground/Ground_N_*` |
| All 12 biome boards | `/models/biomes/review/{id}.glb` |
| Harvest GLB pack (tree/rock/gem/ore) | CDN `/models/environment/*` + stylized harvest packs via `IslandResourceLoader` |
| Nature scatter (pine/bush/rock sets) | `ISLAND_NATURE_SCATTER` → `/models/nature/*` |
| Ground PBR | `ISLAND_TERRAIN_TEXTURES` → `/textures/pbr/ground` |
| Regenerative harvest | `RegenerativeHarvest` + regrow anchors |

Home islands always get three regrow anchors: timber grove, quarry, beach shells (`generateRegrowRegions`).

---

## Mountain triad + portal PvE

| Piece | Implementation |
|-------|----------------|
| Models | `evil_rock_mountains_triad.glb` + peak_0/1/2 (CDN live) |
| Seed | `generateMountainTriadSeed(seed)` — secret peak 0–2 |
| Runtime | `EvilMountainTriadSystem` + `Island3DEngine.createMountainDungeon` |
| Portal | Player walks behind secret peak → `onDungeonEnter` |
| Events | Home-island dungeon events / PvE fight entry |

---

## AI systems (cross-project)

| System | Role | Pathfinding |
|--------|------|-------------|
| `CreatureBrain` | Wildlife idle/wander/flee/chase | Direct + roam radius |
| `TerrainNavMesh` | Walkable mesh paths | A* |
| `AllyController` | Companion AI | NavMesh |
| `OrcBossAI` / `OrcBossController` | Boss FSM + combat | NavMesh optional |
| Colyseus | Multiplayer sync | Server-authoritative positions |

Studio editor entities (`creature`, `resource_node`) map into home state animals/nodes for consistent spawns after commit.

---

## D1 vs Railway (critical)

| Store | Use for islands |
|-------|-----------------|
| **Railway Postgres `home_islands`** | **SSOT** seed, state, cNFT, validatedAt |
| Puter KV | Fast cache only |
| **Cloudflare D1** (ObjectStore) | Asset registry / meta — **not** player island rows |
| R2 `grudge-assets` | glTF binaries (trees, mountains, creatures) |

“D1 island seed creations” in fleet language usually means: **seed string stored on Railway**, **meshes on R2**, **catalogs on ObjectStore JSON** — not D1 rows per island.

---

## Operational checklist (new home island)

1. Auth → create character  
2. Generate / open Studio Editor (`mode=home-island`) with seed  
3. Place harvest, wildlife, spawn; honor 2m character scale in editor  
4. Commit → `PATCH /api/island/state` (Railway)  
5. Play `/home-island` → engine loads seed + mountain triad + harvest + wildlife  
6. Optional RTS export → `export-from-rts` merges heightmap/nature scatter  
7. PvE: approach northern mountain portal for dungeon event  

---

## Known gaps (honest)

1. Some creature CDN paths in `CreatureManifest` may 404 — verify each before ship  
2. Nature scatter models need bulk R2 audit (`/models/nature/*`)  
3. Studio editor terrain size default (256) must upsample consistently to 1024 m runtime  
4. Wildlife `WILDLIFE_SIZE_FACTOR` is empirical — should re-measure after GLB pipeline standardize  
5. Full GOAP/Yuka AI is not on every NPC; boss + wildlife + ally are the main brains  

---

## Related SSOT files

- [WARLORDS_ACCOUNT_CHARACTER_SSOT.md](./WARLORDS_ACCOUNT_CHARACTER_SSOT.md) — account-owned island, shared bag/camps, guest hosting  
- [MULTIPLAYER_DEPLOY_PATTERN.md](./MULTIPLAYER_DEPLOY_PATTERN.md) — Colyseus `home_island` owner + visitors  
- [WARLORDS_CNFT_MARKETPLACE_SSOT.md](./WARLORDS_CNFT_MARKETPLACE_SSOT.md) · [CNFT_ESCROW_OWNERSHIP.md](./CNFT_ESCROW_OWNERSHIP.md)  
- `shared/definitions/homeIslandSeed.ts`  
- `shared/definitions/homeIslandSpec.ts`  
- `shared/definitions/homeIslandQuality.ts`  
- `shared/definitions/biomeHarvestAssets.ts`  
- `client/src/lib/studioEditorBridge.ts`  
- `client/src/lib/homeIslandApi.ts`  
- ObjectStore `api/v1/home-island-contract.json`  
