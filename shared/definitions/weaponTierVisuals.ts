/**
 * WeaponTierVisuals — SAME mesh T1–T8; only looks + item data change.
 *
 * HARD RULE:
 *   • One weapon asset (prefab style GLB) for all tiers of that item.
 *   • Tier does NOT swap the mesh. No `_t1`…`_t8` GLB loads.
 *   • Tier upgrades are nearly weightless: material/shader tint, roughness,
 *     glow, edge sheen, particles, procs — applied on the existing Object3D.
 *   • Stats, skill options, passives, enhancements, infusions live on the
 *     **item UUID instance** and scale with tier — not a new asset.
 *
 * Style (copper/silver/…/viking) picks which base mesh family.
 * Tier (1–8) only dresses that mesh + upgrades the item record.
 *
 *   T1 Crude → T2 Iron → T3 Steel → T4 Hardened
 *   T5 Runic → T6 Infernal → T7 Legendary → T8 Mythic
 *
 * Usage:
 *   const vis = getWeaponVisuals('SWORD', 5); // same modelUrl as T1
 *   applyToWeapon(root, { tier: 5, enhancement, infusion }); // looks only
 *   upgradeWeaponItem(itemUuid, 5); // stats / skills / passives on UUID
 */

import { ASSET_CDN_BASE } from '../../client/src/lib/assetConfig';
import {
  getWeaponPrefab,
  resolveWeaponPrefabUrl,
  styleIndexForPowerTier,
  type WeaponStyleId,
  type WeaponStyleIndex,
} from './weaponPrefabCatalog';

// ── Tier Definitions (shared across all weapon types) ────────────────────────

export interface TierVisual {
  tier: number;
  tierName: string;
  /**
   * @deprecated Never used for mesh loading. Same GLB for all tiers.
   * Kept only for legacy UI labels; do not resolve assets with this suffix.
   */
  modelSuffix: string;
  /** Material color tint multiplied onto the base texture (shader only) */
  tint: number;
  /** Emissive glow intensity (0 = none, 1 = fully emissive) */
  glowIntensity: number;
  /** Emissive glow color */
  glowColor: number;
  /** Particle trail effect ID (null = no trail) */
  trailEffect: string | null;
  /** Trail color */
  trailColor: number;
  /** Aura effect ID (null = no aura) */
  auraEffect: string | null;
  /** Aura color */
  auraColor: number;
  /** Rarity border color for UI */
  rarityColor: string;
  /** Rarity name */
  rarityName: string;

  // ── Three.js material ladder (rough → mythic) ────────────────────────────
  /** 0–1 PBR roughness — high = crude/rough, low = polished */
  roughness: number;
  /** 0–1 metalness */
  metalness: number;
  /** MeshPhysicalMaterial clearcoat (0 off) — T5+ */
  clearcoat: number;
  /** Clearcoat roughness */
  clearcoatRoughness: number;
  /** Fresnel rim strength on blade edge (shader) */
  edgeRim: number;
  /** Procedural surface noise (scratches/forge marks) 0–1 */
  surfaceNoise: number;
  /** Use MeshPhysicalMaterial vs Standard */
  physical: boolean;
  /** Pulse emissive (sin) amplitude for high tiers */
  glowPulse: number;
  /** Blade sheen / anisotropy-like fake (shader) */
  bladeSheen: number;
}

