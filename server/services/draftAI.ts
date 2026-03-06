/**
 * Draft AI Service - Adapted from SwainBot (https://github.com/lightd22/swainBot)
 * 
 * SwainBot uses RL/Q-learning to estimate draft submission values via a boolean state matrix.
 * We adapt this approach for Grudge Warlords crew composition:
 * - Characters replace champions (races × classes = unit pool)
 * - Positions map to crew roles (tank, dps, healer, support, flex)
 * - Draft state is a boolean matrix S[unit_id, role_id]
 * - Q-values estimate crew synergy and faction balance
 * 
 * Reference: E:\GrudgeDefense\swainBot (cloned)
 */

// Grudge races and classes
export const GRUDGE_RACES = ["human", "orc", "elf", "dwarf", "barbarian", "undead"] as const;
export const GRUDGE_CLASSES = ["warrior", "mage", "ranger", "shapeshifter"] as const;
export const CREW_ROLES = ["tank", "dps", "healer", "support", "flex"] as const;

export type GrudgeRace = (typeof GRUDGE_RACES)[number];
export type GrudgeClass = (typeof GRUDGE_CLASSES)[number];
export type CrewRole = (typeof CREW_ROLES)[number];

export interface DraftUnit {
  id: number;
  race: GrudgeRace;
  classId: GrudgeClass;
  name: string;
  baseStrength: number;
  synergies: string[];
}

export interface DraftAction {
  unitId: number;
  roleId: number;
}

export interface DraftState {
  matrix: boolean[][];  // [unitId][roleId] = true if unit assigned to role
  teamA: DraftAction[];
  teamB: DraftAction[];
  currentTeam: "A" | "B";
  turnNumber: number;
}

export interface DraftRecommendation {
  action: DraftAction;
  unit: DraftUnit;
  role: CrewRole;
  qValue: number;
  reasoning: string;
}

export interface CrewAnalysis {
  composition: DraftAction[];
  synergyScore: number;
  balanceScore: number;
  weaknesses: string[];
  strengths: string[];
  overallRating: number;
}

// Generate the unit pool (race × class combinations)
function generateUnitPool(): DraftUnit[] {
  const units: DraftUnit[] = [];
  let id = 0;

  for (const race of GRUDGE_RACES) {
    for (const classId of GRUDGE_CLASSES) {
      units.push({
        id: id++,
        race,
        classId,
        name: `${race}-${classId}`,
        baseStrength: getBaseStrength(race, classId),
        synergies: getSynergies(race, classId),
      });
    }
  }

  return units;
}

function getBaseStrength(race: GrudgeRace, classId: GrudgeClass): number {
  // Base strength values reflecting lore and game balance
  const raceBonus: Record<GrudgeRace, number> = {
    human: 50,
    orc: 55,
    elf: 48,
    dwarf: 52,
    barbarian: 58,
    undead: 45,
  };

  const classBonus: Record<GrudgeClass, number> = {
    warrior: 15,
    mage: 12,
    ranger: 13,
    shapeshifter: 14,
  };

  return raceBonus[race] + classBonus[classId];
}

function getSynergies(race: GrudgeRace, classId: GrudgeClass): string[] {
  const synergies: string[] = [];

  // Race synergies
  if (race === "orc") synergies.push("melee-bonus", "intimidation");
  if (race === "elf") synergies.push("magic-affinity", "ranged-precision");
  if (race === "dwarf") synergies.push("armor-bonus", "crafting-boost");
  if (race === "human") synergies.push("versatile", "leadership");
  if (race === "barbarian") synergies.push("berserker", "fear-immunity");
  if (race === "undead") synergies.push("death-magic", "lifesteal");

  // Class synergies
  if (classId === "warrior") synergies.push("frontline", "shield-wall");
  if (classId === "mage") synergies.push("aoe-damage", "teleport");
  if (classId === "ranger") synergies.push("scouting", "kiting");
  if (classId === "shapeshifter") synergies.push("form-versatility", "mount");

  return synergies;
}

// Role affinity scores (how well a class fits a role)
const ROLE_AFFINITY: Record<GrudgeClass, Record<CrewRole, number>> = {
  warrior: { tank: 0.95, dps: 0.7, healer: 0.1, support: 0.5, flex: 0.6 },
  mage: { tank: 0.1, dps: 0.85, healer: 0.6, support: 0.7, flex: 0.65 },
  ranger: { tank: 0.15, dps: 0.9, healer: 0.1, support: 0.4, flex: 0.7 },
  shapeshifter: { tank: 0.7, dps: 0.6, healer: 0.3, support: 0.8, flex: 0.9 },
};

