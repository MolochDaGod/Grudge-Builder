/**
 * ZoneHarvestSpawner — place interactive harvest meshes on Warlords zone nodes.
 * Replaces glow-only markers with CDN trees/rocks/gems for click-to-harvest FX.
 */
import * as THREE from 'three';
import type { HarvestNode, HarvestProfession, ZonePopulation } from '@shared/definitions/zoneServerNodes';
import { getNodesByCategory } from '@shared/definitions/zoneServerNodes';
import { createHarvestableTree, type HarvestableTree } from '../objects/HarvestableTree';
import { createHarvestableRock, mountHarvestableRockModel, type HarvestableRock } from '../objects/HarvestableRock';
import {
  createCrystalCluster,
  createHempPlant,
  createFlowerPatch,
  createScrapPile,
  type HarvestableCrystal,
  type HarvestableHemp,
  type HarvestableFlower,
  type HarvestableScrap,
} from '../objects/HomeIslandNodes';
import {
  HARVEST_RESPAWN_MS,
  beginTreeFall,
  markDepleted,
  resetHarvestableTree,
  resetHarvestableRock,
  resetHarvestableCrystal,
  resetSimpleHarvestNode,
} from './HarvestFeedback';
import {
  findValidPlacement,
  type HarvestKind,
} from './RegenerativeHarvest';
import { sampleHarvestScatterSlots } from './ThreeScatterHarvest';
import { calibrateHarvestScale } from '../zoneWorldScale';

export interface ZoneHarvestSpawnResult {
  trees: HarvestableTree[];
  rocks: HarvestableRock[];
  crystals: HarvestableCrystal[];
  hemps: HarvestableHemp[];
  flowers: HarvestableFlower[];
  scraps: HarvestableScrap[];
}

export function professionToResourceType(profession: HarvestProfession): string {
  switch (profession) {
    case 'woodcutting': return 'forest';
    case 'mining': return 'mining';
    case 'herbalism': return 'herbalism';
    case 'fishing': return 'fishing';
    case 'skinning': return 'forest';
    default: return 'mining';
  }
}

function sampleTerrainY(mesh: THREE.Mesh, x: number, z: number, fallbackY: number): number {
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, 800, z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = ray.intersectObject(mesh, true);
  return hits.length > 0 ? hits[0].point.y : fallbackY;
}

function isGemResource(node: HarvestNode): boolean {
  const id = `${node.resourceId} ${node.resourceName}`.toLowerCase();
  return /gem|crystal|ethereal|shard|vein/.test(id);
}

