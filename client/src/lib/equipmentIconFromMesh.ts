/**
 * Generate inventory icons from the **actual** weapon/equipment mesh.
 *
 * Cool assets are fine — the icon must be a render of that GLB, not a
 * generic pack plate that doesn't match.
 *
 * Usage:
 *   const url = await generateEquipmentIconFromUrl(meshUrl, { prefabId: 'sword_style_copper' });
 *   // → data URL or blob URL of 256² product shot
 *
 * Pre-bake offline: scripts/generate-equipment-icons.html + generate-equipment-icons.mjs
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';

export interface EquipmentIconRenderOpts {
  /** Stable id for cache key (prefabId) */
  prefabId: string;
  size?: number;
  /** Clear background alpha (true = transparent) */
  transparent?: boolean;
  /** Studio light intensity */
  lightIntensity?: number;
  /** Slight turntable yaw for hero angle */
  yaw?: number;
  pitch?: number;
  /** Apply tier-ish tint (optional) */
  tint?: number;
}

const cache = new Map<string, string>();
const loader = new GLTFLoader();

/** In-memory + sessionStorage cache of generated icons. */
export function getCachedEquipmentIcon(prefabId: string): string | null {
  if (cache.has(prefabId)) return cache.get(prefabId)!;
  try {
    const s = sessionStorage.getItem(`eq_icon_${prefabId}`);
    if (s) {
      cache.set(prefabId, s);
      return s;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function setCachedEquipmentIcon(prefabId: string, dataUrl: string) {
  cache.set(prefabId, dataUrl);
  try {
    sessionStorage.setItem(`eq_icon_${prefabId}`, dataUrl);
  } catch {
    /* quota */
  }
}

/**
 * Render an already-loaded Object3D (clone recommended) to a PNG data URL.
 */
export function renderObjectToIconDataUrl(
  source: THREE.Object3D,
  opts: { size?: number; transparent?: boolean; yaw?: number; pitch?: number; tint?: number } = {},
): string {
  const size = opts.size ?? 256;
  const transparent = opts.transparent !== false;

  const scene = new THREE.Scene();
  if (!transparent) scene.background = new THREE.Color(0x1a1a24);

  const root = source.clone(true);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      if (opts.tint != null && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m && 'color' in m && (m as THREE.MeshStandardMaterial).color) {
            const c = (m as THREE.MeshStandardMaterial).clone();
            c.color.multiply(new THREE.Color(opts.tint));
            o.material = Array.isArray(o.material) ? mats.map((x) => (x === m ? c : x)) : c;
          }
        }
      }
    }
  });
  scene.add(root);

  // Fit to frame
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const bsize = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(bsize.x, bsize.y, bsize.z, 0.001);
  root.position.sub(center);
  const scale = 1.6 / maxDim;
  root.scale.multiplyScalar(scale);
  root.rotation.y = opts.yaw ?? 0.55;
  root.rotation.x = opts.pitch ?? -0.25;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  camera.position.set(0, 0.35, 3.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff5e6, 1.15);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.45);
  fill.position.set(-3, 1, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0, 2, -3);
  scene.add(rim);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: transparent,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, transparent ? 0 : 1);
  renderer.render(scene, camera);

  const dataUrl = canvas.toDataURL('image/png');
  renderer.dispose();
  // Dispose cloned geometries/materials lightly
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material)?.dispose?.();
    }
  });
  return dataUrl;
}

/**
 * Load mesh from URL and generate icon. Caches by prefabId.
 */
export async function generateEquipmentIconFromUrl(
  meshUrl: string,
  opts: EquipmentIconRenderOpts,
): Promise<string> {
  const cached = getCachedEquipmentIcon(opts.prefabId);
  if (cached) return cached;

  const url =
    meshUrl.startsWith('http') || meshUrl.startsWith('data:')
      ? meshUrl
      : assetUrl(meshUrl);

  const gltf = await loader.loadAsync(url);
  const dataUrl = renderObjectToIconDataUrl(gltf.scene, {
    size: opts.size ?? 256,
    transparent: opts.transparent,
    yaw: opts.yaw,
    pitch: opts.pitch,
    tint: opts.tint,
  });
  setCachedEquipmentIcon(opts.prefabId, dataUrl);
  return dataUrl;
}

/**
 * Public path for pre-baked icons (pipeline output).
 * Convention: /icons/weapons/generated/{prefabId}.png
 */
export function bakedEquipmentIconPath(prefabId: string): string {
  const safe = prefabId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/icons/weapons/generated/${safe}.png`;
}

/**
 * Resolve best icon for equipment:
 * 1) pre-baked generated PNG if present (HEAD optional — caller may skip)
 * 2) catalog iconUrl
 * 3) generate from mesh (async)
 */
export async function resolveEquipmentIcon(opts: {
  prefabId: string;
  meshUrl: string | null;
  catalogIconUrl?: string | null;
  preferGenerate?: boolean;
}): Promise<string> {
  const baked = bakedEquipmentIconPath(opts.prefabId);
  // Try session cache first (already generated this session)
  const mem = getCachedEquipmentIcon(opts.prefabId);
  if (mem) return mem;

  if (opts.preferGenerate !== false && opts.meshUrl) {
    try {
      return await generateEquipmentIconFromUrl(opts.meshUrl, {
        prefabId: opts.prefabId,
      });
    } catch (e) {
      console.warn('[equipmentIcon] generate failed', opts.prefabId, e);
    }
  }

  if (opts.catalogIconUrl) {
    return opts.catalogIconUrl.startsWith('http')
      ? opts.catalogIconUrl
      : assetUrl(opts.catalogIconUrl);
  }

  // Last resort: baked path (may 404 — UI should onError fallback)
  return assetUrl(baked);
}
