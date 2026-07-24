/**
 * Deck + stairs height / collider helpers for airship cinema.
 * Uses continuous height field (no Rapier required for select scene).
 * Stairs are a ramp volume; main deck is planar Y=0.
 *
 * Best practices: grudge-world-scale (SI), three-mesh-bvh-pathfinding height sample pattern.
 */
import * as THREE from "three";
import {
  CROW_Y,
  DECK_HALF_W,
  DECK_Y,
  STAIRS_BASE_Y,
  STAIRS_TOP_Y,
} from "./DeckLocations";

/** Stairs ramp AABB in XZ (m) — from midship starboard up to crow. */
export const STAIRS_XZ = {
  minX: 1.9,
  maxX: 4.2,
  minZ: -0.85,
  maxZ: 0.55,
};

/** Crow platform pad. */
export const CROW_XZ = {
  minX: 3.3,
  maxX: 4.5,
  minZ: -0.55,
  maxZ: 0.55,
};

export function inRect(
  x: number,
  z: number,
  r: { minX: number; maxX: number; minZ: number; maxZ: number },
): boolean {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

/**
 * Continuous ground Y for feet on deck / stairs / crow.
 * Outside walkable band clamps to deck edge (soft wall).
 */
export function sampleDeckHeight(x: number, z: number): number {
  if (inRect(x, z, CROW_XZ)) return CROW_Y;
  if (inRect(x, z, STAIRS_XZ)) {
    const t = THREE.MathUtils.clamp(
      (x - STAIRS_XZ.minX) / (STAIRS_XZ.maxX - STAIRS_XZ.minX),
      0,
      1,
    );
    // Ease slightly so mid stair reads as climb
    const e = t * t * (3 - 2 * t);
    return THREE.MathUtils.lerp(STAIRS_BASE_Y, STAIRS_TOP_Y, e);
  }
  return DECK_Y;
}

/** Clamp XZ to walkable deck strip (+ stairs / crow). */
export function clampToDeck(x: number, z: number): { x: number; z: number } {
  if (inRect(x, z, STAIRS_XZ) || inRect(x, z, CROW_XZ)) {
    return { x, z };
  }
  return {
    x: THREE.MathUtils.clamp(x, -DECK_HALF_W, DECK_HALF_W),
    z: THREE.MathUtils.clamp(z, -1.4, 1.1),
  };
}

/**
 * Build invisible collider meshes for debug / raycast (stairs ramp + deck plane).
 * Materials: shadow-only / invisible; still cast/receive if needed.
 */
export function buildDeckColliderGroup(): THREE.Group {
  const g = new THREE.Group();
  g.name = "DeckColliders";

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Main deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK_HALF_W * 2.1, 0.12, 3.2), mat);
  deck.position.set(0, DECK_Y - 0.06, -0.1);
  deck.receiveShadow = true;
  deck.userData.collider = "deck";
  g.add(deck);

  // Stairs as stepped boxes (better feet contact than single slant for capsules)
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const y0 = THREE.MathUtils.lerp(STAIRS_BASE_Y, STAIRS_TOP_Y, t0);
    const y1 = THREE.MathUtils.lerp(STAIRS_BASE_Y, STAIRS_TOP_Y, t1);
    const y = (y0 + y1) * 0.5;
    const x0 = THREE.MathUtils.lerp(STAIRS_XZ.minX, STAIRS_XZ.maxX, t0);
    const x1 = THREE.MathUtils.lerp(STAIRS_XZ.minX, STAIRS_XZ.maxX, t1);
    const midX = (x0 + x1) * 0.5;
    const depth = STAIRS_XZ.maxZ - STAIRS_XZ.minZ;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.25, x1 - x0), 0.1, depth),
      mat,
    );
    step.position.set(midX, y - 0.05, (STAIRS_XZ.minZ + STAIRS_XZ.maxZ) * 0.5);
    step.userData.collider = "stairs";
    step.userData.step = i;
    g.add(step);
  }

  // Crow pad
  const crow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.2), mat);
  crow.position.set(3.9, CROW_Y - 0.06, 0);
  crow.userData.collider = "crow";
  g.add(crow);

  // Helm pedestal
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 12), mat);
  helm.position.set(-3.6, DECK_Y + 0.15, 0.35);
  helm.userData.collider = "helm_pad";
  g.add(helm);

  return g;
}

/** Simple ship wheel prop at helm (visible). */
export function buildHelmWheel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "HelmWheel";
  const wood = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.85,
    metalness: 0.05,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24), wood);
  rim.rotation.x = Math.PI / 2;
  root.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), wood);
    const a = (i / 8) * Math.PI * 2;
    spoke.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0);
    spoke.rotation.z = a;
    root.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), wood);
  hub.rotation.x = Math.PI / 2;
  root.add(hub);
  root.position.set(-3.6, DECK_Y + 1.05, 0.55);
  root.rotation.x = -0.35;
  return root;
}
