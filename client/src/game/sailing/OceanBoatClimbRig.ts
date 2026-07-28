/**
 * OceanBoatClimbRig — freeboard edges, gunwales, and swim-to-deck climb for
 * boats, rafts, and ships on the open ocean.
 *
 * Integrates with CharacterController3D.registerClimbMeshes and ShipInteractable.
 * SI meters. Climb surfaces are invisible thin walls / ledge lips.
 */

import * as THREE from 'three';
import type { ShipSize } from '@shared/definitions/shipCatalog';
import type { ShipDeckBounds } from '@/game/dock/ShipInteractable';

export interface ClimbEdgeSpec {
  /** Local position of edge center */
  local: THREE.Vector3;
  /** Half extents of climb box (thin wall or ledge) */
  half: THREE.Vector3;
  /** Surface outward normal in local XZ (for approach from water) */
  outward: THREE.Vector3;
  kind: 'gunwale' | 'hull_wall' | 'raft_lip' | 'stern_ladder' | 'bow_lip';
}

/** Freeboard (deckY above waterline) and climb geometry per craft size. */
export const CRAFT_CLIMB_PROFILE: Record<
  ShipSize | 'raft',
  {
    freeboard: number;
    gunwaleHeight: number;
    lipThickness: number;
    climbReach: number;
  }
> = {
  rowboat: { freeboard: 0.55, gunwaleHeight: 0.45, lipThickness: 0.22, climbReach: 1.4 },
  sloop: { freeboard: 0.9, gunwaleHeight: 0.7, lipThickness: 0.28, climbReach: 1.8 },
  galleon: { freeboard: 1.4, gunwaleHeight: 1.0, lipThickness: 0.35, climbReach: 2.2 },
  raft: { freeboard: 0.25, gunwaleHeight: 0.2, lipThickness: 0.18, climbReach: 1.2 },
};

/**
 * Build invisible climb meshes around a deck bounds so swimmers can grab
 * gunwales / lips and climb onto deck (Conan-style Space grab).
 */
export function buildOceanClimbMeshes(
  parent: THREE.Object3D,
  bounds: ShipDeckBounds,
  size: ShipSize | 'raft' = 'rowboat',
): THREE.Mesh[] {
  const profile = CRAFT_CLIMB_PROFILE[size] ?? CRAFT_CLIMB_PROFILE.rowboat;
  const mat = new THREE.MeshBasicMaterial({ visible: false });
  const meshes: THREE.Mesh[] = [];
  const deckY = bounds.deckY;
  const hw = bounds.halfWidth;
  const hl = bounds.halfLength;
  const gh = profile.gunwaleHeight;
  const thick = profile.lipThickness;

  const addWall = (
    name: string,
    pos: THREE.Vector3,
    sx: number,
    sy: number,
    sz: number,
    kind: ClimbEdgeSpec['kind'],
    outward: THREE.Vector3,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat.clone());
    mesh.name = name;
    mesh.position.copy(pos);
    mesh.userData.climbable = true;
    mesh.userData.oceanClimb = true;
    mesh.userData.climbKind = kind;
    mesh.userData.outward = outward.clone();
    mesh.userData.deckY = deckY;
    parent.add(mesh);
    meshes.push(mesh);
  };

  // Port / starboard gunwales (outer edges) — tall thin walls for climb ray
  const wallH = gh + 0.85;
  const wallY = deckY - gh * 0.35 + wallH * 0.5;
  addWall(
    'climb_gunwale_port',
    new THREE.Vector3(-hw - thick * 0.5, wallY, 0),
    thick,
    wallH,
    hl * 1.9,
    'gunwale',
    new THREE.Vector3(-1, 0, 0),
  );
  addWall(
    'climb_gunwale_stbd',
    new THREE.Vector3(hw + thick * 0.5, wallY, 0),
    thick,
    wallH,
    hl * 1.9,
    'gunwale',
    new THREE.Vector3(1, 0, 0),
  );

  // Bow / stern lips — raft & small craft primary board points
  const lipKind: ClimbEdgeSpec['kind'] = size === 'raft' ? 'raft_lip' : 'bow_lip';
  addWall(
    'climb_bow',
    new THREE.Vector3(0, wallY, hl + thick * 0.5),
    hw * 1.7,
    wallH * 0.85,
    thick,
    lipKind,
    new THREE.Vector3(0, 0, 1),
  );
  addWall(
    'climb_stern',
    new THREE.Vector3(0, wallY, -hl - thick * 0.5),
    hw * 1.7,
    wallH * 0.9,
    thick,
    size === 'galleon' ? 'stern_ladder' : lipKind,
    new THREE.Vector3(0, 0, -1),
  );

  // Deck ledge strips (horizontal) so climb-to-top snaps feet onto deck
  const ledgeY = deckY + 0.06;
  const ledgeGeo = new THREE.BoxGeometry(hw * 2.05, 0.12, thick * 1.2);
  for (const [name, z, outZ] of [
    ['ledge_bow', hl, 1],
    ['ledge_stern', -hl, -1],
  ] as const) {
    const ledge = new THREE.Mesh(ledgeGeo.clone(), mat.clone());
    ledge.name = name;
    ledge.position.set(0, ledgeY, z);
    ledge.userData.climbable = true;
    ledge.userData.oceanClimb = true;
    ledge.userData.climbKind = 'raft_lip';
    ledge.userData.outward = new THREE.Vector3(0, 0, outZ);
    ledge.userData.deckY = deckY;
    ledge.userData.climbTop = true;
    parent.add(ledge);
    meshes.push(ledge);
  }

  return meshes;
}

