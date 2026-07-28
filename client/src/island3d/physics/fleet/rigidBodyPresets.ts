/**
 * Rapier rigid-body types & fleet usage map.
 *
 * Official: https://rapier.rs/docs/user_guides/javascript/rigid_bodies
 *
 * Also: common_mistakes (mass/density, SI) · determinism (create order) ·
 * character_controller (kinematic player + CCT, not raw teleport).
 *
 * | Type | Gravity / forces | Contacts | Fleet use |
 * |------|------------------|----------|----------|
 * | Fixed | no | vs dynamic only | Ground, walls, authored cuboids, island shells |
 * | Dynamic | yes | full | Debris, crates, cannonballs (CCD) |
 * | KinematicPositionBased | no* | vs dynamic | Player (CCT), elevators (setNextKinematic*) |
 * | KinematicVelocityBased | no* | vs dynamic | Platforms driven by velocity |
 *
 * *Kinematic: user controls trajectory; they ignore contact forces and can
 *  pass through walls unless you use CCT / scene queries.
 */

/** Rigid-body role for Grudge games (maps 1:1 to Rapier types). */
export type FleetRigidBodyRole =
  | "fixed_static" // ground, buildings, terrain colliders
  | "dynamic_prop" // crates, barrels, loot
  | "dynamic_projectile" // cannonballs, bolts that use RB (optional)
  | "kinematic_player" // CCT capsule — position-based
  | "kinematic_platform" // elevators / moving docks — position-based
  | "kinematic_velocity"; // velocity-driven movers

export interface RigidBodyPreset {
  role: FleetRigidBodyRole;
  /** Rapier factory key */
  rapierType: "fixed" | "dynamic" | "kinematicPositionBased" | "kinematicVelocityBased";
  /** Collider density — REQUIRED for dynamic (mass from shape×density). */
  density: number;
  linearDamping: number;
  angularDamping: number;
  /** Continuous collision detection — fast movers (anti-tunneling). */
  ccd: boolean;
  canSleep: boolean;
  /** Gravity scale (dynamic only; 0 = float). */
  gravityScale: number;
  friction: number;
  restitution: number;
  notes: string;
}

/** Production presets — SI meters. */
export const RIGID_BODY_PRESETS: Record<FleetRigidBodyRole, RigidBodyPreset> = {
  fixed_static: {
    role: "fixed_static",
    rapierType: "fixed",
    density: 0, // unused — infinite mass
    linearDamping: 0,
    angularDamping: 0,
    ccd: false,
    canSleep: true,
    gravityScale: 0,
    friction: 0.8,
    restitution: 0,
    notes: "Ground, authored editor colliders, building hulls. Never teleport into dynamics carelessly.",
  },
  dynamic_prop: {
    role: "dynamic_prop",
    rapierType: "dynamic",
    density: 1.2,
    linearDamping: 0.35,
    angularDamping: 0.4,
    ccd: false,
    canSleep: true,
    gravityScale: 1,
    friction: 0.55,
    restitution: 0.15,
    notes: "Crates/barrels. Must have density>0 or forces/gravity do nothing.",
  },
  dynamic_projectile: {
    role: "dynamic_projectile",
    rapierType: "dynamic",
    density: 2.5,
    linearDamping: 0.05,
    angularDamping: 0.1,
    ccd: true, // anti-tunneling for fast balls
    canSleep: false,
    gravityScale: 1,
    friction: 0.2,
    restitution: 0.1,
    notes: "Cannonballs if RB-driven. Prefer kinematic projectiles + ray for gameplay authority.",
  },
  kinematic_player: {
    role: "kinematic_player",
    rapierType: "kinematicPositionBased",
    density: 1, // unused for kinematic forces but harmless
    linearDamping: 0,
    angularDamping: 0,
    ccd: false,
    canSleep: false,
    gravityScale: 0, // gravity applied in CCT desired movement
    friction: 0, // CCT owns sliding
    restitution: 0,
    notes: "Use setNextKinematicTranslation + CCT. Never setTranslation each frame as teleport.",
  },
  kinematic_platform: {
    role: "kinematic_platform",
    rapierType: "kinematicPositionBased",
    density: 1,
    linearDamping: 0,
    angularDamping: 0,
    ccd: false,
    canSleep: false,
    gravityScale: 0,
    friction: 0.9,
    restitution: 0,
    notes: "Elevators/docks: setNextKinematicTranslation each step so dynamics ride realistically.",
  },
  kinematic_velocity: {
    role: "kinematic_velocity",
    rapierType: "kinematicVelocityBased",
    density: 1,
    linearDamping: 0,
    angularDamping: 0,
    ccd: false,
    canSleep: false,
    gravityScale: 0,
    friction: 0.9,
    restitution: 0,
    notes: "Drive with setLinvel; engine integrates position. Good for constant-speed platforms.",
  },
};

/** Fleet assignment cheat-sheet */
export const RIGID_BODY_USE = {
  ground: "fixed_static",
  walls: "fixed_static",
  terrain: "fixed_static",
  crate: "dynamic_prop",
  barrel: "dynamic_prop",
  debris: "dynamic_prop",
  cannonball_rb: "dynamic_projectile",
  player: "kinematic_player",
  elevator: "kinematic_platform",
  conveyor: "kinematic_velocity",
} as const;

/**
 * Rules from rigid_bodies.md — do not violate in game code.
 */
export const RIGID_BODY_RULES = [
  "Rigid-body = dynamics only; attach colliders for shape/contacts",
  "Fixed: infinite mass, no forces — ground / frozen props",
  "Dynamic: gravity + forces; density/mass must be non-zero",
  "Kinematic: total trajectory control — ignores walls unless CCT/queries",
  "Position kinematic: setNextKinematicTranslation (not raw setTranslation)",
  "Velocity kinematic: setLinvel; position deduced by engine",
  "Never teleport dynamic bodies into occupied space (use forces/velocity)",
  "Wake-up: pass true on setLinvel/addForce unless simulating custom sleep gravity",
  "CCD for fast dynamic projectiles only (cost)",
  "Sleeping: slow dynamics sleep; wakeUp before user forces",
  "Dominance: higher group wins contact mass (optional player push-back)",
  "Zero mass = infinite mass (won't move) — not the same as light",
] as const;
