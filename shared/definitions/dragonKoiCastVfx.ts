/**
 * Dragon Koi cast aura — multipack GLB used as surrounding cast effect.
 *
 * Source: C:\Users\nugye\Documents\dragon_koi.glb
 * Staged: /models/warlords/vfx/cast/dragon_koi.glb
 * CDN:    models/warlords/vfx/cast/dragon_koi.glb
 *
 * One mesh family, many **cast skins**:
 *   - color tint (school / damage type)
 *   - opacity / alpha mode
 *   - shader blend (additive glow vs soft blend vs solid toon)
 *
 * Lifecycle: spawn on cast START (windup) → orbit caster → despawn on cast FINISH
 * (windup+active+recovery, or cancel).
 */

export const DRAGON_KOI_LOCAL_PATH = '/models/warlords/vfx/cast/dragon_koi.glb';
export const DRAGON_KOI_CDN_KEY = 'models/warlords/vfx/cast/dragon_koi.glb';
export const DRAGON_KOI_CDN_URL =
  'https://assets.grudge-studio.com/models/warlords/vfx/cast/dragon_koi.glb';

/** Material / shader presentation for a cast skin. */
export type DragonKoiShaderMode =
  | 'additive_glow' // bright magic channel (default caster)
  | 'soft_blend' // translucent mist / nature
  | 'emissive_toon' // strong body color + emissive edge
  | 'ghost_mask'; // silhouette mask, low fill

export type DragonKoiVariantId =
  | 'fire'
  | 'frost'
  | 'arcane'
  | 'holy'
  | 'shadow'
  | 'nature'
  | 'lightning'
  | 'physical'
  | 'void';

export interface DragonKoiVariantDef {
  id: DragonKoiVariantId;
  label: string;
  /** Primary body tint (hex) */
  color: number;
  /** Emissive / rim tint (hex) */
  emissive: number;
  /** Base opacity 0–1 (multiplied into materials) */
  opacity: number;
  /** Extra emissive intensity scale */
  emissiveIntensity: number;
  shader: DragonKoiShaderMode;
  /** Orbit radius around caster feet/chest (m) */
  orbitRadius: number;
  /** Orbit height above feet (m) */
  height: number;
  /** World scale of the multipack */
  scale: number;
  /** Orbit angular speed rad/s */
  orbitSpeed: number;
  schools?: string[];
  damageTypes?: string[];
  /** Skill / vfx key substrings that select this skin */
  keyHints?: string[];
}

/**
 * Distinct cast presentations — same GLB, different opaque / texture / shader feel.
 */
