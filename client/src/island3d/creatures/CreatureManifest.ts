/**
 * CreatureManifest — registry of all spawnable animals and fish.
 *
 * Models live on R2 CDN at assets.grudge-studio.com/models/creatures/
 * Each species defines its model path, animation clip names, AI behavior
 * params, loot table, and spawn rules.
 *
 * Upload mapping (for scripts/upload-glb-to-r2.ps1):
 *   Land animals → models/creatures/land/{name}.glb
 *   Fish         → models/creatures/fish/{name}.glb
 *   Predators    → models/creatures/predator/{name}.glb
 */

import { ASSET_CDN_BASE } from '@/lib/assetConfig';

const CDN = ASSET_CDN_BASE;

// ── Types ────────────────────────────────────────────────────────────────────

export type CreatureCategory = 'land' | 'fish' | 'predator' | 'bird';
export type CreatureAI = 'passive' | 'neutral' | 'aggressive' | 'fish';

export interface CreatureAnimMap {
  idle: string;
  walk?: string;
  run?: string;
  attack?: string;
  eat?: string;
  death: string;
  /** Fish-specific */
  swim?: string;
  swimFast?: string;
  outOfWater?: string;
  /** Extra */
  hitReact?: string;
  jump?: string;
}

export interface LootEntry {
  itemId: string;
  name: string;
  quantity: [number, number]; // [min, max]
  chance: number; // 0-1
}

export interface CreatureDef {
  id: string;
  name: string;
  category: CreatureCategory;
  /** CDN path to GLB (relative to ASSET_CDN_BASE) */
  modelPath: string;
  scale: number;
  /** Clip name → animation state mapping */
  anims: CreatureAnimMap;
  /** AI behavior type */
  ai: CreatureAI;
  /** Stats */
  hp: number;
  damage: number;
  moveSpeed: number;
  /** How close a player can get before the creature reacts */
  alertRadius: number;
  /** For aggressive: attack range */
  attackRange: number;
  /** Respawn time in seconds after death */
  respawnTime: number;
  /** Loot dropped on death */
  loot: LootEntry[];
  /** Spawn config */
  spawnWeight: number; // relative probability
  /** For fish: depth range [min, max] below water surface */
  swimDepth?: [number, number];
}

// ── Land Animals ─────────────────────────────────────────────────────────────

