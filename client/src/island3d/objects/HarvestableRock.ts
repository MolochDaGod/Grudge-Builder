/**
 * HarvestableRock — CDN rock pack with procedural fallback.
 */
import * as THREE from 'three';
import { cloneIslandResource, fitModelToHeight } from './IslandResourceLoader';

export interface HarvestableRock {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  chipping: boolean;
  chipTime: number;
  respawnAt: number;
  nodeId?: string;
  oreVariant?: boolean;
}

const ROCK_GEO = new THREE.DodecahedronGeometry(2, 0);
const ROCK_MATS = [
  new THREE.MeshLambertMaterial({ color: 0x808080 }),
  new THREE.MeshLambertMaterial({ color: 0x707060 }),
  new THREE.MeshLambertMaterial({ color: 0x606055 }),
];

function addProceduralRockMesh(group: THREE.Group): void {
  const mat = ROCK_MATS[Math.floor(Math.random() * ROCK_MATS.length)];
  const rock = new THREE.Mesh(ROCK_GEO, mat);
  rock.position.y = 1.2;
  rock.castShadow = true;
  rock.receiveShadow = true;
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
}

export function createHarvestableRock(
  position: THREE.Vector3,
  scale: number = 1,
): HarvestableRock {
  const group = new THREE.Group();
  addProceduralRockMesh(group);

  group.position.copy(position);
  group.scale.setScalar(scale);

  const rock: HarvestableRock = {
    group,
    health: 4,
    maxHealth: 4,
    baseScale: scale,
    chipping: false,
    chipTime: 0,
    respawnAt: 0,
    oreVariant: false,
  };

  void mountHarvestableRockModel(rock, scale);
  return rock;
}

export async function mountHarvestableRockModel(
  rock: HarvestableRock,
  scale: number = 1,
): Promise<void> {
  try {
    const model = await cloneIslandResource(rock.oreVariant ? 'goldRock' : 'rock');
    rock.group.clear();
    fitModelToHeight(model, 2.8 * scale);
    model.rotation.y = Math.random() * Math.PI * 2;
    rock.group.add(model);
  } catch (err) {
    console.warn('[HarvestableRock] GLB unavailable, keeping procedural mesh', err);
  }
}