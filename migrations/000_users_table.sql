-- Users table required for Puter SSO / auth (missing on some Neon snapshots)
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '',
  grudge_id TEXT UNIQUE,
  email TEXT
);

COMMIT;