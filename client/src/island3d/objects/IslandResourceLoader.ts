/**
 * IslandResourceLoader — harvest + scatter meshes.
 * Trees/rocks: battle NatureDecor pack (CommonTree / Pebble) from game.grudge-studio.com.
 * Square-leaf island_tree / billboard forests banned.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  BATTLE_NATURE_PACK,
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
  /** Default tree path — cloneIslandResource picks random battle CommonTree */
  tree: treePack.path,
  palm: palmPack.path,
  rock: rockPack.path,
  gem: crystalPack.path,
  log: '/models/environment/harvest_logs.glb',
  debris: '/models/environment/harvest_rock_debris.glb',
  goldRock: STYLIZED_PACK_PATHS.oreNodes,
  stump: '/models/environment/harvest_stump.glb',
  flower: BATTLE_NATURE_PACK.flowers[0],
  plant: BATTLE_NATURE_PACK.bushes[0],
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
  // Preload full battle tree + rock sets (same as tactics NatureDecor)
  const battlePaths = [
    ...BATTLE_NATURE_PACK.trees,
    ...BATTLE_NATURE_PACK.rocks,
    ...BATTLE_NATURE_PACK.bushes,
    ...BATTLE_NATURE_PACK.mushrooms,
  ];
  await Promise.all([
    ...battlePaths.map((p) =>
      loadIslandResourceTemplate(p).catch((err) => {
        console.warn(`[IslandResource] battle preload failed ${p}`, err);
      }),
    ),
    ...PRELOAD_RESOURCE_TYPES.map((type) =>
      loadIslandResourceTemplate(ISLAND_RESOURCE_MODELS[type]).catch((err) => {
        console.warn(`[IslandResource] preload ${type} failed`, err);
      }),
    ),
  ]);
}

/**
 * Named children for multipack GLBs only.
 * Tree/rock/flower/plant use battle single-mesh GLTFs — empty variants (full clone).
 * Palm / gem / ore still extract named nodes from stylized multipacks.
 */
const VARIANT_TABLE: Record<IslandResourceType, string[]> = {
  tree: [],
  palm: palmPack.variants.length ? palmPack.variants : [...STYLIZED_VARIANTS.tropicalPalms],
  rock: [],
  gem: crystalPack.variants.length ? crystalPack.variants : [...STYLIZED_VARIANTS.oreNodes],
  goldRock: [...STYLIZED_VARIANTS.oreNodes],
  flower: [],
  plant: [],
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
  // Battle pack: single-mesh GLTFs — pick random CommonTree / Pebble / Bush
  if (type === 'tree') {
    const paths = treePack.paths ?? BATTLE_NATURE_PACK.trees;
    const path = paths[Math.floor(Math.random() * paths.length)]!;
    const template = await loadIslandResourceTemplate(path);
    return template.clone(true);
  }
  if (type === 'rock') {
    const paths = rockPack.paths ?? BATTLE_NATURE_PACK.rocks;
    const path = paths[Math.floor(Math.random() * paths.length)]!;
    const template = await loadIslandResourceTemplate(path);
    return template.clone(true);
  }
  if (type === 'flower') {
    const path = BATTLE_NATURE_PACK.flowers[Math.floor(Math.random() * BATTLE_NATURE_PACK.flowers.length)]!;
    const template = await loadIslandResourceTemplate(path);
    return template.clone(true);
  }
  if (type === 'plant') {
    const path = BATTLE_NATURE_PACK.bushes[Math.floor(Math.random() * BATTLE_NATURE_PACK.bushes.length)]!;
    const template = await loadIslandResourceTemplate(path);
    return template.clone(true);
  }

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
  // Single-mesh battle GLTFs (CommonTree etc.) — full clone
  if (!variantNames.length || template.children.length <= 1) {
    return template.clone(true);
  }
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
