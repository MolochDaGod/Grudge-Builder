# Fleet status — honest probe snapshot

**Date:** 2026-07-12 (identity SSOT pass)  
**Method:** HTTP probes + `/organizer` system map. Re-run:

```bash
npm run probe:truth:direct # ONE TRUTH: era=warlords chars, ID, craft, defs
npm run probe:organizer    # writes docs/ORGANIZER_PRODUCTION_AUDIT.md
npm run probe:deployments
npm run probe:auth
```

Identity law: [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md) · fleet.js **≥ 2.8.0** · crafting suite **≥ 5.7.0**.

This file is a **snapshot**, not a SLA. Update it when something important changes.  
Deep checklist: [ORGANIZER_PRODUCTION_AUDIT.md](./ORGANIZER_PRODUCTION_AUDIT.md).

---

## Critical path (player can sign in + load game shell)

| Surface | URL | Result (probe) | Notes |
|---------|-----|----------------|-------|
| Warlords SPA | https://grudgewarlords.com/ | **200** HTML | Primary client |
| Client alias | https://client.grudge-studio.com/ | **200** HTML | Same product family |
| Grudge ID health | https://id.grudge-studio.com/api/health | **200** JSON healthy | Worker → Railway grudge-api |
| Game API | https://grudge-api-production-0d46.up.railway.app/api/health | **200** JSON healthy | Player SSOT |
| Characters (warlords) | …/api/characters?era=warlords | **401** without JWT | Auth-gated roster (expected) |
| ObjectStore | https://objectstore.grudge-studio.com/health | **200** ok | Catalog defs |
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
