# Grudge Studio — Asset Storage (Cloudflare R2)

**Rule:** All binary art (models, sprites, icons, audio, video) lives on **R2** and is served at **`https://assets.grudge-studio.com`**. JSON catalogs (weapons, items, recipes) live on **ObjectStore** at `https://objectstore.grudge-studio.com/api/v1`.

Vercel game shells must **not** bundle heavy `client/public/models` or bulk sprites. Use `.vercelignore` + Vercel rewrites to CDN.

## Layers

| Layer | URL | Contents |
|-------|-----|----------|
| R2 `grudge-assets` | `assets.grudge-studio.com` | GLB/FBX, PNG sprites, icons, MP4, audio |
| ObjectStore Worker | `objectstore.grudge-studio.com/api/v1` | `master-items.json`, weapons, recipes |
| Postgres `sprite_manifest` | Railway `/api/sprites/*` | Migration map localPath → CDN URL |
| Video catalog | Railway `/api/videos/catalog` | SSOT: `shared/fleet/videoCatalog.ts` |

## Fonts (Kaph + fleet catalog)

| Asset | R2 key | URL |
|-------|--------|-----|
| Kaph Regular woff2 | `fonts/kaph/Kaph-Regular.woff2` | CDN |
| Kaph CSS | `fonts/kaph/kaph.css` | CDN |
| Fleet font API | — | `GET /api/fleet/fonts` |

Upload: `node scripts/upload-kaph-font-to-r2.mjs` (source: `Documents/Kaph_Font_1_20`, OFL license).

```ts
import { loadKaphFont, getFontOptions, resolveDisplayFont } from '@/lib/fleetFonts';
loadKaphFont();
document.body.style.fontFamily = resolveDisplayFont(); // 'Kaph', sans-serif
```

## Client usage

```ts
import { assetUrl } from '@/lib/assetConfig';
import { loadAssetGltf } from '@/lib/three/SharedGltfPipeline';
import { FLEET_VIDEO_CATALOG } from '@shared/fleet/videoCatalog';

assetUrl('/sprites/gbux-token.png');  // browser → /api/assets/... → R2
await loadAssetGltf('/models/creatures/land/drake.glb');
FLEET_VIDEO_CATALOG.warlordsIntro.r2_url;
```

**Never** use bare `/sprites/...` or `/icons/...` in TSX — those used to hit the Vercel bundle. Rewrites still proxy to CDN for legacy HTML, but code should use `assetUrl()`.

### Warlords play mesh law (one path)

| Layer | Use |
|-------|-----|
| URL | `assetUrl()` / `resolveModelUrl()` → same-origin `/api/assets/*` |
| Loader | `loadAssetGltf` / `loadGltfCached` in `SharedGltfPipeline` |
| Catalog | relative `/models/...` keys — not `https://assets.grudge-studio.com/...` |
| Missing R2 key | `shouldSkipPlayMesh` — omit, do not fetch SPA HTML or ship a capsule |

Do **not** add a second CDN, a second GLTFLoader, or a primitive stand-in for a missing island mesh. Upload the key (`upload-session-warlords-assets-to-r2.mjs`) or skip. Place only on a real ground sample (never `waterLevel + 2`).

Deprecated hosts (`molochdagod.github.io`, `grudge-objectstore.pages.dev`) are rewritten at runtime in `iconResolver.ts`.

## Upload pipeline

```bash
# Small UI icons (tomes, gbux token)
node scripts/upload-ui-icons-to-r2.mjs

# Bulk images / videos from ObjectStore + tomes
./scripts/upload-images-to-r2.ps1

# GLB / animations
./scripts/upload-glb-to-r2.ps1
./scripts/upload-animations-to-r2.ps1

# Warlords session pack (creatures + obstacles + skeletons + dungeon enemies)
node scripts/upload-session-warlords-assets-to-r2.mjs
# SSOT law: docs/WARLORDS_ASSET_SSOT.md
# Pack gameplay: docs/WARLORDS_CREATURES_TRAPS_SKELETONS.md
```

Set R2 creds in `.env.local`: `R2_S3_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Uploads should set `CacheControl: public, max-age=31536000, immutable` and correct `ContentType` (especially `video/mp4`).

## CDN Worker

Repo: `workers/cdn/` (Worker name: **`grudge-asset-cdn`**) → deploy:

```bash
cd workers/cdn && npx wrangler deploy --env=""
```

Worker enforces immutable cache headers and MIME types (png, glb, fbx, mp4, webm) even when R2 object metadata is stale.

## Verify (CI / manual)

```bash
node scripts/verify-fleet-assets.mjs
```

Checks required CDN keys + `/api/videos/catalog`.

## Vercel rewrites (grudgewarlords.com)

Same-origin paths proxy to CDN:

- `/sprites/:path*` → `assets.grudge-studio.com/sprites/:path*`
- `/icons/:path*` → `assets.grudge-studio.com/icons/:path*`
- `/videos/:path*` → `assets.grudge-studio.com/videos/:path*`
- `/models/:path*` → `assets.grudge-studio.com/models/:path*`
- `/api/assets/:path*` → CDN root

Fleet SSOT for rewrites: `shared/fleet/manifest.ts` → `FLEET_VERCEL_REWRITES`.

## Conflict resolution (2026-07-02)

| Conflict | Resolution |
|----------|------------|
| 615MB `client/public/models` in Vercel deploy | `.vercelignore` — serve via `/models/*` rewrite only |
| Tome icons local-only | Upload to `icons/tomes/*`; `weaponSpriteMap.ts` uses `tomeIconCdnUrl()` |
| `gbux-token.png` Vercel-static | All components use `assetUrl('/sprites/gbux-token.png')` |
| Video `application/octet-stream` | CDN worker sets `video/mp4`; re-upload or redeploy worker |
| Missing `/api/videos/catalog` | `server/fleet/routes.ts` + `shared/fleet/videoCatalog.ts` |
| Dual local + CDN sprite paths | Prefer `assetUrl()`; `/api/sprites/resolve` for DB-backed overrides |