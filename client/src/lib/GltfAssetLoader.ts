/**
 * GltfAssetLoader — thin facade over SharedGltfPipeline + game asset path resolution.
 * Prefer importing SharedGltfPipeline directly for new code.
 */
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { resolveGameAssetPath } from '@/lib/gameAssetPath';
import {
  loadGltfCached,
  evictGltfCache,
  getGltfCacheStats,
  type LoadPriority,
} from '@/lib/three/SharedGltfPipeline';

export type AssetPriority = LoadPriority;

/**
 * Load a GLB/GLTF from a game asset path. Paths are resolved through the R2 CDN.
 * Returns the cached GLTF document — use cloneGltfScene / SkeletonUtils for instances.
 */
export function loadGltf(
  assetPath: string,
  priority: AssetPriority = 'medium',
): Promise<GLTF> {
  const url = resolveGameAssetPath(assetPath);
  return loadGltfCached(url, priority);
}

export function clearGltfCache(): void {
  evictGltfCache();
}

export function getGltfCacheSize(): number {
  return getGltfCacheStats().entries;
}