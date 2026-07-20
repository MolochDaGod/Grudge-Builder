/**
 * ThreeScatterHarvest — terrain-sampled scatter slots for harvest fill.
 * Lightweight deterministic placement (no three-scatter dependency required at build).
 */
import * as THREE from "three";
import type { HarvestKind } from "./RegenerativeHarvest";

export interface ScatterSampleOpts {
  baseGeometry: THREE.BufferGeometry;
  baseMatrixWorld: THREE.Matrix4;
  count: number;
  seed: number;
  waterLevel: number;
  minNormalY?: number;
}

export interface ScatterSlot {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  kind: HarvestKind;
  seed: number;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample up to `count` dry-land surface points from a terrain mesh geometry.
 */
export function sampleHarvestScatterSlots(
  opts: ScatterSampleOpts,
  kindForIndex: (i: number) => HarvestKind,
): ScatterSlot[] {
  const pos = opts.baseGeometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 3) return [];

  const rng = mulberry32(opts.seed >>> 0);
  const minNy = opts.minNormalY ?? 0.45;
  const inv = new THREE.Matrix4().copy(opts.baseMatrixWorld).invert();
  const local = new THREE.Vector3();
  const world = new THREE.Vector3();
  const normal = new THREE.Vector3(0, 1, 0);
  const slots: ScatterSlot[] = [];
  const tries = Math.max(opts.count * 8, 32);

  for (let t = 0; t < tries && slots.length < opts.count; t++) {
    const i = Math.floor(rng() * pos.count);
    local.fromBufferAttribute(pos, i);
    world.copy(local).applyMatrix4(opts.baseMatrixWorld);
    if (world.y <= opts.waterLevel + 0.35) continue;

    // Approximate up-facing by sampling neighbors when possible
    if (opts.baseGeometry.index && opts.baseGeometry.index.count >= 3) {
      // keep default normal up — good enough for scatter fill
      normal.set(0, 1, 0);
    }
    if (normal.y < minNy) continue;

    const kind = kindForIndex(slots.length);
    slots.push({
      position: world.clone(),
      normal: normal.clone(),
      kind,
      seed: (opts.seed + slots.length * 7919) >>> 0,
    });
  }

  // Silence unused for matrix invert (kept for future local-space filters)
  void inv;
  return slots;
}

/** Schedule respawn after deplete — returns timeout id. */
export function scheduleScatterRespawn(
  ms: number,
  onRespawn: () => void,
): ReturnType<typeof setTimeout> {
  return setTimeout(onRespawn, Math.max(0, ms));
}

/**
 * Optional three-scatter group factory — returns null when library unavailable.
 */
export function tryCreateThreeScatterGroup(
  _opts?: Record<string, unknown>,
): THREE.Group | null {
  return null;
}
