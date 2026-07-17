# Fantasy Village Kit — game-ready modular build assets

**Pack file:** `client/public/models/buildings/fantasy/fantasy_village_kit.glb` (from `fantasy_assets.glb`)  
**Machine catalog:** `…/fantasy_village_kit.catalog.json`  
**Type SSOT:** `shared/definitions/fantasyVillageBuildCatalog.ts`  
**Runtime registry:** `BUILD_ASSETS` via `BuildAssetManifest.ts`  
**Renderer:** `PackModelLoader.loadBuildAssetModel` — clones **exact `nodeName`**

## Rules

| Rule | Implementation |
|------|----------------|
| Accurate labels | Human `name` + stable API `id` (`fv_*`) + GLB `nodeName` |
| Modular walls/towers/gates | `placement: structural`, layer `modular` |
| Faction town buildings | Houses / tavern / windmill → layer `rts` |
| No square trees | Trees/plants **excluded** from this pack catalog |
| Harvest rocks/stones | `notes: Harvestable…`, UI category `nature` |
| Conan-style UI | Build panel: Structure tab default, search, cost, node id |

## Not used

- `simple_fantasy_free (2).glb` — Sketchfab **material-merged** diorama (no modular nodes). Re-export required before cataloging.
- Tree/plant nodes in fantasy multipack — use high-quality nature packs only.

## Upload to CDN (production)

```bash
# After local verify, push multipack to R2:
# models/buildings/fantasy/fantasy_village_kit.glb
# models/buildings/fantasy/fantasy_village_kit.catalog.json
```

`BUILD_PACK_PATHS.fantasyVillageKit` already points at `/models/buildings/fantasy/fantasy_village_kit.glb` (local public → Vercel; R2 via assets proxy later).

## API shape (player render)

```ts
{
  id: "fv_wooden_wall_1",           // stable API / save id
  name: "Wooden Wall 1",            // UI label
  modelPath: ".../fantasy_village_kit.glb",
  nodeName: "WoodenWall_1",         // must match GLB parent node
  category: "structure",            // BuildModePanel tab
  placement: "structural",          // snap vs free prop
  buildLayer: "modular",
  cost: [{ itemId: "wood", quantity: 12 }, ...]
}
```

Loader: `getObjectByName(nodeName).clone()` → recenter → place at ghost.

## Piece counts (catalog)

See `fantasy_village_kit.catalog.json` — ~108 placeable parents (no trees/LOD1+/UCX).
