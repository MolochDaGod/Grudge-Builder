-- Watchlist for Coins tab (add any Solana mint). cNFT ownership stays on
-- character_nfts + Crossmint play wallet; this table is fungible mints only.

CREATE TABLE IF NOT EXISTS account_token_watch (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id varchar NOT NULL,
  mint text NOT NULL,
  symbol text,
  name text,
  logo_url text,
  decimals integer,
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  UNIQUE (account_id, mint)
);

CREATE INDEX IF NOT EXISTS account_token_watch_account ON account_token_watch (account_id);
