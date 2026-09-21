/**
 * Generate inventory icons from the **actual** weapon/equipment mesh.
 *
 * Cool assets are fine ΓÇö the icon must be a render of that GLB, not a
 * generic pack plate that doesn't match.
 *
 * Usage:
 *   const url = await generateEquipmentIconFromUrl(meshUrl, { prefabId: 'sword_style_copper' });
 *   // ΓåÆ data URL or blob URL of 256┬▓ product shot
 *
 * Pre-bake offline: scripts/generate-equipment-icons.html + generate-equipment-icons.mjs
 */
import * as THREE from 'three';
import { loadAssetGltf } from '@/lib/three/SharedGltfPipeline';
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
  tint?: THREE.ColorRepresentation;
}

const cache = new Map<string, string>();

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
  opts: { size?: number; transparent?: boolean; yaw?: number; pitch?: number; tint?: THREE.ColorRepresentation } = {},
): string {
  const size = opts.size ?? 256;
  const transparent = opts.transparent !== false;

  const scene = new THREE.Scene();
  if (!transparent) scene.background = new THREE.Color(0x1a1a24);

  const root = source.clone(true);
  const ownedMaterials: THREE.Material[] = [];
  // Object3D.clone shares geometry and textures with the live weapon. Only
  // clone and dispose materials that this thumbnail renderer actually owns.
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const cloneMaterial = (original: THREE.Material): THREE.Material => {
      const material = original.clone();
      ownedMaterials.push(material);
      if (opts.tint != null && 'color' in material && material.color instanceof THREE.Color) {
        material.color.multiply(new THREE.Color(opts.tint));
      }
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
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
  let renderer: THREE.WebGLRenderer | undefined;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, transparent ? 0 : 1);
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  } finally {
    for (const material of ownedMaterials) material.dispose();
    // Release this short-lived context even when rendering or canvas export fails.
    renderer?.dispose();
    renderer?.forceContextLoss();
    scene.clear();
  }
}

/** Cache an icon from the equipped mesh without taking ownership of its resources. */
export function cacheIconFromEquippedWeapon(
  source: THREE.Object3D,
  prefabId: string,
  opts: Omit<EquipmentIconRenderOpts, 'prefabId'> = {},
): string {
  const cached = getCachedEquipmentIcon(prefabId);
  if (cached) return cached;
  const dataUrl = renderObjectToIconDataUrl(source, opts);
  setCachedEquipmentIcon(prefabId, dataUrl);
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

  const gltf = await loadAssetGltf(url);
  if (!gltf) throw new Error(`Equipment mesh unavailable: ${opts.prefabId}`);
  return cacheIconFromEquippedWeapon(gltf.scene, opts.prefabId, opts);
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
 * 1) pre-baked generated PNG if present (HEAD optional ΓÇö caller may skip)
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

  // Last resort: baked path (may 404 ΓÇö UI should onError fallback)
  return assetUrl(baked);
}
