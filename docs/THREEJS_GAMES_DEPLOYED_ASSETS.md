# Three.js Games examples → Grudge deployed-asset patterns

Reference demos from [threejs-games](https://threejs-games.github.io/) that close **gaps** in how we place, texture, scale, and animate **deployed** world assets (castles, props, birds, RPG/survival scenes).

## Examples (canonical)

| Demo | URL | What it teaches |
|------|-----|-----------------|
| Castle + texture | [castle-texture](https://threejs-games.github.io/examples/60-models/castle-texture/) | FBX building + **shared concrete atlas** + height fit (`size: 50`) on hilly terrain + water + trees |
| Dual castles | [castles](https://threejs-games.github.io/examples/60-models/castles/) | Same `loadModel({ file, texture, size })` for two fortresses side-by-side |
| Birds | [birds](https://threejs-games.github.io/examples/60-models/birds/) | GLB animals + **AnimationMixer per instance** + sky clear-color |
| Graveyard survival | [graveyard-survival](https://threejs-games.github.io/examples/80-scenes/graveyard-survival/) | Lazy `import()` actors, **coords grid** spawn, solids list, moon orbit, wave spawn, GUI goals |
| RPG fantasy | [rpg-fantasy](https://threejs-games.github.io/examples/80-scenes/rpg-fantasy/) | Hilly terrain, **putOnSolids(castle, terrain)**, player + orcs + potions + **FlamingoAI** birds + clouds + airship |

Source core: `threejs-games.github.io/core/loaders.js`, `ground.js`, `helpers.js`.

---

## Pattern map → fleet code

| threejs-games pattern | Fleet SSOT (use this) | Gap if missing |
|----------------------|------------------------|----------------|
| `loadModel({ size })` → scale by bbox height | `fitMeshHeightToMeters` / `fitCharacterRootToHeightM` (`zoneWorldScale.ts`) + `DeployedAssetPatterns.fitObjectToHeightM` | 100× castles / tiny props |
| `texture: 'terrain/concrete.jpg'` rebind all meshes | `applyTextureOverride` in DeployedAssetPatterns; race atlas rules for heroes | Yellow/missing maps on FBX castles |
| `putOnSolids(mesh, terrain)` raycast down | `plantOnSolids` + GroundSampler / `worldHeight` | Floating fortresses |
| `getEmptyCoords({ mapSize, fieldSize })` | Sector POI tables + FeaturePlacer spacing | Overlapping scatter |
| Bird mixers per GLB | `spawnAmbientFlyers` + locomotionClass `flyer` | Static T-pose birds |
| Lazy actor `import()` | Dynamic island/zone modules | Huge initial bundle |
| `solids[]` for collision + plant | PrefabSystem colliders + map trimesh | Walk-through walls |
| GameLoop + GUI goals | Combat HUD / quest system | Unreadable win conditions |
| Toon renderer + sun/moon | renderPipeline / FogSystem | Flat lighting |

---

## Gaps vs our deploy stack

### 1. Buildings / castles (texture + height)

**Example:** `loadModel({ file: 'building/castle/…fbx', size: 50, texture: 'terrain/concrete.jpg' })`

**Do:**

1. Load GLB/FBX from CDN (`assets.grudge-studio.com` or same-origin).
2. Fit **vertical extent** to a **kind band** — never human 1.8 m:
   - fortress / tower → `WORLD_PROP_HEIGHT_BANDS.fortress` / `.tower`
3. Optional **shared atlas** (stone/concrete) when FBX has no maps.
4. `plantOnSolids` onto terrain / hub mesh.

**Don’t:** `fitCharacterRootToHeightM` on castles (character-correctness kill list).

### 2. Ambient birds / flyers

**Example:** parrot / flamingo / stork GLBs + mixers; RPG uses `FlamingoAI`.

**Do:**

- Class = **flyer** (`locomotionClass.ts`) — altitude band, **no** feet snap.
- One mixer + clip 0 (or idle fly) per instance.
- Spawn on shuffled coords outside safe radius.

**Don’t:** strip hip position tracks as if biped.

### 3. Survival / RPG scene boot order

**Example graveyard / RPG:**

```
ground → solids (trees, tombs, castle)
  → lazy player + AI
  → GUI goals
  → GameLoop(delta)
```

**Fleet:** SceneBuilder layered boot (home hub → terrain → sectors → docks → deploy) already matches. Keep **first paint** before lazy enemies (their Spinner + first `renderer.render`).

### 4. Delivery URLs / eras

| Asset class | Era host |
|-------------|----------|
| Warlords castles, islands, heroes | `client.grudge-studio.com` |
| Voxel blocks, mine castles | Mine-Loader |
| Shared GLB/texture CDN | `assets.grudge-studio.com` |

Code: `shared/definitions/gameEras.ts`, `DeployedAssetPatterns.ts`.

---

## Code entry

```ts
import {
  fitObjectToHeightM,
  applyTextureOverride,
  plantOnSolids,
  loadDeployedGltf,
  spawnAmbientFlyers,
  shuffleCoords,
} from '@/lib/three/DeployedAssetPatterns';
```

---

## QA checklist (deployed assets)

```
[ ] Castle height ∈ fortress band (not ~1.8 m)
[ ] Texture override applied when map missing (no yellow sludge)
[ ] plantOnSolids: feet/base on terrain (no float)
[ ] Birds fly + mixer updates each frame
[ ] Solids registered for player collision / putOn
[ ] CDN path resolves (no 404 on production host)
[ ] Lazy load after first frame (Spinner / loading HUD)
```

## Related

- `docs/WARLORDS_ASSET_SSOT.md`, `docs/MODULAR_ASSET_LIBRARY.md`
- `docs/CHARACTER_ERAS.md` (delivery hosts)
- Skill `grudge-world-scale` + `grudge-character-correctness` (heroes only)
- Survival `PrefabSystem` / `TerrainScatter` for open-world plant
