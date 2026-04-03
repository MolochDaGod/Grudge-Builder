# Grudge Builder — Web Engine 1

## Project Identity
This is **Grudge Warlords** (grudgewarlords.com), the primary game client for Grudge Studio.
Created by **Racalvin The Pirate King**. 2D/Canvas game client with React + Vite + TypeScript.

## Architecture — The One Truth

### Single Source of Truth
- **Game data** (races, classes, weapons, armor, attributes): ObjectStore API at `molochdagod.github.io/ObjectStore/api/v1/*.json`
- **Frontend data layer**: `gameData.ts` fetches from ObjectStore on init, falls back to hardcoded. NEVER add new hardcoded data — update ObjectStore instead.
- **3D models**: ObjectStore `/v1/models` endpoint (100+ glb/fbx/obj models in R2)
- **Assets** (sprites, icons, audio, backgrounds): ObjectStore via `assetUrl()` from `assetConfig.ts`

### API Routing (Vercel → VPS)
All API calls go through Vercel rewrites in `vercel.json`:
- `/api/auth/*` → `id.grudge-studio.com` (auth service)
- `/api/account/*` → `account.grudge-studio.com` (account service)
- `/api/game/*` → `api.grudge-studio.com` (game-api, strips /api/game prefix)
- `/api/assets/*` → `assets.grudge-studio.com` (asset service)
- `/api/wallet/*` → `api.grudge-studio.com/api/wallet` (wallet service)

**CRITICAL**: All game API calls MUST use `/api/game/` prefix (e.g., `/api/game/characters`). Never use bare `/api/characters` — it won't match any rewrite.

### VPS Game-API Routes (api.grudge-studio.com)
Mounted routes: `/characters`, `/factions`, `/missions`, `/crews`, `/inventory`, `/professions`, `/gouldstones`, `/economy`, `/crafting`, `/combat`, `/islands`, `/arena`, `/player-islands`, `/pvp`, `/admin`
All require JWT auth. Health at `/health` is public.

### Single API Client Path
`grudgeBackend.ts` (auth/token) → `api.ts` (game API calls) → `characterManager.ts` (character CRUD)
Token stored in localStorage as `grudge_auth_token`. JWT_SECRET shared with VPS for cross-compatibility.

### What Does NOT Exist on VPS
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
| GDevelop Assistant | gdevelop-assistant.vercel.app | Vercel |
| Grudge Engine Web (BabylonJS) | grudge-engine-web.vercel.app | Vercel |
| Dashboard | dash.grudge-studio.com | Vercel |
| Game API | api.grudge-studio.com | VPS (Docker) |
| Auth / Identity | id.grudge-studio.com | VPS (Docker) |
| Account API | account.grudge-studio.com | VPS (Docker) |
| Asset Service | assets.grudge-studio.com | VPS (Docker) |
| ObjectStore Worker | objectstore.grudge-studio.com | Cloudflare Worker |
| AI Hub Worker | ai.grudge-studio.com | Cloudflare Worker |
| Route Monitor | grudge-route-monitor.grudge.workers.dev | Cloudflare Worker |
| ObjectStore Static | molochdagod.github.io/ObjectStore | GitHub Pages |

## Key Files
- `client/src/lib/gameData.ts` — Races, classes, attributes (ObjectStore-first with fallback)
- `client/src/lib/api.ts` — Character API client (uses `/api/game/*`)
- `client/src/lib/grudgeBackend.ts` — Auth, token management, SSO
- `client/src/lib/objectStoreApi.ts` — ObjectStore data fetcher with cache
- `client/src/lib/objectStoreModels.ts` — 3D model fetcher
- `client/src/lib/assetConfig.ts` — Asset URL helpers
- `client/src/lib/assetResolver.ts` — Smart fallback chain (CDN → ObjectStore → placeholder)
- `client/src/lib/audioManager.ts` — BGM/SFX from ObjectStore audio
- `client/src/lib/characterAdapter.ts` — VPS ↔ local character data bridge
- `vercel.json` — All Vercel rewrites (API routing)

## Coding Rules
- NEVER hardcode backend URLs in frontend code. Use relative paths through Vercel rewrites.
- NEVER add game data as hardcoded constants. Fetch from ObjectStore or use existing fallbacks.
- NEVER use localStorage as primary storage for player data. Backend-first with localStorage as cache.
- ALWAYS use `assetUrl()` for ObjectStore asset paths.
- Token: `grudge_auth_token` in localStorage. Auth headers: `Authorization: Bearer <token>`.
- The user prefers Node.js, Vercel for deployments, and manages grudge-studio.com via Cloudflare.

## Game Design Quick Reference
- 6 races: Human, Barbarian (Crusade), Undead, Orc (Legion), Elf, Dwarf (Fabled)
- 4 classes: Warrior, Mage Priest, Ranger Scout, Worg Shapeshifter
- 8 attributes: Strength, Intellect, Vitality, Dexterity, Endurance, Wisdom, Agility, Tactics
- 17 weapon types, 6 armor sets (cloth/leather/metal), 5 harvesting professions
- Combat: hotbar slots 1-4 skills, 6-8 consumables. Tab toggles combat/harvest mode.
- Souls-like difficulty, MMO progression, crew system (3-5 members), faction wars
