/**
 * Faction Lobby Islands ΓÇö 6 race capitals on the pirate open-world border.
 *
 * Design language (cloned from Haven / Free Port island template):
 *   4 docks ┬╖ 5 buildings ┬╖ 4 tents ┬╖ 2 campfires ┬╖ 1 water hole
 *   rocks / trees / flowers / stones / grass with consistent scale & angles
 *
 * Population (per island):
 *   8 unarmed civilians ┬╖ 8 faction heroes (from 24-hero roster, 4/race)
 *   1 race captain on cavalry mount (Unity capital style)
 *   1 neutral traveler (vendor ┬╖ auction ┬╖ leaderboards ┬╖ teleport network)
 *   1 race blacksmith ┬╖ profession benches ┬╖ catapult/ballista ┬╖ towers
 *   Unity-style starter boat on a dock with quest traveler + respawn waypoint
 *
 * Placement: along borders of Chicken Gun pirate-islands lobby map
 * (offset fractions of lobby.size ΓÇö same convention as LobbyGameplay).
 *
 * SSOT for production: /island-3d?mode=lobby
 */

import { RACE_GRUDGE6 } from '../fleet/character';
import { RACE_VEHICLES, type VehicleRaceId } from '../fleet/vehicles';
import { BARBARIAN_DOCK_MASTER, DOCK_GLB, SHIP_CATALOG } from './shipCatalog';
import { BUILD_PACK_PATHS, SURVIVAL_KIT_NODES, MEDIEVAL_TOWER_NODES } from './buildSystem';
import { FLEET_URLS } from '../fleet/manifest';

const CDN = FLEET_URLS.assets.replace(/\/$/, '');

export const FACTION_LOBBY_ISLANDS_VERSION = '1.0.0';

/** Six playable races (4 heroes each ΓåÆ 24 heroes total in lore roster) */
export type FactionIslandRaceId =
  | 'human'
  | 'barbarian'
  | 'elf'
  | 'dwarf'
  | 'orc'
  | 'undead';

export const FACTION_ISLAND_RACES: FactionIslandRaceId[] = [
  'human',
  'barbarian',
  'elf',
  'dwarf',
  'orc',
  'undead',
];

/** Template counts ΓÇö match reference island (4 docks, 5 buildings, ΓÇª) */
export const FACTION_ISLAND_TEMPLATE = {
  docks: 4,
  buildings: 5,
  tents: 4,
  campfires: 2,
  waterHoles: 1,
  /** Nature scatter (relative counts; angles/sizes seeded) */
  trees: 18,
  rocks: 12,
  stones: 16,
  flowers: 14,
  grassClumps: 28,
  /** Living */
  unarmedCount: 8,
  factionHeroCount: 8,
  captains: 1,
  travelers: 1,
  blacksmiths: 1,
  /** Siege / defense */
  catapults: 1,
  boltThrowers: 1,
  towers: 2,
  /** Profession benches */
  professionBenches: [
    'mining',
    'woodworking',
    'blacksmithing',
    'alchemy',
    'cooking',
    'engineering',
    'inscription',
    'tailoring',
  ] as const,
  /** Island footprint (m) ΓÇö similar to Free Port hub pocket */
  islandRadiusM: 42,
  dockLengthM: 14,
  dockWidthM: 4,
  buildingFootprintM: [8, 6] as [number, number],
  tentScale: 1.0,
  campfireScale: 0.9,
  treeScaleRange: [0.85, 1.35] as [number, number],
  rockScaleRange: [0.6, 1.4] as [number, number],
  /** Dock pier height above water */
  dockDeckY: 0.35,
  waterHoleRadiusM: 3.5,
} as const;

export type FactionIslandPropKind =
  | 'dock'
  | 'building'
  | 'tent'
  | 'campfire'
  | 'water_hole'
  | 'tree'
  | 'rock'
  | 'stone'
  | 'flower'
  | 'grass'
  | 'blacksmith'
  | 'bench'
  | 'tower'
  | 'catapult'
  | 'bolt_thrower'
  | 'boat'
  | 'respawn_waypoint';

export type FactionNpcRole =
  | 'unarmed'
  | 'faction_hero'
  | 'captain_mounted'
  | 'traveler'
  | 'blacksmith'
  | 'quest_traveler'
  | 'guard'
  | 'dock_master';

