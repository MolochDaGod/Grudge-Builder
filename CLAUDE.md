# CLAUDE.md — AI Context for Grudge Builder

## What This Is
Grudge Warlords — a multiplayer 3D browser MMO (Conan Exiles meets pirate adventures).
Built by Racalvin The Pirate King for Grudge Studio.

## Build Stack
- **Client**: React 19 + Vite + Tailwind + Three.js r184 + Rapier3D physics
- **Server**: Express + Colyseus (7 room types) on Railway
- **Database**: PostgreSQL via Drizzle ORM (`shared/schema.ts`, 30+ tables)
- **Assets**: Cloudflare R2 CDN at `assets.grudge-studio.com`
- **AI**: Cloudflare AI Gateway Worker at `ai.grudge-studio.com`
- **Auth**: Grudge SSO at `id.grudge-studio.com` (JWT tokens)
- **Wallets**: Crossmint custodial Solana wallets, cNFT minting
- **Deploy**: Vercel (client), Railway (server), Cloudflare (workers/CDN)

## Key Commands
```bash
npm run dev          # Full dev server (Express + Colyseus + Vite) on :5000
npm run build        # Production build (client + server)
npm run db:push      # Push schema to Railway PostgreSQL
```

## Architecture (ONE TRUTH — do not regress)
```
grudgewarlords.com (Vercel) → SPA client
  ├── /api/auth/* → id.grudge-studio.com → Railway JWT (grudge_id)
  ├── /api/characters|account|island|… → Railway grudge-api (Postgres SSOT)
  ├── WebSocket → Colyseus (same Railway process)
  ├── Catalog → objectstore / info …/api/v1/*.json
  └── Assets → assets.grudge-studio.com (R2 CDN)

Warlords craft (grudgewarlords.com/craft/):
  same-origin /api/* → Railway Postgres (bag, inventory, professions)
  Legacy puter grudge-crafting.puter.site redirects → /craft/
```
Law: [docs/CANONICAL_IDENTITY.md](docs/CANONICAL_IDENTITY.md) · agent map: [AGENTS.md](AGENTS.md) · honest README: [README.md](README.md)

## Directory Structure
```
client/src/
  island3d/          # 3D game engine (Three.js)
    engine/          # Island3DEngine — orchestrates everything
    player/          # CharacterController3D, AnimationManager
    terrain/         # Procedural terrain, water, detail layers
    creatures/       # CreatureManager + CreatureManifest (13 species)
    building/        # BuildingSystem + BuildAssetManifest (22 items)
    town/            # TownSceneLoader, TownTerrainBlender, TownNPCManager
    ai/              # AllyController, TownNPCController (A* pathfinding)
    physics/         # PhysicsWorld (Rapier3D integration)
    sync/            # RemotePlayerManager, MultiplayerSync
  pages/             # React pages (play, tutorial, home-island, town, etc.)
  hooks/             # use-colyseus, use-town-room
  lib/               # modelManifest, modelLoader, grudgeConfig, api
server/
  index.ts           # Express + Colyseus boot (IMPORTANT: API routes before static)
  routes.ts          # All REST API routes (6900+ lines)
  colyseus/          # 7 room types (World, Sector, Town, Shipwreck, HomeIsland, Dungeon, Lobby)
  services/          # crossmintWallet, nftVerification, walletHelper
  db.ts              # PostgreSQL connection (sandbox mode if no DATABASE_URL)
shared/
  schema.ts          # Drizzle ORM tables (characters, accounts, inventory, GBUX, NFTs, etc.)
  definitions/       # 38 game data files (weapons, skills, lore, towns, mastery)
workers/
  cdn/               # R2 CDN Worker at assets.grudge-studio.com
  ai/                # AI Gateway Worker at ai.grudge-studio.com
```

## Database Connection
- Production: `DATABASE_URL` env var on Railway (PostgreSQL)
- Sandbox: If no `DATABASE_URL`, server starts without DB (Colyseus + assets still work)
- Schema: `shared/schema.ts` — use `npm run db:push` to sync
- ORM: Drizzle (`server/db.ts` exports `db` instance)

