/**
 * HarvestableTree — battle NatureDecor trees (CommonTree_*.gltf).
 * Same pack as https://game.grudge-studio.com/game/battle
 * No square-leaf island_tree. No procedural poly canopy fallback.
 */
import * as THREE from 'three';
import { harvestFitHeightM } from '@shared/definitions/homeIslandSpec';
import { cloneIslandResource, fitModelToHeight } from './IslandResourceLoader';

/**
 * Tree chop lifecycle (firewood + Valheim-like):
 * live → notching → falling → downed → splitting → stump → (regrow) live
 */
export type TreeFallPhase =
  | 'live'
  | 'notching'
  | 'falling'
  | 'downed'
  | 'splitting'
  | 'stump'
  | 'hidden';

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
  /** Legacy signed lean on X for simple fall anim */
  fallAxis: number;
  /** Optional Z lean for directional timber fall */
  fallAxisZ?: number;
  /** World yaw the tree falls toward (rad) */
  fallYaw?: number;
  /** Firewood: cumulative notch progress 0–1 */
  notchProgress?: number;
  /** Firewood: locked cut-face yaw (null until first good base hit) */
  notchFaceYaw?: number | null;
  /** Hits per ground log segment */
  segmentHits?: number[];
  woodCollected?: number;
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
    fallAxisZ: 0,
    notchProgress: 0,
    notchFaceYaw: null,
    segmentHits: undefined,
    woodCollected: 0,
    baseScale: scale,
    respawnAt: 0,
    meshReady: false,
  };

  void mountHarvestableTreeModel(tree, scale);
  return tree;
}

/** Mount battle CommonTree (then palm fallback). Never poly billboard canopy. */
export async function mountHarvestableTreeModel(
  tree: HarvestableTree,
  scale: number = 1,
): Promise<void> {
  const tryTypes = ['tree', 'palm'] as const;
  for (const type of tryTypes) {
    try {
      const model = await cloneIslandResource(type);
      tree.group.clear();
      // Battle CommonTree authoring height — fit to ~6–10m like NatureDecor scales
      fitModelToHeight(model, harvestFitHeightM('tree', scale) * (type === 'tree' ? 0.85 : 1));
      tree.group.add(model);
      tree.meshReady = true;
      tree.group.visible = true;
      return;
    } catch {
      /* try next pack */
    }
  }
  console.error('[HarvestableTree] Battle CommonTree pack failed — tree stays hidden');
  tree.meshReady = false;
  tree.group.visible = false;
}