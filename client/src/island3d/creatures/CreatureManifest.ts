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

/** Relative keys only — load via assetUrl() / loadAssetGltf (one R2 path). */
const CDN = '';

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
  /** Auto-resolve COTW clip names when explicit anims miss */
  cotwAnim?: boolean;
  /** AI behavior type */
  ai: CreatureAI;
  /** Stats */
  hp: number;
  damage: number;
  moveSpeed: number;
  /** How close a player can get before the creature reacts */
  alertRadius: number;
  /** For aggressive/neutral: attack range */
  attackRange: number;
  /** Wind-up before damage (seconds). Default 0.35 melee floor. */
  telegraphSec?: number;
  /** 0-1 chance neutral wildlife attacks on sight (else alert/roam) */
  aggroChance?: number;
  /** Player can hunt / harvest this species */
  huntable?: boolean;
  /** Trophy value for hunt UI */
  huntValue?: number;
  /** Roam radius from spawn anchor (meters) */
  roamRadius?: number;
  /** Respawn time in seconds after death */
  respawnTime: number;
  /** Loot dropped on death */
  loot: LootEntry[];
  /** Spawn config */
  spawnWeight: number; // relative probability
  /** For fish: depth range [min, max] below water surface */
  swimDepth?: [number, number];
}

const COTW = `${CDN}/models/creatures/land/cotw`;

// ── Land Animals ─────────────────────────────────────────────────────────────

