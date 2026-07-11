-- Treaty groups — account-scoped group chat (Grudge ID social SSOT)
-- Apply: node scripts/run-migration-008.mjs
--    or: psql $DATABASE_URL -f migrations/008_treaty_groups.sql

CREATE TABLE IF NOT EXISTS treaty_groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  owner_account_id VARCHAR NOT NULL,
  avatar_url TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE TABLE IF NOT EXISTS treaty_group_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id VARCHAR NOT NULL,
  account_id VARCHAR NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  last_read_at BIGINT
);

CREATE TABLE IF NOT EXISTS treaty_group_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id VARCHAR NOT NULL,
  sender_account_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE UNIQUE INDEX IF NOT EXISTS treaty_group_members_group_account_uidx
  ON treaty_group_members (group_id, account_id);

CREATE INDEX IF NOT EXISTS treaty_group_members_account_idx
  ON treaty_group_members (account_id);

CREATE INDEX IF NOT EXISTS treaty_group_messages_group_created_idx
  ON treaty_group_messages (group_id, created_at);

CREATE INDEX IF NOT EXISTS treaty_groups_owner_idx
  ON treaty_groups (owner_account_id);

-- Ensure base Treaty tables exist (friends / DMs) for fleets that only ran partial schema
CREATE TABLE IF NOT EXISTS treaty_friends (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id VARCHAR NOT NULL,
  friend_account_id VARCHAR NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_by VARCHAR NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  responded_at BIGINT
);

CREATE TABLE IF NOT EXISTS treaty_dm_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_low VARCHAR NOT NULL,
  account_high VARCHAR NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE TABLE IF NOT EXISTS treaty_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id VARCHAR NOT NULL,
  sender_account_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  read_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE UNIQUE INDEX IF NOT EXISTS treaty_dm_threads_pair_uidx
  ON treaty_dm_threads (account_low, account_high);

CREATE INDEX IF NOT EXISTS treaty_messages_thread_created_idx
  ON treaty_messages (thread_id, created_at);

CREATE INDEX IF NOT EXISTS treaty_friends_account_idx
  ON treaty_friends (account_id);

CREATE INDEX IF NOT EXISTS treaty_friends_friend_idx
  ON treaty_friends (friend_account_id);
