# Warlords production stack pattern (ONE TRUTH)

**Use only these four platforms for production Warlords.**  
Everything else is optional, legacy, or a sibling product.

```
Browser
  │
  ├─ SPA ────────────────── Vercel (grudge.studio / grudgewarlords.com)
  │
  ├─ REST /api/* ────────── Railway grudge-api (Postgres SSOT + JWT auth)
  │
  ├─ WebSocket ──────────── Colyseus on same Railway process
  │                         wss://grudge-api-production-0d46.up.railway.app
  │
  └─ GLB / icons / catalog ─ Cloudflare
                            R2 → assets.grudge-studio.com
                            Workers → ObjectStore, id-gateway, CDN
```

## Platform roles

| Platform | Owns | Does **not** own |
|----------|------|------------------|
| **Vercel** | SPA shell, client routes, `/api/*` rewrites to Railway/id | Player rows, realtime rooms |
| **Railway** | Postgres (characters, islands, bag, sessions), Express API, Colyseus | Binary asset hosting |
| **Colyseus** | Matchmake + rooms (tutorial, lobby, sector, home_island, …) | Long-term inventory SSOT |
| **Cloudflare** | R2 binaries, edge Workers, D1 asset registry, auth edge proxy | Character UUID / island state |

## Explicitly not production SSOT

| System | Status |
|--------|--------|
| **Supabase** | Optional/legacy. `/api/supabase/health` probe only. Leave `SUPABASE_URL` unset. |
| **MySQL VPS** | Legacy tables only — not Warlords player path. |
| **D1** | Asset registry index — not heroes/islands/bag. |
| **Puter KV / localStorage** | Cache only. |
| **openworld-server (separate Railway)** | Not primary; Colyseus on grudge-api is the live path. |
| **api.grudge-studio.com** | Split-brain risk; prefer same-origin → Railway. |

## Deploy pattern

| Change type | Ship with |
|-------------|-----------|
| Client / Three / HUD | Vercel (`agent:deploy -- ship --yes --client` or `vercel --prod`) |
| API / auth / multiplayer REST / Colyseus rooms | Railway grudge-api (`agent:deploy -- ship --yes --api`) |
| GLB / textures / catalog binaries | Cloudflare R2 (`production:upload-*` / wrangler) |
| Edge workers (id, CDN, ObjectStore) | Cloudflare wrangler (`deploy:workers`) |

Agents: [PRODUCTION_AGENTS.md](./PRODUCTION_AGENTS.md) · skills `grudge-railway-agent`, `grudge-deploy-agent`, `grudge-live-ops`.

## Railway ignore pattern

`.railwayignore` must use **root-only** paths (`/supabase`, `/client`) so `server/supabase/` (probe routes) is never stripped. Never ignore all of `server/`.

## Verify

```bash
npm run agent:live-ops -- report
# Expect: health + colyseus + multiplayer/status 200
# Expect: /api/supabase/health → configured:false, required:false (OK)
```

## Related docs

- [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md)
- [DEPLOY_OWNERSHIP.md](./DEPLOY_OWNERSHIP.md)
- [INDUSTRY_BEST_PRACTICES_MP_PERF.md](./INDUSTRY_BEST_PRACTICES_MP_PERF.md)
- [MULTIPLAYER.md](./MULTIPLAYER.md)
