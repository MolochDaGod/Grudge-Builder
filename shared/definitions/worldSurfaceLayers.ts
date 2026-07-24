/**
 * World surface layers SSOT — terrain / water / deck / climb across fleet.
 *
 * Production rules (grudge-production-world + threejs SI units):
 *   - Terrain assets sit on dry ground (feet Y > water + margin)
 *   - Water assets (fish, boats, docks floats) use water columns only
 *   - Decks are walkable surfaces (sample Y; no ocean water while locked)
 *   - Hull sides are climbable from water (overboard recovery)
 *
 * Used by: harvest placement, wildlife spawn, character climb/swim/deck,
 * camps, buildings, sector kits.
 */

/** Physics / content layer tags for mesh userData */
export type WorldSurfaceLayer =
  | 'terrain'
  | 'water'
  | 'deck'
  | 'hull_climb'
  | 'cliff_climb'
  | 'dock'
  | 'building'
  | 'ignore';

/** SI metres — 1 unit = 1 m */
export const WORLD_SURFACE = {
  /** Dry land harvest / land wildlife must be this far above water */
  dryLandMarginM: 1.25,
  /** Camps / buildings need slightly more freeboard */
  campDryMarginM: 1.0,
  /** Fish need seabed at least this far under water surface */
  minWaterColumnM: 0.75,
  /** Min swim depth under surface (visual) */
  minSwimUnderSurfaceM: 0.3,
  /** Wade band — feet in water but walkable (not full swim) */
  wadeDepthM: 0.9,
  /** Full swim when feet below water by this */
  swimEnterDepthM: 0.45,
  /** Climb wall detect (ground) */
  climbDetectDistM: 2.0,
  /** Climb detect while swimming toward hull */
  climbSwimDetectDistM: 4.5,
  /** Overboard → auto-board when feet within this of deck Y */
  boardMantleClearanceM: 1.1,
  /** Max distance to ship root for climb-aboard attempt */
  boardMaxDistM: 18,
  /** Step height for KCC / board edges */
  stepHeightM: 0.4,
  /** Walkable slope (cos of max angle ~45°) */
  maxWalkableSlopeNy: 0.707,
  /** Climbable wall max normal.y (steep faces) */
  climbableMaxNormalY: 0.35,
  humanHeightM: 1.8,
} as const;

export type PlacementDomain = 'dry_land' | 'water' | 'either' | 'deck';

/** Harvest / wildlife domain by kind */
export const PLACEMENT_DOMAIN: Record<string, PlacementDomain> = {
  tree: 'dry_land',
  rock: 'dry_land',
  crystal: 'dry_land',
  flower: 'dry_land',
  hemp: 'dry_land',
  scrap: 'dry_land',
  animal: 'dry_land',
  camp: 'dry_land',
  building: 'dry_land',
  fish: 'water',
  water_prop: 'water',
  boat: 'water',
  dock: 'either',
  deck: 'deck',
};

export function isDryLand(
  groundY: number,
  waterLevel: number,
  margin = WORLD_SURFACE.dryLandMarginM,
): boolean {
  return Number.isFinite(groundY) && groundY > waterLevel + margin;
}

export function isWaterColumn(
  seabedY: number,
  waterLevel: number,
  minColumn = WORLD_SURFACE.minWaterColumnM,
): boolean {
  return Number.isFinite(seabedY) && seabedY <= waterLevel - minColumn;
}

/** Feet in water enough to swim (not cave interior) */
export function isSwimmingFeet(
  feetY: number,
  waterLevel: number,
  enterDepth = WORLD_SURFACE.swimEnterDepthM,
): boolean {
  return feetY < waterLevel - enterDepth;
}

export function isWading(
  feetY: number,
  waterLevel: number,
): boolean {
  return feetY < waterLevel && feetY >= waterLevel - WORLD_SURFACE.wadeDepthM;
}

/**
 * Resolve placement Y for a content kind.
 * Returns null if the sample is invalid for that domain.
 */
export function resolvePlacementY(
  domain: PlacementDomain | string,
  sampleY: number | null,
  waterLevel: number,
): number | null {
  if (sampleY === null || !Number.isFinite(sampleY)) return null;
  const d = (PLACEMENT_DOMAIN[domain] ?? domain) as PlacementDomain;

  if (d === 'water') {
    if (!isWaterColumn(sampleY, waterLevel)) return null;
    // Swim mid-column default for fish nodes
    const depth = Math.min(
      4,
      Math.max(WORLD_SURFACE.minSwimUnderSurfaceM + 0.5, (waterLevel - sampleY) * 0.45),
    );
    return waterLevel - depth;
  }
  if (d === 'dry_land') {
    if (!isDryLand(sampleY, waterLevel)) return null;
    return sampleY;
  }
  if (d === 'deck') {
    return sampleY;
  }
  // either — docks/floats sit on max(ground, water)+offset
  return Math.max(sampleY, waterLevel);
}

/** Tag mesh for climb / deck systems (call after load) */
export function tagSurfaceMesh(
  obj: { userData: Record<string, unknown> },
  layer: WorldSurfaceLayer,
): void {
  obj.userData.worldLayer = layer;
  if (layer === 'deck' || layer === 'dock') {
    obj.userData.shipDeck = true;
    obj.userData.walkable = true;
  }
  if (layer === 'hull_climb' || layer === 'cliff_climb') {
    obj.userData.climbable = true;
    obj.userData.shipHull = layer === 'hull_climb';
  }
  if (layer === 'terrain') {
    obj.userData.collider = true;
    obj.userData.walkable = true;
  }
  if (layer === 'water') {
    obj.userData.waterVolume = true;
  }
}

export const FLEET_WORLD_SURFACE_CONTRACT = {
  version: '1.0.0',
  units: 'meters',
  surfaces: WORLD_SURFACE,
  domains: PLACEMENT_DOMAIN,
  rules: {
    landAssetsOnDryLand: true,
    waterAssetsInWaterColumns: true,
    deckWalkNoOceanPhysics: true,
    hullClimbFromWater: true,
    overboardMantleToDeck: true,
  },
} as const;
