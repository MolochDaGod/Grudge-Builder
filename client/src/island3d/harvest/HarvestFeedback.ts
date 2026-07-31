/**
 * HarvestFeedback — log drops, rock chips, tree fall, stump swap.
 * Uses CDN GLBs: harvest_logs, harvest_rock_debris, harvest_stump, harvest_gold_rocks.
 */
import * as THREE from 'three';
import { cloneIslandResource, fitModelToHeight } from '../objects/IslandResourceLoader';
import {
  mountHarvestableTreeModel,
  type HarvestableTree,
} from '../objects/HarvestableTree';
import {
  mountHarvestableRockModel,
  type HarvestableRock,
} from '../objects/HarvestableRock';
import {
  mountCrystalClusterModel,
  type HarvestableCrystal,
  type HarvestableHemp,
  type HarvestableFlower,
  type HarvestableScrap,
} from '../objects/HomeIslandNodes';

import {
  beginGrowth,
  ensureGrowthFields,
  markDepleted,
  respawnMsFor,
  type HarvestKind,
} from './RegenerativeHarvest';

/** @deprecated Prefer respawnMsFor(kind) — kept for callers expecting a single number. */
export const HARVEST_RESPAWN_MS = 150_000;

export { beginGrowth, ensureGrowthFields, markDepleted, respawnMsFor };
export type { HarvestKind };

export interface HarvestDrop {
  group: THREE.Group;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

export type HarvestDropKind = 'log' | 'debris' | 'gold' | 'gem';

export async function spawnResourceDrops(
  scene: THREE.Scene,
  position: THREE.Vector3,
  type: HarvestDropKind,
  count = 3,
): Promise<HarvestDrop[]> {
  const resourceType =
    type === 'log' ? 'log'
      : type === 'gold' ? 'goldRock'
        : type === 'gem' ? 'gem'
          : 'debris';
  const height = type === 'log' ? 0.8 : type === 'gem' ? 0.35 : 0.45;
  const drops: HarvestDrop[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const model = await cloneIslandResource(resourceType);
      const g = new THREE.Group();
      fitModelToHeight(model, height * (0.7 + Math.random() * 0.5));
      g.add(model);
      g.position.copy(position);
      g.position.y += 0.2;
      g.rotation.y = Math.random() * Math.PI * 2;
      scene.add(g);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const speed = 1.2 + Math.random() * 1.8;
      drops.push({
        group: g,
        life: 0,
        maxLife: 4 + Math.random() * 2,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 1.5, Math.sin(angle) * speed),
      });
    } catch {
      /* skip failed clone */
    }
  }
  return drops;
}

export function updateHarvestDrops(drops: HarvestDrop[], dt: number, scene: THREE.Scene): HarvestDrop[] {
  const alive: HarvestDrop[] = [];
  for (const d of drops) {
    d.life += dt;
    d.velocity.y -= 9.8 * dt;
    d.group.position.addScaledVector(d.velocity, dt);
    if (d.group.position.y < 0.05) {
      d.group.position.y = 0.05;
      d.velocity.y *= -0.25;
      d.velocity.x *= 0.7;
      d.velocity.z *= 0.7;
    }
    const fade = 1 - Math.max(0, (d.life - d.maxLife * 0.7) / (d.maxLife * 0.3));
    d.group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
        const mats = Array.isArray((c as THREE.Mesh).material)
          ? (c as THREE.Mesh).material as THREE.Material[]
          : [(c as THREE.Mesh).material as THREE.Material];
        for (const m of mats) {
          m.transparent = true;
          m.opacity = fade;
        }
      }
    });
    if (d.life >= d.maxLife) {
      scene.remove(d.group);
      d.group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry?.dispose();
        }
      });
    } else {
      alive.push(d);
    }
  }
  return alive;
}

const STUMP_TRUNK_GEO = new THREE.CylinderGeometry(0.45, 0.65, 1.4, 8);
const STUMP_ROOT_GEO = new THREE.CylinderGeometry(0.85, 1.05, 0.22, 8);
const STUMP_TRUNK_MAT = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });
const STUMP_ROOT_MAT = new THREE.MeshLambertMaterial({ color: 0x3d2810 });

function addProceduralStump(group: THREE.Group, scale: number): void {
  const trunk = new THREE.Mesh(STUMP_TRUNK_GEO, STUMP_TRUNK_MAT);
  trunk.position.y = 0.7 * scale;
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const roots = new THREE.Mesh(STUMP_ROOT_GEO, STUMP_ROOT_MAT);
  roots.position.y = 0.11 * scale;
  roots.scale.setScalar(scale);
  roots.castShadow = true;
  group.add(roots);
}

export async function swapTreeToStump(tree: HarvestableTree, scale: number): Promise<void> {
  tree.group.clear();
  try {
    const stump = await cloneIslandResource('stump');
    fitModelToHeight(stump, 2.2 * scale);
    tree.group.add(stump);
  } catch {
    addProceduralStump(tree.group, scale);
  }
  tree.fallPhase = 'stump';
}

export function beginTreeFall(tree: HarvestableTree): void {
  // Allow fall from live or firewood notching
  if (tree.fallPhase !== 'live' && tree.fallPhase !== 'notching') return;
  tree.fallPhase = 'falling';
  tree.fallProgress = 0;
  // Prefer firewood-directed fall; else random lean
  if (tree.fallYaw == null) {
    tree.fallAxis = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
    tree.fallAxisZ = 0;
  } else {
    tree.fallAxis = Math.sin(tree.fallYaw);
    tree.fallAxisZ = Math.cos(tree.fallYaw);
  }
  tree.shaking = false;
}

export function updateTreeFall(tree: HarvestableTree, dt: number): boolean {
  if (tree.fallPhase !== 'falling') return false;
  tree.fallProgress = Math.min(1, tree.fallProgress + dt * 1.65);
  const ease = tree.fallProgress * tree.fallProgress;
  const ax = tree.fallAxis ?? 1;
  const az = tree.fallAxisZ ?? 0;
  // Directional timber: lean in XZ toward fall yaw
  tree.group.rotation.x = ease * (Math.PI / 2) * ax;
  tree.group.rotation.z = ease * (Math.PI / 2) * az * 0.85;
  return tree.fallProgress >= 1;
}

/** Start regrow after stump — visible growth scale animation, then mature. */
export function resetHarvestableTree(tree: HarvestableTree, scale: number): void {
  tree.fallPhase = 'live';
  tree.fallProgress = 0;
  tree.notchProgress = 0;
  tree.notchFaceYaw = null;
  tree.segmentHits = undefined;
  tree.woodCollected = 0;
  tree.fallYaw = undefined;
  tree.fallAxisZ = 0;
  tree.group.rotation.set(0, tree.group.rotation.y, 0);
  tree.baseScale = scale;
  void mountHarvestableTreeModel(tree, scale);
  beginGrowth(tree as any, 'tree');
}

export function resetHarvestableRock(rock: HarvestableRock): void {
  void mountHarvestableRockModel(rock, rock.baseScale);
  beginGrowth(rock as any, 'rock');
}

export function resetHarvestableCrystal(crystal: HarvestableCrystal): void {
  void mountCrystalClusterModel(crystal, crystal.baseScale);
  beginGrowth(crystal as any, 'crystal');
}

export function resetSimpleHarvestNode(
  node: HarvestableHemp | HarvestableFlower | HarvestableScrap,
  kind: HarvestKind = 'flower',
): void {
  beginGrowth(node as any, kind);
}