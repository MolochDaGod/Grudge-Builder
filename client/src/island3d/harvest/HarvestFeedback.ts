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

export const HARVEST_RESPAWN_MS = 120_000;

export interface HarvestDrop {
  group: THREE.Group;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

export async function spawnResourceDrops(
  scene: THREE.Scene,
  position: THREE.Vector3,
  type: 'log' | 'debris' | 'gold',
  count = 3,
): Promise<HarvestDrop[]> {
  const resourceType = type === 'log' ? 'log' : type === 'gold' ? 'goldRock' : 'debris';
  const height = type === 'log' ? 0.8 : 0.45;
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

export async function swapTreeToStump(tree: HarvestableTree, scale: number): Promise<void> {
  try {
    const stump = await cloneIslandResource('stump');
    tree.group.clear();
    fitModelToHeight(stump, 2.2 * scale);
    tree.group.add(stump);
    tree.fallPhase = 'stump';
  } catch {
    tree.fallPhase = 'stump';
  }
}

export function beginTreeFall(tree: HarvestableTree): void {
  if (tree.fallPhase !== 'live') return;
  tree.fallPhase = 'falling';
  tree.fallProgress = 0;
  tree.fallAxis = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
  tree.shaking = false;
}

export function updateTreeFall(tree: HarvestableTree, dt: number): boolean {
  if (tree.fallPhase !== 'falling') return false;
  tree.fallProgress = Math.min(1, tree.fallProgress + dt * 1.8);
  const ease = tree.fallProgress * tree.fallProgress;
  tree.group.rotation.x = ease * (Math.PI / 2) * tree.fallAxis;
  return tree.fallProgress >= 1;
}

export function resetHarvestableTree(tree: HarvestableTree, scale: number): void {
  tree.health = tree.maxHealth;
  tree.fallPhase = 'live';
  tree.fallProgress = 0;
  tree.group.rotation.set(0, tree.group.rotation.y, 0);
  tree.group.visible = true;
  tree.group.scale.setScalar(scale);
  void mountHarvestableTreeModel(tree, scale);
}

export function resetHarvestableRock(rock: HarvestableRock): void {
  rock.health = rock.maxHealth;
  rock.group.visible = true;
  rock.group.scale.setScalar(rock.baseScale);
  void mountHarvestableRockModel(rock, rock.baseScale);
}