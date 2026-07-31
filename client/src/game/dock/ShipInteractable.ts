/**
 * ShipInteractable — walkable deck colliders, climbable hull, landmarks
 * (steering wheel / stairs / cannons) derived from the actual boat GLB when
 * mesh names allow; falls back to catalog size bounds.
 */
import * as THREE from 'three';
import type { ShipSize } from '@shared/definitions/shipCatalog';
import { getShipCatalogEntry } from '@shared/definitions/shipCatalog';
import { buildOceanClimbMeshes } from '@/game/sailing/OceanBoatClimbRig';
import { applySailMaterialsToShip } from '@/game/sailing/SailMaterialSystem';

export interface ShipDeckBounds {
  halfWidth: number;
  halfLength: number;
  /** Main deck height in ship-local space (feet). */
  deckY: number;
  /** Upper deck / quarterdeck (helm) local Y when stairs exist. */
  upperDeckY?: number;
}

/** Catalog defaults — overridden by mesh probe when possible. */
const DECK_BOUNDS: Record<ShipSize, ShipDeckBounds> = {
  rowboat: { halfWidth: 1.8, halfLength: 3.5, deckY: 1.2 },
  sloop:   { halfWidth: 2.8, halfLength: 5.5, deckY: 1.8, upperDeckY: 3.2 },
  galleon: { halfWidth: 4.0, halfLength: 8.0, deckY: 2.4, upperDeckY: 4.2 },
};

export function getDeckBounds(size: ShipSize): ShipDeckBounds {
  return { ...DECK_BOUNDS[size] };
}

export interface ShipLandmark {
  name: string;
  /** Local position relative to ship root. */
  local: THREE.Vector3;
  mesh?: THREE.Object3D;
}

export interface ShipCannonAttach {
  id: string;
  local: THREE.Vector3;
  /** Side normal in local XZ (port = -1, starboard = +1). */
  side: number;
  mesh: THREE.Object3D;
  /** Last fire time (ms). */
  lastFireAt: number;
  cooldownMs: number;
}

export interface ShipInteractable {
  root: THREE.Group;
  deckCollider: THREE.Mesh;
  /** Additional deck plates (quarterdeck, etc.). */
  deckColliders: THREE.Mesh[];
  climbColliders: THREE.Mesh[];
  bounds: ShipDeckBounds;
  /** Steering wheel / helm local anchor (stairs-up when found). */
  helmLocal: THREE.Vector3;
  /** Stair entry points (bottom → top). */
  stairsLocal: THREE.Vector3[];
  cannons: ShipCannonAttach[];
  /** True when deck bounds came from GLB mesh probe. */
  probedFromMesh: boolean;
  dispose: () => void;
}

// ── Mesh name classifiers ────────────────────────────────────────────────────

const DECK_RE = /deck|floor|plank|platform|gangway|walkway|boardwalk|quarterdeck|forecastle/i;
const WHEEL_RE = /wheel|helm|steering|rudder.?wheel|ship.?wheel|pilot/i;
const STAIR_RE = /stair|ladder|step|companion|gangway|ramp/i;
const CANNON_RE = /cannon|gun.?port|carronade|mortar|deck.?gun|gunbarrel|gun_barrel/i;
const HULL_SKIP_RE = /sail|flag|rope|rigging|cloth|water|ocean|wake|foam/i;

function meshLocalCenter(mesh: THREE.Object3D, shipRoot: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  return shipRoot.worldToLocal(center);
}

