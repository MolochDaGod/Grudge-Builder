/**
 * Rapier colliders — fleet shapes, materials, sensors, and collision groups.
 *
 * Official: https://rapier.rs/docs/user_guides/javascript/colliders
 *
 * Collider = geometric shape + contact/material data.
 * Rigid-body = motion type only (see rigidBodyPresets.ts).
 * A body with no collider never collides.
 *
 * Also: common_mistakes (SI, density) · determinism · character_controller
 * · rigid_bodies.
 */

// ── Collision groups (16 membership + 16 filter packed into u32) ──────────

/**
 * Fleet membership bits (left 16 of collisionGroups / solverGroups).
 * Membership = what group(s) this collider belongs to.
 * Filter     = which groups it may interact with.
 */
export const COLLISION_MEMBER = {
  /** Ground, walls, terrain heightfield/trimesh, authored statics */
  STATIC: 1 << 0,
  /** Player CCT capsule */
  PLAYER: 1 << 1,
  /** Crates, barrels, debris */
  PROP: 1 << 2,
  /** Cannonballs / bolts when RB-driven */
  PROJECTILE: 1 << 3,
  /** Trigger volumes (loot, harvest, water, door) — usually sensors */
  SENSOR: 1 << 4,
  /** NPCs / enemies */
  NPC: 1 << 5,
  /** Ships, carts, elevators that need selective contact */
  VEHICLE: 1 << 6,
  /** Soft hitboxes / damage volumes (sensors + events) */
  HITBOX: 1 << 7,
} as const;

export type CollisionMemberKey = keyof typeof COLLISION_MEMBER;

/**
 * Pack membership + filter into Rapier `setCollisionGroups` / `setSolverGroups` u32.
 * membership & filter are 16-bit masks (use COLLISION_MEMBER bits).
 *
 * Interaction requires BOTH:
 *   (A.membership & B.filter) != 0 && (B.membership & A.filter) != 0
 */
export function packCollisionGroups(membership: number, filter: number): number {
  const m = membership & 0xffff;
  const f = filter & 0xffff;
  return ((m << 16) | f) >>> 0;
}

/** Default “collide with everything in fleet layers”. */
export const FILTER_ALL_FLEET =
  COLLISION_MEMBER.STATIC |
  COLLISION_MEMBER.PLAYER |
  COLLISION_MEMBER.PROP |
  COLLISION_MEMBER.PROJECTILE |
  COLLISION_MEMBER.SENSOR |
  COLLISION_MEMBER.NPC |
  COLLISION_MEMBER.VEHICLE |
  COLLISION_MEMBER.HITBOX;

/** Everything except sensors (solid gameplay contacts). */
export const FILTER_SOLIDS =
  COLLISION_MEMBER.STATIC |
  COLLISION_MEMBER.PLAYER |
  COLLISION_MEMBER.PROP |
  COLLISION_MEMBER.PROJECTILE |
  COLLISION_MEMBER.NPC |
  COLLISION_MEMBER.VEHICLE;

// ── Shape kinds (Rapier ColliderDesc factories) ───────────────────────────

/**
 * Preferred fleet shapes. Prefer primitives over trimesh for dynamics.
 * Trimesh / heightfield = fixed environment only.
 */
export type ColliderShapeKind =
  | "ball"
  | "cuboid"
  | "capsule"
  | "cylinder"
  | "cone"
  | "roundCuboid"
  | "convexHull"
  | "trimesh"
  | "heightfield";

// ── Material / role presets ───────────────────────────────────────────────

/** Fleet collider material role (shape-agnostic contact + mass data). */
export type FleetColliderRole =
  | "ground" // static terrain / floors
  | "wall" // static walls / buildings
  | "wood_prop" // crates, barrels (dynamic)
  | "stone_prop" // heavier debris
  | "metal_projectile" // fast balls (CCD body + this material)
  | "player_capsule" // CCT solid capsule
  | "platform" // kinematic elevators / docks
  | "ice" // low friction pad
  | "bouncy" // high restitution pad
  | "sensor_trigger" // loot / harvest / water / zone enter
  | "hitbox_sensor"; // damage volume (events only)

