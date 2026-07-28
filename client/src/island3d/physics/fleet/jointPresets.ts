/**
 * Rapier joints — fleet articulation map (impulse + multibody).
 *
 * Official:
 *   https://rapier.rs/docs/user_guides/javascript/joints
 *   https://rapier.rs/docs/user_guides/javascript/joint_constraints
 *
 * Joint = restricts relative DOF between two rigid-bodies.
 * Anchors are always in each body's **local** space.
 *
 * Also: rigid_bodies · colliders · common_mistakes · determinism
 */

// ── Joint kinds (3D) ──────────────────────────────────────────────────────

/**
 * Built-in `JointData` factories we use in production.
 * GenericJoint covers cartesian / planar / cylindrical / pin-slot / etc.
 */
export type FleetJointKind =
  | "fixed"
  | "spherical"
  | "revolute"
  | "prismatic"
  | "spring"
  | "rope"
  | "generic";

/** Relative DOF left free by the joint (3D). */
export interface JointDofInfo {
  kind: FleetJointKind;
  translationalDof: number;
  rotationalDof: number;
  /** One-line description */
  freeMotion: string;
  fleetExamples: string[];
}

/** DOF table from official joints guide (3D). */
export const JOINT_DOF: Record<FleetJointKind, JointDofInfo> = {
  fixed: {
    kind: "fixed",
    translationalDof: 0,
    rotationalDof: 0,
    freeMotion: "None — frames coincide",
    fleetExamples: ["Breakable weld (read joint force)", "temp glue before bake"],
  },
  spherical: {
    kind: "spherical",
    translationalDof: 0,
    rotationalDof: 3,
    freeMotion: "Ball-in-socket (3 rotations)",
    fleetExamples: ["Ragdoll shoulder/hip", "pendulum lamp", "hanging sign"],
  },
  revolute: {
    kind: "revolute",
    translationalDof: 0,
    rotationalDof: 1,
    freeMotion: "Hinge about one axis",
    fleetExamples: ["Door hinge", "wheel", "cannon elevation", "fan"],
  },
  prismatic: {
    kind: "prismatic",
    translationalDof: 1,
    rotationalDof: 0,
    freeMotion: "Slide along one axis (+ optional limits)",
    fleetExamples: ["Drawer", "piston", "elevator rail guide", "gate"],
  },
  spring: {
    kind: "spring",
    translationalDof: 1, // soft distance constraint
    rotationalDof: 3,
    freeMotion: "Springy distance (stiffness/damping)",
    fleetExamples: ["Soft hang", "bouncy link", "suspension stub"],
  },
  rope: {
    kind: "rope",
    translationalDof: 1, // max length only
    rotationalDof: 3,
    freeMotion: "Max distance (rope / chain link segment)",
    fleetExamples: ["Mooring line", "chain", "grappling tether"],
  },
  generic: {
    kind: "generic",
    translationalDof: -1, // custom via axes mask
    rotationalDof: -1,
    freeMotion: "Custom locked axes (JointAxesMask)",
    fleetExamples: ["Cylindrical", "planar", "universal via mask"],
  },
};

// ── Impulse vs multibody (joint_constraints guide) ────────────────────────

/**
 * Two modeling approaches from
 * https://rapier.rs/docs/user_guides/javascript/joint_constraints
 *
 * - **impulse** = constraints-based / full-coordinates (`ImpulseJointSet`)
 * - **multibody** = reduced-coordinates (`MultibodyJointSet`)
 *
 * Fleet games default to **impulse**. Use multibody for stable robotic trees.
 * Closed loops: multibody spanning-tree + impulse **loop-closing** joints.
 */
export type JointSolverApproach = "impulse" | "multibody";

/** Hybrid = multibody tree + impulse loop-closers (necklace pattern). */
export type JointAssemblyStrategy = JointSolverApproach | "hybrid";

