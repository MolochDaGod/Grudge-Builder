# Grudge Auth Connect — modular login for every fleet app

**One drop-in. Always returns to the origin that started login. Optimal token handoff.**

## Drop-in

```html
<script src="https://id.grudge-studio.com/grudge-game-bootstrap.js"></script>
<script>
  // optional
  window.GRUDGE_AUTH_GATEWAY = 'https://id.grudge-studio.com';
  window.GRUDGE_AUTH_MODE = 'popup'; // 'redirect' | 'popup' | 'modal'
</script>
```

Also available: `https://client.grudge-studio.com/grudge-game-bootstrap.js` (same module after deploy).

## API (`window.GrudgeAuth`)

| Call | Behavior |
|------|----------|
| `GrudgeAuth.start()` | Uses `GRUDGE_AUTH_MODE` or **redirect** |
| `GrudgeAuth.start({ mode: 'redirect' })` | Full page → id → back with `sso_token` + `grudge_token` |
| `GrudgeAuth.start({ mode: 'popup' })` | Centered popup; `postMessage` stores tokens; **page stays put** |
| `GrudgeAuth.start({ mode: 'modal' })` | Loads `grudge-auth-modal.js` from id; on-page UI |
| `GrudgeAuth.redirect()` / `.popup()` / `.modal()` | Same as above |
| `GrudgeAuth.require()` | Silent claim first; if not signed in, `start()` |
| `GrudgeAuth.currentReturnUrl()` | This origin + path (no stale handoff params) |
| `GrudgeAuth.buildLoginUrl()` | Canonical id URL with dual return params |
| `GrudgeAuth.getToken()` / `.authHeaders()` / `.logout()` | Session helpers |

### Options

```js
GrudgeAuth.start({
  mode: 'popup',           // redirect | popup | modal
  returnUrl: location.href, // default: current page on this origin
  force: true,              // skip sso-check, open full login UI
  app: 'voxgrudge',         // optional label
});
```

## What “optimal” means

1. **Return URL** is always the **calling domain** (`redirect_uri` + `redirect` + `return` dual-written).
2. **Redirect / SSO** handoff: full JWT as `sso_token` + short `grudge_token` + hash mirror.
3. **Popup**: auth page detects `window.opener` and `postMessage`s `{ type: 'grudge-auth:success', token, user }`.
4. **Tokens** stored under all fleet keys: `grudge_auth_token`, `grudge_session_token`, `sso_token`, …
5. **Pickup** on load strips tokens from URL after store.

## Events

```js
window.addEventListener('grudge:auth:ready', (e) => {
  console.log('token', e.detail.token);
});
window.addEventListener('grudge:auth:success', (e) => { /* same */ });
window.addEventListener('grudge:auth:logout', () => {});
```

## Do not

- Hand-roll `id.grudge-studio.com/login?…` without dual params
- Invent a second token key scheme
- Use `api.grudge-studio.com` for auth

## Related

- Auth page: Railway `server/templates/auth-page.html`
- Modal: `id.grudge-studio.com/grudge-auth-modal.js`
- Gateway: CF Worker `workers/id-gateway`
- Allowlist: `shared/fleet/authReturn.ts` (`*.vercel.app`, `*.puter.site`, …)
- SSO policy: `docs/ID_SSO_PRODUCTION.md`

---

## Verification — login must land on the **calling** app

Canonical example (Grudge Open):

```
https://id.grudge-studio.com/login?redirect_uri=https%3A%2F%2Fgameopen.vercel.app%2F
```

### Expected flow

```
1. App builds login URL with DUAL return params:
   redirect_uri + redirect + return + origin (+ app=gameopen)

2. id-gateway /auth/sso-check → /login?redirect_uri=…&redirect=…
   (never drop return)

3. User signs in (Puter / email / Discord / guest)

4. Auth page handoff:
   - stash lastSessionToken from login body ( /me has no JWT )
   - mint launch grudge_token for audience=https://gameopen.vercel.app
   - location.replace(returnTo + ?sso_token=…&grudge_token=…#sso_token=…)
   - Continue button + auto-retry if stuck on "Signed in"

5. App boot:
   - Prefer sso_token / token (session) over grudge_token (launch)
   - Read query AND hash
   - Store fleet keys: grudge_auth_token, grudge_session_token, sso_token, …
   - If only launch: POST /api/auth/session/exchange → session JWT
   - GET /api/auth/me + /api/characters with Authorization: Bearer
```

### Probe checklist

| Step | Expect |
|------|--------|
| `GET id…/auth/sso-check?return=https://gameopen.vercel.app/` | 302 → `/login?redirect_uri=…&redirect=…` |
| Login page HTML includes `redirect_uri` parsing + `lastSessionToken` | present |
| After sign-in, browser leaves `id.grudge-studio.com` | lands on gameopen with tokens |
| App localStorage | `sso_token` / `grudge_auth_token` set |
| `GET /api/auth/me` with Bearer | 200 account |
| Continue on "Signed in" if auto-nav fails | still returns to gameopen |

### Do **not**

- Prefer short `grudge_token` as Bearer (it is launch-only; bridge first)
- Hand-roll login with only `?redirect_uri=` and no dual aliases
- Strip return params in gateway rewrites
- Call `/api/auth/me` for Continue without stashed JWT (body has no token)

### Code SSOT

| Layer | File |
|-------|------|
| Auth page (Railway) | `server/templates/auth-page.html` (sync → `public/` + `client/public/`) |
| Gateway dual-write | `workers/id-gateway/src/index.js` |
| Allowlist | `shared/fleet/authReturn.ts` |
| Bootstrap | `client/public/grudge-game-bootstrap.js` → `id…/grudge-game-bootstrap.js` |
| Gameopen pickup | `gameopen/artifacts/animator/src/lib/grudgeAuth.ts` + `fleet.ts` |
