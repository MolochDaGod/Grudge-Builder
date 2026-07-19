/**
 * SyncedBuildingManager — render buildings placed by any player in the room.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';

export interface SyncedBuildingData {
  id: string;
  assetId: string;
  ownerId?: string;
  ownerName?: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

const loader = new GLTFLoader();
const meshCache = new Map<string, THREE.Object3D>();

async function loadBuildingMesh(assetId: string): Promise<THREE.Object3D> {
  const cached = meshCache.get(assetId);
  if (cached) return cached.clone(true);

  // assetId may be a path or catalog id — try common public paths
  const candidates = [
    assetId.startsWith('/') || assetId.startsWith('http') ? assetId : null,
    `/models/buildings/${assetId}.glb`,
    `/models/build/${assetId}.glb`,
    assetUrl(`/models/buildings/${assetId}.glb`),
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const gltf = await new Promise<any>((res, rej) => loader.load(url, res, undefined, rej));
      const scene = gltf.scene as THREE.Object3D;
      meshCache.set(assetId, scene);
      return scene.clone(true);
    } catch {
      /* try next */
    }
  }

  // Placeholder box
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85 }),
  );
  mesh.position.y = 1;
  const g = new THREE.Group();
  g.add(mesh);
  meshCache.set(assetId, g);
  return g.clone(true);
}

export class SyncedBuildingManager {
  private scene: THREE.Scene;
  private roots = new Map<string, THREE.Group>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async addBuilding(data: SyncedBuildingData): Promise<void> {
    if (this.roots.has(data.id)) return;
    const root = new THREE.Group();
    root.name = `synced_building_${data.id}`;
    root.position.set(data.x, data.y, data.z);
    root.rotation.y = data.rotation;
    root.userData.building = data;
    this.scene.add(root);
    this.roots.set(data.id, root);

    try {
      const mesh = await loadBuildingMesh(data.assetId);
      mesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      root.add(mesh);
    } catch (e) {
      console.warn('[SyncedBuilding] load failed', data.assetId, e);
    }
  }

  removeBuilding(id: string): void {
    const root = this.roots.get(id);
    if (!root) return;
    this.scene.remove(root);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => mat?.dispose?.());
      }
    });
    this.roots.delete(id);
  }

  dispose(): void {
    for (const id of [...this.roots.keys()]) this.removeBuilding(id);
  }
}
