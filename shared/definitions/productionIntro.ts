/**
 * Production intro SSOT — do not mix destinations.
 *
 * 1) LEVIATHAN OCEAN / SHIPWRECK TUTORIAL (native Three.js · v22)
 *    LeviathanOceanCinema — SI scale · Grudge6 orc deck · Gerstner ocean · film post
 *    stage UUIDs · spine IK · 4 mages · unarmed throw · pinata explode
 *    MultiCameraDirector (setTarget / followTo / impact) · CinemaAnimDirector helpers
 *    → default /tutorial?from=shipwreck-intro
 *
 * 2) OVERBOARD / DEATH FLOAT (legacy)
 *    → old home-island path (prefer abandon_ship)
 *
 * 3) ABANDON SHIP (End Game · level 20)
 *    Still TI/storyboard gate (AbandonShipIntroGate) — not the ocean cinema.
 *    Cannon fire · ship sinks · all models jump off (no throw overboard)
 *    → /homeisland · home-island spawn
 *
 * Production cinema: https://grudgewarlords.com/leviathan-cinema
 * (legacy /shipwreck-cinema soft-redirects here — do not deep-link it)
 * Island-3d lobby: https://grudgewarlords.com/island-3d
 * Home island: https://grudgewarlords.com/home-island

/** Full-screen load cover after rogue-wave / before tutorial scene. */
export const WARLORDS_LOAD_COVER_URL = '/cinema/grudge-island-rts-load.png' as const;

/**
 * KILL LIST for island-3d: TI iframe, Stonewisp stand-in, intro.mp4 as primary.
 * Legacy mp4 cutscene (IslandCutscene / warlordsIntro) is for /island only — not intro gate.
 * Do not route new product entry to /shipwreck-cinema — use /leviathan-cinema.
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
    'v27 film cinema: orc deck cast (2.2 m SI), 36 m tz-pirate ship, 90 m leviathan, Gerstner OceanShader, ' +
    'rogue-wave crash, moon shafts + horizon mist, anamorphic grade, storm handheld/Dutch, Box3 SI, dragon beam + pinata.',
  usedFor: 'island-3d',
  tiPath: '/intro',
  tiUrl: `${TI_HOST}/intro`,
  durationMs: 56_000,
  cutBeforeOverboard: true,
  notes:
    'Engine: LeviathanOceanCinema.ts v24 · stage SSOT leviathanCinemaStage · PostProcessing · CinemaFpsBudget(~100fps) · ' +
    'CinemaCastingTornado (casting-abilities-threejs wind GPU funnel + AI path) · cinemaGrudge6 ORC · deck pathfind. ' +
    'PURGED: voxel boats, toy water, lookAt tumble, TI/mp4 primary gate.',
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

/**
 * Canonical first-voyage Leviathan ocean cinema (LeviathanOceanCinema).
 * Prefer this over the legacy /shipwreck-cinema deep link.
 */
export const LEVIATHAN_INTRO_PATH = '/leviathan-cinema' as const;
export const LEVIATHAN_INTRO_URL =
  'https://client.grudge-studio.com/leviathan-cinema' as const;
/** Legacy alias — keep as redirect only; do not use for new product links. */
export const LEGACY_SHIPWRECK_CINEMA_PATH = '/shipwreck-cinema' as const;

/** Build `/leviathan-cinema?characterId=&from=` for home / heroes / Foundry returnTo. */
export function leviathanIntroPath(opts?: {
  characterId?: string | null;
  from?: string | null;
}): string {
  const q = new URLSearchParams();
  const id = opts?.characterId?.trim();
  if (id) q.set('characterId', id);
  if (opts?.from) q.set('from', String(opts.from));
  const s = q.toString();
  return s ? `${LEVIATHAN_INTRO_PATH}?${s}` : LEVIATHAN_INTRO_PATH;
}

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
    hint: 'Chicken-gun pirate-islands · shipwreck_cove wash-up · injured opener · T0 harvest',
    path: '/tutorial?from=shipwreck-intro&map=pirate-islands&island=grudge-open-world&wake=1',
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
export const INTRO_SESSION_KEY = 'grudge_shipwreck_intro_seen_v27';
export const INTRO_OPTIONS_KEY = 'grudge_island3d_intro_options_v26';

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
