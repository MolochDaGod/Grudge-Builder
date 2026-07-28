/**
 * Rapier scene queries — rays, shape casts, points, intersections, filters.
 *
 * Official: https://rapier.rs/docs/user_guides/javascript/scene_queries
 *
 * Scene queries consider **all colliders** in the world (geometry, not forces).
 * Pair with collision groups (`colliderPresets`) for layer filtering.
 *
 * Also: colliders · character_controller · rigid_bodies · common_mistakes
 */

import {
  COLLISION_MEMBER,
  FILTER_SOLIDS,
  packCollisionGroups,
} from "./colliderPresets";

// ── Query kinds ───────────────────────────────────────────────────────────

export type SceneQueryKind =
  | "castRay"
  | "castRayAndGetNormal"
  | "intersectionsWithRay"
  | "castShape"
  | "projectPoint"
  | "intersectionsWithPoint"
  | "intersectionsWithShape"
  | "collidersWithAabb";

export interface SceneQueryKindInfo {
  kind: SceneQueryKind;
  cost: "cheap" | "medium" | "expensive";
  returns: string;
  fleetUse: string[];
}

/** What each World.* API is for (official guide map). */
export const SCENE_QUERY_KINDS: Record<SceneQueryKind, SceneQueryKindInfo> = {
  castRay: {
    kind: "castRay",
    cost: "cheap",
    returns: "First hit TOI (optional filter)",
    fleetUse: ["Bullets", "ground probe", "crosshair pick", "LOS stub"],
  },
  castRayAndGetNormal: {
    kind: "castRayAndGetNormal",
    cost: "cheap",
    returns: "First hit TOI + surface normal",
    fleetUse: ["Decals", "slide/reflect", "foot IK normal"],
  },
  intersectionsWithRay: {
    kind: "intersectionsWithRay",
    cost: "medium",
    returns: "All hits along ray (callback; return false to stop)",
    fleetUse: ["Pierce shot", "multi-target beam", "debug draw hits"],
  },
  castShape: {
    kind: "castShape",
    cost: "expensive",
    returns: "Sweep shape along velocity; first contact",
    fleetUse: ["CCT-like probes", "vehicle bumper", "ability dash"],
  },
  projectPoint: {
    kind: "projectPoint",
    cost: "cheap",
    returns: "Closest point on any collider + isInside",
    fleetUse: ["Snap to surface", "inside volume test"],
  },
  intersectionsWithPoint: {
    kind: "intersectionsWithPoint",
    cost: "cheap",
    returns: "Every collider containing the point",
    fleetUse: ["Is player in water/trigger?", "zone membership"],
  },
  intersectionsWithShape: {
    kind: "intersectionsWithShape",
    cost: "medium",
    returns: "Exact shape overlaps (callback)",
    fleetUse: ["AoE damage query", "harvest radius", "loot vacuum"],
  },
  collidersWithAabb: {
    kind: "collidersWithAabb",
    cost: "cheap",
    returns: "Broad-phase AABB candidates only (not exact)",
    fleetUse: ["Broad cull before exact test", "editor selection box"],
  },
};

// ── solid flag (ray / point) ──────────────────────────────────────────────

/**
 * `solid: true`  → shape interior is filled; origin inside → TOI 0 / point is inside.
 * `solid: false` → hollow; hit first boundary even if origin starts inside.
 */
export const SCENE_QUERY_SOLID = {
  /** Bullets, ground checks, solid walls — interior counts. */
  filled: true,
  /** Hollow shells / “exit the mesh” boundary hits. */
  hollow: false,
} as const;

// ── QueryFilterFlags (match @dimforge/rapier3d-compat enum values) ────────

/**
 * Numeric flags for excluding families of colliders.
 * Keep in sync with RAPIER.QueryFilterFlags.
 */
export const QUERY_FILTER_FLAGS = {
  EXCLUDE_FIXED: 1,
  EXCLUDE_KINEMATIC: 2,
  EXCLUDE_DYNAMIC: 4,
  EXCLUDE_SENSORS: 8,
  EXCLUDE_SOLIDS: 16,
  /** fixed|kinematic excluded → only dynamic */
  ONLY_DYNAMIC: 3,
  /** fixed|dynamic excluded → only kinematic */
  ONLY_KINEMATIC: 5,
  /** kinematic|dynamic excluded → only fixed (+ free colliders) */
  ONLY_FIXED: 6,
} as const;

