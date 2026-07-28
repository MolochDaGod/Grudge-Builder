# Character eras (production SSOT)

**Engine Account DB** (Railway `grudge-api`) holds all fleet hero/mech rows.  
Scope by `characters.game_era` + `accounts.era_slots`.

## Production matrix

| Era | Pipeline | Interim mesh | Slots | Create / avatar | Play | Worlds |
|-----|----------|--------------|-------|-----------------|------|--------|
| **warlords** | **grudge6** | — | **4** | Foundry `character.grudge-studio.com/foundry` | **client.grudge-studio.com** (`/heroes` seaside) | Islands / zones on client |
| **nexus** | **toon** (soon) | **voxel avatars** until toon kits ship | **12** | GCS `?era=nexus` (may stand on voxel avatar) | **Grudox** `grudox.grudge-studio.com` | Grudox title / fleet play |
| **voxel** | **voxel** | — | **4** | GCS `?era=voxel` — race / explorer avatars | **Mine-Loader** deployers `#/play` | **Mine-Loader maker** / lobby worlds |
| **armada** | **mech** | — | **4** | **Mech Builder** (`grudge-studio.com/mech-armada`) | **mech-playground.vercel.app** | Hangar / arena |

Code: `shared/definitions/gameEras.ts`  
DB default: `accounts.era_slots` JSON (see schema.ts)

### Delivery notes

| Era | Detail |
|-----|--------|
| **Nexus toon** | Full Toon RTS roster is **being built**. Until ready: load **voxel pipeline** meshes (`interimPipeline: 'voxel'`). **Play host is Grudox**, not Mine-Loader. |
| **Voxel** | Avatars = voxel race/explorer kits. **Play** = Mine-Loader game deployers; **worlds** = Mine-Loader maker / lobby seeds. |
| **Warlords** | grudge6 only on client; no airship painting on `/heroes`. |
| **Armada** | Mechs from Mech Builder — **not** naval ships as the player roster. |

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
