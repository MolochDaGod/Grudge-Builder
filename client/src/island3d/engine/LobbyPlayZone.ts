/**
 * LobbyPlayZone — center-map free-play hub: vendors, harvest nodes, PvE ring.
 * Production lobby instance (grudge-open-world) on pirate-islands map.
 */
import * as THREE from 'three';
import type { FactionTown } from '@shared/definitions/factionTowns';
import type { LobbyLoadResult } from './LobbyIslandLoader';
import { TownNPCController } from '../ai/TownNPCController';
import { createHarvestableTree, type HarvestableTree } from '../objects/HarvestableTree';
import { createHarvestableRock, type HarvestableRock } from '../objects/HarvestableRock';
import { createCrystalCluster, createHempPlant, type HarvestableCrystal, type HarvestableHemp } from '../objects/HomeIslandNodes';
import type { CreatureManager } from '../creatures/CreatureManager';

export interface LobbyPlayZoneResult {
  town: FactionTown;
  npcController: TownNPCController;
  hubMarker: THREE.Group;
  trees: HarvestableTree[];
  rocks: HarvestableRock[];
  crystals: HarvestableCrystal[];
  hemps: HarvestableHemp[];
  update: (dt: number) => void;
  dispose: () => void;
}

function sampleY(
  sampleHeight: (x: number, z: number) => number | null,
  x: number,
  z: number,
  fallback = 4,
): number {
  return sampleHeight(x, z) ?? fallback;
}

export function buildLobbyOpenWorldTown(
  lobby: LobbyLoadResult,
  sampleHeight: (x: number, z: number) => number | null,
): FactionTown {
  const c = lobby.center;
  const hubR = Math.min(lobby.size.x, lobby.size.z) * 0.14;
  const y = sampleY(sampleHeight, c.x, c.z) + 0.05;

  const mk = (id: string, category: FactionTown['spawnPoints'][0]['category'], ox: number, oz: number, facing: number, label?: string) => ({
    id,
    category,
    position: [c.x + ox, sampleY(sampleHeight, c.x + ox, c.z + oz, y), c.z + oz] as [number, number, number],
    facing,
    label,
  });

  const spawnPoints = [
    mk('lobby_spawn', 'playerSpawn', 0, hubR * 0.35, 0),
    mk('lobby_merchant_supplies', 'merchant', -hubR * 0.55, 0, Math.PI / 2, 'Supplies & Potions'),
    mk('lobby_merchant_weapons', 'merchant', hubR * 0.55, 0, -Math.PI / 2, 'Weapons & Armor'),
    mk('lobby_faction_vendor', 'factionVendor', 0, -hubR * 0.5, 0, 'Faction Quartermaster'),
    mk('lobby_quest_board', 'questGiver', -hubR * 0.35, -hubR * 0.35, Math.PI / 4, 'Contract Board'),
    mk('lobby_shrine', 'shrine', hubR * 0.35, -hubR * 0.35, -Math.PI / 4, 'Wayshrine'),
    mk('lobby_guard_a', 'guard', -hubR * 0.8, hubR * 0.3, Math.PI),
    mk('lobby_guard_b', 'guard', hubR * 0.8, hubR * 0.3, 0),
    mk('lobby_civilian_a', 'npc', -hubR * 0.2, hubR * 0.45, Math.PI),
    mk('lobby_civilian_b', 'npc', hubR * 0.2, hubR * 0.5, 0),
  ];

  const patrolA: [number, number, number][] = [
    [c.x - hubR, y, c.z + hubR * 0.5],
    [c.x - hubR, y, c.z - hubR * 0.5],
    [c.x - hubR * 0.5, y, c.z - hubR * 0.5],
  ];
  const patrolB = patrolA.map(([x, py, z]) => [c.x + (c.x - x), py, z] as [number, number, number]);

  const npcs: FactionTown['npcs'] = [
    { id: 'lobby_m1', modelId: 'human', role: 'merchant', name: 'Saltwind Trader', spawnPointId: 'lobby_merchant_supplies', dialogueSetId: 'merchant_potions' },
    { id: 'lobby_m2', modelId: 'dwarf', role: 'merchant', name: 'Ironhook Smith', spawnPointId: 'lobby_merchant_weapons', dialogueSetId: 'merchant_weapons' },
    { id: 'lobby_fv', modelId: 'elf', role: 'factionVendor', name: 'Embassy Broker', spawnPointId: 'lobby_faction_vendor', dialogueSetId: 'crusade_vendor' },
    { id: 'lobby_q1', modelId: 'human', role: 'questGiver', name: 'Harbor Master', spawnPointId: 'lobby_quest_board', dialogueSetId: 'lobby_contracts' },
    { id: 'lobby_sk', modelId: 'human', role: 'shrineKeeper', name: 'Shrine Attendant', spawnPointId: 'lobby_shrine', dialogueSetId: 'shrine_odin' },
    { id: 'lobby_g1', modelId: 'human', role: 'guard', name: 'Port Guard', spawnPointId: 'lobby_guard_a', patrolPath: patrolA },
    { id: 'lobby_g2', modelId: 'human', role: 'guard', name: 'Port Guard', spawnPointId: 'lobby_guard_b', patrolPath: patrolB },
    { id: 'lobby_c1', modelId: 'human', role: 'civilian', name: 'Dockhand', spawnPointId: 'lobby_civilian_a' },
    { id: 'lobby_c2', modelId: 'orc', role: 'civilian', name: 'Sailor', spawnPointId: 'lobby_civilian_b' },
  ];

  return {
    id: 'grudge-open-world',
    factionId: 'crusade',
    name: "Racalvin's Free Port",
    subtitle: 'Open World Hub',
    sectorId: 'CENTER',
    modelPath: '',
    modelScale: 1,
    modelOffset: [0, 0, 0],
    composition: {
      exteriorPath: '',
      exteriorScale: 1,
      exteriorOffset: [0, 0, 0],
      overlays: [],
    },
    interiors: [],
    spawnPoints,
    npcs,
    ambience: {
      fogColor: 0x87ceeb,
      fogDensity: 0.0008,
      accentLightColor: 0xffa040,
      accentLightIntensity: 0.4,
      skyColor: 0x87ceeb,
      shrineParticles: ['embers'],
      ambientSound: 'harbor_ambience',
    },
    navmesh: {
      bounds: [c.x - hubR * 1.2, c.z - hubR * 1.2, c.x + hubR * 1.2, c.z + hubR * 1.2],
      obstacles: [],
      cellSize: 2,
    },
    specialFeatures: ['free_play', 'vendors', 'pve_ring', 'capture_points', 'sailing'],
    description: 'Neutral harbor hub — vendors, contracts, and PvE beyond the market ring.',
  };
}

