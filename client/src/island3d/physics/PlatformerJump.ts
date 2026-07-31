/**
 * PlatformerJump — movement from threejs-games "Random boxes" (Avatar / FLY_JUMP).
 *
 * Source: https://threejs-games.github.io/examples/80-scenes/random-boxes/
 *   core/actor/states/FlyState.js + Avatar.js
 *
 * Mechanics:
 *  - While Space is **held** and jumpTime < maxJumpTime, add upward force each frame
 *  - Gravity always pulls down
 *  - Cap peak vertical speed (maxVelocityY)
 *  - Release Space early → shorter hop; hold full window → max height
 *  - On ground, clear vy and allow a new jump
 *
 * Tuned defaults match Avatar in random-boxes:
 *   gravity ≈ 42, jumpForce ≈ gravity * 1.8, maxJumpTime ≈ 0.99, maxVelocityY ≈ gravity/3
 */
export type PlatformerJumpStyle = 'impulse' | 'fly_jump' | 'fly';

export interface PlatformerJumpConfig {
  /** m/s² (negative down). Random-boxes: 42 */
  gravity: number;
  /** Upward force while holding jump (m/s²). Random-boxes Avatar: gravity * 1.8 */
  jumpForce: number;
  /** Max seconds Space can feed lift. Random-boxes Avatar: ~0.99 */
  maxJumpTime: number;
  /** Cap upward speed (m/s). Random-boxes: gravity/3 */
  maxVelocityY: number;
  /** Ground stick distance (m) */
  groundEpsilon: number;
  style: PlatformerJumpStyle;
}

/** Random-boxes Avatar defaults (FLY_JUMP). */
export const RANDOM_BOXES_JUMP: PlatformerJumpConfig = {
  gravity: 42,
  jumpForce: 42 * 1.8, // ≈ 75.6
  maxJumpTime: 0.99,
  maxVelocityY: 42 / 3, // ≈ 14
  groundEpsilon: 0.12,
  style: 'fly_jump',
};

/** Slightly softer for ethereal falls platforms (still hold-to-jump). */
export const ETHEREAL_FALLS_JUMP: PlatformerJumpConfig = {
  gravity: 36,
  jumpForce: 36 * 1.75,
  maxJumpTime: 0.85,
  maxVelocityY: 36 / 2.8,
  groundEpsilon: 0.15,
  style: 'fly_jump',
};

/** Airship deck — snappy hop, less floaty. */
export const AIRSHIP_DECK_JUMP: PlatformerJumpConfig = {
  gravity: 38,
  jumpForce: 38 * 1.65,
  maxJumpTime: 0.72,
  maxVelocityY: 38 / 3,
  groundEpsilon: 0.12,
  style: 'fly_jump',
};

/**
 * Volcanic infinite climb — random-boxes Avatar feel with slightly stronger
 * hold so 7–8 m floor steps stay reachable without double-jump.
 */
export const VOLCANIC_CLIMB_JUMP: PlatformerJumpConfig = {
  gravity: 40,
  jumpForce: 40 * 1.85,
  maxJumpTime: 1.05,
  maxVelocityY: 40 / 2.6,
  groundEpsilon: 0.18,
  style: 'fly_jump',
};

/**
 * Single resolver for zone-mode hold-to-jump.
 * Prefer this over scattering setPlatformerJump conditionals in the engine.
 * Airship solo zone keeps its own integrator (not CharacterController3D).
 *
 * Sector lists mirror VOLCANIC_CLIMB.sectors + ethereal_falls (keep in sync with
 * shared/definitions/volcanicClimb.ts — avoid importing shared into this leaf
 * if the client physics tree must stay free of definition cycles).
 */
const VOLCANIC_JUMP_SECTORS = new Set(['ember_depths', 'ashen_wastes']);
const ETHEREAL_JUMP_SECTORS = new Set(['ethereal_falls']);

export function resolvePlatformerJumpForSector(
  sectorId: string | null | undefined,
): PlatformerJumpConfig | null {
  if (!sectorId) return null;
  if (VOLCANIC_JUMP_SECTORS.has(sectorId)) return VOLCANIC_CLIMB_JUMP;
  if (ETHEREAL_JUMP_SECTORS.has(sectorId)) return ETHEREAL_FALLS_JUMP;
  return null;
}

