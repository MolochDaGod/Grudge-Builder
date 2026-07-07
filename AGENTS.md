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

**Game Data API (Railway — Postgres SSOT)**:
- `/api/characters/*` → character CRUD (canonical — use this, not `/api/game/characters`)
- `/api/professions/*` → profession XP, crafting, gathering
- `/api/island/*` → home island state, generate-map, boss-clear
- `/api/nfts/*` → character NFT minting
- `/api/inventory/*` → account inventory
- `/api/wallet/*` → Solana wallet
- `/api/party/*` → crew/party
- `/api/account/*` → account profile, resources, GBUX
- `/api/fleet/*` → fleet manifest

All proxied to `grudge-api-production-0d46.up.railway.app` via `vercel.json` and `@shared/fleet/manifest.ts` (`FLEET_URLS.gameData`). Regenerate rewrites: `npx tsx scripts/sync-vercel-fleet.mjs`. Storage/env bindings: `shared/fleet/storage.ts` (`FLEET_STORAGE`, `FLEET_CLIENT_ENV`).

**Identity API (grudge-studio.com)** — catch-all `/api/:path*` → The-ENGINE Railway; NOT characters.

**Assets & Data**:
- `/api/assets/*` → `assets.grudge-studio.com` (R2 CDN)
- `/api/objectstore/*` → ObjectStore worker

### Grudge Backend (Railway game-data)
Mounted routes: `/api/characters`, `/api/professions`, `/api/island`, `/api/inventory`, `/api/nfts`, `/api/wallet`, `/api/party`, `/api/account`
All require JWT auth except public health checks.

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

### Canonical Character Creation (GCS)
**Account/save truth:** [character.grudge-studio.com](https://character.grudge-studio.com) (GCS) — HYDRA VRM + grudge6 forge. Saves to Railway `/api/characters` with per-era rosters (`warlords`, `nexus`, `armada`).

**2D picker art truth:** `class-selector.html` imgur URLs → `client/src/lib/artAssets.ts` (`RACE_PORTRAITS`, `CLASS_HERO_IMAGES`, etc.).

Warlords-era inline builders are **redirected** to GCS. Use `?legacy=1` to keep the old inline flow for dev only.

| Warlords route | GCS params | Return after save |
|----------------|------------|-------------------|
| `/character` | `era=warlords` | `/home` |
| `/create-character` | `era=warlords`, `mode=create` | `/game/character` |
| `/character-creator` | `era=warlords`, `mode=create` | `/account` |

Implementation: `client/src/lib/gcsRedirect.ts` (`buildGcsUrl`, `navigateToGcs`, `consumeGcsReturnHandoff`). Redirect pages: `gcs-redirect.tsx`, `create-character-redirect.tsx`, `character-creator-redirect.tsx`. Boot handoff in `App.tsx` calls `CharacterManager.setActive()` after `?from=gcs&characterId=…`.

**Era-aware storage:** `characterManager.ts` passes `gameEra: warlords` on create; `api.ts` uses `getEnvelope(?era=warlords)` and `activate()` for active character.

**RTS-Grudge** `/character` is Hero Forge (edit presets), not new-character creation — RTS links to GCS via its own `gcsRedirect.ts`.

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
| Game API | grudge-api-production (Railway Postgres) | Railway |
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