export const JOINT_APPROACH = {
  impulse: {
    id: "impulse" as const,
    /** Official name in joint_constraints guide */
    officialName: "constraints-based (full-coordinates)",
    rapierSet: "ImpulseJointSet",
    rapierApi: "world.createImpulseJoint",
    removeApi: "world.removeImpulseJoint",
    /** How position is encoded */
    coordinates: "full (6 DOF per body, then constrain)",
    topology: "any graph (closed loops OK)" as const,
    jointsCanBeViolated: true,
    jointForcesReadable: true,
    addRemoveSpeed: "fast" as const,
    largeAssemblyStability: "needs more solver iterations",
    pros: [
      "Fast add/remove (doors, breakables, pickups)",
      "Any graph topology (closed loops OK)",
      "Joint forces readable (break when force > threshold)",
      "Standard video-game style (most engines)",
    ],
    cons: [
      "Joints can stretch if solver under-converges",
      "Large assemblies break without enough iterations",
      "Large timesteps may explode",
    ],
    fleetDefault: true,
    preferWhen: [
      "video game / small assemblies",
      "joints added/removed often",
      "need breakable welds / force readback",
      "graph topology (not a pure tree)",
    ],
  },
  multibody: {
    id: "multibody" as const,
    officialName: "reduced-coordinates",
    rapierSet: "MultibodyJointSet",
    rapierApi: "world.createMultibodyJoint",
    removeApi: "world.removeMultibodyJoint",
    coordinates: "reduced (only free DOF variables)",
    topology: "tree only (no closed loops alone)" as const,
    jointsCanBeViolated: false,
    jointForcesReadable: false,
    addRemoveSpeed: "slow" as const,
    largeAssemblyStability: "stable",
    pros: [
      "Joints never violated (DOF in equations of motion)",
      "Stable large articulations / robotics / IK-friendly",
      "Moderately large timesteps more forgiving",
    ],
    cons: [
      "Tree topology only — cannot represent closed loops alone",
      "Slow add/remove",
      "Forces never computed explicitly",
    ],
    fleetDefault: false,
    preferWhen: [
      "robotics / SCARA arms / control",
      "large stable tree assemblies",
      "need joints that never stretch",
    ],
  },
} as const;

/**
 * Fleet assembly patterns from joint_constraints (tree SCARA vs necklace graph).
 */
export type FleetAssemblyPattern =
  | "game_small" // door, wheel, crate weld — pure impulse
  | "ragdoll_tree" // limbs as tree; impulse fine (or multibody if huge)
  | "robot_arm_tree" // SCARA-like: multibody preferred
  | "necklace_loop" // closed loop: hybrid (tree multibody + loop-close impulse)
  | "mooring_graph"; // ropes to pier — impulse graph

export interface AssemblyPatternInfo {
  id: FleetAssemblyPattern;
  topology: "tree" | "graph" | "closed_loop";
  strategy: JointAssemblyStrategy;
  /** Official analogy from docs */
  analogy: string;
  fleetExamples: string[];
  notes: string;
}

