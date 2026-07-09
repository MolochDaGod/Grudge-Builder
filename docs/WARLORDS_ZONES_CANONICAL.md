# Open-World Zones — Canonical Entry Map

**Last updated:** 2026-07-09  
**Genre:** Freeform ARPG (not rigid class-role MMO)  
**World seed:** `grudge-world-1`  
**Client:** https://client.grudge-studio.com  
**Info hub:** https://info.grudge-studio.com/api/v1/warlords-zones.json  
**Catalog:** https://info.grudge-studio.com/api/v1/warlords-catalog.json  

## Character truth (freeform)

| Layer | Role |
|-------|------|
| **Race** | Body mesh only (`human` / `elf` / `orc` / `dwarf` / `barbarian` / `undead`) |
| **Equipment** | Any weapon + any armor — mesh swaps + anim set from gear |
| **Class** | Optional flavor / tiny starter stat lean — **not** an equip or skill gate |
| **Colors** | `skinColor` / `armorColor` multiply tints; albedo maps sRGB |
| **Anims** | `weaponTypeFromModel3d(equipment)` — not class maps |

## Important: how `/play` works

| URL | What loads |
|-----|------------|
| `/play` | **Open world** — defaults `mode=zone`, `sector=haven_shore`, seed `grudge-world-1` |
| `/play?sector=<id>&mode=zone&worldSeed=grudge-world-1` | Full 10 km sector |
| `/test-play` or `mode=procedural` | Procedural test terrain only |
| `/ocean?worldSeed=grudge-world-1` | Ocean hub → land → deploy into zone |
| `/home-island` | Personal home island |

Canonical sector IDs are **snake_case**. Legacy grid keys (`NW`…`SE`) resolve via `sectorBridge.ts`.

### Dual SSOT (must stay aligned)

1. **Terrain generation:** `GrudgeBuilder/shared/definitions/worldMapSectors.ts` (bundled)  
2. **Entry / catalog:** ObjectStore `warlords-zones.json` + `warlords-catalog.json`  
3. Runtime check: `verifyMapDeploymentTruth()` on play load  

---

## All 9 map zones — game entry ready

| # | Zone ID | Name | Biome | Diff | Safe | Grid | Entry ready | Play URL |
|---|---------|------|-------|------|------|------|-------------|----------|
| 1 | `haven_shore` | Haven Shore | tropical | 1–3 | **Yes** | S (1,2) | **Yes** (starter) | [play](https://client.grudge-studio.com/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1) |
| 2 | `stormbreak_reef` | Stormbreak Reef | storm | 3–6 | No | W | **Yes** | [play](https://client.grudge-studio.com/play?sector=stormbreak_reef&mode=zone&worldSeed=grudge-world-1) |
| 3 | `thornwood_wilds` | Thornwood Wilds | forest | 3–7 | No | NE | **Yes** | [play](https://client.grudge-studio.com/play?sector=thornwood_wilds&mode=zone&worldSeed=grudge-world-1) |
| 4 | `frostbite_expanse` | Frostbite Expanse | frozen | 4–7 | No | N | **Yes** | [play](https://client.grudge-studio.com/play?sector=frostbite_expanse&mode=zone&worldSeed=grudge-world-1) |
| 5 | `ember_depths` | Ember Depths | volcanic | 5–9 | No | SE | **Yes** | [play](https://client.grudge-studio.com/play?sector=ember_depths&mode=zone&worldSeed=grudge-world-1) |
| 6 | `ashen_wastes` | Ashen Wastes | desert | 5–8 | No | E | **Yes** | [play](https://client.grudge-studio.com/play?sector=ashen_wastes&mode=zone&worldSeed=grudge-world-1) |
| 7 | `ethereal_falls` | Ethereal Falls | ethereal | 6–9 | No | NW | **Yes** | [play](https://client.grudge-studio.com/play?sector=ethereal_falls&mode=zone&worldSeed=grudge-world-1) |
| 8 | `abyssal_trench` | Abyssal Trench | abyssal | 7–10 | No | SW | **Yes** | [play](https://client.grudge-studio.com/play?sector=abyssal_trench&mode=zone&worldSeed=grudge-world-1) |
| 9 | `convergence_nexus` | Convergence Nexus | nexus | 7–10 | Contested | CENTER | **Yes** | [play](https://client.grudge-studio.com/play?sector=convergence_nexus&mode=zone&worldSeed=grudge-world-1) |

### Systems online per zone

- Terrain3D (255 segments, spawn points, maxPlayers ≥ 64)
- Deterministic `generateZonePopulation(sector, grudge-world-1, …)`
- Regenerative harvest (trees/rocks/crystals/herbs/scrap) + fish in water
- Wildlife biome palette + fish (respawn 1–5 min)
- Faction NPC camps (`stylized_enemy_camp_scene.glb`)
- Docks / island children
- Colyseus sector join path
- Ocean anchors for tactical sailing

### Not sector maps (separate entries)

| Entry | URL | Ready |
|-------|-----|-------|
| Home island | `/home-island` | Yes |
| Ocean hub | `/ocean?worldSeed=grudge-world-1` | Yes |
| Pirate lobby | `/island-3d?mode=lobby&map=pirate-islands` | Yes |

---

## Deployment map

| Concern | Host |
|---------|------|
| Client SPA | `client.grudge-studio.com` (also grudgewarlords.com) |
| Static game data | `info.grudge-studio.com` / `objectstore.grudge-studio.com` |
| Client → ObjectStore proxy | `/api/objectstore/v1/*` |
| Binary assets | `assets.grudge-studio.com` (R2) |
| Player state | `api.grudge-studio.com` (Railway) |

---

## Catalog snapshot

See **https://info.grudge-studio.com/api/v1/warlords-catalog.json** (v1.1+).

### Wildlife (runtime — 24)
Land animals, birds, fish, reef shark — dry land vs water placement rules in catalog.

### NPC camps
Base GLB + faction variants; upgrades: bench, storage, tower, flag, fire.

### Build
Ghost color `#64b5f6`, LMB place, R rotate.

### Ships
Catalog rowboat / sloop / galleon (raft ladder planned).