export interface PlatformerJumpState {
  velocityY: number;
  jumpTime: number;
  grounded: boolean;
  /** True while in the lift phase of a hold-jump */
  boosting: boolean;
  airborne: boolean;
}

export function createJumpState(): PlatformerJumpState {
  return {
    velocityY: 0,
    jumpTime: 0,
    grounded: true,
    boosting: false,
    airborne: false,
  };
}

export interface JumpStepInput {
  /** Seconds this frame */
  dt: number;
  /** Current feet Y */
  y: number;
  /** Ground surface Y (or null if none) */
  groundY: number | null;
  /** Space held this frame */
  jumpHeld: boolean;
  /** Space just pressed this frame (edge) — used to start jump only from ground */
  jumpPressed: boolean;
  config: PlatformerJumpConfig;
  state: PlatformerJumpState;
}

export interface JumpStepResult {
  y: number;
  state: PlatformerJumpState;
  /** 'ground' | 'jumping' | 'falling' */
  movement: 'ground' | 'jumping' | 'falling';
}

/**
 * Integrate one frame of random-boxes style jump.
 * Caller applies result.y to the character feet.
 */
export function stepPlatformerJump(input: JumpStepInput): JumpStepResult {
  const { dt, groundY, jumpHeld, jumpPressed, config } = input;
  const st = input.state;
  let y = input.y;
  const eps = config.groundEpsilon;

  // Ground contact
  const onGround =
    groundY != null && y <= groundY + eps && st.velocityY <= 0.05;

  if (onGround && groundY != null) {
    st.grounded = true;
    st.airborne = false;
    st.boosting = false;
    st.jumpTime = 0;
    // Stick to ground unless starting a jump this frame
    if (!(jumpPressed || (jumpHeld && st.velocityY <= 0 && st.jumpTime === 0))) {
      st.velocityY = 0;
      y = groundY;
    }
  } else {
    st.grounded = false;
    st.airborne = true;
  }

  // Start jump from ground (or fly style mid-air)
  const canStart =
    (st.grounded && (jumpPressed || jumpHeld)) ||
    (config.style === 'fly' && jumpHeld);

  if (canStart && st.jumpTime === 0 && (jumpPressed || (st.grounded && jumpHeld))) {
    st.boosting = true;
    st.grounded = false;
    st.airborne = true;
    // small initial kick so takeoff feels snappy (random-boxes relies on force*dt only,
    // but a tiny impulse helps at low framerate)
    if (st.velocityY < 2) st.velocityY = Math.max(st.velocityY, config.jumpForce * 0.08);
  }

  // Hold-to-boost (FlyState.ableToJump + shouldAddForce)
  if (
    jumpHeld &&
    st.boosting &&
    st.jumpTime < config.maxJumpTime &&
    st.velocityY < config.maxVelocityY
  ) {
    st.jumpTime += dt;
    st.velocityY += config.jumpForce * dt;
    if (st.velocityY > config.maxVelocityY) st.velocityY = config.maxVelocityY;
  } else if (!jumpHeld) {
    // Early release ends boost window
    st.boosting = false;
  }

  // End boost when time expired
  if (st.jumpTime >= config.maxJumpTime) {
    st.boosting = false;
  }

  // Gravity (always when airborne or boosting ended)
  if (!st.grounded) {
    st.velocityY -= config.gravity * dt;
    // terminal fall (mirror maxVelocityY downward a bit looser)
    const maxFall = -config.maxVelocityY * 2.2;
    if (st.velocityY < maxFall) st.velocityY = maxFall;
  }

  // Integrate
  if (!st.grounded || st.velocityY > 0) {
    y += st.velocityY * dt;
  }

  // Land
  if (groundY != null && y < groundY && st.velocityY <= 0) {
    y = groundY;
    st.velocityY = 0;
    st.grounded = true;
    st.airborne = false;
    st.boosting = false;
    st.jumpTime = 0;
  }

  let movement: JumpStepResult['movement'] = 'ground';
  if (!st.grounded) {
    movement = st.velocityY > 0 || st.boosting ? 'jumping' : 'falling';
  }

  return { y, state: st, movement };
}