function meshLocalBox(mesh: THREE.Object3D, shipRoot: THREE.Object3D): {
  center: THREE.Vector3;
  size: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
} {
  const box = new THREE.Box3().setFromObject(mesh);
  const minW = box.min.clone();
  const maxW = box.max.clone();
  const min = shipRoot.worldToLocal(minW);
  const max = shipRoot.worldToLocal(maxW);
  // After worldToLocal, min/max may swap axes if ship is rotated — normalize
  const lo = new THREE.Vector3(
    Math.min(min.x, max.x),
    Math.min(min.y, max.y),
    Math.min(min.z, max.z),
  );
  const hi = new THREE.Vector3(
    Math.max(min.x, max.x),
    Math.max(min.y, max.y),
    Math.max(min.z, max.z),
  );
  const center = lo.clone().add(hi).multiplyScalar(0.5);
  const size = hi.clone().sub(lo);
  return { center, size, min: lo, max: hi };
}

/**
 * Scan ship GLB for deck / wheel / stairs / cannons and compute real bounds.
 */
export function probeShipLayout(
  shipRoot: THREE.Object3D,
  size: ShipSize,
): {
  bounds: ShipDeckBounds;
  helmLocal: THREE.Vector3;
  stairsLocal: THREE.Vector3[];
  cannonMeshes: THREE.Object3D[];
  deckMeshes: THREE.Object3D[];
  probed: boolean;
} {
  const fallback = getDeckBounds(size);
  const deckMeshes: THREE.Object3D[] = [];
  const wheelMeshes: THREE.Object3D[] = [];
  const stairMeshes: THREE.Object3D[] = [];
  const cannonMeshes: THREE.Object3D[] = [];
  const solidMeshes: THREE.Mesh[] = [];

  shipRoot.updateWorldMatrix(true, true);

  shipRoot.traverse((obj) => {
    const name = obj.name || '';
    if (!name || HULL_SKIP_RE.test(name)) return;
    if (DECK_RE.test(name)) deckMeshes.push(obj);
    if (WHEEL_RE.test(name)) wheelMeshes.push(obj);
    if (STAIR_RE.test(name)) stairMeshes.push(obj);
    if (CANNON_RE.test(name)) cannonMeshes.push(obj);
    if ((obj as THREE.Mesh).isMesh && !HULL_SKIP_RE.test(name)) {
      solidMeshes.push(obj as THREE.Mesh);
    }
  });

  let bounds = { ...fallback };
  let probed = false;

  // Bounds from deck meshes or full hull footprint
  const footprintSources = deckMeshes.length ? deckMeshes : solidMeshes;
  if (footprintSources.length) {
    const union = new THREE.Box3();
    for (const m of footprintSources) {
      union.expandByObject(m);
    }
    if (!union.isEmpty()) {
      const min = shipRoot.worldToLocal(union.min.clone());
      const max = shipRoot.worldToLocal(union.max.clone());
      const loX = Math.min(min.x, max.x);
      const hiX = Math.max(min.x, max.x);
      const loY = Math.min(min.y, max.y);
      const hiY = Math.max(min.y, max.y);
      const loZ = Math.min(min.z, max.z);
      const hiZ = Math.max(min.z, max.z);
      const halfW = Math.max(0.8, (hiX - loX) * 0.5 * 0.92);
      const halfL = Math.max(1.5, (hiZ - loZ) * 0.5 * 0.92);
      // Main deck ≈ lower solid surface (not top of mast)
      let deckY = fallback.deckY;
      if (deckMeshes.length) {
        const ys = deckMeshes.map((m) => meshLocalCenter(m, shipRoot).y);
        ys.sort((a, b) => a - b);
        // Prefer mid-lower deck (not top of superstructure alone)
        deckY = ys[Math.floor(ys.length * 0.35)] ?? ys[0];
      } else {
        // Ray-like heuristic: 55% up from hull bottom for walkable deck
        deckY = loY + (hiY - loY) * 0.42;
      }
      let upperDeckY = fallback.upperDeckY;
      if (deckMeshes.length >= 2) {
        const ys = deckMeshes.map((m) => meshLocalCenter(m, shipRoot).y).sort((a, b) => a - b);
        upperDeckY = ys[ys.length - 1];
      }
      if (wheelMeshes.length) {
        const wy = meshLocalCenter(wheelMeshes[0], shipRoot).y;
        upperDeckY = Math.max(upperDeckY ?? deckY + 1.2, wy - 0.35);
      }
      bounds = {
        halfWidth: halfW,
        halfLength: halfL,
        deckY,
        upperDeckY,
      };
      probed = true;
    }
  }

  // Helm: prefer steering wheel mesh; else aft upper deck
  let helmLocal: THREE.Vector3;
  if (wheelMeshes.length) {
    helmLocal = meshLocalCenter(wheelMeshes[0], shipRoot);
    // Stand slightly forward of wheel facing aft/helm
    helmLocal.z += Math.sign(helmLocal.z || 1) * -0.4;
    helmLocal.y = bounds.upperDeckY ?? bounds.deckY;
  } else {
    // Aft quarterdeck (positive Z often bow — put helm at stern -Z, upper deck)
    helmLocal = new THREE.Vector3(
      0,
      bounds.upperDeckY ?? bounds.deckY + 1.2,
      -bounds.halfLength * 0.72,
    );
  }

  const stairsLocal = stairMeshes.map((m) => meshLocalCenter(m, shipRoot));
  if (!stairsLocal.length && bounds.upperDeckY != null) {
    // Synthetic stair path: mid-ship up to quarterdeck
    stairsLocal.push(
      new THREE.Vector3(0, bounds.deckY, -bounds.halfLength * 0.25),
      new THREE.Vector3(0, (bounds.deckY + bounds.upperDeckY) * 0.5, -bounds.halfLength * 0.45),
      new THREE.Vector3(0, bounds.upperDeckY, -bounds.halfLength * 0.65),
    );
  }

  return {
    bounds,
    helmLocal,
    stairsLocal,
    cannonMeshes,
    deckMeshes,
    probed,
  };
}

