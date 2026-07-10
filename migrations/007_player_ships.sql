-- Player ships — Railway Postgres SSOT for dock craft / ocean / world-map fleet
-- Apply: psql $DATABASE_URL -f migrations/007_player_ships.sql

CREATE TABLE IF NOT EXISTS player_ships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id VARCHAR NOT NULL,
  user_id VARCHAR,
  captain_id VARCHAR,
  name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'rowboat',
  hull_color TEXT NOT NULL DEFAULT 'brown',
  sail_color TEXT NOT NULL DEFAULT 'white',
  cannons INTEGER NOT NULL DEFAULT 0,
  crew_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  hp INTEGER NOT NULL DEFAULT 30,
  max_hp INTEGER NOT NULL DEFAULT 30,
  speed INTEGER NOT NULL DEFAULT 4,
  zone_x INTEGER NOT NULL DEFAULT 50,
  zone_y INTEGER NOT NULL DEFAULT 50,
  dock_id TEXT NOT NULL DEFAULT 'south-dock',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_damaged BOOLEAN NOT NULL DEFAULT false,
  travel_destination JSONB,
  travel_started_at BIGINT,
  travel_arrival_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS player_ships_account_id_idx ON player_ships (account_id);
CREATE INDEX IF NOT EXISTS player_ships_account_active_idx ON player_ships (account_id, is_active);