export const TIER_VISUALS: TierVisual[] = [
  {
    tier: 1, tierName: 'Crude', modelSuffix: '_t1',
    tint: 0x8a8070, glowIntensity: 0, glowColor: 0x000000,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#888888', rarityName: 'Common',
    roughness: 0.92, metalness: 0.15, clearcoat: 0, clearcoatRoughness: 1,
    edgeRim: 0.05, surfaceNoise: 0.85, physical: false, glowPulse: 0, bladeSheen: 0.05,
  },
  {
    tier: 2, tierName: 'Iron', modelSuffix: '_t2',
    tint: 0xa8a8a8, glowIntensity: 0, glowColor: 0x000000,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#888888', rarityName: 'Common',
    roughness: 0.78, metalness: 0.35, clearcoat: 0, clearcoatRoughness: 1,
    edgeRim: 0.1, surfaceNoise: 0.65, physical: false, glowPulse: 0, bladeSheen: 0.12,
  },
  {
    tier: 3, tierName: 'Steel', modelSuffix: '_t3',
    tint: 0xc8cdd4, glowIntensity: 0.08, glowColor: 0xaaccff,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#22cc55', rarityName: 'Uncommon',
    roughness: 0.55, metalness: 0.55, clearcoat: 0.05, clearcoatRoughness: 0.6,
    edgeRim: 0.2, surfaceNoise: 0.4, physical: true, glowPulse: 0, bladeSheen: 0.25,
  },
  {
    tier: 4, tierName: 'Hardened', modelSuffix: '_t4',
    tint: 0xdde4ee, glowIntensity: 0.18, glowColor: 0x99bbff,
    trailEffect: 'spark_trail', trailColor: 0xaabbcc,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#3388ff', rarityName: 'Rare',
    roughness: 0.4, metalness: 0.7, clearcoat: 0.15, clearcoatRoughness: 0.4,
    edgeRim: 0.35, surfaceNoise: 0.25, physical: true, glowPulse: 0.05, bladeSheen: 0.4,
  },
  {
    tier: 5, tierName: 'Runic', modelSuffix: '_t5',
    tint: 0xe8e8ff, glowIntensity: 0.4, glowColor: 0x6666ff,
    trailEffect: 'rune_trail', trailColor: 0x6666ff,
    auraEffect: 'rune_pulse', auraColor: 0x4444cc,
    rarityColor: '#aa44ff', rarityName: 'Epic',
    roughness: 0.32, metalness: 0.75, clearcoat: 0.35, clearcoatRoughness: 0.25,
    edgeRim: 0.55, surfaceNoise: 0.15, physical: true, glowPulse: 0.2, bladeSheen: 0.55,
  },
  {
    tier: 6, tierName: 'Infernal', modelSuffix: '_t6',
    tint: 0xffddcc, glowIntensity: 0.6, glowColor: 0xff6622,
    trailEffect: 'flame_trail', trailColor: 0xff4400,
    auraEffect: 'fire_aura', auraColor: 0xff6600,
    rarityColor: '#ff8800', rarityName: 'Epic',
    roughness: 0.28, metalness: 0.8, clearcoat: 0.45, clearcoatRoughness: 0.2,
    edgeRim: 0.7, surfaceNoise: 0.12, physical: true, glowPulse: 0.35, bladeSheen: 0.65,
  },
  {
    tier: 7, tierName: 'Legendary', modelSuffix: '_t7',
    tint: 0xfff8e0, glowIntensity: 0.8, glowColor: 0xf6c945,
    trailEffect: 'golden_trail', trailColor: 0xf6c945,
    auraEffect: 'legend_aura', auraColor: 0xf6c945,
    rarityColor: '#f6c945', rarityName: 'Legendary',
    roughness: 0.18, metalness: 0.9, clearcoat: 0.7, clearcoatRoughness: 0.12,
    edgeRim: 0.85, surfaceNoise: 0.06, physical: true, glowPulse: 0.45, bladeSheen: 0.85,
  },
  {
    tier: 8, tierName: 'Mythic', modelSuffix: '_t8',
    tint: 0xffffff, glowIntensity: 1.0, glowColor: 0xff44ff,
    trailEffect: 'mythic_trail', trailColor: 0xff44ff,
    auraEffect: 'mythic_aura', auraColor: 0xcc22ff,
    rarityColor: '#ff44ff', rarityName: 'Mythic',
    roughness: 0.12, metalness: 0.95, clearcoat: 1.0, clearcoatRoughness: 0.08,
    edgeRim: 1.0, surfaceNoise: 0.03, physical: true, glowPulse: 0.65, bladeSheen: 1.0,
  },
];

/** Enhancement / infusion overlays (craft sockets) — stacked on tier. */
export type WeaponEnhancementId =
  | 'none'
  | 'sharpened'
  | 'reinforced'
  | 'balanced'
  | 'masterwork';