export const ASSEMBLY_PATTERNS: Record<FleetAssemblyPattern, AssemblyPatternInfo> = {
  game_small: {
    id: "game_small",
    topology: "tree",
    strategy: "impulse",
    analogy: "Typical game joints — small, often added/removed",
    fleetExamples: ["Door hinge", "wheel axle", "breakable weld", "fan motor"],
    notes: "Default. Impulse is faster and supports force readback for breakables.",
  },
  ragdoll_tree: {
    id: "ragdoll_tree",
    topology: "tree",
    strategy: "impulse",
    analogy: "Tree of spherical joints (can use multibody if very long chains)",
    fleetExamples: ["Humanoid ragdoll", "hanging lantern chain of balls"],
    notes: "Tree fits multibody, but games usually use impulse for simplicity + break.",
  },
  robot_arm_tree: {
    id: "robot_arm_tree",
    topology: "tree",
    strategy: "multibody",
    analogy: "SCARA arm — revolute chain + optional prismatic (docs figure left)",
    fleetExamples: ["Dock crane", "forge articulated tool", "siege arm"],
    notes: "Reduced coordinates: accuracy for control/IK; tree only.",
  },
  necklace_loop: {
    id: "necklace_loop",
    topology: "closed_loop",
    strategy: "hybrid",
    analogy: "Five pearls, five ball joints — docs figure right / loop-closing",
    fleetExamples: ["Necklace", "closed chain fence ring", "circular link belt"],
    notes:
      "Multibody spanning-tree (n-1 joints) + impulse loop-closing joint on the last edge.",
  },
  mooring_graph: {
    id: "mooring_graph",
    topology: "graph",
    strategy: "impulse",
    analogy: "Multiple ropes/tethers form a graph, not a tree",
    fleetExamples: ["Ship mooring multi-line", "tent guy-lines", "net"],
    notes: "Graph topology → impulse only (or hybrid if you carve a spanning tree).",
  },
};

export interface SelectJointApproachInput {
  /** Connectivity of the assembly */
  topology: "tree" | "graph" | "closed_loop";
  /** Need reaction force for breakables / UI */
  needJointForces?: boolean;
  /** Doors, pickups, temporary welds */
  frequentAddRemove?: boolean;
  /** Long kinematic chains that must not stretch */
  largeStableAssembly?: boolean;
  /** Robotics / IK / control */
  robotics?: boolean;
}

/**
 * Pick impulse | multibody | hybrid from joint_constraints decision rules.
 * Games almost always land on impulse; robotics tree → multibody; loops → hybrid.
 */
export function selectJointApproach(
  input: SelectJointApproachInput,
): JointAssemblyStrategy {
  if (input.topology === "closed_loop") return "hybrid";
  if (input.topology === "graph") return "impulse";
  // tree:
  if (input.needJointForces || input.frequentAddRemove) return "impulse";
  if (input.robotics || input.largeStableAssembly) return "multibody";
  return "impulse"; // fleet game default
}

/**
 * Plan for connecting N bodies in a cycle (necklace).
 * Multibody tree edges: [0-1], [1-2], …, [(n-2)-(n-1)]
 * Loop-closing impulse edge: [(n-1)-0]
 *
 * Official: spanning-tree multibody + joint constraint to close the loop.
 */
export function planLoopClosingChain(bodyCount: number): {
  strategy: "hybrid";
  treeEdges: Array<{ i: number; j: number; approach: "multibody" }>;
  loopClosingEdge: { i: number; j: number; approach: "impulse" } | null;
  notes: string;
} {
  if (bodyCount < 2) {
    return {
      strategy: "hybrid",
      treeEdges: [],
      loopClosingEdge: null,
      notes: "Need at least 2 bodies",
    };
  }
  const treeEdges: Array<{ i: number; j: number; approach: "multibody" }> = [];
  for (let i = 0; i < bodyCount - 1; i++) {
    treeEdges.push({ i, j: i + 1, approach: "multibody" });
  }
  const loopClosingEdge =
    bodyCount >= 3
      ? ({ i: bodyCount - 1, j: 0, approach: "impulse" } as const)
      : null;
  return {
    strategy: "hybrid",
    treeEdges,
    loopClosingEdge,
    notes:
      bodyCount >= 3
        ? `${bodyCount - 1} multibody tree joints + 1 impulse loop-closer (${bodyCount - 1}→0)`
        : "2 bodies: single multibody edge is enough (no loop)",
  };
}