/** Sample walkable Y at ship-local XZ using deck collider raycast. */
export function sampleLocalDeckY(
  interact: ShipInteractable,
  localX: number,
  localZ: number,
): number {
  const { bounds, deckColliders, deckCollider } = interact;
  // Prefer upper deck when near helm / aft stairs
  const nearHelm =
    Math.abs(localX - interact.helmLocal.x) < bounds.halfWidth * 0.55 &&
    localZ < -bounds.halfLength * 0.4;
  if (nearHelm && bounds.upperDeckY != null) {
    return bounds.upperDeckY;
  }
  // Between main and upper along stairs corridor
  if (bounds.upperDeckY != null && interact.stairsLocal.length >= 2) {
    const s0 = interact.stairsLocal[0];
    const s1 = interact.stairsLocal[interact.stairsLocal.length - 1];
    const t =
      (localZ - s0.z) / Math.max(1e-3, s1.z - s0.z);
    if (t > 0 && t < 1 && Math.abs(localX) < bounds.halfWidth * 0.45) {
      return THREE.MathUtils.lerp(bounds.deckY, bounds.upperDeckY, THREE.MathUtils.clamp(t, 0, 1));
    }
  }

  // Raycast down through deck colliders in local space
  const plates = deckColliders.length ? deckColliders : [deckCollider];
  let bestY: number | null = null;
  const origin = new THREE.Vector3(localX, bounds.upperDeckY != null ? bounds.upperDeckY + 4 : bounds.deckY + 6, localZ);
  const dir = new THREE.Vector3(0, -1, 0);
  const ray = new THREE.Raycaster(origin, dir, 0, 20);
  // Raycaster needs world space — convert via parent
  const root = interact.root.parent ?? interact.root;
  root.updateWorldMatrix(true, true);
  const wOrigin = root.localToWorld(origin.clone());
  const wDir = dir.clone().transformDirection(root.matrixWorld).normalize();
  ray.set(wOrigin, wDir);
  const hits = ray.intersectObjects(plates, true);
  if (hits.length) {
    const localHit = root.worldToLocal(hits[0].point.clone());
    bestY = localHit.y;
  }
  return bestY ?? bounds.deckY;
}

