/**
 * NPC Camps — faction camps using stylized_enemy_camp_scene.glb as the base.
 *
 * Players / NPCs expand camps with benches, storage, and towers.
 * Alignment vs player:
 *   same faction  → ally (friendly, can trade / reinforce)
 *   other faction → enemy (hostile combat)
 * Animals & monsters → enemy OR neutral-but-attackable (huntable)
 */

// ── Factions ─────────────────────────────────────────────────────────────────

export type CampFaction =
  | 'crusade'
  | 'legion'
  | 'fabled'
  | 'worge'
  | 'pirate'
  | 'neutral'
  | 'monster'; // wildlife / dungeon creatures (never ally)

export type RelationKind = 'ally' | 'enemy' | 'neutral_attackable';

export const PLAYER_FACTIONS: CampFaction[] = ['crusade', 'legion', 'fabled', 'worge'];

export const FACTION_COLORS: Record<CampFaction, number> = {
  crusade: 0xffd700,
  legion: 0x8b0000,
  fabled: 0x00ced1,
  worge: 0x9acd32,
  pirate: 0x2f4f4f,
  neutral: 0x888888,
  monster: 0xcc4422,
};

export const FACTION_LABELS: Record<CampFaction, string> = {
  crusade: 'Crusade',
  legion: 'Legion',
  fabled: 'Fabled',
  worge: 'Worge',
  pirate: 'Pirate',
  neutral: 'Neutral',
  monster: 'Monster',
};

/**
 * Relation of `them` toward the player faction.
 * - Same playable faction → ally
 * - Different playable / pirate / hostile camps → enemy
 * - Neutral camps → neutral_attackable (can fight, not auto-aggro)
 * - monster always enemy or neutral_attackable (never ally)
 */
export function resolveRelation(
  playerFaction: CampFaction | string | null | undefined,
  otherFaction: CampFaction | string | null | undefined,
): RelationKind {
  const me = (playerFaction ?? 'neutral') as CampFaction;
  const them = (otherFaction ?? 'neutral') as CampFaction;

  if (them === 'monster') return 'enemy';
  if (me === them && PLAYER_FACTIONS.includes(me)) return 'ally';
  if (them === 'neutral') return 'neutral_attackable';
  if (PLAYER_FACTIONS.includes(them as CampFaction) && them !== me) return 'enemy';
  if (them === 'pirate') return 'enemy';
  return 'enemy';
}

export function isHostileRelation(rel: RelationKind): boolean {
  return rel === 'enemy';
}

export function isAttackableRelation(rel: RelationKind): boolean {
  return rel === 'enemy' || rel === 'neutral_attackable';
}

export function isAllyRelation(rel: RelationKind): boolean {
  return rel === 'ally';
}

// ── Camp upgrades (placed onto a camp footprint) ─────────────────────────────

export type CampUpgradeKind = 'bench' | 'storage' | 'tower' | 'flag' | 'fire' | 'barricade';

export interface CampUpgradeDef {
  id: string;
  kind: CampUpgradeKind;
  label: string;
  /** BuildAssetManifest id for placement ghost / model */
  buildAssetId: string;
  /** Local offset from camp origin when auto-slotted */
  slotOffsets: Array<[number, number, number]>;
  maxPerCamp: number;
  cost: Array<{ itemId: string; quantity: number }>;
  /** Gameplay effect */
  effect: {
    type: 'comfort' | 'storage' | 'defense' | 'morale';
    value: number;
    description: string;
  };
}

/**
 * Upgrade → BuildAssetManifest id.
 * Prefer survival-kit SSOT pieces (nodeName multipack) over medieval single-mesh aliases.
 */
export const CAMP_UPGRADES: Record<string, CampUpgradeDef> = {
  camp_bench: {
    id: 'camp_bench',
    kind: 'bench',
    label: 'Camp Bench',
    buildAssetId: 'bench_workbench',
    slotOffsets: [
      [3, 0, 2],
      [-3, 0, 2],
      [0, 0, -3],
    ],
    maxPerCamp: 4,
    cost: [{ itemId: 'wood', quantity: 4 }],
    effect: {
      type: 'comfort',
      value: 5,
      description:
        'Craft at camp — raises crafting profession levels (Camp/Engineering/Forestry/Mining).',
    },
  },
  camp_storage: {
    id: 'camp_storage',
    kind: 'storage',
    label: 'Camp Storage',
    buildAssetId: 'mod_chest',
    slotOffsets: [
      [4, 0, -1],
      [-4, 0, -1],
    ],
    maxPerCamp: 3,
    cost: [
      { itemId: 'wood', quantity: 6 },
      { itemId: 'iron', quantity: 2 },
    ],
    effect: {
      type: 'storage',
      value: 20,
      description: 'Shared inventory + unit harvest yield/rate buff',
    },
  },
  camp_tower: {
    id: 'camp_tower',
    kind: 'tower',
    label: 'Camp Watchtower',
    buildAssetId: 'tower_medieval_a',
    slotOffsets: [
      [6, 0, 6],
      [-6, 0, 6],
      [6, 0, -6],
      [-6, 0, -6],
    ],
    maxPerCamp: 2,
    cost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 10 },
    ],
    effect: {
      type: 'defense',
      value: 50,
      description:
        'Trains garrison: T0 weapons, armor, weapon skills, improved AI',
    },
  },
  camp_flag: {
    id: 'camp_flag',
    kind: 'flag',
    label: 'Claim Flag',
    buildAssetId: 'flag_totem',
    slotOffsets: [[0, 0, 0]],
    maxPerCamp: 1,
    cost: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'cloth', quantity: 3 },
    ],
    effect: {
      type: 'morale',
      value: 10,
      description:
        'Claims camp for you. Spawns unarmed race garrison. F1–F5 unit orders when near owned camp.',
    },
  },
  camp_fire: {
    id: 'camp_fire',
    kind: 'fire',
    label: 'Campfire',
    buildAssetId: 'camp_fire_soup',
    slotOffsets: [[1.5, 0, 0]],
    maxPerCamp: 1,
    cost: [{ itemId: 'wood', quantity: 3 }],
    effect: {
      type: 'comfort',
      value: 8,
      description: 'Warmth + cook station — Cooking profession XP at owned camp',
    },
  },
};

