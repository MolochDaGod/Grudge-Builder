# Wallet + environment wiring (production SSOT)

## Layers (do not collapse)

| Layer | Owner | Secret? | Purpose |
|-------|--------|---------|---------|
| **Grudge ID** | `id.grudge-studio.com` + Railway JWT | `JWT_SECRET` server-only | Login, characters, account |
| **Game data** | Railway `grudge-api-production-0d46` | `DATABASE_URL` | Wallet overview, link, GBUX |
| **Solana link** | `/api/wallet/link/*` | RPC / treasury keys server-only | Phantom Embedded / Solflare challenge-sign |
| **EVM connect** | EIP-6963 client | none for discovery | MetaMask, Binance, … opt-in only |
| **Assets** | R2 `assets.grudge-studio.com` | R2 keys server-only | GLBs, textures |

## Best practices (implemented)

1. **Opt-in wallets** — never discover or `eth_requestAccounts` on page load. Only after **Wallet → Wallets** tab.
2. **EIP-6963** — multi-wallet discovery without racing `window.ethereum` (`client/src/lib/wallet/eip6963.ts`).
3. **Lazy Phantom** — `@phantom/browser-sdk` dynamic-import on click (`grudgeBackend.connectPhantomEmbedded`).
4. **Identity first** — Grudge ID / guest SSO; wallet link requires JWT.
5. **Same-origin APIs** — browser uses `/api/*` Vercel rewrites; never expose Railway secrets to Vite.
6. **Public vs secret** — `VITE_*` and `FLEET_CLIENT_ENV` are public; `FLEET_SERVER_SECRET_KEYS` never in client.

## Client env (Vercel)

Copy from `shared/fleet/storage.ts` → `FLEET_CLIENT_ENV` and `.env.production.example`:

- `VITE_ASSETS_URL`, `VITE_AUTH_GATEWAY_URL`, `VITE_GAME_DATA_API`, `VITE_PHANTOM_APP_ID`, …

## Server secrets (Railway)

Listed in `FLEET_SERVER_SECRET_KEYS` — `DATABASE_URL`, `JWT_SECRET`, Crossmint, R2, treasury, etc.

## User flows

```
Sign in (Grudge ID)
  → open Grudge Wallet FAB
  → Wallets tab
  → Link Phantom (Solana SSOT)  OR  click MetaMask/Binance (EIP-6963 session)
```

GBUX purchase / link confirmation uses **Solana linked** wallets today. EVM session is for display + future personal_sign Railway link.

## Extension console noise

`inpage.js` / `IN_PAGE_CHANNEL_NODE_ID` / `evmAsk.js` come from **extensions**, not Grudge. EIP-6963 reduces *our* conflicts; multi-extension users may still see wallet logs.
