> **Fleet SSOT index:** `C:\Users\david\Desktop\SOURCE_OF_TRUTH.md` · Live: https://client.grudge-studio.com/api/fleet/manifest · Code: `shared/fleet/`

# Grudge Builder — Web Engine 1

## Autonomous production agents (Railway / Deploy / Live Ops)

Ship and maintain production with dedicated agents — see **[docs/PRODUCTION_AGENTS.md](./docs/PRODUCTION_AGENTS.md)**.

| Agent | npm | Grok skill | Role |
|-------|-----|------------|------|
| Railway | `npm run agent:railway -- probe\|deploy --yes` | `grudge-railway-agent` | grudge-api + Colyseus |
| Deploy | `npm run agent:deploy -- ship --yes --api` | `grudge-deploy-agent` | multi-surface production ship |
| Live ops | `npm run agent:live-ops -- report` | `grudge-live-ops` | health, experience, backlog |
| Orchestrator | `npm run agent:status` / `agent:maintenance` | (deploy skill) | status + maintenance loop |

Catalog SSOT: `shared/agents/productionAgentCatalog.ts`. Reports: `scripts/agents/reports/*-latest.json`.

**Rule:** production ship requires `--yes` (or CI). Agents never drop DB or print secrets.

### Production stack (only these four)

| Platform | Role |
|----------|------|
| **Vercel** | SPA client |
| **Railway** | grudge-api — Postgres player SSOT + Express |
| **Colyseus** | Realtime on same Railway process |
| **Cloudflare** | R2 CDN, Workers (id-gateway, ObjectStore, CDN) |

**Not SSOT:** Supabase (optional probe; leave unset), MySQL VPS (legacy), D1 heroes, Puter guest.  
Pattern: [docs/STACK_PATTERN.md](./docs/STACK_PATTERN.md).

