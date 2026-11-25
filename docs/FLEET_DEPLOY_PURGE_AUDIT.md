# Fleet deploy purge audit (2026-08-01)

Best-effort organization of accidental duplicates, mismatched systems, and dead probes.

## Live score (before fixes)

- `npm run probe:all` → **28/35 OK**, ONE TRUTH **96%**
- Primary fail: `carrier.grudge-studio.com/` **404** (API health **200** — L3 edge host)
- Dead probes still registered: Pages ObjectStore, dead Puter shells, `grudachain.grudgestudio.com`

## Canonical ownership (do not dual-deploy)

| Surface | Canonical | Deploy | Do not use |
|---------|-----------|--------|------------|
| Warlords client | `client.grudge-studio.com` / `grudgewarlords.com` | Vercel **`grudge-builder`** | Second “rest-express” clones |
| Open launcher | `open.grudge-studio.com` | Vercel **`gameopen`** | Duplicate project `open.grudge-studio.com` only if alias-only |
| GRUDOX hub | `grudox.grudge-studio.com` | Vercel **grudox** + CF Worker **grudox-grudge-studio** | |
| Carrier PvP edge | `carrier.grudge-studio.com` | **Same CF Worker** (WS + shell static) | Expecting HTML from Vercel alone |
| Water / home island | `water.grudge-studio.com` | **Tactical-Infinity** linked domain | `tactical-infinity.vercel.app` as player URL |
| Characters SSOT | Railway `grudge-api-production-0d46` | Railway | `api.grudge-studio.com` for bag/XP |
| Catalogs | `objectstore.grudge-studio.com/api/v1/*` (canonical) | CF ObjectStore Worker | `grudge-objectstore.pages.dev` (deprecated), `info.grudge-studio.com` (legacy alias) |
| Binaries | `assets.grudge-studio.com` | R2 CDN worker | git large GLBs |

## Probe purges (code)

`scripts/probe-deployments.mjs`:

| Removed / replaced | Reason |
|--------------------|--------|
| `grudge-objectstore.pages.dev/...` | Deprecated Pages |
| `grudachain.grudgestudio.com` | DNS / fetch fail |
| `grudge-server.puter.work/api/health` | 404 |
| `grudgewarlords.puter.site` | 404 |
| `grudgestudio.puter.site` | 404 |
| `grudge-studio.com/api/status` | Not wired |
| Carrier bare `/` as only check | Prefer `/api/health` + shell after Worker redeploy |

## Package identity mismatch

| Repo | Was | Fixed |
|------|-----|-------|
| GrudgeBuilder | `name: "rest-express"` (Replit template collision with Tactical-Infinity) | `name: "grudge-builder"` |

## Vercel project clutter (manual purge candidates)

Do **not** mass-delete without checking domains/aliases. High-risk duplicates to review in dashboard:

| Project | Issue |
|---------|--------|
| `gameopen` vs `open.grudge-studio.com` vs `animator` | Possible triple deploy of Open surfaces |
| `grudge-multiverse` vs `grudge-metaverse` | Naming fork |
| `flare-boss-arena` vs `flare-boss-arena-src` | Source vs built |
| `rts-grudge` vs `rts-grudge-fix` | Fix branch project leftover |
| `survival` vs `deploy-survival` | Deploy scratch |
| `threejs-rapier-react-three-controll` vs `…-controller-animator` | Typo + long-name dup |
| `public`, `web`, `deploy-lean` | Generic names — verify empty then archive |
| `tactical-infinity` | Keep for builds; **player URL must be water.grudge-studio.com** |

## Dual disk trees (source of deploy miss-match)

| Path | Branch | Note |
|------|--------|------|
| `F:\GitHub\GrudgeBuilder` | feature branches | Agent working tree |
| `C:\Users\nugye\Documents\Grudge-Builder` | `main` | Often behind / divergent |
| `F:\GitHub\gameopen` vs `Documents\gameopen` | both main, different SHAs | Align before Open prod deploy |

**Rule:** One SSOT path per product deploy; never `vercel --prod` from the stale tree.

## Deploy actions this pass

1. Redeploy CF Worker `grudox-grudge-studio` (restores `carrier-host` static shell).
2. Purge dead probe URLs; add Carrier health probe.
3. Rename package to `grudge-builder`.
4. Ship asset map work (tz-pirate ship, skydomes, assassination grounds) on **grudge-builder** production.

## Smoke after deploy

```bash
cd F:\GitHub\GrudgeBuilder
npm run probe:all
# expect Carrier shell + health 200, score ≥ 98%

curl -sI https://carrier.grudge-studio.com/
curl -s https://carrier.grudge-studio.com/api/health
curl -sI https://client.grudge-studio.com/assassination-grounds
curl -sI https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb
```
