/**
 * Warlords production deployment pipeline (grudgewarlords.com runtime)
 *
 * Canonical player journey:
 *   1. Opening intro video (game lore)
 *   2. First character creation (Foundry / GCS · grudge6)
 *   3. Shipwreck tutorial island (required once per account)
 *   4. After tutorial: airship handoff → home island
 *   5. World map / open world
 *   6. Later characters: Foundry → airship → home island (skip tutorial)
 *
 * Ops / zone testing: https://info.grudge-studio.com/WORLD_MAP.html
 */

/** Home island is available after tutorial (or once claimed). Legacy import name kept. */
export const WARLORDS_HOME_ISLAND_MIN_LEVEL = 1 as const;

export type WarlordsFlowStepId =
  | 'opening_scene'
  | 'character_create'
  | 'tutorial'
  | 'airship'
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

/** Ordered production path — single happy path SSOT */
export const WARLORDS_PRODUCTION_FLOW: WarlordsFlowStep[] = [
  {
    id: 'opening_scene',
    order: 10,
    title: 'Opening Scene',
    subtitle: 'Warlords intro video · lore',
    description:
      'Watch the fleet intro so the era and start make sense. Sign in if needed, then create your first hero.',
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
      'Create your first hero at character.grudge-studio.com (Foundry). First hero returns to the shipwreck tutorial.',
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
    title: 'Leviathan → Shipwreck Cove',
    subtitle: 'Required once · attack · ship destroy · wash-up',
    description:
      'First voyage: leviathan attack cinema destroys the hull, then you wash up on chicken-gun pirate-islands (shipwreck_cove) for harvest / craft / raft. Complete once per account.',
    path: '/shipwreck-cinema',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_tutorial_complete_v1',
    icon: 'flame',
    badge: 'Required',
  },
  {
    id: 'airship',
    order: 40,
    title: 'Airship Handoff',
    subtitle: 'Foundry → client bridge (after tutorial)',
    description:
      'After tutorial (and for every later hero): accept Foundry ?characterId=&from=gcs and forward to home island.',
    path: '/airship',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_airship_seen_v1',
    icon: 'anchor',
    badge: 'Handoff',
  },
  {
    id: 'home_island',
    order: 50,
    title: 'Home Island',
    subtitle: 'After tutorial · 3D personal base',
    description:
      'Personal Three.js home island with terrain, harvest, and build. Unlocked after the first tutorial (no level-20 gate).',
    path: '/home-island',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'leaf',
    badge: 'Base',
  },
  {
    id: 'world_map',
    order: 60,
    title: 'World Map',
    subtitle: '9 sectors · in-game overview',
    description:
      'Strategic era map. Ops/testing use info.grudge-studio.com/WORLD_MAP.html for health + Play links.',
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
    subtitle: '9 sectors · mode=zone · worldSeed=grudge-world-1',
    description:
      'Shared MMO sectors (haven_shore default). Deep-link from info WORLD_MAP with skipIntro=1 for clean land-in.',
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

/** Session / local flags (Warlords SPA origin only — not shared with Foundry host) */
export const WARLORDS_FLOW_FLAGS = {
  openingSeen: 'warlords_opening_seen_v1',
  tutorialComplete: 'warlords_tutorial_complete_v1',
  airshipSeen: 'warlords_airship_seen_v1',
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
    airshipSeen?: boolean;
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
 * Resolve where the player should go next.
 * First hero: intro → create → tutorial → home.
 * After tutorial: create → airship → home (tutorial step marked done).
 */
export function resolveWarlordsProgress(input: WarlordsProgressInput): WarlordsProgressResult {
  const level = Math.max(0, Math.floor(input.characterLevel || 0));
  const tutorialDone = !!input.flags.tutorialComplete;
  const openingSeen = !!input.flags.openingSeen;
  const airshipSeen = !!input.flags.airshipSeen;
  const homeIslandUnlocked = tutorialDone || !!input.hasHomeIsland || input.hasCharacter;

  const steps = WARLORDS_PRODUCTION_FLOW.map((step) => {
    let locked = false;
    let lockReason: string | undefined;
    let done = false;

    if (step.id === 'opening_scene') {
      done = openingSeen || input.hasCharacter;
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
    } else if (step.id === 'airship') {
      // Bridge used after tutorial (and for every later Foundry handoff)
      done = airshipSeen || (!!input.hasHomeIsland && tutorialDone);
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (!tutorialDone) {
        locked = true;
        lockReason = 'Complete the shipwreck tutorial first';
      }
    } else if (step.id === 'home_island') {
      done = !!input.hasHomeIsland;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (!tutorialDone) {
        locked = true;
        lockReason = 'Complete the shipwreck tutorial first';
      }
    } else if (step.id === 'world_map' || step.id === 'open_world') {
      done = !!input.hasHomeIsland || tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      } else if (!tutorialDone) {
        locked = true;
        lockReason = 'Complete the shipwreck tutorial first';
      }
    }

    if (step.minLevel > 0 && level < step.minLevel) {
      locked = true;
      lockReason = lockReason || `Requires level ${step.minLevel}`;
    }

    return { ...step, locked, lockReason, done, isNext: false };
  });

  // Next step: intro → create → tutorial (once) → home → open world
  let nextStepId: WarlordsFlowStepId = 'opening_scene';
  if (!openingSeen && !input.hasCharacter) nextStepId = 'opening_scene';
  else if (!input.hasCharacter) nextStepId = 'character_create';
  else if (!tutorialDone) nextStepId = 'tutorial';
  else if (!input.hasHomeIsland) nextStepId = 'home_island';
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
  let path = step?.path ?? '/home-island';
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

/**
 * Relative return path after Foundry create (no origin).
 *
 * First account play:
 *   Leviathan attack cinema (ship destroy) → wash-up on /tutorial
 *   (chicken-gun pirate-islands · shipwreck_cove)
 * After tutorial:
 *   /airship → home island
 */
export function postCreateReturnRelativePath(tutorialComplete: boolean): string {
  if (tutorialComplete) {
    return '/airship?from=gcs';
  }
  // Full-systems leviathan cut, then handoff to pirate-islands tutorial
  return '/shipwreck-cinema?from=create';
}

/**
 * Where /airship bridge should send a resolved characterId.
 * First voyage still needs leviathan → shipwreck cove before home island.
 */
export function airshipForwardRelativePath(
  characterId: string,
  tutorialComplete: boolean,
  from = 'gcs',
): string {
  const q = new URLSearchParams({
    characterId,
    from: String(from || 'gcs'),
  });
  if (tutorialComplete) {
    return `/home-island?${q.toString()}`;
  }
  return `/shipwreck-cinema?${q.toString()}`;
}

/**
 * Build tutorial wash-up URL on chicken-gun pirate-islands shipwreck_cove.
 */
export function tutorialShipwreckWashupPath(
  characterId?: string | null,
  from = 'shipwreck-intro',
): string {
  const q = new URLSearchParams({
    from: String(from || 'shipwreck-intro'),
    map: 'pirate-islands',
    island: 'grudge-open-world',
    wake: '1',
  });
  if (characterId) q.set('characterId', characterId);
  return `/tutorial?${q.toString()}`;
}

/** After tutorial complete message — faction lobby ring */
export const AFTER_TUTORIAL_PATH =
  '/island-3d?mode=lobby&map=pirate-islands&from=tutorial&focus=faction' as const;

export const HOME_ISLAND_UNLOCK_PATH = '/home-island' as const;
export const HOME_ISLAND_PLAY_PATH = '/home-island' as const;