/** Decision checklist from joint_constraints (fleet). */
export const JOINT_CONSTRAINT_RULES = [
  "Two approaches: reduced-coordinates (multibody) vs constraints-based (impulse)",
  "Multibody: DOF reduced in equations — joints cannot be violated",
  "Impulse: full 6-DOF bodies + solver constraints — can stretch if under-converged",
  "Multibody topology = tree only; impulse = any graph",
  "Video games → impulse (small assemblies, frequent add/remove)",
  "Robotics / control / IK → multibody when topology is a tree",
  "Closed loops (necklace): multibody spanning-tree + impulse loop-closing joint",
  "Loop-closer attaches two multibody links that complete the cycle",
  "Joint forces only on impulse joints (breakable welds need impulse)",
  "Add/remove: impulse fast, multibody slow",
  "Large multibody assemblies stay stable; large impulse chains need more iterations",
  "Moderately large timesteps safer on multibody than impulse",
  "Fleet default createJoint = impulse; createMultibodyJoint / createJointChain for trees",
  "createLoopClosingJoint = impulse joint used only to close a multibody cycle",
] as const;

// ── Fleet roles ───────────────────────────────────────────────────────────

export type FleetJointRole =
  | "weld_fixed" // rigid attach (prefer multi-collider when permanent)
  | "ragdoll_ball" // spherical limbs
  | "hinge_door" // revolute door / hatch
  | "hinge_wheel" // revolute free-spin wheel
  | "hinge_motor" // revolute + motor (fans, winches)
  | "slide_drawer" // prismatic + limits
  | "slide_motor" // prismatic motor (pistons)
  | "hang_spring" // spring hang
  | "tether_rope"; // rope max length

export interface JointRolePreset {
  role: FleetJointRole;
  kind: FleetJointKind;
  /** Prefer impulse for games unless robotics arm needs multibody. */
  approach: JointSolverApproach;
  /**
   * Prefer multi-collider on one body instead of fixed joint when permanent
   * (official tip: multi-collider is cheaper & more stable).
   */
  preferMultiCollider: boolean;
  /** Default motor (if any) — PD controller along free DOF. */
  motor: JointMotorPreset | null;
  /** Prismatic / unit-joint limits [min, max] in meters or radians. */
  defaultLimits: [number, number] | null;
  notes: string;
}

/** PD motor along free joint DOF (spherical/revolute/prismatic). */
export interface JointMotorPreset {
  /** configureMotorVelocity target (m/s or rad/s) */
  targetVelocity: number;
  /** damping / factor for velocity motor */
  damping: number;
  /** optional position target (m or rad); null = velocity-only */
  targetPosition: number | null;
  /** stiffness for position / full motor */
  stiffness: number;
}

export const JOINT_PRESETS: Record<FleetJointRole, JointRolePreset> = {
  weld_fixed: {
    role: "weld_fixed",
    kind: "fixed",
    approach: "impulse",
    preferMultiCollider: true,
    motor: null,
    defaultLimits: null,
    notes:
      "Only when you need breakable weld / joint force. Permanent glue → multi-collider on one RB.",
  },
  ragdoll_ball: {
    role: "ragdoll_ball",
    kind: "spherical",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: null,
    notes: "Shoulders/hips/pendulums. Local anchors at joint sockets.",
  },
  hinge_door: {
    role: "hinge_door",
    kind: "revolute",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: [-Math.PI * 0.5, Math.PI * 0.5], // ~±90° if limits applied
    notes: "Axis usually world +Y. Anchor on hinge edge of door + frame.",
  },
  hinge_wheel: {
    role: "hinge_wheel",
    kind: "revolute",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: null,
    notes: "Free spin; axis along axle (often local +X). Low friction on wheel collider.",
  },
  hinge_motor: {
    role: "hinge_motor",
    kind: "revolute",
    approach: "impulse",
    preferMultiCollider: false,
    motor: {
      targetVelocity: 4, // rad/s
      damping: 0.5,
      targetPosition: null,
      stiffness: 0,
    },
    defaultLimits: null,
    notes: "Fans, winches, powered gates. configureMotorVelocity after create.",
  },
  slide_drawer: {
    role: "slide_drawer",
    kind: "prismatic",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: [0, 0.8], // meters open travel
    notes: "limitsEnabled + limits [min,max]; signed distance (a2-a1)·axis1.",
  },
  slide_motor: {
    role: "slide_motor",
    kind: "prismatic",
    approach: "impulse",
    preferMultiCollider: false,
    motor: {
      targetVelocity: 1,
      damping: 0.5,
      targetPosition: null,
      stiffness: 0,
    },
    defaultLimits: [0, 2],
    notes: "Pistons / elevators along a rail. Prefer kinematic platform if no need for joint forces.",
  },
  hang_spring: {
    role: "hang_spring",
    kind: "spring",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: null,
    notes: "JointData.spring(rest, stiffness, damping, a1, a2). Soft hangables.",
  },
  tether_rope: {
    role: "tether_rope",
    kind: "rope",
    approach: "impulse",
    preferMultiCollider: false,
    motor: null,
    defaultLimits: null,
    notes: "JointData.rope(maxLength, a1, a2). Mooring / chain segment.",
  },
};

