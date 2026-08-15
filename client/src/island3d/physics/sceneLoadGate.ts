/**
 * Scene load-gate — Warlords Island3D rest / physics-before-entry contract.
 *
 * One pattern for zone, lobby, and procedural: the player does not enter
 * until terrain walkable + Rapier (or BVH) ground sample is valid.
 *
 * Extends PhysicsWorld + LobbyColliderSystem. Not a second engine.
 * Skill: grudge-rapier · docs/RAPIER_FLEET.md
 */

export const SCENE_LOAD_STAGES = [
  'rest',
  'assets',
  'terrain',
  'physics',
  'player',
  'ready',
] as const;

export type SceneLoadStage = (typeof SCENE_LOAD_STAGES)[number];

export const SCENE_LOAD_LABELS: Record<SceneLoadStage, string> = {
  rest: 'Resting the browser…',
  assets: 'Loading world assets…',
  terrain: 'Building terrain…',
  physics: 'Arming physics layer…',
  player: 'Planting captain…',
  ready: 'Entering world',
};

export interface SceneLoadReport {
  stage: SceneLoadStage;
  progress: number;
  label: string;
  physicsReady: boolean;
  groundY: number | null;
}

export interface PhysicsReadyInput {
  /** Rapier WASM world constructed */
  rapierWorld: boolean;
  /** BVH or height sampler exists */
  walkableReady: boolean;
  /** Finite ground Y at spawn (not water fallback) */
  groundY: number | null;
  /** Walkable mesh / collider count */
  walkableCount: number;
  waterLevel?: number;
}

/** Minimum walkable meshes / colliders before entry. */
export const MIN_WALKABLE_FOR_ENTRY = 1;

/**
 * Player may enter only when we have a real ground sample above water
 * and at least one walkable layer (BVH and/or Rapier).
 */
export function isPhysicsReadyForEntry(input: PhysicsReadyInput): boolean {
  if (input.walkableCount < MIN_WALKABLE_FOR_ENTRY && !input.walkableReady) {
    return false;
  }
  if (!input.walkableReady && !input.rapierWorld) return false;
  const y = input.groundY;
  if (y === null || !Number.isFinite(y)) return false;
  if (input.waterLevel !== undefined && y <= input.waterLevel + 0.4) return false;
  return true;
}

export function sceneLoadLabel(stage: SceneLoadStage, extra?: string): string {
  const base = SCENE_LOAD_LABELS[stage];
  return extra ? `${base} ${extra}` : base;
}

export function makeSceneLoadReport(
  stage: SceneLoadStage,
  progress: number,
  extra?: Partial<SceneLoadReport>,
): SceneLoadReport {
  return {
    stage,
    progress: Math.max(0, Math.min(100, progress)),
    label: extra?.label ?? sceneLoadLabel(stage),
    physicsReady: extra?.physicsReady ?? stage === 'ready',
    groundY: extra?.groundY ?? null,
  };
}

/**
 * Yield so the browser can paint the loadscreen, decode WASM, and GC.
 * Call between heavy Island3D stages (terrain bake, BVH merge, Rapier trimesh).
 */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export interface GroundSampleRetry {
  sample: (x: number, z: number) => number | null | undefined;
  x: number;
  z: number;
  waterLevel?: number;
  attempts?: number;
  /** Offset ring (m) around spawn if the first hit misses */
  offsetsM?: number[];
}

/**
 * Sample spawn ground with nearby offsets. Rejects water-level fakes.
 * Yields between attempts so a hitching raycast does not freeze the tab.
 */
export async function waitForGroundSample(
  opts: GroundSampleRetry,
): Promise<number | null> {
  const attempts = opts.attempts ?? 6;
  const offsets = opts.offsetsM ?? [0, 4, 8, 16, 32];
  const water = opts.waterLevel;

  for (let i = 0; i < attempts; i++) {
    const ring = offsets[Math.min(i, offsets.length - 1)];
    const candidates: Array<[number, number]> =
      ring === 0
        ? [[opts.x, opts.z]]
        : [
            [opts.x + ring, opts.z],
            [opts.x - ring, opts.z],
            [opts.x, opts.z + ring],
            [opts.x, opts.z - ring],
          ];
    for (const [x, z] of candidates) {
      const y = opts.sample(x, z);
      if (y === null || y === undefined || !Number.isFinite(y)) continue;
      if (water !== undefined && y <= water + 0.4) continue;
      return y;
    }
    await yieldToBrowser();
  }
  return null;
}

/** Spawn-pad half-extents (m) — emergency Rapier floor under the captain. */
export const SPAWN_PAD_HALF = { x: 48, y: 0.4, z: 48 } as const;

/** Skip Rapier trimesh above this triangle count (BVH + pad still apply). */
export const RAPIER_TRIMESH_TRI_BUDGET = 80_000;

/** Prefer nearby island meshes for the first physics layer (browser rest). */
export const PHYSICS_NEAR_SPAWN_M = 480;
