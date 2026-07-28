/**
 * Rapier advanced collision detection — events, contact/intersection graphs, hooks, CCD.
 *
 * Official:
 *   https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection_js
 *
 * Pipeline: broad-phase (potential pairs) → narrow-phase (contacts / intersections)
 * → constraint solver (forces) → optional contact-force events.
 *
 * Also: colliders (ActiveEvents / ActiveHooks / groups) · rigid_bodies (CCD)
 * · scene_queries · common_mistakes · determinism
 */

// ── ActiveEvents (match @dimforge/rapier3d-compat) ────────────────────────

/**
 * Collider must set at least one of these or **no events** are generated for the pair.
 * Values match RAPIER.ActiveEvents.
 */
export const ACTIVE_EVENTS = {
  NONE: 0,
  /** Enter/exit intersection (sensors + solids). Not multi-contact count changes. */
  COLLISION_EVENTS: 1,
  /** After solver: force magnitude sum ≥ threshold. */
  CONTACT_FORCE_EVENTS: 2,
} as const;

// ── ActiveHooks ───────────────────────────────────────────────────────────

/** Values match RAPIER.ActiveHooks. */
export const ACTIVE_HOOKS = {
  NONE: 0,
  /** Call PhysicsHooks.filterContactPair for non-sensor pairs. */
  FILTER_CONTACT_PAIRS: 1,
  /** Call PhysicsHooks.filterIntersectionPair when a sensor is involved. */
  FILTER_INTERSECTION_PAIRS: 2,
} as const;

/** Values match RAPIER.SolverFlags (return from filterContactPair). */
export const SOLVER_FLAGS = {
  EMPTY: 0,
  /** Compute contact forces. null from filter = skip pair entirely. */
  COMPUTE_IMPULSE: 1,
} as const;

// ── Pipeline stages ───────────────────────────────────────────────────────

export type CollisionPipelineStage =
  | "broad_phase"
  | "narrow_phase"
  | "constraint_solver"
  | "events";

export const COLLISION_PIPELINE = {
  broad_phase: {
    stage: "broad_phase" as const,
    does: "Find potentially intersecting collider pairs (AABB-ish)",
  },
  narrow_phase: {
    stage: "narrow_phase" as const,
    does: "Compute contact points / sensor intersections; emit collision events",
  },
  constraint_solver: {
    stage: "constraint_solver" as const,
    does: "Apply contact forces from points; may emit contact force events",
  },
  events: {
    stage: "events" as const,
    does: "Drain EventQueue after world.step(eventQueue)",
  },
} as const;

// ── Event kinds ───────────────────────────────────────────────────────────

export type CollisionEventKind = "collision_start" | "collision_stop" | "contact_force";

export interface CollisionEventInfo {
  kind: CollisionEventKind;
  requiresActiveEvents: number;
  when: string;
  fleetUse: string[];
}

export const COLLISION_EVENT_KINDS: Record<CollisionEventKind, CollisionEventInfo> = {
  collision_start: {
    kind: "collision_start",
    requiresActiveEvents: ACTIVE_EVENTS.COLLISION_EVENTS,
    when: "Pair transitions to intersecting (started=true)",
    fleetUse: ["Sensor enter", "loot zone", "door trigger", "projectile first hit"],
  },
  collision_stop: {
    kind: "collision_stop",
    requiresActiveEvents: ACTIVE_EVENTS.COLLISION_EVENTS,
    when: "Pair transitions to not intersecting (started=false)",
    fleetUse: ["Sensor exit", "leave water", "release hold"],
  },
  contact_force: {
    kind: "contact_force",
    requiresActiveEvents: ACTIVE_EVENTS.CONTACT_FORCE_EVENTS,
    when: "Sum of contact force magnitudes ≥ threshold after solver",
    fleetUse: ["Impact SFX/VFX", "breakable crates", "hard landing", "cannon hit"],
  },
};

// ── Fleet event / hook roles ──────────────────────────────────────────────

