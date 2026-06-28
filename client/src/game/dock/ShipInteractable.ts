/**
 * ShipInteractable — walkable deck + climbable hull sides for Grudge6 characters.
 */
import * as THREE from 'three';
import type { ShipSize } from '@shared/definitions/shipCatalog';
import { getShipCatalogEntry } from '@shared/definitions/shipCatalog';

export interface ShipDeckBounds {
  halfWidth: number;
  halfLength: number;
  deckY: number;
}

const DECK_BOUNDS: Record<ShipSize, ShipDeckBounds> = {
  rowboat: { halfWidth: 1.8, halfLength: 3.5, deckY: 1.2 },
  sloop:   { halfWidth: 2.8, halfLength: 5.5, deckY: 1.8 },
  galleon: { halfWidth: 4.0, halfLength: 8.0, deckY: 2.4 },
};

export function getDeckBounds(size: ShipSize): ShipDeckBounds {
  return DECK_BOUNDS[size];
}

export interface ShipInteractable {
  root: THREE.Group;
  deckCollider: THREE.Mesh;
  climbColliders: THREE.Mesh[];
  bounds: ShipDeckBounds;
  dispose: () => void;
}

/** Invisible deck + port/starboard climb walls (tagged for CharacterController3D). */
export function buildShipInteractable(
  shipRoot: THREE.Group,
  size: ShipSize = 'rowboat',
): ShipInteractable {
  const bounds = getDeckBounds(size);
  const interactRoot = new THREE.Group();
  interactRoot.name = 'ship_interactable';
  shipRoot.add(interactRoot);

  const deckGeo = new THREE.BoxGeometry(bounds.halfWidth * 2, 0.15, bounds.halfLength * 2);
  const deckMat = new THREE.MeshBasicMaterial({ visible: false });
  const deckCollider = new THREE.Mesh(deckGeo, deckMat);
  deckCollider.name = 'ship_deck';
  deckCollider.position.y = bounds.deckY;
  deckCollider.userData.climbable = false;
  deckCollider.userData.shipDeck = true;
  interactRoot.add(deckCollider);

  const climbMat = new THREE.MeshBasicMaterial({ visible: false });
  const climbColliders: THREE.Mesh[] = [];
  const wallH = bounds.deckY + 2;
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

  const stern = new THREE.Mesh(
    new THREE.BoxGeometry(bounds.halfWidth * 2, wallH * 0.7, wallThick),
    climbMat,
  );
  stern.position.set(0, wallH * 0.35, -bounds.halfLength - wallThick * 0.5);
  stern.name = 'ship_climb_stern';
  stern.userData.climbable = true;
  stern.userData.shipHull = true;
  interactRoot.add(stern);
  climbColliders.push(stern);

  return {
    root: interactRoot,
    deckCollider,
    climbColliders,
    bounds,
    dispose() {
      shipRoot.remove(interactRoot);
      deckGeo.dispose();
      deckMat.dispose();
      climbColliders.forEach((m) => {
        m.geometry.dispose();
        climbMat.dispose();
      });
    },
  };
}

export function worldDeckHeight(
  shipRoot: THREE.Object3D,
  bounds: ShipDeckBounds,
  worldX: number,
  worldZ: number,
): number | null {
  const local = new THREE.Vector3(worldX, 0, worldZ);
  shipRoot.worldToLocal(local);
  if (
    Math.abs(local.x) > bounds.halfWidth ||
    Math.abs(local.z) > bounds.halfLength
  ) {
    return null;
  }
  const deckWorld = new THREE.Vector3(0, bounds.deckY, 0);
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
  return new THREE.Vector3(0, bounds.deckY + 0.05, bounds.halfLength * 0.35);
}

export function catalogSizeFromGlb(path: string): ShipSize {
  if (path.includes('large') || path.includes('galleon')) return 'galleon';
  if (path.includes('medium') || path.includes('sloop')) return 'sloop';
  return 'rowboat';
}

export function boundsForActiveShip(glbPath: string): ShipDeckBounds {
  return getDeckBounds(catalogSizeFromGlb(glbPath));
}