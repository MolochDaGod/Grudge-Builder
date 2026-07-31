/**
 * Warlords production deployment pipeline (client.grudge-studio.com runtime)
 *
 * Canonical player journey (2026-07 happy path):
 *   1. Sign in
 *   2. Character creation (Foundry / GCS)
 *   3. Airship Warlords era scene (select / first handoff)
 *   4. 2D strategic map (in-game /world-map · ops: info WORLD_MAP.html)
 *   5. Home island IMMEDIATELY after first character (no level gate)
 *   6. Open world sectors (/play mode=zone)
 *   7. Tutorial shipwreck — optional side path
 *
 * Ops / zone testing frontend: https://info.grudge-studio.com/WORLD_MAP.html
 * Client is 3D runtime only — not the world ops hub.
 */

/** Home island is available from level 1 (first character). Legacy constant kept for imports. */
export const WARLORDS_HOME_ISLAND_MIN_LEVEL = 1 as const;

/** Ops / systems browser for 9-sector health + Play deep-links */
export const INFO_WORLD_MAP_URL =
  'https://info.grudge-studio.com/WORLD_MAP.html' as const;

export type WarlordsFlowStepId =
  | 'opening_scene'
  | 'character_create'
  | 'airship'
  | 'home_island'
  | 'world_map'
  | 'open_world'
  | 'tutorial';

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
    subtitle: 'Warlords intro · fleet video',
    description:
      'Optional cinematic entry. Sign in if needed, then create or pick a hero.',
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
      'Create your hero at character.grudge-studio.com (Foundry). Returns to the airship scene with characterId.',
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
    title: 'Airship · Era Select',
    subtitle: 'Warlords character scene · 4-slot handoff',
    description:
      'Warlords era airship: confirm hero, talk to captains, then open the map / home island.',
    path: '/airship',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_airship_seen_v1',
    icon: 'anchor',
    badge: 'Crew',
  },
  {
    id: 'home_island',
    order: 40,
    title: 'Home Island',
    subtitle: 'Immediate after first character · large 3D terrain',
    description:
      'Personal Three.js home island with terrain, harvest nodes, and build — unlocked as soon as you have a hero (no level 20 gate).',
    path: '/home-island',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    icon: 'leaf',
    badge: 'Base',
  },
  {
    id: 'world_map',
    order: 50,
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
    order: 60,
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
  {
    id: 'tutorial',
    order: 70,
    title: 'Shipwreck Tutorial',
    subtitle: 'Optional · solo wash-up',
    description:
      'Optional first-voyage side path. Not required before home island or open world.',
    path: '/tutorial',
    minLevel: 0,
    requiresAuth: true,
    requiresCharacter: true,
    completeFlagKey: 'warlords_tutorial_complete_v1',
    icon: 'flame',
    badge: 'Optional',
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
  /** Always true once player has a character (level gate removed) */
  homeIslandUnlocked: boolean;
  homeIslandMinLevel: typeof WARLORDS_HOME_ISLAND_MIN_LEVEL;
}

/**
 * Resolve where the player should go next in production Warlords.
 * Happy path: create → airship → home island → map/zone.
 */
export function resolveWarlordsProgress(input: WarlordsProgressInput): WarlordsProgressResult {
  const level = Math.max(0, Math.floor(input.characterLevel || 0));
  const homeIslandUnlocked = input.hasCharacter;
  const tutorialDone = !!input.flags.tutorialComplete;
  const openingSeen = !!input.flags.openingSeen;
  const airshipSeen = !!input.flags.airshipSeen;

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
    } else if (step.id === 'airship') {
      done = airshipSeen || !!input.hasHomeIsland;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'home_island') {
      done = !!input.hasHomeIsland;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'world_map') {
      done = !!input.hasHomeIsland || tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'open_world') {
      done = !!input.hasHomeIsland || tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    } else if (step.id === 'tutorial') {
      done = tutorialDone;
      if (!input.hasCharacter) {
        locked = true;
        lockReason = 'Create a character first';
      }
    }

    if (step.minLevel > 0 && level < step.minLevel) {
      locked = true;
      lockReason = lockReason || `Requires level ${step.minLevel}`;
    }

    return { ...step, locked, lockReason, done, isNext: false };
  });

  // Next step priority: create → airship → home island → open world
  let nextStepId: WarlordsFlowStepId = 'opening_scene';
  if (!input.isAuthenticated && !input.hasCharacter) nextStepId = 'opening_scene';
  else if (!input.hasCharacter) nextStepId = 'character_create';
  else if (!airshipSeen && !input.hasHomeIsland) nextStepId = 'airship';
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

/** After first character / airship — go home island (no level gate) */
export const AFTER_CREATE_PATH = '/airship' as const;

/** After airship confirm — personal home island */
export const AFTER_AIRSHIP_PATH = '/home-island' as const;

/** Zone land-in for info WORLD_MAP / production play (skip TI iframe intro) */
export const AFTER_TUTORIAL_PATH =
  '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port&from=tutorial&skipIntro=1' as const;

/** @deprecated Level-20 unlock removed — home island is immediate */
export const HOME_ISLAND_UNLOCK_PATH = '/home-island?from=first-character' as const;
export const HOME_ISLAND_PLAY_PATH = '/home-island' as const;

/** Build a clean zone Play URL for ops (info WORLD_MAP) */
export function infoWorldMapPlayUrl(sectorId: string, opts?: { island3d?: boolean }): string {
  const base = opts?.island3d ? '/island-3d' : '/play';
  const q = new URLSearchParams({
    mode: 'zone',
    sector: sectorId,
    worldSeed: 'grudge-world-1',
    skipIntro: '1',
    from: 'info-world-map',
  });
  return `https://client.grudge-studio.com${base}?${q.toString()}`;
}
