/**
 * EvilMountainTriad — three Sketchfab evil peaks; dungeon mouth hides behind one (seed-picked).
 *
 * Model: Jungle Jim — "3 Evil Rock Mountains with Cave (Stylized)" (skfb.ly/pK9V9)
 * Scale: triad spans 10% of home island world size; cave mouth ≈ 4m tall.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';
import { assetUrl } from '@/lib/assetConfig';
import { CavePortal3D, type PortalData } from './CavePortal3D';
import { DUNGEON_DEFINITIONS, type DungeonDefinition } from '@shared/definitions/lore';
import {
  MOUNTAIN_TRIAD_PEAK_MODEL_PATHS,
  SKETCHFAB_EVIL_MOUNTAIN_TRIAD,
  HOME_ISLAND_WORLD_SIZE_M,
  anchorPercentToWorld,
  computeGlbTriadScale,
  generateMountainTriadSeed,
  pickHomeIslandDungeonFromSeed,
  type MountainTriadSeed,
} from '@shared/definitions/homeIslandSeed';

/** RootNode child order in combined triad GLB: Mountain2, Mountain1, Mountain3+ladder */
const TRIAD_COMBINED_PEAK_NAMES = [
  'Cave Rock Mountain2',
  'Cave Rock Mountain1',
  'Cave Rock Mountain3',
] as const;

let combinedTriadTemplate: THREE.Group | null = null;

const CAVE_DISCOVER_RADIUS = 32;
const TRIAD_APPROACH_RADIUS = 120;

export interface EvilMountainTriadConfig {
  seed: string;
  /** Persisted triad from Railway; regenerated from seed when absent */
  mountainTriad?: MountainTriadSeed;
  terrainMesh: THREE.Mesh;
  biomeMap: BiomeType[][];
  gridW: number;
  gridH: number;
  terrainSize?: number;
  /** Optional world-space anchor override (lobby maps) */
  anchorWorld?: { x: number; z: number };
  dungeon?: DungeonDefinition;
  onEnterDungeon?: (portalId: string, dungeonId: string) => void;
}

export interface EvilMountainTriadResult {
  group: THREE.Group;
  secretIndex: number;
  anchor: THREE.Vector3;
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

/** Find the rock-biome centroid in the northern mountain belt (fallback anchor). */
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
      if (gy > gridH * 0.55) continue;
      const wx = (gx / (gridW - 1) - 0.5) * terrainSize;
      const wz = (gy / (gridH - 1) - 0.5) * terrainSize;
      sumX += wx;
      sumZ += wz;
      count++;
    }
  }

  if (count < 8) {
    return new THREE.Vector3(
      (rng() - 0.5) * terrainSize * 0.15,
      0,
      -terrainSize * 0.28,
    );
  }

  return new THREE.Vector3(sumX / count, 0, sumZ / count);
}

function resolveTriadSeed(config: EvilMountainTriadConfig, terrainSize: number): MountainTriadSeed {
  return config.mountainTriad ?? generateMountainTriadSeed(config.seed, terrainSize);
}

function scalePeakModel(
  root: THREE.Object3D,
  mountainScaleM: number,
  entranceHeightM: number,
  isSecret: boolean,
): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const triadScale = computeGlbTriadScale(size.y, size.x, mountainScaleM, entranceHeightM);
  const peakScale = triadScale * 0.38;
  root.scale.setScalar(peakScale);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  if (isSecret) {
    const mouthBoost = entranceHeightM / Math.max(size.y * peakScale * 0.22, 0.5);
    root.scale.multiplyScalar(Math.min(Math.max(mouthBoost, 0.9), 1.12));
  }
}

async function loadCombinedTriadTemplate(loader: GLTFLoader, modelPath: string): Promise<THREE.Group> {
  if (combinedTriadTemplate) return combinedTriadTemplate;
  const gltf = await loader.loadAsync(assetUrl(modelPath));
  combinedTriadTemplate = gltf.scene as THREE.Group;
  return combinedTriadTemplate;
}

