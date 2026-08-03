# grudge-wallet-site

Production edge for **https://wallet.grudge-studio.com/**

## Production topology (2026-07-25)

| Layer | Target |
|-------|--------|
| DNS | Cloudflare zone `grudge-studio.com` (proxied) |
| Worker route | `wallet.grudge-studio.com/*` → **`grudge-wallet-site`** |
| Game API | `RAILWAY_API_ORIGIN` = `https://grudge-api-production-0d46.up.railway.app` |
| Auth | `ID_GATEWAY_ORIGIN` = `https://id.grudge-studio.com` |

**Do not** point wallet at VPS `74.208.155.229`. That was the broken origin in the zone export.

## Deploy

```bash
cd F:\GitHub\GrudgeBuilder\workers\wallet-site
$env:WRANGLER_HOME = "C:\Users\nugye\.wrangler"
npx wrangler deploy --env=""
# If route already exists on another worker, reassign via CF API:
# PUT /zones/{zone}/workers/routes/{id}  { pattern, script: "grudge-wallet-site" }
```

## Env (production vars in wrangler.toml)

- `ENVIRONMENT=production`
- `RAILWAY_API_ORIGIN`
- `ID_GATEWAY_ORIGIN`
- `ASSETS_CDN` / `CLIENT_ORIGIN` / `PORTAL_ORIGIN`

## Health

```bash
curl -s https://wallet.grudge-studio.com/health
# { "ok": true, "service": "grudge-wallet-site", "vps_origin": false, ... }
```

## Auth SSOT (2026-08-02)

| Concern | Rule |
|---------|------|
| Login UI | **Only** `https://id.grudge-studio.com` (Discord / password / Puter) |
| Session JWT | Railway `users` + `accounts` (same Postgres as Foundry / client) |
| Edge `/api/auth/*` | Proxy → **Railway** (not id host — avoids 526 / split-brain) |
| Edge `/api/wallet/*`, `/api/characters` | Proxy → Railway |
| Token handoff | Prefer **`sso_token` / `token`** (session JWT) over short `grudge_token` (launch) |
| Guest | **Never** treat unauthenticated as guest account — `/api/wallet/status` returns 401 |

**Bug fixed:** unauthenticated `/api/wallet/status` used to resolve `userId=guest` and return the shared guest Crossmint wallet (`user-guest@grudgewarlords.com`), so Discord login that failed to store the real session JWT still “looked signed in” to the wrong roster.

**After Discord login:** clear site data if you still see guest, then Sign in again so `sso_token` is stored in fleet keys.
