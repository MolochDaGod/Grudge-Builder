-- Telegram user ↔ Grudge account linking for @grudachainbot payments

CREATE TABLE IF NOT EXISTS telegram_links (
  telegram_user_id TEXT PRIMARY KEY,
  account_id VARCHAR NOT NULL,
  wallet_address TEXT NOT NULL,
  telegram_username TEXT,
  linked_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_account_id ON telegram_links(account_id);