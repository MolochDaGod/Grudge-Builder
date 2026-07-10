/**
 * MineEntranceSystem — Craftpix mine entrances on home island.
 * Press E near mine → hero vanishes 4s → returns with miner/engineer/mystic bag.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import {
  generateHomeIslandMines,
  rollMineLootBag,
  MINE_INTERACT_RANGE_M,
  MINE_RUN_DURATION_SEC,
  type HomeIslandMineSeed,
  type MineLootItem,
} from '@shared/definitions/homeIslandMines';
import { generateHomeIslandMountain } from '@shared/definitions/homeIslandMountain';
import { WARLORDS_MOUNTAIN_ASSET } from '@shared/definitions/warlordsEraAssets';
import { fitModelToHeight } from './IslandResourceLoader';

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const templateCache = new Map<string, THREE.Object3D>();

export interface MineEntranceSystemConfig {
  scene: THREE.Scene;
  terrainMesh: THREE.Mesh;
  seed: string;
  campX?: number;
  campZ?: number;
  campClearRadiusM?: number;
  worldSizeM?: number;
  /** When true, place Ultimate Fantasy RTS mountain (one per island) + optional JJ cave */
  placeEventMountain?: boolean;
  mountainPercent?: { x: number; y: number };
  onLoot?: (items: MineLootItem[], mineId: string) => void;
  onMineStart?: (mineId: string) => void;
  onMineEnd?: (mineId: string) => void;
}

export interface RuntimeMine {
  seed: HomeIslandMineSeed;
  group: THREE.Group;
  prompt: THREE.Sprite;
}

async function loadModel(path: string): Promise<THREE.Object3D> {
  const url = assetUrl(path);
  const cached = templateCache.get(url);
  if (cached) return cached.clone(true);

  const isFbx = path.toLowerCase().endsWith('.fbx');
  let root: THREE.Object3D;
  if (isFbx) {
    root = await fbxLoader.loadAsync(url);
  } else {
    const gltf = await gltfLoader.loadAsync(url);
    root = gltf.scene;
  }
  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  templateCache.set(url, root);
  return root.clone(true);
}

function makePrompt(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 8, 240, 48);
  ctx.font = 'bold 22px Inter,sans-serif';
  ctx.fillStyle = '#f6c945';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(8, 2, 1);
  sp.visible = false;
  return sp;
}

export class MineEntranceSystem {
  readonly root = new THREE.Group();
  readonly mines: RuntimeMine[] = [];
  private cfg: MineEntranceSystemConfig;
  private mining = false;
  private mineTimer = 0;
  private activeMine: RuntimeMine | null = null;
  private characterHide: THREE.Object3D | null = null;
  private characterVisibleBackup = true;

  constructor(cfg: MineEntranceSystemConfig) {
    this.cfg = cfg;
    this.root.name = 'mine_entrance_system';
    cfg.scene.add(this.root);
  }