export type QueryFilterFlagName = keyof typeof QUERY_FILTER_FLAGS;

// ── Fleet query filter presets ────────────────────────────────────────────

export type FleetSceneQueryRole =
  | "aim_bullet" // FPS hitscan / projectile aim
  | "ground_probe" // feet / terrain height
  | "los_static" // line of sight vs environment only
  | "player_cct_probe" // exclude self + sensors
  | "aoe_damage" // shape/point hits vs NPCs/props
  | "loot_zone" // sensors only
  | "editor_pick" // everything solids
  | "broad_cull"; // AABB prefilter (no flags)

export interface SceneQueryFilterPreset {
  role: FleetSceneQueryRole;
  /** QueryFilterFlags bitfield (or 0 / undefined = none). */
  flags: number;
  /**
   * Packed collision groups for the *query* (membership<<16|filter).
   * Query hits colliders whose groups interact with this mask.
   * null = no group filter (all groups).
   */
  groups: number | null;
  /** Prefer solid=true for ray/point. */
  solid: boolean;
  /** Default maxToi (meters when dir is unit). */
  defaultMaxToi: number;
  notes: string;
}

/**
 * Production filter packs — SI meters, fleet collision layers.
 * Always exclude the local player RB via excludeRigidBody at call site.
 */
export const SCENE_QUERY_PRESETS: Record<FleetSceneQueryRole, SceneQueryFilterPreset> = {
  aim_bullet: {
    role: "aim_bullet",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SENSORS,
    groups: packCollisionGroups(
      COLLISION_MEMBER.PROJECTILE,
      COLLISION_MEMBER.STATIC |
        COLLISION_MEMBER.PROP |
        COLLISION_MEMBER.NPC |
        COLLISION_MEMBER.VEHICLE |
        COLLISION_MEMBER.HITBOX,
    ),
    solid: true,
    defaultMaxToi: 200,
    notes: "Hitscan. excludeRigidBody = shooter. Prefer castRayAndGetNormal for decals.",
  },
  ground_probe: {
    role: "ground_probe",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SENSORS | QUERY_FILTER_FLAGS.EXCLUDE_DYNAMIC,
    groups: packCollisionGroups(
      COLLISION_MEMBER.PLAYER,
      COLLISION_MEMBER.STATIC | COLLISION_MEMBER.VEHICLE,
    ),
    solid: true,
    defaultMaxToi: 500,
    notes: "Downward ray for feet height. Exclude dynamics so crates don't fake ground.",
  },
  los_static: {
    role: "los_static",
    flags:
      QUERY_FILTER_FLAGS.EXCLUDE_SENSORS |
      QUERY_FILTER_FLAGS.EXCLUDE_DYNAMIC |
      QUERY_FILTER_FLAGS.EXCLUDE_KINEMATIC,
    groups: packCollisionGroups(COLLISION_MEMBER.NPC, COLLISION_MEMBER.STATIC),
    solid: true,
    defaultMaxToi: 120,
    notes: "AI line-of-sight vs walls/terrain only.",
  },
  player_cct_probe: {
    role: "player_cct_probe",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SENSORS,
    groups: packCollisionGroups(
      COLLISION_MEMBER.PLAYER,
      FILTER_SOLIDS & ~COLLISION_MEMBER.PLAYER,
    ),
    solid: true,
    defaultMaxToi: 4,
    notes: "Manual shape cast near CCT. Always excludeRigidBody = player.",
  },
  aoe_damage: {
    role: "aoe_damage",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SENSORS,
    groups: packCollisionGroups(
      COLLISION_MEMBER.HITBOX,
      COLLISION_MEMBER.NPC | COLLISION_MEMBER.PLAYER | COLLISION_MEMBER.PROP,
    ),
    solid: true,
    defaultMaxToi: 8,
    notes: "intersectionsWithShape ball/cuboid for skill radius.",
  },
  loot_zone: {
    role: "loot_zone",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SOLIDS, // sensors only
    groups: packCollisionGroups(
      COLLISION_MEMBER.PLAYER,
      COLLISION_MEMBER.SENSOR | COLLISION_MEMBER.HITBOX,
    ),
    solid: true,
    defaultMaxToi: 4,
    notes: "intersectionsWithPoint / shape for trigger sensors.",
  },
  editor_pick: {
    role: "editor_pick",
    flags: QUERY_FILTER_FLAGS.EXCLUDE_SENSORS,
    groups: null,
    solid: true,
    defaultMaxToi: 1000,
    notes: "Scene editor ray pick. No group filter.",
  },
  broad_cull: {
    role: "broad_cull",
    flags: 0,
    groups: null,
    solid: true,
    defaultMaxToi: 0,
    notes: "collidersWithAabb only — not exact; follow with intersectionsWithShape.",
  },
};

