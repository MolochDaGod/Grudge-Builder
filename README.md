# Grudge Builder

Dark fantasy RPG game builder — character creation, turn-based combat, dungeons, islands, professions, and skill trees. Part of the **Grudge Studio** ecosystem.

## Live

- **Web**: [grudgewarlords.com](https://grudgewarlords.com)
- **Steam**: App ID 1318844 (Partner ID 317409)
- **Backend API**: [api.grudge-studio.com](https://api.grudge-studio.com/health)
- **Auth (Grudge ID)**: [id.grudge-studio.com](https://id.grudge-studio.com)
- **Assets CDN**: [assets.grudge-studio.com](https://assets.grudge-studio.com) (R2)
- **Object Store**: [molochdagod.github.io/ObjectStore](https://molochdagod.github.io/ObjectStore) (JSON data)
- **Dashboard**: [dash.grudge-studio.com](https://dash.grudge-studio.com)

## Architecture

```
Browser → Vercel (static SPA) → grudge-studio.com VPS backend
          ├─ client/dist                  ├─ grudge-id    (auth, OAuth, JWT, SSO)
          ├─ /api/auth  → id.g-s.com      ├─ account-api  (profiles, social, Grudge ID)
          ├─ /api/game  → api.g-s.com     ├─ game-api     (game data, crafting, parties)
          ├─ /api/wallet→ api.g-s.com     ├─ wallet-svc   (server-side Solana wallets)
          └─ ObjectStore (data+assets)    ├─ ws-service   (WebSocket real-time)
                                          ├─ asset-svc    (R2 CDN proxy, Cloudflare)
                                          ├─ ai-agent     (Gruda Legion AI services)
                                          └─ grudge-headless (Unity Mirror server)
```

### Service Map

| Domain | Purpose | Hosted |
|--------|---------|--------|
| `grudgewarlords.com` | Game frontend (this repo) | Vercel |
| `id.grudge-studio.com` | Grudge ID auth (SSO, OAuth, JWT) | VPS |
| `api.grudge-studio.com` | Game API + wallet + NFTs | VPS |
| `account.grudge-studio.com` | Account profiles & social | VPS |
| `assets.grudge-studio.com` | Binary assets CDN (images, sprites) | Cloudflare R2 |
| `dash.grudge-studio.com` | Admin dashboard | VPS |
| `ai.grudge-studio.com` | Gruda Legion AI hub | VPS |
| `molochdagod.github.io/ObjectStore` | JSON game data API | GitHub Pages |

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

All game assets and data are served from **[ObjectStore](https://github.com/MolochDaGod/ObjectStore)**.

### Assets (images, sprites, audio)
```typescript
import { assetUrl, cdnAssetUrl } from "@/lib/assetConfig";
assetUrl("/icons/weapons/swords/bloodfeud_blade.png");
cdnAssetUrl("/models/ships/galleon.glb");  // CDN fallback
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

### Environment Overrides
- `VITE_OBJECT_STORE_URL` — Override ObjectStore base URL
- `VITE_ASSET_CDN_URL` — Override CDN/asset service URL

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

Push to `main` → Vercel auto-builds and deploys:

```bash
git push origin main
```

Backend services run on VPS via Docker/Coolify. Domain routing managed by Cloudflare.