  async init(): Promise<void> {
    const seeds = generateHomeIslandMines(this.cfg.seed, {
      worldSizeM: this.cfg.worldSizeM,
      campX: this.cfg.campX,
      campZ: this.cfg.campZ,
      campClearRadiusM: this.cfg.campClearRadiusM,
      minCount: 2,
    });

    for (const seed of seeds) {
      const isQuarry = seed.kind === 'stone_quarry';
      const promptText = isQuarry
        ? 'Press E — Stone Quarry (miner)'
        : 'Press E — Mine (4s)';
      try {
        const model = await loadModel(seed.modelPath);
        fitModelToHeight(model, seed.targetHeightM ?? 5.5 + seed.tier * 0.4);
        const y = getTerrainHeightAt(this.cfg.terrainMesh, seed.x, seed.z) ?? 4;
        const group = new THREE.Group();
        group.name = seed.id;
        group.userData.mineKind = seed.kind;
        group.position.set(seed.x, y, seed.z);
        group.rotation.y = seed.rotationY;
        group.add(model);
        const prompt = makePrompt(promptText);
        prompt.position.set(0, 7, 0);
        group.add(prompt);
        this.root.add(group);
        this.mines.push({ seed, group, prompt });
      } catch (err) {
        console.warn('[MineEntrance] load failed', seed.modelPath, err);
        const y = getTerrainHeightAt(this.cfg.terrainMesh, seed.x, seed.z) ?? 4;
        const group = new THREE.Group();
        group.position.set(seed.x, y, seed.z);
        group.userData.mineKind = seed.kind;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(isQuarry ? 4 : 3.5, 0),
          new THREE.MeshStandardMaterial({
            color: isQuarry ? 0x6b6b62 : 0x4a4a4a,
            roughness: 0.95,
          }),
        );
        rock.position.y = 2;
        group.add(rock);
        const hole = new THREE.Mesh(
          new THREE.TorusGeometry(1.4, 0.35, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220011, emissiveIntensity: 0.3 }),
        );
        hole.position.set(0, 1.2, 2.2);
        hole.rotation.x = Math.PI / 2;
        group.add(hole);
        const prompt = makePrompt(promptText);
        prompt.position.set(0, 6, 0);
        group.add(prompt);
        this.root.add(group);
        this.mines.push({ seed, group, prompt });
      }
    }

    if (this.cfg.placeEventMountain !== false) {
      await this.placeUfrtsMountain();
      await this.placeEventMountainCave();
    }

    const quarries = this.mines.filter((m) => m.seed.kind === 'stone_quarry').length;
    console.log(
      `[MineEntrance] ${this.mines.length} mines (${quarries} stone quarry) seed=${this.cfg.seed.slice(0, 12)}`,
    );
  }

  /** One Ultimate Fantasy RTS mountain mesh per island */
  private async placeUfrtsMountain(): Promise<void> {
    const mtn = generateHomeIslandMountain(this.cfg.seed, {
      worldSizeM: this.cfg.worldSizeM,
      campX: this.cfg.campX,
      campZ: this.cfg.campZ,
      campClearRadiusM: this.cfg.campClearRadiusM,
      mountainPercent: this.cfg.mountainPercent,
    });
    try {
      const model = await loadModel(mtn.modelPath);
      fitModelToHeight(model, mtn.targetHeightM);
      const y = getTerrainHeightAt(this.cfg.terrainMesh, mtn.x, mtn.z) ?? 10;
      const g = new THREE.Group();
      g.name = mtn.id;
      g.userData.ufrtsMountain = mtn.assetId;
      g.position.set(mtn.x, y, mtn.z);
      g.rotation.y = mtn.rotationY;
      g.add(model);
      this.root.add(g);
      console.log(`[MineEntrance] UFRTS mountain: ${mtn.label} @ (${mtn.x.toFixed(0)}, ${mtn.z.toFixed(0)})`);
    } catch (err) {
      console.warn('[MineEntrance] UFRTS mountain load failed', mtn.modelPath, err);
    }
  }

  /** Optional realistic cave mouth (JJ) near mountain */
  private async placeEventMountainCave(): Promise<void> {
    try {
      const model = await loadModel(WARLORDS_MOUNTAIN_ASSET.path);
      fitModelToHeight(model, Math.min(18, WARLORDS_MOUNTAIN_ASSET.targetHeightM * 0.55));
      const x = 35;
      const z = -(this.cfg.worldSizeM ?? 1024) * 0.26;
      const y = getTerrainHeightAt(this.cfg.terrainMesh, x, z) ?? 8;
      const g = new THREE.Group();
      g.name = 'event_mountain_cave';
      g.position.set(x, y, z);
      g.add(model);
      this.root.add(g);
      console.log('[MineEntrance] Event mountain cave placed (JJ realistic)');
    } catch (err) {
      console.warn('[MineEntrance] JJ mountain cave load failed', err);
    }
  }

  update(dt: number, playerPos: THREE.Vector3 | null, characterRoot?: THREE.Object3D | null): void {
    if (this.mining) {
      this.mineTimer -= dt;
      if (this.mineTimer <= 0) this.finishMineRun();
      return;
    }

    if (!playerPos) {
      for (const m of this.mines) m.prompt.visible = false;
      return;
    }

    let nearest: RuntimeMine | null = null;
    let best = MINE_INTERACT_RANGE_M;
    for (const m of this.mines) {
      const dx = playerPos.x - m.group.position.x;
      const dz = playerPos.z - m.group.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      m.prompt.visible = d <= MINE_INTERACT_RANGE_M;
      if (d < best) {
        best = d;
        nearest = m;
      }
    }
    this.activeMine = nearest;
    this.characterHide = characterRoot ?? null;
  }

  /** Call on E — returns true if mine run started */
  tryInteract(): boolean {
    if (this.mining || !this.activeMine) return false;
    this.mining = true;
    this.mineTimer = MINE_RUN_DURATION_SEC;
    this.cfg.onMineStart?.(this.activeMine.seed.id);
    if (this.characterHide) {
      this.characterVisibleBackup = this.characterHide.visible;
      this.characterHide.visible = false;
    }
    return true;
  }

  get isMining(): boolean {
    return this.mining;
  }

  get canInteract(): boolean {
    return !this.mining && !!this.activeMine;
  }

  private finishMineRun(): void {
    if (!this.activeMine) {
      this.mining = false;
      return;
    }
    const loot = rollMineLootBag(this.activeMine.seed);
    if (this.characterHide) {
      this.characterHide.visible = this.characterVisibleBackup;
    }
    this.cfg.onLoot?.(loot, this.activeMine.seed.id);
    this.cfg.onMineEnd?.(this.activeMine.seed.id);
    this.mining = false;
    this.mineTimer = 0;
    console.log(
      `[MineEntrance] Loot bag (${loot.length} stacks):`,
      loot.map((l) => `${l.name}×${l.quantity}`).join(', '),
    );
  }

  dispose(): void {
    this.cfg.scene.remove(this.root);
    this.mines.length = 0;
  }
}
