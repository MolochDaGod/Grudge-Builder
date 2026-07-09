/**
 * HarvestableTree — GLB village tree with procedural fallback.
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
}

const TRUNK_GEO = new THREE.CylinderGeometry(0.4, 0.6, 6, 6);
const CANOPY_GEO = new THREE.IcosahedronGeometry(3, 1);
const TRUNK_MAT = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
const CANOPY_MATS = [
  new THREE.MeshLambertMaterial({ color: 0x2d7a2d }),
  new THREE.MeshLambertMaterial({ color: 0x1e6b1e }),
  new THREE.MeshLambertMaterial({ color: 0x3a8c3a }),
];

function addProceduralTreeMesh(group: THREE.Group): void {
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
  addProceduralTreeMesh(group);

  group.position.copy(position);
  group.scale.setScalar(scale);
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
  };

  void mountHarvestableTreeModel(tree, scale);
  return tree;
}

/** Replace procedural placeholder with CDN tree GLB when available. */
export async function mountHarvestableTreeModel(
  tree: HarvestableTree,
  scale: number = 1,
): Promise<void> {
  try {
    const model = await cloneIslandResource('tree');
    tree.group.clear();
    fitModelToHeight(model, harvestFitHeightM('tree', scale));
    tree.group.add(model);
  } catch (err) {
    console.warn('[HarvestableTree] GLB unavailable, keeping procedural mesh', err);
  }
}