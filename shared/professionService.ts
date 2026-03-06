import { 
  PROFESSION_LEVEL_THRESHOLDS, 
  PROFESSION_DECAY_GRACE_PERIOD_MS,
  PROFESSION_DECAY_FULL_PERIOD_MS,
  PROFESSION_MIN_LEVEL_AFTER_DECAY,
  type ProfessionId 
} from './schema';

export type XPGainSource = 
  | 'idle_harvesting' 
  | 'combat' 
  | 'dungeon_clear' 
  | 'crafting' 
  | 'quest' 
  | 'profession_use'
  | 'gathering'
  | 'refining';

export interface ProfessionXPResult {
  xpGained: number;
  levelGained: boolean;
  newLevel: number;
  newXp: number;
}

export function getLevelFromXP(totalXp: number): number {
  for (let level = 100; level >= 1; level--) {
    if (totalXp >= PROFESSION_LEVEL_THRESHOLDS[level]) {
      return level;
    }
  }
  return 1;
}

export function getXPForLevel(level: number): number {
  return PROFESSION_LEVEL_THRESHOLDS[level] || 0;
}

export function getXPToNextLevel(currentLevel: number, currentXp: number): number {
  if (currentLevel >= 100) return 0;
  const nextLevelXp = PROFESSION_LEVEL_THRESHOLDS[currentLevel + 1];
  return nextLevelXp - currentXp;
}

export function canGainXPFromSource(
  source: XPGainSource, 
  professionLevel: number
): boolean {
  if (professionLevel < 50) {
    return true;
  }
  
  if (professionLevel >= 50 && professionLevel < 90) {
    const allowedSources: XPGainSource[] = ['gathering', 'crafting', 'refining'];
    return allowedSources.includes(source);
  }
  
  if (professionLevel >= 90) {
    const allowedSources: XPGainSource[] = ['gathering', 'crafting'];
    return allowedSources.includes(source);
  }
  
  return false;
}

export function getXPMultiplier(source: XPGainSource, professionLevel: number): number {
  if (professionLevel < 50) {
    return 1.0;
  }
  
  if (professionLevel >= 50 && professionLevel < 90) {
    const sourceMultipliers: Record<XPGainSource, number> = {
      'gathering': 0.8,
      'crafting': 0.8,
      'refining': 0.6,
      'idle_harvesting': 0,
      'combat': 0,
      'dungeon_clear': 0,
      'quest': 0,
      'profession_use': 0,
    };
    return sourceMultipliers[source];
  }
  
  if (professionLevel >= 90) {
    const sourceMultipliers: Record<XPGainSource, number> = {
      'gathering': 0.5,
      'crafting': 0.5,
      'refining': 0,
      'idle_harvesting': 0,
      'combat': 0,
      'dungeon_clear': 0,
      'quest': 0,
      'profession_use': 0,
    };
    return sourceMultipliers[source];
  }
  
  return 0;
}

export function calculateProfessionXPGain(
  baseXp: number,
  source: XPGainSource,
  currentLevel: number,
  currentXp: number
): ProfessionXPResult {
  if (!canGainXPFromSource(source, currentLevel)) {
    return {
      xpGained: 0,
      levelGained: false,
      newLevel: currentLevel,
      newXp: currentXp,
    };
  }

  const multiplier = getXPMultiplier(source, currentLevel);
  const xpGained = Math.floor(baseXp * multiplier);
  
  if (xpGained === 0) {
    return {
      xpGained: 0,
      levelGained: false,
      newLevel: currentLevel,
      newXp: currentXp,
    };
  }

  const newXp = currentXp + xpGained;
  const newLevel = getLevelFromXP(newXp);
  
  return {
    xpGained,
    levelGained: newLevel > currentLevel,
    newLevel,
    newXp,
  };
}

export interface DecayResult {
  decayApplied: boolean;
  levelsLost: number;
  newLevel: number;
  newXp: number;
}

