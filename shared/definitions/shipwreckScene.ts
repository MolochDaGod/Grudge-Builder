/**
 * Shipwreck Scene — complete usable map SSOT.
 *
 * Zones · harvest nodes · NPC behaviors · prefab deployments · nav bounds.
 * Every placeable has XYZ + rotY + scale for gizmo / pathfinder / editor.
 *
 * Used by: ShipwreckSceneRuntime, ShipwreckGizmo, tutorial /tutorial
 */

export type ShipwreckEntityKind =
  | 'zone'
  | 'node'
  | 'npc'
  | 'prefab'
  | 'path'
  | 'spawn';

export type ShipwreckZoneKind =
  | 'wake'
  | 'wreck'
  | 'beach'
  | 'harvest'
  | 'pve'
  | 'safe'
  | 'dock'
  | 'path'
  | 'camp';

export type ShipwreckNodeKind =
  | 'stick'
  | 'stone'
  | 'fiber'
  | 'chest'
  | 'campfire_site'
  | 'raft_site'
  | 'water_fill';

export type ShipwreckNpcBehavior =
  | 'stationary'
  | 'patrol'
  | 'wander'
  | 'guard'
  | 'scavenge'
  | 'flee'
  | 'attack_on_sight';

export type ShipwreckPrefabKind =
  | 'wreck_hull'
  | 'boat'
  | 'rock'
  | 'stick_prop'
  | 'stone_prop'
  | 'chest'
  | 'barrel'
  | 'tent'
  | 'campfire'
  | 'dock_plank'
  | 'crate'
  | 'marker';

export interface Xyz {
  x: number;
  y: number;
  z: number;
}

export interface ShipwreckTransform {
  position: Xyz;
  rotationY?: number;
  scale?: number | [number, number, number];
}

export interface ShipwreckZoneDef {
  id: string;
  kind: ShipwreckZoneKind;
  name: string;
  /** Center XYZ */
  center: Xyz;
  /** Ellipse radii on XZ (meters) */
  radiusX: number;
  radiusZ: number;
  color: string;
  description: string;
  /** Gameplay tags */
  tags: string[];
}

export interface ShipwreckNodeDef {
  id: string;
  kind: ShipwreckNodeKind;
  name: string;
  transform: ShipwreckTransform;
  /** Resource granted on harvest */
  resource?: string;
  quantity?: number;
  respawnSec?: number;
  /** Zone this node belongs to */
  zoneId: string;
  interact?: 'harvest' | 'open' | 'use' | 'fill';
}

export interface ShipwreckNpcDef {
  id: string;
  name: string;
  role: string;
  behavior: ShipwreckNpcBehavior;
  transform: ShipwreckTransform;
  /** Patrol / path waypoints (world XYZ) */
  pathId?: string;
  zoneId: string;
  /** Dialogue / ally one-liner */
  line?: string;
  faction?: 'ally' | 'neutral' | 'enemy';
  modelHint?: string;
  /** Attack range for hostile */
  aggroRange?: number;
  speed?: number;
}

export interface ShipwreckPrefabDef {
  id: string;
  kind: ShipwreckPrefabKind;
  name: string;
  transform: ShipwreckTransform;
  zoneId: string;
  /** Collider blocks pathfinder when true */
  blocksNav?: boolean;
  /** Tagged as mesh prefab for registry */
  chunkable?: boolean;
  tags?: string[];
}

export interface ShipwreckPathDef {
  id: string;
  name: string;
  /** Ordered waypoints for patrol / player guide */
  points: Xyz[];
  loop?: boolean;
  color?: string;
}

export interface ShipwreckSceneDef {
  id: string;
  displayName: string;
  version: string;
  seed: string;
  waterLevel: number;
  /** Nav grid bounds [minX, minZ, maxX, maxZ] */
  navBounds: [number, number, number, number];
  navCellSize: number;
  playerSpawn: Xyz;
  zones: ShipwreckZoneDef[];
  nodes: ShipwreckNodeDef[];
  npcs: ShipwreckNpcDef[];
  prefabs: ShipwreckPrefabDef[];
  paths: ShipwreckPathDef[];
}

// ─── Canonical complete shipwreck scene ──────────────────────────────────────

const O = { x: 0, y: 1.2, z: 4 }; // wake origin (player)

