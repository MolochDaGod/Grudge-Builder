/**
 * Production intro SSOT — do not mix destinations.
 *
 * 1) SHIPWRECK TUTORIAL CINEMA (native Three.js on client)
 *    Storm → hull break → wash-up on chicken-gun pirate-islands shipwreck_cove
 *    → /tutorial (default) or island-3d lobby
 *
 * 2) OVERBOARD / DEATH FLOAT (legacy)
 *    → old home-island path (prefer abandon_ship)
 *
 * 3) ABANDON SHIP (End Game · home island)
 *    Cannon fire · ship sinks · all models jump off (no throw overboard)
 *    → /homeisland · home-island spawn
 *
 * Production: https://client.grudge-studio.com/island-3d
 * Home island: https://client.grudge-studio.com/homeisland
 *
 * PURGED from island-3d:
 *  - TI iframe (water.grudge-studio.com/intro) Stonewisp / race video
 *  - fleet R2 intro.mp4 as the island-3d opener
 * Native cinema: client/src/island3d/intro/LeviathanOceanCinema.ts
 *   (barrel: ShipwreckTutorialCinema.ts)
 */

export type ProductionIntroVariant =
  | 'shipwreck_tutorial'
  | 'storm_ship_attack' // alias retained for session keys / older bookmarks
  | 'overboard_home_island'
  | 'abandon_ship_home_island';

export interface ProductionIntroDef {
  id: ProductionIntroVariant;
  label: string;
  description: string;
  /** Where this intro may be used */
  usedFor: 'island-3d' | 'home-island';
  /**
   * @deprecated TI embed no longer used for island-3d (kept for abandon-ship optional iframe).
   */
  tiPath: string;
  /** @deprecated Absolute TI production URL — abandon-ship only */
  tiUrl: string;
  /** Approximate ms before auto-complete */
  durationMs: number;
  /** Cut before overboard float when used for island-3d */
  cutBeforeOverboard: boolean;
  notes: string;
  /** Native Three.js cinema (no video, no TI iframe) */
  engine: 'three_native' | 'ti_embed' | 'storyboard';
}

export const TI_HOST =
  (typeof process !== 'undefined' && (process as any).env?.VITE_TI_HOST) ||
  'https://water.grudge-studio.com';

/**
 * Production open into island-3d / tutorial —
 * native Three.js shipwreck cinema (NO video, NO Stonewisp, NO TI iframe).
 */
export const SHIPWRECK_TUTORIAL_INTRO: ProductionIntroDef = {
  id: 'shipwreck_tutorial',
  label: 'Leviathan Ocean · Tutorial Open',
  description:
    'Native Three.js cinema: open ocean leviathan attack, casters raise yin-yang ward rings, ' +
    'fire beam/aura, supernova shield contacts, pinata hull breach, hero thrown 20 m, ' +
    'logo stinger, then chicken-gun pirate-islands shipwreck_cove tutorial wake.',
  usedFor: 'island-3d',
  tiPath: '',
  tiUrl: '',
  durationMs: 56_000,
  cutBeforeOverboard: true,
  engine: 'three_native',
  notes:
    'Code: island3d/intro/LeviathanOceanCinema.ts · StormShipIntroGate.tsx (v6). ' +
    'Assets: public/models/cinema/{leviathan,magic-ring-yinyang-blue,supernova-impact.prod}.glb ' +
    '+ public/cinema/grudge-logo.jpeg. ' +
    'PURGED: TI /intro, intro.mp4, Stonewisp. Handoff: /tutorial?from=shipwreck-intro.',
};

/** @deprecated Use SHIPWRECK_TUTORIAL_INTRO — kept so older imports compile */
export const STORM_SHIP_INTRO: ProductionIntroDef = {
  ...SHIPWRECK_TUTORIAL_INTRO,
  id: 'storm_ship_attack',
  label: 'Shipwreck Tutorial Open (alias)',
};

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
  engine: 'ti_embed',
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
  engine: 'ti_embed',
  notes:
    'Optional flavor cinematic (home island no longer level-gated). ' +
    'Query: variant=abandon_ship&noThrow=1&sink=1&jumpAll=1. ' +
    'Destination: /home-island (canonical) or /homeisland alias.',
};

export const HOME_ISLAND_PRODUCTION_PATH = '/homeisland' as const;
export const HOME_ISLAND_PRODUCTION_URL =
  'https://client.grudge-studio.com/homeisland' as const;

export const PRODUCTION_START_PATH = '/island-3d';
export const PRODUCTION_START_URL = 'https://client.grudge-studio.com/island-3d';

/** Default query after shipwreck intro completes → tutorial island */
export const AFTER_STORM_INTRO_QUERY = {
  mode: 'lobby',
  map: 'pirate-islands',
  sector: 'lobby',
  island: 'grudge-open-world',
  from: 'shipwreck-intro',
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
    id: 'tutorial',
    label: 'Shipwreck Tutorial Island',
    hint: 'Chicken-gun pirate map · shipwreck_cove · injured wake · T0 harvest',
    path: '/tutorial?from=shipwreck-intro',
  },
  {
    id: 'lobby',
    label: 'Pirate Open World',
    hint: 'island-3d lobby · boats · build · harvest · full HUD',
    path: '/island-3d?mode=lobby&map=pirate-islands&sector=lobby&ui=1&options=1&from=shipwreck-intro',
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

/** Bump session key so players re-see the leviathan cut once */
export const INTRO_SESSION_KEY = 'grudge_shipwreck_intro_seen_v7';
export const INTRO_OPTIONS_KEY = 'grudge_island3d_intro_options_v7';

export interface Island3dIntroOptions {
  /** Play shipwreck cinema on visit when not yet seen this session */
  playStormIntro: boolean;
  /** Mute (reserved for procedural audio) */
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

/**
 * Zone / sector land-in must NOT auto-play shipwreck cinema (blocks WORLD_MAP QA).
 * Default: play once → tutorial island for cold open /island-3d.
 */
export const DEFAULT_INTRO_OPTIONS: Island3dIntroOptions = {
  playStormIntro: true,
  mute: false,
  showOptions: true,
  showUi: true,
  /** Always land tutorial island after leviathan open (production story) */
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