export type FleetCollisionEventRole =
  | "sensor_enter_exit" // loot, harvest, water
  | "projectile_impact" // collision start + optional force
  | "hard_impact_sfx" // force events only (threshold)
  | "breakable_prop" // force above threshold → break
  | "contact_filter_no_player_vs_player"
  | "intersection_filter_team";

export interface CollisionEventRolePreset {
  role: FleetCollisionEventRole;
  activeEvents: number;
  activeHooks: number;
  /** Contact force threshold (Newtons-ish / fleet units). 0 = any force. */
  contactForceThreshold: number;
  notes: string;
}

export const COLLISION_EVENT_PRESETS: Record<
  FleetCollisionEventRole,
  CollisionEventRolePreset
> = {
  sensor_enter_exit: {
    role: "sensor_enter_exit",
    activeEvents: ACTIVE_EVENTS.COLLISION_EVENTS,
    activeHooks: ACTIVE_HOOKS.NONE,
    contactForceThreshold: 0,
    notes: "Sensors (and partners) need COLLISION_EVENTS on ≥1 collider of the pair.",
  },
  projectile_impact: {
    role: "projectile_impact",
    activeEvents: ACTIVE_EVENTS.COLLISION_EVENTS | ACTIVE_EVENTS.CONTACT_FORCE_EVENTS,
    activeHooks: ACTIVE_HOOKS.NONE,
    contactForceThreshold: 5,
    notes: "Start event for hit logic; force for heavy impact VFX.",
  },
  hard_impact_sfx: {
    role: "hard_impact_sfx",
    activeEvents: ACTIVE_EVENTS.CONTACT_FORCE_EVENTS,
    activeHooks: ACTIVE_HOOKS.NONE,
    contactForceThreshold: 50,
    notes: "Only loud impacts — setContactForceEventThreshold on collider.",
  },
  breakable_prop: {
    role: "breakable_prop",
    activeEvents: ACTIVE_EVENTS.CONTACT_FORCE_EVENTS | ACTIVE_EVENTS.COLLISION_EVENTS,
    activeHooks: ACTIVE_HOOKS.NONE,
    contactForceThreshold: 80,
    notes: "Drain force events; if totalForceMagnitude ≥ break threshold → pinata.",
  },
  contact_filter_no_player_vs_player: {
    role: "contact_filter_no_player_vs_player",
    activeEvents: ACTIVE_EVENTS.NONE,
    activeHooks: ACTIVE_HOOKS.FILTER_CONTACT_PAIRS,
    contactForceThreshold: 0,
    notes: "filterContactPair returns null for PvP; else COMPUTE_IMPULSE. More flexible than groups.",
  },
  intersection_filter_team: {
    role: "intersection_filter_team",
    activeEvents: ACTIVE_EVENTS.COLLISION_EVENTS,
    activeHooks: ACTIVE_HOOKS.FILTER_INTERSECTION_PAIRS,
    contactForceThreshold: 0,
    notes: "filterIntersectionPair false for same-team sensor hits.",
  },
};

export const COLLISION_EVENT_USE = {
  loot: "sensor_enter_exit",
  harvest: "sensor_enter_exit",
  water: "sensor_enter_exit",
  bullet_hit: "projectile_impact",
  cannon_hit: "projectile_impact",
  landing_thud: "hard_impact_sfx",
  crate_break: "breakable_prop",
  no_friendly_fire_contact: "contact_filter_no_player_vs_player",
  team_sensor: "intersection_filter_team",
} as const satisfies Record<string, FleetCollisionEventRole>;

// ── Contact graph vs intersection graph ───────────────────────────────────

export const CONTACT_VS_INTERSECTION = {
  contact_graph: {
    who: "Two non-sensor colliders",
    api: ["world.contactPairsWith", "world.contactPair"],
    provides: "Manifolds: geometric contacts + solver contacts, normals, depth",
    notes: "Geometric contacts local-space; solver contacts world-space",
  },
  intersection_graph: {
    who: "At least one sensor in the pair",
    api: ["world.intersectionPairsWith", "world.intersectionPair"],
    provides: "Boolean intersecting (no force / no manifold forces)",
    notes: "Two solids never appear here — they use the contact graph",
  },
} as const;

