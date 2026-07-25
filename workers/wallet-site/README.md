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
