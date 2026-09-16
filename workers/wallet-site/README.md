# grudge-wallet-site

Production edge for **https://wallet.grudge-studio.com/**

## Production topology (2026-08-09)

| Layer | Target |
|-------|--------|
| DNS | Cloudflare zone `grudge-studio.com` (proxied) |
| Worker route | `wallet.grudge-studio.com/*` → **`grudge-wallet-site`** |
| Game API | `RAILWAY_API_ORIGIN` = Railway grudge-api |
| Auth login UI | `ID_GATEWAY_ORIGIN` = `https://id.grudge-studio.com` |
| Play ledger | `POKER_ORIGIN` = `https://poker.grudge-studio.com` |
| Images | Same-origin `/media/*` (Worker assets) + live unique host images (poker og, Open opengraph, apple-touch icons) |

**Do not** point wallet at VPS `74.208.155.229`.

**Brand split (2026-08):** this host is the **Grudge Studio fleet bag**. Poker-branded fund/sit UI lives at `https://poker.grudge-studio.com/wallet`. Same Railway `/api/wallet/*` — do not invent a second bag.

## Player product (clean wallet tool)

This host is the **studio bag**. Poker sit is **not** this page.

| Piece | Job |
|-------|-----|
| **Grudge ID** | Who you are — `/login` 302 → `id.grudge-studio.com` · return `/auth/callback` |
| **Phantom Connect** | How you sign — handoff `poker…/connect` with `#sso_token=` |
| **Play ledger** | How the table runs — poker D1 (200 welcome GBUX is **real** play money) |
| **Fleet bag** | Railway `GET /api/wallet/overview` (can be 0 while play is 200) |

| Feature | How |
|---------|-----|
| Working images | Tile `<img>` on each connected-app card; `/media/*` from Worker assets |
| Sign in | Grudge ID SSO → `/auth/callback` (do **not** proxy `/login` to ID from this Worker — that 526s) |
| Shared session | JWT cookie `Domain=.grudge-studio.com` (`grudge_auth_token` + `sso_token`) so poker ↔ wallet stay signed in |
| Connect Phantom | Handoff → `poker…/connect` with `sso_token` |
| On-chain GBUX / SOL | Poker `/api/wallet/scopes?wallet=` |
| **Fund play** | `POST /api/wallet/transfer-to-play` → debit bag → poker D1 (disabled if bag &lt; 1) |
| Bag SOL↔GBUX | `POST /api/exchange/quote` + `/swap` |
| Games grid | Poker, Phantom, Warlords, Foundry, Open, GRUDOX, Mine, Forge, Casting, Portal |
| Games grid | Auto-trader, Poker, Nexus, Warlords, Foundry, Open, GRUDOX, Mine, Forge, Casting |
| Gruda / Crossmint | `GET /api/wallet/status` first · `POST /api/wallet/create` only if missing |

## Deploy

```bash
cd F:\GitHub\GrudgeBuilder\workers\wallet-site
$env:WRANGLER_HOME = "C:\Users\nugye\.wrangler"
npx wrangler deploy --env=""
```

Railway (transfer-to-play route lives in grudge-api):

```bash
cd Documents/Grudge-Builder
railway up
```

Poker (credit-from-fleet):

```bash
cd Projects/poker-grudge
npm run build && npx wrangler deploy
```

Shared handshake secret (align Railway + poker — **no SESSION_SECRET / JWT_SECRET fallback**):

- Railway: `FLEET_PLAY_CREDIT_SECRET`
- Poker Worker: `FLEET_PLAY_CREDIT_SECRET` (same string)

## Health

```bash
curl -s https://wallet.grudge-studio.com/health
# features: fleet-bag, transfer-to-play, exchange-swap, game-handoff, phantom-reconnect, app-tiles, auth-callback
# features: … crossmint-check-first, auto-trader-handoff, pwa-install
# PWA: /manifest.webmanifest · /sw.js · Install app (Chrome/Edge/Android)
```

## Auth SSOT

| Concern | Rule |
|---------|------|
| Login UI | **Only** id.grudge-studio.com |
| Session JWT | Railway users/accounts · cookie `Domain=.grudge-studio.com` + localStorage |
| Edge `/api/*` | Proxy → Railway |
| Guest | Never as signed-in wallet |
| Crossmint | Server/ops on Railway — not a player connect CTA here |
