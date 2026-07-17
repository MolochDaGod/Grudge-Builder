/**
 * Build Hammer — hand tool for modular / prop placement (Conan / Dune Awakening style).
 *
 * Mesh source: survival kit multipack node `hammer` (same mesh as workbench tool).
 * Runtime scale is **0.8** of that authored hammer so it sits cleanly in-hand.
 * Do not treat this as a combat weapon — anim set stays unarmed/locomotion.
 */

import { BUILD_PACK_PATHS, SURVIVAL_KIT_NODES } from './buildSystem';

export const BUILD_HAMMER_ID = 'build_hammer' as const;
export const BUILD_HAMMER_NAME = 'Build Hammer';

/** Scale relative to the survival-kit `hammer` mesh authoring size. */
export const BUILD_HAMMER_SCALE = 0.8;

/**
 * Attachment bones tried in order (Grudge6 race packs → Mixamo → generic).
 * Primary: R_hand_container from grudge6 race GLBs.
 */
export const BUILD_HAMMER_BONE_CANDIDATES = [
  'R_hand_container',
  'handslot.r',
  'handslot_r',
  'RightHand',
  'mixamorig:RightHand',
  'mixamorigRightHand',
  'Hand_R',
  'hand_r',
  'Bip001 R Hand',
  'weapon_r',
] as const;

export interface BuildHammerDef {
  id: typeof BUILD_HAMMER_ID;
  name: typeof BUILD_HAMMER_NAME;
  /** Multipack path containing the hammer node */
  sourceGlb: string;
  /** Node name inside multipack */
  nodeName: string;
  /** 0.8 of authored hammer mesh */
  scale: number;
  /** Local offset once parented to hand bone (meters) */
  attachOffset: [number, number, number];
  /** Local Euler radians [x, y, z] for grip pose */
  attachRotation: [number, number, number];
  /** Also try to show race pack Units_/weapon_hammer_* if present */
  equipRaceHammerSlot: boolean;
  raceHammerVariant: string;
  /** Tint so it reads as a tool, not combat maul */
  toolTint: number;
  emissive: number;
  emissiveIntensity: number;
}

export const BUILD_HAMMER: BuildHammerDef = {
  id: BUILD_HAMMER_ID,
  name: BUILD_HAMMER_NAME,
  sourceGlb: BUILD_PACK_PATHS.survivalKit,
  nodeName: SURVIVAL_KIT_NODES.hammer, // 'hammer'
  scale: BUILD_HAMMER_SCALE,
  // Grip: head forward, handle into palm
  attachOffset: [0.04, 0.02, 0.0],
  attachRotation: [Math.PI / 2, 0, Math.PI / 8],
  // Prefer external survival-kit mesh only — race Units_hammer would double-up
  equipRaceHammerSlot: false,
  raceHammerVariant: 'A',
  toolTint: 0xc4a574,
  emissive: 0x3b82f6,
  emissiveIntensity: 0.12,
};

/** Build UI groups shown as Dune Awakening–style horizontal tabs (order matters). */
export const BUILD_TAB_ORDER = [
  'structure',
  'camp',
  'crafting',
  'storage',
  'furniture',
  'defense',
  'farming',
  'transport',
  'decoration',
  'nature',
  'terrain',
] as const;

export type BuildTabId = (typeof BUILD_TAB_ORDER)[number];

export const BUILD_TAB_LABELS: Record<BuildTabId, string> = {
  structure: 'Structure',
  camp: 'Camps',
  crafting: 'Crafting',
  storage: 'Storage',
  furniture: 'Furniture',
  defense: 'Defense',
  farming: 'Farming',
  transport: 'Transport',
  decoration: 'Decor',
  nature: 'Nature',
  terrain: 'Terrain',
};

/** Number keys 1–9 cycle first 9 tabs while in build mode (Dune-style quick tabs). */
export function buildTabFromDigitKey(key: string): BuildTabId | null {
  const n = parseInt(key, 10);
  if (!Number.isFinite(n) || n < 1 || n > 9) return null;
  return BUILD_TAB_ORDER[n - 1] ?? null;
}