## Service URLs (canonical — `shared/fleet/manifest.ts` / `FLEET_URLS`)
- **Auth / Grudge ID**: https://id.grudge-studio.com
- **Game data (Railway)**: https://grudge-api-production-0d46.up.railway.app  
  First-party apps: same-origin `/api/*` rewrites (not `api.grudge-studio.com` — deprecated split-brain)
- **Assets CDN**: https://assets.grudge-studio.com
- **ObjectStore defs**: https://objectstore.grudge-studio.com/api/v1
- **Character create (GCS)**: https://character.grudge-studio.com?era=warlords
- **Crafting**: https://grudgewarlords.com/craft/ (fleet.js ≥ 2.8, suite ≥ 5.13; Puter = redirect only)
- **AI gateway**: https://ai.grudge-studio.com (fragile — see deploy ownership)
- **Colyseus**: wss on Railway grudge-api (not a separate public `ws.` product)

## Critical Files (Do NOT rename or restructure)
- `client/src/lib/grudgeConfig.ts` — all service URLs
- `shared/schema.ts` — DB schema (changing columns requires migration)
- `server/colyseus/schemas/SectorState.ts` — Colyseus sync schemas
- `client/src/lib/modelManifest.ts` — 3D model registry + animation sets
- `shared/definitions/weaponDatabase.ts` — weapon type IDs used everywhere

## Colyseus Room Types
| Room | Purpose | Tick Rate |
|---|---|---|
| `world` | 9-sector overview | 2 Hz |
| `sector` | Gameplay (move/combat/harvest/build) | 20 Hz |
| `town` | Social hub (NPCs/merchants/chat) | 5 Hz |
| `shipwreck` | Tutorial (private 1-player) | 10 Hz |
| `home_island` | Persistent home (auto-harvest/build) | 5 Hz |
| `dungeon` | Instanced PvE (floor-based) | 20 Hz |
| `lobby` | Pre-game matchmaking | 10 Hz |

## Character Model Pipeline
1. Race GLBs on R2: `assets.grudge-studio.com/models/characters/races/{race}.glb`
2. `MODEL_MANIFEST` in `modelManifest.ts` maps race → CDN URL + skeleton type
3. Animations from R2: `models/animations/{weapon-type}/{file}.glb`
4. KayKit undead model has 95 embedded animations (special handling in `getKaykitAnimMap`)
5. `SkeletonUtils.clone()` required for proper mesh cloning (not `Object3D.clone`)

## Wildlife / traps / corpse residuals (3D play)
- **Manifest:** `client/src/island3d/creatures/CreatureManifest.ts` (land elites + biome wildlife)
- **Land only for combat NPCs** — never `category: predator` for Belerick/Helcurt/ifrit (that forces water pool)
- **Corpse residual:** 120s flesh or skin/loot → `models/skeletons/Skeleton.glb` (see `SkeletonCorpse.ts`)
- **Traps:** multipack `models/obstacles/mobile_game_obstacles.glb` + `nodeName` in BuildAssetManifest; camps auto-seed traps
- **Upload:** `node scripts/upload-session-warlords-assets-to-r2.mjs`
- **Doc:** `docs/WARLORDS_CREATURES_TRAPS_SKELETONS.md`
- **Danger Room twin:** `threejs-rapier…/artifacts/animator` — `DungeonHazards`, `DungeonEnemies` GLB kinds

## Auth Pattern
- SSO: `id.grudge-studio.com/login?redirect_uri=...` → returns `?sso_token=JWT`
- Token: `localStorage.grudge_auth_token`
- Headers: `Authorization: Bearer {token}`
- Guest: routes work without token (userId = "guest")

## Economy
- **GBUX**: In-game currency, stored in `accounts.gbux_balance`
- **Swap**: SOL↔GBUX via `/api/exchange/swap` (1% deposit, 5% withdrawal fee)
- **UUID**: Every item gets a `GRUDGE-UUID` (slot-tier-itemId-timestamp-counter)
- **Wallets**: Crossmint custodial Solana wallets auto-created per account

## What's Being Built (Game Vision)
Conan Exiles survival + open water pirate adventures:
- 9 sectors of islands with faction towns
- Ship sailing, naval combat, treasure hunting
- Home island base building with allies
- Crew/faction PvP with capturable territories
- 5 harvesting professions + tiered crafting
- 24 canonical hero NPCs across 3 factions
