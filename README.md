# Grudge Builder — Grudge Warlords deployment

This repo ships the **Grudge Warlords** web game at [grudgewarlords.com](https://grudgewarlords.com) (also aliased at `client.grudge-studio.com`). Six-step character creation (race → class → stats → avatar → island preview → island launch), turn-based combat, dungeons, islands, professions, skill trees, sprite generation, cNFT minting.

**Stack: React 19 + Three.js + Phaser 3.** Babylon is *not* used here — the Babylon-based editor lives in a separate repo ([Grudge-Engine-Web](https://github.com/MolochDaGod/Grudge-Engine-Web), deployed to `engine.grudge-studio.com`) and is not consumed by this runtime.

## Live Services

- **Web**: [grudgewarlords.com](https://grudgewarlords.com) — Vercel
- **Steam**: App ID 1318844 (Partner ID 317409)
- **Backend API**: [api.grudge-studio.com](https://api.grudge-studio.com/api/health) — Railway (Docker)
- **Auth (Grudge ID)**: [id.grudge-studio.com](https://id.grudge-studio.com) — Railway
- **Account API**: [account.grudge-studio.com](https://account.grudge-studio.com/health) — Railway
- **Assets CDN**: [assets.grudge-studio.com](https://assets.grudge-studio.com) — Cloudflare R2
- **ObjectStore Worker**: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/health) — Cloudflare Workers (R2 + D1)
- **ObjectStore API**: [grudge-objectstore.pages.dev](https://grudge-objectstore.pages.dev/api/v1/master-items.json) — Cloudflare Pages (55+ JSON endpoints)
- **Dashboard**: [dash.grudge-studio.com](https://dash.grudge-studio.com) — Vercel
- **AI Hub**: [ai.grudge-studio.com](https://ai.grudge-studio.com) — Cloudflare Workers

## Architecture

```
Browser → Vercel (static SPA)
          ├─ /api/auth   → id.g-s.com      Railway:
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
- `id.grudge-studio.com` — Grudge ID auth (SSO, OAuth, JWT) — Railway
- `api.grudge-studio.com` — Game API + wallet + NFTs — Railway (routes under `/api/*`)
- `account.grudge-studio.com` — Account profiles & social — Railway
- `assets.grudge-studio.com` — Binary assets CDN (images, sprites, models) — Cloudflare R2
- `objectstore.grudge-studio.com` — R2 + D1 Worker (3D models, search, upload) — Cloudflare Workers
- `dash.grudge-studio.com` — Admin dashboard — Vercel
- `ai.grudge-studio.com` — Gruda Legion AI hub (sprite gen, agents) — Cloudflare Workers
- `grudge-objectstore.pages.dev` — Static JSON game data API (55+ endpoints) — Cloudflare Pages

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

```
grudge-builder/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   │   ├── character-creator/   # 6-step character + island creation wizard
│   │   │   ├── profession/          # Profession advancement UI
│   │   │   ├── island.tsx           # Home island (2D harvest)
│   │   │   ├── island-3d.tsx        # Home island (3D terrain view)
│   │   │   ├── island-v2.tsx        # Island v2 renderer
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
│   │   │   ├── grudaDB.ts           # Item database & icon resolver
│   │   │   └── gameData.ts          # Races, classes, attributes definitions
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

- **Character Creator (6-Step)** — Race selection (6 races), class selection (4 classes), stat allocation (8 attributes), avatar HSL sprite customization + cNFT mint, island preview, island finalize + cNFT mint → launches into gameplay
- **Island System** — Seeded RNG deterministic generation: harvest nodes (ore, wood, herbs, fish), animal spawns, terrain zones, camp position. Rerollable until committed. Both character and island minted as Solana cNFTs via Crossmint
- **Turn-Based Combat** — Party vs enemy encounters with abilities, VFX, and skill hotbar
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
- `VITE_OBJECT_STORE_URL` — Override ObjectStore base URL (default: `grudge-objectstore.pages.dev`)
- `VITE_ASSET_CDN_URL` — Override CDN/asset service URL (default: `assets.grudge-studio.com`)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4, Radix UI
- **3D**: Three.js (no Babylon). See `client/src/island3d/**`, `components/ThreeScene.tsx`, `components/CharacterModel3D.tsx`.
- **Animation**: Framer Motion, Phaser (dungeon engine)
- **State**: TanStack Query, Grudge ID server-side (no localStorage for player data)
- **Multiplayer**: Colyseus (WebSocket rooms)
- **Backend**: Express, Drizzle ORM, PostgreSQL (Railway)
- **Auth**: Grudge ID (JWT) via id.grudge-studio.com — Discord, Google, GitHub, Puter, Solana wallet, guest
- **Assets**: ObjectStore (Cloudflare Pages for JSON, Cloudflare R2 for binary assets)
- **Infrastructure**: Railway (Docker backend), Vercel (frontend), Cloudflare (DNS + R2 + Workers)

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

**Backend** — Railway (Docker):
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
- `/api/island-nfts` + `/api/island-nfts/*` → `api.grudge-studio.com`
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
- **[grudge-backend](https://github.com/MolochDaGod/grudge-backend)** — Railway backend (auth, game API, wallets)
- **[grudge-studio-dash](https://github.com/MolochDaGod/grudge-studio-dash)** — Admin dashboard
- **[grudge-ai-hub](https://github.com/MolochDaGod/grudge-ai-hub)** — AI Worker (Cloudflare)
- **[grudge-arena](https://github.com/MolochDaGod/grudge-arena)** — 3D PvP Arena
- **[Grudge-Studio-Game](https://github.com/MolochDaGod/Grudge-Studio-Game)** — 3D Tactical RPG
- **[Grudge-Engine-Web](https://github.com/MolochDaGod/Grudge-Engine-Web)** — BabylonJS game engine + editor
- **[gruda-legion-sdk](https://github.com/MolochDaGod/gruda-legion-sdk)** — AI SDK for Gruda Legion
- **[Grudge-Studio-Mission](https://github.com/Grudge-Warlords/Grudge-Studio-Mission)** — Mission, architecture, readiness checklist, launcher MVP and roadmap for the production-deployed Grudge Studio
