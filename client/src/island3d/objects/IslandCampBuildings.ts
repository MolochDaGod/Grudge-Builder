/**
 * Island camp buildings — 4 m SI GLBs via ObjectStore prefab catalog.
 *
 * Does not use loadAssetGltf on the CDN path directly: v2.2.1 still serves
 * the 8.9 MB raw cantina (valid glTF, wrong scale). Identity-check first.
 */
import * as THREE from 'three';
import { loadGltfCached } from '@/lib/three/SharedGltfPipeline';
import {
  BUILDING_HEIGHT_M,
  fetchBuildingGlb,
  getIslandBuilding,
  ISLAND_BUILDINGS,
  type IslandBuildingPrefab,
} from '@shared/definitions/islandBuildingPrefabs';

export { ISLAND_BUILDINGS, getIslandBuilding, fetchBuildingGlb };

function groundToY0(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(box.min.y) && Math.abs(box.min.y) > 0.02) {
    root.position.y -= box.min.y;
  }
}

function fitIfDrifted(root: THREE.Object3D, targetM: number): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0.01 && Math.abs(size.y - targetM) / targetM > 0.12) {
    root.scale.multiplyScalar(targetM / size.y);
  }
}

export interface LoadedIslandBuilding {
  root: THREE.Group;
  prefab: IslandBuildingPrefab;
  url: string;
}

/**
 * Fetch identity-checked bytes, parse via the shared GLTF pipeline, ground to y=0.
 * Host may add `root` to a scene; we do not auto-add.
 */
export async function loadIslandBuildingMesh(id: string): Promise<LoadedIslandBuilding> {
  const packed = await fetchBuildingGlb(id);
  const blob = new Blob([packed.bytes], { type: 'model/gltf-binary' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const gltf = await loadGltfCached(objectUrl, 'high');
    const src = (gltf.scene || gltf.scenes?.[0]) as THREE.Group | undefined;
    if (!src) throw new Error(`empty scene ${id}`);
    const root = src.clone(true);
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    fitIfDrifted(root, packed.prefab.heightM || BUILDING_HEIGHT_M);
    groundToY0(root);
    root.name = `island_building_${id}`;
    root.userData.islandBuildingId = id;
    root.userData.islandPrefab = packed.prefab;
    return { root, prefab: packed.prefab, url: packed.url };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function placeIslandBuilding(
  id: string,
  scene: THREE.Scene,
  position: THREE.Vector3,
  yaw = 0,
): Promise<LoadedIslandBuilding> {
  const loaded = await loadIslandBuildingMesh(id);
  loaded.root.position.copy(position);
  loaded.root.rotation.y = yaw;
  scene.add(loaded.root);
  return loaded;
}