export type WeaponInfusionId =
  | 'none'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'arcane'
  | 'holy'
  | 'nature'
  | 'void';

export interface EnhancementVisual {
  id: WeaponEnhancementId;
  label: string;
  /** Extra metalness / polish */
  metalnessBoost: number;
  roughnessDelta: number;
  edgeRimBoost: number;
  sheenBoost: number;
  /** Optional overlay tint multiply */
  tintMultiply: number;
}

export interface InfusionVisual {
  id: WeaponInfusionId;
  label: string;
  glowColor: number;
  glowBoost: number;
  trailColor: number;
  particleId: string | null;
  /** Fresnel edge color */
  rimColor: number;
  pulse: number;
}

export const ENHANCEMENT_VISUALS: Record<WeaponEnhancementId, EnhancementVisual> = {
  none: {
    id: 'none', label: 'None',
    metalnessBoost: 0, roughnessDelta: 0, edgeRimBoost: 0, sheenBoost: 0, tintMultiply: 0xffffff,
  },
  sharpened: {
    id: 'sharpened', label: 'Sharpened',
    metalnessBoost: 0.08, roughnessDelta: -0.08, edgeRimBoost: 0.2, sheenBoost: 0.15, tintMultiply: 0xffffff,
  },
  reinforced: {
    id: 'reinforced', label: 'Reinforced',
    metalnessBoost: 0.12, roughnessDelta: -0.05, edgeRimBoost: 0.05, sheenBoost: 0.05, tintMultiply: 0xeeeee8,
  },
  balanced: {
    id: 'balanced', label: 'Balanced',
    metalnessBoost: 0.05, roughnessDelta: -0.1, edgeRimBoost: 0.1, sheenBoost: 0.1, tintMultiply: 0xf0f4ff,
  },
  masterwork: {
    id: 'masterwork', label: 'Masterwork',
    metalnessBoost: 0.15, roughnessDelta: -0.15, edgeRimBoost: 0.25, sheenBoost: 0.25, tintMultiply: 0xfff8e8,
  },
};

export const INFUSION_VISUALS: Record<WeaponInfusionId, InfusionVisual> = {
  none: {
    id: 'none', label: 'None',
    glowColor: 0x000000, glowBoost: 0, trailColor: 0x000000,
    particleId: null, rimColor: 0xffffff, pulse: 0,
  },
  fire: {
    id: 'fire', label: 'Fire',
    glowColor: 0xff4400, glowBoost: 0.45, trailColor: 0xff6622,
    particleId: 'flame_trail', rimColor: 0xffaa44, pulse: 0.3,
  },
  frost: {
    id: 'frost', label: 'Frost',
    glowColor: 0x66ccff, glowBoost: 0.4, trailColor: 0xaaddff,
    particleId: 'frost_trail', rimColor: 0xccf0ff, pulse: 0.2,
  },
  lightning: {
    id: 'lightning', label: 'Lightning',
    glowColor: 0xaaccff, glowBoost: 0.5, trailColor: 0x88ddff,
    particleId: 'spark_trail', rimColor: 0xffffff, pulse: 0.55,
  },
  arcane: {
    id: 'arcane', label: 'Arcane',
    glowColor: 0xaa66ff, glowBoost: 0.5, trailColor: 0xcc88ff,
    particleId: 'rune_trail', rimColor: 0xddaaff, pulse: 0.4,
  },
  holy: {
    id: 'holy', label: 'Holy',
    glowColor: 0xffeebb, glowBoost: 0.45, trailColor: 0xfff0c0,
    particleId: 'golden_trail', rimColor: 0xffffff, pulse: 0.25,
  },
  nature: {
    id: 'nature', label: 'Nature',
    glowColor: 0x44cc66, glowBoost: 0.35, trailColor: 0x66dd88,
    particleId: 'leaf_trail', rimColor: 0xaaffbb, pulse: 0.2,
  },
  void: {
    id: 'void', label: 'Void',
    glowColor: 0x8822aa, glowBoost: 0.55, trailColor: 0xaa44cc,
    particleId: 'mythic_trail', rimColor: 0xcc66ff, pulse: 0.5,
  },
};

