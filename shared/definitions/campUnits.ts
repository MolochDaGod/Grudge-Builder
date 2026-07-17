/**
 * Camp Units & Claim Flag SSOT
 *
 * Claim Flag (camp_flag) on a player-owned camp:
 *   → spawns unarmed race variant garrison (player's race)
 *
 * Benches at camp:
 *   → craft + raise crafting profession level at the camp station
 *
 * Buildings (tower, storage, fire, barracks-style upgrades):
 *   → unit AI buffs, harvest rate/yield, T0 weapons, armor, weapon skills
 *
 * Owned-camp unit orders (hotkeys when near your camp):
 *   F1 Defend Camp · F2 Follow (join party) · F3 Go Home
 *   F4 Attack · F5 Group On Me
 */

import type { CampUpgradeKind } from './npcCamps';

// ── Claim Flag → race unit spawn ─────────────────────────────────────────────

export const CLAIM_FLAG_UPGRADE_ID = 'camp_flag' as const;

/** Units spawned per claim flag (unarmed race variants). */
export const CLAIM_FLAG_GARRISON_SIZE = 3;

export interface ClaimFlagSpawnDef {
  /** Must be camp_flag upgrade */
  upgradeId: typeof CLAIM_FLAG_UPGRADE_ID;
  garrisonSize: number;
  /** Spawn with empty weapon slots (unarmed visual) */
  unarmed: true;
  /** Local offsets from camp origin for each garrison slot */
  spawnOffsets: Array<[number, number, number]>;
  /** Display name pattern — {race} filled at runtime */
  namePattern: string;
}

export const CLAIM_FLAG_SPAWN: ClaimFlagSpawnDef = {
  upgradeId: CLAIM_FLAG_UPGRADE_ID,
  garrisonSize: CLAIM_FLAG_GARRISON_SIZE,
  unarmed: true,
  spawnOffsets: [
    [2.5, 0, 2.5],
    [-2.5, 0, 2.5],
    [0, 0, -3.5],
  ],
  namePattern: '{race} Camp Recruit',
};

// ── Unit orders (F1–F5 on owned camps) ───────────────────────────────────────

export type CampUnitOrderId =
  | 'defend_camp'
  | 'follow'
  | 'go_home'
  | 'attack'
  | 'group_on_me';

export interface CampUnitOrderDef {
  id: CampUnitOrderId;
  /** Keyboard key without modifiers */
  hotkey: 'F1' | 'F2' | 'F3' | 'F4' | 'F5';
  label: string;
  shortLabel: string;
  description: string;
  /** Maps to AllyController / CampUnitSystem behavior */
  allyState: 'guard' | 'follow' | 'return' | 'combat' | 'group';
}

export const CAMP_UNIT_ORDERS: CampUnitOrderDef[] = [
  {
    id: 'defend_camp',
    hotkey: 'F1',
    label: 'Defend Camp',
    shortLabel: 'Defend',
    description: 'Hold and defend the camp footprint. Aggro hostiles in range.',
    allyState: 'guard',
  },
  {
    id: 'follow',
    hotkey: 'F2',
    label: 'Follow Player',
    shortLabel: 'Follow',
    description: 'Join player party and follow. Fights with the player.',
    allyState: 'follow',
  },
  {
    id: 'go_home',
    hotkey: 'F3',
    label: 'Go Home',
    shortLabel: 'Home',
    description: 'Return to camp home markers and idle on garrison posts.',
    allyState: 'return',
  },
  {
    id: 'attack',
    hotkey: 'F4',
    label: 'Attack',
    shortLabel: 'Attack',
    description: 'Aggressive: pursue and attack nearest hostiles / focus target.',
    allyState: 'combat',
  },
  {
    id: 'group_on_me',
    hotkey: 'F5',
    label: 'Group On Me',
    shortLabel: 'Group',
    description: 'Rally tight formation on the player, then hold.',
    allyState: 'group',
  },
];

export const CAMP_ORDER_BY_HOTKEY: Record<string, CampUnitOrderId> = Object.fromEntries(
  CAMP_UNIT_ORDERS.map((o) => [o.hotkey, o.id]),
) as Record<string, CampUnitOrderId>;

export function getCampOrder(id: CampUnitOrderId): CampUnitOrderDef {
  return CAMP_UNIT_ORDERS.find((o) => o.id === id)!;
}

// ── Building buffs for camp units ────────────────────────────────────────────

