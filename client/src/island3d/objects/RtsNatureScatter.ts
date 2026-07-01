/**
 * RtsNatureScatter — place RTS-exported foliage GLBs on Warlords 3D terrain.
 * Re-snaps Y to upsampled 1024m mesh via raycast.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';

const templateCache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();
const MAX_INSTANCES = 180;

async function loadNatureTemplate(modelPath: string): Promise<THREE.Group> {
  const cached = templateCache.get(modelPath);
  if (cached) return cached;

  const gltf = await loader.loadAsync(assetUrl(modelPath));
  const template = gltf.scene as THREE.Group;

  const box = new THREE.Box3().setFromObject(template);
  const h = Math.max(box.max.y - box.min.y, 0.01);
  const normalize = 2.5 / h;
  template.scale.setScalar(normalize);

  template.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  templateCache.set(modelPath, template);
  return template;
}

export async function scatterRtsNatureInScene(
  payload: RtsNatureScatterPayload,
  terrainMesh: THREE.Mesh,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = 'rts_nature_scatter';

  const instances = payload.instances.slice(0, MAX_INSTANCES);
  let placed = 0;

  for (const inst of instances) {
    try {
      const template = await loadNatureTemplate(inst.modelPath);
      const clone = template.clone(true);
      const y = getTerrainHeightAt(terrainMesh, inst.x, inst.z) ?? inst.y;
      clone.position.set(inst.x, y, inst.z);
      clone.rotation.y = inst.rotation;
      clone.scale.multiplyScalar(inst.scale);
      group.add(clone);
      placed++;
    } catch {
      /* skip missing CDN model */
    }
  }

  console.log(`[Island3D] RTS nature scatter: ${placed}/${instances.length} instances`);
  return group;
}