/**
 * RtsNatureScatter — place approved foliage on Warlords 3D terrain.
 * - Bans low-poly megakit paths
 * - Environment packs (island_tree / island_rock) clone named variants
 * - Never places a whole multi-mesh pack as one giant blob
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import {
  isBannedNaturePath,
  isEnvironmentPackPath,
  packResourceTypeForPath,
} from '@shared/definitions/natureAssetCatalog';
import {
  cloneIslandResource,
  fitModelToHeight,
  type IslandResourceType,
} from './IslandResourceLoader';
import { HOME_ISLAND_NATURE_INSTANCE_BUDGET } from '@shared/definitions/homeIslandQuality';

const templateCache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();
const MAX_INSTANCES = HOME_ISLAND_NATURE_INSTANCE_BUDGET;

/** Target height (m) for scatter foliage relative to 2m character. */
function scatterHeightM(category: string, scale: number): number {
  const base =
    category === 'rock' ? 2.4 :
    category === 'palm' ? 8.0 :
    category === 'pine' || category === 'tree' ? 7.0 :
    1.2;
  return Math.max(0.4, base * Math.min(Math.max(scale, 0.5), 2.5) / 1.5);
}

async function loadStandaloneTemplate(modelPath: string): Promise<THREE.Group> {
  if (isBannedNaturePath(modelPath)) {
    throw new Error(`Banned low-poly nature path: ${modelPath}`);
  }
  const cached = templateCache.get(modelPath);
  if (cached) return cached;

  const gltf = await loader.loadAsync(assetUrl(modelPath));
  const template = gltf.scene as THREE.Group;

  // Keep unit scale in cache — height fit applied per instance (avoids double-scale bugs)
  template.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  templateCache.set(modelPath, template);
  return template;
}

async function createInstanceMesh(
  modelPath: string,
  category: string,
  scale: number,
): Promise<THREE.Object3D> {
  if (isBannedNaturePath(modelPath)) {
    throw new Error(`Banned: ${modelPath}`);
  }

  const targetH = scatterHeightM(category, scale);

  // Packs / known resource types → variant clone (not whole GLB scene)
  const packType = packResourceTypeForPath(modelPath);
  if (packType || isEnvironmentPackPath(modelPath)) {
    const type: IslandResourceType = packType ?? (category === 'rock' ? 'rock' : 'tree');
    const model = await cloneIslandResource(type);
    fitModelToHeight(model, targetH);
    return model;
  }

  // Individual organized/realistic GLB — fit to world meters (2m character scale)
  const template = await loadStandaloneTemplate(modelPath);
  const clone = template.clone(true);
  fitModelToHeight(clone, targetH);
  return clone;
}

export async function scatterRtsNatureInScene(
  payload: RtsNatureScatterPayload,
  terrainMesh: THREE.Mesh,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = 'rts_nature_scatter';

  const instances = payload.instances
    .filter((i) => i.modelPath && !isBannedNaturePath(i.modelPath))
    .slice(0, MAX_INSTANCES);

  let placed = 0;
  let skipped = 0;

  for (const inst of instances) {
    try {
      const mesh = await createInstanceMesh(inst.modelPath, inst.category, inst.scale);
      const y = getTerrainHeightAt(terrainMesh, inst.x, inst.z) ?? inst.y;
      mesh.position.set(inst.x, y, inst.z);
      mesh.rotation.y = inst.rotation;
      group.add(mesh);
      placed++;
    } catch {
      skipped++;
    }
  }

  console.log(
    `[Island3D] RTS nature scatter: ${placed}/${instances.length} placed` +
      (skipped ? ` (${skipped} skipped)` : '') +
      (payload.foundationId ? ` foundation=${payload.foundationId}` : ''),
  );
  return group;
}