## Project Identity
This is **Grudge Warlords** ([grudgewarlords.com](https://grudgewarlords.com)), the primary **web game client** for Grudge Studio (React + Vite + TypeScript, Three.js + Phaser).
Created by **Racalvin The Pirate King**.

**Read first (honest fleet + architecture):** root [README.md](./README.md) · [docs/STACK_PATTERN.md](./docs/STACK_PATTERN.md) · [docs/CANONICAL_IDENTITY.md](./docs/CANONICAL_IDENTITY.md) · [docs/CANONICAL_DATA_LAYER.md](./docs/CANONICAL_DATA_LAYER.md) · [docs/FLEET_STATUS.md](./docs/FLEET_STATUS.md) · [docs/DEPLOY_OWNERSHIP.md](./docs/DEPLOY_OWNERSHIP.md).

This repo is **not** Warlord Genesis (separate Vercel app), not ObjectStore, and not Character Studio — those are fleet siblings.

## Architecture — The One Truth

### Single Source of Truth (do not conflate layers)
- **Account** (`grudge_id`): JWT from **id.grudge-studio.com** — email/Discord/Puter are **links**, not separate player DBs.
- **Player data** (users, characters, islands, inventory, sessions): **Railway Postgres** via grudge-api — same-origin `/api/*` on Vercel; **absolute Railway URL** on Puter.
- **Realtime:** **Colyseus** on grudge-api (not a separate Supabase realtime DB).
- **Warlords heroes**: `GET/POST /api/characters?era=warlords` — primary key = **Postgres UUID**; display stamp = `grudgeCode`.
- **Account bag** vs **character progress**: bag on `/api/account/*` + inventory; professions/equipment/XP on character UUID only.
- **Game catalog** (races, classes, weapons, armor, attributes, recipes): ObjectStore / info `…/api/v1/*.json` — **definitions only**.
- **3D models / icons**: R2 `assets.grudge-studio.com` via `assetUrl()` — **never** player SSOT.
- **D1**: asset registry index only — **not** characters/islands/bag.
- **Supabase**: **not required**. `/api/supabase/health` with `configured:false` is healthy production.
- **Fleet bridge**: `client/public/grudge-fleet.js` **≥ 2.8.0** (CDN + Puter crafting). Hard-fails JWT≠stored `grudge_id`; rejects foreign active UUIDs.
- **Frontend data layer**: prefer ObjectStore for catalog; **do not grow** hardcoded fallbacks.

### API Routing (Vercel → Grudge Backend)
All API calls go through Vercel rewrites in `vercel.json`:

**Auth (id.grudge-studio.com)** — canonical map in `shared/fleet/authConnect.ts`:
- **Browser login**: `id.grudge-studio.com/login?redirect_uri=<app>` — dual-write `redirect` + `return` + `origin` (see `docs/GRUDGE_AUTH_CONNECT.md`)
- **SSO re-entry**: `/auth/sso-check?return=<app>` dual-writes `redirect_uri` + `redirect` (live probe OK)
- **Drop-in script**: `id.grudge-studio.com/grudge-game-bootstrap.js` → `GrudgeAuth.start({ mode, returnUrl })`
- **Session**: JWT default long TTL (`JWT_SESSION_TTL`); launch handoff short (`grudge_token`); `POST /api/auth/refresh` extends while valid
- **Handoff**: dual `grudge_token` (bridge) + `sso_token` (session) on return URL **query+hash** — apps **prefer sso_token**
- **Auth page SSOT**: `server/templates/auth-page.html` (sync `public/` + `client/public/`) — stash JWT for Continue
- **Signed custom domains**: `AUTH_EXTRA_RETURN_HOSTS` on Railway + `shared/fleet/authReturn.ts` allowlist
- **Implementation**: Railway `grudge-api-production` (`server/routes/auth.ts`) — id-gateway Worker proxies id host
- **Satellite apps**: `buildFleetSatelliteRewrites()` — `/api/auth/*` → id, `/api/characters` → Railway
- **id hub**: `buildFleetHubAuthRewrites()` — `/auth/:path*` → Railway `/api/auth/:path*`
- **Deprecated**: `api.grudge-studio.com` — do not use for auth (split-brain 404s)
- **Audit**: `npm run probe:auth` — shows per-endpoint fixes when routing is wrong
- **Example satellite**: gameopen.vercel.app — `grudgeAuth.ts` + `fleet.ts`

**Game Data API (Railway — Postgres SSOT)**:
- `/api/characters?era=warlords` → Warlords roster (canonical for this game + crafting)
- `/api/characters/*` → character CRUD / progress / activate (canonical — not `/api/game/characters`)
- `/api/professions/*` → profession XP, crafting, gathering
- `/api/island/*` → home island state, generate-map, boss-clear
- `/api/nfts/*` → character NFT minting
- `/api/inventory/*` → account inventory
- `/api/wallet/*` → Solana wallet
- `/api/party/*` → crew/party
- `/api/account/*` → account profile, resources, GBUX
- `/api/fleet/*` → fleet manifest

All proxied to `grudge-api-production-0d46.up.railway.app` via `vercel.json` and `@shared/fleet/manifest.ts` (`FLEET_URLS.gameData`) on first-party hosts. **Puter (`*.puter.site`) has no rewrites** — set `GRUDGE_CONFIG.GAME_DATA` / fleet absolute Railway. Regenerate rewrites: `npx tsx scripts/sync-vercel-fleet.mjs`.

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
`grudgeBackend.ts` (auth/token) → `api.ts` (game API via same-origin `/api/*`) → `characterManager.ts` (Warlords CRUD + active UUID)
Token keys: `grudge_auth_token` (+ fleet aliases). Prefer **session** `sso_token` after id handoff over short **launch** `grudge_token`.
JWT verification must match Railway secrets; id-gateway only proxies — it does not replace Postgres.

**Auth → Account Sync:** On login, set `grudge_account_id` **and** `grudge_id`. Active character keys are scoped per account (`gruda_active_character_${grudgeId}`). Fleet 2.8 **clears session** if JWT account ≠ stored account.

**Active character:** must be a UUID on `GET /api/characters?era=warlords` for that account. Foreign / stale UUIDs are cleared (`CharacterManager` + fleet).

**Crafting (Puter):** `grudge-crafting.html` ≥ 5.7 — Sign in / Create account / Switch / Sign out via Grudge ID. Deploy: `npm run deploy:puter:crafting`. Never use Puter guest as primary Warlords login.

**Satellite guests:** On `*.vercel.app`, silent cookie claim against the id hub **401s** without a prior login. Expected — use redirect/popup SSO, not hub claim.

**Probes:** `npm run probe:truth:direct` · `npm run probe:auth` · `npm run probe:deployments`.

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
| Auth / Identity | id.grudge-studio.com | Vercel (GrudgeBuilder alias) → Railway auth |
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

