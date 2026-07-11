# Grudge Builder — Grudge Warlords deployment

This repo ships the **Grudge Warlords** web game at [grudgewarlords.com](https://grudgewarlords.com) (also aliased at `client.grudge-studio.com`). Six-step character creation (race → class → stats → avatar → island preview → island launch), turn-based combat, dungeons, islands, professions, skill trees, sprite generation, cNFT minting.

> **Production cutover complete (May 2026):** All placeholder/hardcoded data removed. Character creator → island flow is fully real-API-driven. After committing your home island you choose between 2D GrudaWars or 3D RTS GRUDGE. Server telemetry (live player count) sourced from the island-server Socket.IO process. New routes: `/grudawars` (2D launcher), `GET /api/islands/:id` (fetch island by DB id), `POST /api/islands/:id/regenerate` now returns full island DTO.

**Stack: React 19 + Three.js + Phaser 3.**

## Live Services

- **Web**: [grudgewarlords.com](https://grudgewarlords.com) — Vercel
- **Steam**: App ID **2707990** ([store](https://store.steampowered.com/app/2707990/Grudge/)) — depot Windows `2707991` · see `docs/STEAM.md`
- **Backend API**: [api.grudge-studio.com](https://api.grudge-studio.com/api/health) — Cloudflare Workers
- **Auth (Grudge ID)**: [id.grudge-studio.com](https://id.grudge-studio.com) — Cloudflare
- **Account API**: [account.grudge-studio.com](https://account.grudge-studio.com/health) — Cloudflare
- **Assets CDN**: [assets.grudge-studio.com](https://assets.grudge-studio.com) — Cloudflare R2
- **ObjectStore Worker**: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/health) — Cloudflare Workers (R2 + D1)
- **ObjectStore API**: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/api/v1/master-items.json) — Cloudflare Workers (55+ JSON endpoints)
- **Dashboard**: [dash.grudge-studio.com](https://dash.grudge-studio.com) — Vercel
- **AI Hub**: [ai.grudge-studio.com](https://ai.grudge-studio.com) — Cloudflare Workers

## Architecture

```
Browser → Vercel (static SPA)
          ├─ /api/auth   → id.g-s.com      Cloudflare Workers:
          ├─ /api/*      → api.g-s.com     ├─ grudge-id    (id.g-s.com — auth, OAuth, JWT)
          ├─ /api/wallet → api.g-s.com     ├─ account-api  (account.g-s.com — profiles)
          ├─ /api/assets → assets.g-s.com  ├─ game-api     (api.g-s.com — game, crafting)
          └─ ObjectStore (data+assets)     └─ wallet-svc   (server-side Solana wallets)
Cloudflare:
├─ DNS + CDN    (grudge-studio.com zone)
├─ R2 CDN       (assets.g-s.com)
├─ ObjectStore  (objectstore.g-s.com — D1+R2)
└─ AI Worker    (ai.g-s.com — Gruda Legion)
```

### Service Map

**Live:**
- `grudgewarlords.com` — Game frontend (this repo) — Vercel
- `id.grudge-studio.com` — Grudge ID auth (SSO, OAuth, JWT) — Cloudflare
- `api.grudge-studio.com` — Game API + wallet + NFTs — Cloudflare (routes under `/api/*`)
- `account.grudge-studio.com` — Account profiles & social — Cloudflare
- `assets.grudge-studio.com` — Binary assets CDN (images, sprites, models) — Cloudflare R2
- `objectstore.grudge-studio.com` — R2 + D1 Worker (3D models, search, upload) — Cloudflare Workers
- `dash.grudge-studio.com` — Admin dashboard — Vercel
- `ai.grudge-studio.com` — Gruda Legion AI hub (sprite gen, agents) — Cloudflare Workers
- `objectstore.grudge-studio.com` — ObjectStore API (55+ JSON endpoints, 3D models, search) — Cloudflare Workers

**Planned (not yet deployed):**
- `ws.grudge-studio.com` — WebSocket real-time (Socket.IO)
- `launcher.grudge-studio.com` — Version manifest & entitlements
- `status.grudge-studio.com` — Uptime monitoring (Uptime Kuma)

### Data Source

**ObjectStore is the single source of truth** for all game data. No hardcoded fallbacks — `grudaDB.ts` and `gameData.ts` load everything from ObjectStore at runtime via `syncItemsFromObjectStore()` and `syncGameDataFromObjectStore()`.

- `/api/v1/master-items.json` — 818 items with GRUDGE UUIDs, tier expansion, recipe links
- `/api/v1/master-recipes.json` — 118 recipes with material UUIDs
- `/api/v1/master-materials.json` — 93 materials with UUIDs
- Plus 55+ other endpoints (weapons, armor, races, classes, etc.)

Generate master data: `npm run generate:master` in ObjectStore repo.

### Grudge ID Flow

Every user gets a unique **Grudge ID** on first login. Auth methods (Discord, Google, GitHub, Puter, wallet, guest) all converge to the same Grudge ID. The backend auto-creates a server-side Solana wallet and Puter cloud storage per account.

**Production identity SSOT (2026-07):**

| Piece | Host / path |
|-------|-------------|
| Login UI | `https://id.grudge-studio.com/login?redirect_uri=<app>` |
| Edge | CF Worker `workers/id-gateway` (rewrites → Railway, dual-writes return params) |
| Auth API + page | Railway `grudge-api-production` · `server/templates/auth-page.html` |
| Drop-in client | `https://id.grudge-studio.com/grudge-game-bootstrap.js` → `window.GrudgeAuth` |
| Allowlist | `shared/fleet/authReturn.ts` (`*.vercel.app`, `*.puter.site`, …) |
| Docs | [`docs/GRUDGE_AUTH_CONNECT.md`](docs/GRUDGE_AUTH_CONNECT.md) · [`docs/ID_SSO_PRODUCTION.md`](docs/ID_SSO_PRODUCTION.md) |

```
App  →  id…/login?redirect_uri=+redirect=+return=+origin=
     →  sign-in (Puter / OAuth / guest)
     →  handoff: location.replace(app + ?sso_token=&grudge_token=#sso_token=)
     →  App stores fleet keys, prefers sso_token (session) over grudge_token (launch)
```

**Handoff rules (do not regress):** dual-write every return alias; stash JWT for Continue (`/api/auth/me` has no body token); prefer **session** `sso_token` over short **launch** `grudge_token`; read query **and** hash.

```
grudge-builder/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   │   ├── character-creator/   # 6-step character + island creation wizard
│   │   │   ├── profession/          # Profession advancement UI
│   │   │   ├── island.tsx           # Home island (2D harvest)
    │   │   ├── island-3d.tsx        # Home island (3D terrain view, home-island mode via ?mode=home-island&islandId=)
    │   │   ├── play.tsx             # Live test-play — grudge6 hero on procedural island (default) or ?mode=zone
    │   │   ├── create-character-redirect.tsx  # Handoff to Character Studio with returnTo=/test-play
    │   │   ├── grudawars.tsx        # GrudaWars launcher — loads live char+island, deep-links to grudgewarlords.com
    │   │   ├── island-v2.tsx        # Island v2 renderer
│   │   │   ├── combat.tsx           # Turn-based combat
│   │   │   ├── dungeon-tiled.tsx    # Tiled dungeon explorer
│   │   │   ├── skill-tree.tsx       # Class skill trees
│   │   │   ├── crafting.tsx         # Crafting system
│   │   │   ├── world-map.tsx        # Sailing world map
│   │   │   ├── tower-wars.tsx       # Tower defense mode
│   │   │   ├── rpg-battle.tsx       # RPG battle mode
│   │   │   ├── mission-board.tsx    # AI faction missions
│   │   │   ├── hero-codex.tsx       # Hero lore codex
│   │   │   ├── hero-sprites.tsx     # Sprite preview viewer
│   │   │   ├── sprite-engine.tsx    # Sprite engine tooling
│   │   │   ├── sprite-library.tsx   # Sprite asset browser
│   │   │   ├── ai-helper-generator.tsx  # AI sprite/asset generator
│   │   │   └── organizer.tsx        # System map & readiness dashboard
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── use-object-store.ts  # ObjectStore data hooks
│   │   ├── lib/             # Game data, APIs, utilities
│   │   │   ├── assetConfig.ts       # ObjectStore URL config + assetUrl/apiUrl/cdnAssetUrl
│   │   │   ├── objectStoreApi.ts    # ObjectStore API client (23 endpoints, caching)
│   │   │   ├── grudgeBackend.ts     # Grudge ID auth, SSO, session management
    │   │   ├── gcsRedirect.ts       # Character Studio handoff + GCS return consumption
    │   │   ├── playHub.ts           # Active character resolution for /test-play
    │   │   ├── grudge6Equipment.ts  # grudge6 mesh/slot loader for Island3DEngine
    │   │   ├── grudaDB.ts           # Item database & icon resolver
    │   │   ├── homeIslandApi.ts     # Island DTO normalizer (normalizeHomeIslandResponse) + fetchRtsStatus
    │   │   └── gameData.ts          # Races, classes, attributes definitions
    │   ├── components/
    │   │   └── HomeIslandPreview.tsx  # Visual island preview component (terrain zones, nodes, animals)
│   │   ├── island/          # 2D island engine (auto-harvest, node graph)
│   │   ├── island3d/        # Three.js 3D island terrain engine
│   │   ├── data/            # Static game data & sprite maps
│   │   ├── contexts/        # React contexts
│   │   └── scheme.ts        # Shared color/theme scheme
│   └── public/              # Favicon only — assets served from ObjectStore CDN
├── server/                  # Express + Colyseus backend (local dev, optional Railway prod target)
│   ├── colyseus/            # Multiplayer rooms (lobby, dungeon)
│   ├── routes/              # Modular API route files
│   ├── integrations/        # Third-party integrations (ObjectStore, etc.)
│   ├── services/            # Business logic services (Crossmint, wallet, etc.)
│   ├── utilities/           # Server utilities (islandGeneration, etc.)
│   ├── spriteGeneration/    # AI sprite generation pipeline
│   ├── seeds/               # Database seed scripts
│   └── routes.ts            # Main route registration
├── shared/                  # Shared types, schemas, game definitions
│   ├── schema.ts            # Drizzle ORM schema (all tables)
│   ├── definitions/         # Game data definitions (items, classes, tiers)
│   ├── models/              # Shared model types
│   └── utils/               # Shared utilities
├── migrations/              # SQL migration files
├── docs/                    # System documentation
├── vercel.json              # Vercel rewrites → grudge-studio.com backend
├── railway.json             # Railway deploy for this repo's Node server
├── drizzle.config.ts        # Drizzle ORM config
└── package.json
```

## System Map & Organizer

An interactive, data-driven system map is available at **`/organizer`** (e.g. [grudgewarlords.com/organizer](https://grudgewarlords.com/organizer)).

- **Graph tab** — force-directed flow chart of domains, services, frontend routes, API rewrites, data sources and repos. Color = status (live / planned / broken / deprecated), size = fan-in.
- **Readiness tab** — per-service production-readiness checklist (HTTPS, health, CORS, auth, rate-limit, observability, backup).
- **Issues tab** — auto-computed inconsistencies (live services depending on planned nodes, alias/duplicate routes, deprecated pages still routed, readiness holes).

The whole graph is declared in a single typed manifest at `client/src/data/systemMap.ts` — keep it in sync with `client/src/App.tsx` and `vercel.json`. The manifest is also exported as `docs/system-map.json` inside the [Grudge-Studio-Mission](https://github.com/Grudge-Warlords/Grudge-Studio-Mission) repo.

## Production Readiness

The studio + launcher production mission is tracked in its own repo: **[Grudge-Warlords/Grudge-Studio-Mission](https://github.com/Grudge-Warlords/Grudge-Studio-Mission)** — north-star goal, architecture snapshot, readiness checklist, launcher MVP spec, and phased roadmap.

Open action items are surfaced live at `/organizer?tab=readiness` and `/organizer?tab=issues`.

## Game Features

- **Character Creator (6-Step)** — Race selection (6 races), class selection (4 classes), stat allocation (8 attributes), avatar HSL sprite customization + cNFT mint, island preview, island finalize + cNFT mint → **live 2D/3D mode chooser** (no redirects until user picks)
- **Island System** — Seeded RNG deterministic generation: harvest nodes (ore, wood, herbs, fish), animal spawns, terrain zones, camp position. Rerollable until committed. Both character and island minted as Solana cNFTs via Crossmint. Persisted island accessible via `GET /api/islands/:id`, rendered in both 2D GrudaWars and 3D home-island modes
- **GrudaWars Launcher** (`/grudawars`) — Bridge page that loads live character + island from the backend and deep-links into the external 2D GrudaWars game with full context in query params
- **Turn-Based Combat**
- **Dungeon Explorer** — Procedural Phaser-tiled dungeons with fog of war and loot
- **Tower Wars** — Tower defense game mode
- **RPG Battle** — Standalone RPG battle mode
- **Professions** — 5 professions (mining, foresting, fishing, hunting, herbalism) with advancement trees and tiered resource unlocks
- **Skill Trees** — Class-specific ability progression (Warriors, Mages, Rangers, Worges)
- **World Map** — Explore interconnected islands and sailing zones
- **Mission Board** — AI-driven faction missions with dynamic objectives
- **Hero Codex** — Lore browser for heroes, factions, and races
- **Sprite Tools** — AI sprite generation, race sprite generator, sprite library browser, template viewer
- **Arena PvP** — Ranked team battles with challenge system
- **Multiplayer** — Colyseus WebSocket rooms for real-time gameplay
- **Discord Integration** — Webhook notifications for events, patches, arena

## ObjectStore Integration

All game assets and data are served from **[ObjectStore](https://github.com/MolochDaGod/ObjectStore)** — the single source of truth.

### Assets (images, sprites, audio)
```typescript
import { assetUrl, cdnAssetUrl } from "@/lib/assetConfig";
assetUrl("/icons/weapons/swords/bloodfeud_blade.png");  // R2 CDN
cdnAssetUrl("/models/ships/galleon.glb");                // R2 CDN
```

### Game Data (JSON API)
```typescript
import { fetchWeapons, fetchClasses, prefetchCoreData } from "@/lib/objectStoreApi";
const weapons = await fetchWeapons();  // cached, offline-resilient
```

### React Hooks
```typescript
import { useWeapons, useClasses, useRaces } from "@/hooks/use-object-store";
const { data: weapons, isLoading, error, refetch } = useWeapons();
```

### Repo
- **ObjectStore**: [github.com/MolochDaGod/ObjectStore](https://github.com/MolochDaGod/ObjectStore) — 55+ JSON endpoints, 13K+ assets, SDK v5.0, master-items with GRUDGE UUIDs

### Environment Overrides
- `VITE_OBJECT_STORE_URL` — Override ObjectStore base URL (default: `objectstore.grudge-studio.com`)
- `VITE_ASSET_CDN_URL` — Override CDN/asset service URL (default: `assets.grudge-studio.com`)

## Grudge6 Character Platform & Save & Play

**grudge6** is the canonical 6-race character system (Bip001 skeleton): modular meshes, baked animations, controllers, and the `renderPipeline: "grudge6"` save format. Warlords consumes saved heroes via `setupGrudge6Equipment` / `parseModel3d`.

| Surface | Repo | Domain | Deploy |
|---|---|---|---|
| **Character Studio** (Foundry + Viewer) | [grudge-character-animator](https://github.com/MolochDaGod/grudge-character-animator) | [character.grudge-studio.com](https://character.grudge-studio.com) | Cloudflare Pages (`toon-rts-character-viewer`) |
| **grudge6 game lab** (`/game/world`) | same monorepo | [grudge6.grudge-studio.com](https://grudge6.grudge-studio.com) | Vercel |
| **Warlords playtest** (this repo) | Grudge-Builder | [grudgewarlords.com/test-play](https://grudgewarlords.com/test-play) | Vercel |

### Save & Play → test-play flow

```
grudgewarlords.com (logged in)
  └─ /create-character
       └─ character.grudge-studio.com?era=warlords&returnTo=https://grudgewarlords.com/test-play&grudge_token=…
            └─ Foundry (/) → build race/class/loadout
            └─ Viewer (/viewer) → Save & Play
                 └─ POST /api/characters  (grudge6 model3d, proxied to Railway)
                 └─ redirect → grudgewarlords.com/test-play?characterId=…&from=gcs
                      └─ App.tsx consumeGcsReturnHandoff activates hero
                      └─ play.tsx loads grudge6 meshes on procedural island
```

**Key client files (Warlords):**

- `client/src/lib/gcsRedirect.ts` — builds GCS URL with `grudge_token`, `returnTo` (blocks character-studio hosts as return targets)
- `client/src/pages/create-character-redirect.tsx` — `returnPath="/test-play"`
- `client/src/App.tsx` — `consumeGcsReturnHandoff` before `/test-play` mounts
- `client/src/pages/play.tsx` — 3D test world; default **procedural** island (harvest, rocks, crystals, mountains). Use `?mode=zone&sector=convergence_nexus` for 4 km ocean sector instead.
- `client/src/lib/playHub.ts` — roster fallback when localStorage is empty after GCS handoff

**Key client files (Character Studio):**

- `artifacts/character-viewer/src/lib/returnTo.ts` — post-save redirect; never returns to `character.grudge-studio.com`
- `artifacts/character-viewer/src/hooks/useSaveCharacter.ts` — Save & Play
- `artifacts/character-viewer/public/_worker.js` — `/api/*` proxy to Railway + auth gateway on Cloudflare Pages

**Auth:** Cross-origin SSO passes `grudge_token` on the GCS URL. Character Studio stores the token in `localStorage` and bridges via `/api/auth/grudge-bridge`. `/auth/callback` on Warlords is an SPA route (`vercel.json`), not a JSON API path.

## Grudge Fleet

Grudge-Builder is the **hub** for the Grudge Warlords fleet. All games share the same Grudge ID, characters, and backend.

| Game | Repo | Domain | Engine |
|---|---|---|---|
| **Grudge Warlords** (this repo) | Grudge-Builder | grudgewarlords.com | React + Three.js + Phaser |
| **grudge6 / Character Studio** | grudge-character-animator | character.grudge-studio.com, grudge6.grudge-studio.com | Three.js + R3F (viewer + world) |
| **RTS Grudge** | RTS-Grudge | rts-grudge.vercel.app | React-Three-Fiber + Rapier |
| **Dungeon Crawler Quest** | Dungeon-Crawler-Quest | dcq.grudge-studio.com | Three.js + Voxel + Rapier |
| **Grudge Studio Forge** | RTS-Grudge (studio/) | forge.grudge-studio.com | R3F + Rapier + ObjectStore |
| **Grudge Open** | gameopen | gameopen.vercel.app | Three.js combat sandbox + fleet SSO |

All games connect to:
- **Railway** `grudge-api-production` — characters, account, island, inventory (first-party: same-origin `/api/*`)
- `id.grudge-studio.com` — Auth (SSO, OAuth, JWT handoff)
- `assets.grudge-studio.com` — Asset CDN (R2)
- `objectstore.grudge-studio.com` / `info.grudge-studio.com` — definitions JSON

### Cross-Game SSO & Navigation

All fleet games use the same SSO flow. A player authenticated on one game stays authenticated when navigating to another:

```
Player on grudgewarlords.com (has grudge_auth_token)
  │
  ├─ Clicks “RTS GRUDGE” card
  │   └─ gameNav.ts appends ?sso_token=<token>&grudge_id=<id>&username=<name>
  │   └─ Navigates to rts-grudge.vercel.app?sso_token=...
  │
  └─ RTS-Grudge picks up ?sso_token= on load (grudgeBackend.ts / GrudgeSession.ts)
     └─ Stores token in localStorage, cleans URL
     └─ Player is authenticated — characters from Railway via same-origin /api/characters
```

**Login-from-satellite (return-to-origin)** — e.g. [gameopen.vercel.app](https://gameopen.vercel.app):

```
gameopen → id.grudge-studio.com/login?redirect_uri=https://gameopen.vercel.app/
        → after sign-in, id handoff MUST leave id and land on gameopen with tokens
        → gameopen prefers sso_token; bridges grudge_token via /api/auth/session/exchange
```

Probe: `GET id…/auth/sso-check?return=https://gameopen.vercel.app/` → `302` with **both** `redirect_uri` and `redirect`.

**Auth module per game:**

| Game | Auth Module | Token keys (write all / read any) | SSO Pickup |
|---|---|---|---|
| GrudgeBuilder | `lib/grudgeBackend.ts` + bootstrap | `grudge_auth_token`, `sso_token`, … | query + hash `sso_token` / `grudge_token` |
| Grudge Open | `gameopen` `lib/grudgeAuth.ts` + `fleet.ts` | same fleet keys + `grudge.open.token` | prefer `sso_token`; bridge launch |
| RTS-Grudge | `lib/auth/GrudgeSession.ts` | `grudge.token` + fleet | `?grudge_token=` + `?sso_token=` |
| DCQ | `lib/grudgeBackend.ts` | `grudge_auth_token` | `?sso_token=` + legacy `#token=` |
| Any drop-in | `GrudgeAuth.start({ mode })` | fleet keys | dual return params + pickup |

**Cross-game navigation** (`client/src/lib/gameNav.ts`):

```typescript
import { navigateToGame } from "@/lib/gameNav";

// Same-origin (local page) — uses wouter
navigateToGame("/character", setLocation);

// External game — appends auth token to URL
navigateToGame("https://rts-grudge.vercel.app", setLocation);

// Build auth-carrying URL for a fleet game
import { getGameUrl } from "@/lib/gameNav";
const url = getGameUrl("rts-grudge", "/character");
// => "https://rts-grudge.vercel.app/character?sso_token=...&grudge_id=..."
```

**Key principles:**
- Never hard-redirect for auth — guests always play immediately
- Auth is user-triggered (click "Sign In") or SSO-carried (cross-game nav)
- Characters persist across all games via `api.grudge-studio.com/api/characters`
- Token validation is client-side JWT expiry check — no blocking server round-trip

---

*Grudge Studio · Built by Racalvin The Pirate King*

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4, Radix UI
- **3D**: Three.js (no Babylon). See `client/src/island3d/**`, `components/ThreeScene.tsx`, `components/CharacterModel3D.tsx`.
- **Animation**: Framer Motion, Phaser (dungeon engine)
- **State**: TanStack Query, Grudge ID server-side (no localStorage for player data)
- **Multiplayer**: Colyseus (WebSocket rooms)
- **Backend**: Express, Drizzle ORM, PostgreSQL (Cloudflare Workers + D1)
- **Auth**: Grudge ID (JWT) via id.grudge-studio.com — Discord, Google, GitHub, Puter, Solana wallet, guest
- **Assets**: ObjectStore (Cloudflare Pages for JSON, Cloudflare R2 for binary assets)
- **Infrastructure**: Cloudflare (Workers, D1, R2, DNS), Vercel (frontend), Railway (game servers only)

## Deploy

**Frontend** — Push to `main` → Vercel auto-deploys:
```bash
git push origin main
```

**ObjectStore data** — Regenerate master data + deploy to GitHub Pages:
```bash
cd ObjectStore
npm run generate:master   # regenerate master-items/recipes/materials
npm run deploy:pages      # push to gh-pages branch → GitHub Pages
```

**Backend** — Cloudflare Workers:
- **Railway** hosts the canonical Grudge Studio backend (`api.grudge-studio.com`, `id.grudge-studio.com`, `account.grudge-studio.com`). Managed in `grudge-backend` repo. Vercel rewrites in `vercel.json` proxy all `/api/*` calls to `grudge-api-production.up.railway.app`.
- This repo's Node server (`server/index.ts` — Express + Colyseus) can also deploy to Railway via `railway.json` for multiplayer rooms. `ws.grudge-studio.com` will front it when ready.

Domain routing via Cloudflare.

### Vercel Rewrites (vercel.json)

The frontend proxies all API calls through Vercel rewrites:
- `/api/auth/*` → `id.grudge-studio.com/auth/*` (Grudge ID auth)
- `/api/login` → `id.grudge-studio.com/auth/login`
- `/api/register` → `id.grudge-studio.com/auth/register`
- `/api/guest` → `id.grudge-studio.com/auth/puter` (Puter guest login)
- `/api/oauth-google` → `id.grudge-studio.com/auth/google/start`
- `/api/oauth-github` → `id.grudge-studio.com/auth/github/start`
- `/api/discord-login` → `id.grudge-studio.com/auth/discord/start`
- `/api/account/*` → `account.grudge-studio.com/*`
- `/api/characters` + `/api/characters/*` → `api.grudge-studio.com`
- `/api/party` + `/api/party/*` → `api.grudge-studio.com`
- `/api/wallet` + `/api/wallet/*` → `api.grudge-studio.com`
- `/api/island/*` → `api.grudge-studio.com`
- `/api/islands/*` → `api.grudge-studio.com` (`GET /api/islands/:id` fetch by id; `POST /api/islands/:id/regenerate` reroll)
- `/api/island-nfts`
- `/api/nfts` + `/api/nfts/*` → `api.grudge-studio.com`
- `/api/professions/*` → `api.grudge-studio.com`
- `/api/inventory/*` → `api.grudge-studio.com`
- `/api/game/*` → `api.grudge-studio.com` (generic game API)
- `/api/public/*` → `api.grudge-studio.com`
- `/api/assets/*` → `assets.grudge-studio.com` (R2 CDN)
- `/api/tools/*` → `api.grudge-studio.com` (dev tools)
- `/api/health` → `api.grudge-studio.com/health`

Headers: `/editor` gets `COOP/COEP` for SharedArrayBuffer; `/assets/*` is cached immutably.

### Repos

- **[Grudge-Builder](https://github.com/MolochDaGod/Grudge-Builder)** (private) — This repo. Game frontend.
- **[ObjectStore](https://github.com/MolochDaGod/ObjectStore)** — Game data API + asset management
- **[grudge-backend](https://github.com/MolochDaGod/grudge-backend)** — Cloudflare backend (auth, game API, wallets)
- **[grudge-studio-dash](https://github.com/MolochDaGod/grudge-studio-dash)** — Admin dashboard
- **[grudge-ai-hub](https://github.com/MolochDaGod/grudge-ai-hub)** — AI Worker (Cloudflare)
- **[grudge-arena](https://github.com/MolochDaGod/grudge-arena)** — 3D PvP Arena
- **[Grudge-Studio-Game](https://github.com/MolochDaGod/Grudge-Studio-Game)** — 3D Tactical RPG
- **[Grudge-Engine-Web](https://github.com/MolochDaGod/Grudge-Engine-Web)** — BabylonJS game engine + editor
- **[gruda-legion-sdk](https://github.com/MolochDaGod/gruda-legion-sdk)** — AI SDK for Gruda Legion
- **[Grudge-Studio-Mission](https://github.com/Grudge-Warlords/Grudge-Studio-Mission)** — Mission, architecture, readiness checklist, launcher MVP and roadmap for the production-deployed Grudge Studio