export const SHIPWRECK_SCENE: ShipwreckSceneDef = {
  id: 'shipwreck_tutorial',
  displayName: 'Shipwreck Island — Complete',
  version: '1.0.0',
  seed: 'shipwreck-tutorial',
  waterLevel: 0,
  navBounds: [-48, -48, 48, 48],
  navCellSize: 2,
  playerSpawn: { ...O },
  zones: [
    {
      id: 'zone_wake',
      kind: 'wake',
      name: 'Wake Pocket',
      center: { x: O.x, y: 0.1, z: O.z + 2 },
      radiusX: 8,
      radiusZ: 9,
      color: '#fbbf24',
      description: 'Player wakes here — sticks, stones, T0 craft teach.',
      tags: ['spawn', 'harvest', 'tutorial'],
    },
    {
      id: 'zone_wreck',
      kind: 'wreck',
      name: 'Broken Ship',
      center: { x: 0, y: 0.5, z: -6 },
      radiusX: 10,
      radiusZ: 8,
      color: '#92400e',
      description: 'Wrecked pirate hull — loot, board, story.',
      tags: ['loot', 'story', 'structure'],
    },
    {
      id: 'zone_beach_n',
      kind: 'beach',
      name: 'North Beach',
      center: { x: 0, y: 0.1, z: 22 },
      radiusX: 16,
      radiusZ: 10,
      color: '#fde68a',
      description: 'Open sand toward water — fishing / bucket fill.',
      tags: ['beach', 'water'],
    },
    {
      id: 'zone_harvest_w',
      kind: 'harvest',
      name: 'West Fringe',
      center: { x: -22, y: 0.2, z: 4 },
      radiusX: 12,
      radiusZ: 14,
      color: '#22c55e',
      description: 'Outer harvest ring — extra sticks and rocks.',
      tags: ['harvest'],
    },
    {
      id: 'zone_pve',
      kind: 'pve',
      name: 'Scavenger Camp',
      center: { x: 20, y: 0.2, z: -8 },
      radiusX: 12,
      radiusZ: 12,
      color: '#ef4444',
      description: 'Hostile scavengers — light PvE.',
      tags: ['combat', 'enemy'],
    },
    {
      id: 'zone_camp',
      kind: 'camp',
      name: 'Campfire Flat',
      center: { x: -6, y: 0.2, z: 10 },
      radiusX: 6,
      radiusZ: 6,
      color: '#f97316',
      description: 'Safe camp placement for campfire / tent.',
      tags: ['camp', 'craft'],
    },
    {
      id: 'zone_dock',
      kind: 'dock',
      name: 'Raft Launch',
      center: { x: 4, y: 0.1, z: 28 },
      radiusX: 8,
      radiusZ: 6,
      color: '#38bdf8',
      description: 'Deploy raft and board (E).',
      tags: ['dock', 'exit'],
    },
  ],
  nodes: [
    // Wake sticks
    ...[
      [1.5, 2.2], [-1.2, 3.0], [2.8, 4.5], [-2.5, 1.8],
      [0.4, 5.2], [-3.2, 4.0], [3.5, 2.0], [-0.8, 6.0],
    ].map(([ox, oz], i) => ({
      id: `node_stick_${i + 1}`,
      kind: 'stick' as const,
      name: `Driftwood Stick ${i + 1}`,
      transform: { position: { x: O.x + ox, y: 0.15, z: O.z + oz } },
      resource: 'stick',
      quantity: 1,
      respawnSec: 90,
      zoneId: 'zone_wake',
      interact: 'harvest' as const,
    })),
    // Wake stones
    ...[
      [2.2, 3.5], [-1.8, 4.8], [0.6, 2.0], [3.0, 5.5], [-2.8, 2.5], [1.0, 6.5],
    ].map(([ox, oz], i) => ({
      id: `node_stone_${i + 1}`,
      kind: 'stone' as const,
      name: `Small Stone ${i + 1}`,
      transform: { position: { x: O.x + ox, y: 0.12, z: O.z + oz } },
      resource: 'stone',
      quantity: 1,
      respawnSec: 90,
      zoneId: 'zone_wake',
      interact: 'harvest' as const,
    })),
    // Outer harvest
    {
      id: 'node_stick_w1',
      kind: 'stick',
      name: 'West Driftwood',
      transform: { position: { x: -20, y: 0.15, z: 6 } },
      resource: 'stick',
      quantity: 1,
      respawnSec: 120,
      zoneId: 'zone_harvest_w',
      interact: 'harvest',
    },
    {
      id: 'node_stone_w1',
      kind: 'stone',
      name: 'West Boulder Chip',
      transform: { position: { x: -24, y: 0.2, z: 2 } },
      resource: 'stone',
      quantity: 1,
      respawnSec: 120,
      zoneId: 'zone_harvest_w',
      interact: 'harvest',
    },
    {
      id: 'node_chest_wreck',
      kind: 'chest',
      name: 'Wreck Hold Chest',
      transform: { position: { x: 1, y: 0.6, z: -8 }, rotationY: 0.4 },
      resource: 'loot_crate',
      quantity: 1,
      zoneId: 'zone_wreck',
      interact: 'open',
    },
    {
      id: 'node_campfire_site',
      kind: 'campfire_site',
      name: 'Campfire Site',
      transform: { position: { x: -6, y: 0.2, z: 10 } },
      zoneId: 'zone_camp',
      interact: 'use',
    },
    {
      id: 'node_raft_site',
      kind: 'raft_site',
      name: 'Raft Launch Pad',
      transform: { position: { x: 4, y: 0.15, z: 28 } },
      zoneId: 'zone_dock',
      interact: 'use',
    },
    {
      id: 'node_water_fill',
      kind: 'water_fill',
      name: 'Shore Water',
      transform: { position: { x: 0, y: 0.05, z: 30 } },
      zoneId: 'zone_beach_n',
      interact: 'fill',
    },
  ],
  npcs: [
    {
      id: 'npc_ally_guide',
      name: 'Camp Guide',
      role: 'ally',
      behavior: 'stationary',
      transform: { position: { x: -3, y: 1.2, z: 8 }, rotationY: Math.PI * 0.25 },
      zoneId: 'zone_wake',
      faction: 'ally',
      line: 'Gather sticks and stones, then craft your T0 tools.',
      modelHint: 'human',
      speed: 0,
    },
    {
      id: 'npc_scavenger_a',
      name: 'Shore Scavenger',
      role: 'bandit',
      behavior: 'patrol',
      pathId: 'path_scavenger_loop',
      transform: { position: { x: 18, y: 1.2, z: -6 }, rotationY: 0 },
      zoneId: 'zone_pve',
      faction: 'enemy',
      line: 'That wreck is ours!',
      modelHint: 'orc',
      aggroRange: 8,
      speed: 2.8,
    },
    {
      id: 'npc_scavenger_b',
      name: 'Wreck Looter',
      role: 'bandit',
      behavior: 'wander',
      transform: { position: { x: 22, y: 1.2, z: -12 } },
      zoneId: 'zone_pve',
      faction: 'enemy',
      modelHint: 'human',
      aggroRange: 7,
      speed: 2.2,
    },
    {
      id: 'npc_boar',
      name: 'Wild Boar',
      role: 'animal',
      behavior: 'wander',
      transform: { position: { x: -18, y: 1.0, z: 0 } },
      zoneId: 'zone_harvest_w',
      faction: 'neutral',
      modelHint: 'boar',
      aggroRange: 5,
      speed: 3.5,
    },
    {
      id: 'npc_quest_traveler_boat',
      name: 'Dock Quest Traveler',
      role: 'quest',
      behavior: 'stationary',
      transform: { position: { x: 6, y: 1.2, z: 26 }, rotationY: Math.PI },
      zoneId: 'zone_dock',
      faction: 'ally',
      // Same dialogue set as faction island starter boats (all races)
      line: 'Same lessons for every race — gather, craft, claim, fight, build a raft, sail home, report to your commander.',
      modelHint: 'human',
      tags: ['quest_traveler', 'starter_quest_boat'],
    },
  ],
  prefabs: [
    {
      id: 'pf_wreck_hull',
      kind: 'wreck_hull',
      name: 'Broken Pirate Hull',
      transform: { position: { x: 0, y: 0, z: -10 }, rotationY: 0.35, scale: 1.1 },
      zoneId: 'zone_wreck',
      blocksNav: true,
      chunkable: true,
      tags: ['landmark', 'ship'],
    },
    {
      id: 'pf_boat_l',
      kind: 'boat',
      name: 'Left Beach Boat',
      transform: { position: { x: -11, y: 0.2, z: 6 }, rotationY: -0.6, scale: 0.85 },
      zoneId: 'zone_wake',
      blocksNav: true,
      chunkable: true,
    },
    {
      id: 'pf_boat_r',
      kind: 'boat',
      name: 'Right Beach Boat',
      transform: { position: { x: 11, y: 0.2, z: 5.5 }, rotationY: 0.55, scale: 0.85 },
      zoneId: 'zone_wake',
      blocksNav: true,
      chunkable: true,
    },
    ...[
      [-6, 10, 1.2], [7, 11, 1.0], [-9, -4, 0.9], [9, -5, 1.1], [2, 13, 0.75],
    ].map(([ox, oz, sc], i) => ({
      id: `pf_rock_${i + 1}`,
      kind: 'rock' as const,
      name: `Rock ${i + 1}`,
      transform: {
        position: { x: ox, y: 0.3 * sc, z: oz + O.z },
        scale: sc,
      },
      zoneId: 'zone_wake',
      blocksNav: true,
      chunkable: true,
    })),
    {
      id: 'pf_barrel_wreck',
      kind: 'barrel',
      name: 'Wreck Barrel',
      transform: { position: { x: -2, y: 0.4, z: -7 } },
      zoneId: 'zone_wreck',
      chunkable: true,
    },
    {
      id: 'pf_crate_wreck',
      kind: 'crate',
      name: 'Wreck Crate',
      transform: { position: { x: 3, y: 0.4, z: -9 } },
      zoneId: 'zone_wreck',
      chunkable: true,
    },
    {
      id: 'pf_tent_camp',
      kind: 'tent',
      name: 'Lean-to Tent',
      transform: { position: { x: -8, y: 0.3, z: 12 }, rotationY: 0.5, scale: 1 },
      zoneId: 'zone_camp',
      chunkable: true,
    },
  ],
  paths: [
    {
      id: 'path_scavenger_loop',
      name: 'Scavenger Patrol',
      loop: true,
      color: '#ef4444',
      points: [
        { x: 18, y: 1.2, z: -6 },
        { x: 24, y: 1.2, z: -4 },
        { x: 26, y: 1.2, z: -12 },
        { x: 16, y: 1.2, z: -14 },
      ],
    },
    {
      id: 'path_player_guide',
      name: 'Wake → Camp → Dock',
      loop: false,
      color: '#fbbf24',
      points: [
        { x: O.x, y: 1.2, z: O.z },
        { x: -6, y: 1.2, z: 10 },
        { x: 0, y: 1.2, z: 20 },
        { x: 4, y: 1.2, z: 28 },
      ],
    },
    {
      id: 'path_wake_circle',
      name: 'Wake Gather Ring',
      loop: true,
      color: '#22c55e',
      points: [
        { x: 2, y: 1.2, z: 6 },
        { x: -2, y: 1.2, z: 8 },
        { x: -3, y: 1.2, z: 4 },
        { x: 3, y: 1.2, z: 4 },
      ],
    },
  ],
};

