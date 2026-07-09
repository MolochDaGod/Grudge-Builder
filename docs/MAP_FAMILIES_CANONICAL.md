# Map Families — Canonical Separation

**Updated:** 2026-07-09  
**Code SSOT:** `shared/definitions/mapRegistry.ts`  
**ObjectStore:** https://info.grudge-studio.com/api/v1/map-registry.json  

## Two different “9 sector” systems

| | **Warlords Era Open World** | **Player Home Block** |
|--|----------------------------|------------------------|
| **Family id** | `warlords_era_open_world` | `player_home_block` |
| **What** | Shared MMO macro world | Personal 3×3 on 100×100 grid |
| **IDs** | `haven_shore`, `ethereal_falls`, … | `TL`…`MC_HOME`…`BR` |
| **Count** | 9 fixed biomes | 9 cells **per player** |
| **Source** | `worldMapSectors.ts` | `worldMap.ts` |
| **Entry** | `/play?mode=zone&sector=…` | `/home-island` |
| **Seed** | `grudge-world-1` | per-account home seed |

**Never** pass `haven_shore` into home-block slot APIs, or `MC_HOME` into Colyseus sector join.

Legacy grid `NW`…`SE` bridges **only** to Warlords era sectors (`sectorBridge.ts`).

---

## Other map families (not those two)

| Family | What | Entry |
|--------|------|--------|
| **Tactical ocean view** | Sail camera over **Warlords era** 9 (same IDs). Also TI at water.grudge-studio.com | `/ocean`, `/world-map`, water.grudge-studio.com |
| **Chicken Gun pirate lobby** | PolygonPirates GLTF lobby (`pirate-islands`) | `/island-3d?mode=lobby&map=pirate-islands`, `/rts-grudge` |
| **Home island** | Personal ~1024m procedural seed (home-block center gameplay) | `/home-island` |
| **Event islands** | Rotating surround cells `type=event` + seasonal | via home block / missions |
| **Battle arenas** | Instanced RPG arenas + grudge-arena | `/rpg-battle`, arena.grudge-studio.com |
| **PvP battlegrounds (Genesis)** | Warlord Genesis mode from in-game PvP UI | warlord-genesis.vercel.app, `/rts-grudge` modes |

---

## Entry cheat-sheet

```
Warlords open world:  /play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1
Tactical sail:        /ocean?worldSeed=grudge-world-1
Home island:          /home-island
Pirate lobby:         /island-3d?mode=lobby&map=pirate-islands
RTS / PvP UI:         /rts-grudge  → quick-match | faction-war | siege | genesis
Genesis host:         https://warlord-genesis.vercel.app
Arena:                https://arena.grudge-studio.com
Tactical Infinity:    https://water.grudge-studio.com
```

---

## Engine modes (`Island3DEngine`)

| `mode` | Map family |
|--------|------------|
| `zone` | Warlords era open world |
| `lobby` | Chicken Gun pirate lobby |
| `procedural` | Home / tutorial / test islands |

---

## Guards

`assertMapIdForFamily(family, id)` in `mapRegistry.ts` — used by `warlordsWorldApi.resolveDeployableSectorId` so home-block slot names cannot enter era play.
