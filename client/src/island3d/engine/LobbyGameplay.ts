/**
 * LobbyGameplay — open-world systems on pre-built lobby maps (pirate-islands).
 * Water ocean, Grudge6 character ground sampling, RTS capture points, ship sailing.
 */
import * as THREE from 'three';
import { loadGltf } from '@/lib/GltfAssetLoader';

import {
  DOCK_GLB,
  getShipCatalogEntry,
  RTS_SOUTH_DOCK,
} from '@shared/definitions/shipCatalog';
import { getActiveShip, ensureStarterShip } from '@/lib/shipDockService';
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
  dockGroup: THREE.Group;
  shipGroup: THREE.Group;
  isBoarded: boolean;
  dockPosition: THREE.Vector3;
  dockId: string;
  isNearDock: (playerPos: THREE.Vector3) => boolean;
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

async function loadDockGlb(scene: THREE.Group, path: string, scale: number): Promise<boolean> {
  try {
    const gltf = await loadGltf(path, 'high');
    const model = gltf.scene.clone(true);
    model.scale.setScalar(scale);
    model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    model.position.y = -box.min.y;
    scene.add(model);
    return true;
  } catch {
    return false;
  }
}

export async function createLobbyShipSystem(
  scene: THREE.Scene,
  lobby: LobbyLoadResult,
  accountId = 'guest',
  captainId: string | null = null,
): Promise<LobbyShipSystem> {
  const south = lobby.center.clone();
  south.z += lobby.size.z * 0.35;
  const gy = getSceneHeightAt(lobby.scene, south.x, south.z, 200) ?? LOBBY_WATER_LEVEL;
  const dockPosition = new THREE.Vector3(south.x, gy + 0.5, south.z);

  const dockGroup = new THREE.Group();
  dockGroup.position.copy(dockPosition);
  dockGroup.rotation.y = -Math.PI / 2;
  scene.add(dockGroup);

  const shipGroup = new THREE.Group();
  shipGroup.position.set(6, LOBBY_WATER_LEVEL + 0.2, 0);
  dockGroup.add(shipGroup);

  const dockLoaded = await loadDockGlb(dockGroup, DOCK_GLB, 2);
  if (!dockLoaded) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(14, 1, 28),
      new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
    );
    pier.position.y = 0.5;
    dockGroup.add(pier);
  }

  ensureStarterShip(accountId, captainId);
  const active = getActiveShip(accountId);
  const entry = getShipCatalogEntry(active?.size ?? 'rowboat');
  const shipLoaded = await loadDockGlb(shipGroup, entry.glbModel, 0.85);

  if (!shipLoaded) {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3, 18),
      new THREE.MeshStandardMaterial({ color: 0x5c3d2e }),
    );
    hull.position.y = 1.5;
    shipGroup.add(hull);
  }

  const velocity = new THREE.Vector3();
  let isBoarded = false;
  const boardRadius = RTS_SOUTH_DOCK.boardRadius;

  return {
    dockGroup,
    shipGroup,
    get isBoarded() { return isBoarded; },
    dockPosition,
    dockId: RTS_SOUTH_DOCK.id,
    isNearDock(playerPos) {
      return playerPos.distanceTo(dockPosition) <= boardRadius;
    },
    tryBoard(playerPos) {
      if (isBoarded) return false;
      if (playerPos.distanceTo(dockPosition) > boardRadius) return false;
      isBoarded = true;
      return true;
    },
    tryDisembark(groundRoot) {
      if (!isBoarded) return null;
      const off = dockPosition.clone();
      off.x += 8;
      const groundY = getSceneHeightAt(groundRoot, off.x, off.z, 200);
      off.y = (groundY ?? LOBBY_WATER_LEVEL + 1) + 2;
      isBoarded = false;
      shipGroup.position.set(6, LOBBY_WATER_LEVEL + 0.2, 0);
      dockGroup.position.copy(dockPosition);
      velocity.set(0, 0, 0);
      return off;
    },
    update(dt, keys, cameraYaw) {
      if (!isBoarded) {
        shipGroup.position.y = LOBBY_WATER_LEVEL + 0.2 + Math.sin(performance.now() * 0.001) * 0.12;
        return;
      }
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
      dockGroup.position.x += velocity.x * dt;
      dockGroup.position.z += velocity.z * dt;
      dockGroup.position.y = LOBBY_WATER_LEVEL + 0.6 + Math.sin(performance.now() * 0.001) * 0.15;
      if (velocity.lengthSq() > 0.5) {
        dockGroup.rotation.y = Math.atan2(velocity.x, velocity.z);
      }
    },
    syncCamera(camera, yaw) {
      if (!isBoarded) return;
      const dist = 28;
      const h = 14;
      const pos = dockGroup.position;
      camera.position.set(
        pos.x - Math.sin(yaw) * dist,
        pos.y + h,
        pos.z - Math.cos(yaw) * dist,
      );
      camera.lookAt(pos.x, pos.y + 4, pos.z);
    },
    destroy() {
      scene.remove(dockGroup);
      dockGroup.traverse((c) => {
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

export function getLobbySpawnPosition(
  lobby: LobbyLoadResult,
  sampleHeight?: (x: number, z: number) => number | null,
): THREE.Vector3 {
  const x = lobby.center.x;
  const z = lobby.center.z + lobby.size.z * 0.08;
  const y = (sampleHeight?.(x, z) ?? getSceneHeightAt(lobby.scene, x, z, 200)) ?? 8;
  return new THREE.Vector3(x, y + 2.5, z);
}