/**
 * Scene (7) / project (6) deck contract.
 * Walkable hull = Object_163_1. Wheels = Object_16 + Object_111.
 * Four invisible capsules under `characters` are account-hero slots.
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export const DECK_HULL_NAMES = ['Object_163_1', 'object_163_1'] as const;
export const WHEEL_NAMES = ['Object_16', 'Object_111', 'object_16', 'object_111'] as const;
/** Wrong copy — palm fragment, not the ship. Hide so pathfinding never uses it. */
export const DECK_HULL_ALIASES_PURGE = ['Object_163'];

export type DeckBand = 'top' | 'mid' | 'low';

export interface Deck163Bind {
  hull: THREE.Mesh;
  wheels: THREE.Object3D[];
  capsules: THREE.Object3D[];
  slots: THREE.Vector3[];
  bands: Record<DeckBand, THREE.Vector3[]>;
  bandY: Record<DeckBand, { min: number; max: number }>;
  johnHome: THREE.Vector3;
  scourgeHome: THREE.Vector3;
  racalvinHome: THREE.Vector3;
}

export interface Deck163SlotPin {
  x: number;
  y: number;
  z: number;
}

function findNamed(root: THREE.Object3D, names: readonly string[]): THREE.Object3D[] {
  const want = new Set(names.map((n) => n.toLowerCase()));
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name && want.has(o.name.toLowerCase())) out.push(o);
  });
  return out;
}

function collectCapsules(root: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    const n = (o.name || '').toLowerCase();
    if (n === 'capsule' || n.startsWith('capsule')) out.push(o);
  });
  return out;
}

/** Hide author capsules; keep world positions as spawn slots. */
export function hideAuthorCapsules(capsules: THREE.Object3D[]): void {
  for (const c of capsules) {
    c.visible = false;
    c.traverse((o) => {
      o.visible = false;
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
  }
}

export function purgeWrongHullCopies(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if (DECK_HULL_ALIASES_PURGE.includes(o.name)) {
      o.visible = false;
      n += 1;
    }
  });
  return n;
}

function sampleHullPoints(hull: THREE.Mesh, count = 48): THREE.Vector3[] {
  hull.updateMatrixWorld(true);
  const geo = hull.geometry as THREE.BufferGeometry;
  const pos = geo.getAttribute('position');
  if (!pos) return [];
  const pts: THREE.Vector3[] = [];
  const step = Math.max(1, Math.floor(pos.count / count));
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    v.applyMatrix4(hull.matrixWorld);
    pts.push(v);
  }
  return pts;
}

function bandPoints(pts: THREE.Vector3[]): Record<DeckBand, THREE.Vector3[]> {
  if (!pts.length) {
    return { top: [], mid: [], low: [] };
  }
  const ys = pts.map((p) => p.y).sort((a, b) => a - b);
  const q33 = ys[Math.floor(ys.length * 0.33)]!;
  const q66 = ys[Math.floor(ys.length * 0.66)]!;
  const top: THREE.Vector3[] = [];
  const mid: THREE.Vector3[] = [];
  const low: THREE.Vector3[] = [];
  for (const p of pts) {
    if (p.y >= q66) top.push(p);
    else if (p.y >= q33) mid.push(p);
    else low.push(p);
  }
  return { top, mid, low };
}

function pick(pts: THREE.Vector3[], fallback: THREE.Vector3): THREE.Vector3 {
  if (!pts.length) return fallback.clone();
  return pts[Math.floor(pts.length / 2)]!.clone();
}

/**
 * Bind scene (7) names after the GLB is in the scene (post-load, no 72 m squash).
 * `bakedSlots` come from project (6) — Capsules are editor-only, not in the GLB.
 */
