# Grudge ID — production SSO & signed-site provisions

**Surface:** `https://id.grudge-studio.com`  
**SSOT:** Railway `grudge-api-production` (`server/routes/auth.ts`)  
**Edge:** CF Worker `grudge-identity-api` (`workers/id-gateway`)

---

## Goals

1. **Pass-through** — login on ID returns to any fleet / signed deployment with tokens the app can consume.
2. **Stay active** — session lives on the device for the full policy window (default **30 days**), with silent refresh.
3. **Production / signed sites** — allowlist + env extras for partner custom domains.

---

## Session policy (easiest + longest fleet entry)

| Token | Default TTL | Purpose |
|-------|-------------|---------|
| Session JWT (`sso_token` / Bearer) | **365d** (`JWT_SESSION_TTL`, max 365d) | App API calls; localStorage + HttpOnly cookie |
| Launch JWT (`grudge_token`) | **60m** (`JWT_LAUNCH_TTL`) | One-shot bridge → session via grudge-bridge |
| Cookie `grudge_auth_token` | Same as session | Silent SSO; Domain `.grudge-studio.com` via gateway |
| Discord OAuth | identify + email | No `prompt=consent`; dual handoff + long cookie |

**One login on id → all Grudge Studio deployments** (no re-form):

1. Login once at `id.grudge-studio.com` (Puter / email / Grudge button).
2. Gateway sets `Domain=.grudge-studio.com` cookie (90d).
3. Other apps call `POST /api/auth/session/claim` with `credentials: 'include'` **or** navigate to `/auth/sso-check?return=…`.
4. Bootstrap + dash do claim silently on boot when no local token.

Env (Railway):

```bash
JWT_SESSION_TTL=365d         # max allowed (default)
JWT_LAUNCH_TTL=60m
DISCORD_REDIRECT_URI=https://id.grudge-studio.com/auth/discord/callback
AUTH_EXTRA_RETURN_HOSTS=partner.example.com,app.signed-site.io
FORCE_SECURE_COOKIES=1       # optional when NODE_ENV != production
```


Refresh / claim (stay signed in without re-login):

```http
POST /api/auth/refresh
Authorization: Bearer <session-jwt>

POST /api/auth/session/claim
Cookie: grudge_auth_token=…   # credentials: include from *.grudge-studio.com
```

Bootstrap (`grudge-game-bootstrap.js`) auto-claims, auto-refreshes when &lt;2 days remain, and on tab focus.

---

## Handoff contract (satellites)

After login, return URL may include:

| Param | Where | Meaning |
|-------|--------|---------|
| `grudge_token` | query + hash | Short launch JWT → `POST /api/auth/grudge-bridge` or `/session/exchange` |
| `sso_token` / `token` | query + hash | Full session JWT → store as Bearer |
| `grudge_id`, `username` | query | Profile hints |

**Client storage keys** (write all, read any):  
`grudge_auth_token` · `grudge_session_token` · `grudge.token` · `sso_token` · `grudge_token`

Canonical login:

```
https://id.grudge-studio.com/login?redirect_uri=<https-callback>
```

Drop-in:

```html
<script src="https://id.grudge-studio.com/grudge-game-bootstrap.js"></script>
<script>
  GrudgeAuth.pickup();
  if (!GrudgeAuth.isAuthenticated()) GrudgeAuth.loginPage('/auth/callback');
</script>
```

---

## Return allowlist

Built-in hosts/suffixes: `*.grudge-studio.com`, `grudgewarlords.com`, `*.vercel.app`, `*.pages.dev`, `*.workers.dev`, `*.puter.site`, `*.github.io`, `*.netlify.app`, Railway previews, Puter apex.

**Path products on portal apex** (same host allowlist; product via `app=` + path):

| Product | Origin / callback | `app=` | Account data |
|---------|-------------------|--------|--------------|
| **Game Studio Tool** | `https://grudge-studio.com/gst` → `/gst/auth/callback` | `gst` | Same Railway account + characters as all fleet games |
| GST satellite | `https://grudge-studio-tool.vercel.app/auth/callback` | `gst` | Same |

Labels: `auth-page.html` `APP_LABELS.gst` + path `/gst` detection. Fleet map: `FLEET_GAME_ORIGINS.gst`.

**Custom signed production domain:**

1. Add hostname to Railway: `AUTH_EXTRA_RETURN_HOSTS=your.domain.com`
2. Ensure CORS: Railway `server/cors.ts` regex or exact origin (redeploy)
3. ID gateway already allows common suffixes; custom apex needs worker redeploy or rely on Bearer-only (no credentialed CORS)
4. Wire app: bootstrap + `redirect_uri` HTTPS
5. Smoke: login → callback receives `grudge_token`/`sso_token` → API `Authorization: Bearer` works

Code: `shared/fleet/authReturn.ts` · `isFleetAllowedReturnUrl()`.

---

## Deploy

```bash
# 1) Auth API (session TTL, refresh, allowlist)
# Push GrudgeBuilder → Railway auto-deploy grudge-api-production

# 2) ID edge (cookie Domain, CORS, frame-ancestors)
cd workers/id-gateway && npx wrangler deploy

# 3) Bootstrap is served from Railway/public via id proxy
#    client/public/grudge-game-bootstrap.js is build source
```

Ownership: see `docs/DEPLOY_OWNERSHIP.md` (`id.grudge-studio.com` → id-gateway + Railway).

Probes:

```bash
npm run probe:golden
npm run probe:gate
```

---

## Security notes

- Launch audience must be allowlisted (`POST /api/auth/popup-token`).
- Prefer hash for long-lived `sso_token` (bootstrap reads both query and hash).
- HttpOnly cookie is rewritten by id-gateway to `Domain=.grudge-studio.com` for first-party SSO; third-party TLDs (Puter, Vercel) always use Bearer handoff.
- Cap session at 30d; users re-auth after expiry or logout.
