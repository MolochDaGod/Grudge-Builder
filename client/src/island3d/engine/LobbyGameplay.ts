/**
 * LobbyGameplay — open-world systems on pre-built lobby maps (pirate-islands).
 * Water ocean, Grudge6 character ground sampling, RTS capture points, ship sailing.
 */
import * as THREE from 'three';
import { loadCharacterModel } from '@/lib/modelLoader';
import { assetUrl } from '@/lib/assetConfig';
import { getSceneHeightAt } from '../terrain/IslandTerrainGenerator';
import type { LobbyLoadResult } from './LobbyIslandLoader';

export const LOBBY_WATER_LEVEL = 0;

export interface CapturePointState {
  id: string;
  label: string;
  position: THREE.Vector3;
  owner: 'neutral' | 'player' | 'enemy';
  progress: number;
  mesh: THREE.Group;
}

export interface LobbyCaptureSystem {
  points: CapturePointState[];
  update: (dt: number, playerPos: THREE.Vector3, capturing: boolean) => void;
  getNearest: (playerPos: THREE.Vector3, maxDist?: number) => CapturePointState | null;
  destroy: () => void;
}

export interface LobbyShipSystem {
  group: THREE.Group;
  isBoarded: boolean;
  dockPosition: THREE.Vector3;
  tryBoard: (playerPos: THREE.Vector3) => boolean;
  tryDisembark: (groundRoot: THREE.Object3D) => THREE.Vector3 | null;
  update: (dt: number, keys: Set<string>, cameraYaw: number) => void;
  syncCamera: (camera: THREE.PerspectiveCamera, yaw: number, pitch: number) => void;
  destroy: () => void;
}

function makeFlagMesh(color: number): THREE.Group {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
  );
  pole.position.y = 4;
  pole.castShadow = true;

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 2),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }),
  );
  flag.position.set(1.5, 7, 0);
  flag.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 3, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;

  const g = new THREE.Group();
  g.add(pole, flag, ring);
  return g;
}

export function createLobbyCapturePoints(
  scene: THREE.Scene,
  lobby: LobbyLoadResult,
): LobbyCaptureSystem {
  const { center, size } = lobby;
  const offsets = [
    { id: 'north-harbor', label: 'North Harbor', ox: 0, oz: -size.z * 0.35 },
    { id: 'south-dock', label: 'South Dock', ox: 0, oz: size.z * 0.35 },
    { id: 'east-battery', label: 'East Battery', ox: size.x * 0.35, oz: 0 },
    { id: 'west-camp', label: 'West Camp', ox: -size.x * 0.35, oz: 0 },
  ];

  const points: CapturePointState[] = offsets.map((o) => {
    const x = center.x + o.ox;
    const z = center.z + o.oz;
    const y = getSceneHeightAt(lobby.scene, x, z, 200) ?? LOBBY_WATER_LEVEL + 2;
    const mesh = makeFlagMesh(0x94a3b8);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    return {
      id: o.id,
      label: o.label,
      position: new THREE.Vector3(x, y, z),
      owner: 'neutral',
      progress: 0,
      mesh,
    };
  });

  const updateVisual = (p: CapturePointState) => {
    const flag = p.mesh.children[1] as THREE.Mesh;
    const mat = flag.material as THREE.MeshStandardMaterial;
    mat.color.setHex(
      p.owner === 'player' ? 0x22c55e : p.owner === 'enemy' ? 0xef4444 : 0x94a3b8,
    );
    const ring = p.mesh.children[2] as THREE.Mesh;
    const ringMat = ring.material as THREE.MeshBasicMaterial;
    ringMat.opacity = p.owner === 'player' ? 0.5 : 0.15 + p.progress * 0.35;
  };

  return {
    points,
    update(dt, playerPos, capturing) {
      for (const p of points) {
        if (p.owner === 'player') continue;
        const dist = playerPos.distanceTo(p.position);
        if (dist < 6 && capturing) {
          p.progress = Math.min(1, p.progress + dt * 0.22);
          if (p.progress >= 1) {
            p.owner = 'player';
            p.progress = 1;
          }
        } else if (p.owner === 'neutral') {
          p.progress = Math.max(0, p.progress - dt * 0.08);
        }
        updateVisual(p);
      }
    },
    getNearest(playerPos, maxDist = 8) {
      let best: CapturePointState | null = null;
      let bestD = maxDist;
      for (const p of points) {
        const d = playerPos.distanceTo(p.position);
        if (d < bestD && p.owner !== 'player') {
          bestD = d;
          best = p;
        }
      }
      return best;
    },
    destroy() {
      for (const p of points) {
        scene.remove(p.mesh);
        p.mesh.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = c as THREE.Mesh;
            m.geometry?.dispose();
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mat) => mat.dispose());
          }
        });
      }
    },
  };
}

