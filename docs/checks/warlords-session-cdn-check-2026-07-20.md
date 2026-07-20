# CDN check — Warlords session assets

**Date:** 2026-07-20  
**Tool:** `Invoke-WebRequest -Method Head` against `assets.grudge-studio.com`  
**Upload:** `node scripts/upload-session-warlords-assets-to-r2.mjs` (+ retry `models/enemies/drake.glb`)

| URL | Status |
|-----|--------|
| `/models/creatures/land/drake.glb` | 200 |
| `/models/creatures/land/ifrit.glb` | 200 |
| `/models/creatures/land/lava_golem.glb` | 200 |
| `/models/creatures/land/free_reptile.glb` | 200 |
| `/models/creatures/land/monsters_x_free.glb` | 200 |
| `/models/creatures/land/creature_crab.glb` | 200 |
| `/models/obstacles/mobile_game_obstacles.glb` | 200 |
| `/models/skeletons/Skeleton.glb` | 200 |
| `/models/skeletons/Skeleton_Archer.glb` | 200 |
| `/models/enemies/drake.glb` | 200 |
| `/models/enemies/ifrit.glb` | 200 |
| `/models/enemies/lava_golem.glb` | 200 |

Also uploaded (not re-listed above): enemy free_reptile / monsters_x_free / creature_crab; skeleton FBX fallbacks + Texture.png.

**Result:** All critical keys live on R2 CDN.
