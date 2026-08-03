# Warlords / Grudge Studio — Verified Game cNFT + One Wallet SSOT

**Project (grudgedev):** `8410e23e-d003-4061-9b65-7c886a6c46ec`  
**Shared collection (heroes + islands):** `5061318d-ff65-4893-ac4b-9b28efb18ace` (“Grudge Warlords”)  
**Character template:** `a9bb2c8d-1350-4413-aec7-5ba1f6888511` (“Warlord Pre Sale”)  
**Home Island template:** `18d0e641-8713-4d5b-9a1d-ba67c516a3ce` (“Home Island”) — **template id, not a collection**  
**Env:** production (`www.crossmint.com`)

---

## 1. One server-side wallet per account (hard law)

```
One Grudge ID (users.grudge_id)
  → One Railway accounts row
    → One Solana walletAddress (walletType = crossmint)
      → ALL mints for that human land here:
          · Warlords characters (era=warlords)
          · Islands
          · Future eras (nexus / voxel / armada) when they mint
          · Any fleet service using Engine Account DB
```

| Do | Don't |
|----|--------|
| `ensureWallet(accountId)` once on first auth / first mint | Create a wallet per character or per era |
| Locator stable: `grudge+{grudgeId}@accounts.grudge-studio.com` or V1 alias `grudge:{grudgeId}` | Use random emails per create |
| Mint **to** `accounts.walletAddress` (or escrow then **claim only to that address**) | Mint characters to email A and islands to email B |
| Store `crossmintWalletId` + `walletAddress` on **account** only | Store wallet on character row as source of truth |

**Production custody (wired):**

1. **Account create / first touch** → `ensureAccountWallet` → Crossmint Solana custodial wallet keyed by `grudgeId` → `accounts.walletAddress`.  
2. **Character / island mint (primary)** → `accounts.walletAddress`  
   - Both use collection `5061318d-…`  
   - Character template `a9bb2c8d-…` · Island template `18d0e641-…`  
3. **Backup (not escrow):** if no wallet or address mint fails → mint to **account email**  
   (`email` → `crossmintEmail` → `grudge+{grudgeId}@accounts.grudge-studio.com`) via Crossmint `email:…:solana`.  
4. **Last resort only:** `AI_AGENT_WALLET` escrow + claim (ops / disaster).  
5. Game ownership always Railway.

Ops force escrow: `{ "escrowOnly": true }` on mint endpoints.

---

## 2. Verified project checklist (best process)

### Crossmint Console

1. Production project = grudgedev (`8410e23e-…`).  
2. Collections show **Solana mainnet**, compressed where intended.  
3. Character collection metadata: name **Grudge Warlords Heroes**, logo, description, external URL `https://grudgewarlords.com`.  
4. Island collection: separate contract/collection id (above).  
5. Templates: Warlords template id locked; traits schema documented.  
6. API keys: **server** `sk_production_…` only on Railway; **client** `ck_production_…` only in VITE for browser checkout (never mint with client key).  
7. Scopes: `nfts.create`, `nfts.update`, `nfts.read`, `collections.read`, wallets create/read as needed.  
8. Content policy compliance (no prohibited content).  
9. If selling via Checkout / primary sales: [Account verification](https://docs.crossmint.com/introduction/platform/account-verification) — Order Form + KYB for Checkout products. **Tokenization (mint airdrop) does not require KYB**, but marketplace *sales* / Checkout do.

### On-chain visibility

1. Mint at least one **successful** mainnet cNFT with real metadata (image URL absolute HTTPS).  
2. Confirm mint hash / asset id in Crossmint action status.  
3. View on Solana explorers that support cNFTs (e.g. **Helius XRAY / Orb** — classic explorers often lag on compression).  
4. Tensor / Magic Eden index when: collection has enough mints + metadata resolves + creators/royalties set.

### Tensor (`tensor.trade/trade/...`)

- Your link `…/trade/a75c44f7-b0fc-416c-b04b-d44b3f7e5123` is a Tensor **collection slug/id**.  
- Tensor verifies/indexes collections from on-chain activity + metadata; “verified” checkmarks are **marketplace** processes (creator verification on ME/Tensor), not only Crossmint.  
- Steps for a clean Tensor presence:
  1. Same collection mint authority / tree (Crossmint managed).  
  2. Consistent collection name + image in metadata.  
  3. Set **seller fee / royalties** via Crossmint collection royalties API if using managed collections.  
  4. Apply for Tensor collection verification / creator tools when available in their dashboard (creator wallet proof).  
  5. Optional: Crossmint [list for sale / royalties](https://docs.crossmint.com/minting/nfts/integrate/list-for-sale).

### Magic Eden / other

- Solana ME: creator verification with wallet that holds update authority or Crossmint-managed creator path.  
- Register collection if required for primary sales.  
- Compressed NFTs: ensure marketplace supports cNFT (Tensor and ME both do at scale).

### Brand / trust pack (do once)

| Asset | Where |
|-------|--------|
| Collection avatar 512–1024 | Crossmint + Tensor |
| Banner | Marketplace profiles |
| Website | grudgewarlords.com + character.grudge-studio.com |
| Discord / X | Linked in marketplace + Crossmint |
| Provenance doc | “Game ownership = Grudge ID; chain = playable asset mirror” |

---

## 3. Runtime mint process (server only)

```
Auth JWT → account row
  → ensureServerWallet(grudgeId)  // idempotent, one address
  → POST character (Railway)
  → mintCharacterAsCNFT(characterId, accountId)
       recipient = account.walletAddress  // preferred for marketplace inventory
       OR escrow + claim to same wallet
  → character_nfts + characters.cnftId
  → later: PATCH metadata on level/equip (debounced)
```

Islands: same `account.walletAddress`, collection = `CROSSMINT_ISLAND_COLLECTION_ID`.

---

## 4. Env keys (production)

| Key | Where | Notes |
|-----|--------|--------|
| `CROSSMINT_SERVER_API_KEY` | Railway + local `.env` | **Never** `VITE_` |
| `CROSSMINT_PROJECT_ID` | Railway + local | grudgedev |
| `CROSSMINT_COLLECTION_ID` | Railway | characters |
| `CROSSMINT_CHARACTER_TEMPLATE_ID` | Railway | Warlords template |
| `CROSSMINT_ISLAND_COLLECTION_ID` | Railway | islands |
| `AI_AGENT_WALLET` | Railway | escrow only if policy B |
| `VITE_CROSSMINT_CLIENT_KEY` | Client builds only | `ck_…` |
| `VITE_CROSSMINT_*_COLLECTION` | Client builds | display / checkout |
| `VITE_CROSSMINT_ENV` | Client | `production` |

Upsert script: `node scripts/upsert-crossmint-secrets.mjs`

---

## 5. Security

- Rotate any `sk_` / `ck_` pasted into chat, tickets, or public repos.  
- Server key never in CF Pages / Vercel client bundles.  
- Client key may appear in browser; restrict scopes accordingly.
