# Haven Shore Foundation — PVE Trade Village (Fruzer)

**Updated:** 2026-07-16  
**Sector:** `haven_shore` (Warlords era open world)  
**City:** `haven_port` (human capital)  
**Asset:** `chicken_gun_fruzer_-_islands.glb` →  
`client/public/models/warlords/haven_shore/fruzer_islands.glb`  
**Code SSOT:** `shared/definitions/havenShoreFoundation.ts`  
**Loader:** `client/src/island3d/zone/HavenShoreFoundationLoader.ts`

---

## What this is

Foundational **1 of 9** Warlords macro sectors: the best **PVE trade zone / starter village**.

| Piece | Source |
|-------|--------|
| Small village | Fruzer `B_U_I_L_D_I_N_G_S` + `P_R_O_P_S` |
| Islands | Fruzer `I_S_L_A_N_D_S` (textures upgraded) |
| Enemy vessels | Fruzer `B_O_A_T_S` (pirate ships / wrecks) |
| Nature visuals | Fruzer `N_A_T_U_R_E` (tagged; harvest = DB UUIDs) |
| **Water** | **Zone map ocean only** — Fruzer `Water` / cubes **stripped** |
| Harvestables | `HAVEN_HARVEST_PLACEMENTS` UUIDs + respawn |
| 4 vendors | Mira / Brann / Tessa / Orin |
| Mission givers | Elira / Rowan / Sister Vale |
| Animals | Ecosystem beach/tropical set around town |
| Safe zone | `worldMapSectors.haven_shore.isSafeZone = true` |

**Play entry:**

```
/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port
```

---

## Water rule (no duplications)

1. `buildZoneScene` creates **one** Gerstner/ocean mesh (`createOceanMesh`).
2. Foundation loader **removes** Fruzer nodes matching `Water`, `Cube`, colliders/triggers, meme junk.
3. `removeDuplicateWaterMeshes(scene, keepOcean)` runs after parent.
4. Never parent Fruzer water into the zone.

---

## Harvest database UUIDs

Stable keys (not random per session):

```
uuid:haven-shore-v1:harvest:<slug>:<###>
```

Each row has: `resourceId`, `profession`, `position`, `respawnSec`, `yield`, `tier`.  
Injected into `zonePopulation.nodes` in `Island3DEngine.initZone` via `havenHarvestToZoneNodes()`.

Default respawn: biome ecosystem **4h** (`HARVEST_REGEN_MS`); herbs/fish use faster town timers.

---

## Vendors (4) + missions

| Role | Name | serviceId |
|------|------|-----------|
| General | Mira Saltworth | `shop_haven_general` |
| Weapons | Brann Ironhook | `shop_haven_weapons` |
| Provisions | Tessa Greenbarrel | `shop_haven_provisions` |
| Shipwright | Captain Orin Keel | `shop_haven_shipwright` |

Friendly missions: `HAVEN_MISSIONS` (first harvest, fish run, scout east, pirate spot, crypt path).

---

## Upload (R2)

```
models/warlords/haven_shore/fruzer_islands.glb
```

Local public path mirrors that key for Vite.

---

## Not this sector

| Map family | Do not use Haven Fruzer as… |
|------------|-----------------------------|
| `player_home_block` | Home 3×3 cell geometry |
| `chicken_gun_pirate_lobby` | Lobby map (different GLTF: pirate-islands) |
| Genesis PvP | Battleground id |

See **[WORLD_MAP_TRUTH.md](./WORLD_MAP_TRUTH.md)** for current truth vs canonical 9-sector map.
