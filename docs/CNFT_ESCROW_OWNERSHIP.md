# cNFT escrow ownership (production SSOT)

**Status:** production default as of 2026-07  
**Code:** `server/spriteGeneration/services/nftMinting.ts` · `server/services/crossmintWallet.ts` · `POST /api/characters` · `/api/nfts/*`

## Model

| Layer | Authority | Required to play? |
|-------|-----------|-------------------|
| **Game ownership** | Railway Postgres: `characters` + `accounts` (Grudge ID / `grudge_id`) | **Yes** |
| **Chain custody** | Solana cNFT on **admin escrow wallet** (`AI_AGENT_WALLET`) | No (async mint) |
| **Player wallet possession** | Optional claim / transfer | **No** |

Players create and use heroes with **account JWT only**. Claiming the cNFT to a personal wallet is a later, optional action that may incur network (and optional GBUX) fees.

## Why escrow-first

Minting cNFTs **directly to users** caused wallet-provisioning failures, incomplete Crossmint email delivery, and blocked create flows when no wallet existed. Escrow-first:

1. Always has a known recipient (server admin wallet).
2. Binds metadata to `CharacterId`, `AccountId`, `GrudgeId`, `GrudgeCode`.
3. Keeps the fleet organized under one custody address.
4. Allows transfer when the player is ready (and can pay fees).

## Flow

```
POST /api/characters  (authenticated)
  → insert character (Railway)
  → optional AI avatar
  → nftMintingService.mintCharacterAsCNFT(id, accountId, …, { directToUser: false })
       → Crossmint mint → solana:<AI_AGENT_WALLET>
       → character_nfts.owner_wallet_address = "escrow:<admin>"
       → characters.cnft_id = actionId
  → return character (playable even if mint fails)

GET /api/characters
  → account roster for /heroes and Foundry (JWT required)

POST /api/nfts/:nftId/claim  (optional)
  → requires account.walletAddress
  → Crossmint transfer admin → player
  → status transferred; owner_wallet_address = player wallet
```

## API

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/characters` | Escrow mint (non-blocking) |
| `POST` | `/api/nfts/mint` | Escrow by default; `directToUser: true` for legacy/admin |
| `GET` | `/api/nfts/escrowed` | List escrow + fee info |
| `POST` | `/api/nfts/:id/claim` | Optional transfer to player wallet |
| `POST` | `/api/nfts/:id/check-status` | Poll Crossmint action |

## Env (Railway grudge-api)

| Variable | Required | Description |
|----------|----------|-------------|
| `CROSSMINT_SERVER_API_KEY` | Yes (for mint) | Crossmint server key |
| `CROSSMINT_COLLECTION_ID` | Recommended | Collection UUID or `default-solana` |
| `AI_AGENT_WALLET` | Yes (for escrow) | Admin Solana address for custody |
| `AGENT_ESCROW_WALLET` | Fallback | Alias for admin wallet |
| `CROSSMINT_TREASURY_WALLET` | Fallback | Alias for admin wallet |
| `CNFT_CLAIM_FEE_GBUX` | No | If `> 0`, deduct GBUX on claim |
| `APP_URL` | No | Absolute avatar URLs (`https://grudgewarlords.com`) |

## Heroes UI

`/heroes` loads characters from **JWT + Railway**, not from the chain.

- `?characterId=<uuid>` — select that hero if on the account roster.
- `?error=load` — show recovery (sign-in / create / retry). Example failed handoff:  
  `https://grudgewarlords.com/heroes?characterId=…&error=load`

## Anti-patterns

| Bad | Good |
|-----|------|
| Require wallet before create | Escrow mint; play with account |
| Use cNFT ownership as game truth | Railway `characters.userId` / account |
| Overwrite `escrow:` owner after mint poll | Keep `escrow:<admin>` until claim |
| Silent skip mint when no user wallet | Always try admin escrow |

## Related

- `server/services/crossmintWallet.ts` — Crossmint mint / transfer / status
- `docs/STACK_PATTERN.md` — production platforms
- README § “Characters, heroes roster, and cNFT”
