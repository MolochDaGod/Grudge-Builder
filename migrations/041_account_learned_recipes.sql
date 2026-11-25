-- Account-scoped learned recipes (hidden/experiment + blueprint).
-- Mats stay on account_resources; profession XP stays on characters.
-- Applied on Railway if missing.

CREATE TABLE IF NOT EXISTS account_learned_recipes (
  account_id varchar NOT NULL,
  recipe_id text NOT NULL,
  learned_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (account_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS account_learned_recipes_account_idx
  ON account_learned_recipes (account_id);
