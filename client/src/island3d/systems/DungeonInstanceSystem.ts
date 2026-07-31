/**
 * DungeonInstanceSystem — spawn dungeon portals as Three.js node instances
 * and build modular floors from a kit catalog (Unity → CDN pieces).
 *
 * SSOT definitions: lore.DUNGEON_DEFINITIONS
 * CDN kit (planned): models/dungeons/warlords-dungeon-kit.json + pieces/
 * Entrances today: CavePortal3D / EvilMountainTriad / mine entrances /
 * HiddenMountainCity (Thornwood Wilds — boss-gated under-mountain door).
 *
 * On enter, Island3DEngine routes most doorways into
 * `PveBossInstanceSystem` (PIP-style large boss chamber) for home-island
 * evil mountain doors and Warlords era dungeon portals.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  DUNGEON_DEFINITIONS,
  type DungeonDefinition,
  type SectorPosition,
  pickDungeonForSector,
} from '@shared/definitions/lore';
import { FLEET_URLS } from '@shared/fleet/manifest';
import { r2CdnUrl } from '@shared/fleet/r2Layout';

export interface DungeonPortalInstance {
  def: DungeonDefinition;
  root: THREE.Group;
  position: THREE.Vector3;
  interactionRange: number;
}

export interface DungeonKitPiece {
  id: string;
  glb: string;
  nodeName?: string;
  category: 'wall' | 'floor' | 'prop' | 'entrance' | 'pillar';
}

export interface DungeonKitCatalog {
  version: string;
  pieces: DungeonKitPiece[];
}

const DEFAULT_KIT_URL = r2CdnUrl('models/dungeons/warlords-dungeon-kit.json');

export class DungeonInstanceSystem {
  private scene: THREE.Scene;
  private loader = new GLTFLoader();
  private portals: DungeonPortalInstance[] = [];
  private kit: DungeonKitCatalog | null = null;
  private floorRoot: THREE.Group | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get portalList(): readonly DungeonPortalInstance[] {
    return this.portals;
  }

  /** Load optional modular kit catalog from CDN (404 → empty kit). */
  async loadKit(url = DEFAULT_KIT_URL): Promise<DungeonKitCatalog | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.kit = { version: '0', pieces: [] };
        return this.kit;
      }
      this.kit = (await res.json()) as DungeonKitCatalog;
      return this.kit;
    } catch {
      this.kit = { version: '0', pieces: [] };
      return this.kit;
    }
  }

  /**
   * Spawn a portal mesh for a dungeon definition.
   * Uses def.entranceModel (SPA/CDN path).
   */
  async spawnPortal(
    def: DungeonDefinition,
    position: THREE.Vector3,
    scale = 1,
  ): Promise<DungeonPortalInstance> {
    const root = new THREE.Group();
    root.name = `dungeon_portal_${def.id}`;
    root.position.copy(position);

    const url = def.entranceModel.startsWith('http')
      ? def.entranceModel
      : def.entranceModel.startsWith('/')
        ? `${FLEET_URLS.assets}${def.entranceModel}`
        : r2CdnUrl(def.entranceModel);

    try {
      const gltf = await this.loader.loadAsync(url);
      gltf.scene.scale.setScalar(scale);
      root.add(gltf.scene);
    } catch {
      // Fallback marker so portals still exist without mesh
      const geo = new THREE.TorusGeometry(1.2, 0.15, 8, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8844ff,
        emissive: 0x4422aa,
        emissiveIntensity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      root.add(mesh);
    }

    this.scene.add(root);
    const inst: DungeonPortalInstance = {
      def,
      root,
      position: position.clone(),
      interactionRange: 5,
    };
    this.portals.push(inst);
    return inst;
  }

  /** Seed a portal for a sector using lore pick rules. */
  async spawnForSector(
    sector: SectorPosition,
    difficulty: number,
    position: THREE.Vector3,
  ): Promise<DungeonPortalInstance | null> {
    const def = pickDungeonForSector(sector, difficulty);
    if (!def) return null;
    return this.spawnPortal(def, position);
  }

  /** Nearest portal within range of player world position. */
  findInteractable(
    playerPos: THREE.Vector3,
    rangeMul = 1,
  ): DungeonPortalInstance | null {
    let best: DungeonPortalInstance | null = null;
    let bestD = Infinity;
    for (const p of this.portals) {
      const d = p.position.distanceTo(playerPos);
      if (d <= p.interactionRange * rangeMul && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Build a simple floor from kit pieces (instanced-ready group).
   * When kit is empty, creates a procedural floor plane grid as placeholder.
   */
  async buildFloorInstance(
    def: DungeonDefinition,
    seed: string,
    origin: THREE.Vector3,
  ): Promise<THREE.Group> {
    this.clearFloor();
    const root = new THREE.Group();
    root.name = `dungeon_floor_${def.id}_${seed}`;
    root.position.copy(origin);

    const rng = mulberry32(hashSeed(seed + def.id));
    const rooms = Math.max(1, def.floors);

    if (this.kit && this.kit.pieces.length > 0) {
      const floors = this.kit.pieces.filter((p) => p.category === 'floor');
      const walls = this.kit.pieces.filter((p) => p.category === 'wall');
      for (let i = 0; i < rooms * 4; i++) {
        const piece = floors[Math.floor(rng() * floors.length)] || walls[0];
        if (!piece) break;
        try {
          const gltf = await this.loader.loadAsync(
            piece.glb.startsWith('http') ? piece.glb : r2CdnUrl(piece.glb),
          );
          const obj = gltf.scene.clone(true);
          obj.position.set((i % 4) * 6 - 9, 0, Math.floor(i / 4) * 6);
          root.add(obj);
        } catch {
          /* skip missing piece */
        }
      }
    } else {
      // Placeholder kit: colored planes per room
      for (let i = 0; i < rooms; i++) {
        const geo = new THREE.PlaneGeometry(10, 10);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.75 - i * 0.08, 0.4, 0.25),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(i * 12, 0, 0);
        root.add(mesh);
      }
    }

    this.scene.add(root);
    this.floorRoot = root;
    return root;
  }

  listDefinitions(): DungeonDefinition[] {
    return [...DUNGEON_DEFINITIONS];
  }

  clearPortals(): void {
    for (const p of this.portals) {
      this.scene.remove(p.root);
    }
    this.portals = [];
  }

  clearFloor(): void {
    if (this.floorRoot) {
      this.scene.remove(this.floorRoot);
      this.floorRoot = null;
    }
  }

  dispose(): void {
    this.clearPortals();
    this.clearFloor();
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