export function findShipwreckEntity(
  scene: ShipwreckSceneDef,
  id: string,
): { kind: ShipwreckEntityKind; data: unknown } | null {
  if (scene.zones.find((z) => z.id === id)) {
    return { kind: 'zone', data: scene.zones.find((z) => z.id === id)! };
  }
  if (scene.nodes.find((n) => n.id === id)) {
    return { kind: 'node', data: scene.nodes.find((n) => n.id === id)! };
  }
  if (scene.npcs.find((n) => n.id === id)) {
    return { kind: 'npc', data: scene.npcs.find((n) => n.id === id)! };
  }
  if (scene.prefabs.find((p) => p.id === id)) {
    return { kind: 'prefab', data: scene.prefabs.find((p) => p.id === id)! };
  }
  if (scene.paths.find((p) => p.id === id)) {
    return { kind: 'path', data: scene.paths.find((p) => p.id === id)! };
  }
  if (id === 'player_spawn') {
    return { kind: 'spawn', data: { id: 'player_spawn', transform: { position: scene.playerSpawn } } };
  }
  return null;
}

export function setEntityXyz(
  scene: ShipwreckSceneDef,
  id: string,
  xyz: Xyz,
): boolean {
  for (const n of scene.nodes) {
    if (n.id === id) {
      n.transform.position = { ...xyz };
      return true;
    }
  }
  for (const n of scene.npcs) {
    if (n.id === id) {
      n.transform.position = { ...xyz };
      return true;
    }
  }
  for (const p of scene.prefabs) {
    if (p.id === id) {
      p.transform.position = { ...xyz };
      return true;
    }
  }
  for (const z of scene.zones) {
    if (z.id === id) {
      z.center = { ...xyz };
      return true;
    }
  }
  if (id === 'player_spawn') {
    scene.playerSpawn = { ...xyz };
    return true;
  }
  return false;
}