function cloneCombinedPeak(template: THREE.Group, peakIndex: number): THREE.Object3D | null {
  const root = template.getObjectByName('RootNode');
  if (!root) return null;
  const peakName = TRIAD_COMBINED_PEAK_NAMES[peakIndex];
  const peak = root.getObjectByName(peakName);
  if (peak) return peak.clone(true);
  return root.children[peakIndex]?.clone(true) ?? null;
}

function placePeak(
  peak: THREE.Object3D,
  i: number,
  triadSeed: MountainTriadSeed,
  anchor: THREE.Vector3,
  groundY: number,
  facingYaw: number,
  secretIndex: number,
  group: THREE.Group,
  terrainMesh: THREE.Mesh,
): void {
  const offset = triadSeed.peakOffsetsM[i] ?? { x: (i - 1) * 55, z: 0 };
  const local = new THREE.Vector3(offset.x, 0, offset.z);
  local.applyEuler(new THREE.Euler(0, facingYaw, 0));
  local.add(anchor);
  const peakY = getTerrainHeightAt(terrainMesh, local.x, local.z) ?? groundY;

  scalePeakModel(peak, triadSeed.mountainScaleM, triadSeed.entranceHeightM, i === secretIndex);
  peak.position.set(local.x, peakY, local.z);
  peak.rotation.y = facingYaw + (i - 1) * 0.08;
  peak.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      (c as THREE.Mesh).castShadow = true;
      (c as THREE.Mesh).receiveShadow = true;
    }
  });
  peak.userData = { peakIndex: i, isSecret: i === secretIndex };
  group.add(peak);
}

async function loadPeakModels(
  loader: GLTFLoader,
  triadSeed: MountainTriadSeed,
  anchor: THREE.Vector3,
  groundY: number,
  facingYaw: number,
  secretIndex: number,
  group: THREE.Group,
  terrainMesh: THREE.Mesh,
): Promise<boolean> {
  const peakPaths = triadSeed.peakModelPaths?.length
    ? triadSeed.peakModelPaths
    : [...MOUNTAIN_TRIAD_PEAK_MODEL_PATHS];

  const loadedIndices = new Set<number>();
  for (let i = 0; i < 3; i++) {
    const modelPath = peakPaths[i] ?? MOUNTAIN_TRIAD_PEAK_MODEL_PATHS[i];
    try {
      const gltf = await loader.loadAsync(assetUrl(modelPath));
      const peak = gltf.scene.clone(true);
      placePeak(peak, i, triadSeed, anchor, groundY, facingYaw, secretIndex, group, terrainMesh);
      loadedIndices.add(i);
    } catch {
      console.warn(`[EvilMountainTriad] Peak GLB missing: ${modelPath}`);
    }
  }

  const missing = [0, 1, 2].filter((i) => !loadedIndices.has(i));
  if (missing.length > 0) {
    try {
      const combinedPath = triadSeed.modelPath || SKETCHFAB_EVIL_MOUNTAIN_TRIAD.modelPath;
      const template = await loadCombinedTriadTemplate(loader, combinedPath);
      for (const i of missing) {
        const peak = cloneCombinedPeak(template, i);
        if (!peak) continue;
        placePeak(peak, i, triadSeed, anchor, groundY, facingYaw, secretIndex, group, terrainMesh);
        loadedIndices.add(i);
        console.log(`[EvilMountainTriad] Peak #${i + 1} from combined triad GLB`);
      }
    } catch (err) {
      console.warn('[EvilMountainTriad] Combined triad fallback failed', err);
    }
  }

  return loadedIndices.size > 0;
}

/**
 * Build the triad + hidden cave portal. Returns null if terrain anchor is underwater.
 */