function isGoldResource(node: HarvestNode): boolean {
  const id = `${node.resourceId} ${node.resourceName}`.toLowerCase();
  return /gold|ore|silver|copper|iron|vein|mining/.test(id) && node.tier >= 3;
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

/**
 * three-scatter style density fill on island meshes (seeded surface samples).
 * Visual extras only (`userData.scatterFill`) until room owns ids.
 * @see https://github.com/JaimeTorrealba/three-scatter
 */
export function scatterFillHarvestOnIslands(
  scene: THREE.Scene,
  islandMeshes: Map<string, THREE.Mesh>,
  opts: {
    seed: number;
    waterLevel?: number;
    perIslandFill?: number;
  },
): ZoneHarvestSpawnResult {
  const result: ZoneHarvestSpawnResult = {
    trees: [],
    rocks: [],
    crystals: [],
    hemps: [],
    flowers: [],
    scraps: [],
  };
  const waterLevel = opts.waterLevel ?? 0;
  const fill = opts.perIslandFill ?? 8;
  let islandIdx = 0;
  for (const [, mesh] of islandMeshes) {
    const geo = mesh.geometry;
    if (!geo) continue;
    mesh.updateWorldMatrix(true, false);
    const kinds: HarvestKind[] = ['tree', 'rock', 'flower', 'hemp'];
    const slots = sampleHarvestScatterSlots(
      {
        baseGeometry: geo,
        baseMatrixWorld: mesh.matrixWorld.clone(),
        count: fill,
        seed: opts.seed + islandIdx * 9973,
        waterLevel,
        minNormalY: 0.5,
      },
      (i) => kinds[i % kinds.length],
    );
    for (const slot of slots) {
      const scale = 0.85 + (slot.seed % 10) * 0.02;
      if (slot.kind === 'tree') {
        const tree = createHarvestableTree(slot.position, scale);
        tree.group.userData.scatterFill = true;
        scene.add(tree.group);
        result.trees.push(tree);
      } else if (slot.kind === 'rock') {
        const rock = createHarvestableRock(slot.position, scale);
        rock.group.userData.scatterFill = true;
        scene.add(rock.group);
        result.rocks.push(rock);
      } else if (slot.kind === 'flower') {
        const flower = createFlowerPatch(slot.position, scale);
        flower.group.userData.scatterFill = true;
        scene.add(flower.group);
        result.flowers.push(flower);
      } else if (slot.kind === 'hemp') {
        const hemp = createHempPlant(slot.position, scale);
        hemp.group.userData.scatterFill = true;
        scene.add(hemp.group);
        result.hemps.push(hemp);
      }
    }
    islandIdx++;
  }
  return result;
}

export function spawnZoneHarvestNodes(
  scene: THREE.Scene,
  population: ZonePopulation,
  islandMeshes: Map<string, THREE.Mesh>,
  markers?: Map<string, THREE.Object3D>,
  waterLevel = 0,
  scatterOpts?: { seed?: number; fill?: boolean; perIslandFill?: number },
): ZoneHarvestSpawnResult {
  const result: ZoneHarvestSpawnResult = {
    trees: [],
    rocks: [],
    crystals: [],
    hemps: [],
    flowers: [],
    scraps: [],
  };

  const harvestNodes = getNodesByCategory<HarvestNode>(population, 'harvest');

  for (const node of harvestNodes) {
    if (node.state === 'depleted' || node.state === 'dead') continue;
    // Fishing nodes stay as water markers — never place land meshes for them
    if (node.profession === 'fishing' || node.parentIslandId === null) continue;

    const islandMesh = node.parentIslandId
      ? islandMeshes.get(node.parentIslandId)
      : undefined;
    if (!islandMesh) continue;

    const [wx, , wz] = node.position;
    const sample = (x: number, z: number) => sampleTerrainY(islandMesh, x, z, node.position[1]);

    // Map profession → land harvest kind (never fish on dry land mesh path)
    let kind: HarvestKind = 'rock';
    if (node.profession === 'woodcutting') kind = 'tree';
    else if (node.profession === 'herbalism') kind = 'flower';
    else if (node.profession === 'skinning') kind = 'scrap';
    else if (node.profession === 'mining' && isGemResource(node)) kind = 'crystal';
    else if (node.profession === 'mining') kind = 'rock';

    let placement = findValidPlacement(kind, wx, wz, waterLevel, sample);
    // three-scatter fallback when node is slightly off terrain mesh
    if (!placement && islandMesh.geometry) {
      islandMesh.updateWorldMatrix(true, false);
      const slots = sampleHarvestScatterSlots(
        {
          baseGeometry: islandMesh.geometry,
          baseMatrixWorld: islandMesh.matrixWorld.clone(),
          count: 1,
          seed: hashString(node.id),
          waterLevel,
        },
        () => kind,
      );
      if (slots[0]) {
        placement = {
          x: slots[0].position.x,
          y: slots[0].position.y,
          z: slots[0].position.z,
        };
      }
    }
    if (!placement) continue; // refuse water / invalid land

    const pos = new THREE.Vector3(placement.x, placement.y, placement.z);
    const scale = calibrateHarvestScale(node.profession, node.tier);

    if (node.profession === 'woodcutting') {
      const tree = createHarvestableTree(pos, scale);
      tree.nodeId = node.id;
      scene.add(tree.group);
      result.trees.push(tree);
    } else if (node.profession === 'mining') {
      if (isGemResource(node)) {
        const crystal = createCrystalCluster(pos, scale * 0.9);
        crystal.nodeId = node.id;
        scene.add(crystal.group);
        result.crystals.push(crystal);
      } else {
        const rock = createHarvestableRock(pos, scale);
        rock.nodeId = node.id;
        rock.oreVariant = isGoldResource(node);
        if (rock.oreVariant) void mountHarvestableRockModel(rock, scale);
        scene.add(rock.group);
        result.rocks.push(rock);
      }
    } else if (node.profession === 'herbalism') {
      if (node.id.charCodeAt(node.id.length - 1) % 2 === 0) {
        const flower = createFlowerPatch(pos, scale * 0.85);
        flower.nodeId = node.id;
        scene.add(flower.group);
        result.flowers.push(flower);
      } else {
        const hemp = createHempPlant(pos, scale * 0.85);
        hemp.nodeId = node.id;
        scene.add(hemp.group);
        result.hemps.push(hemp);
      }
    } else if (node.profession === 'skinning') {
      const scrap = createScrapPile(pos, scale * 0.8);
      scrap.nodeId = node.id;
      scene.add(scrap.group);
      result.scraps.push(scrap);
    }

    const marker = markers?.get(node.id);
    if (marker) marker.visible = false;
  }

  // Optional three-scatter density fill (seeded surface samples on island meshes)
  if (scatterOpts?.fill !== false) {
    const fill = scatterFillHarvestOnIslands(scene, islandMeshes, {
      seed: scatterOpts?.seed ?? hashString(population.sectorId ?? population.worldSeed ?? 'zone'),
      waterLevel,
      perIslandFill: scatterOpts?.perIslandFill ?? 6,
    });
    result.trees.push(...fill.trees);
    result.rocks.push(...fill.rocks);
    result.crystals.push(...fill.crystals);
    result.hemps.push(...fill.hemps);
    result.flowers.push(...fill.flowers);
    result.scraps.push(...fill.scraps);
  }

  return result;
}

export interface TownHarvestNodeSync {
  id: string;
  resourceType: string;
  x: number;
  z: number;
  depleted: boolean;
}

/** Matches TownRoom.seedTownHarvestNodes — used for offline solo play. */
export const TOWN_HARVEST_DEFAULTS: TownHarvestNodeSync[] = [
  { id: 'town_barrel_1', resourceType: 'forest', x: -10, z: 8, depleted: false },
  { id: 'town_barrel_2', resourceType: 'forest', x: 14, z: 12, depleted: false },
  { id: 'town_crate_1', resourceType: 'mining', x: -8, z: -8, depleted: false },
  { id: 'town_crate_2', resourceType: 'mining', x: 18, z: -5, depleted: false },
  { id: 'town_herb_1', resourceType: 'herbalism', x: -20, z: -15, depleted: false },
  { id: 'town_herb_2', resourceType: 'herbalism', x: 22, z: -18, depleted: false },
];

export interface HarvestableCollections {
  trees: HarvestableTree[];
  rocks: HarvestableRock[];
  crystals: HarvestableCrystal[];
  hemps: HarvestableHemp[];
  flowers: HarvestableFlower[];
  scraps: HarvestableScrap[];
}

export function appendHarvestSpawn(
  collections: HarvestableCollections,
  result: ZoneHarvestSpawnResult,
): void {
  collections.trees.push(...result.trees);
  collections.rocks.push(...result.rocks);
  collections.crystals.push(...result.crystals);
  collections.hemps.push(...result.hemps);
  collections.flowers.push(...result.flowers);
  collections.scraps.push(...result.scraps);
}

/** Apply server-authoritative depleted / respawn state to a node by id. */
export function syncHarvestNodeDepleted(
  collections: HarvestableCollections,
  nodeId: string,
  depleted: boolean,
): void {
  const tree = collections.trees.find((t) => t.nodeId === nodeId);
  if (tree) {
    if (
      depleted &&
      (tree.fallPhase === 'live' || tree.fallPhase === 'notching')
    ) {
      beginTreeFall(tree);
      markDepleted(tree as any, 'tree', false);
    } else if (
      !depleted &&
      tree.fallPhase !== 'live' &&
      tree.fallPhase !== 'notching'
    ) {
      tree.respawnAt = 0;
      resetHarvestableTree(tree, tree.baseScale);
    }
    return;
  }

  const rock = collections.rocks.find((r) => r.nodeId === nodeId);
  if (rock) {
    if (depleted && rock.group.visible) {
      markDepleted(rock as any, 'rock', true);
    } else if (!depleted) {
      rock.respawnAt = 0;
      resetHarvestableRock(rock);
    }
    return;
  }

  const crystal = collections.crystals.find((c) => c.nodeId === nodeId);
  if (crystal) {
    if (depleted && crystal.group.visible) {
      markDepleted(crystal as any, 'crystal', true);
    } else if (!depleted) {
      crystal.respawnAt = 0;
      resetHarvestableCrystal(crystal);
    }
    return;
  }

  for (const hemp of collections.hemps) {
    if (hemp.nodeId !== nodeId) continue;
    if (depleted && hemp.group.visible) {
      markDepleted(hemp as any, 'hemp', true);
    } else if (!depleted) {
      hemp.respawnAt = 0;
      resetSimpleHarvestNode(hemp, 'hemp');
    }
    return;
  }

  for (const flower of collections.flowers) {
    if (flower.nodeId !== nodeId) continue;
    if (depleted && flower.group.visible) {
      markDepleted(flower as any, 'flower', true);
    } else if (!depleted) {
      flower.respawnAt = 0;
      resetSimpleHarvestNode(flower, 'flower');
    }
    return;
  }

  for (const scrap of collections.scraps) {
    if (scrap.nodeId !== nodeId) continue;
    if (depleted && scrap.group.visible) {
      markDepleted(scrap as any, 'scrap', true);
    } else if (!depleted) {
      scrap.respawnAt = 0;
      resetSimpleHarvestNode(scrap, 'scrap');
    }
  }
}

/** Town market harvest nodes (barrels, crates, herbs) from TownRoom. */
export function spawnTownHarvestNodes(
  scene: THREE.Scene,
  townOffset: [number, number, number],
  nodes: Iterable<TownHarvestNodeSync>,
  terrainMesh: THREE.Mesh | null,
): ZoneHarvestSpawnResult {
  const result: ZoneHarvestSpawnResult = {
    trees: [],
    rocks: [],
    crystals: [],
    hemps: [],
    flowers: [],
    scraps: [],
  };

  const [ox, , oz] = townOffset;

  for (const node of nodes) {
    if (node.depleted) continue;

    const wx = ox + node.x;
    const wz = oz + node.z;
    const y = terrainMesh
      ? sampleTerrainY(terrainMesh, wx, wz, 0)
      : 0;
    const pos = new THREE.Vector3(wx, y, wz);
    const scale = 0.85;

    switch (node.resourceType) {
      case 'forest': {
        const tree = createHarvestableTree(pos, scale * 0.7);
        tree.nodeId = node.id;
        scene.add(tree.group);
        result.trees.push(tree);
        break;
      }
      case 'mining': {
        const rock = createHarvestableRock(pos, scale);
        rock.nodeId = node.id;
        scene.add(rock.group);
        result.rocks.push(rock);
        break;
      }
      case 'herbalism': {
        const hemp = createHempPlant(pos, scale);
        hemp.nodeId = node.id;
        scene.add(hemp.group);
        result.hemps.push(hemp);
        break;
      }
      default: {
        const scrap = createScrapPile(pos, scale * 0.75);
        scrap.nodeId = node.id;
        scene.add(scrap.group);
        result.scraps.push(scrap);
      }
    }
  }

  return result;
}