/** Gameplay → role map */
export const JOINT_USE = {
  weld: "weld_fixed",
  breakable_glue: "weld_fixed",
  ragdoll_shoulder: "ragdoll_ball",
  ragdoll_hip: "ragdoll_ball",
  hanging_lamp: "ragdoll_ball",
  door: "hinge_door",
  hatch: "hinge_door",
  wheel: "hinge_wheel",
  fan: "hinge_motor",
  winch: "hinge_motor",
  drawer: "slide_drawer",
  piston: "slide_motor",
  soft_hang: "hang_spring",
  mooring: "tether_rope",
  chain: "tether_rope",
} as const satisfies Record<string, FleetJointRole>;

// ── Vector helpers (local anchors / axes) ─────────────────────────────────

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { w: number; x: number; y: number; z: number };

export const AXIS_X: Vec3 = { x: 1, y: 0, z: 0 };
export const AXIS_Y: Vec3 = { x: 0, y: 1, z: 0 };
export const AXIS_Z: Vec3 = { x: 0, y: 0, z: 1 };
export const IDENTITY_QUAT: Quat = { w: 1, x: 0, y: 0, z: 0 };
export const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

/** Minimal JointData-like shape for pure builders (no RAPIER import in tests). */
export interface JointDataFactory {
  fixed(a1: Vec3, f1: Quat, a2: Vec3, f2: Quat): unknown;
  spherical(a1: Vec3, a2: Vec3): unknown;
  revolute(a1: Vec3, a2: Vec3, axis: Vec3): unknown;
  prismatic(a1: Vec3, a2: Vec3, axis: Vec3): unknown;
  spring?(rest: number, stiffness: number, damping: number, a1: Vec3, a2: Vec3): unknown;
  rope?(length: number, a1: Vec3, a2: Vec3): unknown;
}

export interface BuildJointOpts {
  anchor1?: Vec3;
  anchor2?: Vec3;
  /** Revolute / prismatic axis (local). Default +Y for hinge, +X for slide. */
  axis?: Vec3;
  frame1?: Quat;
  frame2?: Quat;
  /** Prismatic limits [min, max] */
  limits?: [number, number] | null;
  /** Spring rest length */
  springRest?: number;
  springStiffness?: number;
  springDamping?: number;
  /** Rope max length */
  ropeLength?: number;
}

/**
 * Build JointData from a fleet role using the live RAPIER.JointData factory.
 * Sets limitsEnabled/limits for prismatic when limits provided or role default.
 */
