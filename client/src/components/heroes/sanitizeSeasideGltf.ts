/**
 * Strip person / futuristic / global-water meshes from seaside GLBs.
 * Keep environment rock/palm/sand and extract "barca" (Italian boat) as takeable craft.
 */
import * as THREE from "three";

/** Nodes to remove entirely (name match, case-insensitive). */
const REMOVE_NAME =
  /\b(man\d*|hat|dude|acqua|water)(_|$|\s|\.)|(^|[_./\s])(water|acqua)(_|$)/i;

/** Keep stone water pillars (architecture, not ocean plane). */
const KEEP_NAME = /stonewaterpillar|waterpillar/i;

/** Futuristic metal planes / sci-fi props (not boat fittings). */
const REMOVE_FUTURISTIC =
  /^plane\.00[2-9]|darkmetal\.001|sci[-_]?fi|futur|drone|robot|neon|jet/i;

/** Boat hull in islands pack. */
const BOAT_NAME = /^barca/i;

export interface SanitizeResult {
  /** Detached takeable boats (world-space still needs reparent). */
  boats: THREE.Object3D[];
  removed: string[];
}

function shouldRemove(name: string): boolean {
  if (!name) return false;
  if (KEEP_NAME.test(name)) return false;
  if (BOAT_NAME.test(name)) return false;
  if (REMOVE_FUTURISTIC.test(name)) return true;
  if (REMOVE_NAME.test(name)) return true;
  // Bare "Water" node / material mesh
  if (/^water$/i.test(name.trim()) || /^water_/i.test(name)) return true;
  return false;
}

/**
 * Mutates `root`: hides/removes person, ocean water, futuristic props.
 * Extracts boat meshes under a new Group for takeable craft.
 */
export function sanitizeSeasideGltf(root: THREE.Object3D): SanitizeResult {
  const removed: string[] = [];
  const boatParts: THREE.Object3D[] = [];
  const toDetach: THREE.Object3D[] = [];

  root.traverse((o) => {
    const n = o.name || "";
    if (BOAT_NAME.test(n)) {
      boatParts.push(o);
      return;
    }
    if (shouldRemove(n)) {
      toDetach.push(o);
      removed.push(n || o.uuid);
    }
  });

  // Detach removals (deepest first so parents still valid)
  toDetach
    .sort((a, b) => depth(b) - depth(a))
    .forEach((o) => {
      o.parent?.remove(o);
      o.visible = false;
    });

  // Group boat parts into takeable hull(s)
  const boats: THREE.Object3D[] = [];
  if (boatParts.length) {
    // Prefer top-level "barca" group if present
    const roots = boatParts.filter(
      (p) => !boatParts.some((q) => q !== p && isAncestor(q, p)),
    );
    for (const r of roots) {
      const parent = r.parent;
      const g = new THREE.Group();
      g.name = "TakeableBarca";
      g.userData.takeableBoat = true;
      g.userData.craftTier = "dinghy";
      // Preserve world transform
      if (parent) {
        parent.updateMatrixWorld(true);
        r.updateMatrixWorld(true);
        const w = new THREE.Matrix4().copy(r.matrixWorld);
        parent.remove(r);
        parent.add(g);
        g.add(r);
        // Reset local on r, apply world on g
        r.position.set(0, 0, 0);
        r.rotation.set(0, 0, 0);
        r.scale.set(1, 1, 1);
        w.decompose(g.position, g.quaternion, g.scale);
      } else {
        g.add(r);
      }
      boats.push(g);
    }
  }

  return { boats, removed };
}

function depth(o: THREE.Object3D): number {
  let d = 0;
  let p: THREE.Object3D | null = o;
  while (p) {
    d++;
    p = p.parent;
  }
  return d;
}

function isAncestor(a: THREE.Object3D, b: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = b.parent;
  while (p) {
    if (p === a) return true;
    p = p.parent;
  }
  return false;
}
