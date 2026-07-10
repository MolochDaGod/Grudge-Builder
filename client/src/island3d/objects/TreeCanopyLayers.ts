/**
 * TreeCanopyLayers — densify harvest forest zones with BATTLE CommonTree pack.
 * Same assets as game.grudge-studio.com/game/battle NatureDecor.
 */
import * as THREE from 'three';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import { BATTLE_NATURE_PACK, pickBattleNaturePath } from '@shared/definitions/natureAssetCatalog';
import { cloneFromPackPath, fitModelToHeight, loadIslandResourceTemplate } from './IslandResourceLoader';
import type { HarvestZoneDef } from '../harvest/HarvestZonePlacer';

const LAYER_DEFS = [
  { name: 'understory', radiusMul: 0.55, count: 5, heightM: 5 },
  { name: 'midstory', radiusMul: 0.85, count: 4, heightM: 7.5 },
  { name: 'canopy', radiusMul: 1.15, count: 3, heightM: 10 },
  { name: 'emergent', radiusMul: 1.35, count: 2, heightM: 13 },
] as const;

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function spawnTreeCanopyLayers(
  scene: THREE.Scene,
  terrainMesh: THREE.Mesh,
  zones: HarvestZoneDef[],
  islandSeed: string,
): Promise<THREE.Group> {
  const root = new THREE.Group();
  root.name = 'tree_canopy_layers_battle';

  const forestZones = zones.filter(
    (z) => z.type === 'forest' || z.type === 'mixed' || z.type === 'hemp_patch',
  );
  if (forestZones.length === 0) {
    scene.add(root);
    return root;
  }

  // Warm battle tree cache
  await Promise.all(
    BATTLE_NATURE_PACK.trees.map((p) => loadIslandResourceTemplate(p).catch(() => null)),
  );

  const rng = prng(hash(islandSeed + ':canopy-battle'));
  let placed = 0;

  for (const zone of forestZones) {
    for (const layer of LAYER_DEFS) {
      const layerGroup = new THREE.Group();
      layerGroup.name = `canopy_${layer.name}_${zone.id}`;
      for (let i = 0; i < layer.count; i++) {
        const ang = rng() * Math.PI * 2;
        const rad = zone.radius * layer.radiusMul * (0.55 + rng() * 0.45);
        const x = zone.center.x + Math.cos(ang) * rad;
        const z = zone.center.z + Math.sin(ang) * rad;
        if (Math.hypot(x - zone.center.x, z - zone.center.z) < zone.clearRadius * 0.65) continue;
        const y = getTerrainHeightAt(terrainMesh, x, z);
        if (y == null || y < 1) continue;

        const path = pickBattleNaturePath(rng() > 0.85 ? 'deadTrees' : 'tree', rng);
        try {
          const tree = await cloneFromPackPath(path, []);
          fitModelToHeight(tree, layer.heightM * (0.9 + rng() * 0.25));
          tree.rotation.y = rng() * Math.PI * 2;
          tree.position.set(x, y, z);
          tree.userData.canopyLayer = layer.name;
          layerGroup.add(tree);
          placed++;
        } catch {
          /* skip */
        }
      }
      root.add(layerGroup);
    }
  }

  scene.add(root);
  console.log(`[TreeCanopy] battle CommonTree densify: ${placed} on ${forestZones.length} zones`);
  return root;
}
