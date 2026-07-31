/**
 * Production intro SSOT — do not mix destinations.
 *
 * 1) LEVIATHAN OCEAN / SHIPWRECK TUTORIAL (native Three.js · v8)
 *    LeviathanOceanCinema — stage UUIDs · spine IK · 4 mages · unarmed throw
 *    → default /tutorial?from=shipwreck-intro
 *
 * 2) OVERBOARD / DEATH FLOAT (legacy)
 *    → old home-island path (prefer abandon_ship)
 *
 * 3) ABANDON SHIP (End Game · level 20)
 *    Cannon fire · ship sinks · all models jump off (no throw overboard)
 *    → /homeisland · home-island spawn
 *
 * Production: https://client.grudge-studio.com/island-3d
 * Home island: https://client.grudge-studio.com/homeisland
 *
 * KILL LIST for island-3d: TI iframe, Stonewisp stand-in, intro.mp4 as primary.
 */

export type ProductionIntroVariant =
  | 'storm_ship_attack'
  | 'overboard_home_island'
  | 'abandon_ship_home_island';

export interface ProductionIntroDef {
  id: ProductionIntroVariant;
  label: string;
  description: string;
  /** Where this intro may be used */
  usedFor: 'island-3d' | 'home-island';
  /** TI / local embed */
  tiPath: string;
  /** Absolute TI production URL */
  tiUrl: string;
  /** Approximate ms before auto-complete if embed cannot signal */
  durationMs: number;
  /** Cut before overboard float when used for island-3d */
  cutBeforeOverboard: boolean;
  notes: string;
}

export const TI_HOST =
  (typeof process !== 'undefined' && (process as any).env?.VITE_TI_HOST) ||
  'https://water.grudge-studio.com';

/**
 * Leviathan ocean battle — production open into island-3d / tutorial.
 * Native Three.js (LeviathanOceanCinema). TI fields kept only for legacy links.
 */
export const STORM_SHIP_INTRO: ProductionIntroDef = {
  id: 'storm_ship_attack',
  label: 'Leviathan Ocean Battle',
  description:
    'Native Three.js cinema: startingfalls stage, 4 human mages + unarmed hero on deck, leviathan scripted path, spine IK look-ats, 20 m throw, logo → tutorial shipwreck cove.',
  usedFor: 'island-3d',
  tiPath: '/intro',
  tiUrl: `${TI_HOST}/intro`,
  durationMs: 56_000,
  cutBeforeOverboard: true,
  notes:
    'Engine: client/src/island3d/intro/LeviathanOceanCinema.ts · stage SSOT leviathanCinemaStage.ts · ' +
    'battle script LeviathanBattleScript.ts · spine IK CinemaSpineIk.ts. ' +
    'NO TI iframe / Stonewisp / intro.mp4 as primary island-3d gate.',
};

/** Alias for docs / gates */
export const SHIPWRECK_TUTORIAL_INTRO = STORM_SHIP_INTRO;

/** Overboard float — legacy home island only (prefer ABANDON_SHIP_HOME_INTRO) */
export const OVERBOARD_HOME_INTRO: ProductionIntroDef = {
  id: 'overboard_home_island',
  label: 'Overboard Float (Home Island · legacy)',
  description:
    'Thrown overboard / floating body zoom. Superseded by abandon-ship for End Game mission.',
  usedFor: 'home-island',
  tiPath: '/intro',
  tiUrl: `${TI_HOST}/intro`,
  durationMs: 58_000,
  cutBeforeOverboard: false,
  notes:
    'Legacy. End Game uses abandon_ship_home_island (sink + jump off, no throw).',
};

/**
 * End Game cinematic — cannon fire, hull sinks, crew jumps free.
 * NOT a single character throw overboard.
 */
