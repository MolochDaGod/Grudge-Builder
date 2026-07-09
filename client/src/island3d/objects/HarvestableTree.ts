/**
 * HarvestableTree — CDN island_tree pack variants.
 * No icosahedron/cylinder flash: group stays invisible until GLB mounts.
 * Procedural poly mesh is last-resort only if pack load fails after preload.
 */
import * as THREE from 'three';
import { harvestFitHeightM } from '@shared/definitions/homeIslandSpec';
import { cloneIslandResource, fitModelToHeight } from './IslandResourceLoader';

export type TreeFallPhase = 'live' | 'falling' | 'stump' | 'hidden';

export interface HarvestableTree {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  shaking: boolean;
  shakeTime: number;
  /** @deprecated use fallPhase */
  fallen: boolean;
  fallPhase: TreeFallPhase;
  fallProgress: number;
  fallAxis: number;
  baseScale: number;
  respawnAt: number;
  nodeId?: string;
  /** Regenerative growth: mature | depleted | growing */
  growthPhase?: 'mature' | 'depleted' | 'growing';
  growthStartedAt?: number;
  growthDurationMs?: number;
  harvestKind?: 'tree';
  /** True once CDN (or last-resort) mesh is present */
  meshReady?: boolean;
}

const TRUNK_GEO = new THREE.CylinderGeometry(0.4, 0.6, 6, 8);
const CANOPY_GEO = new THREE.SphereGeometry(3, 10, 8);
const TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, metalness: 0 });
const CANOPY_MATS = [
  new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.85, metalness: 0 }),
  new THREE.MeshStandardMaterial({ color: 0x1e6b1e, roughness: 0.85, metalness: 0 }),
  new THREE.MeshStandardMaterial({ color: 0x3a8c3a, roughness: 0.85, metalness: 0 }),
];

function addLastResortTreeMesh(group: THREE.Group): void {
  const trunk = new THREE.Mesh(TRUNK_GEO, TRUNK_MAT);
  trunk.position.y = 3;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const canopyMat = CANOPY_MATS[Math.floor(Math.random() * CANOPY_MATS.length)];
  const canopy = new THREE.Mesh(CANOPY_GEO, canopyMat);
  canopy.position.y = 7.5;
  canopy.scale.set(1, 1.2, 1);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);
}

export function createHarvestableTree(
  position: THREE.Vector3,
  scale: number = 1,
): HarvestableTree {
  const group = new THREE.Group();
  // Hide until GLB mounts — avoids low-poly icosahedron flash
  group.visible = false;
  group.position.copy(position);
  group.scale.setScalar(1);
  group.rotation.y = Math.random() * Math.PI * 2;

  const tree: HarvestableTree = {
    group,
    health: 5,
    maxHealth: 5,
    shaking: false,
    shakeTime: 0,
    fallen: false,
    fallPhase: 'live',
    fallProgress: 0,
    fallAxis: 1,
    baseScale: scale,
    respawnAt: 0,
    meshReady: false,
  };

  void mountHarvestableTreeModel(tree, scale);
  return tree;
}

/** Mount CDN tree pack variant; last-resort soft mesh only if pack fails. */
export async function mountHarvestableTreeModel(
  tree: HarvestableTree,
  scale: number = 1,
): Promise<void> {
  try {
    const model = await cloneIslandResource('tree');
    tree.group.clear();
    fitModelToHeight(model, harvestFitHeightM('tree', scale));
    tree.group.add(model);
    tree.meshReady = true;
    tree.group.visible = true;
  } catch (err) {
    console.warn('[HarvestableTree] GLB unavailable — last-resort mesh only', err);
    tree.group.clear();
    addLastResortTreeMesh(tree.group);
    tree.group.scale.setScalar(scale);
    tree.meshReady = true;
    tree.group.visible = true;
  }
}