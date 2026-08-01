-- 009: users Discord / Puter identity link columns
-- Required by server/lib/identityLink.ts and id.grudge-studio.com Discord OAuth.
-- Idempotent — safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS grudge_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_linked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_uidx
  ON users (discord_id) WHERE discord_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_puter_user_id_uidx
  ON users (puter_user_id) WHERE puter_user_id IS NOT NULL;

-- Legacy: scoped profiles used username = 'discord:<id>' / 'puter:<id>'
UPDATE users
SET discord_id = substring(username from 9)
WHERE username LIKE 'discord:%'
  AND (discord_id IS NULL OR discord_id = '');

UPDATE users
SET puter_user_id = substring(username from 7)
WHERE username LIKE 'puter:%'
  AND (puter_user_id IS NULL OR puter_user_id = '');
