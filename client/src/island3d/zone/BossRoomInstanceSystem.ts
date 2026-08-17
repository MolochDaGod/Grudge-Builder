/**
 * BossRoomInstanceSystem — load Hoth / woods / desert / lava boss chambers.
 *
 * Entry sources:
 *  - portal on event island (spiral mountain)
 *  - mountain / frozen biome island portal
 *  - random dungeon portal (biome-picked instance map)
 *
 * Player is moved into an offset instance room; E at exit returns to entry stamp.
 */
import * as THREE from 'three';
import {
  BOSS_ROOM_INSTANCES,
  FLOATING_ISLAND_LOAD_ORDER,
  HOTH_BOSS_ROOM,
  pickBossRoomInstance,
  type BossRoomEntrySource,
  type BossRoomInstanceDef,
} from '@shared/definitions/floatingIslandBossAssets';
import {
  loadGlbFirst,
  stripSkyboxFromObject,
} from './gltfSceneUtils';
import {
  prepareBossArenaPlay,
  type BossArenaPlaySurface,
} from './prepareBossArenaPlay';
import { LargeBossFightSystem } from '../combat/LargeBossFightSystem';
import type { WorldFxBus } from '../vfx/WorldFxBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

export interface BossRoomCallbacks {
  onEnter?: (roomId: string, bossId: string, play?: BossArenaPlaySurface) => void;
  onExit?: (roomId: string) => void;
  onPrompt?: (msg: string | null) => void;
  onBossDeath?: (bossId: string) => void;
  onPlayerHit?: (hit: import('../combat/LargeBossFightSystem').LargeBossHitEvent) => void;
}

export interface BossRoomSystemOpts {
  scene: THREE.Scene;
  sectorId: string;
  /** Offset so the room sits away from open zone (m). */
  instanceOffset?: THREE.Vector3;
  cb?: BossRoomCallbacks;
  worldFx?: WorldFxBus | null;
  physics?: PhysicsWorld | null;
}

