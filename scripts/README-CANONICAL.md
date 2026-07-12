# Scripts — canonical vs hanging

## Canonical entrypoints (`package.json`)

| npm script | Purpose |
|------------|---------|
| `db:push` | Auth/schema ensure (`ensure-auth-schema.mjs`) |
| `db:push:drizzle` | Drizzle schema push |
| `db:migrate:sql` | **Additive SQL 004–007** (telegram, eras, grudge_code, ships) |
| `db:migrate:006` / `db:migrate:007` | Single-migration runners |
| `db:migrate:eras` | 005 only |
| `db:migrate:telegram` | 004 only |
| `upload:build-packs` | Survival / tower / bench GLBs → R2 |
| `upload:warlords-assets` | Craftpix mines + mountain |
| `home-island:pipeline` | Nature/biome publish pipeline |
| `deploy:puter:crafting` / `cdn` / `smart` / `all` | Puter deploy via `grudge-puter.mjs` |
| `probe:truth:direct` / `probe:truth` | ONE TRUTH identity + Railway + defs + craft shell |
| `probe:auth` | SSO / login rewrite audit |

After craft/fleet ship: deploy Puter **and** upload `client/public/grudge-fleet.js` → R2 `js/grudge-fleet.js` (≥ **2.8.0**).  
Identity law: [docs/CANONICAL_IDENTITY.md](../docs/CANONICAL_IDENTITY.md).

## Hanging / legacy (not wired — keep for one-off ops)

Do **not** add new call sites. Prefer the table above.

- **Puter deploy pile:** `deploy-puter-batch|cjs|cli-auth|final|grudachain|moloch|rest|sdk|write|legacy` → use `grudge-puter.mjs` / `deploy-puter-smart.mjs`
- **One-shot probes:** `probe-*`, `smoke-*`, `find-crafting-root`, `match-crafting-root`, `scan-crafting-sites`
- **One-shot schema fixes:** `fix-users-table`, `fix-timestamp-columns`, `fix-broken-imports`, `probe-char-schema`
- **Asset archaeology:** `ingest-nature-megakit`, `upload-stylized-nature`, `rewrite-asset-refs`, `rewrite-pass2`, `migrate-assets`
- **Temp:** `_tmp_anim_admin.mjs`

## Policy

1. Additive schema → `npm run db:migrate:sql` (never re-enable 001–003 here).
2. Build multipacks → catalog + `PackModelLoader`, not character model loader.
3. Home-island trees → battle NatureDecor only (no stylized tree multipack dump).
