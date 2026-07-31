# Canonical identity & Warlords character SSOT

**Status:** LAW — do not invent parallel systems.  
**Fleet bridge:** `client/public/grudge-fleet.js` ≥ **2.8.0**  
**Crafting suite:** `grudge-crafting.html` ≥ **5.7.0**

## One diagram

```
email / Discord / Puter / wallet  →  LINK only
              ↓
        grudge_id (users)  ← JWT from id.grudge-studio.com
              ↓
   ┌──────────┴──────────┐
   │                     │
 account bag           characters (gameEra=warlords)
 /api/account/*        UUID primary key
 /api/inventory/*      /api/characters?era=warlords
   │                     │
   └──────────┬──────────┘
              ↓
     Railway Postgres (ONLY player-state SSOT)
```

## IDs (never confuse)

| ID | Meaning | Use for |
|----|---------|---------|
| **`grudge_id`** | Human account | Auth, bag, ownership of heroes |
| **character UUID** | One Warlords hero row | Equipment, professions, island, play session |
| **`grudgeCode`** | `GRDG-…` stamp | Display / support — **not** DB PK |
| Puter / Discord / email | Login links | Must resolve to same `grudge_id` |

## Surfaces

| Surface | Role |
|---------|------|
| `id.grudge-studio.com` | Login, register, JWT mint |
| Railway `grudge-api-production` | Characters, bag, progress, island |
| `character.grudge-studio.com?era=warlords` | Create / edit heroes → Railway |
| `grudgewarlords.com` | Game shell (lobby, tutorial, play, island) |
| `grudge-crafting.puter.site` | Craft UI — same Railway + JWT |
| ObjectStore / info | Recipe **definitions** only |
| R2 `assets.grudge-studio.com` | Binaries only |
| D1 | Asset registry index only |
| Puter KV | Optional cache — **never** roster SSOT |

## Client enforcement (2.8+)

1. **JWT `grudge_id` ≠ stored account** → clear session + `grudge:auth:mismatch`.
2. Roster fetch: **`era=warlords` only** (filter defensive).
3. **Active character** must be a UUID on that roster; else clear.
4. **`selectCharacter` rejects** foreign UUIDs.
5. Puter hosts use **absolute Railway URL** (no fake same-origin `/api`).

## Crafting auth UX (5.7+)

- **Sign in** → Grudge ID (`redirect_uri` back to crafting)
- **Create account** → Grudge ID `?mode=register`
- **Switch account** → sign out + login
- **Sign out** → clear JWT + active UUID
- Gate: pick owned warlord UUID before suite unlocks

## Probes

```bash
npm run probe:truth:direct
npm run probe:truth
```

Must include: identity login, characters `?era=warlords` (auth-gated 401 OK), crafting shell, Railway health.

## Banned

- `api.grudge-studio.com` as identity  
- Puter guest as primary Warlords account  
- D1 / ObjectStore / localStorage as character SSOT  
- Account bag on character PATCH  
- Active character from another `grudge_id`

## Merge path (ops)

When a user has two `grudge_id`s (Puter guest + real ID):

1. Identify both ids in Railway `users` / auth link tables.  
2. Move characters + bag to the **canonical** grudge_id.  
3. Link Puter/Discord/email onto that id.  
4. Invalidate JWTs for the orphan id.  
5. User signs in once via Grudge ID → one roster.

### Runtime (code SSOT)

| Path | Behavior |
|------|----------|
| `server/lib/identityLink.ts` | Resolve Discord/Puter by provider id **or email** → one `users` row; stamp `discord_*` / `puter_*` columns |
| Discord callback | Uses `resolveDiscordGrudgeAccount` — **no new grudge_id** when email matches |
| Puter `/api/auth/puter*` | Uses `resolvePuterIdentity` — same email merge |
| `POST /api/auth/puter-link` | Stamps Puter onto **authenticated** user (no stub) |

### Admin merge script (grudachain)

```bash
# dry-run
node scripts/merge-identity-grudachain.mjs
# apply
node scripts/merge-identity-grudachain.mjs --confirm
```

**Canonical production admin (2026-07-29 proof):**

| Field | Value |
|-------|--------|
| username | `GRUDACHAIN` |
| **grudge_id** | **`GRUDGE_MPOUIQCG529CA`** |
| email | `grudgedev@gmail.com` |
| discord_id | `1292303312334618695` (`grudgelegion_11303`) |
| puter_user_id | `ae19bdda-af53-4421-838f-ca5958be63b0` |
| warlords characters | **27** |
| client alias (metadata only) | `GRUDGE_MS5O7IJUA54E6` (not a second DB row) |

Orphan Discord row `GID-48fb4fcf` was soft-merged (`auth_method=merged_orphan`).  
**JWT / fleet must use `GRUDGE_MPOUIQCG529CA`**, not the client alias alone.