export const SCENE_QUERY_USE = {
  bullet: "aim_bullet",
  hitscan: "aim_bullet",
  ground: "ground_probe",
  feet: "ground_probe",
  los: "los_static",
  cct_probe: "player_cct_probe",
  aoe: "aoe_damage",
  harvest_radius: "aoe_damage",
  loot: "loot_zone",
  water_check: "loot_zone",
  editor: "editor_pick",
  aabb_cull: "broad_cull",
} as const satisfies Record<string, FleetSceneQueryRole>;

// ── Filter bundle passed to World.* APIs ──────────────────────────────────

/**
 * Optional args matching Rapier JS scene-query filter parameters
 * (after solid / maxToi / shape-specific args).
 */
export interface SceneQueryFilter {
  flags?: number;
  groups?: number | null;
  excludeCollider?: unknown;
  excludeRigidBody?: unknown;
  predicate?: (collider: unknown) => boolean;
}

/** Resolve a fleet role into a filter + solid + default maxToi. */
export function sceneQueryFromRole(
  role: FleetSceneQueryRole,
  overrides: Partial<SceneQueryFilter> & { solid?: boolean; maxToi?: number } = {},
): {
  solid: boolean;
  maxToi: number;
  filter: SceneQueryFilter;
  preset: SceneQueryFilterPreset;
} {
  const preset = SCENE_QUERY_PRESETS[role];
  return {
    solid: overrides.solid ?? preset.solid,
    maxToi: overrides.maxToi ?? preset.defaultMaxToi,
    filter: {
      flags: overrides.flags ?? preset.flags,
      groups: overrides.groups !== undefined ? overrides.groups : preset.groups,
      excludeCollider: overrides.excludeCollider,
      excludeRigidBody: overrides.excludeRigidBody,
      predicate: overrides.predicate,
    },
    preset,
  };
}

/**
 * Unpack filter into ordered Rapier optional args:
 * filterFlags, filterGroups, filterExcludeCollider, filterExcludeRigidBody, filterPredicate
 */
export function expandQueryFilter(filter: SceneQueryFilter = {}): [
  number | undefined,
  number | undefined,
  unknown | undefined,
  unknown | undefined,
  ((c: unknown) => boolean) | undefined,
] {
  const flags = filter.flags && filter.flags !== 0 ? filter.flags : undefined;
  const groups =
    filter.groups === null || filter.groups === undefined
      ? undefined
      : filter.groups;
  return [
    flags,
    groups,
    filter.excludeCollider,
    filter.excludeRigidBody,
    filter.predicate,
  ];
}

/** Hit point: origin + dir * toi (when dir is not necessarily unit, toi is still valid). */
export function rayPointAt(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  toi: number,
): { x: number; y: number; z: number } {
  return {
    x: origin.x + dir.x * toi,
    y: origin.y + dir.y * toi,
    z: origin.z + dir.z * toi,
  };
}

export const SCENE_QUERY_RULES = [
  "Scene queries use World colliders (geometry) — not the dynamics solver",
  "castRay: first hit; castRayAndGetNormal adds surface normal; intersectionsWithRay = all hits",
  "maxToi limits segment to [origin, origin + dir * maxToi] (dir need not be unit but scale matters)",
  "solid=true: interior filled (origin inside → toi 0); solid=false: hollow boundary",
  "castShape: sweep whole shape (CCT / dash / vehicle bumper) — more expensive than ray",
  "castShape toi=0 means already penetrating at start pose",
  "projectPoint: closest surface; isInside true if point in solid shape",
  "intersectionsWithPoint: all colliders containing point (zones / water)",
  "intersectionsWithShape: exact overlaps (AoE); collidersWithAabb: broad-phase only",
  "Always exclude self rigid-body on character/weapon queries (excludeRigidBody)",
  "QueryFilterFlags: EXCLUDE_DYNAMIC / SENSORS / FIXED or ONLY_* packs",
  "filter groups use same packed membership|filter as collider collision groups",
  "Callbacks return true to continue, false to stop early",
  "Prefer ray for bullets; shape cast only when volume matters",
  "SI meters; same create order + fixed step for determinism of sim, not of one-shot picks",
] as const;