/**
 * After climb release near a gunwale, snap feet to deck if within reach.
 * Returns local deck feet position or null.
 */
export function trySnapOntoDeck(
  localPos: THREE.Vector3,
  bounds: ShipDeckBounds,
  size: ShipSize | 'raft' = 'rowboat',
): THREE.Vector3 | null {
  const profile = CRAFT_CLIMB_PROFILE[size] ?? CRAFT_CLIMB_PROFILE.rowboat;
  const { halfWidth: hw, halfLength: hl, deckY } = bounds;
  const reach = profile.climbReach;
  // Outside hull footprint but within climb reach → pull onto deck
  const outsideX = Math.abs(localPos.x) > hw - 0.1;
  const outsideZ = Math.abs(localPos.z) > hl - 0.1;
  const nearEdge =
    Math.abs(localPos.x) < hw + reach &&
    Math.abs(localPos.z) < hl + reach &&
    localPos.y < deckY + 2.5 &&
    localPos.y > deckY - 3.5;
  if (!nearEdge || (!outsideX && !outsideZ && localPos.y > deckY - 0.5)) {
    // Already over deck
    if (
      Math.abs(localPos.x) <= hw * 0.98 &&
      Math.abs(localPos.z) <= hl * 0.98 &&
      Math.abs(localPos.y - deckY) < 1.2
    ) {
      return new THREE.Vector3(
        THREE.MathUtils.clamp(localPos.x, -hw * 0.9, hw * 0.9),
        deckY + 0.05,
        THREE.MathUtils.clamp(localPos.z, -hl * 0.9, hl * 0.9),
      );
    }
    return null;
  }
  return new THREE.Vector3(
    THREE.MathUtils.clamp(localPos.x, -hw * 0.85, hw * 0.85),
    deckY + 0.05,
    THREE.MathUtils.clamp(localPos.z, -hl * 0.85, hl * 0.85),
  );
}

export const OCEAN_CLIMB_RULES = [
  'Gunwale climb walls must set userData.climbable = true for CharacterController3D',
  'Freeboard profiles per craft size — rafts lower, galleons higher',
  'Swim + Space grab near climb mesh → attach climb → Space at top → snap deck',
  'Register climb meshes with character.registerClimbMeshes after buildShipInteractable',
  'Ledge strips with climbTop help climb-to-top foot snap',
  'SI meters; deckY from mesh probe when available',
] as const;
