# Grudge Warlords — Documentation Index

Organized entry point for APIs, UUID systems, and fleet integration.

**Start with product truth:** [../README.md](../README.md) (honest fleet + architecture) · [STACK_PATTERN.md](./STACK_PATTERN.md) (Vercel · Railway · Colyseus · Cloudflare) · [FLEET_STATUS.md](./FLEET_STATUS.md) (live probe snapshot) · [DEPLOY_OWNERSHIP.md](./DEPLOY_OWNERSHIP.md) (one host → one owner).

---

## Player-facing production

| Topic | Doc |
|-------|-----|
| **Live game** | https://grudgewarlords.com |
| **Production stack pattern (4 platforms only)** | [STACK_PATTERN.md](./STACK_PATTERN.md) |
| **Autonomous deploy / live-ops agents** | [PRODUCTION_AGENTS.md](./PRODUCTION_AGENTS.md) |
| **Multiplayer + lag best practices** | [INDUSTRY_BEST_PRACTICES_MP_PERF.md](./INDUSTRY_BEST_PRACTICES_MP_PERF.md) · [MULTIPLAYER.md](./MULTIPLAYER.md) |
| **Honest fleet / domain status** | [FLEET_STATUS.md](./FLEET_STATUS.md) · [ORGANIZER_PRODUCTION_AUDIT.md](./ORGANIZER_PRODUCTION_AUDIT.md) · root [README.md](../README.md) |
| **Account + Warlords UUID law (ONE TRUTH)** | [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md) |
| **Data layers (Railway / ObjectStore / R2 / D1)** | [CANONICAL_DATA_LAYER.md](./CANONICAL_DATA_LAYER.md) |
| **Deploy ownership** | [DEPLOY_OWNERSHIP.md](./DEPLOY_OWNERSHIP.md) |
| **Grudge ID SSO / modular login / return-to-origin** | [GRUDGE_AUTH_CONNECT.md](./GRUDGE_AUTH_CONNECT.md) · [ID_SSO_PRODUCTION.md](./ID_SSO_PRODUCTION.md) |
| **API routes (auth, characters, island, crafting)** | [API.md](./API.md) |
| **Hero identity (name + GRDG code, create SSOT)** | [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md) |
| **Character progress SSOT (skills, mastery, attrs, bag scope, revisions)** | [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md) |
| **Home island gameplay** | [ISLANDS.md](./ISLANDS.md) |
| **Professions & crafting** | [PROFESSIONS.md](./PROFESSIONS.md) |
| **Characters, races, classes** | [RACES_CLASSES.md](./RACES_CLASSES.md) |
| **Playtesting, tokens, local dev** | [PLAYTEST.md](./PLAYTEST.md) |
| **Sprites & 2D animation** | [SPRITES.md](./SPRITES.md) · [ANIMATIONS.md](./ANIMATIONS.md) |

---

## UUID & assets (read this before adding items/icons)