export class BossRoomInstanceSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private sectorId: string;
  private def: BossRoomInstanceDef = HOTH_BOSS_ROOM;
  private rooms = new Map<string, THREE.Group>();
  private room: THREE.Group | null = null;
  private active = false;
  private entryStamp: THREE.Vector3 | null = null;
  private bossId: string;
  private cb: BossRoomCallbacks;
  private exitPad: THREE.Mesh | null = null;
  private disposed = false;
  private worldFx: WorldFxBus | null;
  private physics: PhysicsWorld | null;
  private playById = new Map<string, BossArenaPlaySurface>();
  /** PIP-style large boss fight inside the chamber */
  public largeBoss: LargeBossFightSystem | null = null;

  constructor(opts: BossRoomSystemOpts) {
    this.scene = opts.scene;
    this.sectorId = opts.sectorId;
    this.cb = opts.cb ?? {};
    this.worldFx = opts.worldFx ?? null;
    this.physics = opts.physics ?? null;
    this.def = pickBossRoomInstance({ sectorId: opts.sectorId }) ?? HOTH_BOSS_ROOM;
    this.bossId = this.def.bossIds[0]!;
    this.root.name = 'BossRoomInstances';
    this.root.position.copy(
      opts.instanceOffset ?? new THREE.Vector3(0, 400, -this.def.targetExtentM * 3),
    );
    this.root.visible = false;
    this.scene.add(this.root);
    void this.preloadSectorRooms();
  }

  get isInside() {
    return this.active;
  }

  get currentBossId() {
    return this.bossId;
  }

  getActivePlay(): BossArenaPlaySurface | null {
    return this.playById.get(this.def.id) ?? null;
  }

  sampleHeight(x: number, z: number): number | null {
    return this.playById.get(this.def.id)?.sampleHeight(x, z) ?? null;
  }

  private async preloadSectorRooms() {
    const wanted = BOSS_ROOM_INSTANCES.filter(
      (d) => d.sectors.includes(this.sectorId) || d.id === this.def.id,
    );
    const list = wanted.length ? wanted : [this.def];
    for (const def of list) {
      await this.ensureRoom(def);
    }
  }

  private async ensureRoom(def: BossRoomInstanceDef): Promise<THREE.Group | null> {
    const cached = this.rooms.get(def.id);
    if (cached) return cached;
    try {
      const urls = FLOATING_ISLAND_LOAD_ORDER[def.loadKey];
      const scene = await loadGlbFirst(urls);
      if (this.disposed) return null;
      if (!scene) throw new Error(`${def.id} GLB missing on CDN and local`);
      if (def.stripSkybox) stripSkyboxFromObject(scene);
      const room = new THREE.Group();
      room.name = def.id;
      room.visible = false;
      room.add(scene);

      const exit = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.2, 8, 20),
        new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          emissive: 0x3b82f6,
          emissiveIntensity: 0.8,
        }),
      );
      exit.rotation.x = Math.PI / 2;
      exit.position.set(0, 1.2, def.targetExtentM * 0.35);
      exit.name = 'BossRoomExit';
      room.add(exit);

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
      room.add(bossMark);

      this.rooms.set(def.id, room);
      this.root.add(room);
      room.updateMatrixWorld(true);
      const play = prepareBossArenaPlay({
        visual: scene,
        physics: this.physics,
        targetExtentM: def.targetExtentM,
      });
      this.playById.set(def.id, play);
      if (!this.room) {
        this.room = room;
        this.exitPad = exit;
      }
      console.log(`[BossRoom] Preloaded ${def.name}`, play.size, play.layerCounts);
      return room;
    } catch (e) {
      console.warn(`[BossRoom] ${def.id} load failed — box arena fallback`, e);
      const room = this.fallbackRoom();
      room.name = def.id;
      room.visible = false;
      this.rooms.set(def.id, room);
      this.root.add(room);
      if (!this.room) this.room = room;
      return room;
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
   * Enter Hoth / woods / desert / lava chamber from a portal.
   * Moves `playerPos` into the instance and stamps return position.
   */
  enter(
    playerPos: THREE.Vector3,
    source: BossRoomEntrySource = 'frozen_biome_portal',
    roomId?: string,
  ): boolean {
    const picked =
      (roomId ? BOSS_ROOM_INSTANCES.find((r) => r.id === roomId) : null) ??
      pickBossRoomInstance({ sectorId: this.sectorId }) ??
      this.def;
    this.def = picked;
    const ready = this.rooms.get(picked.id);
    if (!ready) {
      void this.ensureRoom(picked);
      this.cb.onPrompt?.(`${picked.name} still loading…`);
      return false;
    }
    for (const g of this.rooms.values()) g.visible = false;
    ready.visible = true;
    this.room = ready;
    this.exitPad =
      (ready.getObjectByName('BossRoomExit') as THREE.Mesh | null) ?? this.exitPad;

    this.entryStamp = playerPos.clone();
    this.active = true;
    this.root.visible = true;
    this.bossId =
      this.def.bossIds[Math.floor(Math.random() * this.def.bossIds.length)]!;

    const play = this.playById.get(picked.id);
    const enterLocal = new THREE.Vector3(0, 2, this.def.targetExtentM * 0.3);
    const world = enterLocal.clone();
    this.root.localToWorld(world);
    const groundY = play?.sampleHeight(world.x, world.z, world.y + 80);
    if (groundY != null && Number.isFinite(groundY)) world.y = groundY + 0.08;
    playerPos.copy(world);

    this.cb.onEnter?.(this.def.id, this.bossId, play);
    this.cb.onPrompt?.(
      `${this.def.name} (${source}) — defeat ${this.bossId} · E at blue ring to exit`,
    );

    // Spawn PIP-style large boss at chamber center
    this.spawnLargeBoss();
    return true;
  }

  private spawnLargeBoss(): void {
    this.largeBoss?.dispose();
    const local = new THREE.Vector3(0, 0, -4);
    const world = local.clone();
    this.root.localToWorld(world);
    this.largeBoss = new LargeBossFightSystem({
      scene: this.scene,
      position: world,
      arenaCenter: world.clone(),
      bossId: this.bossId,
      worldFx: this.worldFx,
      cb: {
        onPrompt: (msg) => this.cb.onPrompt?.(msg),
        onPlayerHit: (hit) => this.cb.onPlayerHit?.(hit),
        onDeath: (id) => {
          this.cb.onBossDeath?.(id);
          this.cb.onPrompt?.(`${id} fallen — E at blue ring to exit`);
        },
        onPhase: (p) =>
          this.cb.onPrompt?.(`Boss phase: ${p.name}`),
      },
    });
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
    this.largeBoss?.dispose();
    this.largeBoss = null;
    this.cb.onExit?.(this.def.id);
    this.cb.onPrompt?.('Returned from boss chamber');
    this.entryStamp = null;
    return true;
  }

  update(dt: number, playerPos?: THREE.Vector3) {
    if (!this.active || !this.room) return;
    // Subtle ice shimmer
    this.room.rotation.y += dt * 0.01;
    if (this.exitPad) {
      this.exitPad.rotation.z += dt * 1.2;
    }
    this.largeBoss?.update(dt, playerPos);
  }

  /** Forward player melee hits into large boss (weakness / body). */
  tryHitBoss(point: THREE.Vector3, damage: number): boolean {
    return this.largeBoss?.tryHitWeakness(point, damage) ?? false;
  }

  dispose() {
    this.disposed = true;
    this.largeBoss?.dispose();
    this.largeBoss = null;
    for (const play of this.playById.values()) play.dispose();
    this.playById.clear();
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
