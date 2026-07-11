# Pipeline operations (practical)

How to run convert → CDN → D1 → scale → terrain → characters **correctly**.

## SSOT modules

| Module | Path |
|--------|------|
| Resolve CDN + scale meta | `shared/definitions/resolveAsset.ts` |
| Terrain bake package | `shared/definitions/terrainPackage.ts` (+ Forge `studio/src/lib/terrainPackage.ts`) |
| Solo tutorial flow | `shared/definitions/tutorialFlow.ts` |
| Biome animals/harvest | `shared/definitions/biomeHarvestAssets.ts` |
| Home island meters | `shared/definitions/homeIslandSpec.ts` |
| Race mesh + textures | `shared/fleet/character.ts`, `client/src/lib/grudge6Textures.ts` |

## Commands

```bash
# 1) Magic-byte gate on seeded CDN keys
npm run production:verify-magic
npm run production:verify-magic:strict   # CI fail on any bad key

# 2) Character + Colyseus + tutorial matchmake smoke
npm run smoke:characters

# 3) Both
npm run smoke:pipeline

# 4) Existing path scanners
npm run production:verify-cdn
```

## Asset resolve (runtime)

```ts
import { resolveAsset, scaleFactorForTargetHeightM } from '@shared/definitions/resolveAsset';

const a = resolveAsset('models/nature/stylized/harvest/ore_nodes.glb', {
  // optional registry overlays from D1
});
// a.url → https://assets.grudge-studio.com/...
// after GLTF load:
root.scale.setScalar(scaleFactorForTargetHeightM(bboxHeight, a.targetSizeM ?? 2));
// multi-mesh: isolate a.meshName
```

## Terrain package

```ts
import {
  createEmptyTerrainPackage,
  validateTerrainPackage,
  terrainPackageToTerrainData,
  terrainPackageToPlacedEntities,
} from '@shared/definitions/terrainPackage';

const pkg = createEmptyTerrainPackage('home-abc', { resolution: 128, sizeM: 1024 });
// fill heightfield + entities with { asset: { r2Key, meshName, targetSizeM } }
const v = validateTerrainPackage(pkg);
const terrain = terrainPackageToTerrainData(pkg);
const entities = terrainPackageToPlacedEntities(pkg);
```

Forge: import from `src/lib/terrainPackage.ts` (schema twin — keep in sync).

## Characters

- REST: Railway `/api/characters` (auth required for list/write)
- Race FBX: `resolveRaceModelPath(race, 'fbx')`
- Textures: `textures/grudge6/{faction}/*.webp` via `applyGrudge6RaceTextures`
- Islands: Railway `home_islands` — not D1

## Full asset bake (desktop)

```
ObjectStore: npm run convert -- <pipeline> raw/ -o dist/
→ upload R2 → seed D1 (seed-warlords-d1 / seed-d1)
→ npm run production:verify-magic
```