// Race-race synergy bonuses when on same team
const RACE_SYNERGY: Record<string, number> = {
  "human-elf": 0.15,
  "human-dwarf": 0.12,
  "orc-barbarian": 0.18,
  "elf-shapeshifter": 0.16,
  "dwarf-warrior": 0.14,
  "undead-mage": 0.17,
  "orc-warrior": 0.13,
  "elf-ranger": 0.15,
  "barbarian-shapeshifter": 0.12,
};

const UNIT_POOL = generateUnitPool();

/**
 * Q-value estimation following SwainBot's approach:
 * Q(s, a) estimates the value of taking action a (assigning unit to role) in state s
 * 
 * We compute this as: roleAffinity * baseStrength * synergyBonus * balanceMultiplier
 */
function estimateQValue(
  state: DraftState,
  action: DraftAction,
  existingTeam: DraftAction[]
): number {
  const unit = UNIT_POOL[action.unitId];
  if (!unit) return 0;

  const role = CREW_ROLES[action.roleId];
  if (!role) return 0;

  // Base Q from role affinity
  let q = ROLE_AFFINITY[unit.classId][role] * unit.baseStrength;

  // Synergy bonus with existing team members
  for (const existing of existingTeam) {
    const existingUnit = UNIT_POOL[existing.unitId];
    if (!existingUnit) continue;

    // Race synergy
    const synergyKey1 = `${unit.race}-${existingUnit.race}`;
    const synergyKey2 = `${existingUnit.race}-${unit.race}`;
    const raceSynergy = RACE_SYNERGY[synergyKey1] || RACE_SYNERGY[synergyKey2] || 0;
    q *= 1 + raceSynergy;

    // Class diversity bonus
    if (unit.classId !== existingUnit.classId) {
      q *= 1.05;
    }

    // Same class penalty (avoid duplicate roles)
    if (unit.classId === existingUnit.classId) {
      q *= 0.85;
    }
  }

  // Balance multiplier - penalize teams with too many of the same class
  const classCounts: Record<string, number> = {};
  for (const existing of existingTeam) {
    const eu = UNIT_POOL[existing.unitId];
    if (eu) classCounts[eu.classId] = (classCounts[eu.classId] || 0) + 1;
  }
  if (classCounts[unit.classId] && classCounts[unit.classId] >= 2) {
    q *= 0.7;
  }

  // Team size bonus (fuller teams get diminishing returns)
  if (existingTeam.length >= 4) q *= 0.9;

  return Math.round(q * 100) / 100;
}

/**
 * Get top N draft recommendations for the current state
 * Follows SwainBot's approach of ranking actions by Q-value
 */
export function getDraftRecommendations(
  state: DraftState,
  topN: number = 5
): DraftRecommendation[] {
  const team = state.currentTeam === "A" ? state.teamA : state.teamB;
  const assignedUnitIds = new Set([
    ...state.teamA.map((a) => a.unitId),
    ...state.teamB.map((a) => a.unitId),
  ]);

  const candidates: DraftRecommendation[] = [];

  for (const unit of UNIT_POOL) {
    if (assignedUnitIds.has(unit.id)) continue;

    for (let roleIdx = 0; roleIdx < CREW_ROLES.length; roleIdx++) {
      // Skip if this role is already filled on the team
      const roleAlreadyFilled = team.some((a) => a.roleId === roleIdx);
      if (roleAlreadyFilled) continue;

      const action: DraftAction = { unitId: unit.id, roleId: roleIdx };
      const qValue = estimateQValue(state, action, team);

      candidates.push({
        action,
        unit,
        role: CREW_ROLES[roleIdx],
        qValue,
        reasoning: generateReasoning(unit, CREW_ROLES[roleIdx], qValue, team),
      });
    }
  }

  // Sort by Q-value descending and return top N
  candidates.sort((a, b) => b.qValue - a.qValue);
  return candidates.slice(0, topN);
}

function generateReasoning(
  unit: DraftUnit,
  role: CrewRole,
  qValue: number,
  existingTeam: DraftAction[]
): string {
  const affinity = ROLE_AFFINITY[unit.classId][role];
  const parts: string[] = [];

  if (affinity >= 0.8) {
    parts.push(`${unit.classId} excels as ${role}`);
  } else if (affinity >= 0.5) {
    parts.push(`${unit.classId} is capable as ${role}`);
  } else {
    parts.push(`${unit.classId} is unconventional as ${role}`);
  }

  // Check synergies with existing team
  for (const existing of existingTeam) {
    const eu = UNIT_POOL[existing.unitId];
    if (!eu) continue;
    const key1 = `${unit.race}-${eu.race}`;
    const key2 = `${eu.race}-${unit.race}`;
    if (RACE_SYNERGY[key1] || RACE_SYNERGY[key2]) {
      parts.push(`synergy with ${eu.race} ${eu.classId}`);
    }
  }

  return parts.join("; ");
}

