/**
 * RtsNatureScatter — place stylized foliage on Warlords 3D terrain.
 * - Bans square-leaf island_tree / megakit / procedural billboards
 * - Multi-mesh packs clone named variants only
 * - Never places a whole pack as one giant blob
 */
import * as THREE from 'three';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import {
  isBannedNaturePath,
  STYLIZED_PACK_PATHS,
  STYLIZED_VARIANTS,
} from '@shared/definitions/natureAssetCatalog';
import {
  cloneFromPackPath,
  cloneIslandResource,
  fitModelToHeight,
  type IslandResourceType,
} from './IslandResourceLoader';
import { HOME_ISLAND_NATURE_INSTANCE_BUDGET } from '@shared/definitions/homeIslandQuality';

const MAX_INSTANCES = HOME_ISLAND_NATURE_INSTANCE_BUDGET;

function scatterHeightM(category: string, scale: number): number {
  const base =
    category === 'rock' ? 2.4 :
    category === 'cliff' ? 12 :
    category === 'palm' ? 8.5 :
    category === 'pine' || category === 'tree' ? 8.0 :
    category === 'flower' || category === 'plant' || category === 'fern' ? 0.9 :
    1.2;
  return Math.max(0.35, base * Math.min(Math.max(scale, 0.5), 2.5) / 1.5);
}

function variantsForPath(modelPath: string, category: string): string[] {
  const p = modelPath.replace(/\\/g, '/');
  if (p.includes('tropical')) {
    return category === 'palm' || category === 'tree'
      ? [...STYLIZED_VARIANTS.tropicalPalms]
      : [...STYLIZED_VARIANTS.tropicalPlants];
  }
  if (p.includes('snowbiomes')) {
    return category === 'rock'
      ? [...STYLIZED_VARIANTS.snowRocks]
      : [...STYLIZED_VARIANTS.snowTrees];
  }
  if (p.includes('volcanic')) return [...STYLIZED_VARIANTS.volcanic];
  if (p.includes('realistic_trees')) return [...STYLIZED_VARIANTS.plainsTrees];
  if (p.includes('nature_vegetation')) {
    return category === 'rock'
      ? [...STYLIZED_VARIANTS.vegetationRocks]
      : [...STYLIZED_VARIANTS.vegetationTrees];
  }
  if (p.includes('stylised_rocks')) return [...STYLIZED_VARIANTS.stylizedRocks];
  if (p.includes('cliff')) return [...STYLIZED_VARIANTS.cliff];
  if (p.includes('flowers')) return [...STYLIZED_VARIANTS.flowers];
  if (p.includes('foliage')) return [...STYLIZED_VARIANTS.foliage];
  if (p.includes('minerals')) return [...STYLIZED_VARIANTS.minerals];
  return [];
}

function resourceTypeForCategory(category: string): IslandResourceType | null {
  if (category === 'palm') return 'palm';
  if (category === 'tree' || category === 'pine') return 'tree';
  if (category === 'rock' || category === 'cliff') return 'rock';
  if (category === 'flower') return 'flower';
  if (category === 'plant' || category === 'fern' || category === 'bush') return 'plant';
  return null;
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
  const variants = variantsForPath(modelPath, category);

  let mesh: THREE.Object3D;
  if (variants.length > 0) {
    mesh = await cloneFromPackPath(modelPath, variants);
  } else {
    const rt = resourceTypeForCategory(category);
    if (rt) {
      mesh = await cloneIslandResource(rt);
    } else {
      mesh = await cloneFromPackPath(modelPath, []);
    }
  }
  fitModelToHeight(mesh, targetH);
  return mesh;
}

export async function scatterRtsNatureInScene(
  payload: RtsNatureScatterPayload,
  terrainMesh: THREE.Mesh,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = 'rts_nature_scatter_stylized';

  const instances = payload.instances
    .filter((i) => i.modelPath && !isBannedNaturePath(i.modelPath))
    .slice(0, MAX_INSTANCES);

  let placed = 0;
  let skipped = 0;

  for (const inst of instances) {
    try {
      const mesh = await createInstanceMesh(inst.modelPath, inst.category, inst.scale);
      const y = getTerrainHeightAt(terrainMesh, inst.x, inst.z) ?? inst.y;
      // Skip underwater placements
      if (y < -1.5) {
        skipped++;
        continue;
      }
      mesh.position.set(inst.x, y, inst.z);
      mesh.rotation.y = inst.rotation;
      group.add(mesh);
      placed++;
    } catch {
      skipped++;
    }
  }

  console.log(
    `[Island3D] Stylized nature scatter: ${placed}/${instances.length} placed` +
      (skipped ? ` (${skipped} skipped)` : '') +
      (payload.foundationId ? ` foundation=${payload.foundationId}` : '') +
      ` biome=${payload.biome}`,
  );
  return group;
}

/** Expose pack roots for diagnostics */
export const STYLIZED_NATURE_PACKS = STYLIZED_PACK_PATHS;