const SHIP_MODELS = [
  assetUrl('/models/ships/galleon.glb'),
  assetUrl('/models/ships/sloop.glb'),
  assetUrl('/models/buildings/village/dock.glb'),
];

export async function createLobbyShipSystem(
  scene: THREE.Scene,
  lobby: LobbyLoadResult,
): Promise<LobbyShipSystem> {
  const dockX = lobby.center.x + lobby.size.x * 0.2;
  const dockZ = lobby.center.z + lobby.size.z * 0.25;
  const dockY = LOBBY_WATER_LEVEL + 0.5;
  const dockPosition = new THREE.Vector3(dockX, dockY, dockZ);

  const group = new THREE.Group();
  group.position.copy(dockPosition);
  group.rotation.y = Math.PI * 0.15;
  scene.add(group);

  let loaded = false;
  for (const url of SHIP_MODELS) {
    try {
      const model = await loadCharacterModel(url);
      model.scene.scale.setScalar(url.includes('dock') ? 2 : 0.8);
      model.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.add(model.scene);
      loaded = true;
      break;
    } catch {
      /* try next */
    }
  }

  if (!loaded) {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 28),
      new THREE.MeshStandardMaterial({ color: 0x5c3d2e }),
    );
    hull.position.y = 2;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d2817 }),
    );
    mast.position.set(0, 9, -2);
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.DoubleSide }),
    );
    sail.position.set(0, 10, -2);
    sail.rotation.y = Math.PI / 2;
    group.add(hull, mast, sail);
  }

  const velocity = new THREE.Vector3();
  let isBoarded = false;
  const boardRadius = 10;

  return {
    group,
    get isBoarded() { return isBoarded; },
    dockPosition,
    tryBoard(playerPos) {
      if (isBoarded) return false;
      if (playerPos.distanceTo(dockPosition) > boardRadius) return false;
      isBoarded = true;
      return true;
    },
    tryDisembark(groundRoot) {
      if (!isBoarded) return null;
      const off = dockPosition.clone();
      off.x += 6;
      const gy = getSceneHeightAt(groundRoot, off.x, off.z, 200);
      off.y = (gy ?? LOBBY_WATER_LEVEL + 1) + 2;
      isBoarded = false;
      group.position.copy(dockPosition);
      velocity.set(0, 0, 0);
      return off;
    },
    update(dt, keys, cameraYaw) {
      if (!isBoarded) return;
      const dir = new THREE.Vector3();
      if (keys.has('w')) dir.z -= 1;
      if (keys.has('s')) dir.z += 1;
      if (keys.has('q') || keys.has('a')) dir.x -= 1;
      if (keys.has('e') || keys.has('d')) dir.x += 1;
      if (dir.lengthSq() > 0) {
        dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        velocity.lerp(dir.multiplyScalar(18), dt * 2);
      } else {
        velocity.multiplyScalar(0.92);
      }
      group.position.x += velocity.x * dt;
      group.position.z += velocity.z * dt;
      group.position.y = LOBBY_WATER_LEVEL + 0.6 + Math.sin(performance.now() * 0.001) * 0.15;
      if (velocity.lengthSq() > 0.5) {
        group.rotation.y = Math.atan2(velocity.x, velocity.z);
      }
    },
    syncCamera(camera, yaw, pitch) {
      if (!isBoarded) return;
      const dist = 28;
      const h = 14;
      camera.position.set(
        group.position.x - Math.sin(yaw) * dist,
        group.position.y + h,
        group.position.z - Math.cos(yaw) * dist,
      );
      camera.lookAt(group.position.x, group.position.y + 4, group.position.z);
    },
    destroy() {
      scene.remove(group);
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat.dispose());
        }
      });
    },
  };
}

export function getLobbySpawnPosition(lobby: LobbyLoadResult): THREE.Vector3 {
  const x = lobby.center.x;
  const z = lobby.center.z + lobby.size.z * 0.1;
  const y = getSceneHeightAt(lobby.scene, x, z, 200) ?? 8;
  return new THREE.Vector3(x, y + 2.5, z);
}