/** Resolved shader stack for runtime Three.js apply. */
export interface WeaponShaderStack {
  tier: number;
  tierName: string;
  tint: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  emissive: number;
  emissiveIntensity: number;
  edgeRim: number;
  edgeRimColor: number;
  surfaceNoise: number;
  bladeSheen: number;
  glowPulse: number;
  physical: boolean;
  trail: { effect: string; color: number } | null;
  aura: { effect: string; color: number } | null;
  enhancement: WeaponEnhancementId;
  infusion: WeaponInfusionId;
}

export function buildWeaponShaderStack(
  tier: number,
  enhancement: WeaponEnhancementId = 'none',
  infusion: WeaponInfusionId = 'none',
): WeaponShaderStack {
  const t = Math.max(1, Math.min(8, Math.floor(tier)));
  const tv = TIER_VISUALS[t - 1]!;
  const en = ENHANCEMENT_VISUALS[enhancement] ?? ENHANCEMENT_VISUALS.none;
  const inf = INFUSION_VISUALS[infusion] ?? INFUSION_VISUALS.none;

  const roughness = Math.min(1, Math.max(0.05, tv.roughness + en.roughnessDelta));
  const metalness = Math.min(1, Math.max(0, tv.metalness + en.metalnessBoost));
  const edgeRim = Math.min(1.5, tv.edgeRim + en.edgeRimBoost);
  const bladeSheen = Math.min(1.2, tv.bladeSheen + en.sheenBoost);

  let emissive = tv.glowColor;
  let emissiveIntensity = tv.glowIntensity + inf.glowBoost * 0.5;
  if (infusion !== 'none') {
    emissive = inf.glowColor;
    emissiveIntensity = Math.max(emissiveIntensity, inf.glowBoost);
  }

  // Tint: tier × enhancement multiply (simple RGB mul)
  const tint = multiplyHex(tv.tint, en.tintMultiply);

  const trailEffect = tv.trailEffect ?? inf.particleId;
  const trailColor = infusion !== 'none' ? inf.trailColor : tv.trailColor;

  return {
    tier: t,
    tierName: tv.tierName,
    tint,
    roughness,
    metalness,
    clearcoat: tv.clearcoat,
    clearcoatRoughness: tv.clearcoatRoughness,
    emissive,
    emissiveIntensity,
    edgeRim,
    edgeRimColor: infusion !== 'none' ? inf.rimColor : tv.glowColor || 0xffffff,
    surfaceNoise: tv.surfaceNoise,
    bladeSheen,
    glowPulse: Math.max(tv.glowPulse, inf.pulse),
    physical: tv.physical || t >= 3,
    trail: trailEffect ? { effect: trailEffect, color: trailColor } : null,
    aura: tv.auraEffect
      ? { effect: tv.auraEffect, color: infusion !== 'none' ? inf.glowColor : tv.auraColor }
      : null,
    enhancement,
    infusion,
  };
}

function multiplyHex(a: number, b: number): number {
  const ar = ((a >> 16) & 255) / 255;
  const ag = ((a >> 8) & 255) / 255;
  const ab = (a & 255) / 255;
  const br = ((b >> 16) & 255) / 255;
  const bg = ((b >> 8) & 255) / 255;
  const bb = (b & 255) / 255;
  const r = Math.min(255, Math.round(ar * br * 255));
  const g = Math.min(255, Math.round(ag * bg * 255));
  const bl = Math.min(255, Math.round(ab * bb * 255));
  return (r << 16) | (g << 8) | bl;
}

// ── Per-weapon-type model paths ──────────────────────────────────────────────

export interface WeaponTypeModelConfig {
  /**
   * Fallback base path if no style prefab exists.
   * Path is style-level identity only — never append tier suffix.
   */
  basePath: string;
  /** Scale multiplier for the weapon mesh (SI) */
  scale: number;
  /** Bone attachment point on the character skeleton */
  attachBone: string;
  /** Offset from the bone */
  attachOffset: [number, number, number];
  /** Rotation offset */
  attachRotation: [number, number, number];
}

// ── Item UUID progression (stats / skills / passives — not mesh) ─────────────