export interface ColliderMaterialPreset {
  role: FleetColliderRole;
  /** Solid contact forces vs sensor (intersection events only). */
  isSensor: boolean;
  /**
   * Density (kg/m³ relative scale). Default Rapier = 1.0.
   * Non-zero density → mass + inertia from shape (preferred over manual mass).
   * Sensors still contribute mass if density > 0 — use 0 on trigger sensors
   * attached to dynamics when you do not want mass change.
   */
  density: number;
  friction: number;
  restitution: number;
  /**
   * Packed collision groups. Prefer packCollisionGroups().
   * `null` = leave Rapier default (all groups).
   */
  collisionGroups: number | null;
  /** Solver groups (force filter). Usually same as collisionGroups; null = default. */
  solverGroups: number | null;
  /**
   * Emit collision/intersection events (ActiveEvents.COLLISION_EVENTS).
   * Required for sensor enter/exit gameplay.
   */
  activeCollisionEvents: boolean;
  /**
   * Enable kinematic↔fixed contacts (ActiveCollisionTypes.DEFAULT | KINEMATIC_FIXED).
   * Needed when kinematic platforms must rest on fixed ground, or CCT-adjacent probes.
   */
  kinematicFixedContacts: boolean;
  notes: string;
}

/**
 * Production collider materials — SI meters.
 * Pair with RIGID_BODY_PRESETS for body type.
 */
export const COLLIDER_PRESETS: Record<FleetColliderRole, ColliderMaterialPreset> = {
  ground: {
    role: "ground",
    isSensor: false,
    density: 0, // fixed parent — mass unused
    friction: 0.8,
    restitution: 0,
    collisionGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_ALL_FLEET),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Floors / heightfield / authored ground. Prefer cuboid, heightfield, or trimesh on FIXED.",
  },
  wall: {
    role: "wall",
    isSensor: false,
    density: 0,
    friction: 0.75,
    restitution: 0,
    collisionGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_ALL_FLEET),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Building shells, rock walls. Cuboid / convex / trimesh on FIXED only.",
  },
  wood_prop: {
    role: "wood_prop",
    isSensor: false,
    density: 1.2,
    friction: 0.55,
    restitution: 0.15,
    // Include SENSOR so props can enter loot/harvest zones (events); solver = solids only.
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.PROP,
      FILTER_SOLIDS | COLLISION_MEMBER.SENSOR,
    ),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.PROP, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Crates/barrels. Density > 0 required on dynamic RB.",
  },
  stone_prop: {
    role: "stone_prop",
    isSensor: false,
    density: 2.4,
    friction: 0.7,
    restitution: 0.05,
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.PROP,
      FILTER_SOLIDS | COLLISION_MEMBER.SENSOR,
    ),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.PROP, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Heavier debris / ore chunks after pinata break.",
  },
  metal_projectile: {
    role: "metal_projectile",
    isSensor: false,
    density: 2.5,
    friction: 0.2,
    restitution: 0.1,
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.PROJECTILE,
      COLLISION_MEMBER.STATIC |
        COLLISION_MEMBER.PROP |
        COLLISION_MEMBER.NPC |
        COLLISION_MEMBER.VEHICLE |
        COLLISION_MEMBER.HITBOX,
    ),
    solverGroups: packCollisionGroups(
      COLLISION_MEMBER.PROJECTILE,
      COLLISION_MEMBER.STATIC |
        COLLISION_MEMBER.PROP |
        COLLISION_MEMBER.NPC |
        COLLISION_MEMBER.VEHICLE,
    ),
    activeCollisionEvents: true,
    kinematicFixedContacts: false,
    notes: "Ball shape; enable CCD on the dynamic rigid-body.",
  },
  player_capsule: {
    role: "player_capsule",
    isSensor: false,
    density: 1,
    friction: 0, // CCT owns sliding
    restitution: 0,
    // Filter must include SENSOR/HITBOX so mutual group checks pass for triggers.
    // Solver filter stays solids-only so sensors never generate contact forces.
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.PLAYER,
      (FILTER_SOLIDS & ~COLLISION_MEMBER.PLAYER) |
        COLLISION_MEMBER.SENSOR |
        COLLISION_MEMBER.HITBOX,
    ),
    solverGroups: packCollisionGroups(
      COLLISION_MEMBER.PLAYER,
      FILTER_SOLIDS & ~COLLISION_MEMBER.PLAYER,
    ),
    activeCollisionEvents: false,
    kinematicFixedContacts: true,
    notes: "Capsule on kinematic position-based RB + CCT. Never trimesh.",
  },
  platform: {
    role: "platform",
    isSensor: false,
    density: 1,
    friction: 0.9,
    restitution: 0,
    collisionGroups: packCollisionGroups(COLLISION_MEMBER.VEHICLE, FILTER_SOLIDS),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.VEHICLE, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: true,
    notes: "Elevators/docks: cuboid on kinematic; setNextKinematicTranslation.",
  },
  ice: {
    role: "ice",
    isSensor: false,
    density: 0,
    friction: 0.05,
    restitution: 0,
    collisionGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_ALL_FLEET),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Low-friction pads. Use Min friction combine if needed.",
  },
  bouncy: {
    role: "bouncy",
    isSensor: false,
    density: 0,
    friction: 0.4,
    restitution: 0.9,
    collisionGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_ALL_FLEET),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.STATIC, FILTER_SOLIDS),
    activeCollisionEvents: false,
    kinematicFixedContacts: false,
    notes: "Pads / trampolines. Restitution 1 = fully elastic ideal.",
  },
  sensor_trigger: {
    role: "sensor_trigger",
    isSensor: true,
    density: 0, // no mass contribution
    friction: 0,
    restitution: 0,
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.SENSOR,
      COLLISION_MEMBER.PLAYER |
        COLLISION_MEMBER.NPC |
        COLLISION_MEMBER.PROP |
        COLLISION_MEMBER.PROJECTILE |
        COLLISION_MEMBER.VEHICLE,
    ),
    // Sensors don't need solver forces — still set groups for consistency
    solverGroups: packCollisionGroups(COLLISION_MEMBER.SENSOR, 0),
    activeCollisionEvents: true,
    kinematicFixedContacts: true,
    notes: "Loot / harvest / water / door zones. Intersection events only; no contact forces.",
  },
  hitbox_sensor: {
    role: "hitbox_sensor",
    isSensor: true,
    density: 0,
    friction: 0,
    restitution: 0,
    collisionGroups: packCollisionGroups(
      COLLISION_MEMBER.HITBOX,
      COLLISION_MEMBER.PLAYER |
        COLLISION_MEMBER.NPC |
        COLLISION_MEMBER.PROJECTILE,
    ),
    solverGroups: packCollisionGroups(COLLISION_MEMBER.HITBOX, 0),
    activeCollisionEvents: true,
    kinematicFixedContacts: true,
    notes: "Melee swing / AoE damage volumes. Parent may be kinematic following weapon bone.",
  },
};

