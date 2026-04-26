# Asset Packs — Onboarding Guide
This document covers how to ingest a third-party asset pack (textures, models, sprites, audio) into Grudge object storage using the **Grudge Dev Tool** CLI uploader.
## TL;DR
```pwsh
# 1. Dry run — no network, no uploads
npm run upload-pack -- `
  --root "C:\packs\Classic64" `
  --pack-id classic64 `
  --version 0.6 `
  --license CC0 `
  --author "Craig Snedeker" `
  --dry-run
# 2. Real upload (requires admin token in the dev tool's keytar)
npm run upload-pack -- `
  --root "C:\packs\Classic64" `
  --pack-id classic64 `
  --version 0.6 `
  --license CC0 `
  --author "Craig Snedeker"
```
## What the uploader does
1. **Walks** the pack directory recursively.
2. **Runs every file through the ingestion pipeline** (size-verify → convert → enrich → rig → hash → UUID). See `docs/object-storage.md` for the contract.
3. **Generates a 256px thumbnail** (`sharp`) for each image and uploads it to `_thumbs/`.
4. **Uploads** each file via `POST /api/objectstore/upload-url` + `PUT` to the signed URL.
5. **Writes** the catalog at `asset-packs/<packId>/manifest.json` via `POST /api/objectstore/manifest`.
6. **Idempotent**: files whose `sha256` matches an existing manifest entry are skipped.
## Flags
| Flag             | Default | Notes |
|------------------|---------|-------|
| `--root`         | (req)   | Pack root on disk |
| `--pack-id`      | (req)   | Bucket prefix segment |
| `--version`      | `0.0.0` | Used in `v<version>/` |
| `--license`      | `unknown` | Stored in manifest meta |
| `--author`       | `unknown` | Stored in manifest meta |
| `--dry-run`      | `false` | Walk + ingest, no network |
| `--keep-source`  | `false` | Keep originals under `_originals/` |
| `--retarget`     | (none)  | Skeleton name to retarget character meshes onto |
| `--skip-convert` | `false` | Skip the converter stage |
| `--skip-rig`     | `false` | Skip the rig probe |
| `--blenderkit-base=<query>` | (none) | Trigger the enrich stage |
## Conventions
- **Pack id** is lower-kebab case, no spaces (e.g. `classic64`, `voxel-rpg-characters`).
- **Categories** are derived from the top-level subdirectories of the pack.
- **License** is recorded in the manifest's `meta.license`. Only CC0 / explicitly-licensed packs may go to `asset-packs/`. Anything else lives in `dev/private/<packId>/`.
## After upload
- Verify the manifest at `https://assets.grudge-studio.com/asset-packs/<packId>/manifest.json` (read-through R2 cache).
- Inspect a sample asset on the dev tool's **Browser** page.
- Hit `/api/objectstore/search?pack=<packId>` to confirm entries are searchable.
