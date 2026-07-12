# Organizer → production corrections

**Date:** 2026-07-12  
**Tools:** `/organizer` system map (`client/src/data/systemMap.ts`) + live HTTP probes (`scripts/_organizer-production-audit.mjs`)

Use this as the ops checklist when cleaning fleet production. Re-run:

```bash
node scripts/_organizer-production-audit.mjs
```

Then open https://grudgewarlords.com/organizer?tab=issues

---

## Production spine (healthy)

| Surface | Status | Notes |
|---------|--------|--------|
| grudgewarlords.com / client.g-s.com | **Live** | SPA + same-origin `/api/*` |
| id.grudge-studio.com | **Live** | `/api/health` 200 JSON |
| Railway grudge-api | **Live** | Player SSOT |
| objectstore.grudge-studio.com | **Live** | Catalog |
| assets.grudge-studio.com | **Live** | Icons/GLB |
| character.grudge-studio.com | **Live** | Create SSOT (GCS) |
| warlord-genesis.vercel.app | **Live** | Satellite MOBA |
| grudge6.grudge-studio.com/game | **Live** | After redirect; no CORS from SPA |
| launcher.grudge-studio.com | **Live** | HTML shell up (was planned) |
| dash.grudge-studio.com | **Live** | Admin |

Guest **401 JSON** on `/api/auth/me` and `/api/characters` is **healthy** (auth gate).

---

## Corrections applied (code + map)

### Client (already shipped / this pass)

| Issue | Organizer signal | Correction |
|-------|------------------|------------|
| ColladaLoader / THREE not extensible | Organizer graph crash | `react-force-graph-2d` only; mutable `window.THREE` |
| CORS to api.grudge-studio.com | Every page fetch | `portalUniverse` → same-origin `/api`, drop `X-Grudge-Token` |
| grudge6 probe CORS noise | Truth badge / systems | `browserSkip` on cross-origin SPA probes |
| Icon probes 403 risk | Truth icons | Probe absolute CDN URLs |

### System map (this pass)

| Node | Was | Now | Why |
|------|-----|-----|-----|
| `dom:ai.g-s.com` / `svc:ai-worker` | live | **broken** | Root returns `{"error":"unauthorized"}`; `/health` OK |
| `dom:objectstore.g-s.com` | mislabeled as info | **objectstore.grudge-studio.com** | Correct host |
| `dom:launcher.g-s.com` / `svc:launcher` | planned | **live** | HTML 200 |
| `svc:colyseus-*` | live | **planned** | Not prod-hardened; ws.* redirects to marketing |
| `dom:ws.g-s.com` | planned | planned + notes | 302 → grudge-studio.com, not WS |
| `dom:warlord-genesis`, `dom:grudge6` | missing | **live** | Fleet satellites |
| account health path | `/health` | **`/api/health`** | Readiness rows |
| id health path | `/health` | **`/api/health`** | Matches production |

---

## Still open (priority)

### P0 — AI hub root 401 — **FIXED 2026-07-12**

- **Was:** `GET https://ai.grudge-studio.com/` → `401 {"error":"unauthorized"}` (wrong worker on domain)
- **Done:** `npx wrangler deploy --config wrangler.domain.toml` in `grudge-ai-hub`
- **Now:** root → `200 text/html`; `/health` → `ok` / `grudge-ai-hub` v1.1.0

### P1 — Do not productize half-live hosts

| Host | Reality | Action |
|------|---------|--------|
| `ws.grudge-studio.com` | Redirects to portal HTML | Keep **planned**; no multiplayer marketing |
| `engine.grudge-studio.com` | DNS/fetch fail | Keep **planned** |
| `api.grudge-studio.com` | Still up | **Deprecated** for SPA; same-origin only |
| Puter broken shells | 404/stale | Leave **broken** until retire |

### P2 — Readiness / ops debt (medium)

Missing rate-limit / observability flags on id, game-api, wallet, AI — track in mission repo; not user-facing crashes.

### P3 — Broken puter / launcher aliases

- `grudgedot-launcher.vercel.app` — broken  
- `grudgewarlords.puter.site`, `grudge-studio.puter.site` — broken / untracked  

Decide keep vs delete; do not link from Warlords home.

---

## How to use /organizer for weekly ops

1. Open **Graph** — filter `broken` / `deprecated` (red/grey).
2. Open **Issues** — auto-computed readiness holes + live-depends-on-planned.
3. Open **Readiness** — missing cells = work items.
4. Run `node scripts/_organizer-production-audit.mjs` after any fleet change.
5. If SPA regressions: check Network for `api.grudge-studio.com` (should be zero) and same-origin `/api/*`.

---

## Probe snapshot (2026-07-12)

Critical path **OK**. Failed/weak: `info` root 308 (health OK), `grudge6` 307 (game HTML OK after follow), `engine` fail (planned), `ai` root 401 (broken UX).