/** Quick map: gameplay thing → collider material role */
export const COLLIDER_USE = {
  ground: "ground",
  terrain: "ground",
  wall: "wall",
  building: "wall",
  crate: "wood_prop",
  barrel: "wood_prop",
  debris: "wood_prop",
  ore_chunk: "stone_prop",
  cannonball: "metal_projectile",
  player: "player_capsule",
  elevator: "platform",
  dock: "platform",
  ice_pad: "ice",
  trampoline: "bouncy",
  loot_zone: "sensor_trigger",
  harvest_zone: "sensor_trigger",
  water_volume: "sensor_trigger",
  damage_hitbox: "hitbox_sensor",
} as const satisfies Record<string, FleetColliderRole>;

// ── Shape selection rules ─────────────────────────────────────────────────

export const COLLIDER_SHAPE_RULES = {
  /** Character / CCT — always capsule (cheap + stable). */
  character: "capsule" as const,
  /** Crates / simple props */
  propBox: "cuboid" as const,
  /** Balls / projectiles */
  ball: "ball" as const,
  /** Authored editor boxes */
  editorBox: "cuboid" as const,
  /** Large terrain with regular grid heights */
  terrainGrid: "heightfield" as const,
  /** Complex static island / building mesh */
  staticMesh: "trimesh" as const,
  /** Non-convex prop that must be dynamic — decompose, don't trimesh */
  dynamicNonConvex: "convexHull" as const,
} as const;

