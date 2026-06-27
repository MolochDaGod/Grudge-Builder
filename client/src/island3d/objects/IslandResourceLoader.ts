/**
 * IslandResourceLoader — cached CDN GLBs for harvestable trees, rocks, and gem clusters.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';

export const ISLAND_RESOURCE_MODELS = {
  tree: '/models/environment/island_tree.glb',
  rock: '/models/environment/island_rock.glb',
  gem: '/models/environment/gem_cluster.glb',
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
  const cached = templateCache.get(path);
  if (cached) return cached;

  const gltf = await loader.loadAsync(assetUrl(path));
  const template = gltf.scene as THREE.Group;
  prepareShadows(template);
  templateCache.set(path, template);
  return template;
}

export async function preloadIslandResources(): Promise<void> {
  await Promise.all(
    Object.values(ISLAND_RESOURCE_MODELS).map((path) => loadIslandResourceTemplate(path)),
  );
}

const TREE_VARIANT_NAMES = [
  'pine2_14', 'pine9_15', 'birch2_4', 'birch6_5', 'ancient_tree_2_0',
  'garden_tree_pink_11', 'creepy_tree1_10', 'palm2_13',
];
const ROCK_VARIANT_NAMES = [
  'rock_1', 'rock_2', 'rock_3', 'rock_4', 'rock_5', 'rock_6', 'rock_7', 'rock_8',
];
const GEM_VARIANT_NAMES = ['Sphere', 'Sphere.001', 'Sphere.002'];

function pickVariant(names: string[]): string {
  return names[Math.floor(Math.random() * names.length)];
}

function cloneNamedChild(template: THREE.Group, names: string[]): THREE.Object3D {
  const choice = pickVariant(names);
  const node = template.getObjectByName(choice);
  if (node) return node.clone(true);

  const meshes: THREE.Object3D[] = [];
  template.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name && !/Object_/i.test(child.name)) {
      meshes.push(child);
    }
  });
  if (meshes.length > 0) {
    return meshes[Math.floor(Math.random() * meshes.length)].clone(true);
  }
  return template.clone(true);
}

export async function cloneIslandResource(type: IslandResourceType): Promise<THREE.Object3D> {
  const path = ISLAND_RESOURCE_MODELS[type];
  const template = await loadIslandResourceTemplate(path);

  if (type === 'tree') return cloneNamedChild(template, TREE_VARIANT_NAMES);
  if (type === 'rock') return cloneNamedChild(template, ROCK_VARIANT_NAMES);
  if (type === 'gem') return cloneNamedChild(template, GEM_VARIANT_NAMES);
  return template.clone(true);
}

/** Scale model so its bounding height matches targetHeightM; bottom sits at local y=0. */
export function fitModelToHeight(root: THREE.Object3D, targetHeightM: number): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeightM / Math.max(size.y, 0.001);
  root.scale.multiplyScalar(scale);

  box.setFromObject(root);
  const min = box.min;
  root.position.y -= min.y;
}