export interface CampBuildingUnitBuff {
  kind: CampUpgradeKind;
  label: string;
  /** Multiplier on base AI damage / reaction (1 = none) */
  aiAbilityMult: number;
  /** Harvest profession speed (time to gather) — lower is faster; we use mult on rate */
  harvestRateMult: number;
  /** Yield mult on harvest nodes when unit gathers */
  harvestYieldMult: number;
  /** Equip T0 starter weapons on units */
  equipT0Weapons: boolean;
  /** Flat armor rating added to unit */
  armorBonus: number;
  /** Unlock weapon skill bar usage for this unit */
  weaponSkillUsage: boolean;
  /** Extra max HP */
  maxHpBonus: number;
  description: string;
}

/**
 * Stacking buffs from placed camp buildings.
 * Claim flag itself does not buff (it spawns units).
 */
export const CAMP_BUILDING_UNIT_BUFFS: Record<CampUpgradeKind, CampBuildingUnitBuff> = {
  flag: {
    kind: 'flag',
    label: 'Claim Flag',
    aiAbilityMult: 1.0,
    harvestRateMult: 1.0,
    harvestYieldMult: 1.0,
    equipT0Weapons: false,
    armorBonus: 0,
    weaponSkillUsage: false,
    maxHpBonus: 0,
    description: 'Spawns unarmed race garrison; claims ownership.',
  },
  bench: {
    kind: 'bench',
    label: 'Profession Bench',
    aiAbilityMult: 1.0,
    harvestRateMult: 1.05,
    harvestYieldMult: 1.0,
    equipT0Weapons: false,
    armorBonus: 0,
    weaponSkillUsage: false,
    maxHpBonus: 0,
    description: 'Player crafts at camp; profession XP for crafting professions.',
  },
  storage: {
    kind: 'storage',
    label: 'Camp Storage',
    aiAbilityMult: 1.05,
    harvestRateMult: 1.1,
    harvestYieldMult: 1.15,
    equipT0Weapons: false,
    armorBonus: 2,
    weaponSkillUsage: false,
    maxHpBonus: 10,
    description: 'Units haul better — higher harvest yield and light armor pads.',
  },
  tower: {
    kind: 'tower',
    label: 'Watchtower',
    aiAbilityMult: 1.25,
    harvestRateMult: 1.0,
    harvestYieldMult: 1.0,
    equipT0Weapons: true,
    armorBonus: 8,
    weaponSkillUsage: true,
    maxHpBonus: 25,
    description: 'Trained units: T0 weapons, armor, weapon skills, better AI.',
  },
  fire: {
    kind: 'fire',
    label: 'Campfire',
    aiAbilityMult: 1.05,
    harvestRateMult: 1.0,
    harvestYieldMult: 1.05,
    equipT0Weapons: false,
    armorBonus: 1,
    weaponSkillUsage: false,
    maxHpBonus: 15,
    description: 'Morale — extra HP and slight yield.',
  },
  barricade: {
    kind: 'barricade',
    label: 'Barricade',
    aiAbilityMult: 1.1,
    harvestRateMult: 1.0,
    harvestYieldMult: 1.0,
    equipT0Weapons: false,
    armorBonus: 5,
    weaponSkillUsage: false,
    maxHpBonus: 10,
    description: 'Defensive stance AI and armor.',
  },
};

export interface AggregatedCampUnitBuffs {
  aiAbilityMult: number;
  harvestRateMult: number;
  harvestYieldMult: number;
  equipT0Weapons: boolean;
  armorBonus: number;
  weaponSkillUsage: boolean;
  maxHpBonus: number;
  sources: CampUpgradeKind[];
}

export function aggregateCampUnitBuffs(
  upgradeKinds: CampUpgradeKind[],
): AggregatedCampUnitBuffs {
  let ai = 1;
  let rate = 1;
  let yieldM = 1;
  let armor = 0;
  let hp = 0;
  let t0 = false;
  let skills = false;
  const sources: CampUpgradeKind[] = [];

  for (const kind of upgradeKinds) {
    const b = CAMP_BUILDING_UNIT_BUFFS[kind];
    if (!b || kind === 'flag' || kind === 'bench') continue;
    sources.push(kind);
    ai *= b.aiAbilityMult;
    rate *= b.harvestRateMult;
    yieldM *= b.harvestYieldMult;
    armor += b.armorBonus;
    hp += b.maxHpBonus;
    if (b.equipT0Weapons) t0 = true;
    if (b.weaponSkillUsage) skills = true;
  }

  return {
    aiAbilityMult: ai,
    harvestRateMult: rate,
    harvestYieldMult: yieldM,
    equipT0Weapons: t0,
    armorBonus: armor,
    weaponSkillUsage: skills,
    maxHpBonus: hp,
    sources,
  };
}

// ── Benches → crafting professions at camp ───────────────────────────────────

export type CampCraftProfession =
  | 'camp'
  | 'cooking'
  | 'smithing'
  | 'mining'
  | 'forestry'
  | 'engineering'
  | 'tailoring'
  | 'tinkering'
  | 'mystic';

