/**
 * Home-island size foundations — Driftwood Bay & Ironfang Spire.
 *
 * These two named islands are the physical scale references for every
 * player home island. Both sit on the same 1024 m world diameter; they
 * differ in landmass shape, elevation budget, shore depth, and mountain
 * footprint so generative seeds stay proportional to real play scale
 * (2.0 m character reference).
 *
 * SSOT consumers: homeIslandSeed, homeIslandSpec, Island3DEngine terrain,
 * ObjectStore home-island-contract.json.
 */

import {
  HOME_ISLAND_RTS_SIZE_M,
  HOME_ISLAND_WORLD_SIZE_M,
  MOUNTAIN_PEAK_HEIGHT_M,
} from './homeIslandSeed';

/** Matches homeIslandSpec CHARACTER_REFERENCE_HEIGHT_M (avoid circular import). */
const FOUNDATION_CHARACTER_HEIGHT_M = 2.0;

export const HOME_ISLAND_FOUNDATIONS_VERSION = '1.0.0';

export type HomeIslandFoundationId = 'driftwood_bay' | 'ironfang_spire';

export interface HomeIslandFoundation {
  id: HomeIslandFoundationId;
  label: string;
  /** Short design intent for studio + seed docs */
  summary: string;
  /** World diameter (m) — always HOME_ISLAND_WORLD_SIZE_M */
  worldSizeM: number;
  /** RTS procedural core (m) upsampled into center */
  rtsCoreSizeM: number;
  characterHeightM: number;
  /** Target landmass fraction of the world disk (not pure water) */
  landmassFill: number;
  /** Terrain heightmap ceiling (m) */
  maxElevationM: number;
  /** Terrain floor under water (m) */
  minElevationM: number;
  /** Shore band depth inward from water edge (m) */
  beachBandDepthM: number;
  /** Mountain triad footprint as fraction of world diameter */
  mountainFootprintFraction: number;
  /** Single selected evil peak height (m) */
  mountainPeakHeightM: number;
  /** Camp plateau radius (m) */
  campClearRadiusM: number;
  campPlateauHeightM: number;
  /** Preferred biome families for this foundation */
  preferredBiomes: string[];
  /** Layout bias for generators */
  layout: {
    /** 0 = flat coast, 1 = steep interior */
    relief: number;
    /** Bay indentation strength (Driftwood); 0 = no bay */
    bayIndent: number;
    /** Spire / ridge prominence (Ironfang); 0 = no spire bias */
    spireBias: number;
    /** Preferred camp compass slot (percent map, N = low Y) */
    defaultCampPercent: { x: number; y: number };
    /** Preferred mountain anchor (percent map) */
    defaultMountainPercent: { x: number; y: number };
  };
  /** Nature density multipliers vs baseline scatter */
  natureDensity: {
    trees: number;
    rocks: number;
    groundcover: number;
  };
}

/**
 * Driftwood Bay — coastal / bay foundation.
 * Wide beaches, moderate hills, indented shoreline, timber + shore harvest.
 */
export const DRIFTWOOD_BAY: HomeIslandFoundation = {
  id: 'driftwood_bay',
  label: 'Driftwood Bay',
  summary:
    'Coastal home-island foundation: broad shore, bay indent, moderate elevation. ' +
    'Size baseline for beach/tropical/plains seeds on the 1024 m world.',
  worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
  rtsCoreSizeM: HOME_ISLAND_RTS_SIZE_M,
  characterHeightM: FOUNDATION_CHARACTER_HEIGHT_M,
  landmassFill: 0.58,
  maxElevationM: 48,
  minElevationM: -28,
  beachBandDepthM: 28,
  mountainFootprintFraction: 0.08,
  mountainPeakHeightM: MOUNTAIN_PEAK_HEIGHT_M,
  campClearRadiusM: 92,
  campPlateauHeightM: 4,
  preferredBiomes: ['beach', 'tropical', 'plains', 'storm'],
  layout: {
    relief: 0.35,
    bayIndent: 0.72,
    spireBias: 0.05,
    defaultCampPercent: { x: 50, y: 62 },
    defaultMountainPercent: { x: 42, y: 28 },
  },
  natureDensity: {
    trees: 1.05,
    rocks: 0.75,
    groundcover: 1.15,
  },
};

