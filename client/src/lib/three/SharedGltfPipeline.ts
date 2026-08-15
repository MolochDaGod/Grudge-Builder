/**
 * SharedGltfPipeline — single GLTFLoader for the whole client with:
 *   - DRACO geometry decode (local decoder when possible)
 *   - Meshopt compression (KHR_meshopt_compression)
 *   - Priority queue + concurrency limit (protects mobile RAM)
 *   - Scene-level GLTF cache (clone per consumer)
 *   - Mesh performance prep (frustum, shadow flags, skinned bounds)
 *
 * Always import loaders from here instead of constructing new GLTFLoader/DRACOLoader.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { refreshSkinnedBounds, optimizeAnimationClip } from './WorldMath';
import { assetUrl, shouldSkipPlayMesh } from '@/lib/assetConfig';

// Prefer same-origin decoder (cached by CDN worker / public/) then Google CDN fallback
const DRACO_DECODER_CANDIDATES = [
  '/draco/',
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
];

export type LoadPriority = 'critical' | 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Record<LoadPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Max parallel network decodes — keep low for mobile / shared decoder workers */
const MAX_CONCURRENT = 4;

let _loader: GLTFLoader | null = null;
let _draco: DRACOLoader | null = null;
const gltfCache = new Map<string, GLTF>();
const inflight = new Map<string, Promise<GLTF>>();

interface QueueItem {
  url: string;
  priority: LoadPriority;
  resolve: (g: GLTF) => void;
  reject: (e: Error) => void;
}

const queue: QueueItem[] = [];
let activeLoads = 0;

function ensureLoader(): GLTFLoader {
  if (_loader) return _loader;

  _draco = new DRACOLoader();
  _draco.setDecoderPath(DRACO_DECODER_CANDIDATES[0]);
  _draco.setDecoderConfig({ type: 'wasm' });
  _draco.preload();

  _loader = new GLTFLoader();
  _loader.setDRACOLoader(_draco);

  try {
    _loader.setMeshoptDecoder(MeshoptDecoder);
  } catch (e) {
    console.warn('[SharedGltf] MeshoptDecoder unavailable', e);
  }

  return _loader;
}

/** Safe even when Vite circular-chunks the named export. */
export function ensureSharedGltfReady(): Promise<GLTFLoader> {
  const loader = ensureLoader();
  const ready = (MeshoptDecoder as { ready?: Promise<unknown> } | undefined)?.ready;
  if (ready && typeof (ready as { then?: unknown }).then === 'function') {
    return Promise.resolve(ready).then(() => loader);
  }
  return Promise.resolve(loader);
}

/** Absolute or CDN URL → cache key */
function cacheKey(url: string): string {
  return url.split('?')[0];
}

function drainQueue(): void {
  while (activeLoads < MAX_CONCURRENT && queue.length > 0) {
    queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    const item = queue.shift()!;
    activeLoads++;
    loadOnce(item.url)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeLoads--;
        drainQueue();
      });
  }
}

function isGltfBuffer(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const head = new Uint8Array(buf, 0, 4);
  // GLB magic "glTF"
  if (head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46) {
    return true;
  }
  // JSON glTF starts with '{' — never HTML '<!DO'
  return head[0] === 0x7b;
}

function loadOnce(url: string): Promise<GLTF> {
  const loader = ensureLoader();
  return fetch(url, { mode: 'cors' })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`GLB ${res.status} ${url}`);
      }
      const buf = await res.arrayBuffer();
      if (!isGltfBuffer(buf)) {
        throw new Error(`Not a glTF (HTML/404 page): ${url}`);
      }
      return new Promise<GLTF>((resolve, reject) => {
        const base = url.replace(/[^/]+$/, '');
        loader.parse(
          buf,
          base,
          (gltf) => {
            for (const clip of gltf.animations) {
              try {
                optimizeAnimationClip(clip);
              } catch {
                /* ignore */
              }
            }
            resolve(gltf);
          },
          (err) => reject(err instanceof Error ? err : new Error(String(err))),
        );
      });
    });
}

/**
 * Load a GLTF/GLB once; subsequent calls reuse the parsed document.
 * Does not clone — callers that need independent scenes should cloneGltfScene().
 */
/**
 * Island3D / Warlords play mesh: one URL (assetUrl) + one loader (this file).
 * Returns null for catalog keys not on R2 — do not invent a second renderer.
 */
