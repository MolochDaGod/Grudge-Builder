/**
 * Warlords production deployment pipeline (grudgewarlords.com runtime)
 *
 * Canonical player journey (2026-08 happy path):
 *   1. Opening intro video
 *   2. Character creation (Foundry / GCS)
 *   3. Airship — Warlords era 4-character scene (player + 3 crew) · also /combat
 *   4. Tutorial island (shipwreck) — required once
 *   5. Craft raft → complete tutorial
 *   6. Home-island intro + creation (given after tutorial — NOT level 20)
 *   7. Open world / map
 *
 * Skip rules:
 *   - If account already has a home island → never force tutorial again
 *   - If tutorial complete flag is set → home island create/play
 *
 * Ops zone testing: https://info.grudge-studio.com/WORLD_MAP.html
 */

/** Home island unlocks after tutorial + raft — level is never a gate. */
export const WARLORDS_HOME_ISLAND_MIN_LEVEL = 1 as const;

export type WarlordsFlowStepId =
  | 'opening_scene'
  | 'character_create'
  | 'airship'
  | 'tutorial'
  | 'home_island'
  | 'world_map'
  | 'open_world';

export interface WarlordsFlowStep {
  id: WarlordsFlowStepId;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  /** Same-origin path (query optional) */
  path: string;
  /** Minimum character level to enter (0 = always). Home island does NOT use level. */
  minLevel: number;
  requiresAuth: boolean;
  requiresCharacter: boolean;
  completeFlagKey?: string;
  icon: string;
  badge: string;
}

