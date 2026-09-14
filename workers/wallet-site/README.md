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
| Images | Live poker CDN media (logo, GBUX, PokerSolPro, table hero) |

**Do not** point wallet at VPS `74.208.155.229`.

**Brand split (2026-08):** this host is the **Grudge Studio fleet bag**. Poker-branded fund/sit UI lives at `https://poker.grudge-studio.com/wallet`. Same Railway `/api/wallet/*` — do not invent a second bag.

## Player product (clean wallet tool)

| Feature | How |
|---------|-----|
| Working images | `poker.grudge-studio.com/media/**` (real image/*) |
| Sign in / reconnect | Grudge ID SSO + bridge + Domain cookie handoff |
| Connect Phantom | Handoff → `poker…/connect` with `sso_token` |
| Fleet bag GBUX | `GET /api/wallet/overview` (Railway) |
| Play GBUX | Poker `/api/wallet/scopes?wallet=` |
| **Fund play** | `POST /api/wallet/transfer-to-play` → debit bag → poker D1 credit |
| Bag SOL↔GBUX | `POST /api/exchange/quote` + `/swap` |
| Games grid | Auto-trader, Poker, Nexus, Warlords, Foundry, Open, GRUDOX, Mine, Forge, Casting |
| Gruda / Crossmint | `GET /api/wallet/status` first · `POST /api/wallet/create` only if missing |

## Deploy

```bash
cd Documents/Grudge-Builder/workers/wallet-site
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

Optional shared secret (align Railway + poker):

- Railway: `FLEET_PLAY_CREDIT_SECRET`
- Poker worker secret: `FLEET_PLAY_CREDIT_SECRET` (falls back to SESSION_SECRET)

## Health

```bash
curl -s https://wallet.grudge-studio.com/health
# features: … crossmint-check-first, auto-trader-handoff
```

## Auth SSOT

| Concern | Rule |
|---------|------|
| Login UI | **Only** id.grudge-studio.com |
| Session JWT | Railway users/accounts |
| Edge `/api/*` | Proxy → Railway |
| Guest | Never as signed-in wallet |