export async function loadAssetGltf(
  path: string,
  priority: LoadPriority = 'medium',
): Promise<GLTF | null> {
  if (!path || shouldSkipPlayMesh(path)) return null;
  try {
    return await loadGltfCached(assetUrl(path), priority);
  } catch (err) {
    console.warn('[SharedGltf] play mesh skip', path, err);
    return null;
  }
}

export async function loadGltfCached(
  url: string,
  priority: LoadPriority = 'medium',
): Promise<GLTF> {
  const key = cacheKey(url);
  const hit = gltfCache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = new Promise<GLTF>((resolve, reject) => {
    queue.push({
      url,
      priority,
      resolve: (gltf) => {
        gltfCache.set(key, gltf);
        inflight.delete(key);
        resolve(gltf);
      },
      reject: (err) => {
        inflight.delete(key);
        reject(err);
      },
    });
    drainQueue();
  });
  inflight.set(key, p);
  return p;
}

/** Skinned-safe deep clone of a loaded scene. */
export function cloneGltfScene(gltf: GLTF): THREE.Group {
  return (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
    gltf.scene,
  ) as THREE.Group;
}

/** Skinned-safe clone of any Object3D graph. */
export function cloneSkinned(root: THREE.Object3D): THREE.Object3D {
  return (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(root);
}

export interface MeshPerfOptions {
  /** Enable castShadow (expensive). Default false for props, true for heroes. */
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Force frustum culling on (default true). */
  frustumCulled?: boolean;
  /** Share materials when possible (default true for static props). */
  shareMaterials?: boolean;
  /** Disable shadows beyond this world distance from origin of mesh (0 = no check). */
  shadowDistance?: number;
  /** Recompute skinned bounding spheres after clone/equip. Default true for skinned. */
  refreshSkinnedBounds?: boolean;
  /** Clone materials (heroes / tintable). Default false. */
  cloneMaterials?: boolean;
}

/**
 * Apply draw-call / CPU friendly defaults after load.
 * Call on each cloned scene instance (not the cached template).
 */
export function prepareMeshPerformance(
  root: THREE.Object3D,
  opts: MeshPerfOptions = {},
): void {
  const castShadow = opts.castShadow ?? false;
  const receiveShadow = opts.receiveShadow ?? true;
  const frustumCulled = opts.frustumCulled ?? true;
  const cloneMaterials = opts.cloneMaterials ?? false;
  let hasSkinned = false;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) hasSkinned = true;

    mesh.frustumCulled = frustumCulled;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    if (mesh.userData.staticProp) {
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    }

    if (cloneMaterials && mesh.material) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const std = m as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        if (std.envMapIntensity != null && std.envMapIntensity > 0.6) {
          std.envMapIntensity = 0.6;
        }
        // Albedo color space
        if (std.map && std.map.colorSpace !== THREE.SRGBColorSpace) {
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.needsUpdate = true;
        }
      }
    }
  });

  if (hasSkinned && opts.refreshSkinnedBounds !== false) {
    refreshSkinnedBounds(root);
  }
}

/**
 * One-shot: load + skinned clone + perf prep.
 * Preferred entry for characters / NPCs.
 */
export async function loadAndCloneGltf(
  url: string,
  opts?: MeshPerfOptions & { priority?: LoadPriority },
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[]; gltf: GLTF }> {
  const gltf = await loadGltfCached(url, opts?.priority ?? 'high');
  const scene = cloneGltfScene(gltf);
  prepareMeshPerformance(scene, {
    castShadow: true,
    receiveShadow: true,
    frustumCulled: true,
    cloneMaterials: true,
    refreshSkinnedBounds: true,
    ...opts,
  });
  return { scene, animations: gltf.animations, gltf };
}

/** Drop a URL from cache (after hot-reload / asset swap). */
export function evictGltfCache(url?: string): void {
  if (!url) {
    gltfCache.clear();
    return;
  }
  gltfCache.delete(cacheKey(url));
}

/** Dispose DRACO workers (call on full app teardown). */
export function disposeSharedGltfPipeline(): void {
  _draco?.dispose();
  _draco = null;
  _loader = null;
  gltfCache.clear();
  inflight.clear();
  queue.length = 0;
  activeLoads = 0;
}

/** Access shared loader (for advanced consumers). */
export function getSharedGltfLoader(): GLTFLoader {
  return ensureLoader();
}

export function getGltfCacheStats(): {
  entries: number;
  inflight: number;
  queued: number;
  active: number;
} {
  return {
    entries: gltfCache.size,
    inflight: inflight.size,
    queued: queue.length,
    active: activeLoads,
  };
}
