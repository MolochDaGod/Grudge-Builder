# Three.js performance & character best practices (Grudge Builder)

## Single pipeline

| Module | Role |
|--------|------|
| `client/src/lib/three/SharedGltfPipeline.ts` | **Only** place that constructs `GLTFLoader` + DRACO + Meshopt |
| `client/src/lib/three/WorldMath.ts` | Zero-alloc world math + clip optimize + skinned bounds |
| `client/src/lib/three/SkeletonEquip.ts` | Bone attach + wardrobe finalize |
| `client/src/lib/modelLoader.ts` | Character load, Mixamo retarget, `AnimationController` |
| `client/src/lib/grudge6Equipment.ts` | Units_* wardrobe visibility (never show all meshes) |
| `client/src/island3d/player/CharacterAssetManager.ts` | Model clone cache via shared pipeline |

**Do not** `new GLTFLoader()` / `new DRACOLoader()` in feature code.

## Asset size

1. Prefer **glTF-transform** output: DRACO mesh + Meshopt, WebP/basis textures when possible.  
2. Race wardrobe GLBs stay multi-mesh; **visibility** filters equip — do not ship separate full characters per loadout.  
3. Animations: quaternion-only baked JSON under `/anims/baked/` for distant NPCs; full clips for player.  
4. Use `loadGltfCached(url, 'low')` for props / FOV props; `'critical'` for player race GLB.

## Skeletons & equip

| Rule | Why |
|------|-----|
| Clone with `SkeletonUtils` / `cloneGltfScene` | Plain `clone(true)` breaks skinning → T-pose / white blob |
| Default **unarmed** wardrobe | Full wardrobe = spiked blob |
| `finalizeEquipmentVisibility` after equip | Hidden meshes skip raycast; skinned bounds refresh for culling |
| External weapons → `attachToBone` | Only non-skinned props; armor stays skinned on rig |
| `refreshSkinnedBounds` after mesh toggles | Frustum cull works with `frustumCulled = true` |

## Animations

- Remap Mixamo prefixes once (`remapClipBoneNames`) then `optimizeAnimationClip`.  
- Share `AnimationClip` instances across NPCs when skeleton matches; one `AnimationMixer` per root.  
- Set `AnimationController.enabled = false` when off-screen / culled.  
- Prefer weighted locomotion blend over constant crossfade spam.

## World math (hot path)

```ts
import { distanceXZ, dampAngle, moveOnXZ, scratchVec } from '@/lib/three/WorldMath';
// Never: pos.clone().add(...) every frame
```

`Spring3` / damp helpers use scratch vectors — no GC spikes in combat.

## Checklist for new 3D scenes

1. `loadGltfCached` or `loadAndCloneGltf`  
2. `prepareMeshPerformance` on instance  
3. Grudge6: `Grudge6EquipmentManager` + unarmed default  
4. Mixer update gated by visibility  
5. No per-frame `new THREE.Vector3`  

## Verify

- Player spawn unarmed, equip pickaxe → bounds stable, no T-pose  
- Many NPCs: decoder concurrency ≤ 4 (see `getGltfCacheStats()`)  
- Tab away / culled: mixers can pause via `enabled = false`  