export const CREATURE_MANIFEST: Record<string, CreatureDef> = {
  wolf: {
    id: 'wolf',
    name: 'Grey Wolf',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/wolf.glb`,
    scale: 1.0,
    anims: {
      idle: 'Idle_2_HeadLow',
      walk: 'Walk',
      run: 'Gallop',
      attack: 'Attack',
      eat: 'Eating',
      death: 'Death',
      hitReact: 'Idle_HitReact_Left',
      jump: 'Gallop_Jump',
    },
    ai: 'aggressive',
    hp: 60,
    damage: 12,
    moveSpeed: 18,
    alertRadius: 20,
    attackRange: 3,
    respawnTime: 120,
    loot: [
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [1, 3], chance: 1.0 },
      { itemId: 'wolf_pelt', name: 'Wolf Pelt', quantity: [1, 1], chance: 0.8 },
      { itemId: 'fang', name: 'Wolf Fang', quantity: [0, 2], chance: 0.4 },
    ],
    spawnWeight: 3,
  },

  buffalo: {
    id: 'buffalo',
    name: 'Plains Buffalo',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/buffalo.glb`,
    scale: 1.2,
    anims: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: 'Attack',
      eat: 'Eating',
      death: 'Death',
    },
    ai: 'neutral', // attacks if provoked
    hp: 120,
    damage: 20,
    moveSpeed: 14,
    alertRadius: 12,
    attackRange: 4,
    respawnTime: 180,
    loot: [
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [3, 6], chance: 1.0 },
      { itemId: 'thick_hide', name: 'Thick Hide', quantity: [1, 2], chance: 0.9 },
      { itemId: 'horn', name: 'Buffalo Horn', quantity: [0, 2], chance: 0.5 },
    ],
    spawnWeight: 2,
  },

  deer: {
    id: 'deer',
    name: 'Forest Deer',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/deer.glb`,
    scale: 1.0,
    anims: {
      idle: 'Take 001',
      walk: 'Take 001', // only has 1 anim — idle doubles as walk
      death: 'Take 001', // will just collapse
    },
    ai: 'passive', // flees from player
    hp: 40,
    damage: 0,
    moveSpeed: 22,
    alertRadius: 25,
    attackRange: 0,
    respawnTime: 90,
    loot: [
      { itemId: 'raw_meat', name: 'Venison', quantity: [2, 4], chance: 1.0 },
      { itemId: 'deer_hide', name: 'Deer Hide', quantity: [1, 1], chance: 0.9 },
      { itemId: 'antler', name: 'Antler', quantity: [0, 2], chance: 0.3 },
    ],
    spawnWeight: 5,
  },

  crab: {
    id: 'crab',
    name: 'Shore Crab',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/crab.glb`,
    scale: 0.6,
    anims: {
      idle: 'Walk_Anim', // uses walk as idle (crabs always shuffle)
      walk: 'Walk_Anim',
      death: 'Walk_Anim',
    },
    ai: 'neutral',
    hp: 20,
    damage: 5,
    moveSpeed: 6,
    alertRadius: 8,
    attackRange: 2,
    respawnTime: 60,
    loot: [
      { itemId: 'crab_meat', name: 'Crab Meat', quantity: [1, 2], chance: 1.0 },
      { itemId: 'crab_shell', name: 'Crab Shell', quantity: [1, 1], chance: 0.5 },
    ],
    spawnWeight: 4,
  },

  hawk: {
    id: 'hawk',
    name: 'Island Hawk',
    category: 'bird',
    modelPath: `${CDN}/models/creatures/land/hawk.glb`,
    scale: 0.8,
    anims: {
      idle: 'metarig|Fly',
      walk: 'metarig|Fly',
      death: 'metarig|Fly',
    },
    ai: 'passive',
    hp: 15,
    damage: 0,
    moveSpeed: 30,
    alertRadius: 40,
    attackRange: 0,
    respawnTime: 60,
    loot: [
      { itemId: 'feather', name: 'Hawk Feather', quantity: [1, 3], chance: 1.0 },
    ],
    spawnWeight: 2,
  },

  // ── Fish (all share same 6-joint rig, same animation names) ───────────────

  anglerfish: {
    id: 'anglerfish',
    name: 'Anglerfish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/anglerfish.glb`,
    scale: 0.8,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 10,
    damage: 3,
    moveSpeed: 8,
    alertRadius: 10,
    attackRange: 0,
    respawnTime: 45,
    loot: [
      { itemId: 'raw_fish', name: 'Raw Fish', quantity: [1, 1], chance: 1.0 },
    ],
    spawnWeight: 3,
    swimDepth: [2, 8],
  },

  lionfish: {
    id: 'lionfish',
    name: 'Black Lion Fish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/lionfish.glb`,
    scale: 0.7,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 8,
    damage: 5,
    moveSpeed: 10,
    alertRadius: 8,
    attackRange: 0,
    respawnTime: 45,
    loot: [
      { itemId: 'raw_fish', name: 'Lion Fish', quantity: [1, 1], chance: 1.0 },
      { itemId: 'fish_venom', name: 'Fish Venom', quantity: [1, 1], chance: 0.3 },
    ],
    spawnWeight: 2,
    swimDepth: [1, 6],
  },

  goldfish: {
    id: 'goldfish',
    name: 'Blue Goldfish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/goldfish.glb`,
    scale: 0.5,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 5,
    damage: 0,
    moveSpeed: 12,
    alertRadius: 15,
    attackRange: 0,
    respawnTime: 30,
    loot: [
      { itemId: 'raw_fish', name: 'Goldfish', quantity: [1, 1], chance: 1.0 },
    ],
    spawnWeight: 5,
    swimDepth: [1, 4],
  },

  blobfish: {
    id: 'blobfish',
    name: 'Blobfish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/blobfish.glb`,
    scale: 0.6,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 6,
    damage: 0,
    moveSpeed: 5,
    alertRadius: 6,
    attackRange: 0,
    respawnTime: 30,
    loot: [
      { itemId: 'raw_fish', name: 'Blobfish', quantity: [1, 1], chance: 1.0 },
      { itemId: 'blob_oil', name: 'Blob Oil', quantity: [1, 1], chance: 0.2 },
    ],
    spawnWeight: 3,
    swimDepth: [4, 12],
  },

  catfish: {
    id: 'catfish',
    name: 'Armored Catfish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/catfish.glb`,
    scale: 0.7,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 12,
    damage: 0,
    moveSpeed: 7,
    alertRadius: 8,
    attackRange: 0,
    respawnTime: 50,
    loot: [
      { itemId: 'raw_fish', name: 'Catfish', quantity: [1, 1], chance: 1.0 },
      { itemId: 'fish_scale', name: 'Armored Scale', quantity: [1, 2], chance: 0.4 },
    ],
    spawnWeight: 3,
    swimDepth: [3, 10],
  },

  butterflyfish: {
    id: 'butterflyfish',
    name: 'Butterfly Fish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/butterflyfish.glb`,
    scale: 0.5,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 4,
    damage: 0,
    moveSpeed: 14,
    alertRadius: 18,
    attackRange: 0,
    respawnTime: 25,
    loot: [
      { itemId: 'raw_fish', name: 'Butterfly Fish', quantity: [1, 1], chance: 1.0 },
    ],
    spawnWeight: 5,
    swimDepth: [1, 5],
  },

  flatfish: {
    id: 'flatfish',
    name: 'Flatfish',
    category: 'fish',
    modelPath: `${CDN}/models/creatures/fish/flatfish.glb`,
    scale: 0.6,
    anims: {
      idle: 'Swimming_Normal',
      swim: 'Swimming_Normal',
      swimFast: 'Swimming_Fast',
      attack: 'Attack',
      death: 'Death',
      outOfWater: 'Out_Of_Water',
    },
    ai: 'fish',
    hp: 6,
    damage: 0,
    moveSpeed: 6,
    alertRadius: 8,
    attackRange: 0,
    respawnTime: 35,
    loot: [
      { itemId: 'raw_fish', name: 'Flatfish', quantity: [1, 1], chance: 1.0 },
    ],
    spawnWeight: 4,
    swimDepth: [5, 15],
  },

  // ── Water Predators ───────────────────────────────────────────────────────

  shark: {
    id: 'shark',
    name: 'Reef Shark',
    category: 'predator',
    modelPath: `${CDN}/models/creatures/predator/shark.glb`,
    scale: 1.5,
    anims: {
      idle: 'SharkArmature|SharkArmature|SharkArmature|Swim|SharkArmature|Swim',
      swim: 'SharkArmature|SharkArmature|SharkArmature|Swim|SharkArmature|Swim',
      swimFast: 'SharkArmature|SharkArmature|SharkArmature|Swim_Fast|SharkArmature|Swim_Fast',
      attack: 'SharkArmature|SharkArmature|SharkArmature|Swim_Bite|SharkArmature|Swim_Bite',
      death: 'SharkArmature|SharkArmature|SharkArmature|Swim|SharkArmature|Swim',
    },
    ai: 'aggressive',
    hp: 150,
    damage: 30,
    moveSpeed: 20,
    alertRadius: 30,
    attackRange: 5,
    respawnTime: 300,
    loot: [
      { itemId: 'shark_meat', name: 'Shark Meat', quantity: [3, 5], chance: 1.0 },
      { itemId: 'shark_tooth', name: 'Shark Tooth', quantity: [1, 3], chance: 0.6 },
      { itemId: 'shark_fin', name: 'Shark Fin', quantity: [1, 1], chance: 0.3 },
    ],
    spawnWeight: 1,
    swimDepth: [3, 20],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getLandCreatures(): CreatureDef[] {
  return Object.values(CREATURE_MANIFEST).filter(c => c.category === 'land' || c.category === 'bird');
}

export function getFishCreatures(): CreatureDef[] {
  return Object.values(CREATURE_MANIFEST).filter(c => c.category === 'fish');
}

export function getWaterPredators(): CreatureDef[] {
  return Object.values(CREATURE_MANIFEST).filter(c => c.category === 'predator');
}

/** Weighted random pick from a list of creatures */
export function pickWeightedCreature(pool: CreatureDef[], rand: () => number): CreatureDef {
  const totalWeight = pool.reduce((sum, c) => sum + c.spawnWeight, 0);
  let roll = rand() * totalWeight;
  for (const c of pool) {
    roll -= c.spawnWeight;
    if (roll <= 0) return c;
  }
  return pool[pool.length - 1];
}

/** Roll loot from a creature's loot table */
export function rollLoot(def: CreatureDef, rand: () => number): Array<{ itemId: string; name: string; quantity: number }> {
  const drops: Array<{ itemId: string; name: string; quantity: number }> = [];
  for (const entry of def.loot) {
    if (rand() <= entry.chance) {
      const qty = entry.quantity[0] + Math.floor(rand() * (entry.quantity[1] - entry.quantity[0] + 1));
      if (qty > 0) drops.push({ itemId: entry.itemId, name: entry.name, quantity: qty });
    }
  }
  return drops;
}
