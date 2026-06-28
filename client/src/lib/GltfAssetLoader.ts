/**
 * GltfAssetLoader — Production GLB loader with CDN resolution, Draco, and caching.
 * Ported from RTS-Grudge AssetLoader (simplified for GrudgeBuilder assetUrl pipeline).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { resolveGameAssetPath } from '@/lib/gameAssetPath';

export type AssetPriority = 'critical' | 'high' | 'medium' | 'low';

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';
const MAX_CONCURRENT = 4;
const RETRY_DELAYS_MS = [250, 750];

let sharedLoader: GLTFLoader | null = null;
const gltfCache = new Map<string, GLTF>();
const loadingPromises = new Map<string, Promise<GLTF>>();

interface QueueEntry {
  url: string;
  priority: AssetPriority;
  resolve: (gltf: GLTF) => void;
  reject: (err: Error) => void;
}

const PRIORITY_ORDER: Record<AssetPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const queue: QueueEntry[] = [];
let activeLoads = 0;

function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;

  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_CDN);
  draco.preload();

  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  sharedLoader = loader;
  return loader;
}

function drainQueue(): void {
  while (activeLoads < MAX_CONCURRENT && queue.length > 0) {
    queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    const entry = queue.shift()!;
    activeLoads++;
    loadWithRetry(entry.url)
      .then(entry.resolve)
      .catch(entry.reject)
      .finally(() => {
        activeLoads--;
        drainQueue();
      });
  }
}

async function loadWithRetry(url: string, attempt = 0): Promise<GLTF> {
  const loader = getLoader();
  try {
    return await loader.loadAsync(url);
  } catch (err) {
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      return loadWithRetry(url, attempt + 1);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Load a GLB/GLTF from a game asset path. Paths are resolved through the R2 CDN.
 * Returns the cached GLTF document (call gltf.scene.clone() for instances).
 */
export function loadGltf(
  assetPath: string,
  priority: AssetPriority = 'medium',
): Promise<GLTF> {
  const url = resolveGameAssetPath(assetPath);

  const cached = gltfCache.get(url);
  if (cached) return Promise.resolve(cached);

  const inflight = loadingPromises.get(url);
  if (inflight) return inflight;

  const promise = new Promise<GLTF>((resolve, reject) => {
    queue.push({ url, priority, resolve, reject });
    drainQueue();
  }).then((gltf) => {
    gltfCache.set(url, gltf);
    loadingPromises.delete(url);
    return gltf;
  }).catch((err) => {
    loadingPromises.delete(url);
    throw err;
  });

  loadingPromises.set(url, promise);
  return promise;
}

export function clearGltfCache(): void {
  gltfCache.clear();
  loadingPromises.clear();
}

export function getGltfCacheSize(): number {
  return gltfCache.size;
}