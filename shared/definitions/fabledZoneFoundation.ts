/**
 * Fabled Zone Foundation — core sector map for Fabled-era open world.
 *
 * Core GLB: fabledzone.glb (islands, village, forge, landscape).
 * Sector may host many procedural islands; THIS is the capital core.
 *
 * Castle / interiors: uMMORPG-style dwarf main city (dwarf_main_city.glb).
 * Entry: cave-doorway portals on rock mouths and building entrances →
 *        load castle / building interiors (not free roam through solid walls).
 *
 * Primary sector: frostbite_expanse (Runeforge Hold · dwarf capital · Fabled).
 * Optional satellites: ethereal_falls (scaled-down core).
 */

export const FABLED_ZONE_SECTOR_ID = 'frostbite_expanse' as const;
export const FABLED_CITY_ID = 'runeforge_hold' as const;
export const FABLED_ZONE_FOUNDATION_VERSION = '1.0.0';

/** Local public path (upload same key to R2). */
export const FABLED_ZONE_GLB = '/models/warlords/fabled/fabledzone.glb';
export const FABLED_ZONE_CDN_KEY = 'models/warlords/fabled/fabledzone.glb';

/**
 * Dwarf main city / castle interior pack (uMMORPG-style hold).
 * Replace file with true ummorpg dwarf main-city export when available.
 * Interim: medieval_town.glb staged as dwarf_main_city.glb.
 */
export const FABLED_DWARF_CASTLE_GLB = '/models/warlords/fabled/dwarf_main_city.glb';
export const FABLED_DWARF_CASTLE_CDN_KEY = 'models/warlords/fabled/dwarf_main_city.glb';

/** Existing town pieces still valid as overlay interiors. */
export const FABLED_TOWN_PIECES = {
  platforms: '/models/towns/fabled/platforms.glb',
  dwarfGate: '/models/towns/fabled/dwarf_gate.glb',
  cottage: '/models/towns/fabled/cottage.glb',
  library: '/models/towns/fabled/library.glb',
  forestLodge: '/models/towns/fabled/forest_lodge.glb',
} as const;

// ── Sectors that load the Fabled core ────────────────────────────────────────

export function isFabledZoneSector(sectorId: string): boolean {
  const id = sectorId.toLowerCase();
  return (
    id === FABLED_ZONE_SECTOR_ID ||
    id === 'frostbite_expanse' ||
    id === 'n' || // legacy grid
    id === 'ethereal_falls' // satellite Fabled wilds — smaller scale
  );
}

export function fabledZoneScaleForSector(sectorId: string): number {
  const id = sectorId.toLowerCase();
  if (id === 'ethereal_falls') return 0.85;
  return 1.15;
}

// ── Node / mesh policy for fabledzone.glb ────────────────────────────────────

/** Strip so zone ocean remains the only water. */
export const FABLED_STRIP_NAME_PATTERNS: RegExp[] = [
  /^Water$/i,
  /Water/i,
  /^Cube$/i, // only pure water cubes if any — careful not to strip buildings
];

/**
 * Name patterns treated as **cave doorways / building mouths** for portal attach.
 * fabledzone.glb uses Rock_main, Furnace, Storage, Chimney, ForgeScene, Island roofs.
 */
export const FABLED_CAVE_DOORWAY_PATTERNS: RegExp[] = [
  /Rock_main/i,
  /rock_main/i,
  /cave/i,
  /entrance/i,
  /door/i,
  /gate/i,
  /portal/i,
  /Furnace/i,
  /Storage/i,
  /Chimney/i,
  /ForgeScene/i,
  /forge/i,
];

/** Patterns for building shells (entrances may be on these). */
export const FABLED_BUILDING_PATTERNS: RegExp[] = [
  /Roof/i,
  /Chimney/i,
  /Furnace/i,
  /Storage/i,
  /Forge/i,
  /Barn/i,
  /House/i,
  /Tower/i,
  /Keep/i,
  /Castle/i,
];

// ── Portal destinations ──────────────────────────────────────────────────────