function createHubMarker(center: THREE.Vector3, radius: number, groundY: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(center.x, groundY + 0.2, center.z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.85, radius, 64),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
  );
  pillar.position.y = 3;
  pillar.castShadow = true;
  g.add(pillar);

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, side: THREE.DoubleSide }),
  );
  banner.position.set(0, 5.5, 0);
  g.add(banner);

  return g;
}

export async function createLobbyPlayZone(
  scene: THREE.Scene,
  lobby: LobbyLoadResult,
  sampleHeight: (x: number, z: number) => number | null,
  creatures: CreatureManager | null,
): Promise<LobbyPlayZoneResult> {
  const town = buildLobbyOpenWorldTown(lobby, sampleHeight);
  const hubR = Math.min(lobby.size.x, lobby.size.z) * 0.14;
  const hubY = sampleY(sampleHeight, lobby.center.x, lobby.center.z);

  const hubMarker = createHubMarker(lobby.center, hubR, hubY);
  scene.add(hubMarker);

  const npcController = new TownNPCController(scene, town);
  await npcController.init();

  const trees: HarvestableTree[] = [];
  const rocks: HarvestableRock[] = [];
  const crystals: HarvestableCrystal[] = [];
  const hemps: HarvestableHemp[] = [];

  const harvestRing = hubR * 1.8;
  const angles = [0, Math.PI * 0.35, Math.PI * 0.7, Math.PI, Math.PI * 1.35, Math.PI * 1.7];
  for (const a of angles) {
    const x = lobby.center.x + Math.cos(a) * harvestRing;
    const z = lobby.center.z + Math.sin(a) * harvestRing;
    const y = sampleY(sampleHeight, x, z);

    if (a < Math.PI * 0.5) {
      const tree = createHarvestableTree(new THREE.Vector3(x, y, z), 1.2 + Math.random() * 0.4);
      scene.add(tree.group);
      trees.push(tree);
    } else if (a < Math.PI) {
      const rock = createHarvestableRock(new THREE.Vector3(x, y, z), 1.5);
      scene.add(rock.group);
      rocks.push(rock);
    } else if (a < Math.PI * 1.5) {
      const crystal = createCrystalCluster(new THREE.Vector3(x, y, z));
      scene.add(crystal.group);
      crystals.push(crystal);
    } else {
      const hemp = createHempPlant(new THREE.Vector3(x, y, z));
      scene.add(hemp.group);
      hemps.push(hemp);
    }
  }

  // PvE ring — aggressive land creatures outside the safe hub
  if (creatures) {
    creatures.spawnLandCreaturesInArea(
      sampleHeight,
      lobby.center,
      hubR * 2.2,
      hubR * 4.5,
      10,
    );
  }

  return {
    town,
    npcController,
    hubMarker,
    trees,
    rocks,
    crystals,
    hemps,
    update(dt) {
      npcController.update(dt);
    },
    dispose() {
      scene.remove(hubMarker);
      npcController.dispose();
      for (const t of trees) scene.remove(t.group);
      for (const r of rocks) scene.remove(r.group);
      for (const c of crystals) scene.remove(c.group);
      for (const h of hemps) scene.remove(h.group);
    },
  };
}