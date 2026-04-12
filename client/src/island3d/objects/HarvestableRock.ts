/**
 * HarvestableRock — 3D rock node with chip-away harvesting.
 *
 * Scales down on each hit to simulate chipping. Procedural dodecahedron geometry.
 */
import * as THREE from 'three';

export interface HarvestableRock {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  chipping: boolean;
  chipTime: number;
}

const ROCK_GEO = new THREE.DodecahedronGeometry(2, 0);
const ROCK_MATS = [
  new THREE.MeshLambertMaterial({ color: 0x808080 }),
  new THREE.MeshLambertMaterial({ color: 0x707060 }),
  new THREE.MeshLambertMaterial({ color: 0x606055 }),
];

export function createHarvestableRock(
  position: THREE.Vector3,
  scale: number = 1,
): HarvestableRock {
  const group = new THREE.Group();

  const mat = ROCK_MATS[Math.floor(Math.random() * ROCK_MATS.length)];
  const rock = new THREE.Mesh(ROCK_GEO, mat);
  rock.position.y = 1.2;
  rock.castShadow = true;
  rock.receiveShadow = true;
  // Slightly randomize shape
  rock.scale.set(
    0.8 + Math.random() * 0.4,
    0.6 + Math.random() * 0.4,
    0.8 + Math.random() * 0.4,
  );
  rock.rotation.set(
    Math.random() * 0.3,
    Math.random() * Math.PI * 2,
    Math.random() * 0.3,
  );
  group.add(rock);

  // Optional: small accent rocks nearby
  if (Math.random() > 0.5) {
    const smallRock = new THREE.Mesh(ROCK_GEO, mat);
    smallRock.position.set(2 + Math.random(), 0.5, 1 + Math.random());
    smallRock.scale.setScalar(0.3 + Math.random() * 0.2);
    smallRock.castShadow = true;
    group.add(smallRock);
  }

  group.position.copy(position);
  group.scale.setScalar(scale);

  return {
    group,
    health: 4,
    maxHealth: 4,
    baseScale: scale,
    chipping: false,
    chipTime: 0,
  };
}
