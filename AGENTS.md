# Grudge Builder — Web Engine 1

## Project Identity
This is **Grudge Warlords** (grudgewarlords.com), the primary game client for Grudge Studio.
Created by **Racalvin The Pirate King**. 2D/Canvas game client with React + Vite + TypeScript.

## Architecture — The One Truth

### Single Source of Truth
- **Game data** (races, classes, weapons, armor, attributes): ObjectStore API at `objectstore.grudge-studio.com/api/v1/*.json`
- **Frontend data layer**: `gameData.ts` fetches from ObjectStore on init, falls back to hardcoded. NEVER add new hardcoded data — update ObjectStore instead.
- **3D models**: ObjectStore `/v1/models` endpoint (100+ glb/fbx/obj models in R2)
- **Assets** (sprites, icons, audio, backgrounds): ObjectStore via `assetUrl()` from `assetConfig.ts`

### API Routing (Vercel → Grudge Backend)
All API calls go through Vercel rewrites in `vercel.json`:

**Auth (id.grudge-studio.com)**:
- `/api/auth/*` → auth service
- `/api/login`, `/api/register`, `/api/guest` → auth endpoints
- `/api/discord-login`, `/api/oauth-google`, `/api/oauth-github` → OAuth

**Game API (api.grudge-studio.com)**:
- `/api/characters/*` → character CRUD (direct route)
- `/api/professions/*` → profession XP, crafting, gathering
- `/api/island/*` → home island state, generate-map, boss-clear
- `/api/island-nfts/*` → island NFT minting
- `/api/nfts/*` → character NFT minting
- `/api/inventory/*` → account inventory
- `/api/wallet/*` → Solana wallet
- `/api/party/*` → crew/party
- `/api/health` → health check
- `/api/game/*` → catch-all (strips /api/game prefix, for legacy `api.ts` client)

**Assets & Data**:
- `/api/assets/*` → `assets.grudge-studio.com` (R2 CDN)
- `/api/tools/*` → backend tools
- `/api/public/*` → public data

**Two API client patterns exist** (both work):
1. `api.ts` uses `/api/game/characters` (legacy, via catch-all rewrite)
2. Direct routes like `/api/island/status` (newer, explicit rewrites)

Both resolve to `api.grudge-studio.com`. New code should prefer direct routes.

### Grudge Backend (api.grudge-studio.com)
Mounted routes: `/api/characters`, `/api/professions`, `/api/island`, `/api/inventory`, `/api/nfts`, `/api/island-nfts`, `/api/wallet`, `/api/party`, `/api/health`
Legacy routes (via /api/game/ rewrite): `/characters`, `/factions`, `/missions`, `/crews`, `/economy`, `/crafting`, `/combat`, `/arena`, `/player-islands`, `/pvp`, `/admin`
All require JWT auth. Health at `/api/health` is public.

### Object Storage (3 tiers)
1. **R2 CDN** (`assets.grudge-studio.com`) — ALL binary assets (sprites, icons, audio, models, backgrounds). Use `assetUrl()` from `assetConfig.ts`.
2. **ObjectStore** (`objectstore.grudge-studio.com/api/v1/*.json`) — All JSON game data (weapons, armor, races, classes, professions, attributes). Use `apiUrl()` from `assetConfig.ts`.
3. **ObjectStore Worker** (`objectstore.grudge-studio.com`) — Production API with caching, search, filtering. Use `workerUrl()` from `assetConfig.ts`.

Key ObjectStore JSON endpoints:
- `/api/v1/races.json` — 6 races with bonuses
- `/api/v1/classes.json` — 4 classes with abilities
- `/api/v1/attributes.json` — 8 attributes (STR, INT, VIT, DEX, END, WIS, AGI, TAC)
- `/api/v1/factions.json` — 3 factions (Crusade, Legion, Fabled)
- `/api/v1/professions.json` — 6 gathering + 5 crafting, milestones, XP table
- `/api/v1/weapons.json` — 17 weapon types × 6 tiers
- `/api/v1/armor.json` — 6 armor sets
- `/api/v1/master-items.json` — unified item database with UUIDs
- `/api/v1/master-recipes.json` — crafting recipes with material links

### Single API Client Path
`grudgeBackend.ts` (auth/token) → `api.ts` (game API calls via /api/game/) → `characterManager.ts` (character CRUD)
Token stored in localStorage as `grudge_auth_token`. JWT_SECRET shared across Cloudflare Workers for cross-compatibility.

**Auth → Account Sync:** On login, `handleAuthResponse()` sets `grudge_account_id` in localStorage so `CharacterManager` scopes active character selection to the correct account (not `guest`).

