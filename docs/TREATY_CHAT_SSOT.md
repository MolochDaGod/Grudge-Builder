# Treaty Chat — Grudge ID Social + Fleet Server Chat SSOT

**Status:** production (Railway Postgres)  
**Scope:** account-level friends, 1:1 DMs, groups, and **server/fleet chat channels** for every Grudge game and studio page.

## Architecture

```
Any Grudge app / studio page
   │  Bearer JWT (grudge_auth_token)  OR  grudge-fleet.js / treaty-embed.html
   ▼
same-origin /api/treaty/*  ──Vercel rewrite──►  Railway grudge-api-production
   │
   ▼
Postgres (account-scoped):
  treaty_friends · treaty_dm_threads · treaty_messages
  treaty_groups · treaty_group_members · treaty_group_messages
  treaty_server_channels · treaty_server_messages   ← fleet + per-game server chat
```

| Rule | Detail |
|------|--------|
| Identity | JWT → `users` → `accounts.id` (never character UUID) |
| Sharing | Same account friends/DMs/groups/server chat in **every** fleet game |
| Transport | REST poll (~5s); Discord/Telegram bridges for DMs/friends |
| History | Stays on Railway Postgres — do **not** move chat SSOT to Cloudflare |

## Surfaces

| Surface | Entry |
|---------|--------|
| Full Treaty app | `https://grudgewarlords.com/treaty` |
| Embed (iframe / popup) | `https://grudgewarlords.com/treaty-embed.html?game=warlords` |
| Wallet / FAB | Treaty tab in Grudge token UI |
| Account page | `/account` |
| Fleet satellites | `/api/treaty/*` via `buildFleetSatelliteRewrites()` (+ wallet/fleet) |
| Vanilla games | `grudge-fleet.js` ≥ **2.7.0** — `GrudgeFleet.getTreatyServers()` etc. |
| Discord / Telegram | `/api/discord/treaty/*`, `/api/telegram/treaty/*` |

### Embed on any studio page / game

```html
<script src="https://grudgewarlords.com/grudge-fleet.js"></script>
<script>
  // After login (or with existing grudge_auth_token):
  GrudgeFleet.openTreatyEmbed({ game: 'genesis', iframe: document.getElementById('treaty-slot') });
  // or popup:
  GrudgeFleet.openTreatyEmbed({ game: 'warlords' });
</script>
```

`game` filters server channels (`fleet` channels always included). Values: `fleet`, `warlords`, `genesis`, `grudge6`, `forge`, `crafting`, …

## API (auth required unless noted)

### Friends & social
| Method | Path |
|--------|------|
| GET | `/api/treaty/social` |
| POST | `/api/treaty/friends/request` `{ query }` |
| POST | `/api/treaty/friends/:id/respond` `{ accept }` |

### DMs
| Method | Path |
|--------|------|
| GET/POST | `/api/treaty/dm/threads` |
| GET/POST | `/api/treaty/dm/threads/:id/messages` |

### Groups
| Method | Path |
|--------|------|
| GET/POST | `/api/treaty/groups` |
| GET | `/api/treaty/groups/:id` |
| POST | `/api/treaty/groups/:id/invite` · `/leave` · `/messages` |

### Server / fleet chat (all games)
| Method | Path |
|--------|------|
| GET | `/api/treaty/servers?game=warlords` (alias: `/api/treaty/channels`) |
| GET | `/api/treaty/servers/:slug/messages` |
| POST | `/api/treaty/servers/:slug/messages` `{ content }` |
| GET | `/api/treaty/unread` |

Default seeded channels: `fleet-general`, `fleet-help`, `lfg`, `warlords`, `genesis`, `grudge6`, `forge`, `crafting`.

## Satellite rewrites (required for every fleet game)

```ts
import { buildFleetSatelliteRewrites } from "@shared/fleet";
// Includes: auth, characters, account, wallet, nfts, treaty, fleet, health
```

Warlords production `vercel.json` already rewrites `/api/treaty/*` → Railway.  
Genesis uses catch-all `/api/*` → Railway (treaty works). Prefer **explicit** treaty rules on new apps.

## Migrations

```bash
npm run db:push          # ensure-auth-schema (treaty_* including server channels + seeds)
# or
npm run db:migrate:008   # groups + friends/DM tables (older)
```

## Rules

1. Social graph keys **`account_id`**, never character UUID.  
2. DMs require accepted friendship.  
3. Server channels are **public to any signed-in Grudge account** (fleet-wide).  
4. Groups: owner/admin invite; leave/transfer ownership as implemented.  
5. Prefer **same-origin** `/api/treaty` from browsers; absolute Railway only for tools/CLI.  
6. JWT keys: `grudge_auth_token` (+ fleet aliases). Prefer `sso_token` after id handoff.

## Client libraries

| Lib | Use |
|-----|-----|
| `client/src/lib/treatyChat.ts` | React Warlords app |
| `client/public/grudge-fleet.js` | Vanilla / Puter / external games |
| `client/public/treaty-embed.html` | Drop-in UI for any page |

## Organizer

System map should list Treaty under game-api (Railway), not a separate CF product.  
Probe: `GET /api/treaty/unread` → **401** without JWT is healthy.