export interface FactionIslandTransform {
  /** Local island space (m); world = islandOrigin + local */
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface FactionIslandProp {
  id: string;
  kind: FactionIslandPropKind;
  name: string;
  transform: FactionIslandTransform;
  /** CDN / multipack path when known */
  modelPath?: string;
  nodeName?: string;
  /** Profession id for benches */
  professionId?: string;
  interact?: 'board' | 'vendor' | 'craft' | 'use' | 'respawn' | 'auction' | 'teleport' | 'leaderboard';
}

export interface FactionIslandNpc {
  id: string;
  role: FactionNpcRole;
  name: string;
  raceId: FactionIslandRaceId;
  classId?: string;
  /** Lore hero id when role is faction_hero */
  heroId?: string;
  transform: FactionIslandTransform;
  modelPath: string;
  /** Mount GLB under captain */
  mountPath?: string;
  unarmed: boolean;
  dialogueSetId?: string;
  networkServices?: Array<'auction' | 'leaderboards' | 'teleport' | 'vendor'>;
}

export interface FactionIslandDef {
  id: string;
  raceId: FactionIslandRaceId;
  name: string;
  subtitle: string;
  /** Banner / material tint */
  bannerColor: number;
  /** Border placement: fraction of lobby.size from center */
  borderOffset: { ox: number; oz: number };
  /** Island yaw so docks face Free Port center */
  faceCenter: boolean;
  props: FactionIslandProp[];
  npcs: FactionIslandNpc[];
  /** Respawn / boat dock index 0..3 */
  starterDockIndex: number;
  boatShipSize: 'rowboat' | 'sloop';
  notes?: string;
}

// ΓöÇΓöÇ 24 heroes ΓÇö 4 per race (from lore HEROES + race mapping) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface FactionHeroSlot {
  heroId: string;
  name: string;
  title: string;
  raceId: FactionIslandRaceId;
  classId: string;
}

/** Canonical 24: 4 heroes ├ù 6 races for island garrisons */
export const FACTION_HEROES_BY_RACE: Record<FactionIslandRaceId, FactionHeroSlot[]> = {
  human: [
    { heroId: 'aurion', name: 'Aurion', title: 'The Radiant', raceId: 'human', classId: 'mage' },
    { heroId: 'sigurd', name: 'Sigurd', title: 'The Unbreakable', raceId: 'human', classId: 'warrior' },
    { heroId: 'kael', name: 'Kael', title: 'The Shadowblade', raceId: 'human', classId: 'ranger' },
    { heroId: 'theron', name: 'Theron', title: 'Wildkin', raceId: 'human', classId: 'worges' },
  ],
  barbarian: [
    { heroId: 'thrax', name: 'Thrax', title: 'The Savage', raceId: 'barbarian', classId: 'warrior' },
    { heroId: 'grok', name: 'Grok', title: 'Spiritcaller', raceId: 'barbarian', classId: 'shaman' },
    { heroId: 'kira', name: 'Kira', title: 'The Fang', raceId: 'barbarian', classId: 'worges' },
    { heroId: 'vox', name: 'Vox', title: 'Skyhunter', raceId: 'barbarian', classId: 'ranger' },
  ],
  orc: [
    { heroId: 'gruk', name: 'Gruk', title: 'Skullcrusher', raceId: 'orc', classId: 'warrior' },
    { heroId: 'nazgrim', name: 'Nazgrim', title: 'The Profane', raceId: 'orc', classId: 'necromancer' },
    { heroId: 'vexol', name: 'Vexol', title: 'The Silent', raceId: 'orc', classId: 'ranger' },
    { heroId: 'morgash', name: 'Morgash', title: 'The Flamecaller', raceId: 'orc', classId: 'mage' },
  ],
  undead: [
    { heroId: 'silesh', name: 'Silesh', title: 'The Dread', raceId: 'undead', classId: 'mage' },
    { heroId: 'bone', name: 'Bone', title: 'The Collector', raceId: 'undead', classId: 'warrior' },
    { heroId: 'whisper', name: 'Whisper', title: 'The Hollow', raceId: 'undead', classId: 'rogue' },
    { heroId: 'dredge', name: 'Dredge', title: 'The Risen', raceId: 'undead', classId: 'cleric' },
  ],
  elf: [
    { heroId: 'aelindor', name: 'Aelindor', title: 'The Swift', raceId: 'elf', classId: 'warrior' },
    { heroId: 'silvaine', name: 'Silvaine', title: 'Starwhisper', raceId: 'elf', classId: 'mage' },
    { heroId: 'lyra', name: 'Lyra', title: 'The Weaver', raceId: 'elf', classId: 'cleric' },
    { heroId: 'fenwick', name: 'Fenwick', title: 'Shadowleaf', raceId: 'elf', classId: 'rogue' },
  ],
  dwarf: [
    { heroId: 'durgin', name: 'Durgin', title: 'Ironheart', raceId: 'dwarf', classId: 'warrior' },
    { heroId: 'brenna', name: 'Brenna', title: 'The Forgemaster', raceId: 'dwarf', classId: 'warrior' },
    { heroId: 'thordak', name: 'Thordak', title: 'Runekeeper', raceId: 'dwarf', classId: 'mage' },
    { heroId: 'helga', name: 'Helga', title: 'The Mender', raceId: 'dwarf', classId: 'cleric' },
  ],
};