export async function createEvilMountainTriad(
  scene: THREE.Scene,
  config: EvilMountainTriadConfig,
): Promise<EvilMountainTriadResult | null> {
  const terrainSize = config.terrainSize ?? HOME_ISLAND_WORLD_SIZE_M;
  const triadSeed = resolveTriadSeed(config, terrainSize);
  const rng = makePrng(`${config.seed}_evil_triad`);

  const anchor2d = config.anchorWorld
    ? config.anchorWorld
    : config.mountainTriad
      ? anchorPercentToWorld(triadSeed.anchorPercent, terrainSize)
      : (() => {
          const a = findMountainAnchor(config.biomeMap, config.gridW, config.gridH, terrainSize, rng);
          return { x: a.x, z: a.z };
        })();

  const groundY = getTerrainHeightAt(config.terrainMesh, anchor2d.x, anchor2d.z);
  if (groundY === null || groundY < -1) return null;

  const anchor = new THREE.Vector3(anchor2d.x, groundY, anchor2d.z);
  const secretIndex = triadSeed.secretPeakIndex;
  const dungeon =
    config.dungeon ??
    DUNGEON_DEFINITIONS.find((d) => d.id === triadSeed.dungeonId) ??
    pickHomeIslandDungeonFromSeed(config.seed);

  const group = new THREE.Group();
  group.name = 'evil_mountain_triad';

  const facingYaw = Math.atan2(-anchor.x, -anchor.z);
  const loader = new GLTFLoader();
  await loadPeakModels(
    loader,
    triadSeed,
    anchor,
    groundY,
    facingYaw,
    secretIndex,
    group,
    config.terrainMesh,
  );

  if (group.children.filter((c) => c.userData?.peakIndex !== undefined).length < 3) {
    console.warn('[EvilMountainTriad] Incomplete peak set — procedural fallback for missing peaks');
    for (let i = 0; i < 3; i++) {
      if (group.children.some((c) => c.userData?.peakIndex === i)) continue;
      const offset = triadSeed.peakOffsetsM[i] ?? { x: (i - 1) * 55, z: 0 };
      const local = new THREE.Vector3(offset.x, 0, offset.z);
      local.applyEuler(new THREE.Euler(0, facingYaw, 0));
      local.add(anchor);
      const peakY = getTerrainHeightAt(config.terrainMesh, local.x, local.z) ?? groundY;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(triadSeed.mountainScaleM * 0.08, triadSeed.mountainScaleM * 0.35, 6),
        new THREE.MeshStandardMaterial({ color: 0x2a2430, roughness: 0.9 }),
      );
      peak.position.set(local.x, peakY + triadSeed.mountainScaleM * 0.17, local.z);
      peak.userData = { peakIndex: i, isSecret: i === secretIndex };
      group.add(peak);
    }
  }

  const secretOffset = triadSeed.peakOffsetsM[secretIndex] ?? { x: 0, z: 0 };
  const mouthLocal = new THREE.Vector3(secretOffset.x, 0, secretOffset.z - triadSeed.mountainScaleM * 0.12);
  mouthLocal.applyEuler(new THREE.Euler(0, facingYaw, 0));
  mouthLocal.add(anchor);
  const portalY = getTerrainHeightAt(config.terrainMesh, mouthLocal.x, mouthLocal.z) ?? groundY;

  const portalId = `home_dungeon_${hashSeed(config.seed).toString(36)}`;
  const portalData: PortalData = {
    id: portalId,
    dungeonName: dungeon.name,
    dungeonType: dungeon.type,
    minLevel: dungeon.minLevel,
    x: mouthLocal.x,
    z: mouthLocal.z,
    active: true,
    entranceModel:
      triadSeed.peakModelPaths?.[secretIndex] ??
      MOUNTAIN_TRIAD_PEAK_MODEL_PATHS[secretIndex] ??
      triadSeed.modelPath,
  };

  const caveMouthPos = new THREE.Vector3(mouthLocal.x, portalY, mouthLocal.z);
  const portal = new CavePortal3D(portalData);
  portal.group.position.y = portalY;
  portal.onEnter = (id) => config.onEnterDungeon?.(id, dungeon.id);
  portal.group.visible = false;
  group.add(portal.group);

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

    if (atMouth) {
      this.discovered = true;
      this.triad.portal.group.visible = true;
      this.hintState = this.triad.portal.canInteract() ? 'interact' : 'discovered';
    } else if (approachDist < TRIAD_APPROACH_RADIUS) {
      this.hintState = 'approach';
    } else {
      this.hintState = 'none';
    }

    this.triad.portal.update(dt, playerPos);
    return atMouth;
  }

  tryInteract(): boolean {
    return this.triad.portal.tryInteract();
  }

  get canInteract(): boolean {
    return this.discovered && this.triad.portal.canInteract();
  }
}