export type FabledPortalTarget =
  | 'dwarf_main_city'
  | 'dwarf_hearth'
  | 'great_library'
  | 'wind_lodge'
  | 'glacial_depths';

export interface FabledPortalDef {
  id: string;
  /** Display name for Press E */
  label: string;
  target: FabledPortalTarget;
  /** Interior / destination GLB */
  interiorGlb: string;
  interiorScale: number;
  /** Min level hint */
  minLevel: number;
  /** Match mesh name (if auto-detect fails, use fixed offset) */
  meshNameHint?: RegExp;
  /** Fixed offset from foundation origin if no mesh match */
  fallbackOffset?: [number, number, number];
  /** Swirl color (hex) */
  swirlColor?: number;
}

/**
 * Portals at cave doorways / building mouths → interiors & dwarf castle.
 */
export const FABLED_PORTALS: FabledPortalDef[] = [
  {
    id: 'fab_portal_main_city',
    label: 'Runeforge Hold · Dwarf Main City',
    target: 'dwarf_main_city',
    interiorGlb: FABLED_DWARF_CASTLE_GLB,
    interiorScale: 1.0,
    minLevel: 4,
    meshNameHint: /Rock_main|ForgeScene|Furnace/i,
    fallbackOffset: [0, 2, -40],
    swirlColor: 0x22c55e,
  },
  {
    id: 'fab_portal_hearth',
    label: 'Dwarf Hearth',
    target: 'dwarf_hearth',
    interiorGlb: FABLED_TOWN_PIECES.cottage,
    interiorScale: 0.7,
    minLevel: 1,
    meshNameHint: /Storage|Chimney|Roof/i,
    fallbackOffset: [18, 2, 12],
    swirlColor: 0xc4a574,
  },
  {
    id: 'fab_portal_library',
    label: 'The Great Library',
    target: 'great_library',
    interiorGlb: FABLED_TOWN_PIECES.library,
    interiorScale: 0.008,
    minLevel: 3,
    meshNameHint: /Telescope|Ladder|Table/i,
    fallbackOffset: [-20, 2, 8],
    swirlColor: 0xa78bfa,
  },
  {
    id: 'fab_portal_lodge',
    label: 'Wind Lodge',
    target: 'wind_lodge',
    interiorGlb: FABLED_TOWN_PIECES.forestLodge,
    interiorScale: 0.003,
    minLevel: 2,
    meshNameHint: /Palm_tree|Island/i,
    fallbackOffset: [25, 2, -15],
    swirlColor: 0x4ade80,
  },
  {
    id: 'fab_portal_glacial',
    label: 'Glacial Depths',
    target: 'glacial_depths',
    interiorGlb: '/models/evil_rock_mountains_cave.glb',
    interiorScale: 0.08,
    minLevel: 6,
    meshNameHint: /Rocks|Rock_main|Landscape/i,
    fallbackOffset: [-30, 2, -35],
    swirlColor: 0x7dd3fc,
  },
];

// ── Foundation config ────────────────────────────────────────────────────────

export interface FabledZoneFoundationConfig {
  version: string;
  sectorId: string;
  cityId: string;
  glbPath: string;
  castleGlbPath: string;
  scale: number;
  rotationY: number;
  origin: [number, number, number];
  portals: FabledPortalDef[];
  /** Max auto portals from cave-doorway mesh scan (in addition to SSOT) */
  maxAutoCavePortals: number;
}

export const FABLED_ZONE_FOUNDATION: FabledZoneFoundationConfig = {
  version: FABLED_ZONE_FOUNDATION_VERSION,
  sectorId: FABLED_ZONE_SECTOR_ID,
  cityId: FABLED_CITY_ID,
  glbPath: FABLED_ZONE_GLB,
  castleGlbPath: FABLED_DWARF_CASTLE_GLB,
  scale: 1.15,
  rotationY: 0,
  origin: [0, 0, 0],
  portals: FABLED_PORTALS,
  maxAutoCavePortals: 6,
};
