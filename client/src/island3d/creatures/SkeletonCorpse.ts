/**
 * Skeleton corpse residuals from Skeletons_Free pack.
 *
 * After a creature is dead for CORPSE_TO_SKELETON_S (2 min) OR immediately after
 * being skinned/looted, the flesh mesh is swapped for a lying skeleton prop.
 *
 * Assets: public/models/skeletons/Skeleton.glb|.fbx (+ Texture.png)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { assetUrl } from '@/lib/assetConfig';

export const CORPSE_TO_SKELETON_S = 120;
export const SKELETON_LINGER_S = 90;

export type SkeletonVariant = 'humanoid' | 'archer';

const PATHS: Record<SkeletonVariant, { glb: string; fbx: string }> = {
  humanoid: {
    glb: '/models/skeletons/Skeleton.glb',
    fbx: '/models/skeletons/Skeleton.fbx',
  },
  archer: {
    glb: '/models/skeletons/Skeleton_Archer.glb',
    fbx: '/models/skeletons/Skeleton_Archer.fbx',
  },
};

const cache = new Map<SkeletonVariant, THREE.Object3D>();
const inflight = new Map<SkeletonVariant, Promise<THREE.Object3D | null>>();

function prepare(root: THREE.Object3D, targetHeight = 1.55): THREE.Object3D {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
    if (size.y > 1e-3) root.scale.multiplyScalar(targetHeight / size.y);
  }
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      if (!mat) continue;
      const sm = mat as THREE.MeshStandardMaterial;
      if (sm.color && !sm.map) sm.color.setHex(0xe8e0d4);
      if (sm.roughness != null) sm.roughness = 0.78;
      if (sm.metalness != null) sm.metalness = 0.04;
    }
  });
  return root;
}

async function loadVariant(variant: SkeletonVariant): Promise<THREE.Object3D | null> {
  const hit = cache.get(variant);
  if (hit) return hit;
  const pending = inflight.get(variant);
  if (pending) return pending;

  const paths = PATHS[variant];
  const p = (async () => {
    try {
      const gltf = await new GLTFLoader().loadAsync(assetUrl(paths.glb));
      const tpl = prepare(gltf.scene);
      cache.set(variant, tpl);
      return tpl;
    } catch {
      /* FBX fallback */
    }
    try {
      const fbx = await new FBXLoader().loadAsync(assetUrl(paths.fbx));
      const tpl = prepare(fbx);
      cache.set(variant, tpl);
      return tpl;
    } catch (err) {
      console.warn(`[SkeletonCorpse] load failed ${variant}`, err);
      return null;
    }
  })();
  inflight.set(variant, p);
  return p;
}

export async function createSkeletonCorpse(opts: {
  position: THREE.Vector3;
  yaw?: number;
  scale?: number;
  variant?: SkeletonVariant;
  lieDown?: boolean;
}): Promise<THREE.Group | null> {
  const variant = opts.variant ?? 'humanoid';
  const tpl = await loadVariant(variant);
  if (!tpl) return null;

  const root = new THREE.Group();
  root.name = `skeleton_corpse_${variant}`;
  const clone = tpl.clone(true);
  clone.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (Array.isArray(m.material)) m.material = m.material.map((x) => x.clone());
    else if (m.material) m.material = (m.material as THREE.Material).clone();
  });
  clone.scale.multiplyScalar(opts.scale ?? 1);
  if (opts.lieDown !== false) clone.rotation.z = Math.PI / 2;
  root.add(clone);
  root.position.copy(opts.position);
  if (opts.yaw != null) root.rotation.y = opts.yaw;
  root.userData.skeletonCorpse = true;
  return root;
}

export function preloadSkeletonCorpses(): void {
  void loadVariant('humanoid');
  void loadVariant('archer');
}

export function skeletonScaleForBodyHeight(heightM: number): number {
  const h = Math.max(0.15, Math.min(2.5, heightM));
  return Math.max(0.2, Math.min(1.2, h / 1.55));
}