### Wallet & NFT Service Chain
`server/services/crossmintWallet.ts` is the **single canonical** Crossmint service. All other files re-export it:
- `server/spriteGeneration/services/crossmintWallet.ts` → re-export
- `server/services/nftMinting.ts` → re-exports NFTMintingService (which uses the canonical crossmint service)
- `server/services/walletHelper.ts` → imports from canonical crossmint service
- NFT metadata uses **full attribute names** (Strength, Vitality, etc.) with case-insensitive lookup to match client-sent data.

### Local Dev Proxy
`server/proxy.ts` mirrors Vercel rewrites for local development (`npm run dev`).
Local Express routes (`server/routes.ts`) handle `/api/island/*`, `/api/account/*` directly.
External routes (`/api/game/*`, `/api/auth/*`, `/api/assets/*`) are proxied to production backends.

### What Only Exists on Local Dev Server
These routes only work on the local dev server (`server/routes.ts`):
- Sprite scanning/analysis/generation (`/api/sprites/*`)
- Aseprite file parsing (`/api/aseprite/*`)
- AI sprite assistant (`/api/ai/*`)
- Dungeon generation (`/api/generate-dungeon`) — uses OpenAI
- Character AI chat/greeting/discussion — uses OpenAI

Frontend pages using these MUST use `BackendRequired` component for graceful degradation.

## Infrastructure Map

| Service | URL | Host |
|---------|-----|------|
| Game Client | grudgewarlords.com | Vercel |
| Dashboard | dash.grudge-studio.com | Vercel |
| Game API | api.grudge-studio.com | Cloudflare Workers |
| Auth / Identity | id.grudge-studio.com | Cloudflare Workers |
| Account API | account.grudge-studio.com | Cloudflare Workers |
| Asset CDN | assets.grudge-studio.com | Cloudflare R2 CDN |
| ObjectStore API | objectstore.grudge-studio.com | Cloudflare Worker (R2 + D1) |
| AI Hub Worker | ai.grudge-studio.com | Cloudflare Worker |
| AI Gateway (local) | localhost:11434 (Ollama) | Local — grudge-dev model |

## Key Files
- `client/src/lib/gameData.ts` — Races, classes, attributes (ObjectStore-first with fallback)
- `client/src/lib/api.ts` — Character API client (uses `/api/game/*`)
- `client/src/lib/grudgeBackend.ts` — Auth, token management, SSO
- `client/src/lib/objectStoreApi.ts` — ObjectStore data fetcher with cache
- `client/src/lib/objectStoreModels.ts` — 3D model fetcher
- `client/src/lib/assetConfig.ts` — Asset URL helpers
- `client/src/lib/assetResolver.ts` — Smart fallback chain (CDN → ObjectStore → placeholder)
- `client/src/lib/audioManager.ts` — BGM/SFX from ObjectStore audio
- `client/src/lib/characterAdapter.ts` — Backend ↔ local character data bridge (saveExtendedData writes all 13 fields to backend)
- `client/src/lib/professionSync.ts` — ObjectStore professions.json loader (6 gathering + 5 crafting, milestones, XP table, benches)
- `client/src/components/FactionEmblems.tsx` — SVG faction emblems (Crusade/Fabled/Legion)
- `shared/attributeSystem.ts` — Canonical 8 attributes with DR, stat caps, combat math
- `vercel.json` — All Vercel rewrites (API routing)

## Coding Rules
- NEVER hardcode backend URLs in frontend code. Use relative paths through Vercel rewrites.
- NEVER add game data as hardcoded constants. Fetch from ObjectStore or use existing fallbacks.
- NEVER use localStorage as primary storage for player data. Backend-first with localStorage as cache.
- ALWAYS use `assetUrl()` for ObjectStore asset paths.
- Token: `grudge_auth_token` in localStorage. Auth headers: `Authorization: Bearer <token>`.
- Account sync: `grudge_account_id` in localStorage (set on login, cleared on logout). Used by `CharacterManager` for active character scoping.
- The user prefers Node.js, Vercel for deployments, and manages grudge-studio.com via Cloudflare.

## Game Design Quick Reference
- 6 races: Human, Barbarian (Crusade), Undead, Orc (Legion), Elf, Dwarf (Fabled)
- 4 classes: Warrior, Mage Priest, Ranger Scout, Worg Shapeshifter
- 8 attributes: Strength, Intellect, Vitality, Dexterity, Endurance, Wisdom, Agility, Tactics
- 17 weapon types, 6 armor sets (cloth/leather/metal), 6 gathering + 5 crafting professions
- Combat: hotbar slots 1-4 skills, 6-8 consumables. Tab toggles combat/harvest mode.
- Souls-like difficulty, MMO progression, crew system (3-5 members), faction wars
