/**
 * Ensure character_nfts table exists (production may lack migration).
 */
import "dotenv/config";
import { pool } from "../server/db";

const SQL = `
CREATE TABLE IF NOT EXISTS character_nfts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  character_id varchar NOT NULL UNIQUE,
  account_id varchar NOT NULL,
  mint_address text,
  asset_id text,
  collection_address text,
  metadata_uri text,
  image_uri text,
  status text NOT NULL DEFAULT 'pending',
  is_compressed boolean NOT NULL DEFAULT true,
  crossmint_action_id text,
  owner_wallet_address text,
  minted_to_external boolean NOT NULL DEFAULT false,
  minted_at bigint,
  upgraded_at bigint,
  transferred_at bigint,
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);
CREATE INDEX IF NOT EXISTS character_nfts_account_id_idx ON character_nfts (account_id);
CREATE INDEX IF NOT EXISTS character_nfts_status_idx ON character_nfts (status);
`;

async function main() {
  if (!pool) {
    console.error("No DATABASE_URL / pool");
    process.exit(1);
  }
  await pool.query(SQL);
  console.log("character_nfts table ready");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
