/**
 * Island3d-local fauna placement constants.
 *
 * Kept out of @shared/definitions/homeIslandNodeRules so Vite/Rollup cannot
 * minify `FAUNA_HEIGHT` and `fishSwimY` into the same identifier. The live
 * island3d chunk crashed with:
 *   TypeError: Cannot read properties of undefined (reading 'birdAboveTerrainM')
 * because the bundled symbol `Io` was the swim function, not the height table.
 */
export const FAUNA_HEIGHT = {
  birdAboveTerrainM: 30,
  feetOnTerrainM: 0,
  birdBobM: 0.8,
  fishMinAboveSeabedM: 0.4,
  fishMinUnderSurfaceM: 0.3,
  fishDepthFraction: 0.45,
} as const;

const MIN_WATER_COLUMN_M = 1.2;

/** Safe default Y for a fish in a valid water column, or null if too shallow. */
export function fishSwimY(groundY: number, waterLevel: number): number | null {
  if (!Number.isFinite(groundY) || !Number.isFinite(waterLevel)) return null;
  const columnDepth = waterLevel - groundY;
  if (columnDepth < MIN_WATER_COLUMN_M) return null;

  const minY = groundY + FAUNA_HEIGHT.fishMinAboveSeabedM;
  const maxY = waterLevel - FAUNA_HEIGHT.fishMinUnderSurfaceM;
  if (minY >= maxY) return null;

  const desiredY = waterLevel - columnDepth * FAUNA_HEIGHT.fishDepthFraction;
  return Math.min(maxY, Math.max(minY, desiredY));
}