/**
 * Per-instance weapon item. Mesh identity is `prefabId` / style; tier only
 * upgrades numbers + unlocks skill/passive options on this UUID.
 */
export interface WeaponItemInstance {
  /** Stable item UUID (inventory / save / network) */
  itemUuid: string;
  /** Weapon type enum (SWORD, GUN, …) */
  weaponType: string;
  /** Visual style 1–6 (which GLB family) — fixed at craft/loot, not tier */
  styleId: WeaponStyleId | WeaponStyleIndex;
  /** Prefab catalog id — the single mesh for all tiers of this item */
  prefabId: string;
  /** Power tier 1–8 */
  tier: number;
  enhancement: WeaponEnhancementId;
  infusion: WeaponInfusionId;
  /** Unlocked skill ids for this item at current tier */
  unlockedSkills: string[];
  /** Unlocked passive ids */
  unlockedPassives: string[];
  /** Flat / scaled stats snapshot (derived from arsenal × tier) */
  stats: {
    physicalDamage: number;
    magicalDamage: number;
    attackSpeed: number;
    critChance: number;
    critDamage: number;
  };
  /** Proc hooks that scale with tier (combat, not mesh) */
  procs: Array<{ id: string; chance: number; effect: string }>;
}

/** Stat multipliers by tier (item UUID data — not visuals). */
export const WEAPON_TIER_STAT_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.12,
  3: 1.28,
  4: 1.48,
  5: 1.72,
  6: 2.0,
  7: 2.35,
  8: 2.75,
};

/** Skill slots unlocked by tier (option breadth grows — same weapon item). */
export function skillSlotUnlocksForTier(tier: number): {
  primary: boolean;
  secondary: boolean;
  ability: boolean;
  ultimate: boolean;
  maxUpgrades: number;
} {
  const t = Math.max(1, Math.min(8, tier));
  return {
    primary: true,
    secondary: t >= 2,
    ability: t >= 3,
    ultimate: t >= 5,
    maxUpgrades: t >= 7 ? 5 : t >= 4 ? 4 : 3,
  };
}

/**
 * Upgrade an item in place: same prefab/mesh, higher tier stats + unlocks.
 * Call after craft/enchant; then re-apply shaders only (no reload GLB).
 */
export function upgradeWeaponItemTier(
  item: WeaponItemInstance,
  newTier: number,
  baseStats: {
    physicalDamage: number;
    magicalDamage: number;
    attackSpeed: number;
    critChance: number;
    critDamage: number;
  },
  opts?: {
    enhancement?: WeaponEnhancementId;
    infusion?: WeaponInfusionId;
    unlockedSkills?: string[];
    unlockedPassives?: string[];
    procs?: WeaponItemInstance['procs'];
  },
): WeaponItemInstance {
  const tier = Math.max(1, Math.min(8, Math.floor(newTier)));
  const mult = WEAPON_TIER_STAT_MULT[tier] ?? 1;
  return {
    ...item,
    tier,
    enhancement: opts?.enhancement ?? item.enhancement,
    infusion: opts?.infusion ?? item.infusion,
    unlockedSkills: opts?.unlockedSkills ?? item.unlockedSkills,
    unlockedPassives: opts?.unlockedPassives ?? item.unlockedPassives,
    procs: opts?.procs ?? item.procs,
    stats: {
      physicalDamage: Math.round(baseStats.physicalDamage * mult),
      magicalDamage: Math.round(baseStats.magicalDamage * mult),
      attackSpeed: baseStats.attackSpeed * (1 + (tier - 1) * 0.03),
      critChance: baseStats.critChance + (tier - 1) * 0.01,
      critDamage: baseStats.critDamage + (tier - 1) * 0.05,
    },
  };
}

