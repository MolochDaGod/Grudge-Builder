# Airship opener scene (solo zone)

**Route:** `/combat` · `/airship-zone`  
**Handoff:** `/airship` (Foundry → home-island bridge)  
**Code:** `AirshipSoloZone` · `airshipDeck163` · `airshipScenePolish` · `MeshSceneNavMesh`

## Asset SSOT — Cloudflare R2 (not GitHub)

| Role | R2 key | Notes |
|------|--------|--------|
| Opener hull / islands | `models/airship-zone/opener-scene-7.glb` | **scene (7).glb** — keep names, **no 72 m squash** |
| Legacy hull | `models/airship-zone/airship.glb` | Fallback only |
| Cabin create | `models/airship-zone/cabin.prod.glb` | Prefer non-voxel; temp: `boatvoxelinside.glb` |
| Crew | `models/airship-zone/npcs/*.prod.glb` | FBX→GLB convert; never runtime FBX |
| Grudge6 fallback | `models/grudge6/races/WK_Characters.glb` | If NPC GLB missing |
| Camera + capsule pins | `client/public/models/airship-zone/scene-camera.json` | From **project (6).json** |

Runtime: `assetUrl(path)` → `/api/assets/...` → `assets.grudge-studio.com`.

**Do not commit** FBX or multi-MB GLB. Camera JSON may stay in `client/public/models/airship-zone/*.json`.

## Deck contract (scene 7 / project 6)

| Name | Role |
|------|------|
| `Object_163_1` | Walkable multi-deck hull (~13 m SI already) |
| `Object_16` · `Object_111` | Steering wheels — John Wayne home on **top** |
| `Object_163` | Palm leaf fragment — **purge / hide** |
| `characters` + 3 `Capsule` | Editor-only spawn pads (not in the GLB) — baked into scene-camera.json |

- Captain John Wayne: top band, wheels, wander `Object_163_1` top  
- Scourge: **mid** deck of the same hull  
- Racalvin: **low** deck of the same hull  
- Account roster (Railway `?era=warlords`, up to 4): plant on capsules → wander 163_1  

Pathfinding: existing `MeshSceneNavMesh` (three-pathfinding + grid A*) baked **per Y-band** on 163_1. No new nav package.

## Convert + upload (local → R2)

**Never** run `optimize` flatten/join or `fitOpenerSceneToSpan` (72 m) on this pack — that crushes 163_1 and drops names.

```powershell
# 1) Keep node names — webp textures only
node scripts/optimize-airship-opener.mjs

# 2) Upload
npx wrangler r2 object put grudge-assets/models/airship-zone/opener-scene.glb `
  --file=tmp/airship-zone/opener-scene.glb --content-type=model/gltf-binary --remote
# cwd: workers/cdn
```

Author sources: `D:\Games\Models\scene (7).glb` + `D:\Games\Models\project (6).json`.

## Polish pipeline (`airshipScenePolish.ts`)

When `Object_163_1` is present: **skip weld / 72 m fit / toon** (hull already SI).  
Otherwise (legacy hull): weld + 72 m span + toon + name posts.

## Flow

1. Load opener-scene.glb + project (6) camera  
2. Bind 163_1 / wheels / baked capsules  
3. Railway roster → capsules → wander 163_1  
4. Cabin create only if no account heroes (first-time fallback)  
