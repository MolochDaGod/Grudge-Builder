/**
 * T0 weapon → mesh / race-kit slot SSOT.
 *
 * Items live in tier0Items.ts (stats/craft).
 * Visuals resolve here so T0 never stays "emoji only".
 *
 * Priority:
 *   1. Dedicated GLB (bone dagger CDN)
 *   2. Race kit child mesh (sword_A, bow, staff_A…)
 *   3. Codex copper style (crude external mesh)
 */

import type { T0ItemDefinition } from './tier0Items';
import { T0_WEAPONS, T0_OFFHAND, getT0Item } from './tier0Items';

const CDN = 'https://assets.grudge-studio.com';

export type T0WeaponVisualKind =
  | 'race_kit' // toggle grudge6 child mesh
  | 'external_glb' // attach GLB to hand bone
  | 'codex'; // models/codex/* copper / t0

export interface T0WeaponVisual {
  itemId: string;
  /** Inventory subType */
  subType: string;
  /** grudge6Equipment weaponSlots key */
  meshSlot: string;
  /** Variant on race kit (A / _default) when race_kit */
  raceKitVariant: string;
  /** How to render when not relying on kit wardrobe alone */
  visualKind: T0WeaponVisualKind;
  /** External GLB (same-origin then CDN) */
  localPath: string | null;
  r2Key: string | null;
  cdnUrl: string | null;
  /** Preferred hand socket */
  attachBone: 'R_hand_container' | 'L_hand_container' | 'L_shield_container';
  /** SI length hint metres (for attach scale) */
  lengthM: number;
  notes?: string;
}

function t0Glb(file: string): Pick<T0WeaponVisual, 'localPath' | 'r2Key' | 'cdnUrl'> {
  const r2Key = `models/codex/t0/${file}`;
  return {
    localPath: `/models/codex/t0/${file}`,
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
  };
}

function copper(tool: string): Pick<T0WeaponVisual, 'localPath' | 'r2Key' | 'cdnUrl'> {
  const name = `copper_${tool}`;
  const r2Key = `models/codex/glitch-weapons/weapons/${name}.glb`;
  return {
    localPath: `/models/codex/glitch-weapons/weapons/${name}/${name}.glb`,
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
  };
}

/**
 * Canonical T0 weapon visuals — includes bone dagger as primary dagger mesh.
 */
export const T0_WEAPON_VISUALS: Record<string, T0WeaponVisual> = {
  t0_sword: {
    itemId: 't0_sword',
    subType: 'sword',
    meshSlot: 'sword',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    ...copper('sword'),
    attachBone: 'R_hand_container',
    lengthM: 0.85,
    notes: 'Rusty shortsword — kit sword_A or copper_sword',
  },
  /** Alias used by camp tower loadout (legacy id) */
  t0_training_sword: {
    itemId: 't0_training_sword',
    subType: 'sword',
    meshSlot: 'sword',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    ...copper('sword'),
    attachBone: 'R_hand_container',
    lengthM: 0.85,
    notes: 'Alias of t0_sword for camp units',
  },
  t0_axe: {
    itemId: 't0_axe',
    subType: 'axe',
    meshSlot: 'axe',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    ...copper('axe'),
    attachBone: 'R_hand_container',
    lengthM: 0.75,
  },
  t0_dagger: {
    itemId: 't0_dagger',
    subType: 'dagger',
    meshSlot: 'dagger',
    raceKitVariant: 'A',
    visualKind: 'external_glb',
    ...t0Glb('bone_dagger.glb'),
    attachBone: 'R_hand_container',
    lengthM: 0.4,
    notes: 'Sharpened bone — same family as t0_bone_dagger',
  },
  /** Explicit bone dagger (player download 2bone_knife.glb) */
  t0_bone_dagger: {
    itemId: 't0_bone_dagger',
    subType: 'dagger',
    meshSlot: 'dagger',
    raceKitVariant: 'A',
    visualKind: 'external_glb',
    ...t0Glb('bone_dagger.glb'),
    attachBone: 'R_hand_container',
    lengthM: 0.42,
    notes: 'Canonical T0 bone dagger mesh (Documents/2bone_knife.glb)',
  },
  t0_bow: {
    itemId: 't0_bow',
    subType: 'bow',
    meshSlot: 'bow',
    raceKitVariant: '_default',
    visualKind: 'race_kit',
    localPath: null,
    r2Key: null,
    cdnUrl: null,
    attachBone: 'L_hand_container',
    lengthM: 1.1,
    notes: 'Race kit WK_weapon_Bow',
  },
  t0_staff: {
    itemId: 't0_staff',
    subType: 'staff',
    meshSlot: 'staff',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    localPath: null,
    r2Key: null,
    cdnUrl: null,
    attachBone: 'R_hand_container',
    lengthM: 1.4,
    notes: 'Gnarled branch — kit staff_A; T1 race staffs are separate',
  },
  t0_hammer: {
    itemId: 't0_hammer',
    subType: 'hammer',
    meshSlot: 'hammer',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    ...copper('picaxe'),
    attachBone: 'R_hand_container',
    lengthM: 0.8,
    notes: 'Stone hammer — kit hammer_A or copper pick as crude blunt',
  },
  t0_shield: {
    itemId: 't0_shield',
    subType: 'shield',
    meshSlot: 'shield',
    raceKitVariant: 'A',
    visualKind: 'race_kit',
    localPath: null,
    r2Key: null,
    cdnUrl: null,
    attachBone: 'L_shield_container',
    lengthM: 0.55,
  },
};

export function getT0WeaponVisual(itemId: string): T0WeaponVisual | null {
  const id = (itemId || '').trim();
  if (T0_WEAPON_VISUALS[id]) return T0_WEAPON_VISUALS[id]!;
  // Fuzzy: bone dagger aliases
  const lower = id.toLowerCase();
  if (lower.includes('bone') && lower.includes('dagger')) {
    return T0_WEAPON_VISUALS.t0_bone_dagger;
  }
  if (lower === 't0_training_sword') return T0_WEAPON_VISUALS.t0_training_sword;
  return null;
}

/** Resolve best mesh URL for external attach (null → use race kit only). */
export function resolveT0WeaponMeshUrl(itemId: string): string | null {
  const v = getT0WeaponVisual(itemId);
  if (!v) return null;
  return v.localPath ?? v.cdnUrl;
}

export function listT0WeaponVisuals(): T0WeaponVisual[] {
  return Object.values(T0_WEAPON_VISUALS);
}

/** Item def + visual for UI / equip. */
export function getT0WeaponBundle(itemId: string): {
  item: T0ItemDefinition | undefined;
  visual: T0WeaponVisual | null;
} {
  const visual = getT0WeaponVisual(itemId);
  const item =
    getT0Item(itemId)
    || (itemId === 't0_training_sword' ? T0_WEAPONS.t0_sword : undefined)
    || (itemId === 't0_bone_dagger' ? T0_WEAPONS.t0_dagger : undefined)
    || T0_OFFHAND[itemId as keyof typeof T0_OFFHAND];
  return { item, visual };
}
