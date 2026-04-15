# Wallet & Grudge ID Integration - Grudge Builder

## ✅ Integration Complete!

The Grudge Builder now has full server-side wallet generation and Grudge ID support, matching the Warlord-Crafting-Suite implementation.

---

## 🎯 What Was Added

### 1. **Grudge ID Generation**
**File**: `server/services/walletHelper.ts`

Every user now automatically gets a unique cross-game identifier:
```
Format: GRUDGE_<12_UPPERCASE_CHARS>
Example: GRUDGE_A1B2C3D4E5F6
```

This ID is:
- ✅ Generated from user UUID (first 12 chars)
- ✅ Unique across all GRUDGE games
- ✅ Permanent (never changes)
- ✅ Used for cross-game data linking

### 2. **Server-Side Solana Wallet Creation**
**Files**: 
- `server/services/crossmintWallet.ts` - Crossmint API integration
- `server/services/walletHelper.ts` - Wallet generation helpers

**What happens during account creation:**
1. User creates account → Grudge ID generated
2. Email determined (user email or `username@grudgewarlords.com`)
3. Crossmint custodial wallet created via API
4. Wallet address (GRUDA) stored in account
5. Account ready with both Grudge ID and wallet!

### 3. **Database Schema Updates**
**File**: `shared/schema.ts`

**Users table** - Added:
```typescript
grudgeId: text("grudge_id").unique()  // GRUDGE_<12_CHARS>
email: text("email")                   // For wallet/recovery
```

**Accounts table** - Already had wallet fields, added:
```typescript
grudgeId: text("grudge_id").unique()           // Cross-game ID
walletAddress: text("wallet_address")          // Solana address
crossmintWalletId: text("crossmint_wallet_id") // Crossmint ID
crossmintEmail: text("crossmint_email")        // Recovery email
walletType: text("wallet_type")                // 'crossmint' or 'external'
```

### 4. **Automatic Wallet Creation**
**File**: `server/storage.ts` - `getOrCreateAccountForUser()`

**When a new account is created:**
```typescript
// 1. Generate Grudge ID
const grudgeId = generateGrudgeId(userId);  // GRUDGE_A1B2C3...

// 2. Determine email
const email = user?.email || `${username}@grudgewarlords.com`;

// 3. Create Crossmint wallet
const wallet = await crossmintWalletService.getOrCreateWallet(email);

// 4. Store in account
return createAccount({
  userId,
  grudgeId,
  walletAddress: wallet.address,
  crossmintWalletId: wallet.id,
  crossmintEmail: email,
  walletType: 'crossmint'
});
```

---

## 🔄 How It Works in Natural Gameplay

### **Player Registration Flow**
```
1. Player creates account → POST /api/characters (first character creation)
2. Server calls: storage.getOrCreateAccountForUser(userId)
3. Account created with:
   ✅ Grudge ID: GRUDGE_A1B2C3D4E5F6
   ✅ Wallet Address: 7xKz...9pQm (Solana)
   ✅ Email: player@grudgewarlords.com
4. Character created and linked to account
5. Player can now receive NFTs and GbuX tokens!
```

### **Character Creation Flow**
```
1. Player creates character
2. System checks: Does user have account?
   - NO → Create account with wallet + Grudge ID
   - YES → Use existing account (already has wallet)
3. Character created with accountId link
4. Character automatically has access to:
   - Account wallet for NFT minting
   - Grudge ID for cross-game identity
   - Shared inventory/resources
```

---

## 🎮 Features Now Available

### ✅ Server-Side Wallet Generation
- **Crossmint Custodial Wallets**: Players get wallets automatically
- **No Extension Required**: Works without Phantom/Backpack
- **Email-Based**: Recovery via email
- **Secure**: Private keys managed by Crossmint

### ✅ Grudge ID Cross-Game Identity
- **Permanent ID**: Never changes across games
- **Cross-Game Linking**: Share data between Grudge products
- **Future-Proof**: Works with upcoming Grudge games

### ✅ NFT Minting Ready
- Characters can be minted as cNFTs (compressed NFTs)
- Islands can be minted as cNFTs
- Server-side minting via Crossmint API
- Supports both custodial and external wallets

---

## 🔧 Environment Variables Needed

Add to `.env`:
```bash
# Crossmint Configuration (checked in order: SERVER > SECRET > API)
CROSSMINT_SERVER_API_KEY=your_server_api_key_here
CROSSMINT_SECRET_KEY=your_secret_key_here          # fallback
CROSSMINT_API_KEY=your_api_key_here                 # fallback
CROSSMINT_USE_STAGING=false                         # true for testing
CROSSMINT_COLLECTION_ID=default-solana              # Crossmint collection
CROSSMINT_ISLAND_CNFT=                              # Island template ID (optional)

# Solana Network
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Get API Keys**: [Crossmint Console](https://www.crossmint.com/console)

---

## 📊 Database Migration Required

Run this SQL to add new fields to existing database:

```sql
-- Add grudgeId and email to users table
ALTER TABLE users 
ADD COLUMN grudge_id TEXT UNIQUE,
ADD COLUMN email TEXT;

-- Add grudgeId to accounts table
ALTER TABLE accounts
ADD COLUMN grudge_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_users_grudge_id ON users(grudge_id);
CREATE INDEX idx_accounts_grudge_id ON accounts(grudge_id);

