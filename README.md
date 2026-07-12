# Grudge-Builder (Grudge Warlords)

[![GitHub](https://img.shields.io/badge/github-MolochDaGod%2FGrudge--Builder-181717)](https://github.com/MolochDaGod/Grudge-Builder)

**Primary product:** the **Grudge Warlords** web client — React + Vite + TypeScript, with Three.js (3D islands / playtest) and Phaser (2D dungeons and modes).

| | |
|--|--|
| **Live game** | [grudgewarlords.com](https://grudgewarlords.com) · alias [client.grudge-studio.com](https://client.grudge-studio.com) |
| **Deploy** | Vercel (static SPA) + Railway (`grudge-api-production`) for game/auth API |
| **Owner** | Grudge Studio · *Racalvin The Pirate King* |
| **License** | MIT |

This is **not** a single monorepo for every Grudge title. Sibling products (Warlord Genesis, RTS-Grudge, Character Studio, ObjectStore) live in other repos and connect through **fleet SSO + shared Railway/ObjectStore**.

---

## Honest status (as of 2026-07)

This section is meant to stay true under pressure. Prefer it over marketing copy in older docs.

### What is production-real

| Surface | Role | Reality check |
|---------|------|----------------|
| **grudgewarlords.com** | Main SPA | Live (Vercel). Same-origin `/api/*` rewrites to Railway + id hub. |
| **id.grudge-studio.com** | Grudge ID login / SSO | Live. Edge Worker `grudge-identity-api` (`workers/id-gateway`) proxies to Railway auth. |
| **Railway grudge-api** | Characters, island, inventory, auth API, JWT | Live SSOT for player data: `grudge-api-production-0d46.up.railway.app` |
| **ObjectStore** | Catalog JSON + models registry | Live: [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com/health) |
| **assets.grudge-studio.com** | R2 CDN binaries | Live |
| **character.grudge-studio.com** | Character Studio (GCS) — create/edit grudge6 heroes | Canonical **create** path; Warlords routes often **redirect** here |
| **warlord-genesis.vercel.app** | Separate MOBA/RTS satellite | Own repo (`warlord-genesis`); fleet SSO, not built from this SPA’s main bundle |
| **grudge-crafting.puter.site** | Crafting shell (Puter) | Live puter deploy path; bag/progress via Railway when authed |

### What is partial, fragile, or mislabeled in old docs

| Claim (old README) | Honest note |
|--------------------|-------------|
| “All placeholder/hardcoded data removed” | **Overstated.** Catalog prefers ObjectStore; client still has fallbacks/hardcoded paths for offline resilience and art. |
| “api.grudge-studio.com is the game API” | **Ambiguous.** Prefer **same-origin `/api/*` → Railway**. Public `api.grudge-studio.com` may still respond but is a **legacy/split-brain risk** for auth. |
| “Auth is Cloudflare Workers grudge-id” | **Incomplete.** Login **edge** is CF Worker; **auth API + session page SSOT** is **Railway** (`server/routes/auth.ts`, auth page templates). |
| “account.grudge-studio.com” as core health | Host serves HTML; **`/health` 404**. Prefer `/api/health` or Railway account routes — treat as **legacy/secondary**. |
| “ai.grudge-studio.com always healthy” | Root has returned **`401 unauthorized`** after bad worker deploys. See `docs/DEPLOY_OWNERSHIP.md`. |
| “Arena PvP / multiplayer fully live” | **Colyseus rooms exist in code**; dedicated public `ws.grudge-studio.com` is **not** a hardened fleet product. Expect local/dev or partial wiring. |
| “Every /combat /tower-wars /missions route is ship-quality” | Many routes are **playable prototypes or tools**. Treat **home, account, island, test-play, GCS create** as the spine. |
| “ObjectStore is the only character store” | **False.** ObjectStore = catalog/assets. **Player characters = Railway Postgres.** D1 is asset registry, not hero SSOT. |

### Quick live probe (re-run anytime)

```bash
npm run probe:deployments   # fleet HTTP surfaces
npm run probe:auth          # SSO / login rewrites
npm run probe:gate          # hard-fail critical (when CI secrets/env present)
```

Manual smoke (2026-07 probe):

| URL | Observed |
|-----|----------|
| grudgewarlords.com | 200 HTML |
| id…/api/health | 200 JSON healthy (proxied grudge-api) |
| Railway `/api/health` | 200 JSON healthy |
| objectstore…/health | 200 ok v3.2.0 |
| assets.grudge-studio.com | 200 |
| ai.grudge-studio.com | **401** (incident-class; fix via AI hub redeploy) |
| account…/health | **404** (use `/api/health` if needed) |

---

## What this game actually is

**Grudge Warlords** is a browser fantasy MMO-lite / warcamp stack:

1. **Sign in** with Grudge ID (Puter, OAuth, guest, wallet paths on the id hub).
2. **Create or load a hero** — production create is **Character Studio (GCS)** with `era=warlords`, not only the old in-repo 6-step wizard.
3. **Home island** — seed-based harvest / camp loop (2D and 3D views).
4. **Playtest 3D** (`/test-play`) — grudge6 modular hero on procedural (or zone) island.
5. **Side systems** — professions, crafting (Puter + API), dungeons (Phaser), skill trees, arsenal, missions, treaty chat, sprite tools, organizer map.

It shares **identity and character rows** with other fleet games so a hero can move between Warlords, RTS, DCQ, Genesis, etc., when those apps correctly implement fleet SSO.

---

## Architecture (one truth)

```
Browser (grudgewarlords.com)
  │
  ├─ Static SPA ─────────────────── Vercel (this repo client/)
  │
  ├─ /login, /api/auth/* ────────── id.grudge-studio.com
  │                                    └─ CF Worker id-gateway
  │                                         └─ Railway grudge-api (auth + JWT)
  │
  ├─ /api/characters, /island, … ── same-origin rewrite → Railway grudge-api
  │                                    └─ Postgres (player SSOT)
  │
  ├─ Catalog JSON ───────────────── objectstore.grudge-studio.com/api/v1/*.json
  │
  └─ Binaries (GLB, icons, audio) ─ assets.grudge-studio.com (R2)

Character create (production)
  grudgewarlords.com ──redirect──► character.grudge-studio.com (GCS)
       ◄── Save & Play + handoff ── POST Railway /api/characters
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
| `npm run gen:fleet` / `gen:fleet-truth` | Fleet manifest / published truth |
| `npm run probe:auth` / `probe:deployments` | Live surface probes |
| `npm run deploy:workers` | Wrangler workers (id-gateway, etc.) |
| `npm run db:push` | Auth/schema ensure scripts |

---

## Data layers (do not conflate)

| Layer | Host | Holds |
|-------|------|--------|
| **Player SSOT** | Railway Postgres via grudge-api | users, characters, island rows, inventory, JWT sessions |
| **Catalog SSOT** | ObjectStore JSON | races, classes, items, recipes, grudge6 mesh registries |
| **Binary CDN** | assets.grudge-studio.com (R2) | icons, GLBs, audio, sprites |
| **D1 (ObjectStore)** | Cloudflare | asset registry / metadata — **not** the hero save DB |

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

- Prefer **Railway same-origin `/api`** over hardcoding Railway hostnames in browser code.
- Prefer **ObjectStore** for new catalog data; do not invent a second item DB.
- Auth changes must keep **dual return params** and **sso_token preference**.
- Do not re-attach another repo’s Cloudflare custom domain (see deploy ownership).
- When docs and live probes disagree, **fix the docs** and note the date.

---

## Steam

Steam app **2707990** — see [docs/STEAM.md](docs/STEAM.md). Web fleet is the day-to-day production surface.

---

*Last honesty pass: 2026-07. Re-probe with `npm run probe:deployments` before major releases.*