/**
 * Ironfang Spire — mountain / ridge foundation.
 * Higher relief, tighter shores, larger mountain footprint, dense quarry.
 */
export const IRONFANG_SPIRE: HomeIslandFoundation = {
  id: 'ironfang_spire',
  label: 'Ironfang Spire',
  summary:
    'Highland home-island foundation: steeper relief, tighter beach, dominant spire. ' +
    'Size baseline for forest/winter/volcanic/nexus seeds on the 1024 m world.',
  worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
  rtsCoreSizeM: HOME_ISLAND_RTS_SIZE_M,
  characterHeightM: FOUNDATION_CHARACTER_HEIGHT_M,
  landmassFill: 0.72,
  maxElevationM: 80,
  minElevationM: -30,
  beachBandDepthM: 14,
  mountainFootprintFraction: 0.12,
  mountainPeakHeightM: MOUNTAIN_PEAK_HEIGHT_M,
  campClearRadiusM: 84,
  campPlateauHeightM: 8,
  preferredBiomes: ['forest', 'winter', 'frozen', 'volcanic', 'abyssal', 'nexus'],
  layout: {
    relief: 0.78,
    bayIndent: 0.12,
    spireBias: 0.85,
    defaultCampPercent: { x: 48, y: 58 },
    defaultMountainPercent: { x: 52, y: 32 },
  },
  natureDensity: {
    trees: 0.95,
    rocks: 1.35,
    groundcover: 0.85,
  },
};

export const HOME_ISLAND_FOUNDATIONS: Record<HomeIslandFoundationId, HomeIslandFoundation> = {
  driftwood_bay: DRIFTWOOD_BAY,
  ironfang_spire: IRONFANG_SPIRE,
};

/** Default foundation when seed does not pin one. */
export const DEFAULT_HOME_ISLAND_FOUNDATION_ID: HomeIslandFoundationId = 'driftwood_bay';

/**
 * Pick foundation from island seed + optional biome.
 * Coastal biomes → Driftwood Bay; highland / cold / dark → Ironfang Spire.
 */
export function resolveHomeIslandFoundation(
  seed: string,
  biome?: string | null,
): HomeIslandFoundation {
  const b = (biome ?? '').toLowerCase();
  if (
    b.includes('beach') ||
    b.includes('tropic') ||
    b.includes('plain') ||
    b.includes('shore') ||
    b.includes('storm') ||
    b.includes('haven')
  ) {
    return DRIFTWOOD_BAY;
  }
  if (
    b.includes('forest') ||
    b.includes('winter') ||
    b.includes('frost') ||
    b.includes('snow') ||
    b.includes('volcan') ||
    b.includes('ember') ||
    b.includes('abyss') ||
    b.includes('nexus') ||
    b.includes('mountain')
  ) {
    return IRONFANG_SPIRE;
  }

  // Deterministic 50/50 when biome is neutral
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return (h & 1) === 0 ? DRIFTWOOD_BAY : IRONFANG_SPIRE;
}

export function getHomeIslandFoundation(id: HomeIslandFoundationId): HomeIslandFoundation {
  return HOME_ISLAND_FOUNDATIONS[id] ?? DRIFTWOOD_BAY;
}

/** Compact export for ObjectStore /api/island/spec. */
export function exportHomeIslandFoundationsDoc() {
  return {
    version: HOME_ISLAND_FOUNDATIONS_VERSION,
    rule:
      'Driftwood Bay + Ironfang Spire are the only size foundations for player home islands. ' +
      'Both use worldSizeM=1024 and characterHeightM=2. Layout/elevation differ by foundation.',
    worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
    characterHeightM: FOUNDATION_CHARACTER_HEIGHT_M,
    mountainPeakHeightM: MOUNTAIN_PEAK_HEIGHT_M,
    foundations: Object.values(HOME_ISLAND_FOUNDATIONS),
  };
}