/** Invisible deck + climb walls + cannon attach points. */
export function buildShipInteractable(
  shipRoot: THREE.Group,
  size: ShipSize = 'rowboat',
): ShipInteractable {
  // Production canvas sails (not plastic emissive)
  applySailMaterialsToShip(shipRoot);

  const layout = probeShipLayout(shipRoot, size);
  const bounds = layout.bounds;

  const interactRoot = new THREE.Group();
  interactRoot.name = 'ship_interactable';
  shipRoot.add(interactRoot);

  const deckMat = new THREE.MeshBasicMaterial({ visible: false });
  const climbMat = new THREE.MeshBasicMaterial({ visible: false });
  const deckColliders: THREE.Mesh[] = [];

  // Main deck plate — sized from real footprint
  const deckGeo = new THREE.BoxGeometry(bounds.halfWidth * 2, 0.2, bounds.halfLength * 2);
  const deckCollider = new THREE.Mesh(deckGeo, deckMat);
  deckCollider.name = 'ship_deck';
  deckCollider.position.set(0, bounds.deckY, 0);
  deckCollider.userData.climbable = false;
  deckCollider.userData.shipDeck = true;
  deckCollider.userData.deckLevel = 'main';
  interactRoot.add(deckCollider);
  deckColliders.push(deckCollider);

  // Upper deck / quarterdeck (helm platform)
  if (bounds.upperDeckY != null && bounds.upperDeckY > bounds.deckY + 0.4) {
    const upperLen = bounds.halfLength * 0.55;
    const upperGeo = new THREE.BoxGeometry(bounds.halfWidth * 1.6, 0.18, upperLen);
    const upper = new THREE.Mesh(upperGeo, deckMat.clone());
    upper.name = 'ship_deck_upper';
    // Aft upper deck (same side as helm)
    upper.position.set(0, bounds.upperDeckY, -bounds.halfLength + upperLen * 0.5);
    upper.userData.shipDeck = true;
    upper.userData.deckLevel = 'upper';
    interactRoot.add(upper);
    deckColliders.push(upper);

    // Stair ramp collider (sloped box approximation)
    const stairLen = bounds.halfLength * 0.35;
    const stairGeo = new THREE.BoxGeometry(bounds.halfWidth * 0.7, 0.15, stairLen);
    const stair = new THREE.Mesh(stairGeo, deckMat.clone());
    stair.name = 'ship_deck_stairs';
    const midY = (bounds.deckY + bounds.upperDeckY) * 0.5;
    stair.position.set(0, midY, -bounds.halfLength * 0.35);
    const pitch = Math.atan2(bounds.upperDeckY - bounds.deckY, stairLen);
    stair.rotation.x = -pitch;
    stair.userData.shipDeck = true;
    stair.userData.deckLevel = 'stairs';
    interactRoot.add(stair);
    deckColliders.push(stair);
  }

  // Per-deck-mesh thin colliders when GLB has named decks
  for (let i = 0; i < layout.deckMeshes.length && i < 6; i++) {
    const m = layout.deckMeshes[i];
    const { center, size: sz } = meshLocalBox(m, shipRoot);
    if (sz.x < 0.3 || sz.z < 0.3) continue;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.5, sz.x), 0.12, Math.max(0.5, sz.z)),
      deckMat.clone(),
    );
    plate.name = `ship_deck_mesh_${i}`;
    plate.position.copy(center);
    plate.position.y = center.y;
    plate.userData.shipDeck = true;
    plate.userData.deckLevel = 'mesh';
    interactRoot.add(plate);
    deckColliders.push(plate);
  }

  // Climb walls — ocean gunwales / bow / stern lips (swim → deck)
  // SSOT: OceanBoatClimbRig (freeboard per craft size)
  const climbColliders: THREE.Mesh[] = buildOceanClimbMeshes(
    interactRoot,
    bounds,
    size === 'rowboat' || size === 'sloop' || size === 'galleon' ? size : 'rowboat',
  );
  // Keep legacy thick hull walls as backup when climb rays miss thin lips
  const wallH = bounds.deckY + 2.2;
  const wallThick = 0.35;
  for (const side of [-1, 1] as const) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick, wallH, bounds.halfLength * 2 + 1),
      climbMat,
    );
    wall.position.set(side * (bounds.halfWidth + wallThick * 0.5), wallH * 0.45, 0);
    wall.name = side < 0 ? 'ship_climb_port' : 'ship_climb_starboard';
    wall.userData.climbable = true;
    wall.userData.shipHull = true;
    interactRoot.add(wall);
    climbColliders.push(wall);
  }

  // Cannons — attach from mesh or synthetic broadside
  const cannons: ShipCannonAttach[] = [];
  const entry = getShipCatalogEntry(size);
  const slots = Math.max(entry.cannonSlots, layout.cannonMeshes.length);

  if (layout.cannonMeshes.length) {
    layout.cannonMeshes.forEach((mesh, i) => {
      const local = meshLocalCenter(mesh, shipRoot);
      const side = local.x >= 0 ? 1 : -1;
      cannons.push({
        id: `cannon-mesh-${i}`,
        local,
        side,
        mesh,
        lastFireAt: 0,
        cooldownMs: 2200,
      });
      mesh.userData.shipCannon = true;
      mesh.userData.cannonId = `cannon-mesh-${i}`;
    });
  } else if (slots > 0) {
    // Procedural broadside mounts along main deck
    const perSide = Math.ceil(slots / 2);
    for (let i = 0; i < perSide; i++) {
      const t = perSide === 1 ? 0 : (i / (perSide - 1)) * 2 - 1;
      const z = t * bounds.halfLength * 0.55;
      for (const side of [-1, 1] as const) {
        if (cannons.length >= slots) break;
        const local = new THREE.Vector3(
          side * (bounds.halfWidth - 0.35),
          bounds.deckY + 0.55,
          z,
        );
        // Tiny visible barrel so players see attach points
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.1, 0.9, 8),
          new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.75, roughness: 0.35 }),
        );
        barrel.rotation.z = Math.PI / 2;
        barrel.position.copy(local);
        barrel.name = `ship_cannon_synth_${cannons.length}`;
        barrel.userData.shipCannon = true;
        interactRoot.add(barrel);
        cannons.push({
          id: barrel.name,
          local: local.clone(),
          side,
          mesh: barrel,
          lastFireAt: 0,
          cooldownMs: 2200,
        });
      }
    }
  }

  // Helm marker (invisible interact volume)
  const helmMarker = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.6, 1.2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  helmMarker.name = 'ship_helm';
  helmMarker.position.copy(layout.helmLocal);
  helmMarker.position.y += 0.8;
  helmMarker.userData.shipHelm = true;
  interactRoot.add(helmMarker);

  return {
    root: interactRoot,
    deckCollider,
    deckColliders,
    climbColliders,
    bounds,
    helmLocal: layout.helmLocal.clone(),
    stairsLocal: layout.stairsLocal.map((v) => v.clone()),
    cannons,
    probedFromMesh: layout.probed,
    dispose() {
      shipRoot.remove(interactRoot);
      interactRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
    },
  };
}

