# First-Character Grant Fix (Follow-up to PR #68)

## PR #72
https://github.com/MolochDaGod/Grudge-Builder/pull/72

## Product Miss Identified

**Original Implementation (PR #68):** First-character grant only fired when a referral code was provided during registration.

**Correct Behavior:** First-character grant must fire on **EVERY** successful POST /api/auth/register, regardless of whether a referral code is present.

## The Problem

### Before (PR #68)
```typescript
if (referrerAccount) {
  accountUpdates.referredBy = referrerAccount.referralCode;
  // Grant first free character on successful referral claim (one per new account)
  accountUpdates.firstCharacterGranted = true;
  accountUpdates.characterTokens = (account.characterTokens || 1) + 1;
}
```

**Result:**
- ✅ Register WITH referral code → gets first character
- ❌ Register WITHOUT referral code → NO first character

### After (PR #72)
```typescript
// Always grant first character on register (one per new account)
accountUpdates.firstCharacterGranted = true;
accountUpdates.characterTokens = (account.characterTokens || 1) + 1;

// Track referral code if provided (independent of character grant)
if (referrerAccount) {
  accountUpdates.referredBy = referrerAccount.referralCode;
}
```

**Result:**
- ✅ Register WITHOUT referral code → gets first character
- ✅ Register WITH referral code → gets first character + tracks referral

## Rules (Product Requirements)

1. **firstCharacterGranted** defaults `false` until first register succeeds
2. On successful register, **ALWAYS** set to `true` (regardless of referral code)
3. **referralCode** generated for ALL new accounts (WERA- + 6 chars)
4. **referredBy** only set when valid referral code provided
5. All three fields are **independent** of each other

## Test Scenarios

### Scenario 1: Register WITHOUT Referral Code

**Request:**
```bash
POST /api/auth/register
{
  "username": "newplayer",
  "password": "secure123",
  "email": "player@example.com"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "<jwt>",
  "grudgeId": "GRUDGE_<12chars>",
  "username": "newplayer",
  "referralCode": "WERA-XYZ123",
  "firstCharacterGranted": true,
  "characterTokens": 2,
  "message": "Welcome to Grudge Warlords!"
}
```

**Database State:**
- `referralCode`: `"WERA-XYZ123"` (generated)
- `referredBy`: `null` (no code provided)
- `firstCharacterGranted`: `true`
- `characterTokens`: `2` (1 default + 1 grant)

### Scenario 2: Register WITH Referral Code

**Request:**
```bash
POST /api/auth/register
{
  "username": "referred",
  "password": "secure456",
  "email": "referred@example.com",
  "referralCode": "WERA-FRIEND1"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "<jwt>",
  "grudgeId": "GRUDGE_<12chars>",
  "username": "referred",
  "referralCode": "WERA-ABC789",
  "firstCharacterGranted": true,
  "characterTokens": 2,
  "message": "Welcome to Grudge Warlords! Your referral bonus has been applied."
}
```

**Database State:**
- `referralCode`: `"WERA-ABC789"` (generated)
- `referredBy`: `"WERA-FRIEND1"` (claimed code)
- `firstCharacterGranted`: `true`
- `characterTokens`: `2` (1 default + 1 grant)

## Files Changed

### server/routes/auth.ts
- Line ~1370-1374: Moved first-character grant outside `if (referrerAccount)` block
- Line ~1386: Changed `firstCharacterGranted: !!referrerAccount` to `firstCharacterGranted: true`

### scripts/test-first-char-grant-fix.js
- New test file demonstrating both scenarios
- Shows expected 200 responses for both cases

## Deployment Notes

- **Writer:** `id.grudge-studio.com`
- **Service:** Railway `grudge-api-production-0d46`
- **No database migration needed** (schema unchanged)
- **No client changes** (server-only fix)
- **Status:** Draft PR - **DO NOT MERGE** per instructions

## Testing

Run test script:
```bash
node scripts/test-first-char-grant-fix.js
```

Expected output shows both scenarios returning 200 with `firstCharacterGranted: true`.

## Constraints Followed

✅ Railway/id writer only (server/ changes only)  
✅ No Vercel /Warerareward page edits  
✅ No POST register calls to prove it  
✅ No Neon writes  
✅ No Phantom minting  
✅ No cNFT minting  
✅ No secrets in repo  
✅ Follow-up PR from current main (after #68 merged)  
✅ PR created but **not merged**

## Summary

This fix ensures that **every** new account gets the first free character token on registration, not just accounts that provide a referral code. The referral code tracking (`referredBy`) remains independent and only records when a code was actually used.

**Impact:** All new registrations now correctly receive their first character token, making the feature work as originally intended.
