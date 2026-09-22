# Canonical Data Layer (complete system)

**Dash hub:** https://dash.grudge-studio.com/assets  
**Code SSOT:** `shared/schema.ts` · `docs/CHARACTER_PROGRESS_SSOT.md` · `docs/HOME_ISLAND_PIPELINE_CANONICAL.md`

---

## One-truth stack

```
┌─────────────────────────────────────────────────────────────────┐
│  APPS: grudgewarlords.com · character.gs · grudge-crafting.puter │
│        puter.com/app/warlords · dash.grudge-studio.com            │
└───────────────┬───────────────────────────┬─────────────────────┘
                │                           │
     ┌──────────▼──────────┐     ┌──────────▼──────────┐
     │ Railway Postgres    │     │ ObjectStore JSON    │
     │ PLAYER STATE SSOT   │     │ DEFINITIONS SSOT    │
     │ characters, accounts│     │ recipes, items,     │
     │ inventory, islands  │     │ professions, weapons│
     └──────────┬──────────┘     └──────────┬──────────┘
                │                           │
     ┌──────────▼───────────────────────────▼──────────┐
     │ R2 assets.grudge-studio.com — BINARIES (GLB/icons)│
     │ D1 asset_registry — INDEX only (r2_key → uuid)    │
     │ Puter KV — CACHE only (never sole truth)          │
     └───────────────────────────────────────────────────┘
```

| Concern | Authority | Not authority |
|---------|-----------|---------------|
| Login / JWT | id.grudge-studio.com → Railway auth | Puter auth alone |
| Characters / progress | Railway `characters` | D1 player_characters, Puter KV |
| Account bag | Railway `account_inventory` | `characters.inventory` JSONB (legacy) |
| Island seeds | Railway `home_islands` | D1, localStorage |
| Recipes / items / professions defs | ObjectStore `objectstore.grudge-studio.com/api/v1/*.json` | Hardcoded HTML tables |
| Meshes / icons | R2 CDN | Postgres BYTEA |
| Asset search index | D1 `asset_registry` | — |

**Backups & cross-game sharing:** [Databases · sharing · backups](https://grudge-warlords.github.io/grudge-dev-tool/database-backups-sharing.html) · `DATABASE_BEST_PRACTICES.md` (sharing + dump runbook). Player dumps are P0; D1/R2 recovery is re-seed/re-upload.

---

## D1 role (narrow)

Use D1 for:

- ObjectStore / asset-api **registry** (`asset_registry`, versions)
- AI hub job tracking (`grudge-ai-hub`)

**Do not** use D1 for:

- Character rows as fleet SSOT
- Home island seeds
- Account inventory

Legacy skill text that says “D1 = characters” is **outdated** for Warlords/crafting; production is Railway.

---

## Required Railway tables (complete)

From `shared/schema.ts` + migrations `000`–`007`:

| Table | Required for |
|-------|----------------|
| `users` | Auth, grudge_id |
| `accounts` | Profile, GBUX, home link |
| `characters` | Hero UUID, professions JSONB, equipment, progress |
| `account_inventory` | Crafting shared bag |
| `account_resources` | Shared mats |
| `home_islands` | 1024m island |
| `player_ships` | Sail |
| `character_professions` | Optional normalized profession rows |
| `uuid_ledger` | Cross-game IDs |
| `gbux_transactions` | Economy |

Apply pending: `006_character_grudge_code.sql`, `007_player_ships.sql` if not already on Railway.

---

## Crafting + Puter wiring

| App | URL | Reads | Writes |
|-----|-----|-------|--------|
| Crafting | grudge-crafting.puter.site | ObjectStore defs, Railway chars/bag, R2 icons | Railway progress + bag; Puter KV cache |
| Puter Warlords | puter.com/app/warlords | Shell → grudgewarlords.com (Jonathan-signed PREVIEW only) | Same as Vercel client |
| Dash Assets | dash…/assets | Health probes, pack list | Admin only via Railway |

Auth: Grudge ID → dual `sso_token` + `grudge_token` → `grudge-fleet.js` **≥ 2.8.0**.  
Account law + switch/create UX: [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md).

| Client | Version | Deploy |
|--------|---------|--------|
| Crafting suite | ≥ **5.7.0** | `npm run deploy:puter:crafting` |
| fleet.js (Puter + CDN) | ≥ **2.8.0** | Puter deploy + R2 `js/grudge-fleet.js` |

---

## Gaps checklist

- [x] `006` grudge_code + `007` player_ships applied on production DATABASE_URL
- [x] Ban account mats on character PATCH/progress (`ACCOUNT_BAG_ON_CHARACTER` 400)
- [x] Dash admin/Accounts → Railway (not api.grudge-studio.com)
- [x] D1 documented as asset registry only (dash Storage + Assets hub)
- [x] Fleet 2.8 hard-fail JWT≠account + Warlords `era=warlords` + owned UUID active
- [x] Crafting 5.7 Sign in / Create account / Switch / Sign out
- [x] Puter + CDN fleet.js aligned to 2.8.0 (2026-07-12)
- [ ] Single character UUID path for **all** fleet games in prod (ongoing satellites)
- [ ] Single asset path truth (R2 key + ObjectStore); D1 index secondary
- [ ] Automated multi-`grudge_id` merge tooling (ops path documented in CANONICAL_IDENTITY)

---

## Deploy updates

```bash
# Game API / schema
git push origin main   # Railway auto

# Crafting Puter
npm run deploy:puter:crafting

# Dash
# push grudge-studio-dash main → Vercel dash.grudge-studio.com
```
