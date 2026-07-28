/**
 * Rapier Kinematic Character Controller — production presets.
 *
 * Docs (must follow):
 *   https://rapier.rs/docs/user_guides/javascript/character_controller
 *   https://rapier.rs/docs/user_guides/javascript/common_mistakes
 *   https://rapier.rs/docs/user_guides/javascript/determinism
 *
 * HARD RULES (common mistakes + determinism):
 * 1. SI units only — meters / seconds / kg. Never use pixel sizes as meters
 *    (100× sprite → cuboid(50,50) feels like slow-mo under g≈-9.81).
 * 2. Character body is **kinematic position-based**, not dynamic — gravity is
 *    applied by us in the desired movement vector, not by Rapier forces.
 * 3. Dynamic debris/props need **non-zero density/mass** or forces do nothing.
 * 4. Trimesh colliders do **not** auto-compute mass — set mass manually if RB is dynamic.
 * 5. Fixed timestep (1/60) for stable CCT + cross-platform determinism.
 * 6. Determinism: same Rapier version, same init order, no Math.sin/cos for
 *    physics seeds (transcendentals are not cross-platform deterministic).
 * 7. CCT offset ~1cm — small enough to hide gap, large enough for numerics.
 * 8. Prefer capsule shape for the character collider (cheap + stable).
 */

/** SI: average adult ~1.8 m tall → capsule radius + 2*halfHeight ≈ height. */
export const HUMAN_HEIGHT_M = 1.8;
export const HUMAN_RADIUS_M = 0.32;
/** Capsule half-height (cylinder portion); total height ≈ 2*half + 2*radius */
export const HUMAN_CAPSULE_HALF_M = 0.55;
// 2*0.55 + 2*0.32 = 1.74 m ≈ human

/** Physics gravity Y (m/s²). Fleet play uses ~-30 for snappy jump (not pure -9.81). */
export const PHYSICS_GRAVITY_Y = -30;

/** Fixed simulation step (seconds) — never scale by display FPS. */
export const PHYSICS_FIXED_DT = 1 / 60;

/**
 * Character controller offset (meters) — gap between shape and environment.
 * Rapier: ~0.01; if characters stick inexplicably, increase slightly.
 */
export const CCT_OFFSET_M = 0.01;

/** Up vector = +Y (Three.js / SI). */
export const CCT_UP = { x: 0, y: 1, z: 0 } as const;

export interface CharacterControllerTuning {
  /** createCharacterController(offset) */
  offset: number;
  /** max climbable slope (radians) */
  maxSlopeClimbAngle: number;
  /** min slope angle to start sliding (radians) */
  minSlopeSlideAngle: number;
  /** autostep max height (m) */
  autostepMaxHeight: number;
  /** autostep min width on top of step (m) */
  autostepMinWidth: number;
  /** allow stepping on dynamic bodies */
  autostepIncludeDynamic: boolean;
  /** snap-to-ground max separation (m) */
  snapToGroundDistance: number;
  /** push dynamic bodies hit along path */
  applyImpulsesToDynamicBodies: boolean;
  /** capsule radius (m) */
  radius: number;
  /** capsule half-height (m) */
  halfHeight: number;
  /** gravity Y added each step to desired movement (m/s² * dt elsewhere) */
  gravityY: number;
  /** max walk speed (m/s) */
  maxWalkSpeed: number;
  /** jump speed impulse (m/s) */
  jumpSpeed: number;
  /** sprint multiplier */
  sprintMult: number;
}

/**
 * Default production human CCT — stairs, slopes, snap, impulses.
 * Angles in radians (Rapier convention).
 */
export const HUMAN_CCT: CharacterControllerTuning = {
  offset: CCT_OFFSET_M,
  maxSlopeClimbAngle: (45 * Math.PI) / 180,
  minSlopeSlideAngle: (30 * Math.PI) / 180,
  // Autostep: step ≤ 0.5 m high, ≥ 0.2 m deep landing (Rapier tutorial defaults)
  autostepMaxHeight: 0.5,
  autostepMinWidth: 0.2,
  autostepIncludeDynamic: true,
  snapToGroundDistance: 0.5,
  applyImpulsesToDynamicBodies: true,
  radius: HUMAN_RADIUS_M,
  halfHeight: HUMAN_CAPSULE_HALF_M,
  gravityY: PHYSICS_GRAVITY_Y,
  maxWalkSpeed: 5.5,
  jumpSpeed: 9.5,
  sprintMult: 1.45,
};

