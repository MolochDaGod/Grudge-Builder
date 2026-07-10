# Character identity (canonical)

> Fleet SSOT for **hero** creation. Account SSO ids (`users.grudge_id` / `GRUDGE_…`) are separate.

## Three identifiers

| Field | Example | Owner |
|-------|---------|--------|
| `id` | `a1b2c3d4-…` | Postgres PK (`gen_random_uuid`) |
| `grudgeCode` | `GRDG-HUMWAR-W7ZXH4` | `shared/characterIdentity.ts` |
| `name` | `Ragnar` | Player-chosen display name |

## Create endpoint (only write path)

```
POST https://grudge-api-production-0d46.up.railway.app/api/characters
```

Same-origin on every fleet app: `/api/characters` → Vercel/CF rewrite → Railway.

Handler: `GrudgeBuilder/server/routes.ts`  
Insert: `storage.createCharacter` → table `characters`  
Identity: `resolveHeroIdentity()` always runs on the server.

## Who creates heroes

| Surface | Domain | Client |
|---------|--------|--------|
| **Foundry (canonical UI)** | character.grudge-studio.com | character-viewer `useSaveCharacter` |
| GCS / HYDRA save | character.grudge-studio.com / GCS | `grudgeAPI.createCharacter` |
| Warlords builder | grudgewarlords.com | `CharacterManager.addCharacter` / `characterAPI.create` |
| Fleet SDK | any | `GrudgeAccountSDK.createCharacter` |

All of the above **must** call `POST /api/characters` with a player `name`.  
Optional client `grudgeCode` is accepted; server stamps one if missing.

## Generator

```ts
// GRDG-{first 3 of race}{first 3 of class}-{base36 time}{rand}
makeCharacterGrudgeCode("human", "warrior") // → GRDG-HUMWAR-…
```

## Progress is keyed by UUID (not grudgeCode)

All profession XP, class skills, weapon mastery, attributes, and equipment are **per `characters.id`**.  
Account inventory is **shared**. Full contract: **[CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md)**.

| Write path | Notes |
|------------|--------|
| `POST /api/characters/:id/progress` | Preferred — revision + mastery validation |
| `PATCH /api/characters/:id` | Same validation when body is progress-shaped |
| `grudge-fleet.js` → `saveCharacterProgress` | Fleet client (Puter apps, skill-tree, mastery) |

## Migration

`migrations/006_character_grudge_code.sql` adds `characters.grudge_code` and backfills rows whose `name` already looked like `GRDG-…`.

Apply on Railway:

```bash
# from GrudgeBuilder with DATABASE_URL set
node scripts/run-migration-006.mjs
# or pipe the SQL via your existing apply-sql-migrations flow
```
