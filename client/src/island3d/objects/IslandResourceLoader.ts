/**
 * IslandResourceLoader — stylized multi-mesh packs for harvest + scatter.
 * Square-leaf island_tree / megakit banned. Palms + stylized vegetation only.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  harvestCrystalPack,
  harvestPalmPack,
  harvestRockPack,
  harvestTreePack,
  isBannedNaturePath,
  STYLIZED_PACK_PATHS,
  STYLIZED_VARIANTS,
} from '@shared/definitions/natureAssetCatalog';

const treePack = harvestTreePack();
const rockPack = harvestRockPack();
const palmPack = harvestPalmPack();
const crystalPack = harvestCrystalPack();

export const ISLAND_RESOURCE_MODELS = {
  tree: treePack.path,
  palm: palmPack.path,
  rock: rockPack.path,
  gem: crystalPack.path,
  log: '/models/environment/harvest_logs.glb',
  debris: '/models/environment/harvest_rock_debris.glb',
  goldRock: STYLIZED_PACK_PATHS.oreNodes,
  stump: '/models/environment/harvest_stump.glb',
  flower: STYLIZED_PACK_PATHS.flowers,
  plant: STYLIZED_PACK_PATHS.foliage,
} as const;

export type IslandResourceType = keyof typeof ISLAND_RESOURCE_MODELS;

const templateCache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();

function prepareShadows(root: THREE.Object3D): void {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export async function loadIslandResourceTemplate(path: string): Promise<THREE.Group> {
  if (isBannedNaturePath(path)) {
    throw new Error(`Banned nature path: ${path}`);
  }
  const cached = templateCache.get(path);
  if (cached) return cached;

  const gltf = await loader.loadAsync(assetUrl(path));
  const template = gltf.scene as THREE.Group;
  prepareShadows(template);
  templateCache.set(path, template);
  return template;
}

const PRELOAD_RESOURCE_TYPES: IslandResourceType[] = [
  'tree', 'palm', 'rock', 'gem', 'flower', 'plant',
];

export async function preloadIslandResources(): Promise<void> {
  await Promise.all(
    PRELOAD_RESOURCE_TYPES.map((type) =>
      loadIslandResourceTemplate(ISLAND_RESOURCE_MODELS[type]).catch((err) => {
        console.warn(`[IslandResource] preload ${type} failed`, err);
      }),
    ),
  );
}

const VARIANT_TABLE: Record<IslandResourceType, string[]> = {
  tree: [
    ...STYLIZED_VARIANTS.exampleTrees,
    ...(treePack.variants.length ? treePack.variants : [...STYLIZED_VARIANTS.vegetationTrees]),
  ],
  palm: palmPack.variants.length ? palmPack.variants : [...STYLIZED_VARIANTS.tropicalPalms],
  rock: [
    ...STYLIZED_VARIANTS.stylizedRocks,
    ...STYLIZED_VARIANTS.templeRuins.slice(0, 6),
  ],
  gem: crystalPack.variants.length ? crystalPack.variants : [...STYLIZED_VARIANTS.oreNodes],
  goldRock: [...STYLIZED_VARIANTS.oreNodes],
  flower: [...STYLIZED_VARIANTS.flowers],
  plant: [...STYLIZED_VARIANTS.foliage, ...STYLIZED_VARIANTS.ancientRuins.slice(0, 8)],
  log: ['Log', 'log', 'Logs', 'Cube', 'Mesh'],
  debris: ['Rock', 'rock', 'Rocks', 'Cube', 'Mesh'],
  stump: [],
};

/** Clone a named child or random mesh; never returns entire multi-object layout. */
export function cloneNamedChild(template: THREE.Group, names: string[]): THREE.Object3D {
  // Prefer exact names first
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  for (const name of shuffled) {
    const node = template.getObjectByName(name);
    if (node) return node.clone(true);
  }

  // Semantic parents (exclude Sketchfab / Object_N only if better mesh exists)
  const meshes: THREE.Object3D[] = [];
  template.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name) {
      meshes.push(child);
    }
  });
  if (meshes.length > 0) {
    return meshes[Math.floor(Math.random() * meshes.length)].clone(true);
  }
  // Last resort: single child of root
  if (template.children.length === 1) return template.children[0].clone(true);
  return template.clone(true);
}

export async function cloneIslandResource(type: IslandResourceType): Promise<THREE.Object3D> {
  const path = ISLAND_RESOURCE_MODELS[type];
  const template = await loadIslandResourceTemplate(path);
  const names = VARIANT_TABLE[type] ?? [];
  if (type === 'stump' || names.length === 0) {
    return template.clone(true);
  }
  return cloneNamedChild(template, names);
}

/** Clone a named variant from an arbitrary multi-mesh pack path. */
export async function cloneFromPackPath(
  modelPath: string,
  variantNames: string[],
): Promise<THREE.Object3D> {
  if (isBannedNaturePath(modelPath)) {
    throw new Error(`Banned: ${modelPath}`);
  }
  const template = await loadIslandResourceTemplate(modelPath);
  return cloneNamedChild(template, variantNames);
}

export function fitModelToHeight(root: THREE.Object3D, targetHeightM: number): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeightM / Math.max(size.y, 0.001);
  root.scale.multiplyScalar(scale);

  box.setFromObject(root);
  const min = box.min;
  root.position.y -= min.y;
}