export const CREATURE_MANIFEST: Record<string, CreatureDef> = {
  /**
   * Belerick — Guard of Nature (aggressive land elite / dungeon).
   * Local: public/models/creatures/land/belerick_guard_of_nature.glb
   * Clips: fight_idle, run, attack1–3, skill1–3, dead, taunt
   * category=land so island dry-land spawn pool includes him (not water predators).
   */
  belerick: {
    id: 'belerick',
    name: 'Belerick',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/belerick_guard_of_nature.glb`,
    scale: 1.1,
    anims: {
      idle: 'belerick_guard_of_nature_in_game_fight_idle',
      walk: 'belerick_guard_of_nature_in_game_run',
      run: 'belerick_guard_of_nature_in_game_run2',
      attack: 'belerick_guard_of_nature_in_game_attack1',
      death: 'belerick_guard_of_nature_in_game_dead',
      hitReact: 'belerick_guard_of_nature_in_game_taunt01',
    },
    ai: 'aggressive',
    hp: 220,
    damage: 28,
    moveSpeed: 14,
    alertRadius: 22,
    attackRange: 3.2,
    aggroChance: 1,
    huntable: true,
    huntValue: 40,
    roamRadius: 28,
    respawnTime: 180,
    loot: [
      { itemId: 'nature_bark', name: 'Nature Bark', quantity: [1, 3], chance: 1.0 },
      { itemId: 'living_wood', name: 'Living Wood', quantity: [1, 2], chance: 0.7 },
      { itemId: 'guardian_seed', name: 'Guardian Seed', quantity: [0, 1], chance: 0.35 },
    ],
    spawnWeight: 1,
  },

  /**
   * Helcurt — Shadowbringer (aggressive land assassin elite).
   * Local: public/models/creatures/land/helcurt_shadowbringer.glb
   * Clips: fight_idle, run/fastrun, attack1–3, skill1–3, dead, landing, recall
   */
  helcurt: {
    id: 'helcurt',
    name: 'Helcurt',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/helcurt_shadowbringer.glb`,
    scale: 1.05,
    anims: {
      idle: 'helcurt_shadowbringer_in_game_fight_idle',
      walk: 'helcurt_shadowbringer_in_game_run',
      run: 'helcurt_shadowbringer_in_game_fastrun',
      attack: 'helcurt_shadowbringer_in_game_attack1',
      death: 'helcurt_shadowbringer_in_game_dead',
      hitReact: 'helcurt_shadowbringer_in_game_verigo',
      jump: 'helcurt_shadowbringer_in_game_landing',
    },
    ai: 'aggressive',
    hp: 165,
    damage: 32,
    moveSpeed: 20,
    alertRadius: 26,
    attackRange: 2.8,
    aggroChance: 1,
    huntable: true,
    huntValue: 45,
    roamRadius: 32,
    respawnTime: 200,
    loot: [
      { itemId: 'shadow_essence', name: 'Shadow Essence', quantity: [1, 2], chance: 1.0 },
      { itemId: 'void_shard', name: 'Void Shard', quantity: [0, 2], chance: 0.55 },
      { itemId: 'assassin_claw', name: 'Assassin Claw', quantity: [1, 1], chance: 0.4 },
    ],
    spawnWeight: 1,
  },

  /**
   * Fire Beetle — aggressive land insect (warlords island / dungeon wildlife).
   * Local: public/models/creatures/land/fire_beetle.glb
   * Clips: fight_idle, run, attack1–2, dead
   */
  fire_beetle: {
    id: 'fire_beetle',
    name: 'Fire Beetle',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/fire_beetle.glb`,
    scale: 0.85,
    anims: {
      idle: 'fire_beetle_fight_idle',
      walk: 'fire_beetle_run',
      run: 'fire_beetle_run',
      attack: 'fire_beetle_attack1',
      death: 'fire_beetle_dead',
      hitReact: 'fire_beetle_attack2',
    },
    ai: 'aggressive',
    hp: 55,
    damage: 14,
    moveSpeed: 12,
    alertRadius: 16,
    attackRange: 2.2,
    aggroChance: 0.85,
    huntable: true,
    huntValue: 12,
    roamRadius: 22,
    respawnTime: 90,
    loot: [
      { itemId: 'chitin_shell', name: 'Chitin Shell', quantity: [1, 2], chance: 1.0 },
      { itemId: 'ember_core', name: 'Ember Core', quantity: [0, 1], chance: 0.45 },
      { itemId: 'fire_ichor', name: 'Fire Ichor', quantity: [1, 2], chance: 0.6 },
    ],
    spawnWeight: 4,
  },

  /**
   * Ember Beetle — second fire-beetle pack (fire_beetle (1).glb), slightly hotter stats.
   * Local: public/models/creatures/land/fire_beetle_ember.glb
   */
  fire_beetle_ember: {
    id: 'fire_beetle_ember',
    name: 'Ember Beetle',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/fire_beetle_ember.glb`,
    scale: 0.9,
    anims: {
      idle: 'fire_beetle_fight_idle',
      walk: 'fire_beetle_run',
      run: 'fire_beetle_run',
      attack: 'fire_beetle_attack2',
      death: 'fire_beetle_dead',
      hitReact: 'fire_beetle_attack1',
    },
    ai: 'aggressive',
    hp: 70,
    damage: 18,
    moveSpeed: 13,
    alertRadius: 18,
    attackRange: 2.3,
    aggroChance: 0.95,
    huntable: true,
    huntValue: 16,
    roamRadius: 24,
    respawnTime: 110,
    loot: [
      { itemId: 'chitin_shell', name: 'Chitin Shell', quantity: [1, 3], chance: 1.0 },
      { itemId: 'ember_core', name: 'Ember Core', quantity: [1, 1], chance: 0.7 },
      { itemId: 'molten_carapace', name: 'Molten Carapace', quantity: [0, 1], chance: 0.3 },
    ],
    spawnWeight: 2,
  },

  /**
   * Horned Lizard — aggressive land reptile.
   * Local: public/models/creatures/land/horned_lizard.glb
   * Clips: fight_idle, run, attack1–2, dead
   */
  horned_lizard: {
    id: 'horned_lizard',
    name: 'Horned Lizard',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/horned_lizard.glb`,
    scale: 1.0,
    anims: {
      idle: 'horned_lizard_fight_idle',
      walk: 'horned_lizard_run',
      run: 'horned_lizard_run',
      attack: 'horned_lizard_attack1',
      death: 'horned_lizard_dead',
      hitReact: 'horned_lizard_attack2',
    },
    ai: 'aggressive',
    hp: 80,
    damage: 16,
    moveSpeed: 11,
    alertRadius: 15,
    attackRange: 2.5,
    aggroChance: 0.75,
    huntable: true,
    huntValue: 18,
    roamRadius: 26,
    respawnTime: 120,
    loot: [
      { itemId: 'lizard_hide', name: 'Lizard Hide', quantity: [1, 2], chance: 1.0 },
      { itemId: 'horn_plate', name: 'Horn Plate', quantity: [0, 2], chance: 0.55 },
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [1, 2], chance: 0.8 },
    ],
    spawnWeight: 3,
  },

  /**
   * Free Reptile — Vadim Ziambetov stylized reptile (open world / islands / dungeons).
   * Local: public/models/creatures/land/free_reptile.glb
   * Clips: Idle, Walk, Run, Attack, Get Hit, Dead, Jump
   */
  free_reptile: {
    id: 'free_reptile',
    name: 'Wild Reptile',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/free_reptile.glb`,
    scale: 0.95,
    anims: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: 'Attack',
      death: 'Dead',
      hitReact: 'Get Hit',
      jump: 'Jump',
    },
    ai: 'aggressive',
    hp: 95,
    damage: 18,
    moveSpeed: 12,
    alertRadius: 17,
    attackRange: 2.6,
    aggroChance: 0.8,
    huntable: true,
    huntValue: 20,
    roamRadius: 28,
    respawnTime: 130,
    loot: [
      { itemId: 'lizard_hide', name: 'Reptile Hide', quantity: [1, 3], chance: 1.0 },
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [1, 2], chance: 0.85 },
      { itemId: 'fang', name: 'Reptile Fang', quantity: [0, 2], chance: 0.45 },
    ],
    spawnWeight: 3,
  },

  /**
   * Drake — small dragon companion pack used as island/dungeon elite.
   * Local: public/models/creatures/land/drake.glb
   * Clips: wait_1, walk, attack, die, hit, use_skill, skill_ready
   */
  drake: {
    id: 'drake',
    name: 'Drake',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/drake.glb`,
    scale: 1.15,
    anims: {
      idle: 'wait_1',
      walk: 'walk',
      run: 'walk',
      attack: 'attack',
      death: 'die',
      hitReact: 'hit',
    },
    ai: 'aggressive',
    hp: 180,
    damage: 26,
    moveSpeed: 14,
    alertRadius: 24,
    attackRange: 3.0,
    aggroChance: 1,
    huntable: true,
    huntValue: 42,
    roamRadius: 30,
    respawnTime: 200,
    loot: [
      { itemId: 'drake_scale', name: 'Drake Scale', quantity: [1, 3], chance: 1.0 },
      { itemId: 'ember_core', name: 'Ember Core', quantity: [0, 2], chance: 0.55 },
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [2, 4], chance: 0.9 },
    ],
    spawnWeight: 1,
  },

  /**
   * Ifrit — fire demon elite (volcanic open world + dungeon boss pack).
   * Local: public/models/creatures/land/ifrit.glb
   * Clips: Monster_YiFuLiTe_Idle/Run/Attack/Death/BeHit + skills
   */
  ifrit: {
    id: 'ifrit',
    name: 'Ifrit',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/ifrit.glb`,
    scale: 1.2,
    anims: {
      idle: 'Monster_YiFuLiTe_Idle',
      walk: 'Monster_YiFuLiTe_Run',
      run: 'Monster_YiFuLiTe_Run',
      attack: 'Monster_YiFuLiTe_Attack',
      death: 'Monster_YiFuLiTe_Death',
      hitReact: 'Monster_YiFuLiTe_BeHit',
    },
    ai: 'aggressive',
    hp: 240,
    damage: 34,
    moveSpeed: 13,
    alertRadius: 26,
    attackRange: 3.2,
    aggroChance: 1,
    huntable: true,
    huntValue: 55,
    roamRadius: 26,
    respawnTime: 220,
    loot: [
      { itemId: 'fire_ichor', name: 'Fire Ichor', quantity: [2, 4], chance: 1.0 },
      { itemId: 'ember_core', name: 'Ember Core', quantity: [1, 2], chance: 0.75 },
      { itemId: 'void_shard', name: 'Infernal Shard', quantity: [0, 1], chance: 0.35 },
    ],
    spawnWeight: 1,
  },

  /**
   * Lava Golem — molten rock brute (volcanic / dungeon).
   * Local: public/models/creatures/land/lava_golem.glb
   * Clips: lava_golem_fight_idle, run, attack1–2, dead
   */
  lava_golem: {
    id: 'lava_golem',
    name: 'Lava Golem',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/lava_golem.glb`,
    scale: 1.35,
    anims: {
      idle: 'lava_golem_fight_idle',
      walk: 'lava_golem_run',
      run: 'lava_golem_run',
      attack: 'lava_golem_attack1',
      death: 'lava_golem_dead',
      hitReact: 'lava_golem_attack2',
    },
    ai: 'aggressive',
    hp: 280,
    damage: 30,
    moveSpeed: 8,
    alertRadius: 18,
    attackRange: 3.4,
    aggroChance: 1,
    huntable: true,
    huntValue: 50,
    roamRadius: 22,
    respawnTime: 210,
    loot: [
      { itemId: 'molten_carapace', name: 'Molten Stone', quantity: [1, 3], chance: 1.0 },
      { itemId: 'ember_core', name: 'Ember Core', quantity: [1, 2], chance: 0.65 },
      { itemId: 'fire_ichor', name: 'Fire Ichor', quantity: [1, 2], chance: 0.5 },
    ],
    spawnWeight: 1,
  },

  /**
   * Thorn Beast — Monsters X free pack (horned/thorned land elite).
   * Local: public/models/creatures/land/monsters_x_free.glb
   * Clips: Idle, Walk, Run, Attack1/2, Get Hit, Death, Shout, Jump
   */
  monsters_x: {
    id: 'monsters_x',
    name: 'Thorn Beast',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/monsters_x_free.glb`,
    scale: 1.05,
    anims: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: 'Attack1',
      death: 'Death',
      hitReact: 'Get Hit',
      jump: 'Jump',
    },
    ai: 'aggressive',
    hp: 150,
    damage: 24,
    moveSpeed: 13,
    alertRadius: 20,
    attackRange: 2.8,
    aggroChance: 0.9,
    huntable: true,
    huntValue: 35,
    roamRadius: 30,
    respawnTime: 160,
    loot: [
      { itemId: 'horn_plate', name: 'Thorn Plate', quantity: [1, 2], chance: 1.0 },
      { itemId: 'raw_meat', name: 'Raw Meat', quantity: [2, 3], chance: 0.9 },
      { itemId: 'fang', name: 'Beast Fang', quantity: [0, 2], chance: 0.5 },
    ],
    spawnWeight: 2,
  },

  /**
   * Armored Crab — Vadim Ziambetov crab pack (coastal / storm / dungeon shore).
   * Local: public/models/creatures/land/creature_crab.glb
   * Clips: Idle, Walk, Run, Attack, Get Hit, Dead, Defend
   */
  creature_crab: {
    id: 'creature_crab',
    name: 'Armored Crab',
    category: 'land',
    modelPath: `${CDN}/models/creatures/land/creature_crab.glb`,
    scale: 0.85,
    anims: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: 'Attack',
      death: 'Dead',
      hitReact: 'Get Hit',
    },
    ai: 'aggressive',
    hp: 110,
    damage: 20,
    moveSpeed: 9,
    alertRadius: 14,
    attackRange: 2.4,
    aggroChance: 0.7,
    huntable: true,
    huntValue: 22,
    roamRadius: 20,
    respawnTime: 120,
    loot: [
      { itemId: 'crab_meat', name: 'Crab Meat', quantity: [2, 4], chance: 1.0 },
      { itemId: 'crab_shell', name: 'Armored Shell', quantity: [1, 2], chance: 0.8 },
      { itemId: 'chitin_shell', name: 'Chitin Shell', quantity: [0, 1], chance: 0.4 },
    ],
    spawnWeight: 3,
  },

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
    name: 'Whitetail Deer',
    category: 'land',
    modelPath: `${COTW}/deer.glb`,
    scale: 0.9,
    cotwAnim: true,
    anims: {
      idle: 'deer_idle_pose',
      walk: 'deer_walk_fwd_01',
      run: 'deer_run_fwd_01',
      eat: 'deer_idle_eat_grazing_01',
      death: 'deer_dead_trot_01',
      hitReact: 'deer_hit_reaction_front_01',
    },
    ai: 'passive',
    hp: 45,
    damage: 0,
    moveSpeed: 20,
    alertRadius: 28,
    attackRange: 0,
    aggroChance: 0,
    huntable: true,
    huntValue: 12,
    roamRadius: 40,
    respawnTime: 90,
    loot: [
      { itemId: 'raw_meat', name: 'Venison', quantity: [2, 4], chance: 1.0 },
      { itemId: 'deer_hide', name: 'Deer Hide', quantity: [1, 1], chance: 0.9 },
      { itemId: 'antler', name: 'Antler', quantity: [0, 2], chance: 0.3 },
    ],
    spawnWeight: 8,
  },

  cotw_lynx: {
    id: 'cotw_lynx',
    name: 'Lynx',
    category: 'land',
    modelPath: `${COTW}/lynx.glb`,
    scale: 0.85,
    cotwAnim: true,
    anims: { idle: 'lynx male|lynx_idle_alerted_pose_01', death: 'lynx male|lynx_dead_trot_01' },
    ai: 'neutral',
    hp: 70,
    damage: 14,
    moveSpeed: 18,
    alertRadius: 22,
    attackRange: 2.5,
    aggroChance: 0.55,
    huntable: true,
    huntValue: 35,
    roamRadius: 35,
    respawnTime: 150,
    loot: [
      { itemId: 'raw_meat', name: 'Lynx Meat', quantity: [1, 2], chance: 1.0 },
      { itemId: 'lynx_pelt', name: 'Lynx Pelt', quantity: [1, 1], chance: 0.75 },
    ],
    spawnWeight: 4,
  },

  cotw_lioness: {
    id: 'cotw_lioness',
    name: 'Lioness',
    category: 'land',
    modelPath: `${COTW}/lioness.glb`,
    scale: 1.0,
    cotwAnim: true,
    anims: {
      idle: 'lioness|lion_idle_aggressive_static_pose_01',
      attack: 'lioness|lion_attack_fwd_01',
      death: 'lioness|lion_dead_trot_01',
    },
    ai: 'aggressive',
    hp: 140,
    damage: 28,
    moveSpeed: 22,
    alertRadius: 30,
    attackRange: 3.5,
    aggroChance: 0.95,
    huntable: true,
    huntValue: 80,
    roamRadius: 50,
    respawnTime: 300,
    loot: [
      { itemId: 'raw_meat', name: 'Big Cat Meat', quantity: [3, 5], chance: 1.0 },
      { itemId: 'lion_pelt', name: 'Lion Pelt', quantity: [1, 1], chance: 0.7 },
      { itemId: 'fang', name: 'Predator Fang', quantity: [1, 2], chance: 0.5 },
    ],
    spawnWeight: 2,
  },

  cotw_buffalo: {
    id: 'cotw_buffalo',
    name: 'Cape Buffalo',
    category: 'land',
    modelPath: `${COTW}/buffalo.glb`,
    scale: 1.1,
    cotwAnim: true,
    anims: {
      idle: 'cape_buffalo_idle_pose_01|cape_buffalo_idle_pose_01',
      walk: 'cape_buffalo_idle_pose_01|cape_buffalo_walk_fwd_01',
      run: 'cape_buffalo_idle_pose_01|cape_buffalo_run_fwd_01',
      attack: 'cape_buffalo_idle_pose_01|cape_buffalo_attack_01',
      eat: 'cape_buffalo_idle_pose_01|cape_buffalo_idle_eat_01',
      death: 'cape_buffalo_idle_pose_01|cape_buffalo_hit_chest_lft_01',
    },
    ai: 'neutral',
    hp: 180,
    damage: 32,
    moveSpeed: 14,
    alertRadius: 16,
    attackRange: 4,
    aggroChance: 0.7,
    huntable: true,
    huntValue: 65,
    roamRadius: 30,
    respawnTime: 240,
    loot: [
      { itemId: 'raw_meat', name: 'Buffalo Meat', quantity: [4, 7], chance: 1.0 },
      { itemId: 'thick_hide', name: 'Thick Hide', quantity: [1, 2], chance: 0.95 },
      { itemId: 'horn', name: 'Buffalo Horn', quantity: [1, 2], chance: 0.6 },
    ],
    spawnWeight: 3,
  },

  cotw_boar: {
    id: 'cotw_boar',
    name: 'Wild Boar',
    category: 'land',
    modelPath: `${COTW}/boar.glb`,
    scale: 0.95,
    cotwAnim: true,
    anims: { idle: 'wild_boar_walk_fwd_bank_rgt.001|wild_boar_idle_eat_pose_01 static', death: 'wild_boar_walk_fwd_bank_rgt.001|wild_boar_dead_reaction_lft_01' },
    ai: 'neutral',
    hp: 85,
    damage: 16,
    moveSpeed: 16,
    alertRadius: 18,
    attackRange: 2.5,
    aggroChance: 0.6,
    huntable: true,
    huntValue: 28,
    roamRadius: 32,
    respawnTime: 120,
    loot: [
      { itemId: 'raw_meat', name: 'Boar Meat', quantity: [2, 4], chance: 1.0 },
      { itemId: 'boar_tusk', name: 'Boar Tusk', quantity: [0, 2], chance: 0.55 },
    ],
    spawnWeight: 6,
  },

  cotw_bear: {
    id: 'cotw_bear',
    name: 'Black Bear',
    category: 'land',
    modelPath: `${COTW}/bear.glb`,
    scale: 1.0,
    cotwAnim: true,
    anims: {
      idle: 'bear_idle_static_pose_01',
      walk: 'bear_idle_eat_pose_01_to_walk_fwd',
      run: 'bear_canter_fwd_01',
      attack: 'bear_attack_01',
      eat: 'bear_idle_eat_01',
      death: 'bear_dead_reaction_lft_01',
      hitReact: 'bear_hit_chest_lft_01',
    },
    ai: 'aggressive',
    hp: 160,
    damage: 26,
    moveSpeed: 17,
    alertRadius: 24,
    attackRange: 3,
    aggroChance: 0.85,
    huntable: true,
    huntValue: 70,
    roamRadius: 38,
    respawnTime: 240,
    loot: [
      { itemId: 'raw_meat', name: 'Bear Meat', quantity: [3, 5], chance: 1.0 },
      { itemId: 'bear_pelt', name: 'Bear Pelt', quantity: [1, 1], chance: 0.8 },
      { itemId: 'claw', name: 'Bear Claw', quantity: [1, 3], chance: 0.45 },
    ],
    spawnWeight: 3,
  },

  cotw_beaver: {
    id: 'cotw_beaver',
    name: 'Beaver',
    category: 'land',
    modelPath: `${COTW}/beaver.glb`,
    scale: 0.7,
    cotwAnim: true,
    anims: { idle: 'idle|idle', death: 'idle|dead sprint' },
    ai: 'passive',
    hp: 25,
    damage: 0,
    moveSpeed: 10,
    alertRadius: 14,
    attackRange: 0,
    aggroChance: 0,
    huntable: true,
    huntValue: 8,
    roamRadius: 20,
    respawnTime: 75,
    loot: [
      { itemId: 'raw_meat', name: 'Beaver Meat', quantity: [1, 2], chance: 1.0 },
      { itemId: 'beaver_pelt', name: 'Beaver Pelt', quantity: [1, 1], chance: 0.7 },
    ],
    spawnWeight: 4,
  },

  cotw_raccoon: {
    id: 'cotw_raccoon',
    name: 'Raccoon',
    category: 'land',
    modelPath: `${COTW}/raccoon.glb`,
    scale: 0.65,
    cotwAnim: true,
    anims: { idle: 'racoon|idle pose', death: 'racoon|dead pose lft' },
    ai: 'passive',
    hp: 20,
    damage: 0,
    moveSpeed: 12,
    alertRadius: 12,
    attackRange: 0,
    aggroChance: 0.1,
    huntable: true,
    huntValue: 6,
    roamRadius: 18,
    respawnTime: 60,
    loot: [
      { itemId: 'raw_meat', name: 'Raccoon Meat', quantity: [1, 1], chance: 0.8 },
      { itemId: 'fur_patch', name: 'Fur Patch', quantity: [1, 1], chance: 0.6 },
    ],
    spawnWeight: 5,
  },

  cotw_mink: {
    id: 'cotw_mink',
    name: 'American Mink',
    category: 'land',
    modelPath: `${COTW}/mink.glb`,
    scale: 0.55,
    cotwAnim: true,
    anims: { idle: 'idle', death: 'dead' },
    ai: 'passive',
    hp: 15,
    damage: 0,
    moveSpeed: 14,
    alertRadius: 10,
    attackRange: 0,
    huntable: true,
    huntValue: 5,
    roamRadius: 16,
    respawnTime: 50,
    loot: [{ itemId: 'fur_patch', name: 'Mink Fur', quantity: [1, 1], chance: 0.85 }],
    spawnWeight: 3,
  },

  cotw_ibex: {
    id: 'cotw_ibex',
    name: 'Beceite Ibex',
    category: 'land',
    modelPath: `${COTW}/ibex.glb`,
    scale: 0.9,
    cotwAnim: true,
    anims: { idle: 'idle', death: 'dead' },
    ai: 'passive',
    hp: 55,
    damage: 0,
    moveSpeed: 18,
    alertRadius: 26,
    attackRange: 0,
    huntable: true,
    huntValue: 22,
    roamRadius: 45,
    respawnTime: 120,
    loot: [
      { itemId: 'raw_meat', name: 'Ibex Meat', quantity: [2, 3], chance: 1.0 },
      { itemId: 'ibex_horn', name: 'Ibex Horn', quantity: [0, 2], chance: 0.4 },
    ],
    spawnWeight: 4,
  },

  cotw_alligator: {
    id: 'cotw_alligator',
    name: 'American Alligator',
    category: 'land',
    modelPath: `${COTW}/alligator.glb`,
    scale: 1.0,
    cotwAnim: true,
    anims: { idle: 'idle', attack: 'attack', death: 'dead' },
    ai: 'aggressive',
    hp: 120,
    damage: 22,
    moveSpeed: 12,
    alertRadius: 18,
    attackRange: 3,
    aggroChance: 0.8,
    huntable: true,
    huntValue: 55,
    roamRadius: 25,
    respawnTime: 200,
    loot: [
      { itemId: 'raw_meat', name: 'Gator Meat', quantity: [2, 4], chance: 1.0 },
      { itemId: 'gator_scale', name: 'Gator Scale', quantity: [1, 2], chance: 0.65 },
    ],
    spawnWeight: 2,
  },

  cotw_mallard: {
    id: 'cotw_mallard',
    name: 'Mallard Drake',
    category: 'bird',
    modelPath: `${COTW}/mallard.glb`,
    scale: 0.6,
    cotwAnim: true,
    anims: { idle: 'idle', walk: 'walk', death: 'dead' },
    ai: 'passive',
    hp: 12,
    damage: 0,
    moveSpeed: 16,
    alertRadius: 20,
    attackRange: 0,
    huntable: true,
    huntValue: 4,
    roamRadius: 30,
    respawnTime: 45,
    loot: [
      { itemId: 'raw_meat', name: 'Duck Meat', quantity: [1, 1], chance: 1.0 },
      { itemId: 'feather', name: 'Waterfowl Feather', quantity: [1, 3], chance: 0.9 },
    ],
    spawnWeight: 3,
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

/** COTW-sourced wildlife — preferred for island/lobby spawns */
export function getCotwCreatures(): CreatureDef[] {
  return Object.values(CREATURE_MANIFEST).filter((c) => c.cotwAnim);
}

export function getHuntableCreatures(): CreatureDef[] {
  return Object.values(CREATURE_MANIFEST).filter((c) => c.huntable);
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