/** Alias for claim-flag product language */
export const CLAIM_FLAG_UPGRADE = CAMP_UPGRADES.camp_flag;

// ── Camp base definition ─────────────────────────────────────────────────────

export interface NpcCampDef {
  id: string;
  name: string;
  /** Local GLB under /models/camps/ */
  modelPath: string;
  /** Uniform scale for the scene GLB */
  modelScale: number;
  /** Footprint radius for placement / AI guard */
  radiusM: number;
  /** Default faction when spawned from zone pop */
  defaultFaction: CampFaction;
  /** Allowed upgrade kinds */
  allowedUpgrades: CampUpgradeKind[];
  /** Garrison NPC count when hostile */
  garrisonSize: number;
  description: string;
}

/** Primary camp kit — stylized enemy camp scene */
export const STYLIZED_CAMP: NpcCampDef = {
  id: 'stylized_enemy_camp',
  name: 'Stylized Outpost Camp',
  modelPath: '/models/camps/stylized_enemy_camp_scene.glb',
  modelScale: 1.0,
  radiusM: 18,
  defaultFaction: 'pirate',
  allowedUpgrades: ['bench', 'storage', 'tower', 'flag', 'fire'],
  garrisonSize: 4,
  description:
    'Prefabricated camp compound. Expand with benches, storage chests, and watchtowers. Same-faction camps are allies; other factions are enemies.',
};

/** Alias for hostile default spawn */
export const NPC_CAMP_DEFS: Record<string, NpcCampDef> = {
  stylized_enemy_camp: {
    ...STYLIZED_CAMP,
    defaultFaction: 'pirate',
  },
  crusade_camp: {
    ...STYLIZED_CAMP,
    id: 'crusade_camp',
    name: 'Crusade Field Camp',
    defaultFaction: 'crusade',
  },
  legion_camp: {
    ...STYLIZED_CAMP,
    id: 'legion_camp',
    name: 'Legion War Camp',
    defaultFaction: 'legion',
  },
  fabled_camp: {
    ...STYLIZED_CAMP,
    id: 'fabled_camp',
    name: 'Fabled Encampment',
    defaultFaction: 'fabled',
  },
  pirate_camp: {
    ...STYLIZED_CAMP,
    id: 'pirate_camp',
    name: 'Pirate Shore Camp',
    defaultFaction: 'pirate',
  },
};

// ── Runtime camp instance data ───────────────────────────────────────────────

export interface PlacedCampUpgrade {
  upgradeId: string;
  kind: CampUpgradeKind;
  localPos: [number, number, number];
  rotationY: number;
}

export interface NpcCampInstance {
  id: string;
  defId: string;
  faction: CampFaction;
  position: [number, number, number];
  rotationY: number;
  upgrades: PlacedCampUpgrade[];
  /** Owner account if player-built; null = world NPC camp */
  ownerAccountId: string | null;
  /** Captured / claimed */
  claimedByFaction?: CampFaction;
}

export function campUpgradeCount(camp: NpcCampInstance, kind: CampUpgradeKind): number {
  return camp.upgrades.filter((u) => u.kind === kind).length;
}

export function canAddUpgrade(camp: NpcCampInstance, upgradeId: string): boolean {
  const def = CAMP_UPGRADES[upgradeId];
  if (!def) return false;
  const campDef = NPC_CAMP_DEFS[camp.defId] ?? STYLIZED_CAMP;
  if (!campDef.allowedUpgrades.includes(def.kind)) return false;
  return campUpgradeCount(camp, def.kind) < def.maxPerCamp;
}

export function nextUpgradeSlot(
  camp: NpcCampInstance,
  upgradeId: string,
): [number, number, number] | null {
  const def = CAMP_UPGRADES[upgradeId];
  if (!def || !canAddUpgrade(camp, upgradeId)) return null;
  const used = camp.upgrades.filter((u) => u.kind === def.kind).length;
  return def.slotOffsets[used % def.slotOffsets.length] ?? def.slotOffsets[0];
}

// ── Wildlife hostility helper ────────────────────────────────────────────────

/**
 * Animals / monsters are never allies.
 * aggressive AI → enemy; neutral/passive → neutral_attackable (still hunt/attack).
 */
export function wildlifeRelation(
  ai: 'passive' | 'neutral' | 'aggressive' | 'fish' | string,
): RelationKind {
  if (ai === 'aggressive') return 'enemy';
  return 'neutral_attackable';
}
