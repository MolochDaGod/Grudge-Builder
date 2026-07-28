# Character eras (production SSOT)

**Engine Account DB** (Railway `grudge-api`) holds all fleet hero/mech rows.  
Scope by `characters.game_era` + `accounts.era_slots`.

## Production matrix

| Era | Pipeline | Interim mesh | LED face | Slots | Create / avatar | Play | Worlds |
|-----|----------|--------------|----------|-------|-----------------|------|--------|
| **warlords** | **grudge6** | — | none | **4** | Foundry | **client.grudge-studio.com** | Islands / zones |
| **nexus** | **toon** (soon) | **voxel avatars** | **default** (LED smile) | **12** | GCS `?era=nexus` | **Grudox** | Grudox |
| **voxel** | **voxel** | — | **default** (LED smile) | **4** | GCS race/explorer avatars | **Mine-Loader** `#/play` | **Maker** / lobby |
| **armada** | **mech** | — | **backup** (if pilot head missing) | **4** | **Mech Builder** | **mech-playground** | Hangar |

**LED face** = Open LED Mask style cyan smile visor on cube head (`ledFaceDefault.ts`, keys `ledmask:avatarConfig:v1` / Avatar Edit). Shared with gameopen `#/ledmask`.

Code: `shared/definitions/gameEras.ts`  
DB default: `accounts.era_slots` JSON (see schema.ts)

### Delivery notes

| Era | Detail |
|-----|--------|
| **Nexus toon** | Toon kits **soon**. Until then: **voxel mesh + LED face default**. **Play = Grudox**. |
| **Voxel** | Race/explorer avatars + **LED face default**. **Play** = Mine-Loader deployers; **worlds** = maker / lobby. |
| **Warlords** | grudge6 only; no LED cube default (full race kits). |
| **Armada** | Mechs from Mech Builder; **LED face = backup** when mesh/head missing. |

### Delivery conflicts (resolved)

| Mistake | Correct |
|---------|---------|
| Mix voxel into Warlords `/heroes` | Warlords page = `era=warlords` only |
| Paint airship plate on `/heroes` | Purged → seaside sector cinema |
| Nexus play = Mine-Loader | Nexus play = **Grudox** |
| Grudox alias → voxel era | Grudox alias → **nexus** |
| Armada = ships / 0 slots | Armada = **mechs**, 4 slots |

## Rules

1. **One Grudge ID → many characters / builds**, each tagged `gameEra`.
2. **Foundry = Warlords grudge6 create only** (not Nexus/Voxel mesh forge).
3. **Armada = Mech Builder mechs** (4 slots, pipeline `mech`).
4. **Nexus** uses `effectivePipelineForEra('nexus')` → **voxel** interim until toon ships.
5. **Pipeline is server-forced** from era where possible; clients use `defaultPipelineForEra` / `effectivePipelineForEra`.
6. Account bag / GBUX = `/api/account/*` (shared across eras).
7. List: `GET /api/characters?era=warlords|nexus|voxel|armada`.

## Create surfaces

- `?era=warlords` → Foundry grudge6  
- `?era=nexus` → GCS nexus (interim voxel avatar OK)  
- `?era=voxel` → GCS voxel race avatars  
- `?era=armada` → Mech Builder hangar  

## Migration note

Legacy `eraSlots` max values are **clamped to product DEFAULT** by `mergeEraSlots()` on every account read/create.