export interface CampBenchProfessionLink {
  upgradeId: string;
  profession: CampCraftProfession;
  label: string;
  /** Profession XP granted per successful craft at this bench */
  xpPerCraft: number;
  /** Max profession level trainable at camp benches (before city benches) */
  maxProfessionLevel: number;
  /** Build piece / station ids that count as this profession at camp */
  stationBuildIds: string[];
  description: string;
}

/**
 * Placing camp_bench unlocks the general camp craft station.
 * Specialized benches map via buildAssetId when upgraded later.
 */
export const CAMP_BENCH_PROFESSIONS: CampBenchProfessionLink[] = [
  {
    upgradeId: 'camp_bench',
    profession: 'camp',
    label: 'Camp Crafting',
    xpPerCraft: 8,
    maxProfessionLevel: 25,
    stationBuildIds: ['bench_workbench', 'camp_bench'],
    description: 'Craft T0 camp goods and raise Camp profession level at your claim.',
  },
  {
    upgradeId: 'camp_fire',
    profession: 'cooking',
    label: 'Camp Cooking',
    xpPerCraft: 6,
    maxProfessionLevel: 20,
    stationBuildIds: ['camp_fire_soup', 'bench_cooking'],
    description: 'Cook food at campfire; Cooking profession XP.',
  },
  {
    upgradeId: 'camp_bench', // same upgrade can host engineer kit later
    profession: 'engineering',
    label: 'Field Engineering',
    xpPerCraft: 10,
    maxProfessionLevel: 20,
    stationBuildIds: ['bench_anvil_engineer', 'bench_workbench'],
    description: 'Smith / engineer T0 tools at camp workbench when unlocked.',
  },
  {
    upgradeId: 'camp_bench',
    profession: 'forestry',
    label: 'Field Forestry',
    xpPerCraft: 8,
    maxProfessionLevel: 20,
    stationBuildIds: ['bench_forestry', 'bench_workbench'],
    description: 'Process wood at camp; Forestry profession XP.',
  },
  {
    upgradeId: 'camp_bench',
    profession: 'mining',
    label: 'Field Mining Prep',
    xpPerCraft: 8,
    maxProfessionLevel: 20,
    stationBuildIds: ['bench_grind_miner', 'bench_workbench'],
    description: 'Sharpen / process ore at camp grind when available.',
  },
];

export function professionsAvailableAtCamp(
  upgradeIds: string[],
): CampBenchProfessionLink[] {
  const set = new Set(upgradeIds);
  // Deduplicate by profession — first matching upgrade wins
  const byProf = new Map<CampCraftProfession, CampBenchProfessionLink>();
  for (const link of CAMP_BENCH_PROFESSIONS) {
    if (set.has(link.upgradeId) && !byProf.has(link.profession)) {
      byProf.set(link.profession, link);
    }
  }
  return Array.from(byProf.values());
}

// ── T0 starter loadout for trained units (when tower / equipT0Weapons) ───────

export const CAMP_UNIT_T0_LOADOUT = {
  mainHand: 't0_training_sword',
  armor: 't0_padded_vest',
  /** Weapon skill ids units may use when weaponSkillUsage is true */
  weaponSkills: ['warrior_0_strike', 'basic_slash', 'basic_block'] as string[],
} as const;

// ── Base stats for unarmed race garrison ─────────────────────────────────────

export interface CampUnitBaseStats {
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  moveSpeed: number;
  aggroRadius: number;
  followDistance: number;
  armor: number;
  harvestRate: number;
  harvestYield: number;
}

export const CAMP_UNIT_BASE_STATS: CampUnitBaseStats = {
  maxHp: 80,
  damage: 8,
  attackRange: 2.5,
  attackCooldown: 1.6,
  moveSpeed: 18,
  aggroRadius: 14,
  followDistance: 3.5,
  armor: 0,
  harvestRate: 1.0,
  harvestYield: 1.0,
};

export function applyBuffsToUnitStats(
  base: CampUnitBaseStats,
  buffs: AggregatedCampUnitBuffs,
): CampUnitBaseStats {
  return {
    ...base,
    maxHp: base.maxHp + buffs.maxHpBonus,
    damage: Math.round(base.damage * buffs.aiAbilityMult * 10) / 10,
    attackCooldown: base.attackCooldown / Math.max(0.5, buffs.aiAbilityMult * 0.9 + 0.1),
    aggroRadius: base.aggroRadius * (0.9 + buffs.aiAbilityMult * 0.1),
    armor: base.armor + buffs.armorBonus,
    harvestRate: base.harvestRate * buffs.harvestRateMult,
    harvestYield: base.harvestYield * buffs.harvestYieldMult,
    moveSpeed: base.moveSpeed,
    attackRange: base.attackRange,
    followDistance: base.followDistance,
  };
}
