/**
 * Ethereal Falls — diagonal destruction half (SSOT).
 *
 * Layout (zone-local, map-aligned):
 *   u = 0 west … 1 east
 *   v = 0 north … 1 south
 *
 * Diagonal from NE → SW (line u + v = 1):
 *   **NW half** (u + v < 1) = destruction field — water lifts, islands drift to tip
 *   **SE half** (u + v ≥ 1) = playable ethereal shelf (physics mostly sane)
 *
 * Top-left tip (u≈0, v≈0) = Cosmic Waterfall / Madra’s destruction hole.
 * Ships that cross into the field do not return. Player death voids all drops.
 * Ally NPCs in the field die permanent death (no revive in-instance).
 * Flight (mounts / flying creatures / airborne players) still works — only
 * surface / ship / ground physics are broken.
 */

export const ETHEREAL_FALLS_SECTOR_ID = 'ethereal_falls' as const;

/** Cosmic Waterfall tip — NW corner of the zone (map top-left tip). */
export const DESTRUCTION_TIP_LOCAL: [number, number, number] = [0, 0, 0];

/**
 * Diagonal classification. `u`/`v` in [0,1], v=0 north, u=0 west.
 * Returns true when point is in the destruction (floating) half.
 */
export function isInEtherealDestructionHalf(u: number, v: number): boolean {
  // Soft band around diagonal so the “cut” reads as a fracture, not a hard wall
  return u + v < 1.0;
}

/** Distance along diagonal into the field (0 on diagonal → ~1 at NW tip). */
export function destructionDepth01(u: number, v: number): number {
  if (!isInEtherealDestructionHalf(u, v)) return 0;
  return Math.min(1, Math.max(0, (1 - (u + v)) / 1));
}

/** How close to the tip (0 far, 1 at tip). */
export function destructionTipProximity01(u: number, v: number): number {
  const du = u;
  const dv = v;
  const d = Math.hypot(du, dv); // 0 at tip
  return Math.min(1, Math.max(0, 1 - d / 0.55));
}

export interface EtherealDestructionRules {
  /** Surface ships cannot leave once entered; no sail-out path. */
  shipsDoNotReturn: boolean;
  /** Player / character death: inventory drops are voided (no corpse loot). */
  deathVoidsAllDrops: boolean;
  /** Ally NPCs that die here cannot respawn for this instance. */
  allyPermanentDeath: boolean;
  /** Ground / ship / water colliders break down; flight is exempt. */
  brokenSurfacePhysics: boolean;
  /** Flying mounts, flying creatures, airborne players keep usable physics. */
  flightExempt: boolean;
  /** Islands and water drift toward tip with strength × depth. */
  floatTowardTip: boolean;
  /** Pull strength (m/s² scale) at tip for surface objects. */
  tipPullAccel: number;
  /** Vertical lift on water surface in field (m). */
  waterLiftMaxM: number;
  /** Island drift speed toward tip at full depth (m/s). */
  islandDriftSpeed: number;
  /** Instant death when tipProximity ≥ this (surface entities). */
  tipKillProximity: number;
}

export const ETHEREAL_DESTRUCTION_RULES: EtherealDestructionRules = {
  shipsDoNotReturn: true,
  deathVoidsAllDrops: true,
  allyPermanentDeath: true,
  brokenSurfacePhysics: true,
  flightExempt: true,
  floatTowardTip: true,
  tipPullAccel: 4.5,
  waterLiftMaxM: 28,
  islandDriftSpeed: 1.8,
  tipKillProximity: 0.92,
};

/**
 * Convert world XZ (zone-centered) → map-aligned u,v in [0,1].
 * zoneHalf = sizeMeters / 2. World +X east, +Z south (Three.js island convention).
 */
export function worldXZToEtherealUV(
  x: number,
  z: number,
  zoneSizeMeters: number,
): { u: number; v: number } {
  const half = zoneSizeMeters * 0.5;
  // x: -half → west (u=0), +half → east (u=1)
  // z: -half → north (v=0), +half → south (v=1)
  const u = (x + half) / zoneSizeMeters;
  const v = (z + half) / zoneSizeMeters;
  return {
    u: Math.min(1, Math.max(0, u)),
    v: Math.min(1, Math.max(0, v)),
  };
}

/** Tip world position (NW corner of zone, elevated slightly). */
export function destructionTipWorld(zoneSizeMeters: number, tipY = 40): {
  x: number;
  y: number;
  z: number;
} {
  const half = zoneSizeMeters * 0.5;
  return { x: -half * 0.92, y: tipY, z: -half * 0.92 };
}

export type EtherealEntityKind =
  | 'player_surface'
  | 'player_flying'
  | 'ship'
  | 'ally_npc'
  | 'creature_ground'
  | 'creature_flying'
  | 'island'
  | 'loot_drop'
  | 'mount_flying';

export function isFlightExemptKind(kind: EtherealEntityKind): boolean {
  return (
    kind === 'player_flying' ||
    kind === 'creature_flying' ||
    kind === 'mount_flying'
  );
}

/** Whether surface physics should be treated as broken for this entity. */
export function surfacePhysicsBroken(
  kind: EtherealEntityKind,
  inField: boolean,
): boolean {
  if (!inField) return false;
  if (!ETHEREAL_DESTRUCTION_RULES.brokenSurfacePhysics) return false;
  if (isFlightExemptKind(kind)) return false;
  return true;
}
