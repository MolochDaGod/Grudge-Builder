# Character eras (production SSOT)

**Engine Account DB** (Railway `grudge-api`) holds all fleet hero rows.  
Scope by `characters.game_era` + `accounts.era_slots`.

## Production matrix

| Era | Pipeline (`model3d.renderPipeline`) | Slots | Create surface | Play / delivery |
|-----|--------------------------------------|-------|----------------|-----------------|
| **warlords** | **grudge6** | **4** | character.grudge-studio.com/foundry | **client.grudge-studio.com** (`/heroes` seaside roster — **no airship painting**) |
| **nexus** | **toon** | **12** | select/link the 12 Toon RTS heroes | **mine-loader.vercel.app** `#/play` |
| **voxel** | **voxel** | **4** | voxel / Explorer shell | **mine-loader.vercel.app** `#/play` |
| **armada** | **mech** | **4** | **Mech Builder / Mech Forge** (`grudge-studio.com/mech-armada`, `mech-playground`) | **mech-playground.vercel.app** |

### Delivery conflicts (resolved)

| Mistake | Correct |
|---------|---------|
| Mix voxel into Warlords `/heroes` | Warlords page = `era=warlords` only |
| Paint airship plate on `/heroes` | Purged → seaside sector cinema |
| Voxel play URL `mine.grudge-studio.com` | `mine-loader.vercel.app/#/play` |
| Armada = naval ships / 0 slots | **Armada = mechs from Mech Builder** (4 loadout slots, pipeline `mech`) |

Code: `shared/definitions/gameEras.ts`  
DB default: `accounts.era_slots` JSON (see schema.ts)

## Rules

1. **One Grudge ID → many characters / builds**, each tagged `gameEra`.
2. **Foundry = Warlords grudge6 create only** (not Nexus/Voxel mesh forge).
3. **Armada = Mech Builder mechs** (`eraAllowsCharacters('armada') === true`, 4 slots) — not ship hulls as the player roster.
4. **Pipeline is server-forced** from era — clients cannot save warlords with `toon` pipeline; armada forces `mech`.
5. Account bag / GBUX = `/api/account/*` (shared across eras).
6. List: `GET /api/characters?era=warlords|nexus|voxel|armada`.

## Foundry / create surfaces

- `?era=warlords` (default) → 4-slot hub + `/foundry` grudge6 create  
- `?era=nexus` → 12-slot select (toon)  
- `?era=voxel` → 4-slot voxel select  
- `?era=armada` → Mech Builder / hangar (mech chassis + parts)  

## Migration note

Legacy rows with `eraSlots.warlords.max=5` or `armada.max=0` (old “ships only” law) are **clamped/raised to product DEFAULT** by `mergeEraSlots()` on every account read/create (`armada.max` → **4**).
