# Playtesting & Character Studio

How to unblock character creation, run the full stack locally, and open edit/play routes.

---

## Character tokens (Warlords era)

Warlords-era heroes (`gameEra: "warlords"`) consume **character tokens** on the account row (`accounts.character_tokens`).

| Rule | Detail |
|------|--------|
| New account | Starts with **1** free token |
| Create Warlords character | Costs **1** token |
| Boss clear | `POST /api/island/boss-clear` grants **+1** token |
| Era slots | Separate limit — up to **5** Warlords roster slots (`era_slots.warlords.max`) |

If creation fails with *"No character tokens available. Defeat a boss to earn one!"*, your token balance is `0`.

---

## Quick unblock (production)

### A — Boss-clear cheat (authenticated)

```javascript
fetch('/api/island/boss-clear', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('grudge_auth_token'),
  },
  body: JSON.stringify({ zoneX: 0, zoneY: 0 }),
}).then((r) => r.json()).then(console.log);
```

### B — Admin grant (Railway)

```bash
curl -X POST "https://grudge-api-production-0d46.up.railway.app/api/admin/grant-character-tokens" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -d '{"userId":"YOUR_USER_ID","amount":5}'
```

### C — Play with an existing character

Skip creation — open play routes directly (see table below).

---

## Local dev (tokens skipped automatically)

```bash
cd Grudge-Builder
# .env.local — set DATABASE_URL to Railway Postgres
npm run dev
```

`NODE_ENV=development` skips token consumption on `POST /api/characters`.

Optional production playtest flag on Railway:

```bash
DEV_UNLIMITED_CHARACTER_TOKENS=true
```

Seed game data once:

```bash
curl -X POST http://localhost:5000/api/admin/seed
```

### Legacy create flows (skip GCS redirect)

| URL | Purpose |
|-----|---------|
| `http://localhost:5000/create-character?legacy=1` | In-app class/race wizard |
| `http://localhost:5000/character-creator?legacy=1` | Same, alternate route |

---

## Character Studio (production edit)

Canonical visual builder:

```
https://character.grudge-studio.com?era=warlords&mode=create
```

Warlords SPA redirects here by default (`gcsRedirect.ts`). Append `?legacy=1` on grudgewarlords.com routes to stay in the React wizard.

---

## Test play with a real character (production)

Use these after signing in at [id.grudge-studio.com](https://id.grudge-studio.com). The client loads your hero from **Railway Postgres** (`/api/characters`), not guest mocks.

| Step | URL |
|------|-----|
| Pick / activate hero | https://grudgewarlords.com/account |
| Character hub (post-create) | https://grudgewarlords.com/game/character |
| **Test play (open world)** | https://grudgewarlords.com/test-play |
| Same engine, canonical path | https://grudgewarlords.com/play |
| Force a specific hero | https://grudgewarlords.com/test-play?characterId=YOUR_CHAR_UUID |

`/test-play` and `/play` share the same 3D world. If `localStorage` has no active character, the app falls back to your Warlords era roster (`era_slots.warlords.activeCharacterId`, then first hero).

Legacy in-app create (skips GCS redirect): https://grudgewarlords.com/create-character?legacy=1

---

## Play & edit routes

| Route | Mode |
|-------|------|
| `/test-play` | Same as `/play` — explicit playtest entry with DB roster fallback |
| `/play` | Open world — Colyseus `WorldRoom` / sectors |
| `/home-island` | Persistent island + `HomeIslandRoom` |
| `/tutorial` | Combat tutorial |
| `/island-3d` | 3D zone (`?mode=zone`, `?mode=lobby`, `?engine=legacy`) |
| `/admin-island-3d` | Admin island tooling |
| `/character` | Roster management |
| `/professions` | Crafting / gathering |

### Colyseus endpoints

| Env | WebSocket base |
|-----|----------------|
| Local dev | `ws://localhost:5000` |
| Production VPS | `ws://74.208.174.62:2567` (set `VITE_COLYSEUS_URL` on Vercel) |
| Railway bundled | Same host as game API (`VITE_GAME_DATA_API`) |

Client resolver: `client/src/lib/colyseusEndpoint.ts` — prefers `VITE_COLYSEUS_URL`, then game-data API.

---

## Admin endpoints (playtest)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/admin/grant-character-tokens` | `X-Admin-Key` or dev mode |
| POST | `/api/admin/reset-account?userId=` | Admin — restores `character_tokens: 1` |
| POST | `/api/island/boss-clear` | Bearer JWT |
| POST | `/api/admin/seed` | Admin / dev |

See [API.md](./API.md) and [BACKEND.md](./BACKEND.md) for full route lists.