/**
 * Rules from colliders.md — do not violate in game code.
 */
export const COLLIDER_RULES = [
  "Collider = shape + contacts; rigid-body = motion type only",
  "Solid colliders generate contact forces; sensors only intersection events",
  "Sensors still contribute mass if density > 0 — set density 0 on pure triggers",
  "Prefer density or setMass so inertia matches shape; avoid bad manual mass props",
  "Never attach trimesh/polyline to dynamic rigid-bodies (no interior → stuck)",
  "Dynamic non-convex: convex decomposition / compound of convex shapes",
  "Trimesh / heightfield = fixed environment (terrain, buildings)",
  "Avoid long thin triangles on trimeshes (numerical stability)",
  "Collider position on attached body is relative (setTranslationWrtParent)",
  "Raw setTranslation on attached collider has no lasting effect",
  "Friction / restitution combine rules: Max > Multiply > Min > Average",
  "collision_groups filter early (narrow-phase); solver_groups only skip forces",
  "Enable ActiveEvents.COLLISION_EVENTS on at least one collider for enter/exit",
  "Kinematic↔fixed contacts need ActiveCollisionTypes.DEFAULT | KINEMATIC_FIXED",
  "SI meters only — never pixel-sized colliders",
  "Create order + fixed step matter for determinism",
] as const;

// ── Apply helpers (RAPIER ColliderDesc) ───────────────────────────────────

/** Minimal shape of Rapier ColliderDesc chain (avoid hard dep in pure unit tests). */
export interface ColliderDescLike {
  setSensor(s: boolean): ColliderDescLike;
  setDensity(d: number): ColliderDescLike;
  setFriction(f: number): ColliderDescLike;
  setRestitution(r: number): ColliderDescLike;
  setCollisionGroups?(g: number): ColliderDescLike;
  setSolverGroups?(g: number): ColliderDescLike;
  setActiveEvents?(e: number): ColliderDescLike;
  setActiveCollisionTypes?(t: number): ColliderDescLike;
}

/**
 * Apply fleet material preset onto a ColliderDesc.
 * Pass ActiveEvents / ActiveCollisionTypes bit values from the RAPIER module
 * when you want events / kinematic-fixed contacts.
 */
export function applyColliderMaterial<T extends ColliderDescLike>(
  desc: T,
  role: FleetColliderRole,
  rapierBits?: {
    /** e.g. RAPIER.ActiveEvents.COLLISION_EVENTS */
    collisionEvents?: number;
    /** e.g. RAPIER.ActiveCollisionTypes.DEFAULT | KINEMATIC_FIXED */
    kinematicFixed?: number;
  },
): T {
  const p = COLLIDER_PRESETS[role];
  desc.setSensor(p.isSensor);
  desc.setDensity(p.density);
  desc.setFriction(p.friction);
  desc.setRestitution(p.restitution);
  if (p.collisionGroups != null && desc.setCollisionGroups) {
    desc.setCollisionGroups(p.collisionGroups);
  }
  if (p.solverGroups != null && desc.setSolverGroups) {
    desc.setSolverGroups(p.solverGroups);
  }
  if (p.activeCollisionEvents && rapierBits?.collisionEvents != null && desc.setActiveEvents) {
    desc.setActiveEvents(rapierBits.collisionEvents);
  }
  if (p.kinematicFixedContacts && rapierBits?.kinematicFixed != null && desc.setActiveCollisionTypes) {
    desc.setActiveCollisionTypes(rapierBits.kinematicFixed);
  }
  return desc;
}

/** Human-readable decode of packed groups (debug / tests). */
export function unpackCollisionGroups(packed: number): {
  membership: number;
  filter: number;
} {
  return {
    membership: (packed >>> 16) & 0xffff,
    filter: packed & 0xffff,
  };
}

/**
 * Pairwise interaction test (same bit check Rapier uses after broad-phase).
 */
export function collisionGroupsInteract(a: number, b: number): boolean {
  const am = (a >>> 16) & 0xffff;
  const af = a & 0xffff;
  const bm = (b >>> 16) & 0xffff;
  const bf = b & 0xffff;
  return (am & bf) !== 0 && (bm & af) !== 0;
}
