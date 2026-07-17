# Fleet status — honest probe snapshot

**Date:** 2026-07-17 (open-world camp/build + Haven Shore foundation ship)  
**Prior identity SSOT pass:** 2026-07-12  
**Method:** HTTP probes + client feature checklist. Re-run:

```bash
npm run probe:truth:direct # ONE TRUTH: era=warlords chars, ID, craft, defs
npm run probe:organizer    # writes docs/ORGANIZER_PRODUCTION_AUDIT.md
npm run probe:deployments
npm run probe:auth
npm run probe:all
```

Identity law: [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md) · fleet.js **≥ 2.8.0** · crafting suite **≥ 5.7.0**.

This file is a **snapshot**, not a SLA. Update it when something important changes.  
Deep checklist: [ORGANIZER_PRODUCTION_AUDIT.md](./ORGANIZER_PRODUCTION_AUDIT.md).

---

## Client deploy verification (this repo → Vercel SPA)

Ship: **Vercel project `grudge-builder`** → `grudgewarlords.com` / `client.grudge-studio.com`.  
Code SSOT: `main` branch. Binaries (`*.glb`) are **gitignored** — verify R2 CDN keys separately.

| After SPA deploy | Verify |
|------------------|--------|
| Shell | `GET https://grudgewarlords.com/` → **200** HTML |
| Alias | `GET https://client.grudge-studio.com/` → **200** |
| Haven Shore entry | Open `/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port` — zone boots (foundation GLB from CDN or local public) |
| Build Hammer | Mode **Build** · hammer in hand · WASD free-move · RMB look · tabs **1–9** |
| Claim Flag | Own camp + `camp_flag` · **3 unarmed race units** · **F1–F5** command bar near camp |
| Map families | Do not pass `haven_shore` into home-block APIs ([WORLD_MAP_TRUTH.md](./WORLD_MAP_TRUTH.md)) |
| R2 assets | `models/warlords/haven_shore/fruzer_islands.glb` · survival kit · multipacks on `assets.grudge-studio.com` |

Related docs: [HAVEN_SHORE_FOUNDATION.md](./HAVEN_SHORE_FOUNDATION.md) · [CAMP_CLAIM_UNITS.md](./CAMP_CLAIM_UNITS.md) · [BUILD_SYSTEM_SSOT.md](./BUILD_SYSTEM_SSOT.md) · [WARLORDS_SECTOR_DEPLOY_PREP.md](./WARLORDS_SECTOR_DEPLOY_PREP.md).

---

## Critical path (player can sign in + load game shell)

| Surface | URL | Result (probe) | Notes |
|---------|-----|----------------|-------|
| Warlords SPA | https://grudgewarlords.com/ | **200** HTML (probed 2026-07-17) | Primary client |
| Client alias | https://client.grudge-studio.com/ | **200** HTML (probed 2026-07-17) | Same product family |
| Grudge ID health | https://id.grudge-studio.com/api/health | **200** (probed 2026-07-17) | Worker → Railway grudge-api |
| Game API | https://grudge-api-production-0d46.up.railway.app/api/health | **200** (probed 2026-07-17) | Player SSOT |
| Characters (warlords) | …/api/characters?era=warlords | **401** without JWT | Auth-gated roster (expected) |
| ObjectStore | https://objectstore.grudge-studio.com/health | **200** (probed 2026-07-17) | Catalog defs |
| Assets CDN | https://assets.grudge-studio.com/ | **200** | R2; `js/grudge-fleet.js` ≥ 2.8 |
| Crafting | https://grudge-crafting.puter.site/ | **200** suite ≥ 5.7 | Grudge ID required (not Puter guest) |
| Warlord Genesis | https://warlord-genesis.vercel.app/ | **200** HTML | Separate app + fleet SSO |

---

## Secondary / fragile

| Surface | Result | Honest assessment |
|---------|--------|-------------------|
| https://api.grudge-studio.com/api/health | **200** | Still up; **do not** treat as sole auth origin. Prefer same-origin `/api` + id hub. |
| https://account.grudge-studio.com/ | **200** HTML | Host responds. |
| https://account.grudge-studio.com/health | **404** | Old README health path wrong; try `/api/health` (**200** in probe). |
| https://dash.grudge-studio.com/ | **200** | Admin UI. |
| https://ai.grudge-studio.com/ | Redeployed 2026-07-12 | Domain worker redeployed (`wrangler.domain.toml`). Re-probe root HTML. |
| https://the-engine.up.railway.app/api/health | **200** | Engine / identity-adjacent Railway service; not the Warlords SPA. |

---

## Systems maturity (game, not just HTTP)

| System | Maturity | Notes |
|--------|----------|-------|
| Grudge ID SSO + handoff | **Production** | Edge patches + Railway; dual return params required |
| Characters (Railway) | **Production** | Create often via GCS; read/update via `/api/characters` |
| Home island API + UI | **Production / evolving** | 2D + 3D; biome/asset pipeline still under active work |
| **Warlords 9 sectors / zone play** | **Client ship (2026-07-17)** | Haven Shore Fruzer foundation + map ocean; other sectors modular/placeholder |
| **Build Hammer + modular build UI** | **Client ship** | 0.8× kit hammer; Dune-style group tabs; free WASD |
| **Claim Flag / camp units F1–F5** | **Client ship** | Unarmed race garrison; benches profession XP; building buffs |
| grudge6 mesh playtest | **Production-usable** | `/test-play`; depends on CDN models + Railway model3d |
| ObjectStore catalog | **Production** | Client may still fall back if fetch fails |
| Crafting (Puter) | **Production path** | Hosted on puter.site; needs valid SSO for bag |
| Phaser dungeons / tower / RPG battle | **Prototype → beta** | Routes exist; not all are first-class onboarding |
| Colyseus multiplayer | **Code present** | Not a fully productized public WS product |
| Steam depot | **Separate channel** | App 2707990 — web is primary iteration surface |
| AI hub (Legion) | **Unstable edge** | Domain ownership dual-worker; probe before demos |

---

## Auth-specific honesty

1. **Guest on \*.vercel.app:** `POST /api/auth/session/claim` to id hub **will 401** without a first-party cookie. Expected. Use `/login?redirect_uri=` handoff.
2. **id hub HTML** may be edge-patched (labels, absolute assets, Back labels) in `workers/id-gateway` — Railway alone may lag until redeployed.
3. **JWT secret** must stay consistent across Railway and any worker that verifies tokens.

---

## How to refresh this doc

```bash
npm run probe:deployments
npm run probe:auth
# Optional: paste results + date into this file
```

When a surface flips for more than a day, update the table and the “Honest status” section of the root `README.md`.
