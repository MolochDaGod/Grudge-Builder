/**
 * EvilMountainTriad — three evil peaks; the dungeon mouth hides behind one (seed-picked).
 *
 * Players approach the mountain ring from the island interior. Only the rear face
 * of the secret peak reveals the cave portal — the other two are decoys.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';
import { assetUrl } from '@/lib/assetConfig';
import { CavePortal3D, type PortalData } from './CavePortal3D';
import { DUNGEON_DEFINITIONS, type DungeonDefinition } from '@shared/definitions/lore';

const EVIL_MOUNTAIN_MODEL = assetUrl('/models/evil_rock_mountains_cave.glb');
const MOUNTAIN_SPACING = 55;
const MOUNTAIN_BACK_OFFSET = 22;
const CAVE_DISCOVER_RADIUS = 32;
const TRIAD_APPROACH_RADIUS = 120;

export interface EvilMountainTriadConfig {
  seed: string;
  terrainMesh: THREE.Mesh;
  biomeMap: BiomeType[][];
  gridW: number;
  gridH: number;
  terrainSize?: number;
  dungeon?: DungeonDefinition;
  onEnterDungeon?: (portalId: string, dungeonId: string) => void;
}

export interface EvilMountainTriadResult {
  group: THREE.Group;
  secretIndex: number;
  anchor: THREE.Vector3;
  /** World-space cave mouth where the portal sits (behind the secret peak). */
  caveMouthPos: THREE.Vector3;
  portal: CavePortal3D;
  dungeon: DungeonDefinition;
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

function makePrng(seed: string): () => number {
  let s = hashSeed(seed) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Find the rock-biome centroid in the northern mountain belt. */
function findMountainAnchor(
  biomeMap: BiomeType[][],
  gridW: number,
  gridH: number,
  terrainSize: number,
  rng: () => number,
): THREE.Vector3 {
  let sumX = 0;
  let sumZ = 0;
  let count = 0;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (biomeMap[gy]?.[gx] !== 'rock') continue;
      // Prefer northern highlands (negative Z = north on our terrain)
      if (gy > gridH * 0.55) continue;
      const wx = (gx / (gridW - 1) - 0.5) * terrainSize;
      const wz = (gy / (gridH - 1) - 0.5) * terrainSize;
      sumX += wx;
      sumZ += wz;
      count++;
    }
  }

  if (count < 8) {
    // Fallback: north ridge
    return new THREE.Vector3(
      (rng() - 0.5) * terrainSize * 0.15,
      0,
      -terrainSize * 0.28,
    );
  }

  return new THREE.Vector3(sumX / count, 0, sumZ / count);
}

function createEvilRockMesh(scale: number, rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a2430,
    roughness: 0.92,
    metalness: 0.05,
    emissive: new THREE.Color(0x1a0818),
    emissiveIntensity: 0.15,
  });

  const layers = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < layers; i++) {
    const r = (1.2 - i * 0.18) * scale * (0.85 + rng() * 0.3);
    const h = (2.5 + rng() * 2) * scale;
    const geo = new THREE.ConeGeometry(r, h, 5 + Math.floor(rng() * 4));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (rng() - 0.5) * scale * 1.2,
      h * 0.5 + i * scale * 0.4,
      (rng() - 0.5) * scale * 1.2,
    );
    mesh.rotation.y = rng() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Evil glow cracks
  const crackMat = new THREE.MeshBasicMaterial({
    color: 0x6622aa,
    transparent: true,
    opacity: 0.35,
  });
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(scale * 1.5, scale * 3), crackMat);
  crack.position.set(0, scale * 2, scale * 0.8);
  crack.rotation.x = -0.3;
  group.add(crack);

  return group;
}

function pickHomeIslandDungeon(seed: string): DungeonDefinition {
  const eligible = DUNGEON_DEFINITIONS.filter((d) => d.type === 'cave' || d.type === 'ruins');
  const idx = hashSeed(`${seed}_home_dungeon`) % eligible.length;
  return eligible[idx] ?? DUNGEON_DEFINITIONS[0];
}

/**
 * Build the triad + hidden cave portal. Returns null if terrain anchor is underwater.
 */
