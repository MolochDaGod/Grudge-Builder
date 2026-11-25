/**
 * HiddenMountainCity — Thornwood Wilds (NE / top-right biome).
 *
 * Loads mountainshiddencity.glb, places a boss on the island,
 * seals the under-mountain city door until the boss is defeated.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  HIDDEN_MOUNTAIN_CITY,
  HIDDEN_MOUNTAIN_CITY_BOSS,
  HIDDEN_MOUNTAIN_CITY_DOOR,
  HIDDEN_MOUNTAIN_CITY_MODEL,
} from '@shared/definitions/hiddenMountainCity';

export interface HiddenMountainCityOpts {
  scene: THREE.Scene;
  /** Zone / terrain size for anchor placement */
  zoneSizeM: number;
  /** Optional world override */
  worldXZ?: { x: number; z: number };
  sampleGround?: (x: number, z: number) => number | null;
  onEnterCity?: (dungeonId: string, dungeonName: string) => void;
  onBossDefeated?: () => void;
  onBossHp?: (hp: number, maxHp: number) => void;
}

export interface HiddenMountainCityRuntime {
  root: THREE.Group;
  bossDefeated: boolean;
  bossHp: number;
  bossMaxHp: number;
  update: (dt: number, playerPos: THREE.Vector3, opts?: { attacking?: boolean }) => void;
  tryInteract: (playerPos: THREE.Vector3) => boolean;
  /** True when player is near locked door or boss */
  getPrompt: (playerPos: THREE.Vector3) => string | null;
  dispose: () => void;
}

const loader = new GLTFLoader();

async function loadMountainModel(): Promise<THREE.Object3D | null> {
  const paths = [
    HIDDEN_MOUNTAIN_CITY_MODEL.localPath,
    HIDDEN_MOUNTAIN_CITY_MODEL.cdnUrl,
  ];
  for (const p of paths) {
    try {
      const url = p.startsWith('http') ? p : assetUrl(p);
      const gltf = await new Promise<any>((res, rej) =>
        loader.load(url, res, undefined, rej),
      );
      return gltf.scene as THREE.Object3D;
    } catch {
      /* try next */
    }
  }
  return null;
}

function fitHeight(obj: THREE.Object3D, targetH: number): void {
  const box = new THREE.Box3().setFromObject(obj);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const s = targetH / h;
  obj.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y;
}

function makeBossMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = HIDDEN_MOUNTAIN_CITY_BOSS.id;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.1, 2.4, 6, 12),
    new THREE.MeshStandardMaterial({
      color: 0x4a1d6a,
      emissive: 0x2a0a40,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0.2,
    }),
  );
  body.position.y = 2.2;
  body.castShadow = true;
  g.add(body);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x664400, emissiveIntensity: 0.3 }),
  );
  crown.position.y = 4.2;
  g.add(crown);
  // Aggro ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(HIDDEN_MOUNTAIN_CITY_BOSS.aggroRadiusM * 0.15, 0.08, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  return g;
}