/**
 * Analyze a complete crew composition
 */
export function analyzeCrewComposition(team: DraftAction[]): CrewAnalysis {
  let synergyScore = 0;
  let balanceScore = 100;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const classCounts: Record<string, number> = {};
  const raceCounts: Record<string, number> = {};
  const roles = new Set<number>();

  for (const action of team) {
    const unit = UNIT_POOL[action.unitId];
    if (!unit) continue;
    classCounts[unit.classId] = (classCounts[unit.classId] || 0) + 1;
    raceCounts[unit.race] = (raceCounts[unit.race] || 0) + 1;
    roles.add(action.roleId);
  }

  // Class diversity scoring
  const uniqueClasses = Object.keys(classCounts).length;
  if (uniqueClasses >= 3) {
    strengths.push("Good class diversity");
    balanceScore += 10;
  }
  if (uniqueClasses <= 1 && team.length > 2) {
    weaknesses.push("Mono-class composition is easily countered");
    balanceScore -= 20;
  }

  // Check for tank
  const hasTank = team.some(
    (a) => UNIT_POOL[a.unitId]?.classId === "warrior" || UNIT_POOL[a.unitId]?.classId === "shapeshifter"
  );
  if (!hasTank && team.length >= 3) {
    weaknesses.push("No frontline tank");
    balanceScore -= 15;
  } else if (hasTank) {
    strengths.push("Has frontline presence");
  }

  // Check for ranged
  const hasRanged = team.some(
    (a) => UNIT_POOL[a.unitId]?.classId === "ranger" || UNIT_POOL[a.unitId]?.classId === "mage"
  );
  if (!hasRanged && team.length >= 3) {
    weaknesses.push("No ranged damage dealer");
    balanceScore -= 10;
  }

  // Race synergy computation
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const unitA = UNIT_POOL[team[i].unitId];
      const unitB = UNIT_POOL[team[j].unitId];
      if (!unitA || !unitB) continue;

      const key1 = `${unitA.race}-${unitB.race}`;
      const key2 = `${unitB.race}-${unitA.race}`;
      const synergy = RACE_SYNERGY[key1] || RACE_SYNERGY[key2] || 0;
      if (synergy > 0) {
        synergyScore += synergy * 100;
        strengths.push(`${unitA.race}+${unitB.race} synergy`);
      }
    }
  }

  // Role coverage
  if (roles.size >= 3) {
    strengths.push("Good role coverage");
    balanceScore += 5;
  }

  const overallRating = Math.min(100, Math.max(0, balanceScore + synergyScore));

  return {
    composition: team,
    synergyScore: Math.round(synergyScore),
    balanceScore: Math.min(100, Math.max(0, balanceScore)),
    weaknesses,
    strengths,
    overallRating: Math.round(overallRating),
  };
}

/**
 * Create a new empty draft state
 */
export function createDraftState(): DraftState {
  const numUnits = UNIT_POOL.length;
  const numRoles = CREW_ROLES.length;

  return {
    matrix: Array.from({ length: numUnits }, () =>
      Array.from({ length: numRoles }, () => false)
    ),
    teamA: [],
    teamB: [],
    currentTeam: "A",
    turnNumber: 0,
  };
}

/**
 * Apply an action to the draft state
 */
export function applyDraftAction(
  state: DraftState,
  action: DraftAction
): DraftState {
  const newState = {
    ...state,
    matrix: state.matrix.map((row) => [...row]),
    teamA: [...state.teamA],
    teamB: [...state.teamB],
  };

  newState.matrix[action.unitId][action.roleId] = true;

  if (state.currentTeam === "A") {
    newState.teamA.push(action);
  } else {
    newState.teamB.push(action);
  }

  newState.turnNumber++;
  // Alternate teams (A picks, B picks, etc.)
  newState.currentTeam = state.currentTeam === "A" ? "B" : "A";

  return newState;
}

export function getUnitPool(): DraftUnit[] {
  return UNIT_POOL;
}

export function getUnitById(id: number): DraftUnit | undefined {
  return UNIT_POOL.find((u) => u.id === id);
}

export function getUnitsByRace(race: GrudgeRace): DraftUnit[] {
  return UNIT_POOL.filter((u) => u.race === race);
}

export function getUnitsByClass(classId: GrudgeClass): DraftUnit[] {
  return UNIT_POOL.filter((u) => u.classId === classId);
}