export const RACE_BANNER: Record<FactionIslandRaceId, number> = {
  human: 0xc9a227,
  barbarian: 0xb87333,
  elf: 0x4a9b6e,
  dwarf: 0x6b8cae,
  orc: 0xb84a2a,
  undead: 0x6b5b8c,
};

export const RACE_ISLAND_NAMES: Record<FactionIslandRaceId, { name: string; subtitle: string }> = {
  human: { name: 'Haven Reach Outpost', subtitle: 'Human Faction Island' },
  barbarian: { name: 'Stormfang Isle', subtitle: 'Barbarian Faction Island' },
  elf: { name: 'Starleaf Cay', subtitle: 'Elf Faction Island' },
  dwarf: { name: 'Anvilspire Key', subtitle: 'Dwarf Faction Island' },
  orc: { name: 'Bloodwake Atoll', subtitle: 'Orc Faction Island' },
  undead: { name: 'Gravewake Shoal', subtitle: 'Undead Faction Island' },
};

/**
 * Outer ring positions (ox, oz as fraction of lobby.size).
 * All 6 race faction islands sit on the outside ring around Free Port
 * (clear of hub + the inner pirate islands).
 */
export const FACTION_ISLAND_BORDER_SLOTS: Array<{ ox: number; oz: number }> = [
  { ox: 0.0, oz: -0.48 }, // N
  { ox: 0.42, oz: -0.28 }, // NE
  { ox: 0.48, oz: 0.14 }, // E
  { ox: 0.28, oz: 0.46 }, // SE
  { ox: -0.34, oz: 0.44 }, // SW
  { ox: -0.48, oz: -0.10 }, // W
];