/** Smaller capsule for tight voxel corridors (still SI meters). */
export const VOXEL_CCT: CharacterControllerTuning = {
  ...HUMAN_CCT,
  radius: 0.3,
  halfHeight: 0.5,
  // Slightly smaller steps for block stairs (1 block ≈ 1 m)
  autostepMaxHeight: 0.55,
  autostepMinWidth: 0.25,
  snapToGroundDistance: 0.45,
  maxWalkSpeed: 5.2,
  jumpSpeed: 9.2,
};

/**
 * Apply tuning to a Rapier KinematicCharacterController instance.
 * Call once after world.createCharacterController(offset).
 */
export function applyCharacterControllerTuning(
  controller: {
    setUp: (v: { x: number; y: number; z: number }) => void;
    setMaxSlopeClimbAngle: (a: number) => void;
    setMinSlopeSlideAngle: (a: number) => void;
    enableAutostep: (h: number, w: number, dyn: boolean) => void;
    enableSnapToGround: (d: number) => void;
    setApplyImpulsesToDynamicBodies: (v: boolean) => void;
  },
  tuning: CharacterControllerTuning = HUMAN_CCT,
): void {
  controller.setUp({ ...CCT_UP });
  controller.setMaxSlopeClimbAngle(tuning.maxSlopeClimbAngle);
  controller.setMinSlopeSlideAngle(tuning.minSlopeSlideAngle);
  controller.enableAutostep(
    tuning.autostepMaxHeight,
    tuning.autostepMinWidth,
    tuning.autostepIncludeDynamic,
  );
  controller.enableSnapToGround(tuning.snapToGroundDistance);
  controller.setApplyImpulsesToDynamicBodies(tuning.applyImpulsesToDynamicBodies);
}

/**
 * Build desired translation for one fixed step (includes gravity component).
 * Caller owns input axes; this only packages SI-correct movement.
 *
 * @param wishX wish horizontal X (m/s, camera-relative already)
 * @param wishZ wish horizontal Z (m/s)
 * @param verticalVel current vertical velocity (m/s), mutated by gravity
 * @param dt fixed step (prefer PHYSICS_FIXED_DT)
 */
export function desiredMovementForStep(
  wishX: number,
  wishZ: number,
  verticalVel: number,
  dt: number,
  gravityY: number = PHYSICS_GRAVITY_Y,
): { dx: number; dy: number; dz: number; nextVerticalVel: number } {
  const nextV = verticalVel + gravityY * dt;
  return {
    dx: wishX * dt,
    dy: nextV * dt,
    dz: wishZ * dt,
    nextVerticalVel: nextV,
  };
}

/**
 * Center of capsule in world space from feet position (y = feet on ground).
 * Capsule center = feetY + radius + halfHeight
 */
export function capsuleCenterFromFeet(
  feetX: number,
  feetY: number,
  feetZ: number,
  radius: number = HUMAN_RADIUS_M,
  halfHeight: number = HUMAN_CAPSULE_HALF_M,
): { x: number; y: number; z: number } {
  return {
    x: feetX,
    y: feetY + radius + halfHeight,
    z: feetZ,
  };
}

export function feetFromCapsuleCenter(
  cx: number,
  cy: number,
  cz: number,
  radius: number = HUMAN_RADIUS_M,
  halfHeight: number = HUMAN_CAPSULE_HALF_M,
): { x: number; y: number; z: number } {
  return {
    x: cx,
    y: cy - radius - halfHeight,
    z: cz,
  };
}

/** Checklist exported for docs / QA. */
export const RAPIER_CCT_CHECKLIST = [
  "SI meters — capsule ~0.3 r × 0.55 half (~1.8 m human)",
  "Kinematic position-based body + setNextKinematicTranslation",
  "Gravity in desired movement vector (not dynamic forces on character)",
  "offset ≈ 0.01 m",
  "maxSlopeClimb 45°, minSlide 30°",
  "autostep 0.5 / 0.2 / includeDynamic",
  "snapToGround 0.5",
  "applyImpulsesToDynamicBodies true for pushables",
  "Fixed 1/60 step; same body create order for determinism",
  "No Math.sin/cos for physics init seeds",
  "Dynamic props: setDensity > 0 (or explicit mass)",
  "Trimesh-only dynamics: set mass manually",
] as const;
