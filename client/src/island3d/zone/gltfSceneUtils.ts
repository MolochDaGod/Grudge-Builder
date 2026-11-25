/**
 * Shared GLTF scene helpers for zone landmark / boss / floating island loads.
 */
import * as THREE from 'three';
import { loadAssetGltf } from '@/lib/three/SharedGltfPipeline';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Load first successful play mesh (assetUrl + SharedGltf).
 */
export async function loadGlbFirst(
  urls: readonly string[],
): Promise<THREE.Group | null> {
  const gltf = await loadGltfFirst(urls);
  return (gltf?.scene as THREE.Group) ?? null;
}

/** Full GLTF (clips + scene) — first URL that loads. */
export async function loadGltfFirst(
  urls: readonly string[],
): Promise<GLTF | null> {
  for (const raw of urls) {
    const gltf = await loadAssetGltf(raw, 'medium');
    if (gltf?.scene) return gltf;
  }
  return null;
}

const SKYBOX_NAME =
  /sky|skybox|skydome|background|atmosphere|clouds_sphere|env_sphere|hdr/i;

/**
 * Remove sky / background spheres so outdoor plates can sit inside zone sky.
 * Also hides huge inverted spheres that act as environment shells.
 */
export function stripSkyboxFromObject(root: THREE.Object3D): string[] {
  const removed: string[] = [];
  const doomed: THREE.Object3D[] = [];

  root.traverse((o) => {
    const n = o.name || '';
    if (SKYBOX_NAME.test(n)) {
      doomed.push(o);
      return;
    }
    if (o instanceof THREE.Mesh) {
      const geo = o.geometry;
      if (!geo) return;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const r = geo.boundingSphere?.radius ?? 0;
      // Giant sphere shells (common skybox) — only if roughly spherical
      const isSphere =
        geo.type === 'SphereGeometry' ||
        geo.type === 'SphereBufferGeometry' ||
        /sphere/i.test(n);
      if (isSphere && r > 80) {
        doomed.push(o);
      }
    }
  });

  for (const o of doomed) {
    removed.push(o.name || o.uuid);
    o.parent?.remove(o);
    o.visible = false;
  }
  return removed;
}

/** Fit max dimension (XZ or full box) to target meters; plant min.y ≈ 0 locally. */
export function fitObjectExtent(root: THREE.Object3D, targetM: number): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const s = targetM / maxDim;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  return s;
}

export function fitObjectHeight(root: THREE.Object3D, targetH: number): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const s = targetH / h;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  return s;
}

/** Clone materials and apply ethereal tint (variant A/B). */
export function applyVariantMaterials(
  root: THREE.Object3D,
  opts: {
    color: number;
    emissive: number;
    emissiveIntensity: number;
    metalness: number;
    roughness: number;
  },
): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      if (!m) return m;
      const c = m.clone();
      if ('color' in c && (c as THREE.MeshStandardMaterial).color) {
        (c as THREE.MeshStandardMaterial).color = new THREE.Color(opts.color);
      }
      if ('emissive' in c) {
        const sm = c as THREE.MeshStandardMaterial;
        sm.emissive = new THREE.Color(opts.emissive);
        sm.emissiveIntensity = opts.emissiveIntensity;
        if ('metalness' in sm) sm.metalness = opts.metalness;
        if ('roughness' in sm) sm.roughness = opts.roughness;
      }
      return c;
    });
    o.material = Array.isArray(o.material) ? next : next[0]!;
    o.castShadow = true;
    o.receiveShadow = true;
  });
}
