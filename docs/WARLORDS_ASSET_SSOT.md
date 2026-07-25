# Warlords game assets — Single Source of Truth

**Updated:** 2026-07-20  
**Law:** One binary host, one resolve helper, one catalog layer per role.

## The one truth (do not fork)

| Layer | Authority | How loaders resolve |
|-------|-----------|---------------------|
| **Binary 3D / audio / sprites** | R2 bucket `grudge-assets` → **`https://assets.grudge-studio.com`** | `assetUrl()` / `ASSET_CDN_BASE` in `client/src/lib/assetConfig.ts` |
| **JSON catalogs** (weapons, recipes, races) | ObjectStore `…/api/v1` | `apiUrl()` / same-origin `/api/objectstore/v1` |
| **Player characters / islands / bag** | Railway Postgres via grudge-api | JWT + `/api/characters`, `/api/island`, … |
| **Local `public/models/**`** | **Authoring / offline only** | Same key path as CDN; loaders may fall back if CDN miss |

**Never** invent a second CDN host for Warlords GLBs.  
**Never** commit production GLBs as SSOT (gitignore `*.glb`); ship via R2.

```ts
import { assetUrl, ASSET_CDN_BASE } from '@/lib/assetConfig';
// Correct
assetUrl('/models/creatures/land/drake.glb')
// → https://assets.grudge-studio.com/models/creatures/land/drake.glb

// Also correct (manifest style)
`${ASSET_CDN_BASE}/models/creatures/land/drake.glb`
```

## Catalog SSOT (code)

| Role | File | Binary keys |
|------|------|-------------|
| Wildlife / combat creatures | `client/src/island3d/creatures/CreatureManifest.ts` | `models/creatures/land\|fish\|predator/*` |
| Biome animal slots (5) | `shared/definitions/biomeEcosystemCatalog.ts` + `published/biome-ecosystems.json` | IDs → CreatureManifest |
| Build props / traps | `client/src/island3d/building/BuildAssetManifest.ts` | multipack + `nodeName` |
| Obstacle piece defs | `shared/definitions/mobileGameObstacles.ts` | `models/obstacles/mobile_game_obstacles.glb` |
| Camp upgrades | `shared/definitions/npcCamps.ts` | build asset ids |
| Skeleton residual | `client/src/island3d/creatures/SkeletonCorpse.ts` | `models/skeletons/Skeleton*.glb` |
| Nature / harvest packs | nature catalogs + stylized multipacks | `models/nature/stylized/*` |

**Isolation rule:** multipack GLBs always select a **named node** (`nodeName` / mesh extract). Never spawn a whole multipack root as one entity.

## Gameplay residual (consolidated)

| Event | Result | SSOT constants |
|-------|--------|----------------|
| Kill | Flesh corpse | `CreatureManager` dead state |
| Skin (knife) or 120s | Skeleton mesh from CDN | `CORPSE_TO_SKELETON_S = 120` |
| + ~90s | Despawn / respawn | `SKELETON_LINGER_S = 90` |

Doc: [WARLORDS_CREATURES_TRAPS_SKELETONS.md](./WARLORDS_CREATURES_TRAPS_SKELETONS.md)

## Upload (only path for this pack)

```bash
# cwd MUST be writable (F:\GitHub\GrudgeBuilder). Do NOT run from Program Files.
# Wrangler cache: $env:WRANGLER_HOME = "C:\Users\nugye\.wrangler"
cd F:\GitHub\GrudgeBuilder
node scripts/upload-session-warlords-assets-to-r2.mjs
# wrangler r2 object put grudge-assets/<key> --file=... --remote
```

Baked combat packs (rotation-only JSON):

```bash
# Example: samurai greatsword → Bip001
npx wrangler r2 object put grudge-assets/anims/baked/greatsword_samurai/manifest.json \
  --file=client/public/anims/baked/greatsword_samurai/manifest.json --remote
```

Retarget / naming / Y-hip / XZ: [MODELS_AND_RETARGET_BEST_PRACTICES.md](./MODELS_AND_RETARGET_BEST_PRACTICES.md)

Verify:

```bash
# Expect 200 + Content-Type: model/gltf-binary
curl -sI https://assets.grudge-studio.com/models/creatures/land/drake.glb
curl -sI https://assets.grudge-studio.com/models/obstacles/mobile_game_obstacles.glb
curl -sI https://assets.grudge-studio.com/models/skeletons/Skeleton.glb
```

Check log: [checks/warlords-session-cdn-check-2026-07-20.md](./checks/warlords-session-cdn-check-2026-07-20.md)

## Danger Room twin (same CDN keys)

`D:\GitHub\threejs-rapier-react-three-controller\artifacts\animator` loads the **same** R2 keys under `models/enemies/*`, `models/obstacles/*`, `models/skeletons/*` — not a second binary store. Local `public/` is dev cache only.

## Anti-patterns (reject in review)

| Bad | Good |
|-----|------|
| Hardcoded `http://localhost:…/models` as production | `assetUrl` / `ASSET_CDN_BASE` |
| Second bucket/host for “temp” Warlords GLBs | Always `grudge-assets` / assets.grudge-studio.com |
| Duplicating mesh lists outside CreatureManifest | Add one manifest entry + biome id |
| Putting land elites in `category: predator` | `category: land` |
| Committing multi‑MB GLBs to git | R2 upload + gitignore |

## Related

- [ASSETS.md](./ASSETS.md) — fleet binary storage  
- [CANONICAL_DATA_LAYER.md](./CANONICAL_DATA_LAYER.md) — player vs catalog  
- Skills: `grudge-warlords`, `grudge-warlords-assets`, `grudge-d1-r2`