// ── EventQueue policy ─────────────────────────────────────────────────────

/**
 * EventQueue(autoDrain=true) is required — autoDrain clears before each step
 * so RAM does not grow unbounded.
 */
export const EVENT_QUEUE_POLICY = {
  autoDrain: true as const,
  stepWithQueue: "world.step(eventQueue, hooks?)",
  drainCollision: "eventQueue.drainCollisionEvents((h1, h2, started) => …)",
  drainForce: "eventQueue.drainContactForceEvents((event) => …)",
  freeOnDispose: true as const,
} as const;

/**
 * Build ActiveEvents bitfield for a role.
 */
export function activeEventsForRole(role: FleetCollisionEventRole): number {
  return COLLISION_EVENT_PRESETS[role].activeEvents;
}

/**
 * Build ActiveHooks bitfield for a role.
 */
export function activeHooksForRole(role: FleetCollisionEventRole): number {
  return COLLISION_EVENT_PRESETS[role].activeHooks;
}

/**
 * Minimal PhysicsHooks shape for tests / docs (no RAPIER import).
 */
export interface PhysicsHooksLike {
  filterContactPair(
    collider1: number,
    collider2: number,
    body1: number,
    body2: number,
  ): number | null;
  filterIntersectionPair(
    collider1: number,
    collider2: number,
    body1: number,
    body2: number,
  ): boolean;
}

/**
 * Factory: contact filter that skips pairs when both body handles are in `skipBodyPair`.
 * Otherwise compute impulses. Use with ActiveHooks.FILTER_CONTACT_PAIRS on ≥1 collider.
 */
export function createBodyPairSkipContactHooks(
  shouldSkip: (body1: number, body2: number) => boolean,
): PhysicsHooksLike {
  return {
    filterContactPair(_c1, _c2, body1, body2) {
      if (shouldSkip(body1, body2)) return null; // no contact computation
      return SOLVER_FLAGS.COMPUTE_IMPULSE;
    },
    filterIntersectionPair() {
      return true;
    },
  };
}

/**
 * Factory: sensor intersection filter (team / faction).
 */
export function createIntersectionFilterHooks(
  allow: (body1: number, body2: number) => boolean,
): PhysicsHooksLike {
  return {
    filterContactPair() {
      return SOLVER_FLAGS.COMPUTE_IMPULSE;
    },
    filterIntersectionPair(_c1, _c2, body1, body2) {
      return allow(body1, body2);
    },
  };
}

export const ADVANCED_COLLISION_RULES = [
  "Broad-phase finds potential pairs; narrow-phase computes contacts / intersections",
  "Collision events = enter/exit only — not 1 contact → N contacts",
  "Events need world.step(EventQueue) then drainCollisionEvents / drainContactForceEvents",
  "COLLISION_EVENTS on ≥1 collider of the pair or no collision events",
  "CONTACT_FORCE_EVENTS + setContactForceEventThreshold to skip weak impacts",
  "Contact force magnitude = sum of magnitudes (not |sum of force vectors|)",
  "Contact graph = two solids; intersection graph = ≥1 sensor",
  "contactPairsWith / contactPair for manifolds; intersectionPairsWith / intersectionPair for sensors",
  "Geometric contacts local-space; solver contacts world-space",
  "Compound/trimesh may yield multiple manifolds per pair",
  "PhysicsHooks for filters beyond collision groups — need ActiveHooks bits on collider",
  "filterContactPair: null = skip pair; SolverFlags.COMPUTE_IMPULSE = forces",
  "filterIntersectionPair: false = skip sensor intersection test",
  "EventQueue(autoDrain=true) required; free() on dispose",
  "CCD for tunneling: enable on fast dynamic rigid-bodies (see rigid_bodies)",
  "SI + fixed 1/60 step; create order for determinism",
] as const;