export function calculateProfessionDecay(
  currentLevel: number,
  currentXp: number,
  lastGainAt: number | null,
  lastDecayCheckAt: number | null,
  now: number = Date.now()
): DecayResult & { newLastDecayCheckAt: number } {
  const result = {
    decayApplied: false,
    levelsLost: 0,
    newLevel: currentLevel,
    newXp: currentXp,
    newLastDecayCheckAt: now,
  };

  if (currentLevel <= PROFESSION_MIN_LEVEL_AFTER_DECAY) {
    return result;
  }

  if (!lastGainAt) {
    return result;
  }

  const timeSinceGain = now - lastGainAt;
  
  if (timeSinceGain < PROFESSION_DECAY_GRACE_PERIOD_MS) {
    return result;
  }

  const decayStartTime = lastGainAt + PROFESSION_DECAY_GRACE_PERIOD_MS;
  const lastCheck = lastDecayCheckAt || decayStartTime;
  
  if (lastCheck >= now) {
    return result;
  }
  
  const timeSinceLastCheck = now - Math.max(lastCheck, decayStartTime);
  
  if (timeSinceLastCheck <= 0) {
    return result;
  }
  
  const xpAtLevel100 = PROFESSION_LEVEL_THRESHOLDS[100];
  const xpAtLevel50 = PROFESSION_LEVEL_THRESHOLDS[50];
  const xpRange = xpAtLevel100 - xpAtLevel50;
  
  const decayRate = xpRange / PROFESSION_DECAY_FULL_PERIOD_MS;
  
  const xpToDecay = Math.floor(decayRate * timeSinceLastCheck);
  
  if (xpToDecay === 0) {
    return result;
  }

  let newXp = Math.max(xpAtLevel50, currentXp - xpToDecay);
  let newLevel = getLevelFromXP(newXp);
  
  if (newLevel < PROFESSION_MIN_LEVEL_AFTER_DECAY) {
    newLevel = PROFESSION_MIN_LEVEL_AFTER_DECAY;
    newXp = PROFESSION_LEVEL_THRESHOLDS[PROFESSION_MIN_LEVEL_AFTER_DECAY];
  }

  return {
    decayApplied: true,
    levelsLost: currentLevel - newLevel,
    newLevel,
    newXp,
    newLastDecayCheckAt: now,
  };
}

export const GATHERING_PROFESSIONS: ProfessionId[] = [
  'mining', 'logging', 'skinning', 'fishing', 'herbalism', 'scavenging'
];

export const CRAFTING_PROFESSIONS: ProfessionId[] = [
  'miner', 'forester', 'mystic', 'engineer', 'chef'
];

export function getRelatedProfessions(professionId: ProfessionId): ProfessionId[] {
  const relationships: Record<ProfessionId, ProfessionId[]> = {
    'mining': ['miner', 'engineer', 'mystic'],
    'logging': ['forester', 'engineer'],
    'skinning': ['forester', 'chef', 'mystic'],
    'fishing': ['chef', 'mystic'],
    'herbalism': ['chef', 'mystic', 'forester'],
    'scavenging': ['engineer', 'miner'],
    'miner': ['mining', 'scavenging'],
    'forester': ['logging', 'skinning', 'herbalism'],
    'mystic': ['mining', 'skinning', 'fishing', 'herbalism'],
    'engineer': ['mining', 'logging', 'scavenging'],
    'chef': ['skinning', 'fishing', 'herbalism'],
  };
  
  return relationships[professionId] || [];
}

export function getBaseXPForActivity(
  activity: string,
  tier: number = 1,
  quantity: number = 1
): number {
  const baseXpByActivity: Record<string, number> = {
    'gather_resource': 10,
    'craft_item': 25,
    'refine_material': 15,
    'use_profession_item': 5,
    'complete_quest': 50,
    'clear_dungeon': 100,
    'win_combat': 20,
    'idle_harvest': 2,
  };

  const base = baseXpByActivity[activity] || 5;
  const tierMultiplier = 1 + (tier - 1) * 0.5;
  
  return Math.floor(base * tierMultiplier * quantity);
}
