/**
 * BossRoomInstanceSystem — load Hoth (and similar) boss chambers as instances.
 *
 * Entry sources:
 *  - portal on event island (spiral mountain)
 *  - mountain / frozen biome island portal
 *  - random dungeon portal
 *
 * Player is moved into an offset instance room; E at exit returns to entry stamp.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  HOTH_BOSS_ROOM,
  type BossRoomEntrySource,
  type BossRoomInstanceDef,
} from '@shared/definitions/floatingIslandBossAssets';
import { fitObjectExtent, stripSkyboxFromObject } from './gltfSceneUtils';

export interface BossRoomCallbacks {
  onEnter?: (roomId: string, bossId: string) => void;
  onExit?: (roomId: string) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface BossRoomSystemOpts {
  scene: THREE.Scene;
  sectorId: string;
  /** Offset so the room sits away from open zone (m). */
  instanceOffset?: THREE.Vector3;
  cb?: BossRoomCallbacks;
}

export class BossRoomInstanceSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private def: BossRoomInstanceDef = HOTH_BOSS_ROOM;
  private room: THREE.Group | null = null;
  private active = false;
  private entryStamp: THREE.Vector3 | null = null;
  private bossId: string;
  private cb: BossRoomCallbacks;
  private exitPad: THREE.Mesh | null = null;
  private disposed = false;

  constructor(opts: BossRoomSystemOpts) {
    this.scene = opts.scene;
    this.cb = opts.cb ?? {};
    this.bossId = this.def.bossIds[0]!;
    this.root.name = 'BossRoomInstances';
    this.root.position.copy(
      opts.instanceOffset ?? new THREE.Vector3(0, 400, -this.def.targetExtentM * 3),
    );
    this.root.visible = false;
    this.scene.add(this.root);
    void this.preload();
  }

  get isInside() {
    return this.active;
  }

  get currentBossId() {
    return this.bossId;
  }

  private async preload() {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(assetUrl(this.def.glbPath));
      if (this.disposed) return;
      const scene = gltf.scene;
      if (this.def.stripSkybox) stripSkyboxFromObject(scene);
      fitObjectExtent(scene, this.def.targetExtentM);
      this.room = new THREE.Group();
      this.room.name = this.def.id;
      this.room.add(scene);

      // Exit portal
      const exit = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.2, 8, 20),
        new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          emissive: 0x3b82f6,
          emissiveIntensity: 0.8,
        }),
      );
      exit.rotation.x = Math.PI / 2;
      exit.position.set(0, 1.2, this.def.targetExtentM * 0.35);
      exit.name = 'BossRoomExit';
      this.exitPad = exit;
      this.room.add(exit);

      // Boss marker
      const bossMark = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 3.5, 6),
        new THREE.MeshStandardMaterial({
          color: 0xe0f2fe,
          emissive: 0x7dd3fc,
          emissiveIntensity: 0.5,
        }),
      );
      bossMark.position.set(0, 2, -4);
      bossMark.name = 'BossSpawnMarker';
      this.room.add(bossMark);

      this.root.add(this.room);
      console.log(`[BossRoom] Preloaded ${this.def.name}`);
    } catch (e) {
      console.warn('[BossRoom] Hoth load failed — box arena fallback', e);
      this.room = this.fallbackRoom();
      this.root.add(this.room);
    }
  }

  private fallbackRoom(): THREE.Group {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(40, 1, 40),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }),
    );
    floor.position.y = 0;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(40, 12, 1),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
    );
    wall.position.set(0, 6, -20);
    g.add(floor, wall);
    return g;
  }

  /**
   * Enter Hoth (or active def) from a portal.
   * Moves `playerPos` into the instance and stamps return position.
   */
  enter(
    playerPos: THREE.Vector3,
    source: BossRoomEntrySource = 'frozen_biome_portal',
  ): boolean {
    if (!this.room) {
      this.cb.onPrompt?.('Boss chamber still loading…');
      return false;
    }
    this.entryStamp = playerPos.clone();
    this.active = true;
    this.root.visible = true;
    this.bossId =
      this.def.bossIds[Math.floor(Math.random() * this.def.bossIds.length)]!;

    // Place player near entrance of room (root offset space)
    const enterLocal = new THREE.Vector3(0, 2, this.def.targetExtentM * 0.3);
    const world = enterLocal.clone();
    this.root.localToWorld(world);
    playerPos.copy(world);

    this.cb.onEnter?.(this.def.id, this.bossId);
    this.cb.onPrompt?.(
      `${this.def.name} (${source}) — defeat ${this.bossId} · E at blue ring to exit`,
    );
    return true;
  }

  /** Exit if near exit pad. */
  tryExit(playerPos: THREE.Vector3, range = 5): boolean {
    if (!this.active || !this.exitPad || !this.entryStamp) return false;
    const exitWorld = new THREE.Vector3();
    this.exitPad.getWorldPosition(exitWorld);
    if (playerPos.distanceTo(exitWorld) > range) return false;

    playerPos.copy(this.entryStamp);
    this.active = false;
    this.root.visible = false;
    this.cb.onExit?.(this.def.id);
    this.cb.onPrompt?.('Returned from boss chamber');
    this.entryStamp = null;
    return true;
  }

  update(dt: number) {
    if (!this.active || !this.room) return;
    // Subtle ice shimmer
    this.room.rotation.y += dt * 0.01;
    if (this.exitPad) {
      this.exitPad.rotation.z += dt * 1.2;
    }
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
  }
}