export async function createEvilMountainTriad(
  scene: THREE.Scene,
  config: EvilMountainTriadConfig,
): Promise<EvilMountainTriadResult | null> {
  const terrainSize = config.terrainSize ?? 1024;
  const rng = makePrng(`${config.seed}_evil_triad`);
  const anchor2d = findMountainAnchor(
    config.biomeMap,
    config.gridW,
    config.gridH,
    terrainSize,
    rng,
  );

  const groundY = getTerrainHeightAt(config.terrainMesh, anchor2d.x, anchor2d.z);
  if (groundY === null || groundY < -1) return null;

  const anchor = new THREE.Vector3(anchor2d.x, groundY, anchor2d.z);
  const secretIndex = hashSeed(`${config.seed}_secret_peak`) % 3;
  const dungeon = config.dungeon ?? pickHomeIslandDungeon(config.seed);

  const group = new THREE.Group();
  group.name = 'evil_mountain_triad';

  // Triad faces south (toward island center / spawn)
  const facingYaw = Math.atan2(-anchor.x, -anchor.z);
  const positions: THREE.Vector3[] = [
    new THREE.Vector3(-MOUNTAIN_SPACING, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(MOUNTAIN_SPACING, 0, 0),
  ];

  const loader = new GLTFLoader();
  let caveGlb: THREE.Object3D | null = null;
  try {
    const gltf = await loader.loadAsync(EVIL_MOUNTAIN_MODEL);
    caveGlb = gltf.scene;
  } catch {
    console.warn('[EvilMountainTriad] GLB not found, using procedural peaks only');
  }

  for (let i = 0; i < 3; i++) {
    const local = positions[i].clone();
    const rot = new THREE.Euler(0, facingYaw, 0);
    local.applyEuler(rot);
    local.add(anchor);

    const peakY = getTerrainHeightAt(config.terrainMesh, local.x, local.z) ?? groundY;
    const peak = createEvilRockMesh(5 + rng() * 2, rng);
    peak.position.set(local.x, peakY, local.z);
    peak.rotation.y = facingYaw + (rng() - 0.5) * 0.4;
    peak.userData = { peakIndex: i, isSecret: i === secretIndex };
    group.add(peak);

    // Secret peak: place the GLB cave entrance on its BACK face (away from spawn)
    if (i === secretIndex && caveGlb) {
      const cave = caveGlb.clone(true);
      cave.scale.setScalar(0.09);
      const back = new THREE.Vector3(0, 0, -MOUNTAIN_BACK_OFFSET);
      back.applyEuler(rot);
      back.add(local);
      const caveY = getTerrainHeightAt(config.terrainMesh, back.x, back.z) ?? peakY;
      cave.position.set(back.x, caveY, back.z);
      cave.rotation.y = facingYaw + Math.PI;
      cave.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).castShadow = true;
          (c as THREE.Mesh).receiveShadow = true;
        }
      });
      group.add(cave);
    }
  }

  // Portal swirl sits in the cave mouth (behind secret peak)
  const secretLocal = positions[secretIndex].clone();
  secretLocal.z -= MOUNTAIN_BACK_OFFSET;
  secretLocal.applyEuler(new THREE.Euler(0, facingYaw, 0));
  secretLocal.add(anchor);
  const portalY = getTerrainHeightAt(config.terrainMesh, secretLocal.x, secretLocal.z) ?? groundY;

  const portalId = `home_dungeon_${hashSeed(config.seed).toString(36)}`;
  const portalData: PortalData = {
    id: portalId,
    dungeonName: dungeon.name,
    dungeonType: dungeon.type,
    minLevel: dungeon.minLevel,
    x: secretLocal.x,
    z: secretLocal.z,
    active: true,
    entranceModel: dungeon.entranceModel,
  };

  const caveMouthPos = new THREE.Vector3(secretLocal.x, portalY, secretLocal.z);

  const portal = new CavePortal3D(portalData);
  portal.group.position.y = portalY;
  portal.onEnter = (id) => config.onEnterDungeon?.(id, dungeon.id);

  // Portal hidden until player discovers the rear approach
  portal.group.visible = false;
  group.add(portal.group);

  // Approach marker — faint rune circle visible from distance
  const ringGeo = new THREE.RingGeometry(TRIAD_APPROACH_RADIUS * 0.85, TRIAD_APPROACH_RADIUS, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x5533aa,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(anchor.x, groundY + 0.5, anchor.z);
  group.add(ring);

  scene.add(group);

  return {
    group,
    secretIndex,
    anchor,
    caveMouthPos,
    portal,
    dungeon,
  };
}

/** True when the player has reached the hidden cave mouth behind the secret peak. */
export function isPlayerAtCaveMouth(
  playerPos: THREE.Vector3,
  caveMouthPos: THREE.Vector3,
  facingYaw: number,
): boolean {
  const toPlayer = playerPos.clone().sub(caveMouthPos);
  toPlayer.y = 0;
  const dist = toPlayer.length();
  if (dist > CAVE_DISCOVER_RADIUS) return false;
  if (dist < 10) return true;

  const backDir = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
  return toPlayer.normalize().dot(backDir) > 0.15;
}

export type MountainHintState = 'none' | 'approach' | 'discovered' | 'interact';

export class EvilMountainTriadSystem {
  readonly triad: EvilMountainTriadResult;
  private facingYaw: number;
  private discovered = false;
  hintState: MountainHintState = 'none';

  constructor(triad: EvilMountainTriadResult, facingYaw: number) {
    this.triad = triad;
    this.facingYaw = facingYaw;
  }

  update(dt: number, playerPos: THREE.Vector3): boolean {
    const dx = playerPos.x - this.triad.anchor.x;
    const dz = playerPos.z - this.triad.anchor.z;
    const approachDist = Math.sqrt(dx * dx + dz * dz);

    const atMouth = isPlayerAtCaveMouth(
      playerPos,
      this.triad.caveMouthPos,
      this.facingYaw,
    );

    if (atMouth && !this.discovered) {
      this.discovered = true;
      this.triad.portal.group.visible = true;
    }

    if (this.discovered) {
      this.triad.portal.update(dt, playerPos);
      this.hintState = this.triad.portal.canInteract ? 'interact' : 'discovered';
    } else if (approachDist < TRIAD_APPROACH_RADIUS) {
      this.hintState = 'approach';
    } else {
      this.hintState = 'none';
    }

    return this.discovered;
  }

  tryInteract(): boolean {
    if (!this.discovered) return false;
    return this.triad.portal.interact();
  }

  get canInteract(): boolean {
    return this.discovered && this.triad.portal.canInteract;
  }

  dispose(): void {
    this.triad.portal.dispose();
    this.triad.group.parent?.remove(this.triad.group);
  }
}