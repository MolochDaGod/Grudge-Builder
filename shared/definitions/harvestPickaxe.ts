/**
 * Harvest Pickaxe — hand tool for harvest mode locomotion + node mining.
 * Mesh: survival kit multipack node toolPickaxe (fallback: procedural pick).
 */
import { BUILD_PACK_PATHS, SURVIVAL_KIT_NODES } from './buildSystem';
import { BUILD_HAMMER_BONE_CANDIDATES } from './buildHammer';

export const HARVEST_PICKAXE_ID = 'harvest_pickaxe' as const;
export const HARVEST_PICKAXE_NAME = 'Flint Pickaxe';
export const HARVEST_PICKAXE_SCALE = 0.85;

export const HARVEST_PICKAXE_BONE_CANDIDATES = BUILD_HAMMER_BONE_CANDIDATES;

export interface HarvestPickaxeDef {
  id: typeof HARVEST_PICKAXE_ID;
  name: typeof HARVEST_PICKAXE_NAME;
  sourceGlb: string;
  nodeName: string;
  scale: number;
  attachOffset: [number, number, number];
  attachRotation: [number, number, number];
  equipRacePickSlot: boolean;
  racePickVariant: string;
  toolTint: number;
  emissive: number;
  emissiveIntensity: number;
}

export const HARVEST_PICKAXE: HarvestPickaxeDef = {
  id: HARVEST_PICKAXE_ID,
  name: HARVEST_PICKAXE_NAME,
  sourceGlb: BUILD_PACK_PATHS.survivalKit,
  nodeName: SURVIVAL_KIT_NODES.toolPickaxe,
  scale: HARVEST_PICKAXE_SCALE,
  // Head forward of knuckles, handle in palm
  attachOffset: [0.03, 0.01, 0.02],
  attachRotation: [Math.PI / 2, 0.15, Math.PI / 10],
  equipRacePickSlot: true,
  racePickVariant: 'A',
  toolTint: 0x9a8b78,
  emissive: 0x22c55e,
  emissiveIntensity: 0.1,
};
