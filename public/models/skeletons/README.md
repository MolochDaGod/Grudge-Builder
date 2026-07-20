# Skeletons_Free — corpse residuals

Source: `D:\Games\Models\Skeletons_Free (1).zip`

## Production GLB (preferred)

| File | Use | Notes |
|------|-----|--------|
| `Skeleton.glb` | Humanoid residual | Blender headless FBX→GLB + grudge-convert glb2glb |
| `Skeleton_Archer.glb` | Ranged residual | same pipeline |
| `prod/*.collider.json` | optional colliders | from grudge-convert |
| `prod/*.manifest.json` | provenance | bake stats |

## Source / fallback

| File | Use |
|------|-----|
| `Skeleton.fbx` / `Skeleton_Archer.fbx` | Author FBX (runtime FBX fallback) |
| `Texture.png` | Pack albedo |
| `Bone.fbx` | Optional prop |
| `_convert_skeletons.py` | Headless Blender re-bake script |

**Re-bake:**
```bat
set BLENDER_PATH=C:\Users\nugye\tools\Blender\blender.exe
"%BLENDER_PATH%" -b -P public\models\skeletons\_convert_skeletons.py
cd /d F:\GitHub\ObjectStore
npm run convert -- glb2glb ..\GrudgeBuilder\public\models\skeletons\Skeleton.glb -o ..\GrudgeBuilder\public\models\skeletons\prod\Skeleton.glb --height 1.7 --texture-size 1024
```

**MCP note:** Blender MCP requires GUI + addon Connect on :9876. Headless `-b` cannot run MCP server; use portable CLI for batch.

Runtime loaders try **`.glb` first**, then `.fbx`.

**Flow:** dead flesh for **120s** (skin/loot window) → **skeleton residual** for **~90s** → despawn/respawn.

- Warlords: `CreatureManager.trySkinNear` (skinning knife in harvest mode)
- Danger Room wildlife: Key **N** butcher → skeleton
- Dungeon + sparring NPCs: auto-skeleton after 2 minutes dead
