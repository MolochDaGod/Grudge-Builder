# World Map — Current Truth vs Canonical 9 Sectors

**Updated:** 2026-07-16  
**Machine SSOT:** `shared/definitions/mapRegistry.ts`  
**Human SSOT index:** `Desktop/SOURCE_OF_TRUTH.md`  
**Primary client:** `Desktop/grudge-builder` → grudgewarlords.com

There is **more than one map**. Mixing IDs is a bug.

---

## 1. Canonical lore-accurate **9 sectors** (Warlords era open world)

**This is the shared MMO ocean / PVE trade world.**

| Field | Value |
|-------|--------|
| Family id | `warlords_era_open_world` |
| Source | `shared/definitions/worldMapSectors.ts` → `WORLD_SECTORS` |
| Bridge | `shared/definitions/sectorBridge.ts` (legacy `NW`…`SE` ↔ snake_case) |
| Engine | `Island3DEngine` **mode=`zone`** |
| Seed | `grudge-world-1` |
| Default land-in | `haven_shore` / city `haven_port` |
| Entry | `/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1` |
| Sail view | `/ocean`, `/world-map` (same 9 IDs) |

### 3×3 geographic layout (lore)

```
        col0              col1              col2
row0    Ethereal Falls    Frostbite Expanse Thornwood Wilds
row1    Stormbreak Reef   Convergence Nexus Ashen Wastes
row2    Abyssal Trench    Haven Shore       Ember Depths
```

| Sector id | Name | Biome | Notes |
|-----------|------|-------|--------|
| `ethereal_falls` | Ethereal Falls | ethereal | **NW top-left** — Crusade cold; NW half = destruction / Cosmic Waterfall |
| `frostbite_expanse` | Frostbite Expanse | frozen | N — Fabled dwarf capital; primary ice assets |
| `thornwood_wilds` | Thornwood Wilds | forest | NE — elf capital |
| `stormbreak_reef` | Stormbreak Reef | storm+ice | **W mid-left** western cold band; Crusade ice patrols |
| `convergence_nexus` | Convergence Nexus | nexus | CENTER — contested |
| `ashen_wastes` | Ashen Wastes | desert | E — demon capital |
| `abyssal_trench` | Abyssal Trench | abyssal+ice-rim | **SW bottom-left** western cold rim; undead capital |
| **`haven_shore`** | **Haven Shore** | **tropical** | **S — human capital, PVE trade (this Fruzer foundation)** |
| `ember_depths` | Ember Depths | volcanic | SE — orc capital |

Legacy Colyseus keys for the **same** map only:

| Legacy | Zone id |
|--------|---------|
| NW | ethereal_falls |
| N | frostbite_expanse |
| NE | thornwood_wilds |
| W | stormbreak_reef |
| CENTER | convergence_nexus |
| E | ashen_wastes |
| SW | abyssal_trench |
| **S** | **haven_shore** |
| SE | ember_depths |

Race capitals: `shared/definitions/raceCities.ts`.

---

## 2. What “current world map in truth” also means (other families)

These exist in production code and **must not** be treated as the 9-sector open world:

### A) Player home block (also 9 cells — **different**)

| Field | Value |
|-------|--------|
| Family | `player_home_block` |
| Source | `shared/definitions/worldMap.ts` (`WORLD_CONFIG.blockSize = 3`) |
| IDs | `TL`…`MC_HOME`…`BR` — **not** `haven_shore` |
| Entry | `/home-island` |
| Meaning | Each account’s personal 3×3 on the 100×100 grid |

### B) Chicken Gun / pirate lobby

| Field | Value |
|-------|--------|
| Family | `chicken_gun_pirate_lobby` |
| Asset | `pirate-islands` scene.gltf (lobby), **not** Fruzer foundation by default |
| Entry | `/island-3d?mode=lobby&map=pirate-islands` |
| Engine | `LobbyIslandLoader` |

**Fruzer** (`chicken_gun_fruzer_-_islands.glb`) is now the **authored foundation for Haven Shore zone**, not the lobby map family.

### C) Tactical ocean

View layer **over** Warlords 9 sectors — same IDs.  
`/ocean`, water.grudge-studio.com (Tactical Infinity captain client).

### D) Parallel biome grid (secondary / RTS lineage)

`shared/definitions/worldSectors.ts` and RTS-Grudge `shared/worldSectors.ts` use biome keys:

`forest | storm | frozen | desert | nexus | tropical | abyssal | ethereal | volcanic`

These are **biome labels**, not Warlords zone ids. Zone `haven_shore` maps to biome **`tropical`**. Do not join Colyseus with `tropical` when you mean `haven_shore`.

---

## 3. Decision table

| Intent | Use this map | Entry |
|--------|--------------|--------|
| Open-world PVE / trade / sail | **Warlords 9** (`worldMapSectors`) | `/play?sector=haven_shore…` |
| Personal home island | Home block + home island | `/home-island` |
| Pre-play lobby / RTS hub | Chicken Gun pirate lobby | `/island-3d?mode=lobby…` |
| MOBA lanes | Warlord Genesis | warstrat — **not** Warlords sectors |

---

## 4. Complete world map render (2026-07-17)

| Surface | Entry | Engine |
|---------|-------|--------|
| **Complete 9-sector strategic** | `/world-map` (default) | `CompleteWorldMap` + `buildCompleteWorldMap()` |
| **Tactical sail** | `/ocean` | `ThreeWorldMapManager` · all 9 labeled sector islands |
| **Tile sail (legacy)** | `/world-map` → “Tile Sail Map” | canvas `worldMapSystem` |

Docs: [COMPLETE_WORLD_MAP.md](./COMPLETE_WORLD_MAP.md).

## 5. Haven Shore foundation (sector 1 ready path)

See [HAVEN_SHORE_FOUNDATION.md](./HAVEN_SHORE_FOUNDATION.md).

- Best **starter PVE trade** sector by lore (`isSafeZone`, human capital).
- Fruzer provides village + islands + enemy boats.
- Water = map ocean only.
- Harvest / NPCs / animals / 4 vendors / mission givers = database UUIDs in `havenShoreFoundation.ts`.

---

## 6. Source files (quick)

| Concern | File |
|---------|------|
| Map family registry | `shared/definitions/mapRegistry.ts` |
| 9 sector defs + terrain3d | `shared/definitions/worldMapSectors.ts` |
| Legacy bridge | `shared/definitions/sectorBridge.ts` |
| Home 100×100 / blocks | `shared/definitions/worldMap.ts` |
| Race cities | `shared/definitions/raceCities.ts` |
| Haven Fruzer foundation | `shared/definitions/havenShoreFoundation.ts` |
| Deploy checklist | `docs/WARLORDS_SECTOR_DEPLOY_PREP.md` |
| Map families doc | `docs/MAP_FAMILIES_CANONICAL.md` |
