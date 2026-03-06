// Character State Machine for Island Activities
// Manages character activities: idle, harvesting, patrolling, crafting, sleeping, etc.

export type CharacterActivityState = 
  | 'idle'
  | 'walking'
  | 'harvesting'
  | 'auto_harvesting'
  | 'refining'
  | 'patrolling'
  | 'crafting'
  | 'sleeping'
  | 'combat'
  | 'onwater'
  | 'skinning';

export type LocationType = 'land' | 'water' | 'building';

export interface CharacterLocation {
  worldX: number;         // World X coordinate (0-100)
  worldY: number;         // World Y coordinate (0-100)
  targetX?: number;       // Movement target X
  targetY?: number;       // Movement target Y
  facing: 'left' | 'right';
  locationType: LocationType;
  zoneId?: string;        // Optional zone/area ID
}

// Stamina configuration
export const STAMINA_CONFIG = {
  maxStamina: 100,
  lowStaminaThreshold: 15,   // Below this, character must sleep
  sleepRecoveryRate: 10,     // Stamina recovered per minute while sleeping
  baseHarvestCost: 5,        // Base stamina cost per harvest action
  
  // Node rarity multipliers for stamina cost
  rarityMultipliers: {
    common: 1.0,
    rare: 1.5,
    epic: 2.0,
    legendary: 2.5,
  } as Record<string, number>,
  
  // Profession level reduces stamina cost (higher level = less cost)
  getProfessionDiscount: (professionLevel: number): number => {
    // Level 1 = 0% discount, Level 100 = 50% discount
    return Math.min(0.5, professionLevel * 0.005);
  },
} as const;

// Calculate stamina cost for harvesting a node
export function calculateHarvestStaminaCost(
  nodeRarity: string,
  professionLevel: number = 1
): number {
  const baseCost = STAMINA_CONFIG.baseHarvestCost;
  const rarityMult = STAMINA_CONFIG.rarityMultipliers[nodeRarity] || 1.0;
  const discount = STAMINA_CONFIG.getProfessionDiscount(professionLevel);
  
  return Math.max(1, Math.floor(baseCost * rarityMult * (1 - discount)));
}

// Check if character has enough stamina to harvest
export function canHarvestWithStamina(
  currentStamina: number,
  nodeRarity: string,
  professionLevel: number = 1
): boolean {
  const cost = calculateHarvestStaminaCost(nodeRarity, professionLevel);
  return currentStamina >= cost;
}

// Check if character needs to sleep (stamina too low)
export function needsSleep(currentStamina: number): boolean {
  return currentStamina < STAMINA_CONFIG.lowStaminaThreshold;
}

// Calculate stamina recovery from sleeping
export function calculateSleepRecovery(sleepDurationMinutes: number): number {
  return Math.min(
    STAMINA_CONFIG.maxStamina,
    Math.floor(sleepDurationMinutes * STAMINA_CONFIG.sleepRecoveryRate)
  );
}

export interface CharacterStateData {
  characterId: string;
  state: CharacterActivityState;
  location: CharacterLocation;
  stateStartTime: number; // When current state started
  stateDuration?: number; // Expected duration for timed states
  targetNodeId?: string;  // For harvesting/refining
  patrolRoute?: string[]; // For patrolling
  craftingRecipeId?: string; // For crafting
  animationOverride?: string; // Force specific animation
  
  // Stamina system
  stamina: number;           // Current stamina (0-100)
  lastStaminaUpdate: number; // Timestamp of last stamina change
  harvestCount: number;      // Number of successful harvests this session
  totalXpEarned: number;     // Total XP earned this session
}

// State transition rules
export const STATE_TRANSITIONS: Record<CharacterActivityState, CharacterActivityState[]> = {
  idle: ['walking', 'harvesting', 'auto_harvesting', 'patrolling', 'crafting', 'sleeping', 'combat', 'skinning'],
  walking: ['idle', 'harvesting', 'auto_harvesting', 'patrolling', 'crafting', 'sleeping', 'combat', 'onwater', 'skinning'],
  harvesting: ['idle', 'walking', 'combat'],
  auto_harvesting: ['idle', 'walking', 'combat'],
  refining: ['idle', 'walking', 'combat'],
  patrolling: ['idle', 'walking', 'combat', 'harvesting'],
  crafting: ['idle', 'walking', 'combat'],
  sleeping: ['idle', 'combat'],
  combat: ['idle', 'walking'],
  onwater: ['idle', 'walking', 'harvesting'],
  skinning: ['idle', 'walking', 'combat'],
};

// Animation mapping for each state
export const STATE_ANIMATIONS: Record<CharacterActivityState, string> = {
  idle: 'Idle',
  walking: 'Walk',
  harvesting: 'Attack',
  auto_harvesting: 'Attack',
  refining: 'Idle',
  patrolling: 'Walk',
  crafting: 'Idle',
  sleeping: 'Idle',
  combat: 'Attack',
  onwater: 'Idle',
  skinning: 'Attack',
};

// Check if a state transition is valid
export function canTransitionTo(
  currentState: CharacterActivityState,
  newState: CharacterActivityState
): boolean {
  return STATE_TRANSITIONS[currentState]?.includes(newState) ?? false;
}

// Create initial character state
export function createCharacterState(
  characterId: string,
  worldX: number,
  worldY: number,
  initialStamina: number = STAMINA_CONFIG.maxStamina
): CharacterStateData {
  return {
    characterId,
    state: 'idle',
    location: {
      worldX,
      worldY,
      facing: 'right',
      locationType: 'land',
    },
    stateStartTime: Date.now(),
    stamina: initialStamina,
    lastStaminaUpdate: Date.now(),
    harvestCount: 0,
    totalXpEarned: 0,
  };
}

