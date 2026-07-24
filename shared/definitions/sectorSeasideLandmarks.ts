/**
 * Seaside treasure cave + islands pair — placed once per world sector.
 *
 * Assets:
 *   seaside_treasure_cave.glb  — capture objective (zone under cave)
 *   sector_islands.glb         — companion landmass nearby
 *
 * Ocean: deep water Y aligns with sector terrain3d.waterLevel (world map SSOT).
 * Conquerable: capture zone is a cylinder volume under the cave mouth.
 */
import { WORLD_SECTORS, type WorldSector } from './worldMapSectors';

export const SEASIDE_ASSET = {
  /**
   * Same-origin `/sector-assets/*` is NOT rewritten to CDN (vercel.json only rewrites /models/*).
   * Cave ships in repo (~2.8 MB). Islands (~55 MB) prefer R2 CDN so Vercel deploys stay lean;
   * same-origin path is a local/dev fallback when the file is present.
   */
  cave: '/sector-assets/seaside/seaside_treasure_cave.glb',
  islands: '/sector-assets/seaside/sector_islands.glb',
  caveCdn: 'https://assets.grudge-studio.com/models/sectors/seaside/seaside_treasure_cave.glb',
  islandsCdn: 'https://assets.grudge-studio.com/models/sectors/seaside/sector_islands.glb',
} as const;

/** Load order: prefer CDN for large islands; cave prefers same-origin then CDN. */
export const SEASIDE_LOAD_ORDER = {
  cave: [SEASIDE_ASSET.cave, SEASIDE_ASSET.caveCdn] as const,
  islands: [SEASIDE_ASSET.islandsCdn, SEASIDE_ASSET.islands] as const,
} as const;

/** Local offset of islands relative to cave root (meters, SI). */
export const ISLANDS_OFFSET_FROM_CAVE: [number, number, number] = [48, -2, 22];

/** Capture zone under cave — conquerable footprint (m). */
export const CAPTURE_ZONE = {
  /** Relative to cave root after placement */
  localOffset: [0, -1.2, 6] as [number, number, number],
  radiusM: 14,
  heightM: 8,
  id: 'seaside_cave_capture',
  label: 'Seaside Treasure Cave',
};

export interface SectorSeasideLandmark {
  sectorId: string;
  sectorName: string;
  /** World-space cave origin (m) — sector-local cinema uses relative coords */
  caveWorld: [number, number, number];
  islandsOffset: [number, number, number];
  /** Ocean plane Y (deep water) */
  waterLevel: number;
  /** Deep ocean tint for this sector biome */
  oceanColor: number;
  skyColor: number;
  conquerable: true;
  captureZoneId: string;
}

/**
 * Deterministic once-per-sector placement near SE coastal shelf of each sector.
 * Uses sector bounds mid-south-east so deep ocean reads between land and map edge.
 */
export function seasideLandmarkForSector(sector: WorldSector): SectorSeasideLandmark {
  const midX = (sector.bounds.x0 + sector.bounds.x1) / 2;
  const midY = (sector.bounds.y0 + sector.bounds.y1) / 2;
  // Place toward open water (south-east of sector center in grid → +X / +Z in 3D)
  const caveX = (midX - 50) * 120; // map tile → meters (coarse)
  const caveZ = (midY - 50) * 120 + 180;
  const water = sector.terrain3d?.waterLevel ?? 0;
  // Deeper ocean shelf: cinema water slightly below sector waterLevel for trench feel
  const deepWater = water - 8;

  return {
    sectorId: sector.id,
    sectorName: sector.name,
    caveWorld: [caveX, water + 0.5, caveZ],
    islandsOffset: [...ISLANDS_OFFSET_FROM_CAVE],
    waterLevel: deepWater,
    oceanColor: sector.biome === 'frozen' ? 0x1a3a5c
      : sector.biome === 'storm' ? 0x0f172a
      : sector.biome === 'volcanic' || sector.id.includes('ember') ? 0x1a0a08
      : 0x061828,
    skyColor: sector.terrain3d?.skyColor ?? 0x87b5d9,
    conquerable: true,
    captureZoneId: `${CAPTURE_ZONE.id}:${sector.id}`,
  };
}

/** All 9 sectors get at least one seaside pair. */
export function allSectorSeasideLandmarks(): SectorSeasideLandmark[] {
  return WORLD_SECTORS.map(seasideLandmarkForSector);
}

/** Heroes cinema default = Haven Shore (starting sector). */
export const HEROES_CINEMA_SECTOR_ID = 'haven_shore';

export function heroesCinemaLandmark(): SectorSeasideLandmark {
  const s = WORLD_SECTORS.find((x) => x.id === HEROES_CINEMA_SECTOR_ID) ?? WORLD_SECTORS[0]!;
  return seasideLandmarkForSector(s);
}
