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
  resetHarvestableTree,
  resetHarvestableRock,
  resetHarvestableCrystal,
  resetSimpleHarvestNode,
} from './HarvestFeedback';
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

export function spawnZoneHarvestNodes(
  scene: THREE.Scene,
  population: ZonePopulation,
  islandMeshes: Map<string, THREE.Mesh>,
  markers?: Map<string, THREE.Object3D>,
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
    if (node.profession === 'fishing' || node.parentIslandId === null) continue;

    const islandMesh = node.parentIslandId
      ? islandMeshes.get(node.parentIslandId)
      : undefined;
    if (!islandMesh) continue;

    const [wx, , wz] = node.position;
    const y = sampleTerrainY(islandMesh, wx, wz, node.position[1]);
    const pos = new THREE.Vector3(wx, y, wz);
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
    if (depleted && tree.fallPhase === 'live') {
      beginTreeFall(tree);
      tree.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted && tree.fallPhase !== 'live') {
      tree.respawnAt = 0;
      resetHarvestableTree(tree, tree.baseScale);
    }
    return;
  }

  const rock = collections.rocks.find((r) => r.nodeId === nodeId);
  if (rock) {
    if (depleted && rock.group.visible) {
      rock.group.visible = false;
      rock.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted) {
      rock.respawnAt = 0;
      resetHarvestableRock(rock);
    }
    return;
  }

  const crystal = collections.crystals.find((c) => c.nodeId === nodeId);
  if (crystal) {
    if (depleted && crystal.group.visible) {
      crystal.group.visible = false;
      crystal.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted) {
      crystal.respawnAt = 0;
      resetHarvestableCrystal(crystal);
    }
    return;
  }

  for (const hemp of collections.hemps) {
    if (hemp.nodeId !== nodeId) continue;
    if (depleted && hemp.group.visible) {
      hemp.group.visible = false;
      hemp.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted) {
      hemp.respawnAt = 0;
      resetSimpleHarvestNode(hemp);
    }
    return;
  }

  for (const flower of collections.flowers) {
    if (flower.nodeId !== nodeId) continue;
    if (depleted && flower.group.visible) {
      flower.group.visible = false;
      flower.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted) {
      flower.respawnAt = 0;
      resetSimpleHarvestNode(flower);
    }
    return;
  }

  for (const scrap of collections.scraps) {
    if (scrap.nodeId !== nodeId) continue;
    if (depleted && scrap.group.visible) {
      scrap.group.visible = false;
      scrap.respawnAt = Date.now() + HARVEST_RESPAWN_MS;
    } else if (!depleted) {
      scrap.respawnAt = 0;
      resetSimpleHarvestNode(scrap);
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