export const ABANDON_SHIP_HOME_INTRO: ProductionIntroDef = {
  id: 'abandon_ship_home_island',
  label: 'Abandon Ship (End Game · Home Island)',
  description:
    'Cannon volley answers. The ship takes water and goes under. Every model on deck jumps clear — abandon ship together — then wash-up to claim the personal home island.',
  usedFor: 'home-island',
  tiPath: '/intro',
  tiUrl: `${TI_HOST}/intro`,
  durationMs: 48_000,
  cutBeforeOverboard: true,
  notes:
    'Triggered by faction captain mission “End Game” at level 20. ' +
    'Query: variant=abandon_ship&noThrow=1&sink=1&jumpAll=1. ' +
    'Destination: /homeisland → island-reveal or /home-island?unlock=1',
};

export const HOME_ISLAND_PRODUCTION_PATH = '/homeisland' as const;
export const HOME_ISLAND_PRODUCTION_URL =
  'https://client.grudge-studio.com/homeisland' as const;

export const PRODUCTION_START_PATH = '/island-3d';
export const PRODUCTION_START_URL = 'https://client.grudge-studio.com/island-3d';

/** Default query after storm intro completes */
export const AFTER_STORM_INTRO_QUERY = {
  mode: 'lobby',
  map: 'pirate-islands',
  sector: 'lobby',
  island: 'grudge-open-world',
  from: 'storm-intro',
  ui: '1',
  options: '1',
} as const;

export type AfterIntroDestination =
  | 'lobby'
  | 'tutorial'
  | 'zone'
  | 'home_overboard'
  | 'home_abandon_ship';

export const AFTER_INTRO_DESTINATIONS: Array<{
  id: AfterIntroDestination;
  label: string;
  hint: string;
  path: string;
}> = [
  {
    id: 'lobby',
    label: 'Pirate Open World',
    hint: 'island-3d lobby · boats · build · harvest · full HUD',
    path: '/island-3d?mode=lobby&map=pirate-islands&sector=lobby&ui=1&options=1&from=storm-intro',
  },
  {
    id: 'tutorial',
    label: 'Shipwreck Tutorial',
    hint: 'Solo wash-up beach · injured opener · T0 harvest',
    path: '/tutorial?from=shipwreck-intro',
  },
  {
    id: 'zone',
    label: 'Haven Shore Zone',
    hint: 'Warlords sector play',
    path: '/island-3d?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&ui=1&options=1',
  },
  {
    id: 'home_overboard',
    label: 'Home Island (legacy overboard)',
    hint: 'Legacy float — prefer End Game abandon-ship',
    path: '/island-reveal?from=overboard-intro',
  },
  {
    id: 'home_abandon_ship',
    label: 'Home Island (End Game · abandon ship)',
    hint: 'Cannon · sink · jump all · no throw → homeisland',
    path: '/homeisland?cinematic=abandon-ship&from=end-game',
  },
];

/** Bump when cinema cut changes so players re-see the battle */
export const INTRO_SESSION_KEY = 'grudge_shipwreck_intro_seen_v8';
export const INTRO_OPTIONS_KEY = 'grudge_island3d_intro_options_v8';

export interface Island3dIntroOptions {
  /** Play leviathan cinema on visit when not yet seen */
  playStormIntro: boolean;
  /** Mute cinema audio */
  mute: boolean;
  /** Show production options panel after enter */
  showOptions: boolean;
  /** Show full game HUD / production chrome */
  showUi: boolean;
  /** Destination after intro */
  destination: AfterIntroDestination;
  /** Auto-skip after durationMs */
  autoAdvance: boolean;
}

export const DEFAULT_INTRO_OPTIONS: Island3dIntroOptions = {
  playStormIntro: true,
  mute: false,
  showOptions: true,
  showUi: true,
  /** Production default: tutorial shipwreck after cinema */
  destination: 'tutorial',
  autoAdvance: true,
};

export function buildAfterIntroUrl(dest: AfterIntroDestination, characterId?: string): string {
  const base = AFTER_INTRO_DESTINATIONS.find((d) => d.id === dest)?.path
    ?? AFTER_INTRO_DESTINATIONS[0].path;
  if (!characterId) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}characterId=${encodeURIComponent(characterId)}`;
}
