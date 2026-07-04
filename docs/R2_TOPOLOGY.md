# Grudge Studio — R2 Topology

**SSOT:** R2 bucket `grudge-assets` → Worker `grudge-asset-cdn` → `https://assets.grudge-studio.com`

Code SSOT: `shared/fleet/r2Layout.ts` · Upload: `scripts/upload-fleet-assets.mjs` · Verify: `scripts/verify-fleet-assets.mjs`

## Industry-standard layout

```
grudge-assets/
├── manifest.json              # CDN root index (required)
├── fonts/{family}/            # woff2 + family CSS
├── icons/{pack|tomes|weapons}/
├── sprites/
├── models/
│   ├── characters/
│   ├── environment/           # towns, harvest props
│   ├── weapons/
│   ├── ships/                 # sailing GLBs
│   ├── creatures/fish/        # target path (migrate from /fish/)
│   ├── creatures/land/
│   ├── grudge6/races/         # FBX faction characters
│   └── vfx/
├── textures/
│   ├── pbr/ground/
│   ├── ships/                 # hull, deck, sail materials
│   └── polyhaven/
├── audio/
│   ├── sfx/
│   ├── music/
│   ├── voice/
│   └── dialogue/
├── vfx/
├── generated/                 # AI outputs — never in git
├── fish/                      # LEGACY — FishManager paths (spaces in names)
└── gruda-armada/.../videos/   # LEGACY cinematics alias
```

## Workers (one CDN SSOT)

| Worker | Domain | Source repo |
|--------|--------|-------------|
| `grudge-asset-cdn` | `assets.grudge-studio.com` | `GrudgeBuilder/workers/cdn/` |

**Deprecated:** `RTS-Grudge/workers/r2-cdn/` — same worker name; do not deploy from RTS.  
**Dead:** `api.grudge-studio.com` — do not reference in new code.

## JSON vs binary split

| Layer | URL | Contents |
|-------|-----|----------|
| R2 binaries | `assets.grudge-studio.com` | GLB, FBX, PNG, MP4, fonts |
| ObjectStore | `objectstore.grudge-studio.com/api/v1` | weapons, items, recipes JSON |
| Postgres | Railway `/api/*` | characters, islands, sprite_manifest |

## Vercel rewrites

Game shells proxy same-origin paths to CDN (`shared/fleet/manifest.ts` → `FLEET_VERCEL_REWRITES`):

- `/sprites/*`, `/icons/*`, `/fonts/*`, `/models/*`, `/textures/*`, `/audio/*`, `/fish/*`
- `/api/assets/*` → CDN root

Heavy folders excluded via `.vercelignore` — see `docs/ASSETS.md`.

## Upload workflow

```bash
# Fill production gaps (ships, fish, town, ship textures) + manifest.json
node scripts/upload-fleet-assets.mjs

# Fonts, UI icons (existing specialists)
node scripts/upload-kaph-font-to-r2.mjs
node scripts/upload-ui-icons-to-r2.mjs

# PBR ground (bulk)
node scripts/upload-pbr-ground-textures.mjs

# Verify
node scripts/verify-fleet-assets.mjs
node scripts/verify-production-assets.mjs --cdn
```

Env: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_S3_ENDPOINT` (or `CF_ACCOUNT_ID`).

## Asset registries (consolidation in progress)

| Registry | Store | ID scheme |
|----------|-------|-----------|
| RTS `asset_registry` | D1 `grudge-assets-db` | UUID v5 from R2 key |
| ObjectStore `assets` | D1 + R2 JSON | `HERO-`, `EQIP-`, `ITEM-` |
| `manifest.json` | R2 root | Human paths + required keys |

**Rule:** New binaries → upload to R2 first, then register in ObjectStore or Postgres — never commit multi‑MB files to Vercel.

## API discovery

- `GET /api/fleet/manifest` — full fleet URLs + rewrites
- `GET /api/fleet/r2-layout` — layout taxonomy from `r2Layout.ts`
- `GET https://assets.grudge-studio.com/manifest.json` — CDN index