| System | Format | Doc |
|--------|--------|-----|
| **ICON-*** (UI images, 9,724 on CDN) | `ICON-XXXX-XXXX-XXXX` | [Icon Library](https://info.grudge-studio.com/ICON_BROWSER.html) · [UUID Guide](../../ObjectStore/docs/API-AND-UUID-GUIDE.md) |
| **Slot-tier item instances** | `helm-t1-0001-…` | [UUID_SYSTEM.md](./UUID_SYSTEM.md) |
| **Player heroes** | Postgres `id` + `grudgeCode` `GRDG-HUMWAR-…` + display `name` | [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md) · [API.md § Characters](./API.md) |
| **HERO/EQIP/ITEM catalog** | `HERO-*`, `EQIP-*` | ObjectStore `master-registry.json` |

**Client resolver:** `client/src/lib/iconResolver.ts` → `@grudge-studio/asset-resolver` / ObjectStore `ICON-*` registry.

---

## Backend & deployment

| Topic | Doc |
|-------|-----|
| **Stack law (Vercel / Railway / Colyseus / CF)** | [STACK_PATTERN.md](./STACK_PATTERN.md) |
| **Agents (railway / deploy / live-ops)** | [PRODUCTION_AGENTS.md](./PRODUCTION_AGENTS.md) |
| Express routes, storage, Railway | [BACKEND.md](./BACKEND.md) |
| Frontend architecture | [FRONTEND.md](./FRONTEND.md) |
| Asset packs & CDN paths | [ASSET_PACKS.md](./ASSET_PACKS.md) |
| Spell/skill icon mapping | [SPELL_SKILL_ICONS.md](./SPELL_SKILL_ICONS.md) |

**Not player SSOT:** Supabase (optional probe), MySQL VPS (legacy), D1 for heroes.

---

## ObjectStore (game data API)

| Resource | URL |
|----------|-----|
| Browse all JSON datasets | https://info.grudge-studio.com/docs |
| **Best practices** (convert/render/NPC/combat/build) | https://info.grudge-studio.com/docs/best-practices.html · [MD](../../ObjectStore/docs/BEST-PRACTICES.md) |
| **Usage README** | [ObjectStore/docs/USAGE.md](../../ObjectStore/docs/USAGE.md) |
| **Asset docs** | [ObjectStore/docs/ASSETS.md](../../ObjectStore/docs/ASSETS.md) · [ASSETS.md](./ASSETS.md) |
| **grudge6 races** | [ObjectStore/docs/GRUDGE6.md](../../ObjectStore/docs/GRUDGE6.md) · browse GRUDGE6_Characters |
| API + UUID master guide | [ObjectStore/docs/API-AND-UUID-GUIDE.md](../../ObjectStore/docs/API-AND-UUID-GUIDE.md) |
| Icon pipeline | [ObjectStore/docs/ICON-ASSET-LIBRARY.md](../../ObjectStore/docs/ICON-ASSET-LIBRARY.md) |
| **Icon browser (search & copy)** | https://info.grudge-studio.com/ICON_BROWSER.html |
| `assets-api.json` / `best-practices.json` | https://objectstore.grudge-studio.com/api/v1/assets-api.json · `…/best-practices.json` |
| Docs catalog | https://objectstore.grudge-studio.com/api/v1/docs-catalog.json |

### CDN fleet modules

| Module | URL | Min version |
|--------|-----|-------------|
| grudge6-kit | https://assets.grudge-studio.com/js/grudge6-kit.js | — |
| grudge-id-client | https://assets.grudge-studio.com/js/grudge-id-client.js | — |
| grudge-fleet | https://assets.grudge-studio.com/js/grudge-fleet.js | **≥ 2.8.0** (identity hard-fail + era=warlords) |

Repo SSOT for fleet bridge: `client/public/grudge-fleet.js` (sync to CDN after ship). Crafting: `client/public/grudge-crafting.html` ≥ **5.7.0** → `npm run deploy:puter:crafting`.

Race kits: `shared/fleet/character.ts` → `/models/grudge6/races/*_Characters.glb` + `setupGrudge6Equipment` / `applyMeshIds`.

---

## Fleet domains

Prefer [FLEET_STATUS.md](./FLEET_STATUS.md) for probe results. Summary:

| Service | Domain | Trust |
|---------|--------|-------|
| Production UI | `grudgewarlords.com` · `client.grudge-studio.com` | **Primary** |
| Grudge ID | `id.grudge-studio.com` | **Primary** (edge → Railway) |
| Game API (Railway) | `grudge-api-production-0d46.up.railway.app` (browser: same-origin `/api`) | **Player SSOT** |
| ObjectStore | `objectstore.grudge-studio.com` | **Catalog SSOT** |
| Asset CDN | `assets.grudge-studio.com` | **Binaries** |
| Character Studio | `character.grudge-studio.com` | **Create SSOT** |
| Info docs | `info.grudge-studio.com` | Docs / browsers |
| WCS / crafting (Puter) | `grudge-crafting.puter.site` | Puter shell — [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md) |
| Warlord Genesis | `warlord-genesis.vercel.app` | Satellite MOBA (other repo) |
| Legacy API host | `api.grudge-studio.com` | **Avoid for new auth** (split-brain risk) |
| AI hub | `ai.grudge-studio.com` | **Fragile** — redeploy ownership before demos |
| Account host | `account.grudge-studio.com` | Secondary; `/health` may 404 |