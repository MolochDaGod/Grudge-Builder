/**
 * WeaponTierVisuals — visual appearance progression for weapon tiers 1–8.
 *
 * Each tier upgrades: model variant, material tint, glow intensity, particle
 * trail color, and aura effect. This drives the 3D rendering in Island3DEngine
 * and the character creator preview.
 *
 * Tier names follow the Grudge crafting progression:
 *   T1: Crude       T2: Iron        T3: Steel       T4: Hardened
 *   T5: Runic       T6: Infernal    T7: Legendary   T8: Mythic
 *
 * Usage:
 *   const visuals = getWeaponVisuals('SWORD', 5);
 *   // → { tierName: 'Runic', modelSuffix: '_t5', tint: 0x6666ff, glow: 0.5, ... }
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
  /** Model suffix appended to base weapon GLB path (e.g. sword_t3.glb) */
  modelSuffix: string;
  /** Material color tint multiplied onto the base texture */
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
}

export const TIER_VISUALS: TierVisual[] = [
  {
    tier: 1, tierName: 'Crude', modelSuffix: '_t1',
    tint: 0xaaaaaa, glowIntensity: 0, glowColor: 0x000000,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#888888', rarityName: 'Common',
  },
  {
    tier: 2, tierName: 'Iron', modelSuffix: '_t2',
    tint: 0xcccccc, glowIntensity: 0, glowColor: 0x000000,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#888888', rarityName: 'Common',
  },
  {
    tier: 3, tierName: 'Steel', modelSuffix: '_t3',
    tint: 0xdddddd, glowIntensity: 0.1, glowColor: 0xaaccff,
    trailEffect: null, trailColor: 0x000000,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#22cc55', rarityName: 'Uncommon',
  },
  {
    tier: 4, tierName: 'Hardened', modelSuffix: '_t4',
    tint: 0xeeeedd, glowIntensity: 0.2, glowColor: 0xccddff,
    trailEffect: 'spark_trail', trailColor: 0xaabbcc,
    auraEffect: null, auraColor: 0x000000,
    rarityColor: '#3388ff', rarityName: 'Rare',
  },
  {
    tier: 5, tierName: 'Runic', modelSuffix: '_t5',
    tint: 0xeeeeff, glowIntensity: 0.4, glowColor: 0x6666ff,
    trailEffect: 'rune_trail', trailColor: 0x6666ff,
    auraEffect: 'rune_pulse', auraColor: 0x4444cc,
    rarityColor: '#aa44ff', rarityName: 'Epic',
  },
  {
    tier: 6, tierName: 'Infernal', modelSuffix: '_t6',
    tint: 0xffddcc, glowIntensity: 0.6, glowColor: 0xff6622,
    trailEffect: 'flame_trail', trailColor: 0xff4400,
    auraEffect: 'fire_aura', auraColor: 0xff6600,
    rarityColor: '#ff8800', rarityName: 'Epic',
  },
  {
    tier: 7, tierName: 'Legendary', modelSuffix: '_t7',
    tint: 0xfff8e0, glowIntensity: 0.8, glowColor: 0xf6c945,
    trailEffect: 'golden_trail', trailColor: 0xf6c945,
    auraEffect: 'legend_aura', auraColor: 0xf6c945,
    rarityColor: '#f6c945', rarityName: 'Legendary',
  },
  {
    tier: 8, tierName: 'Mythic', modelSuffix: '_t8',
    tint: 0xffffff, glowIntensity: 1.0, glowColor: 0xff44ff,
    trailEffect: 'mythic_trail', trailColor: 0xff44ff,
    auraEffect: 'mythic_aura', auraColor: 0xcc22ff,
    rarityColor: '#ff44ff', rarityName: 'Mythic',
  },
];

// ── Per-weapon-type model paths ──────────────────────────────────────────────

export interface WeaponTypeModelConfig {
  /** Base model path on R2 CDN (without tier suffix) */
  basePath: string;
  /** Scale multiplier for the weapon mesh */
  scale: number;
  /** Bone attachment point on the character skeleton */
  attachBone: string;
  /** Offset from the bone */
  attachOffset: [number, number, number];
  /** Rotation offset */
  attachRotation: [number, number, number];
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
}

/**
 * Get the full visual config for a weapon type at a specific tier.
 * Uses weaponPrefabCatalog (6 styles) when a converted mesh exists; otherwise
 * falls back to legacy models/weapons/{type}_tN.glb path.
 */
export function getWeaponVisuals(
  weaponTypeId: string,
  tier: number,
  styleOverride?: WeaponStyleIndex | WeaponStyleId,
): WeaponVisualResult {
  const clampedTier = Math.max(1, Math.min(8, tier));
  const tierVis = TIER_VISUALS[clampedTier - 1]!;
  const modelConfig = WEAPON_MODEL_CONFIGS[weaponTypeId] ?? WEAPON_MODEL_CONFIGS.SWORD!;

  const style =
    styleOverride ?? styleIndexForPowerTier(clampedTier);
  const prefab = getWeaponPrefab(weaponTypeId, style);
  const prefabUrl = resolveWeaponPrefabUrl(weaponTypeId, style);
  const legacyUrl = `${ASSET_CDN_BASE}/${modelConfig.basePath}${tierVis.modelSuffix}.glb`;
  const modelUrl = prefabUrl ?? legacyUrl;

  return {
    tier: clampedTier,
    tierName: tierVis.tierName,
    rarityName: tierVis.rarityName,
    rarityColor: tierVis.rarityColor,
    modelUrl,
    tint: tierVis.tint,
    glow: { intensity: tierVis.glowIntensity, color: tierVis.glowColor },
    trail: tierVis.trailEffect
      ? { effect: tierVis.trailEffect, color: tierVis.trailColor }
      : null,
    aura: tierVis.auraEffect
      ? { effect: tierVis.auraEffect, color: tierVis.auraColor }
      : null,
    attach: modelConfig,
    styleIndex: prefab?.styleIndex,
    styleId: prefab?.styleId,
    prefabId: prefab?.id,
    prefabStatus: prefab?.status,
  };
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