export function bindDeck163(
  root: THREE.Object3D,
  bakedSlots?: Deck163SlotPin[] | null,
): Deck163Bind | null {
  const hulls = findNamed(root, DECK_HULL_NAMES).filter((o) => (o as THREE.Mesh).isMesh);
  const hull = hulls[0] as THREE.Mesh | undefined;
  if (!hull) return null;

  purgeWrongHullCopies(root);
  const wheels = findNamed(root, WHEEL_NAMES);
  const capsules = collectCapsules(root);
  hideAuthorCapsules(capsules);

  const chars = findNamed(root, ['characters']);
  if (chars[0]) chars[0].visible = false;

  hull.updateMatrixWorld(true);
  try {
    const geo = hull.geometry as THREE.BufferGeometry;
    if (geo && !(geo as unknown as { boundsTree?: MeshBVH }).boundsTree) {
      (geo as unknown as { boundsTree?: MeshBVH }).boundsTree = new MeshBVH(geo);
    }
  } catch {
    /* hull still walkable via raw raycast */
  }
  const box = new THREE.Box3().setFromObject(hull);
  const center = box.getCenter(new THREE.Vector3());
  const samples = sampleHullPoints(hull, 64);
  const bands = bandPoints(samples);

  const slots: THREE.Vector3[] = [];
  if (bakedSlots?.length) {
    for (const s of bakedSlots) slots.push(new THREE.Vector3(s.x, s.y, s.z));
  }
  if (!slots.length) {
    for (const c of capsules) {
      const p = new THREE.Vector3();
      c.getWorldPosition(p);
      slots.push(p);
    }
  }
  if (slots.length < 4 && chars[0]) {
    const p = new THREE.Vector3();
    chars[0].getWorldPosition(p);
    slots.push(p);
  }
  while (slots.length < 4) {
    const pool = bands.top.length ? bands.top : samples;
    slots.push(pool[slots.length % Math.max(1, pool.length)]?.clone() ?? center.clone());
  }

  const ys = samples.map((p) => p.y).sort((a, b) => a - b);
  const q33 = ys[Math.floor(ys.length * 0.33)] ?? center.y;
  const q66 = ys[Math.floor(ys.length * 0.66)] ?? center.y;
  const yMin = ys[0] ?? box.min.y;
  const yMax = ys[ys.length - 1] ?? box.max.y;
  const bandY: Record<DeckBand, { min: number; max: number }> = {
    low: { min: yMin - 0.15, max: q33 },
    mid: { min: q33, max: q66 },
    top: { min: q66, max: yMax + 0.6 },
  };

  const wheelPos = wheels[0]
    ? wheels[0].getWorldPosition(new THREE.Vector3())
    : pick(bands.top, center);

  return {
    hull,
    wheels,
    capsules,
    slots: slots.slice(0, 4),
    bands,
    bandY,
    johnHome: wheelPos.clone(),
    scourgeHome: pick(bands.mid.length ? bands.mid : bands.top, center),
    racalvinHome: pick(bands.low.length ? bands.low : bands.mid, center),
  };
}

/** Raycast down onto Object_163_1 — feet Y. */
export function sampleHullHeight(
  hull: THREE.Mesh,
  x: number,
  z: number,
  fallbackY: number,
): number {
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  ray.set(new THREE.Vector3(x, fallbackY + 8, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObject(hull, false);
  if (hits[0]) return hits[0].point.y;
  ray.set(new THREE.Vector3(x, fallbackY + 20, z), new THREE.Vector3(0, -1, 0));
  const hits2 = ray.intersectObject(hull, false);
  return hits2[0]?.point.y ?? fallbackY;
}

export function wanderPointsForBand(bind: Deck163Bind, band: DeckBand, n = 4): THREE.Vector3[] {
  const pts = bind.bands[band];
  if (pts.length >= n) {
    const step = Math.floor(pts.length / n);
    return Array.from({ length: n }, (_, i) => pts[i * step]!.clone());
  }
  const box = new THREE.Box3().setFromObject(bind.hull);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const y =
    band === 'top' ? box.max.y : band === 'low' ? box.min.y + size.y * 0.25 : c.y;
  return [
    new THREE.Vector3(c.x - size.x * 0.2, y, c.z - size.z * 0.25),
    new THREE.Vector3(c.x + size.x * 0.2, y, c.z - size.z * 0.1),
    new THREE.Vector3(c.x, y, c.z + size.z * 0.2),
    new THREE.Vector3(c.x - size.x * 0.1, y, c.z + size.z * 0.05),
  ];
}
