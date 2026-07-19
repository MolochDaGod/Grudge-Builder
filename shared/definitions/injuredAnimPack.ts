/**
 * Injured animation pack — Mixamo + Grudge6 mesh-compatible clips.
 *
 * Canonical Mixamo titles (retargeted to bare Mixamo-24 / Grudge6 race bones via modelLoader):
 *   Injured Idle · Injured Walk · Injured Run · Injured Idle On Ground · Getting Up
 *
 * CDN layout (upload when available):
 *   assets.grudge-studio.com/models/animations/injured/{file}.glb
 *
 * Fallbacks try alternate folders used by our Mixamo drops.
 * Runtime remaps mixamorig* track prefixes → bare bones for Grudge6 race GLBs.
 */

import { FLEET_URLS } from '../fleet/manifest';

const CDN = FLEET_URLS.assets.replace(/\/$/, '');

export type InjuredAnimKey =
  | 'injured_idle'
  | 'injured_walk'
  | 'injured_run'
  | 'injured_ground'
  | 'injured_getup'
  | 'injured_hit';

export interface InjuredClipDef {
  key: InjuredAnimKey;
  /** Mixamo display name */
  mixamoName: string;
  loop: boolean;
  /** Candidate CDN paths (first that loads wins) */
  paths: string[];
  /** Maps onto AnimationManager / locomotion during tutorial opener */
  mapsTo: 'idle' | 'walk' | 'run' | 'death' | 'impact' | 'hard_landing' | 'fall_roll';
}

function enc(file: string): string {
  return file.split('/').map(encodeURIComponent).join('/');
}

function candidates(file: string): string[] {
  const bases = [
    `${CDN}/models/animations/injured`,
    `${CDN}/models/animations/mixamo/injured`,
    `${CDN}/models/animations/mixamo`,
    `${CDN}/models/animations`,
    `${CDN}/models/mixamo`,
    // Same-origin proxy used by some deploys
    `/api/assets/models/animations/injured`,
    `/api/assets/models/animations/mixamo/injured`,
    `/api/assets/models/animations`,
  ];
  return bases.map((b) => `${b}/${enc(file)}`);
}

/**
 * Official Mixamo injured package used for shipwreck opener.
 * Prefer these over healthy sword-shield idle/walk during wash-up.
 */
export const INJURED_ANIM_PACK: InjuredClipDef[] = [
  {
    key: 'injured_idle',
    mixamoName: 'Injured Idle',
    loop: true,
    paths: candidates('Injured Idle.glb'),
    mapsTo: 'idle',
  },
  {
    key: 'injured_walk',
    mixamoName: 'Injured Walk',
    loop: true,
    paths: candidates('Injured Walk.glb'),
    mapsTo: 'walk',
  },
  {
    key: 'injured_run',
    mixamoName: 'Injured Run',
    loop: true,
    paths: candidates('Injured Run.glb'),
    mapsTo: 'run',
  },
  {
    key: 'injured_ground',
    mixamoName: 'Injured Idle On Ground',
    loop: true,
    paths: [
      ...candidates('Injured Idle On Ground.glb'),
      ...candidates('Lying Idle.glb'),
      ...candidates('Sleeping Idle.glb'),
    ],
    mapsTo: 'death', // held prone pose for cinematic
  },
  {
    key: 'injured_getup',
    mixamoName: 'Getting Up',
    loop: false,
    paths: [
      ...candidates('Getting Up.glb'),
      ...candidates('Stand Up.glb'),
      ...candidates('Standing Up.glb'),
    ],
    mapsTo: 'hard_landing', // one-shot rise
  },
  {
    key: 'injured_hit',
    mixamoName: 'Hit React',
    loop: false,
    paths: [
      ...candidates('Hit Reaction.glb'),
      ...candidates('Standing React Large From Front.glb'),
      ...candidates('Reaction.glb'),
    ],
    mapsTo: 'impact',
  },
];

/** Tutorial opener uses ONLY these mapped locomotion/reaction slots */
export const TUTORIAL_OPENER_INJURED_ONLY = true;

/** Locked HP during tutorial shipwreck (invincible) */
export const TUTORIAL_LOCKED_HP = 5;
export const TUTORIAL_INVINCIBLE = true;

/** Phases that force injured-only animation set */
export const INJURED_OPENER_PHASES = [
  'intro_zoom',
  'gather_basics',
  'prompt_pickaxe',
  'craft_pickaxe',
  'equip_pickaxe',
] as const;

export function injuredPackLoadMap(): Partial<Record<string, string[]>> {
  const out: Partial<Record<string, string[]>> = {};
  for (const c of INJURED_ANIM_PACK) {
    out[c.key] = c.paths;
    // Also register under AnimationManager-friendly names
    out[c.mapsTo] = [...(out[c.mapsTo] ?? []), ...c.paths];
  }
  return out;
}

/** Build AnimationManager path map: state → first path (loader tries fallbacks) */
export function injuredAnimManagerPaths(): Partial<
  Record<'idle' | 'walk' | 'run' | 'death' | 'impact' | 'hard_landing' | 'idle_alt', string[]>
> {
  return {
    idle: INJURED_ANIM_PACK.find((c) => c.key === 'injured_idle')!.paths,
    idle_alt: INJURED_ANIM_PACK.find((c) => c.key === 'injured_idle')!.paths,
    walk: INJURED_ANIM_PACK.find((c) => c.key === 'injured_walk')!.paths,
    run: INJURED_ANIM_PACK.find((c) => c.key === 'injured_run')!.paths,
    death: INJURED_ANIM_PACK.find((c) => c.key === 'injured_ground')!.paths,
    impact: INJURED_ANIM_PACK.find((c) => c.key === 'injured_hit')!.paths,
    hard_landing: INJURED_ANIM_PACK.find((c) => c.key === 'injured_getup')!.paths,
  };
}