export function worldDeckHeight(
  shipRoot: THREE.Object3D,
  bounds: ShipDeckBounds,
  worldX: number,
  worldZ: number,
  interact?: ShipInteractable | null,
): number | null {
  const local = new THREE.Vector3(worldX, 0, worldZ);
  shipRoot.worldToLocal(local);
  if (
    Math.abs(local.x) > bounds.halfWidth ||
    Math.abs(local.z) > bounds.halfLength
  ) {
    return null;
  }
  let localY = bounds.deckY;
  if (interact) {
    localY = sampleLocalDeckY(interact, local.x, local.z);
  }
  const deckWorld = new THREE.Vector3(local.x, localY, local.z);
  shipRoot.localToWorld(deckWorld);
  return deckWorld.y;
}

export function isNearDeckEdge(
  shipRoot: THREE.Object3D,
  bounds: ShipDeckBounds,
  worldPos: THREE.Vector3,
  margin = 1.2,
): boolean {
  const local = worldPos.clone();
  shipRoot.worldToLocal(local);
  return (
    Math.abs(local.x) > bounds.halfWidth - margin ||
    Math.abs(local.z) > bounds.halfLength - margin
  );
}

export function defaultBoardLocalAnchor(bounds: ShipDeckBounds): THREE.Vector3 {
  // Board mid-deck, slightly aft of center (clear of bowsprit)
  return new THREE.Vector3(0, bounds.deckY + 0.05, bounds.halfLength * 0.15);
}

