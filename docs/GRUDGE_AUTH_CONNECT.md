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
