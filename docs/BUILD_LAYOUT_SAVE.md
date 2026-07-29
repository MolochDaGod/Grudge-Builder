# Build layout save — placeables on Warlords frontend

## Surfaces

| Surface | Role |
|---------|------|
| `/island-3d` (+ `?editor=1`) | Place all `BUILD_ASSETS` with Build Hammer; autosave |
| `/play` | Same engine when island play boots |
| `/forge` → Assets | Catalog counts + link to 3D editor |
| `/asset-showcase` | Recipes / HP / costs (read-only) |

## What is savable

Every prop from `BuildAssetManifest` / survival kit / fantasy village / ice biome / uMMORPG deployables:

- benches, towers, camps, modular wood, docks  
- units, siege, mounts, monsters  
- furniture, traps, farms, nature props  

## Storage

1. **localStorage** key `warlords_build_layout_v1:{accountId}:{islandKey}`  
2. **API** `PATCH/GET /api/island/build-layout` (Railway/Express; soft-fail if offline)  

Island key = `lobbyIslandId` · `sectorId` · lobby map · seed.

## Player flow

1. Open **https://grudgewarlords.com/island-3d?mode=lobby&editor=1**  
2. R → **Build Hammer** (toolkit)  
3. Pick category → place with LMB (R rotate, Esc cancel)  
4. Layout autosaves ~800ms after each place  
5. Reload page → props restore  

## Code

- `BuildingSystem.exportLayout` / `importLayout` / `placePropAt`  
- `buildLayoutSave.ts`  
- `Island3DEngine.configureBuildSave` · `loadSavedBuildLayout` · `scheduleBuildLayoutSave`  
- `server/routes/buildLayout.ts`  
