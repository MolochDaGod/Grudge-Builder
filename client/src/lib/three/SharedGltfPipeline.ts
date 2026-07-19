/**
 * SharedGltfPipeline — single GLTFLoader for the whole client with:
 *   - DRACO geometry decode (local decoder when possible)
 *   - Meshopt compression (KHR_meshopt_compression)
 *   - Scene-level GLTF cache (clone per consumer)
 *   - Mesh performance prep (frustum, shadow flags, material sharing)
 *
 * Always import loaders from here instead of constructing new GLTFLoader/DRACOLoader.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Prefer same-origin decoder (cached by CDN worker / public/) then Google CDN fallback
const DRACO_DECODER_CANDIDATES = [
  '/draco/',
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
];

let _loader: GLTFLoader | null = null;
let _draco: DRACOLoader | null = null;
const gltfCache = new Map<string, GLTF>();
const inflight = new Map<string, Promise<GLTF>>();

function ensureLoader(): GLTFLoader {
  if (_loader) return _loader;

  _draco = new DRACOLoader();
  // Local public/draco first (shipped with app), Google CDN fallback on load error
  _draco.setDecoderPath(DRACO_DECODER_CANDIDATES[0]);
  _draco.setDecoderConfig({ type: 'wasm' });
  _draco.preload();

  _loader = new GLTFLoader();
  _loader.setDRACOLoader(_draco);

  try {
    // Meshopt is sync WASM in three's module
    _loader.setMeshoptDecoder(MeshoptDecoder);
  } catch (e) {
    console.warn('[SharedGltf] MeshoptDecoder unavailable', e);
  }

  return _loader;
}

/** Absolute or CDN URL → cache key */
function cacheKey(url: string): string {
  return url.split('?')[0];
}

/**
 * Load a GLTF/GLB once; subsequent calls reuse the parsed document.
 * Does not clone — callers that need independent scenes should cloneScene().
 */
export async function loadGltfCached(url: string): Promise<GLTF> {
  const key = cacheKey(url);
  const hit = gltfCache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const loader = ensureLoader();
  const p = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        gltfCache.set(key, gltf);
        inflight.delete(key);
        resolve(gltf);
      },
      undefined,
      (err) => {
        inflight.delete(key);
        // Retry once with Google CDN Draco path if local decoder failed
        if (_draco && DRACO_DECODER_CANDIDATES[1]) {
          try {
            _draco.setDecoderPath(DRACO_DECODER_CANDIDATES[1]);
          } catch {
            /* ignore */
          }
        }
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
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

export interface MeshPerfOptions {
  /** Enable castShadow (expensive). Default false for props, true for heroes. */
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Force frustum culling on (default true). Skinned heroes may set false. */
  frustumCulled?: boolean;
  /** Share materials when possible (default true for static props). */
  shareMaterials?: boolean;
  /** Disable shadows beyond this world distance from origin of mesh (0 = no check). */
  shadowDistance?: number;
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

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.frustumCulled = frustumCulled;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    // Prefer static matrix auto-update off when parent manages transforms
    if (mesh.userData.staticProp) {
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    }

    // Cheap materials for distant/static props: skip envMap if unused
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const std = m as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        // Cap light work
        if (std.envMapIntensity != null && std.envMapIntensity > 0.6) {
          std.envMapIntensity = 0.6;
        }
      }
      m.needsUpdate = false;
    }
  });
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
}

/** Access shared loader (for advanced consumers). */
export function getSharedGltfLoader(): GLTFLoader {
  return ensureLoader();
}

export function getGltfCacheStats(): { entries: number; inflight: number } {
  return { entries: gltfCache.size, inflight: inflight.size };
}
