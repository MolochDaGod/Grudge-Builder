# Character eras (production SSOT)

**Engine Account DB** (Railway `grudge-api`) holds all fleet hero rows.  
Scope by `characters.game_era` + `accounts.era_slots`.

## Production matrix

| Era | Pipeline (`model3d.renderPipeline`) |Slots | Create surface | Play / delivery |
|-----|--------------------------------------|-------|----------------|-----------------|
| **warlords** | **grudge6** | **4** | character.grudge-studio.com/foundry | **client.grudge-studio.com** (`/heroes` seaside roster — **no airship painting**) |
| **nexus** | **toon** | **12** | select/link the 12 Toon RTS heroes | **mine-loader.vercel.app** `#/play` |
| **voxel** | **voxel** | **4** | voxel / Explorer shell | **mine-loader.vercel.app** `#/play` |
| **armada** | armada_ship (ships only) | **0** | **none** — no characters | armada ships later |

### Delivery conflicts (resolved)

| Mistake | Correct |
|---------|---------|
| Mix voxel into Warlords `/heroes` | Warlords page = `era=warlords` only |
| Paint airship plate on `/heroes` | Purged → seaside sector cinema |
| Voxel play URL `mine.grudge-studio.com` | `mine-loader.vercel.app/#/play` |
| Armada hero slots | Always **0** — ships only |

Code: `shared/definitions/gameEras.ts`  
DB default: `accounts.era_slots` JSON (see schema.ts)

## Rules

1. **One Grudge ID → many characters**, each tagged `gameEra`.
2. **Foundry = Warlords grudge6 create only** (not Nexus/Voxel mesh forge).
3. **Armada create always 403** (`eraAllowsCharacters('armada') === false`).
4. **Pipeline is server-forced** from era — clients cannot save warlords with `toon` pipeline.
5. Account bag / GBUX = `/api/account/*` (shared across eras).
6. List: `GET /api/characters?era=warlords|nexus|voxel`.

## Foundry

- `?era=warlords` (default) → 4-slot hub + `/foundry` grudge6 create  
- `?era=nexus` → 12-slot select (toon), create only if product allows  
- `?era=voxel` → 4-slot voxel select  
- `?era=armada` → message: no characters  

## Migration note

Legacy rows with `eraSlots.warlords.max=5` or `armada.max=2` are **clamped** by `mergeEraSlots()` on every account read/create.