export function buildJointData(
  JointData: JointDataFactory,
  role: FleetJointRole,
  opts: BuildJointOpts = {},
): { data: unknown; preset: JointRolePreset } {
  const preset = JOINT_PRESETS[role];
  const a1 = opts.anchor1 ?? ORIGIN;
  const a2 = opts.anchor2 ?? ORIGIN;
  const axis =
    opts.axis ??
    (preset.kind === "prismatic" ? AXIS_X : AXIS_Y);
  const f1 = opts.frame1 ?? IDENTITY_QUAT;
  const f2 = opts.frame2 ?? IDENTITY_QUAT;

  let data: unknown;
  switch (preset.kind) {
    case "fixed":
      data = JointData.fixed(a1, f1, a2, f2);
      break;
    case "spherical":
      data = JointData.spherical(a1, a2);
      break;
    case "revolute":
      data = JointData.revolute(a1, a2, axis);
      break;
    case "prismatic": {
      data = JointData.prismatic(a1, a2, axis);
      const limits = opts.limits !== undefined ? opts.limits : preset.defaultLimits;
      if (limits && data && typeof data === "object") {
        const d = data as { limitsEnabled?: boolean; limits?: number[] };
        d.limitsEnabled = true;
        d.limits = [limits[0], limits[1]];
      }
      break;
    }
    case "spring":
      if (!JointData.spring) {
        throw new Error("JointData.spring not available in this Rapier version");
      }
      data = JointData.spring(
        opts.springRest ?? 1,
        opts.springStiffness ?? 50,
        opts.springDamping ?? 2,
        a1,
        a2,
      );
      break;
    case "rope":
      if (!JointData.rope) {
        throw new Error("JointData.rope not available in this Rapier version");
      }
      data = JointData.rope(opts.ropeLength ?? 2, a1, a2);
      break;
    default:
      throw new Error(`buildJointData: kind ${preset.kind} needs custom JointData.generic`);
  }
  return { data, preset };
}

/**
 * Apply fleet motor preset to a UnitImpulseJoint (revolute/prismatic).
 * Call after createImpulseJoint.
 */
export function applyJointMotor(
  joint: {
    configureMotorVelocity(v: number, d: number): void;
    configureMotorPosition?(p: number, s: number, d: number): void;
    configureMotor?(p: number, v: number, s: number, d: number): void;
  },
  motor: JointMotorPreset,
): void {
  if (motor.targetPosition != null && joint.configureMotor) {
    joint.configureMotor(
      motor.targetPosition,
      motor.targetVelocity,
      motor.stiffness,
      motor.damping,
    );
  } else if (motor.targetPosition != null && joint.configureMotorPosition) {
    joint.configureMotorPosition(motor.targetPosition, motor.stiffness, motor.damping);
  } else {
    joint.configureMotorVelocity(motor.targetVelocity, motor.damping);
  }
}

export const JOINT_RULES = [
  "Joint reduces relative DOF between two rigid-bodies",
  "Anchors + axes are in each body's local space",
  "Fleet default: createImpulseJoint (games: add/remove, forces, any graph)",
  "Multibody joints: tree only, more stable, robotics / large arms",
  "Closed loops need impulse joints (or multibody spanning-tree + loop-closing impulse)",
  "Permanent rigid attach: multi-collider on one RB — not a fixed joint",
  "Fixed joint only when you need breakable weld or joint reaction force",
  "Spherical = ball socket (ragdoll); revolute = hinge; prismatic = slide",
  "Prismatic limits: signed distance (anchor2-anchor1)·axis1",
  "Motors (spherical/revolute/prismatic): PD — velocity and/or position + stiffness/damping",
  "configureMotorVelocity / Position / full configureMotor after joint create",
  "Both bodies should usually be dynamic (or one fixed as world anchor)",
  "Kinematic parent + dynamic child works for hinges on elevators",
  "SI meters / radians; fixed 1/60 step; create order for determinism",
  "Do not use joints to glue every prop — prefer compounds / multi-collider",
  // joint_constraints (see JOINT_CONSTRAINT_RULES for full set)
  "selectJointApproach: closed_loop→hybrid, graph→impulse, robotics tree→multibody",
  "planLoopClosingChain(n): n-1 multibody edges + 1 impulse closer",
] as const;
