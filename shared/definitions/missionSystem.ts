/**
 * MissionSystem — shared mission definitions and state management.
 *
 * Missions are server-authoritative: the server validates completion,
 * grants rewards, and persists state. The client reads state for HUD display
 * and sends proximity/interaction events to the server for validation.
 *
 * Objective types:
 *   reach_location — player enters a radius around a world position
 *   kill           — defeat N enemies matching a filter
 *   collect        — gather N items by ID
 *   interact       — interact with a specific node (NPC, object, POI)
 *   escort         — keep an NPC alive while it walks a path
 *   survive        — stay alive for N seconds in a zone
 */

// ── Objective Types ──────────────────────────────────────────────────────────

export type ObjectiveType =
  | 'reach_location'
  | 'kill'
  | 'collect'
  | 'interact'
  | 'escort'
  | 'survive';

export interface MissionObjective {
  /** Unique within this mission */
  id: string;
  /** Human-readable description */
  description: string;
  type: ObjectiveType;

  // ── Type-specific fields (only relevant fields are set) ────

  /** Target world position [x, y, z] — for reach_location */
  targetPosition?: [number, number, number];
  /** Radius in meters to trigger reach_location completion */
  targetRadius?: number;
  /** Target node ID — for interact objectives */
  targetNodeId?: string;
  /** Target enemy template IDs — for kill objectives */
  targetTemplateIds?: string[];
  /** Target item IDs — for collect objectives */
  targetItemIds?: string[];
  /** Required count — for kill/collect (default 1) */
  requiredCount: number;
  /** Current progress (tracked at runtime) */
  currentCount: number;
  /** Duration in seconds — for survive objectives */
  durationSec?: number;

  /** Whether this objective is optional (bonus) */
  optional: boolean;
  /** Display order in the HUD */
  order: number;
}

// ── Mission State ────────────────────────────────────────────────────────────

export type MissionState = 'not_started' | 'active' | 'completed' | 'failed';

// ── Rewards ──────────────────────────────────────────────────────────────────

export interface MissionReward {
  /** Gold amount */
  gold?: number;
  /** XP amount */
  xp?: number;
  /** Item grants [itemId, quantity][] */
  items?: [string, number][];
  /** Profession XP grants [professionId, amount][] */
  professionXp?: [string, number][];
  /** Reputation with a faction [factionId, amount][] */
  reputation?: [string, number][];
  /** Unlocks (building IDs, recipe IDs, zone access, etc.) */
  unlocks?: string[];
}

// ── Mission Definition ───────────────────────────────────────────────────────

export interface Mission {
  /** Unique mission ID (e.g. 'MISSION_SAFEHOUSE') */
  id: string;
  /** Display title */
  title: string;
  /** Narrative description shown in the mission log */
  description: string;
  /** Short flavor text shown on accept */
  flavorText?: string;
  /** Category for the mission log UI */
  category: 'main' | 'side' | 'daily' | 'faction' | 'tutorial';
  /** Difficulty tier 1-10 */
  difficulty: number;
  /** Recommended player level */
  recommendedLevel: number;
  /** Mission objectives (all non-optional must be completed) */
  objectives: MissionObjective[];
  /** Rewards on completion */
  rewards: MissionReward;
  /** Prerequisites — mission IDs that must be completed first */
  prerequisites: string[];
  /** Whether this mission auto-activates (no NPC quest giver needed) */
  autoActivate: boolean;
  /** Whether this mission can be failed (e.g. escort missions) */
  canFail: boolean;
  /** Time limit in seconds (0 = no limit) */
  timeLimitSec: number;
  /** Zone/sector restriction (null = any) */
  zoneRestriction?: string;
}

// ── Player Mission State (runtime, per-player) ───────────────────────────────

export interface PlayerMissionState {
  missionId: string;
  state: MissionState;
  /** Per-objective progress */
  objectiveProgress: Record<string, number>;
  /** Timestamp when activated (ms) */
  activatedAt: number;
  /** Timestamp when completed/failed (ms), 0 if still active */
  completedAt: number;
}

// ── Helper: check if a mission is complete ───────────────────────────────────

export function isMissionComplete(mission: Mission, playerState: PlayerMissionState): boolean {
  for (const obj of mission.objectives) {
    if (obj.optional) continue;
    const progress = playerState.objectiveProgress[obj.id] ?? 0;
    if (progress < obj.requiredCount) return false;
  }
  return true;
}

/**
 * Check if a reach_location objective is satisfied by a player position.
 */