export const DRAGON_KOI_VARIANTS: Record<DragonKoiVariantId, DragonKoiVariantDef> = {
  fire: {
    id: 'fire',
    label: 'Ember Koi',
    color: 0xff4a14,
    emissive: 0xff8a2b,
    opacity: 0.72,
    emissiveIntensity: 1.6,
    shader: 'additive_glow',
    orbitRadius: 1.35,
    height: 1.05,
    scale: 0.55,
    orbitSpeed: 1.8,
    schools: ['fire'],
    damageTypes: ['fire'],
    keyHints: ['fire', 'flame', 'meteor', 'fissure', 'ember'],
  },
  frost: {
    id: 'frost',
    label: 'Frost Koi',
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    opacity: 0.58,
    emissiveIntensity: 1.2,
    shader: 'soft_blend',
    orbitRadius: 1.4,
    height: 1.0,
    scale: 0.52,
    orbitSpeed: 1.35,
    schools: ['frost', 'ice', 'water'],
    damageTypes: ['frost', 'ice', 'cold'],
    keyHints: ['frost', 'ice', 'freeze', 'chill'],
  },
  arcane: {
    id: 'arcane',
    label: 'Arcane Koi',
    color: 0xc084fc,
    emissive: 0xa855f7,
    opacity: 0.68,
    emissiveIntensity: 1.5,
    shader: 'additive_glow',
    orbitRadius: 1.3,
    height: 1.15,
    scale: 0.5,
    orbitSpeed: 2.1,
    schools: ['arcane', 'mana', 'mystic'],
    damageTypes: ['arcane'],
    keyHints: ['arcane', 'mana', 'missile', 'reality'],
  },
  holy: {
    id: 'holy',
    label: 'Radiant Koi',
    color: 0xfef08a,
    emissive: 0xfacc15,
    opacity: 0.62,
    emissiveIntensity: 1.8,
    shader: 'emissive_toon',
    orbitRadius: 1.25,
    height: 1.2,
    scale: 0.48,
    orbitSpeed: 1.5,
    schools: ['holy', 'light'],
    damageTypes: ['holy'],
    keyHints: ['holy', 'heal', 'smite', 'radiant'],
  },
  shadow: {
    id: 'shadow',
    label: 'Umbral Koi',
    color: 0x4c1d95,
    emissive: 0x7c3aed,
    opacity: 0.55,
    emissiveIntensity: 1.1,
    shader: 'ghost_mask',
    orbitRadius: 1.45,
    height: 0.95,
    scale: 0.58,
    orbitSpeed: 1.2,
    schools: ['shadow', 'void', 'dark'],
    damageTypes: ['shadow', 'dark', 'necrotic'],
    keyHints: ['shadow', 'void', 'death', 'necro'],
  },
  nature: {
    id: 'nature',
    label: 'Bloom Koi',
    color: 0x4ade80,
    emissive: 0x22c55e,
    opacity: 0.6,
    emissiveIntensity: 1.0,
    shader: 'soft_blend',
    orbitRadius: 1.5,
    height: 0.9,
    scale: 0.54,
    orbitSpeed: 1.15,
    schools: ['nature', 'poison'],
    damageTypes: ['nature', 'poison'],
    keyHints: ['nature', 'root', 'bloom', 'regen', 'poison'],
  },
  lightning: {
    id: 'lightning',
    label: 'Storm Koi',
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    opacity: 0.75,
    emissiveIntensity: 2.0,
    shader: 'additive_glow',
    orbitRadius: 1.2,
    height: 1.25,
    scale: 0.46,
    orbitSpeed: 2.6,
    schools: ['lightning'],
    damageTypes: ['lightning', 'electric'],
    keyHints: ['lightning', 'chain', 'storm', 'thunder'],
  },
  physical: {
    id: 'physical',
    label: 'Steel Koi',
    color: 0xcbd5e1,
    emissive: 0x94a3b8,
    opacity: 0.5,
    emissiveIntensity: 0.7,
    shader: 'emissive_toon',
    orbitRadius: 1.15,
    height: 1.0,
    scale: 0.45,
    orbitSpeed: 1.6,
    schools: ['physical'],
    damageTypes: ['physical', 'slash', 'blunt'],
    keyHints: ['slash', 'cleave', 'strike', 'samurai', 'greatsword'],
  },
  void: {
    id: 'void',
    label: 'Abyss Koi',
    color: 0x1e1b4b,
    emissive: 0x6366f1,
    opacity: 0.48,
    emissiveIntensity: 1.4,
    shader: 'ghost_mask',
    orbitRadius: 1.55,
    height: 1.1,
    scale: 0.6,
    orbitSpeed: 0.95,
    schools: ['void'],
    damageTypes: ['void'],
    keyHints: ['void', 'abyss', 'tear'],
  },
};

export function listDragonKoiVariants(): DragonKoiVariantDef[] {
  return Object.values(DRAGON_KOI_VARIANTS);
}

/** Resolve cast skin from school / damage type / skill id / explicit variant. */
export function resolveDragonKoiVariant(opts?: {
  variant?: DragonKoiVariantId | string;
  school?: string;
  damageType?: string;
  skillId?: string;
  vfxKey?: string;
  animKey?: string;
}): DragonKoiVariantId {
  const explicit = opts?.variant as DragonKoiVariantId | undefined;
  if (explicit && DRAGON_KOI_VARIANTS[explicit]) return explicit;

  const hay = [
    opts?.school,
    opts?.damageType,
    opts?.skillId,
    opts?.vfxKey,
    opts?.animKey,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!hay) return 'arcane';

  for (const def of Object.values(DRAGON_KOI_VARIANTS)) {
    if (def.id === 'physical') continue;
    const tokens = [
      ...(def.schools ?? []),
      ...(def.damageTypes ?? []),
      ...(def.keyHints ?? []),
    ];
    if (tokens.some((t) => hay.includes(t.toLowerCase()))) return def.id;
  }

  if (/phys|slash|melee|cleave|combo/.test(hay)) return 'physical';
  return 'arcane';
}

/**
 * How long the aura should live for a combat skill (seconds).
 * Covers windup + active + short recovery; ends when cast finishes.
 */
export function dragonKoiCastDurationSec(opts: {
  windup?: number;
  active?: number;
  recovery?: number;
  castTimeSec?: number;
  min?: number;
  max?: number;
}): number {
  if (opts.castTimeSec != null && opts.castTimeSec > 0) {
    return clamp(opts.castTimeSec, opts.min ?? 0.35, opts.max ?? 8);
  }
  const w = opts.windup ?? 0.35;
  const a = opts.active ?? 0.25;
  const r = Math.min(opts.recovery ?? 0.2, 0.35);
  return clamp(w + a + r, opts.min ?? 0.45, opts.max ?? 6);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
