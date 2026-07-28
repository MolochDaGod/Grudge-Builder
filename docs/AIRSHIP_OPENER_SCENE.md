# Airship opener scene (solo zone)

**Route:** `/airship-zone` · `/airship`  
**Code:** `AirshipSoloZone` · `airshipScenePolish` · `airshipSoloZone` SSOT

## Assets

| Role | Path | Source |
|------|------|--------|
| Opener hull / islands | `/models/airship-zone/opener-scene.glb` | `D:\Games\Models\scene (2).glb` → gltf-transform optimize (weld, meshopt, webp ~1.5 MB) |
| Legacy fallback | `/models/airship-zone/airship.glb` | steampunk captains quarters |
| Cabin create | `/models/airship-zone/boatvoxelinside.glb` | `boatvoxelinside.glb` (voxel boat interior) |
| Crew | `npcs/cptjohnwayne.fbx`, `scourgefaith.fbx`, `racalvinking.glb` | posts: helm / bow / mid |

## Polish pipeline (`airshipScenePolish.ts`)

1. **Weld** — `BufferGeometryUtils.mergeVertices` per mesh (skip skinned)  
2. **SI fit** — longest AABB axis → ~72 m span, feet on `y=0`  
3. **Stylized toon** — `MeshToonMaterial` + 4-band gradient; wood/metal/sail/rock/emit/glass heuristics  
4. **Posts** — name probe + bounds fallback for helm, bow, mid deck  

## Flow

1. First visit → **cabin** (`boatvoxelinside`) with Racalvin  
2. **Grudge6 create** (race WK/BRB/ELF/DWF/ORC/UD + class) or open GCS create  
3. Walk hatch → **deck** with 3 pirates at posts  
4. John = helm only · Scourge = bow patrol · Racalvin = mid wander  

## Re-import opener

```powershell
Copy-Item "D:\Games\Models\scene (2).glb" client\public\models\airship-zone\opener-scene-raw.glb
npx @gltf-transform/cli optimize `
  client/public/models/airship-zone/opener-scene-raw.glb `
  client/public/models/airship-zone/opener-scene.glb `
  --texture-compress webp --texture-size 1024
```

Do **not** commit `opener-scene-raw.glb` (large). Ship optimized `opener-scene.glb` only.