/** Create a new item UUID at T1 with fixed style mesh identity. */
export function createWeaponItemInstance(opts: {
  itemUuid: string;
  weaponType: string;
  styleId?: WeaponStyleId | WeaponStyleIndex;
  baseStats: WeaponItemInstance['stats'];
  enhancement?: WeaponEnhancementId;
  infusion?: WeaponInfusionId;
}): WeaponItemInstance {
  const style = opts.styleId ?? 1;
  const prefab = getWeaponPrefab(opts.weaponType, style);
  return {
    itemUuid: opts.itemUuid,
    weaponType: opts.weaponType.toUpperCase(),
    styleId: style,
    prefabId: prefab?.id ?? `${opts.weaponType.toLowerCase()}_style_default`,
    tier: 1,
    enhancement: opts.enhancement ?? 'none',
    infusion: opts.infusion ?? 'none',
    unlockedSkills: [],
    unlockedPassives: [],
    stats: { ...opts.baseStats },
    procs: [],
  };
}

export const WEAPON_MODEL_CONFIGS: Record<string, WeaponTypeModelConfig> = {
  SWORD:     { basePath: 'models/weapons/sword',     scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  AXE:       { basePath: 'models/weapons/axe',       scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  BOW:       { basePath: 'models/weapons/bow',       scale: 1.0, attachBone: 'handslot.l', attachOffset: [0, 0, 0],     attachRotation: [0, Math.PI / 2, 0] },
  CROSSBOW:  { basePath: 'models/weapons/crossbow',  scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  DAGGER:    { basePath: 'models/weapons/dagger',    scale: 0.8, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  GUN:       { basePath: 'models/codex/guns/gun_style_copper', scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0], attachRotation: [0, 0, 0] },
  STAFF:     { basePath: 'models/weapons/staff',     scale: 1.2, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  SHIELD:    { basePath: 'models/weapons/shield',    scale: 1.0, attachBone: 'handslot.l', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  SPEAR:     { basePath: 'models/weapons/spear',     scale: 1.3, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  HAMMER:    { basePath: 'models/weapons/hammer',    scale: 1.1, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  MACE:      { basePath: 'models/weapons/mace',      scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  WAND:      { basePath: 'models/weapons/wand',      scale: 0.7, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  /** Mage focus — not warrior steel */
  GRIMOIRE:  { basePath: 'models/weapons/grimoire',  scale: 0.9, attachBone: 'handslot.l', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  /** Ranger log / ammo kit */
  RANGER_LOG:{ basePath: 'models/weapons/ranger_log', scale: 0.85, attachBone: 'handslot.l', attachOffset: [0, 0, 0],  attachRotation: [0, 0, 0] },
  /** Warrior dual-wield battle system */
  BATTLE_DUAL:{ basePath: 'models/weapons/battle_dual', scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0], attachRotation: [0, 0, 0] },
  /** 2H knives + chain throw */
  CHAIN_KNIFE:{ basePath: 'models/weapons/chain_knife', scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0], attachRotation: [0, 0, 0] },
  TOME:      { basePath: 'models/weapons/tome',      scale: 0.9, attachBone: 'handslot.l', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  GREATSWORD:{ basePath: 'models/weapons/greatsword', scale: 1.3, attachBone: 'handslot.r', attachOffset: [0, 0, 0],    attachRotation: [0, 0, 0] },
  SCYTHE:    { basePath: 'models/weapons/scythe',    scale: 1.2, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  WHIP:      { basePath: 'models/weapons/whip',      scale: 1.0, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
  FIST:      { basePath: 'models/weapons/fist',      scale: 0.6, attachBone: 'handslot.r', attachOffset: [0, 0, 0],     attachRotation: [0, 0, 0] },
};

// ── API ──────────────────────────────────────────────────────────────────────

export interface WeaponVisualResult {
  tier: number;
  tierName: string;
  rarityName: string;
  rarityColor: string;
  /** Full CDN URL to the weapon GLB for this tier */
  modelUrl: string;
  /** Material tint to apply to the weapon mesh */
  tint: number;
  /** Emissive glow settings */
  glow: { intensity: number; color: number };
  /** Particle trail (null if tier < 4) */
  trail: { effect: string; color: number } | null;
  /** Aura effect (null if tier < 5) */
  aura: { effect: string; color: number } | null;
  /** Bone attachment config for the character skeleton */
  attach: WeaponTypeModelConfig;
  /** Production prefab style (1–6) when catalog has a mesh */
  styleIndex?: WeaponStyleIndex;
  styleId?: WeaponStyleId;
  prefabId?: string;
  prefabStatus?: 'ready' | 'fallback' | 'missing';
  /** Full Three.js shader stack (roughness → mythic + enhancement/infusion) */
  shader: WeaponShaderStack;
}

/**
 * Visual config for a weapon type at a tier.
 *
 * **Mesh is style-locked:** `modelUrl` is the same for T1–T8 for a given style.
 * Tier only changes `shader` / glow / trail / aura (apply in place — no GLB reload).
 *
 * Prefer `getWeaponVisualsForItem(item)` when you have a UUID instance.
 */
export function getWeaponVisuals(
  weaponTypeId: string,
  tier: number,
  /**
   * Style selects mesh family. Do NOT pass tier as style.
   * If omitted, uses style 1 (copper) — not tier-mapped — so mesh stays stable.
   */
  styleOverride?: WeaponStyleIndex | WeaponStyleId,
  enhancement: WeaponEnhancementId = 'none',
  infusion: WeaponInfusionId = 'none',
): WeaponVisualResult {
  const clampedTier = Math.max(1, Math.min(8, tier));
  const tierVis = TIER_VISUALS[clampedTier - 1]!;
  const modelConfig = WEAPON_MODEL_CONFIGS[weaponTypeId] ?? WEAPON_MODEL_CONFIGS.SWORD!;

  // Style = mesh identity. Default style 1 — never derive style from tier.
  const style = styleOverride ?? 1;
  const prefab = getWeaponPrefab(weaponTypeId, style);
  const prefabUrl = resolveWeaponPrefabUrl(weaponTypeId, style);
  // Same asset for all tiers — basePath only, no modelSuffix
  const legacyUrl = `${ASSET_CDN_BASE}/${modelConfig.basePath}.glb`;
  const modelUrl = prefabUrl ?? legacyUrl;
  const shader = buildWeaponShaderStack(clampedTier, enhancement, infusion);

  return {
    tier: clampedTier,
    tierName: tierVis.tierName,
    rarityName: tierVis.rarityName,
    rarityColor: tierVis.rarityColor,
    modelUrl,
    tint: shader.tint,
    glow: { intensity: shader.emissiveIntensity, color: shader.emissive },
    trail: shader.trail,
    aura: shader.aura,
    attach: modelConfig,
    styleIndex: prefab?.styleIndex,
    styleId: prefab?.styleId,
    prefabId: prefab?.id,
    prefabStatus: prefab?.status,
    shader,
  };
}

/** From inventory item UUID — mesh from style, looks from tier/enhance/infuse. */
export function getWeaponVisualsForItem(
  item: WeaponItemInstance,
): WeaponVisualResult {
  return getWeaponVisuals(
    item.weaponType,
    item.tier,
    item.styleId,
    item.enhancement,
    item.infusion,
  );
}

/** Get stat values for a weapon at a specific tier */
export function getWeaponStatsAtTier(
  baseStats: { base: number; perTier: number },
  tier: number,
): number {
  return baseStats.base + baseStats.perTier * (tier - 1);
}

/** Get all tier visuals for a weapon type (for UI tier comparison) */
export function getAllTierVisuals(weaponTypeId: string): WeaponVisualResult[] {
  return TIER_VISUALS.map((_, i) => getWeaponVisuals(weaponTypeId, i + 1));
}

/**
 * Update a single tier's visual config at runtime (for admin/editor use).
 * Mutates TIER_VISUALS in place.
 */
export function updateTierVisual(tier: number, partial: Partial<TierVisual>): void {
  const idx = tier - 1;
  if (idx < 0 || idx >= TIER_VISUALS.length) return;
  Object.assign(TIER_VISUALS[idx], partial);
}

/**
 * Update a weapon type's model config at runtime (for admin/editor use).
 */
export function updateWeaponModelConfig(weaponTypeId: string, partial: Partial<WeaponTypeModelConfig>): void {
  const config = WEAPON_MODEL_CONFIGS[weaponTypeId];
  if (config) Object.assign(config, partial);
}
