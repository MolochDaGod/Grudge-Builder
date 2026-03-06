-- =============================================
-- Wallet & Grudge ID Integration Migration
-- =============================================
-- Migration ID: 001_add_wallet_grudge_id
-- Created: 2026-02-02
-- Description: Adds Grudge ID and wallet fields to support cross-game identity and NFT features
-- =============================================

BEGIN;

-- =============================================
-- STEP 1: Add new columns to users table
-- =============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS grudge_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN users.grudge_id IS 'Cross-game identifier: GRUDGE_<12_CHARS>, permanent and unique across all GRUDGE products';
COMMENT ON COLUMN users.email IS 'User email for wallet recovery and notifications';

-- =============================================
-- STEP 2: Add grudgeId to accounts table
-- =============================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS grudge_id TEXT UNIQUE;

COMMENT ON COLUMN accounts.grudge_id IS 'Cross-game identifier synced from users table';

-- Note: walletAddress, crossmintWalletId, crossmintEmail, and walletType
-- already exist in the accounts table schema

-- =============================================
-- STEP 3: Create indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_grudge_id ON users(grudge_id);
CREATE INDEX IF NOT EXISTS idx_accounts_grudge_id ON accounts(grudge_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_wallet_address ON accounts(wallet_address);

-- =============================================
-- STEP 4: Backfill Grudge IDs for existing users
-- =============================================

-- Generate Grudge IDs for existing users who don't have one
UPDATE users 
SET grudge_id = 'GRUDGE_' || UPPER(REPLACE(SUBSTRING(id::text FROM 1 FOR 12), '-', ''))
WHERE grudge_id IS NULL;

-- Sync Grudge IDs to accounts table
UPDATE accounts 
SET grudge_id = (
  SELECT 'GRUDGE_' || UPPER(REPLACE(SUBSTRING(u.id::text FROM 1 FOR 12), '-', ''))
  FROM users u 
  WHERE u.id = accounts.user_id
)
WHERE grudge_id IS NULL;

-- =============================================
-- STEP 5: Add constraint to ensure data integrity
-- =============================================

-- Ensure grudgeId is always set for new users/accounts
-- (This will be enforced by the application layer during creation)

-- =============================================
-- STEP 6: Create helper function for Grudge ID generation
-- =============================================

CREATE OR REPLACE FUNCTION generate_grudge_id(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 'GRUDGE_' || UPPER(REPLACE(SUBSTRING(user_uuid::text FROM 1 FOR 12), '-', ''));
END;
$$;

COMMENT ON FUNCTION generate_grudge_id IS 'Generates a Grudge ID from a user UUID';

-- =============================================
-- STEP 7: Create trigger to auto-sync grudgeId
-- =============================================

-- Automatically sync grudgeId from users to accounts when an account is created
CREATE OR REPLACE FUNCTION sync_grudge_id_to_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If grudgeId is not set, get it from the user
  IF NEW.grudge_id IS NULL THEN
    SELECT grudge_id INTO NEW.grudge_id
    FROM users
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_grudge_id ON accounts;
CREATE TRIGGER trigger_sync_grudge_id
  BEFORE INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_grudge_id_to_account();

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Run these after migration to verify:
-- 
-- SELECT COUNT(*) as total_users, COUNT(grudge_id) as users_with_grudge_id FROM users;
-- SELECT COUNT(*) as total_accounts, COUNT(grudge_id) as accounts_with_grudge_id FROM accounts;
-- SELECT COUNT(*) as accounts_with_wallets FROM accounts WHERE wallet_address IS NOT NULL;
-- 
-- Expected: All users and accounts should have grudge_id after this migration

COMMIT;

-- =============================================
-- ROLLBACK SCRIPT (for emergencies only)
-- =============================================
-- 
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_sync_grudge_id ON accounts;
-- DROP FUNCTION IF EXISTS sync_grudge_id_to_account();
-- DROP FUNCTION IF EXISTS generate_grudge_id(UUID);
-- DROP INDEX IF EXISTS idx_accounts_wallet_address;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_accounts_grudge_id;
-- DROP INDEX IF EXISTS idx_users_grudge_id;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS grudge_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS email;
-- ALTER TABLE users DROP COLUMN IF EXISTS grudge_id;
-- COMMIT;