/** True when player local anchor is at helm (steering wheel / upper deck aft). */
export function isAtHelm(
  interact: ShipInteractable,
  localAnchor: THREE.Vector3,
  radius = 1.8,
): boolean {
  const d = localAnchor.distanceTo(interact.helmLocal);
  return d < radius;
}

/** Nearest cannon within interact radius (ship-local). */
export function nearestCannon(
  interact: ShipInteractable,
  localAnchor: THREE.Vector3,
  radius = 2.2,
): ShipCannonAttach | null {
  let best: ShipCannonAttach | null = null;
  let bestD = radius;
  for (const c of interact.cannons) {
    const d = localAnchor.distanceTo(c.local);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function catalogSizeFromGlb(path: string): ShipSize {
  if (path.includes('large') || path.includes('galleon')) return 'galleon';
  if (path.includes('medium') || path.includes('sloop')) return 'sloop';
  return 'rowboat';
}

export function boundsForActiveShip(glbPath: string): ShipDeckBounds {
  return getDeckBounds(catalogSizeFromGlb(glbPath));
}

/**
 * Scale headwear / hat meshes so they clear deck beams (Calvin pirate hat).
 * Factor 1.2 = +20%. Safe to call multiple times (stores base scale).
 */
export function scaleCharacterHeadwear(root: THREE.Object3D, factor = 1.2): number {
  let count = 0;
  root.traverse((o) => {
    const name = o.name || '';
    const isHat =
      /hat|tricorn|pirate.?hat|headwear|Units_head|helmet|helm_/i.test(name) ||
      (o.userData?.equipSlot === 'head');
    if (!isHat) return;
    if (!(o as THREE.Mesh).isMesh && o.type !== 'Group' && o.type !== 'Object3D') {
      // still scale bones/groups named head/hat
    }
    if (o.userData.__hatBaseScale == null) {
      o.userData.__hatBaseScale = o.scale.clone();
    }
    const base = o.userData.__hatBaseScale as THREE.Vector3;
    o.scale.set(base.x * factor, base.y * factor, base.z * factor);
    count++;
  });
  // Also scale any visible mesh under head bone sockets
  root.traverse((o) => {
    if (!/Bip001_Head|Head_Container|head_container/i.test(o.name || '')) return;
    o.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      if (child.userData.__hatBaseScale != null) return;
      if (/eye|tooth|teeth|tongue|face|beard|hair/i.test(child.name || '')) return;
      child.userData.__hatBaseScale = child.scale.clone();
      const base = child.userData.__hatBaseScale as THREE.Vector3;
      // milder scale for head children unless already hat-named
      const f = /hat|helm|tricorn/i.test(child.name || '') ? factor : 1 + (factor - 1) * 0.5;
      child.scale.set(base.x * f, base.y * f, base.z * f);
      count++;
    });
  });
  return count;
}

export function resetCharacterHeadwearScale(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o.userData.__hatBaseScale) {
      const base = o.userData.__hatBaseScale as THREE.Vector3;
      o.scale.copy(base);
      delete o.userData.__hatBaseScale;
    }
  });
}
