# D1 Asset Registry — Era + Game System SSOT + Retro-Correction Process

**Purpose:** Apply the same completed-system discipline (isolate → document → verify → gate) to the D1 asset index. Every row in every D1 table that backs a generated GLTF must carry the correct `grudge_uuid`, `game_uuid`/`game_era`, `size`, `texture`/`material` metadata, and be served by the correct Cloudflare Worker. No phantom rows, no mismatched UUID schemes, no wrong Worker bindings.

Load order: `grudge-studio` → `grudge-d1-r2` → `grudge-warlords-assets` (or era leaf) → this SSOT before any retro-correction or new registry write.

---

## D1 Tables That Must Obey the Era × Game-System Matrix

| D1 Database | Table | Era / Game System | Required Columns (non-negotiable) | Worker Binding | Red Flags |
|-------------|-------|-------------------|-----------------------------------|----------------|-----------|
| `grudge-assets-db` (id `3eeadd9e-...`) | `asset_registry` | RTS-Grudge / grudge6 / Warlords | `grudgeUuid` (deterministic sha1), `r2_key`, `category`, `purpose` (`play`\|`isolate`\|…), `body_status`, `size_bytes`, `texture_format`, `game_era`, `version` | `asset-api` (legacy) / `grudgeassets` (search) | purpose≠play on 6595+ rows; body_status=html_fake; missing game_era |
| `grudge-assets` | `assets` | grudge-backend / general catalog | `grudge_uuid` (HERO-/EQIP-/ITEM-), `kind`, `race`, `slot`, `iteration`, `pose`, `status`, `size_bytes`, `texture_json`, `game_uuid`, `cdn_url` | `grudgeassets` | human-prefix missing; size=0; texture_json null on textured mesh |
| `grudge-gamedata` | (JSON keys) | All eras (weapons, skills, materials, …) | `key`, `game_era`, `version`, `size_bytes`, `etag` | `asset-api` / `grudgeassets` | stale JSON served from R2 cache; wrong era |
| `grudge-ai-hub` | `ai_jobs` | Legion / AI hub | `job_id`, `grudge_uuid` (asset), `model`, `tokens`, `page`, `created_at` | `grudge-ai-hub` | no grudge_uuid link back to asset row |
| `grudge-objectstore` | search index | ObjectStore catalog | `grudge_uuid`, `r2_key`, `game_era`, `size`, `texture` | `grudgeassets` | duplicate keys across eras |

**Player state tables** (`player_characters`, `bag`, `island`, `wallet`) are **Railway Postgres only** — never write them to D1 as SSOT.

---

## Universal D1 Rules (Hardened from grudge-d1-r2)

1. **UUID Scheme** — Choose one per table and never mix:
   - RTS-Grudge `asset_registry`: deterministic `sha1("grudge-asset:" + r2Key)` → UUID v5.
   - grudge-backend `assets`: human-prefixed `HERO-…` / `EQIP-…` / `ITEM-…`.
2. **Game Linkage** — Every asset row must carry `game_era` (warlords|grudox|vox|open|cinema|forge) and `game_uuid` (character UUID from Railway when the asset is hero-bound).
3. **Size & Texture** — `size_bytes` (exact) and `texture_format` / `texture_json` (webp/ktx2 + slot map) are mandatory on every mesh row. 0-byte or null-texture rows are invalid.
4. **Purpose Stamp** — `purpose` column (`play` | `isolate` | `author` | `catalog` | `skip` | `legacy`) must be set. Use `stamp-d1-purpose.mjs` equivalent for retro-correction.
5. **Body Status** — `body_status` (`unknown` | `real` | `html_fake` | `missing`) is magic-byte validated, not just HEAD 200. CDN serving 44 kB HTML as `model/gltf-binary` is a failed row.
6. **Version & Optimistic Lock** — Every mutable row has a `version` column. Bump on every write; reject stale `expectedVersion` with 409.
7. **Batch Limit** — D1 statement batches ≤ 100 rows. Use temp `.sql` files for large retro-corrections.
8. **Worker Topology (live only)**:
   - `grudge-asset-cdn` (ObjectStore/workers/cdn/) → `assets.grudge-studio.com` (R2 files, Range, ETag, CORS).
   - `grudgeassets` → `objectstore.grudge-studio.com` (CRUD + search; proxies info.* JSON).
   - Never deploy GrudgeBuilder `workers/cdn` — same name overwrites the live route.