export function checkReachObjective(
  objective: MissionObjective,
  playerPos: [number, number, number],
): boolean {
  if (objective.type !== 'reach_location') return false;
  if (!objective.targetPosition) return false;
  const dx = playerPos[0] - objective.targetPosition[0];
  const dy = playerPos[1] - objective.targetPosition[1];
  const dz = playerPos[2] - objective.targetPosition[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist <= (objective.targetRadius ?? 5);
}

// ══════════════════════════════════════════════════════════════════════════════
// MISSION CATALOG — First Mission: "Find Shelter"
// ══════════════════════════════════════════════════════════════════════════════

/**
 * MISSION_SAFEHOUSE — the very first mission every new player receives.
 *
 * Objective: reach the nearest safe house building in a settlement.
 * The target position is dynamically set by the engine when the mission
 * activates (it finds the nearest settlement with a safe house).
 *
 * This mission teaches the player:
 *   1. Basic movement (WASD + camera)
 *   2. Reading the waypoint marker
 *   3. Navigating to a settlement
 *   4. The concept of safe zones
 */
export const MISSION_SAFEHOUSE: Mission = {
  id: 'MISSION_SAFEHOUSE',
  title: 'Find Shelter',
  description:
    'You awaken on a strange shore. The wilds are dangerous — find the nearest safe house ' +
    'in a nearby settlement before nightfall. Follow the beacon on your compass.',
  flavorText: '"Keep your head down and find shelter. The creatures come out at night."',
  category: 'tutorial',
  difficulty: 1,
  recommendedLevel: 1,
  objectives: [
    {
      id: 'reach_safehouse',
      description: 'Reach the safe house',
      type: 'reach_location',
      targetPosition: [0, 0, 0], // ← dynamically replaced by the engine
      targetRadius: 5,
      requiredCount: 1,
      currentCount: 0,
      optional: false,
      order: 1,
    },
  ],
  rewards: {
    gold: 50,
    xp: 100,
    items: [
      // Starter supplies
      ['ITEM-starter-health-potion', 3],
      ['ITEM-starter-bread', 5],
    ],
    unlocks: ['crafting_tab', 'inventory_full'],
  },
  prerequisites: [],
  autoActivate: true,
  canFail: false,
  timeLimitSec: 0,
};

/**
 * MISSION_FIRST_HARVEST — second tutorial mission (unlocked after safe house).
 */
export const MISSION_FIRST_HARVEST: Mission = {
  id: 'MISSION_FIRST_HARVEST',
  title: 'First Harvest',
  description:
    'Now that you have shelter, gather some basic resources. ' +
    'Find a tree and harvest wood, then mine some stone from a rock.',
  category: 'tutorial',
  difficulty: 1,
  recommendedLevel: 1,
  objectives: [
    {
      id: 'harvest_wood',
      description: 'Harvest wood (0/3)',
      type: 'collect',
      targetItemIds: ['Pine Log', 'Oak Log', 'Birch Log'],
      requiredCount: 3,
      currentCount: 0,
      optional: false,
      order: 1,
    },
    {
      id: 'harvest_stone',
      description: 'Mine stone (0/2)',
      type: 'collect',
      targetItemIds: ['Iron Ore', 'Copper Ore', 'Rough Stone'],
      requiredCount: 2,
      currentCount: 0,
      optional: false,
      order: 2,
    },
  ],
  rewards: {
    gold: 25,
    xp: 75,
    professionXp: [['Mining', 10], ['Logging', 10]],
  },
  prerequisites: ['MISSION_SAFEHOUSE'],
  autoActivate: true,
  canFail: false,
  timeLimitSec: 0,
};

// ── Mission Catalog ──────────────────────────────────────────────────────────

/** All defined missions, keyed by ID */
export const MISSION_CATALOG: Record<string, Mission> = {
  [MISSION_SAFEHOUSE.id]: MISSION_SAFEHOUSE,
  [MISSION_FIRST_HARVEST.id]: MISSION_FIRST_HARVEST,
};

/**
 * Create initial player mission state for a newly activated mission.
 */
export function createPlayerMissionState(missionId: string): PlayerMissionState {
  const mission = MISSION_CATALOG[missionId];
  const objectiveProgress: Record<string, number> = {};
  if (mission) {
    for (const obj of mission.objectives) {
      objectiveProgress[obj.id] = 0;
    }
  }
  return {
    missionId,
    state: 'active',
    objectiveProgress,
    activatedAt: Date.now(),
    completedAt: 0,
  };
}