// Consume stamina for harvesting
export function consumeStamina(
  state: CharacterStateData,
  nodeRarity: string,
  professionLevel: number = 1
): CharacterStateData {
  const cost = calculateHarvestStaminaCost(nodeRarity, professionLevel);
  const newStamina = Math.max(0, state.stamina - cost);
  
  return {
    ...state,
    stamina: newStamina,
    lastStaminaUpdate: Date.now(),
    harvestCount: state.harvestCount + 1,
  };
}

// Update stamina from sleeping
export function recoverStamina(
  state: CharacterStateData
): CharacterStateData {
  if (state.state !== 'sleeping') return state;
  
  const sleepMinutes = (Date.now() - state.stateStartTime) / 60000;
  const recovery = calculateSleepRecovery(sleepMinutes);
  const newStamina = Math.min(STAMINA_CONFIG.maxStamina, state.stamina + recovery);
  
  return {
    ...state,
    stamina: newStamina,
    lastStaminaUpdate: Date.now(),
  };
}

// Check if fully rested
export function isFullyRested(state: CharacterStateData): boolean {
  return state.stamina >= STAMINA_CONFIG.maxStamina * 0.9; // 90% is "full"
}

// Transition character to new state
export function transitionState(
  current: CharacterStateData,
  newState: CharacterActivityState,
  options: Partial<CharacterStateData> = {}
): CharacterStateData | null {
  if (!canTransitionTo(current.state, newState)) {
    console.warn(`Invalid state transition: ${current.state} -> ${newState}`);
    return null;
  }
  
  return {
    ...current,
    ...options,
    state: newState,
    stateStartTime: Date.now(),
  };
}

// Update character location
export function updateLocation(
  current: CharacterStateData,
  worldX: number,
  worldY: number,
  locationType?: LocationType
): CharacterStateData {
  const facing = worldX > current.location.worldX ? 'right' : 
                 worldX < current.location.worldX ? 'left' : 
                 current.location.facing;
  
  return {
    ...current,
    location: {
      ...current.location,
      worldX,
      worldY,
      facing,
      locationType: locationType ?? current.location.locationType,
    },
  };
}

// Set movement target
export function setMovementTarget(
  current: CharacterStateData,
  targetX: number,
  targetY: number
): CharacterStateData {
  const facing = targetX > current.location.worldX ? 'right' : 
                 targetX < current.location.worldX ? 'left' : 
                 current.location.facing;
  
  return {
    ...current,
    state: 'walking',
    stateStartTime: Date.now(),
    location: {
      ...current.location,
      targetX,
      targetY,
      facing,
    },
  };
}

// Check if character has reached target
export function hasReachedTarget(
  state: CharacterStateData,
  threshold: number = 1
): boolean {
  const { worldX, worldY, targetX, targetY } = state.location;
  if (targetX === undefined || targetY === undefined) return true;
  
  const dx = targetX - worldX;
  const dy = targetY - worldY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= threshold;
}

// Calculate movement step
export function calculateMovementStep(
  state: CharacterStateData,
  speed: number, // World units per second
  deltaTime: number // Milliseconds
): { x: number; y: number } | null {
  const { worldX, worldY, targetX, targetY } = state.location;
  if (targetX === undefined || targetY === undefined) return null;
  
  const dx = targetX - worldX;
  const dy = targetY - worldY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 0.1) return null;
  
  const moveDistance = speed * (deltaTime / 1000);
  const ratio = Math.min(1, moveDistance / distance);
  
  return {
    x: worldX + dx * ratio,
    y: worldY + dy * ratio,
  };
}

// Get remaining duration for timed states
export function getStateTimeRemaining(state: CharacterStateData): number | null {
  if (!state.stateDuration) return null;
  const elapsed = Date.now() - state.stateStartTime;
  return Math.max(0, state.stateDuration - elapsed);
}

// Check if timed state is complete
export function isStateComplete(state: CharacterStateData): boolean {
  if (!state.stateDuration) return false;
  return Date.now() - state.stateStartTime >= state.stateDuration;
}

// Get the appropriate animation for current state
export function getStateAnimation(state: CharacterStateData): string {
  return state.animationOverride || STATE_ANIMATIONS[state.state] || 'Idle';
}

// State display names for UI
export const STATE_DISPLAY_NAMES: Record<CharacterActivityState, string> = {
  idle: 'Idle',
  walking: 'Walking',
  harvesting: 'Harvesting',
  auto_harvesting: 'Auto-Harvesting',
  refining: 'Refining',
  patrolling: 'Patrolling',
  crafting: 'Crafting',
  sleeping: 'Resting',
  combat: 'In Combat',
  onwater: 'On Water',
  skinning: 'Skinning',
};

// State colors for UI indicators
export const STATE_COLORS: Record<CharacterActivityState, string> = {
  idle: 'bg-slate-500',
  walking: 'bg-blue-500',
  harvesting: 'bg-green-500',
  auto_harvesting: 'bg-emerald-500',
  refining: 'bg-orange-500',
  patrolling: 'bg-yellow-500',
  crafting: 'bg-purple-500',
  sleeping: 'bg-indigo-500',
  combat: 'bg-red-500',
  onwater: 'bg-cyan-500',
  skinning: 'bg-amber-500',
};
