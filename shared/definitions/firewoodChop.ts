/**
 * Firewood-style tree chop SSOT — angle at base, fall, ground split, pinata collect.
 *
 * Reference feel: https://screen.toys/firewood/
 *   · Line up a plane / strike angle
 *   · Click / swing splits along that plane
 *   · Pieces separate with physics; work remaining mass
 *
 * Grudge phases (Valheim-like felling + firewood splitting):
 *   live → notching (base strikes) → falling → downed (log on ground)
 *        → splitting (axe on log) → stump / depleted
 *
 * Do not duplicate thresholds in Island3DEngine — import from here.
 */

export type FirewoodTreePhase =
  | 'live'
  | 'notching'
  | 'falling'
  | 'downed'
  | 'splitting'
  | 'stump'
  | 'hidden';

export interface FirewoodChopConfig {
  id: string;
  name: string;
  /** Max height above tree feet for a valid base notch (m) */
  baseNotchMaxHeightM: number;
  /** Min height above feet (avoid ground scrapes) */
  baseNotchMinHeightM: number;
  /**
   * Angular half-width (rad) for "same face" notches.
   * Strikes within this of the accumulated notch yaw stack progress.
   */
  notchArcHalfRad: number;
  /** Good base notches required before tree falls */
  notchesToFell: number;
  /** Miss / wrong-height still chips HP but slower fall progress */
  chipProgressPerMiss: number;
  /** Progress per good notch on the primary face */
  notchProgressPerHit: number;
  /** Fall animation speed (progress units / s) — mirrors HarvestFeedback */
  fallSpeed: number;
  /** After fall, log segments available to split (firewood rounds) */
  groundSplitSegments: number;
  /** Hits needed per ground segment before pinata shatter of that segment */
  hitsPerSegment: number;
  /** Collect radius for grounded wood fragments (m) */
  collectRadiusM: number;
  /** Max seconds fragments stay before auto-loot */
  fragmentAutoLootSec: number;
}

export const FIREWOOD_CHOP: FirewoodChopConfig = {
  id: 'firewood_chop_v1',
  name: 'Firewood Chop',
  baseNotchMaxHeightM: 1.35,
  baseNotchMinHeightM: 0.15,
  notchArcHalfRad: (42 * Math.PI) / 180, // ~42° — line up the cut face
  notchesToFell: 3,
  chipProgressPerMiss: 0.08,
  notchProgressPerHit: 0.34,
  fallSpeed: 1.65,
  groundSplitSegments: 3,
  hitsPerSegment: 2,
  collectRadiusM: 2.4,
  fragmentAutoLootSec: 8,
};

/** Horizontal yaw from tree base to impact point (player approach angle). */
export function impactYawAroundTree(
  treeX: number,
  treeZ: number,
  impactX: number,
  impactZ: number,
): number {
  return Math.atan2(impactX - treeX, impactZ - treeZ);
}

/** Shortest signed delta between two yaws in [-π, π]. */
export function yawDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function isWithinNotchArc(
  strikeYaw: number,
  faceYaw: number,
  halfArc = FIREWOOD_CHOP.notchArcHalfRad,
): boolean {
  return Math.abs(yawDelta(strikeYaw, faceYaw)) <= halfArc;
}

/**
 * Fall direction: tree falls *away* from the notched face
 * (like leaning away from the cut).
 */
export function fallYawFromNotchFace(faceYaw: number): number {
  return faceYaw + Math.PI;
}

export type BaseStrikeGrade = 'perfect' | 'good' | 'chip' | 'miss_high' | 'miss_low';

export interface BaseStrikeEval {
  grade: BaseStrikeGrade;
  heightOk: boolean;
  angleOk: boolean;
  strikeYaw: number;
  /** Progress added toward fell (0–1 scale cumulative elsewhere) */
  progressDelta: number;
  /** Whether this strike starts / continues the primary notch face */
  locksFace: boolean;
  message: string;
}

/**
 * Evaluate a standing-tree base strike (firewood / Valheim notch).
 * faceYaw: null until first good base hit locks the cut face.
 */
