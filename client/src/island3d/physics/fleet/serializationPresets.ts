/**
 * Rapier world serialization — takeSnapshot / restoreSnapshot fleet map.
 *
 * Official: https://rapier.rs/docs/user_guides/javascript/serialization
 *
 *   const bytes = world.takeSnapshot();           // Uint8Array
 *   const world2 = World.restoreSnapshot(bytes); // identical physics state
 *
 * Also: determinism (same Rapier version, create order, fixed step) ·
 * rigid_bodies · colliders · joints · advanced_collision
 */

// ── What is / isn't in a Rapier snapshot ──────────────────────────────────

/**
 * Included in `world.takeSnapshot()` (complete physics state).
 * Restored world is an identical copy of the snapshotted world.
 */
export const SNAPSHOT_INCLUDES = [
  "Gravity",
  "Integration parameters",
  "Island manager",
  "Broad-phase + narrow-phase",
  "All rigid-bodies (poses, velocities, type, damping, CCD, sleep, …)",
  "All colliders (shapes, materials, groups, sensors, events flags, …)",
  "Impulse joints + multibody joints",
  "Contact / island solver state needed to continue the sim",
] as const;

/**
 * NOT in the Rapier blob — fleet/app layer must store or rebuild separately.
 */
export const SNAPSHOT_EXCLUDES = [
  "Three.js meshes / scene graph",
  "WorldPhysics.authored id → handle maps",
  "Player CCT handles (KinematicCharacterController)",
  "Fleet joint id strings",
  "EventQueue + PhysicsHooks callbacks",
  "RapierHelper debug wires",
  "Game inventory / quest / network entity IDs",
  "UserData you attached only on the JS side",
] as const;

// ── Fleet use cases ───────────────────────────────────────────────────────

export type FleetSnapshotRole =
  | "checkpoint_save" // single-player / island save
  | "multiplayer_resync" // server authority blob to clients
  | "rollback_rewind" // short buffer for lag compensation / rewind
  | "editor_undo" // physics sandbox undo (optional)
  | "replay_seed"; // start of deterministic replay segment

export interface SnapshotRolePreset {
  role: FleetSnapshotRole;
  /** How often to capture (guidance). */
  cadence: string;
  /** Prefer full world blob vs game-only state. */
  preferFullWorld: boolean;
  /** Keep a ring buffer of N snapshots. */
  ringBufferSize: number | null;
  notes: string;
}

export const SNAPSHOT_PRESETS: Record<FleetSnapshotRole, SnapshotRolePreset> = {
  checkpoint_save: {
    role: "checkpoint_save",
    cadence: "On save / zone exit / explicit checkpoint",
    preferFullWorld: true,
    ringBufferSize: null,
    notes:
      "Store Uint8Array (or base64) + fleet meta (characters, bag). Same @dimforge/rapier version on load.",
  },
  multiplayer_resync: {
    role: "multiplayer_resync",
    cadence: "Rare full resync; prefer deltas for net",
    preferFullWorld: true,
    ringBufferSize: null,
    notes:
      "Heavy — use sparingly. Prefer entity state + re-spawn colliders for normal tick sync.",
  },
  rollback_rewind: {
    role: "rollback_rewind",
    cadence: "Every fixed step or every N steps (netcode)",
    preferFullWorld: true,
    ringBufferSize: 120, // ~2s at 60Hz
    notes: "Ring buffer of snapshots; restore then re-simulate. Memory heavy — cap N.",
  },
  editor_undo: {
    role: "editor_undo",
    cadence: "Before destructive editor physics ops",
    preferFullWorld: true,
    ringBufferSize: 16,
    notes: "Optional; often easier to rebuild from SceneDoc colliders[] than full blob.",
  },
  replay_seed: {
    role: "replay_seed",
    cadence: "Start of recording + inputs",
    preferFullWorld: true,
    ringBufferSize: null,
    notes: "Pair with determinism rules: fixed 1/60, no Math.sin seeds, same Rapier version.",
  },
};

export const SNAPSHOT_USE = {
  save: "checkpoint_save",
  load: "checkpoint_save",
  resync: "multiplayer_resync",
  rollback: "rollback_rewind",
  undo: "editor_undo",
  replay: "replay_seed",
} as const satisfies Record<string, FleetSnapshotRole>;

// ── Fleet envelope (Rapier blob + app meta) ───────────────────────────────

/** Versioned envelope for disk/network (JSON-friendly with base64 body). */
export const FLEET_SNAPSHOT_VERSION = 1 as const;

