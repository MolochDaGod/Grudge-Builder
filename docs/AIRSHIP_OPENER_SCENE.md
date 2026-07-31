# Airship opener scene (solo zone)

**Route:** `/airship-zone`  
**Handoff:** `/airship` (Foundry → home-island bridge)  
**Code:** `AirshipSoloZone` · `airshipScenePolish` · `airshipSoloZone` SSOT  

## Asset SSOT — Cloudflare R2 (not GitHub)

| Role | R2 key | Notes |
|------|--------|--------|
| Opener hull / islands | `models/airship-zone/opener-scene.glb` | Convert + SI fit + meshopt + webp |
| Legacy hull | `models/airship-zone/airship.glb` | Fallback |
| Cabin create | `models/airship-zone/cabin.prod.glb` | Prefer non-voxel; temp: `boatvoxelinside.glb` |
| Crew | `models/airship-zone/npcs/*.prod.glb` | FBX→GLB convert; never runtime FBX |
| Grudge6 fallback | `models/grudge6/races/WK_Characters.glb` | If NPC GLB missing |

Runtime: `assetUrl(path)` → `/api/assets/...` → `assets.grudge-studio.com`.

**Do not commit** FBX or multi-MB GLB. Camera JSON may stay in `client/public/models/airship-zone/*.json`.

## Convert + upload (local → R2)

```powershell
# 1) Optimize source
npx @gltf-transform/cli optimize source.glb opener-scene.glb `
  --texture-compress webp --texture-size 1024

# 2) Upload (Wrangler R2 or fleet asset pipeline)
# wrangler r2 object put grudge-assets/models/airship-zone/opener-scene.glb --file=opener-scene.glb
# Or use grudge-asset-convert / ObjectStore upload skill
```

FBX NPCs: convert with same pipeline to `*.prod.glb`, SI height 2.0 m, then upload under `models/airship-zone/npcs/`.

## Polish pipeline (`airshipScenePolish.ts`)

1. **Weld** — mergeVertices (skip skinned)  
2. **SI fit** — longest AABB → ~72 m span, feet on y=0  
3. **Stylized toon** — MeshToonMaterial heuristics  
4. **Posts** — helm / bow / mid deck for 3 captains  

## Flow

1. Cabin (CDN) + Racalvin  
2. Grudge6 create (WK/BRB/ELF/DWF/ORC/UD) or GCS  
3. Hatch → deck posts (John helm · Scourge bow · Racalvin mid)  