-- Backfill Grudge IDs for existing users (optional)
UPDATE users 
SET grudge_id = 'GRUDGE_' || UPPER(REPLACE(SUBSTRING(id::text, 1, 12), '-', ''))
WHERE grudge_id IS NULL;

UPDATE accounts 
SET grudge_id = (
  SELECT 'GRUDGE_' || UPPER(REPLACE(SUBSTRING(u.id::text, 1, 12), '-', ''))
  FROM users u 
  WHERE u.id = accounts.user_id
)
WHERE grudge_id IS NULL;
```

---

## 🧪 Testing the Integration

### Test 1: Create New Character (First Account)
```bash
# POST /api/characters
{
  "name": "TestHero",
  "raceId": "human",
  "classId": "warrior",
  "attributes": { "STR": 10, "VIT": 8, ... }
}

# Expected logs:
# [Storage] Creating account for user abc123 with Grudge ID: GRUDGE_ABC123DEF456
# [Crossmint] Creating new wallet for: testhero@grudgewarlords.com
# [Crossmint] Wallet created: 7xKz...9pQm
```

### Test 2: Check Account Data
```bash
# GET /api/accounts/:userId

# Expected response:
{
  "id": "abc123...",
  "userId": "def456...",
  "grudgeId": "GRUDGE_ABC123DEF456",
  "walletAddress": "7xKz...9pQm",
  "crossmintWalletId": "cm_wallet_...",
  "crossmintEmail": "testhero@grudgewarlords.com",
  "walletType": "crossmint",
  ...
}
```

### Test 3: Verify Wallet Creation
```bash
# Check Crossmint Console:
# https://www.crossmint.com/console/wallets

# Should see wallet for testhero@grudgewarlords.com
```

---

## 🔗 Integration with Warlord-Crafting-Suite

Both codebases now have **identical wallet generation**:

| Feature | Grudge-Builder | Warlord-Crafting-Suite |
|---------|---------------|------------------------|
| Grudge ID Format | `GRUDGE_<12_CHARS>` | `GRUDGE_<12_CHARS>` ✅ |
| Wallet Service | Crossmint API | Crossmint API ✅ |
| Auto-Creation | ✅ Account creation | ✅ Account creation |
| Email Format | `user@grudgewarlords.com` | `user@grudgewarlords.com` ✅ |
| Schema Fields | ✅ All fields | ✅ All fields |

**Result**: Players can use the same Grudge ID and wallet across both games!

---

## 🚀 Next Steps (Optional Enhancements)

1. **GbuX Airdrop**: Add 100 GbuX welcome bonus (copy from Warlord-Crafting-Suite's `aiAgentWallet.ts`)
2. **NFT Minting Endpoints**: Add `/api/character-nfts/mint` route (exists in Warlord-Crafting-Suite)
3. **Wallet Recovery**: Add recovery endpoint for lost accounts
4. **External Wallet Support**: Add WalletConnect for Phantom/Backpack users

---

## 📝 Files Created/Modified

### Canonical Services
- `server/services/crossmintWallet.ts` — **Single source of truth** for all Crossmint API operations (wallets, character cNFTs, island cNFTs, metadata updates, mint status polling)
- `server/services/walletHelper.ts` — Wallet generation utilities (Grudge ID, email generation, account wallet init)
- `server/services/nftMinting.ts` — Re-exports NFTMintingService (implementation in spriteGeneration/)
- `server/spriteGeneration/services/crossmintWallet.ts` — **Re-export only** (points to canonical `server/services/crossmintWallet.ts`)
- `server/spriteGeneration/services/nftMinting.ts` — NFT minting logic (DB operations, mint orchestration)

### Other Key Files
- `shared/schema.ts` — Drizzle schema (users, accounts, characterNFTs, islandNFTs tables)
- `server/storage.ts` — Database CRUD, wallet creation in `getOrCreateAccountForUser()`
- `client/src/lib/grudgeBackend.ts` — Auth + account sync (sets `grudge_account_id` for CharacterManager scoping)
- `client/src/lib/characterManager.ts` — Character CRUD with account-scoped active character selection
- `client/src/lib/api.ts` — Character API client with cNFT mint/status methods
- `WALLET_INTEGRATION.md` — This documentation

---

## ✅ Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Grudge ID Generation | ✅ Complete | Auto-generated from user UUID |
| Crossmint Integration | ✅ Complete | Wallet creation via API |
| Database Schema | ✅ Complete | Added all required fields |
| Account Creation | ✅ Complete | Automatic wallet + ID generation |
| Character Creation | ✅ Complete | Links to account with wallet |
| NFT Minting | ✅ Ready | Can mint via Crossmint service |

---

## 🎉 Summary

**Grudge Builder now has:**
- ✅ Server-side Solana wallet generation
- ✅ Automatic Grudge ID assignment
- ✅ Crossmint custodial wallet support
- ✅ NFT minting capabilities
- ✅ Cross-game identity system
- ✅ Email-based wallet recovery

**Players automatically receive:**
- 🆔 Permanent Grudge ID (e.g., `GRUDGE_A1B2C3D4E5F6`)
- 💼 Solana wallet address (e.g., `7xKz...9pQm`)
- 📧 Recovery email
- 🎮 Cross-game compatibility

**No action required from players** - everything happens during character creation! 🚀