export function evaluateBaseStrike(opts: {
  treeX: number;
  treeZ: number;
  treeBaseY: number;
  impactX: number;
  impactY: number;
  impactZ: number;
  faceYaw: number | null;
  cfg?: FirewoodChopConfig;
}): BaseStrikeEval {
  const cfg = opts.cfg ?? FIREWOOD_CHOP;
  const h = opts.impactY - opts.treeBaseY;
  const strikeYaw = impactYawAroundTree(
    opts.treeX,
    opts.treeZ,
    opts.impactX,
    opts.impactZ,
  );

  if (h < cfg.baseNotchMinHeightM) {
    return {
      grade: 'miss_low',
      heightOk: false,
      angleOk: false,
      strikeYaw,
      progressDelta: cfg.chipProgressPerMiss * 0.5,
      locksFace: false,
      message: 'Aim higher — cut the trunk base, not the roots.',
    };
  }
  if (h > cfg.baseNotchMaxHeightM) {
    return {
      grade: 'miss_high',
      heightOk: false,
      angleOk: false,
      strikeYaw,
      progressDelta: cfg.chipProgressPerMiss,
      locksFace: false,
      message: 'Too high — notch the base (Valheim / firewood face).',
    };
  }

  // First good base hit locks face
  if (opts.faceYaw == null) {
    return {
      grade: 'perfect',
      heightOk: true,
      angleOk: true,
      strikeYaw,
      progressDelta: cfg.notchProgressPerHit,
      locksFace: true,
      message: 'Cut face locked — keep striking this side of the base.',
    };
  }

  const angleOk = isWithinNotchArc(strikeYaw, opts.faceYaw, cfg.notchArcHalfRad);
  if (angleOk) {
    const tight = Math.abs(yawDelta(strikeYaw, opts.faceYaw)) < cfg.notchArcHalfRad * 0.45;
    return {
      grade: tight ? 'perfect' : 'good',
      heightOk: true,
      angleOk: true,
      strikeYaw,
      progressDelta: tight ? cfg.notchProgressPerHit * 1.15 : cfg.notchProgressPerHit,
      locksFace: false,
      message: tight ? 'Clean notch!' : 'Good angle — deepen the face.',
    };
  }

  return {
    grade: 'chip',
    heightOk: true,
    angleOk: false,
    strikeYaw,
    progressDelta: cfg.chipProgressPerMiss,
    locksFace: false,
    message: 'Wrong side — walk around and hit the notched face.',
  };
}

/** Ground log split: plane normal from player facing (firewood click plane). */
export function groundSplitPlaneFromFacing(facingYaw: number): {
  nx: number;
  nz: number;
  yaw: number;
} {
  // Split plane is vertical, perpendicular to facing (axe bites into the log)
  const yaw = facingYaw;
  return {
    yaw,
    nx: Math.sin(yaw),
    nz: Math.cos(yaw),
  };
}

export interface GroundSplitEval {
  ok: boolean;
  segmentIndex: number;
  completedSegment: boolean;
  allDone: boolean;
  message: string;
}

export function evaluateGroundSplit(opts: {
  segmentHits: number[];
  hitSegmentIndex: number;
  cfg?: FirewoodChopConfig;
}): GroundSplitEval {
  const cfg = opts.cfg ?? FIREWOOD_CHOP;
  const segs = opts.segmentHits.slice();
  const i = Math.max(0, Math.min(segs.length - 1, opts.hitSegmentIndex));
  if (segs[i]! >= cfg.hitsPerSegment) {
    // Find next unfinished segment
    const next = segs.findIndex((h) => h < cfg.hitsPerSegment);
    if (next < 0) {
      return {
        ok: false,
        segmentIndex: i,
        completedSegment: false,
        allDone: true,
        message: 'Log fully split — pick up the wood.',
      };
    }
    segs[next] = (segs[next] ?? 0) + 1;
    const done = segs[next]! >= cfg.hitsPerSegment;
    const allDone = segs.every((h) => h >= cfg.hitsPerSegment);
    return {
      ok: true,
      segmentIndex: next,
      completedSegment: done,
      allDone,
      message: done ? 'Segment split — pinata wood!' : 'Crack… keep splitting.',
    };
  }
  segs[i] = (segs[i] ?? 0) + 1;
  const done = segs[i]! >= cfg.hitsPerSegment;
  const allDone = segs.every((h) => h >= cfg.hitsPerSegment);
  return {
    ok: true,
    segmentIndex: i,
    completedSegment: done,
    allDone,
    message: done ? 'Segment split — pinata wood!' : 'Crack… keep splitting.',
  };
}

export function initialSegmentHits(cfg: FirewoodChopConfig = FIREWOOD_CHOP): number[] {
  return Array.from({ length: cfg.groundSplitSegments }, () => 0);
}
