-- 045: link a Spawn account onto the existing Grudge user.
-- Idempotent. Login key remains users.grudge_id. Spawn is a provider, not a second player DB.

ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_linked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_spawn_user_id_uidx
  ON users (spawn_user_id) WHERE spawn_user_id IS NOT NULL;

UPDATE users
SET spawn_user_id = substring(username from 7)
WHERE username LIKE 'spawn:%'
  AND (spawn_user_id IS NULL OR spawn_user_id = '');