function makeDoorMesh(locked: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = HIDDEN_MOUNTAIN_CITY_DOOR.id;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 8, 1.2),
    new THREE.MeshStandardMaterial({
      color: locked ? 0x3f3f46 : 0x1e3a5f,
      emissive: locked ? 0x450a0a : 0x0ea5e9,
      emissiveIntensity: locked ? 0.35 : 0.55,
      roughness: 0.7,
    }),
  );
  frame.position.y = 4;
  frame.castShadow = true;
  g.add(frame);
  const seal = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 24),
    new THREE.MeshBasicMaterial({
      color: locked ? 0xef4444 : 0x22c55e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  seal.position.set(0, 4.2, 0.7);
  seal.name = 'door_seal';
  g.add(seal);
  return g;
}

export async function createHiddenMountainCity(
  opts: HiddenMountainCityOpts,
): Promise<HiddenMountainCityRuntime | null> {
  const def = HIDDEN_MOUNTAIN_CITY;
  const root = new THREE.Group();
  root.name = def.id;

  const size = opts.zoneSizeM || 12_000;
  const ax =
    opts.worldXZ?.x ?? def.zoneAnchorFrac.ox * size;
  const az =
    opts.worldXZ?.z ?? def.zoneAnchorFrac.oz * size;
  let ay = 0;
  if (opts.sampleGround) {
    const h = opts.sampleGround(ax, az);
    if (h != null) ay = h;
  }
  root.position.set(ax, ay, az);

  // Mountain mesh
  let mountain = await loadMountainModel();
  if (!mountain) {
    console.warn('[HiddenMountainCity] GLB failed — procedural mountain fallback');
    mountain = new THREE.Group();
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(55, 140, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.95 }),
    );
    peak.position.y = 70;
    peak.castShadow = true;
    mountain.add(peak);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(70, 85, 20, 10),
      new THREE.MeshStandardMaterial({ color: 0x3f4a3a, roughness: 0.95 }),
    );
    base.position.y = 8;
    mountain.add(base);
  } else {
    fitHeight(mountain, HIDDEN_MOUNTAIN_CITY_MODEL.targetHeightM);
    mountain.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
  }
  mountain.name = 'mountains_hidden_city_mesh';
  root.add(mountain);

  // Boss
  const boss = makeBossMesh();
  const bo = HIDDEN_MOUNTAIN_CITY_BOSS.localOffset;
  boss.position.set(bo[0], bo[1], bo[2]);
  root.add(boss);

  // Door
  const door = makeDoorMesh(true);
  const dOff = HIDDEN_MOUNTAIN_CITY_DOOR.localOffset;
  door.position.set(dOff[0], dOff[1], dOff[2]);
  // Face outward roughly south of mountain face
  door.rotation.y = Math.PI;
  root.add(door);

  opts.scene.add(root);

  let bossHp: number = HIDDEN_MOUNTAIN_CITY_BOSS.maxHp;
  const bossMaxHp = HIDDEN_MOUNTAIN_CITY_BOSS.maxHp;
  let bossDefeated = false;
  let attackCooldown = 0;
  const bossWorld = new THREE.Vector3();
  const doorWorld = new THREE.Vector3();

  const unlockDoor = () => {
    bossDefeated = true;
    const seal = door.getObjectByName('door_seal') as THREE.Mesh | undefined;
    if (seal) {
      const mat = seal.material as THREE.MeshBasicMaterial;
      mat.color.setHex(0x22c55e);
    }
    const frame = door.children[0] as THREE.Mesh;
    if (frame?.isMesh) {
      const mat = frame.material as THREE.MeshStandardMaterial;
      mat.emissive?.setHex(0x0ea5e9);
      mat.emissiveIntensity = 0.55;
      mat.color.setHex(0x1e3a5f);
    }
    // Hide boss
    boss.visible = false;
    opts.onBossDefeated?.();
    console.info('[HiddenMountainCity] Boss defeated — city door unsealed');
  };

  console.info(
    `[HiddenMountainCity] ${def.name} @ (${ax.toFixed(0)}, ${az.toFixed(0)}) sector=${def.sectorId}`,
  );

  return {
    root,
    get bossDefeated() {
      return bossDefeated;
    },
    get bossHp() {
      return bossHp;
    },
    bossMaxHp,
    update(dt, playerPos, flags) {
      if (bossDefeated) return;
      attackCooldown = Math.max(0, attackCooldown - dt);
      boss.getWorldPosition(bossWorld);
      const dist = playerPos.distanceTo(bossWorld);
      // Subtle idle
      boss.rotation.y += dt * 0.4;
      if (dist < HIDDEN_MOUNTAIN_CITY_BOSS.aggroRadiusM) {
        const dx = playerPos.x - bossWorld.x;
        const dz = playerPos.z - bossWorld.z;
        boss.rotation.y = Math.atan2(dx, dz);
      }
      if (
        flags?.attacking &&
        dist < HIDDEN_MOUNTAIN_CITY_BOSS.hitRadiusM &&
        attackCooldown <= 0
      ) {
        attackCooldown = 0.45;
        bossHp = Math.max(0, bossHp - HIDDEN_MOUNTAIN_CITY_BOSS.damagePerHit);
        opts.onBossHp?.(bossHp, bossMaxHp);
        // Flash
        boss.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh && m.material && 'emissive' in (m.material as any)) {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 1.2;
            setTimeout(() => {
              if (mat) mat.emissiveIntensity = 0.45;
            }, 80);
          }
        });
        if (bossHp <= 0) unlockDoor();
      }
    },
    tryInteract(playerPos) {
      door.getWorldPosition(doorWorld);
      const d = playerPos.distanceTo(doorWorld);
      if (d > HIDDEN_MOUNTAIN_CITY_DOOR.interactRadiusM) return false;
      if (!bossDefeated) return false;
      opts.onEnterCity?.(
        HIDDEN_MOUNTAIN_CITY_DOOR.dungeonId,
        HIDDEN_MOUNTAIN_CITY_DOOR.dungeonName,
      );
      return true;
    },
    getPrompt(playerPos) {
      door.getWorldPosition(doorWorld);
      boss.getWorldPosition(bossWorld);
      const dDoor = playerPos.distanceTo(doorWorld);
      const dBoss = playerPos.distanceTo(bossWorld);
      if (!bossDefeated && dBoss < HIDDEN_MOUNTAIN_CITY_BOSS.aggroRadiusM) {
        const pct = Math.round((bossHp / bossMaxHp) * 100);
        return `${HIDDEN_MOUNTAIN_CITY_BOSS.name} · ${pct}% HP — attack in combat range`;
      }
      if (dDoor < HIDDEN_MOUNTAIN_CITY_DOOR.interactRadiusM + 2) {
        return bossDefeated
          ? HIDDEN_MOUNTAIN_CITY_DOOR.unlockedMessage
          : HIDDEN_MOUNTAIN_CITY_DOOR.lockedMessage;
      }
      return null;
    },
    dispose() {
      opts.scene.remove(root);
      root.traverse((o) => {
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
