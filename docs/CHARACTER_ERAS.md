# Character eras (production SSOT)

**One physical player store:** Railway Postgres `grudge-api` (`ERA_PLAYER_DATABASE`).  
Scope heroes with `characters.game_era`. Account bag / wallet / home island are **not** per-era.

Do not invent a second roster or bag DB. Do not collapse brands.

## Production matrix

| Era | Brand | Pipeline | Slots | Create | Play | Worlds |
|-----|-------|----------|------:|--------|------|--------|
| **warlords** | Grudge Warlords | grudge6 | **4 characters** | `character.*/foundry?era=warlords` | **`warlords.grudge.studio`** airship (`/combat`) — live alias **grudgewarlords.com** — **not** `/heroes` | islands / zones |
| **voxel** | GRUDOX / Grudges | voxel | **4** | `character.*?era=voxel` | **grudox.grudge-studio.com** (optional `voxel.grudge.studio`) | Mine-Loader maker |
| **nexus** | Nexus | toon (interim) | **4 characters** | `character.*?era=nexus` | **`nexus.grudge.studio/heroes`** (interim `client.grudge-studio.com/heroes`) | — |
| **armada** | Mech | mech | **4** | Mech Builder | mech-playground | hangar |

Code: `shared/definitions/gameEras.ts`  
DB: `accounts.era_slots` + `characters.game_era`  
Auth: `id.grudge-studio.com` only — **guest product login is closed**.

### Resolved mismatches

| Wrong | Correct |
|-------|---------|
| One DB per game / era | One Railway Postgres; filter `?era=` |
| Warlords `/heroes` as 4-slot | **One** Warlords 4-character surface: **airship** (`grudgewarlords.com/combat`). `/heroes` is **Nexus only**. |
| Calling airship heroes “crew” | **Crew** = RTS units on ships/camps. Airship shows **4 Warlords characters**, not crew. |
| Nexus 4-char on warlords SPA | Nexus = **`client.grudge-studio.com/heroes`** only |
| GRUDOX = Nexus toon | GRUDOX = **voxel** cabinets |
| `foundry.grudgewarlords.com` = play SPA | Redirect → `character.grudge-studio.com/foundry` |
| Guest auto-heroes | 403; create via Grudge ID + Foundry |

## Rules

1. One Grudge ID → many era-scoped heroes (`gameEra`).
2. Foundry create for Warlords grudge6 (`/foundry?era=warlords`).
3. GRUDOX cabinets never replace Warlords play.
4. Bag / GBUX = `/api/account/*` (shared).
5. List: `GET /api/characters?era=warlords|nexus|voxel|armada`.
6. Handoff: `?characterId=<uuid>&era=` only.

`mergeEraSlots()` clamps `eraSlots.max` to this table on every account read.
