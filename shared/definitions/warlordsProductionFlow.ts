/**
 * Warlords production deployment pipeline (grudgewarlords.com / client.grudge-studio.com)
 *
 * Canonical player journey:
 *   1. Opening scene (/intro)
 *   2. Character creation (GCS create → return here)
 *   3. Tutorial shipwreck (/tutorial)
 *   4. Open world grind (/play · /island-3d lobby)
 *   5. Home island (/home-island) — unlocks at level ≥ 20
 *
 * Real wall-clock for ops; game clock for sky/tides (see gameClock.ts).
 */

export const WARLORDS_HOME_ISLAND_MIN_LEVEL = 20 as const;

export type WarlordsFlowStepId =
  | 'opening_scene'
  | 'character_create'
  | 'tutorial'
  | 'open_world'
  | 'home_island'
  | 'world_map';

export interface WarlordsFlowStep {
  id: WarlordsFlowStepId;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  /** Same-origin path (query optional) */
  path: string;
  /** Minimum character level to enter (0 = always) */
  minLevel: number;
  /** Requires authenticated account */
  requiresAuth: boolean;
  /** Requires an active character id in localStorage / session */
  requiresCharacter: boolean;
  /** Local flag key when step is completed (optional) */
  completeFlagKey?: string;
  icon: string;
  badge: string;
}

/** Ordered production path — single SSOT for /home cards and /warlords router */
export const WARLORDS_PRODUCTION_FLOW: WarlordsFlowStep[] = [
  {
    id: 'opening_scene',
    order: 10,
    title: 'Opening Scene',
    subtitle: 'Warlords intro · fleet video',
    description:
      'Cinematic entry with race portraits and Warlords era load-in video. Enter the world and sign in if needed.',
    path: '/intro',
    minLevel: 0,
    requiresAuth: false,
    requiresCharacter: false,
    completeFlagKey: 'warlords_opening_seen_v1',
    icon: 'film',
    badge: 'Start',
  },
  {
    id: 'character_create',
    order: 20,
    title: 'Character Creation',
    subtitle: 'GCS · Warlords era · unarmed race',
    description:
      'Create your hero in Grudge Character Studio (Warlords era). Returns to the tutorial when done.',
    path: '/create-character',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: false,
    icon: 'user-plus',
    badge: 'Create',
  },
  {
    id: 'tutorial',
    order: 30,
    title: 'Shipwreck Tutorial',
    subtitle: 'Solo wash-up · T0 harvest · raft',
    description:
      'Private Colyseus tutorial: injured opener, sticks/stones, campfire, combat, craft raft. Completes before open-world multiplayer.',
    path: '/tutorial',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_tutorial_complete_v1',
    icon: 'flame',
    badge: 'Learn',
  },
  {
    id: 'open_world',
    order: 40,
    title: 'Warlords Open World',
    subtitle: '9 sectors · race capitals · Fabled core',
    description:
      'Shared MMO: start Haven Port (Fruzer foundation). World map opens all 9 sectors. Frostbite/Runeforge Hold is Fabled core (fabledzone.glb) with cave portals into the dwarf main city. Towns, NPCs, island events, and bosses are production-catalog + D1 seeded.',
    path: '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'globe',
    badge: 'Play',
  },
  {
    id: 'home_island',
    order: 50,
    title: 'Home Island · End Game',
    subtitle: `Level ${WARLORDS_HOME_ISLAND_MIN_LEVEL}+ · talk to faction captain`,
    description:
      'At level 20, speak with your race captain on the faction island. Accept mission “End Game”: cannon fire, ship sinks, all models jump off (abandon ship — no throw). Then spawn home island at /homeisland.',
    path: '/homeisland?cinematic=abandon-ship&from=end-game',
    minLevel: WARLORDS_HOME_ISLAND_MIN_LEVEL,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'leaf',
    badge: `Lv ${WARLORDS_HOME_ISLAND_MIN_LEVEL}`,
  },
  {
    id: 'world_map',
    order: 60,
    title: 'World Map',
    subtitle: '6 race cities · 9 sectors · sail',
    description:
      'Unity-style Warlords map hub after you have a foothold in the world. Available once tutorial is done.',
    path: '/world-map',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_tutorial_complete_v1',
    icon: 'map',
    badge: 'Hub',
  },
];

export const WARLORDS_FLOW_BY_ID: Record<WarlordsFlowStepId, WarlordsFlowStep> =
  Object.fromEntries(WARLORDS_PRODUCTION_FLOW.map((s) => [s.id, s])) as Record<
    WarlordsFlowStepId,
    WarlordsFlowStep
  >;

