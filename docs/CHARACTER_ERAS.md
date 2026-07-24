# Character eras (production SSOT)

**Engine Account DB** (Railway `grudge-api`) holds all fleet hero rows.  
Scope by `characters.game_era` + `accounts.era_slots`.

## Production matrix

| Era | Pipeline (`model3d.renderPipeline`) | Slots | Create surface | Play |
|-----|--------------------------------------|-------|----------------|------|
| **warlords** | **grudge6** | **4** | character.grudge-studio.com/foundry | client.grudge-studio.com |
| **nexus** | **toon** | **12** | select/link the 12 Toon RTS heroes | mine / nexus titles |
| **voxel** | **voxel** | **4** | voxel / Explorer shell | mine.grudge-studio.com `#/play?era=voxel` |
| **armada** | armada_ship (ships only) | **0** | **none** — no characters | armada ships later |

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
