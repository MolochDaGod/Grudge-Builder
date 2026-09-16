/**
 * Dock + atoll raft test map — scene (9).glb
 *
 * Packs in the author file:
 *   island (1).glb     — Isola / Isola_Ocean / Atollo_Sabbia / Palma / Zattera
 *   wooden docks       — Cube013 deck + pilings
 *   animated sea shack — props on the dock
 *
 * Production: fleet ocean shader (hide Isola_Ocean visual), dock = walk deck,
 * palms = hatchet harvest, 1 log / split → stack `wood`, E at dock places
 * one log on Zattera until the raft is boardable.
 */
import type { WorldSurfaceLayer } from './worldSurfaceLayers';

export const DOCK_RAFT_CDN =
  'https://assets.grudge-studio.com/models/biomes/coast/dock_raft_test.glb';
export const DOCK_RAFT_LOCAL = '/models/biomes/coast/dock_raft_test.glb';
export const DOCK_RAFT_LOAD = [DOCK_RAFT_CDN, DOCK_RAFT_LOCAL] as const;

export const DOCK_RAFT_ITEM = {
  /** Stacked chop result — one log per pickup */
  log: 'wood',
} as const;

export const DOCK_RAFT_KIT = {
  id: 'dock_raft_test',
  name: 'Dock Raft Test',
  /** Logs required to finish the Zattera */
  logsToComplete: 6,
  /** One log added per E at the dock */
  logsPerPlace: 1,
  dockInteractRadiusM: 4.2,
  treeHeightM: 6.2,
  raftFreeboardM: 0.18,
} as const;

export type DockRaftLayer = Extract<
  WorldSurfaceLayer,
  'terrain' | 'water' | 'seafloor' | 'dock' | 'deck' | 'building' | 'column' | 'ignore'
>;

export const DOCK_RAFT_WALK: ReadonlySet<DockRaftLayer> = new Set([
  'terrain',
  'dock',
  'deck',
  'seafloor',
]);

export const DOCK_RAFT_SOLID: ReadonlySet<DockRaftLayer> = new Set([
  'terrain',
  'dock',
  'deck',
  'seafloor',
  'building',
  'column',
]);

/** Classify scene (9) meshes from name + parent chain. */
export function classifyDockRaftMesh(
  label: string,
  size?: { x: number; y: number; z: number },
): DockRaftLayer {
  const s = String(label || '').toLowerCase();
  if (/sky|skydome|fog|camera|light|perspective/.test(s)) return 'ignore';
  if (/isola_ocean|\bocean\b|\bwater\b|\bsea\b/.test(s)) return 'water';
  if (/sand_bottom|seafloor|fondale/.test(s)) return 'seafloor';
  if (/atollo|sabbia|sand|isola\b|island/.test(s)) return 'terrain';
  if (/cube013_material_0|wooden_dock|dock|pontile|wharf|pier/.test(s)) return 'dock';
  if (/cube013|deck/.test(s) && size && size.y < Math.max(size.x, size.z) * 0.25) {
    return 'deck';
  }
  if (/zattera|tronco|raft|corda/.test(s)) return 'ignore';
  if (/palma|palm|foglia|tree/.test(s)) return 'ignore';
  if (/shack|house|bed|ladder|barrel|wall|door/.test(s)) return 'building';
  if (/rock|stone|conchiglie/.test(s)) return 'terrain';
  if (size) {
    const xz = Math.max(size.x, size.z, 0.001);
    if (size.y < xz * 0.2) return 'terrain';
    if (size.y > xz * 0.8) return 'column';
  }
  return 'terrain';
}

export function isDockRaftPalmLabel(label: string): boolean {
  return /modulo.?palma|palm.?tree|palma00/i.test(label);
}

export function isDockRaftRaftLabel(label: string): boolean {
  return /zattera|tronco/i.test(label);
}

export function isDockRaftOceanLabel(label: string): boolean {
  return /isola_ocean|\bocean\b/i.test(label);
}