/** Session / local flags */
export const WARLORDS_FLOW_FLAGS = {
  openingSeen: 'warlords_opening_seen_v1',
  tutorialComplete: 'warlords_tutorial_complete_v1',
  homeIslandUnlockedShown: 'warlords_home_island_unlock_toast_v1',
} as const;

export interface WarlordsProgressInput {
  isAuthenticated: boolean;
  hasCharacter: boolean;
  characterLevel: number;
  /** localStorage flags */
  flags: {
    openingSeen?: boolean;
    tutorialComplete?: boolean;
  };
  /** True if home_islands row exists for account */
  hasHomeIsland?: boolean;
}

export interface WarlordsProgressResult {
  /** Recommended next step id */
  nextStepId: WarlordsFlowStepId;
  nextPath: string;
  /** All steps with lock state for UI */
  steps: Array<
    WarlordsFlowStep & {
      locked: boolean;
      lockReason?: string;
      done: boolean;
      isNext: boolean;
    }
  >;
  homeIslandUnlocked: boolean;
  homeIslandMinLevel: typeof WARLORDS_HOME_ISLAND_MIN_LEVEL;
}

/**
 * Resolve where the player should go next in production Warlords.
 */
export function resolveWarlordsProgress(input: WarlordsProgressInput): WarlordsProgressResult {
  const level = Math.max(0, Math.floor(input.characterLevel || 0));
  const homeIslandUnlocked = level >= WARLORDS_HOME_ISLAND_MIN_LEVEL;
  const tutorialDone = !!input.flags.tutorialComplete;
  const openingSeen = !!input.flags.openingSeen;

  const steps = WARLORDS_PRODUCTION_FLOW.map((step) => {
    let locked = false;
    let lockReason: string | undefined;
    let done = false;

    if (step.id === 'opening_scene') {
      done = openingSeen;
    } else if (step.id === 'character_create') {
      done = input.hasCharacter;
      if (!input.isAuthenticated) {
        locked = true;
        lockReason = 'Sign in required';
      }
    } else if (step.id === 'tutorial') {
      done = tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'open_world') {
      done = tutorialDone && level > 1;
      if (!tutorialDone) {
        locked = true;
        lockReason = 'Finish the shipwreck tutorial';
      } else if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'home_island') {
      done = homeIslandUnlocked && !!input.hasHomeIsland;
      if (!homeIslandUnlocked) {
        locked = true;
        lockReason = `Reach level ${WARLORDS_HOME_ISLAND_MIN_LEVEL} (now ${level || 1})`;
      } else if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'world_map') {
      done = tutorialDone;
      if (!tutorialDone) {
        locked = true;
        lockReason = 'Finish the tutorial first';
      }
    }

    if (step.minLevel > 0 && level < step.minLevel) {
      locked = true;
      lockReason = lockReason || `Requires level ${step.minLevel}`;
    }

    return { ...step, locked, lockReason, done, isNext: false };
  });

  // Next step priority
  let nextStepId: WarlordsFlowStepId = 'opening_scene';
  if (!openingSeen && !input.hasCharacter) nextStepId = 'opening_scene';
  else if (!input.hasCharacter) nextStepId = 'character_create';
  else if (!tutorialDone) nextStepId = 'tutorial';
  else if (homeIslandUnlocked && !input.hasHomeIsland) nextStepId = 'home_island';
  else if (homeIslandUnlocked) nextStepId = 'home_island';
  else nextStepId = 'open_world';

  const next = steps.find((s) => s.id === nextStepId) ?? steps[0];
  for (const s of steps) {
    s.isNext = s.id === nextStepId;
  }

  return {
    nextStepId,
    nextPath: next.path,
    steps,
    homeIslandUnlocked,
    homeIslandMinLevel: WARLORDS_HOME_ISLAND_MIN_LEVEL,
  };
}

/** Path helpers with characterId */
export function warlordsStepUrl(
  stepId: WarlordsFlowStepId,
  opts?: { characterId?: string; force?: boolean },
): string {
  const step = WARLORDS_FLOW_BY_ID[stepId];
  let path = step.path;
  if (opts?.characterId) {
    const sep = path.includes('?') ? '&' : '?';
    path = `${path}${sep}characterId=${encodeURIComponent(opts.characterId)}`;
  }
  if (opts?.force && stepId === 'home_island') {
    const sep = path.includes('?') ? '&' : '?';
    path = `${path}${sep}unlock=1`;
  }
  return path;
}

/** After tutorial complete — open world, not home island (level 20 gate) */
export const AFTER_TUTORIAL_PATH =
  '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port&from=tutorial' as const;

/** When level 20 hit first time — island create cinematic if needed */
export const HOME_ISLAND_UNLOCK_PATH = '/island-reveal?from=level-20' as const;
export const HOME_ISLAND_PLAY_PATH = '/home-island' as const;