9. **No Phantom Rows** — Every D1 row must map to a real R2 object that returns 200 + correct MIME on HEAD. Delete or mark `purpose=skip` any row whose R2 key 404s or returns HTML.
10. **Deploy Gate** — After any retro-correction or new registry write, run the era doctor + `wrangler d1 execute --remote` verification before touching production traffic.

---

## Retro-Correction Pipeline (Share the Completed-System Process)

**Step 0 — Isolate**  
Create a dedicated branch or script folder named `retro/d1-<era>-correction-<date>` containing only the correction script and manifest diff. No client changes.

**Step 1 — Scan**  
```bash
# Export current registry for the era
wrangler d1 execute grudge-assets-db --command "SELECT * FROM asset_registry WHERE game_era='warlords' AND purpose='play'" --remote > warlords-play-current.json
```

**Step 2 — Validate against SSOT**  
Run a Node script that checks every row for:
- Correct `grudgeUuid` format (deterministic or human-prefix)
- Non-null `game_era` + `game_uuid`
- `size_bytes > 0`
- `texture_format` present on meshes
- `body_status != 'html_fake'`
- R2 HEAD returns 200 + correct MIME (via `assets.grudge-studio.com/<r2_key>`)

Flag any row that fails.

**Step 3 — Correct**  
- Update `grudgeUuid` / `grudge_uuid` to the deterministic or human-prefixed value.
- Set `game_era` and `game_uuid` from the Railway character or era manifest.
- Recompute `size_bytes` from R2 object metadata.
- Populate `texture_json` from the GLB material slots (use gltf-transform inspect or three.js loader).
- Set `purpose='play'` only for rows that pass the GLTF_ERA_GAME_SYSTEM_SSOT matrix.
- Mark `purpose='skip'` or delete rows that are phantom / wrong Worker / wrong era.

**Step 4 — Re-seed (batch ≤ 100)**  
Write corrected rows to a temp `.sql` file and execute:
```bash
wrangler d1 execute grudge-assets-db --file=corrected-warlords-play.sql --remote --batch-size=100
```

**Step 5 — Worker Verification**  
```bash
# Live CDN
curl -I https://assets.grudge-studio.com/models/grudge6/characters/wk_male.glb
# expect: 200 + content-type: model/gltf-binary + etag + no HTML body

# Search / catalog
curl https://objectstore.grudge-studio.com/api/v1/assets?game_era=warlords&purpose=play&limit=5
```

**Step 6 — Gate**  
Only after the verification commands above succeed, merge the retro-correction branch and run any dependent deploys (`vercel --prod`, `railway up`).

---

## Common D1 Violations & Exact Fixes

| Violation | Symptom | Fix (SSOT Reference) |
|-----------|---------|----------------------|
| Missing or wrong `grudge_uuid` | Duplicate keys, 404 on CDN, wrong Worker | Recompute deterministic sha1 or human-prefix; update row + R2 metadata |
| `game_era` null or mismatched | Asset appears in wrong product (e.g. Warlords mesh in GRUDOX) | Set from GLTF_ERA_GAME_SYSTEM_SSOT matrix; re-seed |
| `size_bytes=0` or null | CDN returns 0-byte or wrong length | Re-upload correct GLB; update row from R2 HEAD |
| `texture_format` null on mesh | Yellow model, missing materials | Run gltf-transform inspect or three loader; populate `texture_json` |
| `body_status=html_fake` | CDN serves 44 kB HTML as glTF | Delete row or mark `purpose=skip`; fix R2 key |
| Wrong Worker binding (GrudgeBuilder cdn deployed) | 404 or HTML on assets.grudge-studio.com | Delete the wrong Worker deployment; redeploy only from ObjectStore/workers/cdn |
| Phantom row (R2 404) | Registry says file exists but CDN 404s | Mark `purpose=skip` or delete; never leave dangling references |
| Mixed UUID schemes in same table | Cross-game lookup fails | Enforce one scheme per table; document which table uses which |

---

## Forward Rule

Any new asset registration script, upload pipeline, or D1 migration must emit rows that satisfy both the GLTF_ERA_GAME_SYSTEM_SSOT matrix and this D1 SSOT. If a generated GLTF or its registry row cannot be placed in one row of either matrix, it is not a completed system — do not ship.

This document + the GLTF SSOT together form the single source of truth for “every generated Three.js artifact and its D1 registry row must obey these era + game-system rules.” Update only when a new era or Worker is added to the fleet topology.