function seeded(n: number): () => number {
  let s = (n * 1103515245 + 12345) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function raceModelPath(raceId: FactionIslandRaceId): string {
  const cfg = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  return cfg.cdnPath.startsWith('http') ? cfg.cdnPath : `${CDN}${cfg.cdnPath}`;
}

function vehicleRace(raceId: FactionIslandRaceId): VehicleRaceId {
  if (raceId in RACE_VEHICLES) return raceId as VehicleRaceId;
  return 'human';
}

function mountPath(raceId: FactionIslandRaceId): string | undefined {
  return RACE_VEHICLES[vehicleRace(raceId)]?.mount?.cdnUrl;
}

function siegePath(raceId: FactionIslandRaceId): { catapult: string; bolt: string } {
  const v = RACE_VEHICLES[vehicleRace(raceId)];
  const humanCat = `${CDN}/models/vehicles/siege/human/catapult.glb`;
  const elfBolt = `${CDN}/models/vehicles/siege/elf/bolt-thrower.glb`;
  if (raceId === 'elf') {
    return {
      bolt: v?.siege?.cdnUrl ?? elfBolt,
      catapult: humanCat,
    };
  }
  return {
    catapult: v?.siege?.cdnUrl ?? humanCat,
    bolt: elfBolt,
  };
}

/**
 * Build template props in local island space (origin at island center).
 * Docks at N/E/S/W ┬╖ buildings in inner ring ┬╖ tents near camp ┬╖ nature outer.
 */
export function buildFactionIslandTemplateProps(
  raceId: FactionIslandRaceId,
  seedNum: number,
): FactionIslandProp[] {
  const T = FACTION_ISLAND_TEMPLATE;
  const rnd = seeded(seedNum);
  const props: FactionIslandProp[] = [];
  const R = T.islandRadiusM;

  // 4 docks ΓÇö cardinal
  const dockDirs: Array<{ x: number; z: number; rot: number; name: string }> = [
    { x: 0, z: -R * 0.92, rot: 0, name: 'North Dock' },
    { x: R * 0.92, z: 0, rot: -Math.PI / 2, name: 'East Dock' },
    { x: 0, z: R * 0.92, rot: Math.PI, name: 'South Dock' },
    { x: -R * 0.92, z: 0, rot: Math.PI / 2, name: 'West Dock' },
  ];
  dockDirs.forEach((d, i) => {
    props.push({
      id: `${raceId}_dock_${i}`,
      kind: 'dock',
      name: d.name,
      transform: {
        position: [d.x, T.dockDeckY, d.z],
        rotationY: d.rot,
        scale: 1,
      },
      modelPath: DOCK_GLB,
      interact: 'board',
    });
  });

  // 5 buildings ΓÇö inner ring
  for (let i = 0; i < T.buildings; i++) {
    const ang = (i / T.buildings) * Math.PI * 2 + 0.3;
    const dist = R * 0.28;
    props.push({
      id: `${raceId}_building_${i}`,
      kind: 'building',
      name: i === 0 ? `${RACE_ISLAND_NAMES[raceId].name} Hall` : `Hall Annex ${i}`,
      transform: {
        position: [Math.cos(ang) * dist, 0.2, Math.sin(ang) * dist],
        rotationY: ang + Math.PI,
        scale: 1,
      },
      modelPath: `${CDN}/models/buildings/village/house.glb`,
    });
  }

  // Blacksmith (near east dock)
  props.push({
    id: `${raceId}_blacksmith_forge`,
    kind: 'blacksmith',
    name: `${RACE_GRUDGE6[raceId]?.label ?? raceId} Blacksmith`,
    transform: {
      position: [R * 0.45, 0.15, R * 0.12],
      rotationY: -Math.PI / 2,
      scale: 1,
    },
    modelPath: BUILD_PACK_PATHS.survivalKit,
    nodeName: SURVIVAL_KIT_NODES.workbenchAnvil ?? 'workbenchAnvil',
    interact: 'craft',
  });

  // 4 tents
  for (let i = 0; i < T.tents; i++) {
    const ang = (i / T.tents) * Math.PI * 2 + 0.8;
    const dist = R * 0.48;
    props.push({
      id: `${raceId}_tent_${i}`,
      kind: 'tent',
      name: `Camp Tent ${i + 1}`,
      transform: {
        position: [Math.cos(ang) * dist, 0.1, Math.sin(ang) * dist],
        rotationY: ang,
        scale: T.tentScale,
      },
      modelPath: BUILD_PACK_PATHS.survivalKit,
      nodeName: SURVIVAL_KIT_NODES.tent,
    });
  }

  // 2 campfires
  props.push({
    id: `${raceId}_campfire_0`,
    kind: 'campfire',
    name: 'Main Campfire',
    transform: { position: [4, 0.1, 3], rotationY: 0, scale: T.campfireScale },
    modelPath: BUILD_PACK_PATHS.survivalKit,
    nodeName: SURVIVAL_KIT_NODES.campfire,
    interact: 'use',
  });
  props.push({
    id: `${raceId}_campfire_1`,
    kind: 'campfire',
    name: 'Shore Campfire',
    transform: { position: [-6, 0.1, 8], rotationY: 0.4, scale: T.campfireScale },
    modelPath: BUILD_PACK_PATHS.survivalKit,
    nodeName: SURVIVAL_KIT_NODES.campfire,
    interact: 'use',
  });

  // Water hole
  props.push({
    id: `${raceId}_water_hole`,
    kind: 'water_hole',
    name: 'Fresh Water Hole',
    transform: { position: [-3, 0.05, -5], rotationY: 0, scale: T.waterHoleRadiusM },
    interact: 'use',
  });

  // Profession benches ring ΓÇö map to survival kit nodes when possible
  const benchNode: Record<string, string> = {
    blacksmithing: SURVIVAL_KIT_NODES.workbenchAnvil,
    mining: SURVIVAL_KIT_NODES.workbenchGrind,
    woodworking: SURVIVAL_KIT_NODES.workbench,
    alchemy: SURVIVAL_KIT_NODES.workbench,
    cooking: SURVIVAL_KIT_NODES.campfire,
    engineering: SURVIVAL_KIT_NODES.workbenchAnvil,
    inscription: SURVIVAL_KIT_NODES.workbench,
    tailoring: SURVIVAL_KIT_NODES.workbench,
  };
  T.professionBenches.forEach((prof, i) => {
    const ang = (i / T.professionBenches.length) * Math.PI * 2;
    const dist = R * 0.38;
    props.push({
      id: `${raceId}_bench_${prof}`,
      kind: 'bench',
      name: `${prof} Bench`,
      transform: {
        position: [Math.cos(ang) * dist, 0.15, Math.sin(ang) * dist],
        rotationY: ang + Math.PI,
        scale: 1,
      },
      modelPath: BUILD_PACK_PATHS.survivalKit,
      nodeName: benchNode[prof] ?? SURVIVAL_KIT_NODES.workbench,
      professionId: prof,
      interact: 'craft',
    });
  });

  // Towers
  for (let i = 0; i < T.towers; i++) {
    const ang = Math.PI * 0.25 + i * Math.PI;
    props.push({
      id: `${raceId}_tower_${i}`,
      kind: 'tower',
      name: `Watch Tower ${i + 1}`,
      transform: {
        position: [Math.cos(ang) * R * 0.72, 0.2, Math.sin(ang) * R * 0.72],
        rotationY: ang,
        scale: 1,
      },
      modelPath: BUILD_PACK_PATHS.medievalTowers,
      nodeName: i === 0 ? MEDIEVAL_TOWER_NODES.towerA : MEDIEVAL_TOWER_NODES.towerB,
    });
  }

  // Siege ΓÇö every island gets catapult + bolt thrower (race vehicle CDN + Unity ports)
  const siege = siegePath(raceId);
  props.push({
    id: `${raceId}_catapult`,
    kind: 'catapult',
    name: 'Faction Catapult',
    transform: { position: [12, 0.2, -10], rotationY: 0.8, scale: 1 },
    modelPath: siege.catapult,
  });
  props.push({
    id: `${raceId}_bolt_thrower`,
    kind: 'bolt_thrower',
    name: 'Bolt Thrower',
    transform: { position: [-12, 0.2, -8], rotationY: -0.6, scale: 1 },
    modelPath: siege.bolt,
  });

  // Nature scatter ΓÇö seeded angles & scales (match Haven nature language)
  for (let i = 0; i < T.trees; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = R * (0.55 + rnd() * 0.35);
    const sc = T.treeScaleRange[0] + rnd() * (T.treeScaleRange[1] - T.treeScaleRange[0]);
    props.push({
      id: `${raceId}_tree_${i}`,
      kind: 'tree',
      name: 'Tree',
      transform: {
        position: [Math.cos(ang) * dist, 0, Math.sin(ang) * dist],
        rotationY: rnd() * Math.PI * 2,
        scale: sc,
      },
    });
  }
  for (let i = 0; i < T.rocks; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = R * (0.5 + rnd() * 0.4);
    const sc = T.rockScaleRange[0] + rnd() * (T.rockScaleRange[1] - T.rockScaleRange[0]);
    props.push({
      id: `${raceId}_rock_${i}`,
      kind: 'rock',
      name: 'Rock',
      transform: {
        position: [Math.cos(ang) * dist, 0.1 * sc, Math.sin(ang) * dist],
        rotationY: rnd() * Math.PI * 2,
        scale: sc,
      },
    });
  }
  for (let i = 0; i < T.stones; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = R * (0.2 + rnd() * 0.5);
    props.push({
      id: `${raceId}_stone_${i}`,
      kind: 'stone',
      name: 'Stone',
      transform: {
        position: [Math.cos(ang) * dist, 0.08, Math.sin(ang) * dist],
        rotationY: rnd() * Math.PI * 2,
        scale: 0.4 + rnd() * 0.5,
      },
    });
  }
  for (let i = 0; i < T.flowers; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = R * (0.15 + rnd() * 0.45);
    props.push({
      id: `${raceId}_flower_${i}`,
      kind: 'flower',
      name: 'Flower',
      transform: {
        position: [Math.cos(ang) * dist, 0.05, Math.sin(ang) * dist],
        rotationY: rnd() * Math.PI * 2,
        scale: 0.7 + rnd() * 0.5,
      },
    });
  }
  for (let i = 0; i < T.grassClumps; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = rnd() * R * 0.85;
    props.push({
      id: `${raceId}_grass_${i}`,
      kind: 'grass',
      name: 'Grass',
      transform: {
        position: [Math.cos(ang) * dist, 0.02, Math.sin(ang) * dist],
        rotationY: rnd() * Math.PI * 2,
        scale: 0.8 + rnd() * 0.6,
      },
    });
  }

  // Starter boat on south dock + respawn waypoint
  const boat = SHIP_CATALOG.find((s) => s.size === 'sloop') ?? SHIP_CATALOG[0];
  props.push({
    id: `${raceId}_starter_boat`,
    kind: 'boat',
    name: `${RACE_GRUDGE6[raceId]?.label} Starter ${boat.label}`,
    transform: {
      position: [0, T.dockDeckY + 0.3, R * 0.92 + 6],
      rotationY: Math.PI,
      scale: 1,
    },
    modelPath: boat.glbModel.startsWith('http') ? boat.glbModel : `${CDN}${boat.glbModel}`,
    interact: 'board',
  });
  props.push({
    id: `${raceId}_respawn_waypoint`,
    kind: 'respawn_waypoint',
    name: 'Dock Respawn Waypoint',
    transform: {
      position: [0, T.dockDeckY + 0.5, R * 0.85],
      rotationY: 0,
      scale: 1,
    },
    interact: 'respawn',
  });

  return props;
}

export function buildFactionIslandNpcs(raceId: FactionIslandRaceId): FactionIslandNpc[] {
  const T = FACTION_ISLAND_TEMPLATE;
  const R = T.islandRadiusM;
  const model = raceModelPath(raceId);
  const heroes = FACTION_HEROES_BY_RACE[raceId];
  const npcs: FactionIslandNpc[] = [];
  const label = RACE_GRUDGE6[raceId]?.label ?? raceId;

  // Captain on mount (Unity capital style)
  npcs.push({
    id: `${raceId}_captain_mounted`,
    role: 'captain_mounted',
    name: `${label} Captain`,
    raceId,
    classId: 'warrior',
    transform: { position: [0, 0.2, -R * 0.15], rotationY: 0, scale: 1 },
    modelPath: model,
    mountPath: mountPath(raceId),
    unarmed: false,
    dialogueSetId: 'end_game_captain',
  });

  // 8 unarmed civilians
  for (let i = 0; i < T.unarmedCount; i++) {
    const ang = (i / T.unarmedCount) * Math.PI * 2;
    const dist = R * 0.22;
    npcs.push({
      id: `${raceId}_unarmed_${i}`,
      role: 'unarmed',
      name: `${label} Civilian ${i + 1}`,
      raceId,
      transform: {
        position: [Math.cos(ang) * dist, 0.15, Math.sin(ang) * dist],
        rotationY: ang + Math.PI,
        scale: 1,
      },
      modelPath: model,
      unarmed: true,
      dialogueSetId: 'civilian_ambient',
    });
  }

  // 8 faction heroes ΓÇö duplicate roster x2 for garrison density (4 unique ├ù 2 posts)
  for (let i = 0; i < T.factionHeroCount; i++) {
    const h = heroes[i % heroes.length];
    const ang = (i / T.factionHeroCount) * Math.PI * 2 + 0.4;
    const dist = R * 0.42;
    npcs.push({
      id: `${raceId}_hero_${i}_${h.heroId}`,
      role: 'faction_hero',
      name: `${h.name} ${h.title}`,
      raceId,
      classId: h.classId,
      heroId: h.heroId,
      transform: {
        position: [Math.cos(ang) * dist, 0.15, Math.sin(ang) * dist],
        rotationY: ang + Math.PI,
        scale: 1,
      },
      modelPath: model,
      unarmed: false,
      dialogueSetId: 'faction_hero',
    });
  }

  // Neutral traveler ΓÇö auction / leaderboards / teleport / vendor
  npcs.push({
    id: `${raceId}_traveler_network`,
    role: 'traveler',
    name: 'Network Traveler',
    raceId: 'human',
    transform: { position: [6, 0.15, 0], rotationY: -Math.PI / 2, scale: 1 },
    modelPath: raceModelPath('human'),
    unarmed: true,
    dialogueSetId: 'traveler_network',
    networkServices: ['auction', 'leaderboards', 'teleport', 'vendor'],
  });

  // Blacksmith NPC
  npcs.push({
    id: `${raceId}_blacksmith_npc`,
    role: 'blacksmith',
    name: `${label} Blacksmith`,
    raceId,
    transform: { position: [R * 0.42, 0.15, R * 0.12], rotationY: -Math.PI / 2, scale: 1 },
    modelPath: model,
    unarmed: false,
    dialogueSetId: 'blacksmith',
  });

  // Quest traveler on starter boat / dock
  npcs.push({
    id: `${raceId}_quest_traveler_boat`,
    role: 'quest_traveler',
    name: 'Dock Quest Traveler',
    raceId: 'human',
    transform: {
      position: [1.5, T.dockDeckY + 0.2, R * 0.9],
      rotationY: Math.PI,
      scale: 1,
    },
    modelPath: raceModelPath('human'),
    unarmed: true,
    dialogueSetId: 'starter_quest_boat',
    networkServices: ['vendor'],
  });

  if (raceId === 'barbarian') {
    npcs.push({
      id: BARBARIAN_DOCK_MASTER.npcId,
      role: 'dock_master',
      name: BARBARIAN_DOCK_MASTER.name,
      raceId: 'barbarian',
      classId: 'warrior',
      transform: {
        position: [-2.2, T.dockDeckY + 0.2, R * 0.88],
        rotationY: Math.PI,
        scale: 1,
      },
      modelPath: model,
      unarmed: false,
      dialogueSetId: BARBARIAN_DOCK_MASTER.dialogueSetId,
      networkServices: ['vendor'],
    });
  }

  return npcs;
}

/** Build all 6 faction islands */
export function buildAllFactionLobbyIslands(): FactionIslandDef[] {
  return FACTION_ISLAND_RACES.map((raceId, index) => {
    const meta = RACE_ISLAND_NAMES[raceId];
    const slot = FACTION_ISLAND_BORDER_SLOTS[index];
    return {
      id: `faction_island_${raceId}`,
      raceId,
      name: meta.name,
      subtitle: meta.subtitle,
      bannerColor: RACE_BANNER[raceId],
      borderOffset: slot,
      faceCenter: true,
      props: buildFactionIslandTemplateProps(raceId, 1000 + index * 97),
      npcs: buildFactionIslandNpcs(raceId),
      starterDockIndex: 2, // south
      boatShipSize: 'sloop',
      notes:
        'Generated like Haven Port density (4 docks, 5 buildings, 4 tents, 2 fires, water hole). ' +
        'Captain mounted · traveler network · blacksmith · profession benches · siege · Unity boat + respawn. Barbarian isle: Dock Master sells Long Row Boat recipe.',
    };
  });
}

export const FACTION_LOBBY_ISLANDS: FactionIslandDef[] = buildAllFactionLobbyIslands();

export function getFactionIsland(raceId: string): FactionIslandDef | undefined {
  return FACTION_LOBBY_ISLANDS.find((i) => i.raceId === raceId);
}

/** World origin for an island given lobby center/size */
export function factionIslandWorldOrigin(
  island: FactionIslandDef,
  center: { x: number; z: number },
  size: { x: number; z: number },
): { x: number; z: number } {
  return {
    x: center.x + island.borderOffset.ox * size.x,
    z: center.z + island.borderOffset.oz * size.z,
  };
}

export const FACTION_ISLAND_RACE_IDS: FactionIslandRaceId[] = ["human", "barbarian", "elf", "dwarf", "orc", "undead"];

