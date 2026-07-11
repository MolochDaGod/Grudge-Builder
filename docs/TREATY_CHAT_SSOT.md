# Treaty Chat — Grudge ID Social SSOT

**Status:** production (Railway Postgres)  
**Scope:** account-level friends, 1:1 DMs, and groups — **not** character-scoped.

## Architecture

```
Any Grudge app (wallet FAB / /treaty / grudge-fleet.js)
        │  Bearer JWT (grudge_auth_token)
        ▼
  /api/treaty/*  ──same-origin rewrite──►  Railway grudge-api-production
        │
        ▼
  Postgres: treaty_friends · treaty_dm_threads · treaty_messages
            treaty_groups · treaty_group_members · treaty_group_messages
```

- **Identity:** Grudge session JWT → `users` → `accounts.id`
- **Lookup:** friend/invite by `GRUDGE_*` id or display name
- **Transport:** REST poll (5s client); Discord/Telegram bridges share the same service for DMs
- **Not CF:** Durable Objects / WS only for future push/presence — do **not** move history to Cloudflare

## Surfaces

| Surface | Path / entry |
|---------|----------------|
| Full Treaty app | `/treaty` (Warlords / client) |
| Wallet modal | Grudge token FAB → Treaty tab |
| Account page | `/account` → Treaty card |
| Fleet satellites | `/api/treaty/*` via `buildFleetSatelliteRewrites()` |
| Vanilla games | `GrudgeFleet.getTreatySocial()` etc. (`grudge-fleet.js` ≥ 2.6.0) |
| Discord / Telegram | `/api/discord/treaty/*`, `/api/telegram/treaty/*` (friends + DMs) |

## API (auth required)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/treaty/social` | Friends + pending |
| POST | `/api/treaty/friends/request` | `{ query }` Grudge ID or name |
| POST | `/api/treaty/friends/:id/respond` | `{ accept }` |
| GET/POST | `/api/treaty/dm/threads` | List / open thread |
| GET/POST | `/api/treaty/dm/threads/:id/messages` | History / send |
| GET/POST | `/api/treaty/groups` | List / create `{ name, members? }` |
| GET | `/api/treaty/groups/:id` | Detail + members |
| POST | `/api/treaty/groups/:id/invite` | `{ query }` |
| POST | `/api/treaty/groups/:id/leave` | Leave / transfer owner |
| GET/POST | `/api/treaty/groups/:id/messages` | Group chat |
| GET | `/api/treaty/unread` | DM + group unread count |

## Migrations

```bash
npm run db:migrate:008   # treaty groups + ensure friends/DM tables
# or ensure-auth-schema.mjs (bootstraps all treaty tables)
```

## Rules

1. Always key social graph to **account_id**, never character UUID.
2. DM send requires accepted friendship.
3. Groups: owner/admin invite; last owner leave deletes group or transfers ownership.
4. Same JWT keys as fleet auth (`grudge_auth_token`, …).
