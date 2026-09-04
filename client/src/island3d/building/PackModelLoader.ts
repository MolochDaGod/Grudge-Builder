/**
 * PackModelLoader — load multipack GLB (or single-mesh FBX) and clone named nodes.
 * free_survival_asset_kit, medieval towers, Ultimate Fantasy RTS buildings.
 * Island camp buildings (4 m SI) go through identity-checked fetchBuildingGlb
 * so the stale 8.9 MB R2 cantina is not parsed as the placeable.
 * Uses shared DRACO + Meshopt pipeline for GLBs.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import type { BuildAssetDef } from './BuildAssetManifest';
import {
  loadGltfCached,
  prepareMeshPerformance,
} from '@/lib/three/SharedGltfPipeline';
import {
  fetchBuildingGlb,
  ISLAND_BUILDINGS,
} from '@shared/definitions/islandBuildingPrefabs';

const fbxLoader = new FBXLoader();
const packCache = new Map<string, THREE.Group>();

function islandBuildingIdFromPath(path: string): string | null {
  const lower = path.toLowerCase().split('?')[0];
  for (const b of ISLAND_BUILDINGS) {
    if (lower.endsWith(`/${b.r2Key}`) || lower.endsWith(`/${b.id}.glb`)) return b.id;
  }
  return null;
}

async function loadIslandBuildingPack(id: string, cacheKey: string): Promise<THREE.Group> {
  const packed = await fetchBuildingGlb(id);
  const blob = new Blob([packed.bytes], { type: 'model/gltf-binary' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const gltf = await loadGltfCached(objectUrl, 'high');
    const root = (gltf.scene || gltf.scenes?.[0]) as THREE.Group;
    prepareMeshPerformance(root, {
      castShadow: false,
      receiveShadow: true,
      frustumCulled: true,
    });
    packCache.set(cacheKey, root);
    return root;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadPack(path: string): Promise<THREE.Group> {
  const url = assetUrl(path);
  const hit = packCache.get(url);
  if (hit) return hit;

  const islandId = islandBuildingIdFromPath(path) || islandBuildingIdFromPath(url);
  if (islandId) {
    return loadIslandBuildingPack(islandId, url);
  }

  let root: THREE.Group;
  if (path.toLowerCase().endsWith('.fbx')) {
    root = (await fbxLoader.loadAsync(url)) as THREE.Group;
  } else {
    const gltf = await loadGltfCached(url);
    root = gltf.scene as THREE.Group;
  }
  // Template in cache: shadows off until clone; clones get near-only shadows via budget
  prepareMeshPerformance(root, {
    castShadow: false,
    receiveShadow: true,
    frustumCulled: true,
  });
  packCache.set(url, root);
  return root;
}

function cloneNode(pack: THREE.Group, nodeName: string): THREE.Object3D | null {
  const node = pack.getObjectByName(nodeName);
  if (!node) {
    console.warn(`[PackModel] node not found: ${nodeName}`);
    return null;
  }
  const cloned = node.clone(true);
  // Multipacks often store pieces in authored world space — recenter for placement.
  const box = new THREE.Box3().setFromObject(cloned);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    // Sit on ground: lift so bottom of bounds is at y=0
    const box2 = new THREE.Box3().setFromObject(cloned);
    if (!box2.isEmpty()) {
      cloned.position.y -= box2.min.y;
    }
  }
  cloned.name = nodeName;
  return cloned;
}

/**
 * Resolve a BuildAssetDef into a scene graph (placeholder box if load fails).
 */
export async function loadBuildAssetModel(def: BuildAssetDef): Promise<THREE.Object3D> {
  if (!def.modelPath) {
    return makePlaceholder(def);
  }

  try {
    if (def.nodeName) {
      const pack = await loadPack(def.modelPath);
      const group = new THREE.Group();
      group.name = `build_${def.id}`;
      const primary = cloneNode(pack, def.nodeName);
      if (primary) group.add(primary);
      for (const extra of def.extraNodes ?? []) {
        const n = cloneNode(pack, extra);
        if (n) {
          // Offset tools slightly on workbench
          n.position.x += 0.15 * (Math.random() - 0.5);
          group.add(n);
        }
      }
      if (group.children.length === 0) return makePlaceholder(def);
      group.scale.setScalar(def.scale);
      prepareMeshPerformance(group, { castShadow: true, receiveShadow: true, frustumCulled: true });
      group.userData.budgetRadius = Math.max(def.size[0], def.size[2], 2) * 0.6;
      return group;
    }

    const pack = await loadPack(def.modelPath);
    const clone = pack.clone(true);
    clone.scale.setScalar(def.scale);
    clone.name = `build_${def.id}`;
    prepareMeshPerformance(clone, { castShadow: true, receiveShadow: true, frustumCulled: true });
    clone.userData.budgetRadius = Math.max(def.size[0], def.size[2], 2) * 0.6;
    return clone;
  } catch (err) {
    console.warn(`[PackModel] load failed ${def.id}:`, err);
    return makePlaceholder(def);
  }
}

function makePlaceholder(def: BuildAssetDef): THREE.Object3D {
  const [w, h, d] = def.size;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.85,
      transparent: true,
      opacity: 0.85,
    }),
  );
  mesh.position.y = h / 2;
  mesh.name = `placeholder_${def.id}`;
  mesh.castShadow = true;
  return mesh;
}

/** World Y for placement: groundY + placeYOffset (docks use +0.2) */
export function buildPlaceY(groundY: number, def: BuildAssetDef, waterLevel?: number): number {
  const off = def.placeYOffset ?? 0;
  if (def.floating && waterLevel != null) {
    return Math.max(groundY, waterLevel) + off;
  }
  return groundY + off;
}
