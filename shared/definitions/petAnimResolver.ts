/**
 * Pet animation resolver — map GLB clip names to gameplay states by NAME.
 *
 * Pets.zip expected clips (use as named, case-insensitive):
 *   walk, idle / Idle, laydown / lay_down / sleep,
 *   attack1 / Attack_1 / attack_01, attack2 / Attack_2, …
 *   run, eat, death / die (optional)
 *
 * Does not invent clips — only binds existing clip names.
 */

export interface PetAnimStates {
  idle: string;
  walk?: string;
  run?: string;
  laydown?: string;
  attack1?: string;
  attack2?: string;
  attack3?: string;
  eat?: string;
  death?: string;
  hit?: string;
  /** All unresolved clips kept for debugging */
  extras: string[];
}

const PATTERNS: Array<{ key: keyof PetAnimStates; re: RegExp }> = [
  { key: 'idle', re: /^(idle|Idle|IDLE)([_\s.-]|$)|idle_pose|idle_static|idle_rest|Idle_1|Idle_2/i },
  { key: 'walk', re: /^(walk|Walk|WALK)([_\s.-]|$)|walk_fwd|Walk_Forward|locomotion_walk/i },
  { key: 'run', re: /^(run|Run|RUN|gallop|trot|sprint)([_\s.-]|$)|run_fwd/i },
  { key: 'laydown', re: /lay\s*down|laydown|lie\s*down|sleep|rest_ground|idle_lie|Lying/i },
  { key: 'attack1', re: /attack\s*1|attack_1|attack01|Attack1|Attack_01|attack(?![_\s.-]*2)/i },
  { key: 'attack2', re: /attack\s*2|attack_2|attack02|Attack2|Attack_02/i },
  { key: 'attack3', re: /attack\s*3|attack_3|attack03|Attack3/i },
  { key: 'eat', re: /eat|graz|feed|chew|Idle_Eat/i },
  { key: 'death', re: /death|die|dead|Death|Die/i },
  { key: 'hit', re: /hit|react|flinch|Hurt/i },
];

/**
 * Resolve clip names from a loaded AnimationClip list (or string names).
 * Prefers exact name matches first, then regex.
 */
export function resolvePetAnimations(clipNames: string[]): PetAnimStates {
  const names = clipNames.filter(Boolean);
  const used = new Set<string>();
  const result: PetAnimStates = {
    idle: names[0] ?? 'idle',
    extras: [],
  };

  const exactPref: Array<[keyof PetAnimStates, string[]]> = [
    ['idle', ['idle', 'Idle', 'IDLE']],
    ['walk', ['walk', 'Walk', 'WALK']],
    ['run', ['run', 'Run', 'RUN']],
    ['laydown', ['laydown', 'LayDown', 'lay_down', 'Lay_Down', 'sleep', 'Sleep']],
    ['attack1', ['attack1', 'Attack1', 'attack_1', 'Attack_1', 'attack']],
    ['attack2', ['attack2', 'Attack2', 'attack_2', 'Attack_2']],
    ['attack3', ['attack3', 'Attack3', 'attack_3']],
    ['eat', ['eat', 'Eat']],
    ['death', ['death', 'Death', 'die', 'Die']],
  ];

  for (const [key, prefs] of exactPref) {
    const hit = names.find((n) => prefs.some((p) => n === p || n.toLowerCase() === p.toLowerCase()));
    if (hit) {
      (result as Record<string, string>)[key] = hit;
      used.add(hit);
    }
  }

  for (const { key, re } of PATTERNS) {
    if ((result as Record<string, string | undefined>)[key] && key !== 'idle') continue;
    const hit = names.find((n) => !used.has(n) && re.test(n));
    if (hit) {
      (result as Record<string, string>)[key] = hit;
      used.add(hit);
    }
  }

  if (!result.walk) result.walk = result.idle;
  if (!result.run) result.run = result.walk;
  if (!result.death) result.death = result.idle;

  result.extras = names.filter((n) => !used.has(n));
  return result;
}

/**
 * Map runtime AI / play state → pet clip role.
 * Uses named clips as they appear in the GLB (via resolvePetAnimations).
 */
export function petClipForState(
  resolved: PetAnimStates,
  state: string,
): string {
  switch (state) {
    case 'wander':
    case 'walk':
      return resolved.walk ?? resolved.idle;
    case 'flee':
    case 'pursue':
    case 'run':
      return resolved.run ?? resolved.walk ?? resolved.idle;
    case 'attack':
    case 'attack1':
      return resolved.attack1 ?? resolved.attack2 ?? resolved.idle;
    case 'attack2':
      return resolved.attack2 ?? resolved.attack1 ?? resolved.idle;
    case 'laydown':
    case 'sleep':
      return resolved.laydown ?? resolved.idle;
    case 'eat':
      return resolved.eat ?? resolved.idle;
    case 'death':
      return resolved.death ?? resolved.idle;
    case 'hit':
      return resolved.hit ?? resolved.idle;
    case 'circle':
    case 'swim':
    case 'idle':
    default:
      return resolved.idle;
  }
}

/**
 * Expected Pets.zip species (from zip directory listing).
 * Zip on disk may be corrupt — re-export clean GLBs to R2 under PETS_CDN_ROOT.
 */
export const PETS_ZIP_SPECIES = [
  {
    id: 'alligator_cotw',
    label: 'American Alligator',
    file: 'american_aligator_from_cotw_game.glb',
    zone: 'pve' as const,
    ai: 'aggressive' as const,
    targetH: 0.55,
  },
  {
    id: 'bigfoot',
    label: 'Bigfoot',
    file: 'bigfoot.glb',
    zone: 'pve' as const,
    ai: 'aggressive' as const,
    targetH: 2.4,
  },
  {
    id: 'boar',
    label: 'Boar',
    file: 'boar.glb',
    zone: 'woods' as const,
    ai: 'neutral' as const,
    targetH: 0.85,
  },
  {
    id: 'canada_goose',
    label: 'Canada Goose',
    file: 'canada_goose_from_cotw_game.glb',
    zone: 'shore' as const,
    ai: 'passive' as const,
    targetH: 0.55,
  },
  {
    id: 'black_grouse',
    label: 'Black Grouse',
    file: 'cotw_black_grouse_male.glb',
    zone: 'flowers' as const,
    ai: 'passive' as const,
    targetH: 0.35,
  },
] as const;

export type PetSpeciesId = (typeof PETS_ZIP_SPECIES)[number]['id'];

/** Prefer CDN; fall back to local public path for studio dev. */
export const PETS_CDN_ROOT = 'https://assets.grudge-studio.com/models/creatures/pets';
export const PETS_LOCAL_ROOT = 'assets/models/creatures/pets';

export function petModelPath(file: string, preferCdn = true): string {
  return preferCdn ? `${PETS_CDN_ROOT}/${file}` : `${PETS_LOCAL_ROOT}/${file}`;
}

export function petsForZone(zoneId: string): typeof PETS_ZIP_SPECIES[number][] {
  return PETS_ZIP_SPECIES.filter((p) => p.zone === zoneId);
}
