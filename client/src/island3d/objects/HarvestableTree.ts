/**
 * HarvestableTree — procedural 3D tree with harvest interactions.
 *
 * Creates a trunk (cylinder) + canopy (icosahedron/cone) tree.
 * Shakes when hit, falls when health depletes.
 * Will be replaced with GLTF models when available.
 */
import * as THREE from 'three';

export interface HarvestableTree {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  shaking: boolean;
  shakeTime: number;
  fallen: boolean;
}

const TRUNK_GEO = new THREE.CylinderGeometry(0.4, 0.6, 6, 6);
const CANOPY_GEO = new THREE.IcosahedronGeometry(3, 1);
const TRUNK_MAT = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
const CANOPY_MATS = [
  new THREE.MeshLambertMaterial({ color: 0x2d7a2d }),
  new THREE.MeshLambertMaterial({ color: 0x1e6b1e }),
  new THREE.MeshLambertMaterial({ color: 0x3a8c3a }),
];

export function createHarvestableTree(
  position: THREE.Vector3,
  scale: number = 1,
): HarvestableTree {
  const group = new THREE.Group();

  // Trunk
  const trunk = new THREE.Mesh(TRUNK_GEO, TRUNK_MAT);
  trunk.position.y = 3;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Canopy — slightly randomized shape
  const canopyMat = CANOPY_MATS[Math.floor(Math.random() * CANOPY_MATS.length)];
  const canopy = new THREE.Mesh(CANOPY_GEO, canopyMat);
  canopy.position.y = 7.5;
  canopy.scale.set(1, 1.2, 1);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  group.position.copy(position);
  group.scale.setScalar(scale);

  // Random Y rotation for variety
  group.rotation.y = Math.random() * Math.PI * 2;

  return {
    group,
    health: 5,
    maxHealth: 5,
    shaking: false,
    shakeTime: 0,
    fallen: false,
  };
}