/** Prefab catalog for deploy palette */
export const SHIPWRECK_PREFAB_CATALOG: Array<{
  kind: ShipwreckPrefabKind;
  name: string;
  icon: string;
  blocksNav: boolean;
}> = [
  { kind: 'wreck_hull', name: 'Wreck Hull', icon: '🚢', blocksNav: true },
  { kind: 'boat', name: 'Boat', icon: '⛵', blocksNav: true },
  { kind: 'rock', name: 'Rock', icon: '🪨', blocksNav: true },
  { kind: 'stick_prop', name: 'Stick Prop', icon: '🪵', blocksNav: false },
  { kind: 'stone_prop', name: 'Stone Prop', icon: '⬜', blocksNav: false },
  { kind: 'chest', name: 'Chest', icon: '📦', blocksNav: false },
  { kind: 'barrel', name: 'Barrel', icon: '🛢️', blocksNav: false },
  { kind: 'tent', name: 'Tent', icon: '⛺', blocksNav: true },
  { kind: 'campfire', name: 'Campfire', icon: '🔥', blocksNav: false },
  { kind: 'dock_plank', name: 'Dock Plank', icon: '🪵', blocksNav: false },
  { kind: 'crate', name: 'Crate', icon: '📦', blocksNav: false },
  { kind: 'marker', name: 'Marker', icon: '📍', blocksNav: false },
];
