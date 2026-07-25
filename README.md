# Grudge-Builder (Grudge Warlords)

[![GitHub](https://img.shields.io/badge/github-MolochDaGod%2FGrudge--Builder-181717)](https://github.com/MolochDaGod/Grudge-Builder)

**Primary product:** the **Grudge Warlords** web client — React + Vite + TypeScript, with Three.js (3D islands / playtest) and Phaser (2D dungeons and modes).

| | |
|--|--|
| **Live game** | [grudge.studio](https://grudge.studio) · [grudgewarlords.com](https://grudgewarlords.com) · [client.grudge-studio.com](https://client.grudge-studio.com) |
| **Forge map editor** | [forge.grudge-studio.com](https://forge.grudge-studio.com) (RTS-Grudge `studio/`) |
| **Production stack** | **Vercel** (SPA) · **Railway** grudge-api (Postgres + Colyseus) · **Cloudflare** (R2 CDN + Workers) |
| **Not SSOT** | Supabase, MySQL VPS, D1 for heroes, Puter guest as account |
| **Owner** | Grudge Studio · *Racalvin The Pirate King* |
| **License** | MIT |

This is **not** a single monorepo for every Grudge title. Sibling products (Warlord Genesis, RTS-Grudge, Character Studio, ObjectStore) live in other repos and connect through **fleet SSO + shared Railway/ObjectStore**.

**Stack law:** [docs/STACK_PATTERN.md](docs/STACK_PATTERN.md) · agents: [docs/PRODUCTION_AGENTS.md](docs/PRODUCTION_AGENTS.md)

---

## Production stack (four platforms only)

```
Vercel (client SPA)
    │  same-origin /api/*
    ▼
Railway grudge-api ── Postgres (player SSOT)
       │            └── Colyseus (WS multiplayer rooms)
       ▼
Cloudflare ── R2 assets.grudge-studio.com
           └── Workers (id-gateway, ObjectStore, CDN)
```

| Platform | Role | Ship command |
|----------|------|--------------|
| **Vercel** | Game client | `npm run agent:deploy -- ship --yes --client` or `npx vercel --prod` |
| **Railway** | API + JWT + Colyseus | `npm run agent:deploy -- ship --yes --api` |
| **Colyseus** | Realtime rooms on grudge-api | ships with Railway API |
| **Cloudflare** | R2 binaries + edge | `npm run deploy:workers` / R2 upload scripts |

**Supabase is optional/legacy.** Production leaves `SUPABASE_URL` unset.  
`GET /api/supabase/health` → `configured: false`, `required: false` is **correct**.  
Player data is **Railway Postgres only**.

---

## Production player path (Warlords · 2026-07-19)

**Product hosts:** [grudge.studio](https://grudge.studio) · [grudgewarlords.com](https://grudgewarlords.com) · [client.grudge-studio.com](https://client.grudge-studio.com)

| Step | Route | Notes |
|------|-------|--------|
| Landing | `/` | Art-forward Warlords landing |
| Opening scene | `/intro` | Fleet video → pipeline |
| Pipeline hub | `/warlords/start` | Gates + next-step resolver |
| Character create | `/create-character` | GCS Warlords era → returns to tutorial |
| Tutorial | `/tutorial` | Shipwreck solo · then open world |
| Open world | `/play?sector=haven_shore&mode=zone&…` | Haven + lobby grind |
| **End Game (Lv 20)** | Talk to **faction captain** (`E`) on race island | Mission **End Game** |
| Abandon ship cinematic | `/homeisland?cinematic=abandon-ship` | Cannon · sink · **all jump** (no throw) |
| Home island | `/home-island` (after cinematic / create) | Level **≥ 20** gate |
| Pirate lobby map | `/island-3d?mode=lobby&map=pirate-islands` | Faction islands · production `.gmap` |
| Black Tome | `/lore/tome-of-seasons-and-gods.html` | 6h day · 8 gods’ days · 96-day seasons |

**SSOT**

| Topic | File |
|-------|------|
| Onboarding + Lv20 gate | `shared/definitions/warlordsProductionFlow.ts` |
| End Game mission | `shared/definitions/endGameMission.ts` |
| Game clock / tides | `shared/definitions/gameClock.ts` |
| Production map package | `shared/definitions/productionMapPackage.ts` · `production/` |
| Intro variants | `shared/definitions/productionIntro.ts` |
| Deploy path cards | `shared/fleet/gameDeployments.ts` |
| Flow docs | [docs/WARLORDS_PRODUCTION_FLOW.md](docs/WARLORDS_PRODUCTION_FLOW.md) |
| **cNFT escrow ownership** | [docs/CNFT_ESCROW_OWNERSHIP.md](docs/CNFT_ESCROW_OWNERSHIP.md) |

---

## Characters, heroes roster, and cNFT (escrow-first · 2026-07)

**Game ownership** is always **Grudge ID + Railway account + character UUID**.  
**Chain custody** defaults to the **server admin wallet** (escrow). Players do **not** need a wallet to create or play.

```
Create character (POST /api/characters)
    → Railway characters row (userId / grudge_id)
    → Mint compressed Solana cNFT → AI_AGENT_WALLET (Crossmint)
    → character_nfts: accountId + characterId + ownerWalletAddress = escrow:<admin>
    → Play immediately

Optional later:
    → POST /api/nfts/:id/claim  (wallet required; transfer fees / optional GBUX fee)
```

| Surface | Behavior |
|---------|----------|
| `/heroes` | Loads **JWT account roster** via `GET /api/characters`. Honors `?characterId=`; surfaces `?error=load` with sign-in / create recovery. |
| Create | Escrow mint via `nftMintingService.mintCharacterAsCNFT` (default `directToUser: false`) |
| Claim | Optional; `GET /api/nfts/escrowed` lists held cNFTs |

**Required Railway env**

| Variable | Role |
|----------|------|
| `CROSSMINT_SERVER_API_KEY` | Server mint / transfer |
| `CROSSMINT_COLLECTION_ID` | Solana collection (or `default-solana`) |
| `AI_AGENT_WALLET` | Admin escrow Solana address |
| `CNFT_CLAIM_FEE_GBUX` | Optional GBUX fee on claim (default `0`) |

**Do not** mint to the user on create. Use `directToUser: true` only for explicit admin/legacy tools.

### Next production cut (planned — not auto-run)

Wipe **grudachain** account characters → seed **27** production **NPC heroes** (24 roster + Racalvin, Cpt. John Wayne, Scourge Faithbearer) onto master admin **`grudachain`**. They deploy as world quest-givers with **prompted AI** and **3 campaign quests each**. Finish all 8 of your faction → **mounted commander** end-game (enemy dragons, 3 world bosses, sack island, resource tribute). Dailies rotate. Playtest on **`molochdadev`**.

| Doc / script | Role |
|--------------|------|
| [docs/PRODUCTION_HERO_WIPE_AND_MIGRATE.md](docs/PRODUCTION_HERO_WIPE_AND_MIGRATE.md) | Wipe + seed checklist |
| [docs/FACTION_HERO_CAMPAIGN.md](docs/FACTION_HERO_CAMPAIGN.md) | Campaign · AI · dailies · commander |
| `shared/definitions/factionHeroCampaign.ts` | SSOT missions + deploy manifest |
| `npx tsx scripts/migrate-canonical-heroes-to-grudachain.ts` | Dry-run; wipe/seed with confirm flags |

**Do not wipe production** until Railway cNFT escrow smoke is green and an operator passes `--confirm-wipe-grudachain --confirm-seed`.

**Publish map from Forge:** `POST /api/production/map/publish` (token `PRODUCTION_PUBLISH_TOKEN`) · Forge **🚀 Publish**  
**Pirate mesh GLB:** `https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.glb`

### Deploy this SPA

```bash
# Client (Vercel → grudge.studio / grudgewarlords.com / client.grudge-studio.com)
cd grudge-builder
npm run map:build-gmap          # refresh production gmap JSON
npx vercel --prod --yes

# Forge map editor (RTS-Grudge monorepo → forge.grudge-studio.com / rts-grudge.vercel.app)
cd path/to/RTS-Grudge
npx vercel --prod --yes

# Optional full refresh (R2 catalogs + workers + SPA)
node scripts/production-refresh.mjs
# or skip heavy upload: node scripts/production-refresh.mjs --skip-upload
```

**Last SPA prod ship (2026-07-18):** Vercel `grudge-builder` → aliased **https://grudge.studio** · RTS-Grudge + Forge editor → **https://rts-grudge.vercel.app** / **https://forge.grudge-studio.com**

API + multiplayer REST ship with **Railway** grudge-api:

```bash
npm run agent:deploy -- ship --yes --api   # production API + Colyseus
npm run agent:live-ops -- report           # health · colyseus · multiplayer/status
```

Set `PRODUCTION_PUBLISH_TOKEN` on Railway for Forge map publish.

**Last API ship (2026-07-19):** Railway deploy `0068c34f…` — `/api/multiplayer/status` live · Colyseus matchMaker ready.

---

## Honest status (as of 2026-07-19)

This section is meant to stay true under pressure. Prefer it over marketing copy in older docs.

### Open-world / camp / build (client code — ship with SPA)

| Feature | Status | SSOT / entry |
|---------|--------|----------------|
| **Map families** | Canonical | `shared/definitions/mapRegistry.ts` · [MAP_FAMILIES_CANONICAL.md](docs/MAP_FAMILIES_CANONICAL.md) · [WORLD_MAP_TRUTH.md](docs/WORLD_MAP_TRUTH.md) |
| **9 Warlords sectors** | Code SSOT | `worldMapSectors.ts` — starter **`haven_shore`** |
| **Complete world map render** | Client ship | `/world-map` · [COMPLETE_WORLD_MAP.md](docs/COMPLETE_WORLD_MAP.md) · 3D strategic + `/ocean` sail |
| **Haven Shore foundation** | Client foundation | Fruzer islands GLB (R2; `*.glb` gitignored) · [HAVEN_SHORE_FOUNDATION.md](docs/HAVEN_SHORE_FOUNDATION.md) · play `?sector=haven_shore&mode=zone&city=haven_port` |
| **Build Hammer** | Client | 0.8× survival-kit hammer in hand · free WASD + RMB look · Dune-style tabs · [BUILD_SYSTEM_SSOT.md](docs/BUILD_SYSTEM_SSOT.md) |
| **Claim Flag garrison** | Client | Unarmed race recruits · benches → profession XP · buildings → T0/AI/harvest buffs · **F1–F5** orders · [CAMP_CLAIM_UNITS.md](docs/CAMP_CLAIM_UNITS.md) |
| **Modular / ice / fantasy catalogs** | Code + JSON catalogs | Multipack node extract; binaries on **assets.grudge-studio.com** (not in git) |
| **Creatures / traps / skeleton corpses** | Client + **R2 CDN only** | [WARLORDS_ASSET_SSOT.md](docs/WARLORDS_ASSET_SSOT.md) · [WARLORDS_CREATURES_TRAPS_SKELETONS.md](docs/WARLORDS_CREATURES_TRAPS_SKELETONS.md) · upload `node scripts/upload-session-warlords-assets-to-r2.mjs` |

**Binaries:** `*.glb` is gitignored. Production loads from R2 (`assets.grudge-studio.com`). Local authoring under `client/public/models/…` is optional; upload via `grudge-assets-sync` / build-pack scripts / session upload script above.

### Warlords asset SSOT (ONE TRUTH — 2026-07-20)

| Concern | Single authority |
|---------|------------------|
| **3D / icons / audio binaries** | R2 `grudge-assets` → **`https://assets.grudge-studio.com`** via `assetUrl()` / `ASSET_CDN_BASE` (`client/src/lib/assetConfig.ts`) |
| **Creature ids + clips + loot** | `client/src/island3d/creatures/CreatureManifest.ts` |
| **Biome animal slots** | `shared/definitions/biomeEcosystemCatalog.ts` (published JSON mirrors) |
| **Trap multipack path + nodes** | `shared/definitions/mobileGameObstacles.ts` → BuildAssetManifest `TRAP_PACK` |
| **Skeleton residual** | `models/skeletons/Skeleton.glb` (+ Archer) · `SkeletonCorpse.ts` |
| **JSON game data** | ObjectStore `apiUrl()` — not a second mesh host |
| **Player save** | Railway Postgres — never R2 |

**Rules:** multipack = `nodeName` isolation · land combat = `category: land` · corpse = 120s or skin → skeleton GLB · no second CDN for Warlords meshes.

Full law: **[docs/WARLORDS_ASSET_SSOT.md](docs/WARLORDS_ASSET_SSOT.md)**

### Identity & player data — ONE TRUTH (law)

Full contract: [`docs/CANONICAL_IDENTITY.md`](docs/CANONICAL_IDENTITY.md).

| Key | Authority |
|-----|-----------|
| **Account** (`grudge_id`) | Railway + JWT from **id.grudge-studio.com** |
| **Warlords heroes** | Railway `GET/POST /api/characters?era=warlords` — **UUID** primary key |
| **Shared bag / GBUX** | Railway **account** APIs (`/api/account/*`, `/api/inventory/*`) |
| **Professions / equipment / XP** | Railway **character UUID** (`/api/characters/:id`, progress) |
| **Email / Discord / Puter** | Login **links** only — never a second character DB |
| **Puter KV / localStorage** | Cache only |

| Client bridge | Version | Notes |
|---------------|---------|--------|
| `grudge-fleet.js` | **≥ 2.8.0** | Hard-fail JWT≠account; warlords roster only; owned UUID active |
| Crafting suite | **≥ 5.7.0** | Sign in / create account / switch / sign out on Puter host |
| CDN | `https://assets.grudge-studio.com/js/grudge-fleet.js` | Keep aligned with `client/public/grudge-fleet.js` |

### What is production-real

| Surface | Role | Reality check |
|---------|------|----------------|
| **grudgewarlords.com** | Main SPA | Live (Vercel). Same-origin `/api/*` rewrites to Railway + id hub. |
| **id.grudge-studio.com** | Grudge ID login / register / SSO | Live. Edge Worker `grudge-identity-api` (`workers/id-gateway`) proxies to Railway auth. |
| **Railway grudge-api** | Characters, island, inventory, auth API, JWT, **Colyseus** | Live SSOT: `grudge-api-production-0d46.up.railway.app` · `/api/multiplayer/status` 200 |
| **Colyseus** | Realtime rooms on grudge-api | Live: `/api/colyseus/health` · rooms tutorial→home_island |
| **ObjectStore** | Catalog JSON + models registry (Cloudflare Worker) | Live: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/health) |
| **info.grudge-studio.com** | Docs + alternate defs host | Recipes also available under `/api/v1/` |
| **assets.grudge-studio.com** | R2 CDN binaries (Cloudflare) | Live |
| **character.grudge-studio.com** | Character Studio (GCS) — create/edit grudge6 heroes | Canonical **create** path; Warlords routes often **redirect** here |
| **warlord-genesis.vercel.app** | Separate MOBA/RTS satellite | Own repo (`warlord-genesis`); fleet SSO, not built from this SPA’s main bundle |
| **grudge-crafting.puter.site** | Crafting shell (Puter) | Live; **must** Grudge ID JWT + Warlords UUID — not Puter-only guest |

### What is partial, fragile, or mislabeled in old docs

| Claim (old README) | Honest note |
|--------------------|-------------|
| “All placeholder/hardcoded data removed” | **Overstated.** Catalog prefers ObjectStore; client still has fallbacks/hardcoded paths for offline resilience and art. |
| “api.grudge-studio.com is the game API” | **Ambiguous.** Prefer **same-origin `/api/*` → Railway**. Public `api.grudge-studio.com` may still respond but is a **legacy/split-brain risk** for auth. |
| “Auth is Cloudflare Workers grudge-id” | **Incomplete.** Login **edge** is CF Worker; **auth API + session page SSOT** is **Railway** (`server/routes/auth.ts`, auth page templates). |
| “account.grudge-studio.com” as core health | Host serves HTML; **`/health` 404**. Prefer `/api/health` or Railway account routes — treat as **legacy/secondary**. |
| “ai.grudge-studio.com always healthy” | Root has returned **`401 unauthorized`** after bad worker deploys. See `docs/DEPLOY_OWNERSHIP.md`. |
| “Arena PvP / multiplayer fully live” | **Colyseus is live on grudge-api** (rooms + multiplayer REST). Dedicated `ws.grudge-studio.com` is not required. Reconnect HUD still product work. |
| “Every /combat /tower-wars /missions route is ship-quality” | Many routes are **playable prototypes or tools**. Treat **home, account, island, test-play, GCS create** as the spine. |
| “ObjectStore is the only character store” | **False.** ObjectStore = catalog/assets. **Player characters = Railway Postgres.** D1 is asset registry, not hero SSOT. |
| “Supabase is the database / auth spine” | **False.** Supabase is **optional/legacy**. Production leaves it unset. **Railway Postgres** is player SSOT. |
| “MySQL VPS is game data SSOT” | **False** for Warlords. Legacy VPS only — do not write new hero/island code there. |
| “Crafting sees characters via Puter login” | **False.** Crafting needs **Grudge ID** `sso_token` → Railway `era=warlords`. Puter guest alone = empty roster. |
| “Characters live on GitHub Pages ObjectStore” | **Deprecated.** `molochdagod.github.io/ObjectStore` may still host **static UI images**; player rows do **not**. |

### Quick live probe (re-run anytime)

```bash
npm run agent:live-ops -- report   # health · colyseus · multiplayer · client · CDN
npm run probe:truth:direct         # ONE TRUTH (characters?era=warlords, identity, craft shell)
npm run probe:deployments          # fleet HTTP surfaces
npm run probe:auth                 # SSO / login rewrites
npm run probe:all                  # deployments + truth
```

After **this SPA deploy** (Vercel `grudge-builder` → **grudge.studio** / grudgewarlords.com / client alias), verify:

| Check | How |
|-------|-----|
| SPA shell | `https://grudge.studio/` → 200 · art landing |
| Client alias | `https://client.grudge-studio.com/` → 200 |
| Pipeline | `/warlords/start` · End Game /homeisland |
| Black Tome | `/lore/tome-of-seasons-and-gods.html` |
| Open-world entry | `/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port` loads zone |
| Pirate lobby | `/island-3d?mode=lobby&map=pirate-islands` · captains · faction islands |
| Forge | [forge.grudge-studio.com](https://forge.grudge-studio.com) · auto-load production gmap · Publish |
| Build mode | Tab → Build · Build Hammer · WASD free-move |
| Claim camp | Place camp + Claim Flag · F1–F5 when near owned camp |
| Fleet status doc | Update [docs/FLEET_STATUS.md](docs/FLEET_STATUS.md) after probes |

Manual smoke baseline (re-probe on ship):

| URL | Expected |
|-----|----------|
| grudgewarlords.com | 200 HTML |
| id…/login | 200 |
| Railway `/api/health` | 200 JSON healthy · `database: connected` |
| Railway `/api/colyseus/health` | 200 · matchMakerReady |
| Railway `/api/multiplayer/status` | 200 · protocolVersion · rooms |
| Railway `/api/supabase/health` | `configured: false` (OK — not required) |
| Railway `/api/characters?era=warlords` | **401** without JWT (auth-gated — good) |
| objectstore…/health | 200 ok |
| assets…/js/grudge-fleet.js | **2.8.0+** |
| grudge-crafting.puter.site | **5.7.0+** shell |
| ai.grudge-studio.com | May be **401** (incident-class; fix via AI hub redeploy — not this SPA) |

---

## What this game actually is

**Grudge Warlords** is a browser fantasy MMO-lite / warcamp stack:

1. **Sign in** with Grudge ID (`id.grudge-studio.com`) — email / Discord / Puter / wallet **link** to one `grudge_id`.
2. **Create or load a Warlords hero** — production create is **GCS** (`character.grudge-studio.com?era=warlords`) → Railway **UUID**.
3. **Home island / tutorial / play** — load that UUID; bag is account-scoped, professions/gear character-scoped.
4. **Open world (Warlords 9 sectors)** — `/play?sector=haven_shore&mode=zone` (PVE trade village foundation, map ocean only).
5. **Build + camps** — Build Hammer + Dune-style piece tabs; Claim Flag spawns unarmed race garrison; F1–F5 unit orders on owned camps.
6. **Crafting** — same JWT + same UUID on `grudge-crafting.puter.site` (or in-app `/crafting`); camp benches raise profession level.
7. **Side systems** — dungeons, skill trees, arsenal, treaty, tools (many are prototypes).

It shares **one Railway roster** with other fleet games when those apps use fleet SSO + `era=warlords` (or their era), never a parallel hero store.

---

## Architecture (one truth)

Full pattern: [docs/STACK_PATTERN.md](docs/STACK_PATTERN.md)

```
Browser apps (grudgewarlords.com · grudge-crafting.puter.site · GCS · …)
  │
  ├─ Identity ── id.grudge-studio.com/login|register
  │                 └─ Cloudflare Worker id-gateway → Railway auth + JWT (grudge_id)
  │
  ├─ Player state ── same-origin /api/* (Vercel rewrite) OR Railway absolute (Puter)
  │                 └─ Railway Postgres: users · characters (era=warlords UUID) · bag · island
  │
  ├─ Realtime ──── Colyseus on Railway grudge-api (wss://…up.railway.app)
  │
  ├─ Catalog JSON ── Cloudflare ObjectStore …/api/v1/*.json  (definitions only)
  │
  └─ Binaries ────── assets.grudge-studio.com (R2)

Character create (production)
  grudgewarlords.com ──redirect──► character.grudge-studio.com?era=warlords
       ◄── Save & Play ── POST Railway /api/characters ── UUID returned
       → set active UUID → /home · /tutorial · /home-island · crafting

Crafting (production)
  grudge-crafting.puter.site
       → Sign in / Create account / Switch (Grudge ID)
       → GET /api/characters?era=warlords
       → select owned UUID → bag + profession XP on Railway
```

### Auth (do not regress)

Canonical docs: [`docs/GRUDGE_AUTH_CONNECT.md`](docs/GRUDGE_AUTH_CONNECT.md) · [`docs/ID_SSO_PRODUCTION.md`](docs/ID_SSO_PRODUCTION.md)

| Piece | Location |
|-------|----------|
| Login UI | `https://id.grudge-studio.com/login?redirect_uri=<app>` |
| Edge proxy | `workers/id-gateway` → Railway |
| Auth routes | `server/routes/auth.ts` |
| Auth page HTML | `server/templates/auth-page.html` (+ `public/` / `client/public/` sync) |
| Drop-in client | `client/public/grudge-game-bootstrap.js` → `window.GrudgeAuth` |
| Return allowlist | `shared/fleet/authReturn.ts` |
| Satellite rewrites | `shared/fleet/authConnect.ts` · `buildFleetSatelliteRewrites()` |

**Handoff rules:** dual-write `redirect_uri` + `redirect` + `return` / `origin`; handoff tokens on **query and hash**; prefer **session** `sso_token` over short **launch** `grudge_token`; guest play without blocking login.

On **\*.vercel.app** satellites, silent cookie claim against the id hub will **401** for guests (cross-site cookies). That is expected — use redirect/popup SSO, not hub cookie claim.

---

## Fleet map (honest)

| Product | Repo (typical) | Public URL | Engine / notes |
|---------|----------------|------------|----------------|
| **Grudge Warlords** | **this repo** | grudgewarlords.com | React + Three + Phaser |
| **Warlord Genesis** | warlord-genesis | warlord-genesis.vercel.app | MOBA/RTS shell; static/Vite ship; fleet SSO |
| **Character Studio** | grudge-character-animator / GCS | character.grudge-studio.com | grudge6 create/edit |
| **ObjectStore** | ObjectStore | objectstore.grudge-studio.com · browse/info | Catalog + R2 registry |
| **RTS Grudge** | RTS-Grudge | rts-grudge.vercel.app / forge.* | R3F + Rapier (separate ship) |
| **Dungeon Crawler** | Dungeon-Crawler-Quest | dcq.* (when aliased) | Three/voxel |
| **Crafting (Puter)** | this repo `grudge-crafting.html` | grudge-crafting.puter.site | User-pays Puter host |
| **Dash** | grudge-studio-dash (sibling) | dash.grudge-studio.com | Admin UI |
| **AI hub** | grudge-ai-hub | ai.grudge-studio.com | **Fragile** — ownership dual-worker; see deploy docs |

Ownership SSOT: [`docs/DEPLOY_OWNERSHIP.md`](docs/DEPLOY_OWNERSHIP.md).

---

## Repo layout

```
grudge-builder/
├── client/                 # Vite + React SPA (what Vercel ships)
│   ├── src/pages/          # Routes (home, island, play, combat, tools…)
│   ├── src/lib/            # grudgeBackend, gcsRedirect, assetConfig, playHub…
│   ├── src/island3d/       # Three.js island / play world
│   └── public/             # bootstrap, crafting shell, static helpers
├── server/                 # Express + Colyseus (Railway grudge-api)
│   ├── routes/             # auth, characters, island, …
│   └── templates/          # auth-page.html SSOT
├── shared/                 # Drizzle schema, fleet manifest, game definitions
│   └── fleet/              # authConnect, authReturn, dbConnections, manifest
├── workers/
│   └── id-gateway/         # CF Worker for id.grudge-studio.com/*
├── docs/                   # Deep docs (start at docs/DOCS-INDEX.md)
├── migrations/             # SQL
├── vercel.json             # SPA + API rewrites (generate via fleet scripts)
├── railway.json
└── package.json
```

Full route list: `client/src/App.tsx`. Many admin/sprite/generator routes are **developer tools**, not the core player loop.

---

## Local development

```bash
# Node 20+ recommended (.nvmrc if present)
npm install          # or pnpm if you use workspace tooling

# API + optional SSR path
npm run dev          # Express (tsx) — needs DATABASE_URL / env for real auth

# Client only (Vite)
npm run dev:client   # default port 5000
```

Copy env from `.env.production.example` / local secrets. Without Railway Postgres and JWT secrets, auth and characters will not behave like production.

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run build` / `build:client` | Production client |
| `npm run start:production` | Railway entry |
| `npm run agent:railway` / `agent:deploy` / `agent:live-ops` | Production agents |
| `npm run agent:status` / `agent:maintenance` | Orchestrator health + backlog |
| `npm run gen:fleet` / `gen:fleet-truth` | Fleet manifest / published truth |
| `npm run probe:truth:direct` | ONE TRUTH (identity, era=warlords chars, craft shell) |
| `npm run probe:auth` / `probe:deployments` | Live surface probes |
| `npm run deploy:puter:crafting` | Ship `grudge-crafting.html` + fleet.js to Puter |
| `npm run deploy:workers` | Wrangler workers (id-gateway, etc.) |
| `npm run db:push` | Auth/schema ensure scripts |

---

## Data layers (do not conflate)

| Layer | Host | Holds |
|-------|------|--------|
| **Player SSOT** | Railway Postgres via grudge-api | users, characters, island rows, inventory, JWT sessions |
| **Realtime** | Colyseus (same Railway process) | room presence, positions, chat — not long-term bag |
| **Catalog SSOT** | Cloudflare ObjectStore JSON | races, classes, items, recipes, grudge6 mesh registries |
| **Binary CDN** | assets.grudge-studio.com (Cloudflare R2) | icons, GLBs, audio, sprites |
| **D1** | Cloudflare | asset registry / metadata — **not** the hero save DB |
| **Supabase** | — | **Not used in production.** Optional probe only. |

Client entry points: `client/src/lib/assetConfig.ts`, `objectStoreApi.ts`, `grudgeBackend.ts`, `characterManager.ts`.

---

## Character create → play (production)

```
grudgewarlords.com (signed in)
  → /create-character (redirect page)
  → character.grudge-studio.com?era=warlords&returnTo=…&grudge_token=…
  → Save & Play → POST /api/characters (Railway)
  → return grudgewarlords.com/test-play?characterId=…&from=gcs
  → play.tsx loads grudge6 on procedural island
```

Key files: `client/src/lib/gcsRedirect.ts`, `create-character-redirect.tsx`, `play.tsx`, `playHub.ts`.

Legacy in-repo character-creator: `?legacy=1` only for dev — not the production spine.

---

## Documentation map

| Start here | |
|------------|--|
| **This README** | Product truth, fleet honesty, architecture |
| [docs/CANONICAL_IDENTITY.md](docs/CANONICAL_IDENTITY.md) | **Account + Warlords UUID law** |
| [docs/CANONICAL_DATA_LAYER.md](docs/CANONICAL_DATA_LAYER.md) | Railway / ObjectStore / R2 / D1 |
| [docs/DOCS-INDEX.md](docs/DOCS-INDEX.md) | Full doc index |
| [docs/DEPLOY_OWNERSHIP.md](docs/DEPLOY_OWNERSHIP.md) | One host → one owner |
| [docs/GRUDGE_AUTH_CONNECT.md](docs/GRUDGE_AUTH_CONNECT.md) | SSO connect for satellites |
| [docs/ID_SSO_PRODUCTION.md](docs/ID_SSO_PRODUCTION.md) | Production id hub |
| [docs/API.md](docs/API.md) | HTTP API |
| [docs/CHARACTER_PROGRESS_SSOT.md](docs/CHARACTER_PROGRESS_SSOT.md) | Skills, bag, revisions |
| [docs/FLEET_STATUS.md](docs/FLEET_STATUS.md) | Domain probe snapshot |
| [AGENTS.md](AGENTS.md) | Agent/coding conventions |

---

## Contributing / agents

- Prefer **Railway same-origin `/api`** on first-party hosts; **absolute Railway URL** on Puter (no `/api` rewrites).
- Prefer **ObjectStore** for new catalog data; do not invent a second item DB.
- Auth changes must keep **dual return params** and **`sso_token` preference**.
- Warlords shells: **`era=warlords`**, active **UUID owned** by JWT `grudge_id`.
- Do not re-attach another repo’s Cloudflare custom domain (see deploy ownership).
- When docs and live probes disagree, **fix the docs** and note the date.
- After craft/fleet changes: `npm run deploy:puter:crafting` and upload `js/grudge-fleet.js` to R2.

---

## Steam

Steam app **2707990** — see [docs/STEAM.md](docs/STEAM.md). Web fleet is the day-to-day production surface.

---

*Last honesty pass: 2026-07-12 (identity SSOT + fleet 2.8 / craft 5.7). Re-probe with `npm run probe:truth:direct` before major releases.*