export interface FleetPhysicsSnapshotMeta {
  /** WorldPhysics nextDyn counter for stable id generation after restore. */
  nextDyn?: number;
  /** Gravity Y used when world was created (informational). */
  gravityY?: number;
  /** Fixed step (seconds) — should stay 1/60. */
  fixedDt?: number;
  /** Rapier package version string if known. */
  rapierVersion?: string;
  /** Free-form game tags (zone id, seed, …). */
  tags?: Record<string, string | number | boolean>;
}

/**
 * App-level snapshot: Rapier bytes + meta that Rapier does not store.
 * For pure Rapier only, use takeSnapshot() Uint8Array directly.
 */
export interface FleetPhysicsSnapshotV1 {
  v: typeof FLEET_SNAPSHOT_VERSION;
  /** Binary physics world from world.takeSnapshot(). */
  rapier: Uint8Array;
  meta?: FleetPhysicsSnapshotMeta;
}

/** JSON-safe form (rapier as base64). */
export interface FleetPhysicsSnapshotJsonV1 {
  v: typeof FLEET_SNAPSHOT_VERSION;
  rapierBase64: string;
  meta?: FleetPhysicsSnapshotMeta;
}

// ── Encode / decode helpers (no RAPIER import) ────────────────────────────

/** Uint8Array → base64 (browser + Node). */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** base64 → Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function packFleetSnapshot(
  rapierBytes: Uint8Array,
  meta?: FleetPhysicsSnapshotMeta,
): FleetPhysicsSnapshotV1 {
  return { v: FLEET_SNAPSHOT_VERSION, rapier: rapierBytes, meta };
}

export function fleetSnapshotToJson(
  snap: FleetPhysicsSnapshotV1,
): FleetPhysicsSnapshotJsonV1 {
  return {
    v: snap.v,
    rapierBase64: bytesToBase64(snap.rapier),
    meta: snap.meta,
  };
}

export function fleetSnapshotFromJson(
  json: FleetPhysicsSnapshotJsonV1,
): FleetPhysicsSnapshotV1 {
  if (json.v !== FLEET_SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported fleet physics snapshot version ${json.v} (expected ${FLEET_SNAPSHOT_VERSION})`,
    );
  }
  return {
    v: FLEET_SNAPSHOT_VERSION,
    rapier: base64ToBytes(json.rapierBase64),
    meta: json.meta,
  };
}

/**
 * Ring buffer for rollback — push each fixed step, restore by age.
 */
export class SnapshotRingBuffer {
  private buf: Uint8Array[] = [];
  private readonly max: number;

  constructor(maxSize: number) {
    this.max = Math.max(1, maxSize);
  }

  push(snapshot: Uint8Array): void {
    this.buf.push(snapshot);
    while (this.buf.length > this.max) this.buf.shift();
  }

  /** 0 = oldest, length-1 = newest. */
  get(index: number): Uint8Array | undefined {
    return this.buf[index];
  }

  /** Newest snapshot. */
  latest(): Uint8Array | undefined {
    return this.buf[this.buf.length - 1];
  }

  /** Snapshot from N steps ago (0 = latest). */
  ago(stepsBack: number): Uint8Array | undefined {
    const i = this.buf.length - 1 - stepsBack;
    return i >= 0 ? this.buf[i] : undefined;
  }

  get size(): number {
    return this.buf.length;
  }

  clear(): void {
    this.buf = [];
  }
}

export const SERIALIZATION_RULES = [
  "world.takeSnapshot() → Uint8Array of the complete physics world",
  "World.restoreSnapshot(bytes) → new World identical to snapshot time",
  "Same major Rapier version required for restore (package must match)",
  "Snapshot is NOT Three.js / game state — store fleet meta separately",
  "After restore, JS handle maps are invalid — rebuild WorldPhysics bookkeeping",
  "Free the old World after swapping to restored world (avoid WASM leaks)",
  "EventQueue / PhysicsHooks are not restored — re-attach listeners",
  "CCT player controllers are not in snapshot — re-create from feet poses",
  "Determinism: fixed 1/60, same create order, no Math.sin physics seeds",
  "Rollback: ring buffer of snapshots + re-sim; cap size (memory)",
  "Net: full blob for rare resync; prefer entity deltas for tick sync",
  "Editor: often cheaper to rebuild from SceneDoc than snapshot undo",
  "Base64 encode for JSON saves; keep binary for R2/disk when possible",
  "SI meters in snapshot; never pixel-scale worlds",
] as const;
