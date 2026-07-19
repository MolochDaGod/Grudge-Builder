/**
 * ShipwreckWakeStaging — place broken ship, flanking boats, rocks,
 * and visual stick/stone props around the tutorial wake pocket.
 */
import * as THREE from 'three';
import {
  SHIPWRECK_STAGING,
  SHIPWRECK_WAKE,
} from '@shared/definitions/tutorialShipwreckScene';

export interface WakeStagingResult {
  group: THREE.Group;
  dispose: () => void;
}

function woodMat(color = 0x5c4033) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 });
}

function rockMat(color = 0x6b7280) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 });
}

function makeWreckHull(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 3.5, 5), woodMat(0x4a3224));
  hull.position.set(0, 1.2, 0);
  hull.rotation.z = 0.35;
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);

  const rib = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 0.5), woodMat(0x3d2918));
  rib.position.set(0, 2.4, 0);
  rib.rotation.z = 0.35;
  g.add(rib);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 9, 6), woodMat(0x3a2a1a));
  mast.position.set(-2, 3.5, 0.5);
  mast.rotation.z = 0.9;
  mast.rotation.x = 0.2;
  mast.castShadow = true;
  g.add(mast);

  // Broken deck planks
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.2 + Math.random(), 0.15, 0.4), woodMat(0x6b4423));
    p.position.set(-4 + i * 2, 0.4, 2 + (i % 2) * 0.8);
    p.rotation.y = Math.random() * 0.5;
    g.add(p);
  }
  g.userData.grudgeChunk = { kind: 'ship', layer: 'vehicle', name: 'Wrecked Pirate Hull', chunkable: true };
  return g;
}

function makeBoat(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2.2), woodMat(0x5c3d2e));
  hull.position.y = 0.5;
  hull.castShadow = true;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), woodMat(0x5c3d2e));
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(2.8, 0.55, 0);
  g.add(bow);
  g.userData.grudgeChunk = { kind: 'boat', layer: 'vehicle', name: 'Beach Boat', chunkable: true };
  return g;
}

function makeRock(scale: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.2 * scale, 0),
    rockMat(0x7a7f88 + Math.floor(Math.random() * 0x101010)),
  );
  mesh.scale.set(1 + Math.random() * 0.3, 0.7 + Math.random() * 0.4, 1 + Math.random() * 0.25);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.grudgeChunk = { kind: 'rock', layer: 'nature', name: 'Wake Rock', chunkable: true };
  return mesh;
}

function makeStickProp(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 0.9, 5),
    woodMat(0x8b6914),
  );
  m.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  m.rotation.y = Math.random() * Math.PI;
  m.position.y = 0.08;
  m.userData = {
    grudgeChunk: { kind: 'plant', layer: 'nature', name: 'Driftwood Stick', chunkable: true },
    harvestHint: 'stick',
  };
  return m;
}

function makeStoneProp(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.12, 0),
    rockMat(0x9ca3af),
  );
  m.position.y = 0.12;
  m.userData = {
    grudgeChunk: { kind: 'pebble', layer: 'nature', name: 'Small Stone', chunkable: true },
    harvestHint: 'stone',
  };
  return m;
}

/**
 * Build visual staging at wake origin. Server still owns harvest node ids;
 * props are teaching visuals + composition.
 */
export function createShipwreckWakeStaging(scene: THREE.Scene): WakeStagingResult {
  const group = new THREE.Group();
  group.name = 'ShipwreckWakeStaging';
  const o = SHIPWRECK_WAKE.spawn;

  const wreck = makeWreckHull();
  wreck.position.set(o.x + SHIPWRECK_STAGING.wreck.ox, 0, o.z + SHIPWRECK_STAGING.wreck.oz);
  wreck.rotation.y = SHIPWRECK_STAGING.wreck.rotY;
  wreck.scale.setScalar(SHIPWRECK_STAGING.wreck.scale);
  group.add(wreck);

  const bL = makeBoat();
  bL.position.set(o.x + SHIPWRECK_STAGING.boatLeft.ox, 0.2, o.z + SHIPWRECK_STAGING.boatLeft.oz);
  bL.rotation.y = SHIPWRECK_STAGING.boatLeft.rotY;
  bL.scale.setScalar(SHIPWRECK_STAGING.boatLeft.scale);
  group.add(bL);

  const bR = makeBoat();
  bR.position.set(o.x + SHIPWRECK_STAGING.boatRight.ox, 0.2, o.z + SHIPWRECK_STAGING.boatRight.oz);
  bR.rotation.y = SHIPWRECK_STAGING.boatRight.rotY;
  bR.scale.setScalar(SHIPWRECK_STAGING.boatRight.scale);
  group.add(bR);

  for (const r of SHIPWRECK_STAGING.rocks) {
    const rock = makeRock(r.scale);
    rock.position.set(o.x + r.ox, 0.4 * r.scale, o.z + r.oz);
    group.add(rock);
  }

  for (const s of SHIPWRECK_STAGING.sticks) {
    const stick = makeStickProp();
    stick.position.set(o.x + s.ox, 0.05, o.z + s.oz);
    group.add(stick);
  }

  for (const s of SHIPWRECK_STAGING.stones) {
    const stone = makeStoneProp();
    stone.position.set(o.x + s.ox, 0.1, o.z + s.oz);
    group.add(stone);
  }

  // Soft sand ring marker (wake teach radius)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.5, 7.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(o.x, 0.08, o.z + 2);
  group.add(ring);

  scene.add(group);

  return {
    group,
    dispose() {
      scene.remove(group);
      group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
    },
  };
}
