# Grudge Builder

Dark fantasy RPG game builder — character creation, turn-based combat, dungeons, islands, professions, and skill trees. Part of the **Grudge Studio** ecosystem.

## Live

- **Web**: [grudgewarlords.com](https://grudgewarlords.com)
- **Steam**: App ID 1318844 (Partner ID 317409)
- **Backend API**: [api.grudge-studio.com](https://api.grudge-studio.com/health)
- **Auth**: [id.grudge-studio.com](https://id.grudge-studio.com)

## Architecture

```
Browser → Vercel (static SPA) → grudge-studio.com backend (VPS)
          ├─ client/dist             ├─ game-api     (game data, crafting)
          ├─ /api/auth → id.g-s.com  ├─ grudge-id    (auth, OAuth, JWT)
          ├─ /api/game → api.g-s.com ├─ account-api  (profiles, social)
          └─ ObjectStore (assets)    ├─ wallet-svc   (Solana wallets)
                                     ├─ ws-service   (WebSocket real-time)
                                     ├─ asset-svc    (CDN, R2)
                                     ├─ ai-agent     (AI services)
                                     └─ grudge-headless (Unity Mirror server)
```

```
grudge-builder/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── pages/           # Route pages (login, home, character, combat, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── use-object-store.ts  # ObjectStore data hooks
│   │   ├── lib/             # Game data, APIs, utilities
│   │   │   ├── assetConfig.ts       # ObjectStore URL config + assetUrl/apiUrl/cdnAssetUrl
│   │   │   ├── objectStoreApi.ts    # ObjectStore API client (23 endpoints, caching)
│   │   │   ├── objectStoreTypes.ts  # TypeScript types for ObjectStore API schemas
│   │   │   ├── grudgeBackend.ts     # Grudge backend auth & session management
│   │   │   ├── grudaDB.ts           # Local item database & icon resolver
│   │   │   └── gameData.ts          # Races, classes, attributes definitions
│   │   ├── data/            # Static game data & sprite maps
│   │   └── contexts/        # React contexts
│   └── public/              # Favicon only — assets served from ObjectStore
├── server/                  # Express + Colyseus backend (dev mode)
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
- **State**: TanStack Query, localStorage persistence
- **Multiplayer**: Colyseus (WebSocket rooms)
- **Backend**: Express, Drizzle ORM, PostgreSQL/MySQL
- **Auth**: JWT via id.grudge-studio.com (Discord, Google, GitHub, Puter, wallet)
- **Infrastructure**: VPS (Docker/Coolify), Vercel (frontend), Cloudflare (DNS)

## Deploy

Push to `main` → Vercel auto-builds and deploys:

```bash
git push origin main
```

Backend services run on VPS at `74.208.155.229` via Docker/Coolify.
