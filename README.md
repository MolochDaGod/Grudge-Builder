# Grudge Builder

Dark fantasy RPG game builder — character creation, turn-based combat, dungeons, islands, professions, and skill trees. Part of the **Grudge Studio** ecosystem.

## Live Services

- **Web**: [grudgewarlords.com](https://grudgewarlords.com) — Vercel
- **Steam**: App ID 1318844 (Partner ID 317409)
- **Backend API**: [api.grudge-studio.com](https://api.grudge-studio.com/api/health) — VPS (Docker/Coolify)
- **Auth (Grudge ID)**: [id.grudge-studio.com](https://id.grudge-studio.com) — VPS
- **Account API**: [account.grudge-studio.com](https://account.grudge-studio.com/health) — VPS
- **Assets CDN**: [assets.grudge-studio.com](https://assets.grudge-studio.com) — Cloudflare R2
- **ObjectStore Worker**: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/health) — Cloudflare Workers (R2 + D1)
- **ObjectStore API**: [molochdagod.github.io/ObjectStore](https://molochdagod.github.io/ObjectStore/api/v1/master-items.json) — GitHub Pages (55+ JSON endpoints)
- **Dashboard**: [dash.grudge-studio.com](https://dash.grudge-studio.com) — VPS
- **AI Hub**: [ai.grudge-studio.com](https://ai.grudge-studio.com) — Cloudflare Workers

## Architecture

```
Browser → Vercel (static SPA) → VPS backend (grudge-studio.com)
          ├─ client/dist                  ├─ grudge-id    (id.g-s.com — auth, OAuth, JWT)
          ├─ /api/auth  → id.g-s.com      ├─ account-api  (account.g-s.com — profiles)
          ├─ /api/game  → api.g-s.com     ├─ game-api     (api.g-s.com — game, crafting)
          ├─ /api/wallet→ api.g-s.com     └─ wallet-svc   (server-side Solana wallets)
          ├─ /api/assets→ assets.g-s.com  Cloudflare:
          └─ ObjectStore (data+assets)    ├─ R2 CDN       (assets.g-s.com)
                                          ├─ ObjectStore  (objectstore.g-s.com — D1+R2)
                                          └─ AI Worker    (ai.g-s.com — Gruda Legion)
```

### Service Map

**Live:**
- `grudgewarlords.com` — Game frontend (this repo) — Vercel
- `id.grudge-studio.com` — Grudge ID auth (SSO, OAuth, JWT) — VPS
- `api.grudge-studio.com` — Game API + wallet + NFTs — VPS (routes under `/api/*`)
- `account.grudge-studio.com` — Account profiles & social — VPS
- `assets.grudge-studio.com` — Binary assets CDN (images, sprites, models) — Cloudflare R2
- `objectstore.grudge-studio.com` — R2 + D1 Worker (3D models, search, upload) — Cloudflare Workers
- `dash.grudge-studio.com` — Admin dashboard — VPS
- `ai.grudge-studio.com` — Gruda Legion AI hub (sprite gen, agents) — Cloudflare Workers
- `molochdagod.github.io/ObjectStore` — Static JSON game data API (55+ endpoints) — GitHub Pages (`gh-pages` branch)

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
grunge-builder/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── pages/           # Route pages (login, home, character, combat, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── use-object-store.ts  # ObjectStore data hooks
│   │   ├── lib/             # Game data, APIs, utilities
│   │   │   ├── assetConfig.ts       # ObjectStore URL config + assetUrl/apiUrl/cdnAssetUrl
│   │   │   ├── objectStoreApi.ts    # ObjectStore API client (23 endpoints, caching)
│   │   │   ├── grudgeBackend.ts     # Grudge ID auth, SSO, session management
│   │   │   ├── grudaDB.ts           # Item database & icon resolver
│   │   │   └── gameData.ts          # Races, classes, attributes definitions
│   │   ├── data/            # Static game data & sprite maps
│   │   └── contexts/        # React contexts
│   └── public/              # Favicon only — assets served from ObjectStore CDN
├── server/                  # Express backend (dev mode only; prod on VPS)
│   ├── colyseus/            # Multiplayer rooms (lobby, dungeon)
│   └── routes/              # API routes (launcher, sprites)
├── shared/                  # Shared types, schemas, game definitions
├── docs/                    # System documentation
├── vercel.json              # Vercel rewrites → grudge-studio.com backend
└── package.json
```

## Game Features

- **Character Builder** — 6 races, 4 classes, 8 attributes, equipment
- **Turn-Based Combat** — Party vs enemy encounters with abilities & VFX
- **Dungeon Explorer** — Procedural tiled dungeons with fog of war
- **Island System** — Build and manage your base with buildings & NPCs
- **Professions** — Mining, foresting, cooking, engineering, mysticism
- **Skill Trees** — Class-specific ability progression
- **World Map** — Explore interconnected islands and sailing zones
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
- `VITE_OBJECT_STORE_URL` — Override ObjectStore base URL (default: `molochdagod.github.io/ObjectStore`)
- `VITE_ASSET_CDN_URL` — Override CDN/asset service URL (default: `assets.grudge-studio.com`)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4, Radix UI
- **Animation**: Framer Motion, Phaser (dungeon engine)
- **State**: TanStack Query, Grudge ID server-side (no localStorage for player data)
- **Multiplayer**: Colyseus (WebSocket rooms)
- **Backend**: Express, Drizzle ORM, PostgreSQL (VPS)
- **Auth**: Grudge ID (JWT) via id.grudge-studio.com — Discord, Google, GitHub, Puter, Solana wallet, guest
- **Assets**: ObjectStore (GitHub Pages for JSON, Cloudflare R2 for binary assets)
- **Infrastructure**: VPS (Docker/Coolify), Vercel (frontend), Cloudflare (DNS + R2)

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

**Backend** — VPS services via Docker/Coolify. Domain routing via Cloudflare.

### Vercel Rewrites (vercel.json)

The frontend proxies all API calls through Vercel rewrites:
- `/api/auth/*` → `id.grudge-studio.com` (Grudge ID auth)
- `/api/account/*` → `api.grudge-studio.com` (account endpoints)
- `/api/game/*` → `api.grudge-studio.com` (game API)
- `/api/wallet/*` → `api.grudge-studio.com` (Solana wallets)
- `/api/island/*` → `api.grudge-studio.com` (island system)
- `/api/nfts/*` → `api.grudge-studio.com` (NFT endpoints)
- `/api/assets/*` → `assets.grudge-studio.com` (R2 CDN)
- `/api/tools/*` → `api.grudge-studio.com` (dev tools)

### Repos

- **[Grudge-Builder](https://github.com/MolochDaGod/Grudge-Builder)** (private) — This repo. Game frontend.
- **[ObjectStore](https://github.com/MolochDaGod/ObjectStore)** — Game data API + asset management
- **[grudge-backend](https://github.com/MolochDaGod/grudge-backend)** — VPS backend (auth, game API, wallets)
- **[grudge-studio-dash](https://github.com/MolochDaGod/grudge-studio-dash)** — Admin dashboard
- **[grudge-ai-hub](https://github.com/MolochDaGod/grudge-ai-hub)** — AI Worker (Cloudflare)
- **[grudge-arena](https://github.com/MolochDaGod/grudge-arena)** — 3D PvP Arena
- **[Grudge-Studio-Game](https://github.com/MolochDaGod/Grudge-Studio-Game)** — 3D Tactical RPG
- **[Grudge-Engine-Web](https://github.com/MolochDaGod/Grudge-Engine-Web)** — BabylonJS game engine + editor
- **[gruda-legion-sdk](https://github.com/MolochDaGod/gruda-legion-sdk)** — AI SDK for Gruda Legion