/** Ordered production path — single happy path SSOT */
export const WARLORDS_PRODUCTION_FLOW: WarlordsFlowStep[] = [
  {
    id: 'opening_scene',
    order: 10,
    title: 'Opening Scene',
    subtitle: 'Warlords intro video',
    description:
      'Era cinematic. Enter the app — sign in if needed, then create or pick a hero.',
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
    subtitle: 'Foundry · Warlords era · grudge6',
    description:
      'Create your hero at character.grudge-studio.com (Foundry). Returns via /airship with characterId.',
    path: '/create-character',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: false,
    icon: 'user-plus',
    badge: 'Create',
  },
  {
    id: 'airship',
    order: 30,
    title: 'Airship · Combat Tab',
    subtitle: '4-character Warlords era scene',
    description:
      'Player captain + John Wayne (helm), Scourge (bow), Racalvin (mentor). /combat and /airship-zone are this scene.',
    path: '/combat',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_airship_seen_v1',
    icon: 'anchor',
    badge: 'Crew',
  },
  {
    id: 'tutorial',
    order: 40,
    title: 'Tutorial Island',
    subtitle: 'Shipwreck · T0 harvest · craft raft',
    description:
      'Wash up, gather, craft tools and a raft. Required once — skipped forever after home island is claimed.',
    path: '/tutorial',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_tutorial_complete_v1',
    icon: 'flame',
    badge: 'Tutorial',
  },
  {
    id: 'home_island',
    order: 50,
    title: 'Home Island',
    subtitle: 'Given after tutorial + raft · not level 20',
    description:
      'Home-island intro cinematic + creation. Unlocked when tutorial is finished (raft boarded) — never gated by level 20.',
    path: '/homeisland?cinematic=abandon-ship&from=tutorial',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_home_island_claimed_v1',
    icon: 'leaf',
    badge: 'Base',
  },
  {
    id: 'world_map',
    order: 60,
    title: 'World Map',
    subtitle: '9 sectors · era overview',
    description: 'Strategic Warlords era map of the nine seas.',
    path: '/world-map',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'map',
    badge: 'Map',
  },
  {
    id: 'open_world',
    order: 70,
    title: 'Open World Zones',
    subtitle: 'Haven · lobby · grind',
    description:
      'Shared MMO sectors after you own a home island (or finished tutorial).',
    path: '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port&skipIntro=1',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'globe',
    badge: 'Play',
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
  raftCrafted: 'warlords_raft_crafted_v1',
  airshipSeen: 'warlords_airship_seen_v1',
  homeIslandClaimed: 'warlords_home_island_claimed_v1',
  homeIslandUnlockedShown: 'warlords_home_island_unlock_toast_v1',
} as const;

export interface WarlordsProgressInput {
  isAuthenticated: boolean;
  hasCharacter: boolean;
  characterLevel: number;
  flags: {
    openingSeen?: boolean;
    tutorialComplete?: boolean;
    airshipSeen?: boolean;
    raftCrafted?: boolean;
    homeIslandClaimed?: boolean;
  };
  /** True if home_islands row exists for account */
  hasHomeIsland?: boolean;
}

export interface WarlordsProgressResult {
  nextStepId: WarlordsFlowStepId;
  nextPath: string;
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
  /** True when player should never re-enter tutorial */
  skipTutorial: boolean;
}

/**
 * Resolve where the player should go next.
 *
 * Priority:
 *   intro → create → airship (once) → tutorial → home island (after raft/tutorial) → open world
 *   hasHomeIsland ⇒ skip tutorial forever
 */
export function resolveWarlordsProgress(input: WarlordsProgressInput): WarlordsProgressResult {
  const level = Math.max(0, Math.floor(input.characterLevel || 0));
  const hasHome =
    !!input.hasHomeIsland ||
    !!input.flags.homeIslandClaimed;
  const tutorialDone =
    !!input.flags.tutorialComplete ||
    !!input.flags.raftCrafted ||
    hasHome;
  const openingSeen = !!input.flags.openingSeen || input.hasCharacter;
  const airshipSeen = !!input.flags.airshipSeen || hasHome || tutorialDone;

  // Home island is unlocked only after tutorial/raft OR already claimed — never by level
  const homeIslandUnlocked = tutorialDone || hasHome;

  const skipTutorial = hasHome || tutorialDone;

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
    } else if (step.id === 'airship') {
      done = airshipSeen;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'tutorial') {
      done = tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (hasHome) {
        done = true;
        lockReason = undefined;
      }
    } else if (step.id === 'home_island') {
      done = hasHome;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (!tutorialDone && !hasHome) {
        locked = true;
        lockReason = 'Finish tutorial island and craft a raft first';
      }
    } else if (step.id === 'world_map' || step.id === 'open_world') {
      done = hasHome;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (!hasHome && !tutorialDone) {
        locked = true;
        lockReason = 'Complete tutorial and claim home island first';
      }
    }

    // Explicit: never lock home island on character level
    if (step.id !== 'home_island' && step.minLevel > 0 && level < step.minLevel) {
      locked = true;
      lockReason = lockReason || `Requires level ${step.minLevel}`;
    }

    return { ...step, locked, lockReason, done, isNext: false };
  });

  let nextStepId: WarlordsFlowStepId = 'opening_scene';
  if (!openingSeen && !input.hasCharacter) {
    nextStepId = 'opening_scene';
  } else if (!input.hasCharacter) {
    nextStepId = 'character_create';
  } else if (hasHome) {
    // Returning player with base — hub play
    nextStepId = 'open_world';
  } else if (!airshipSeen) {
    nextStepId = 'airship';
  } else if (!tutorialDone) {
    nextStepId = 'tutorial';
  } else {
    // Tutorial/raft done, need home island create
    nextStepId = 'home_island';
  }

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
    skipTutorial,
  };
}

/** Path helpers with characterId */
export function warlordsStepUrl(
  stepId: WarlordsFlowStepId,
  opts?: { characterId?: string; force?: boolean },
): string {
  const step = WARLORDS_FLOW_BY_ID[stepId];
  let path = step?.path ?? '/tutorial';
  if (opts?.characterId) {
    const sep = path.includes('?') ? '&' : '?';
    path = `${path}${sep}characterId=${encodeURIComponent(opts.characterId)}`;
  }
  if (opts?.force && stepId === 'home_island') {
    const sep = path.includes('?') ? '&' : '?';
    path = `${path}${sep}unlock=1&from=tutorial`;
  }
  return path;
}

/** After raft / tutorial complete → home island intro (not pirate lobby, not L20) */
export const AFTER_TUTORIAL_PATH =
  '/homeisland?cinematic=abandon-ship&from=tutorial' as const;

export const HOME_ISLAND_UNLOCK_PATH =
  '/homeisland?cinematic=abandon-ship&from=tutorial' as const;
export const HOME_ISLAND_PLAY_PATH = '/home-island' as const;

/** Combat tab = airship 4-character Warlords era scene */
export const COMBAT_TAB_PATH = '/combat' as const;
export const AIRSHIP_SCENE_PATH = '/airship-zone' as const;
