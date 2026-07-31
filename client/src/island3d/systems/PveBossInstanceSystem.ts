/**
 * PveBossInstanceSystem — Warlords / home-island PvE boss chambers.
 *
 * Enter via:
 *   · Evil mountain triad cave doorway (home island + lobby)
 *   · Hidden Mountain City under-mountain door (thornwood_wilds)
 *   · Warlords sector dungeon portals (optional host)
 *
 * Spawns a PIP-style LargeBossFightSystem in an offset instance room
 * (same pattern as BossRoomInstanceSystem / Hoth).
 */
import * as THREE from 'three';
import {
  LargeBossFightSystem,
  type LargeBossHitEvent,
} from '../combat/LargeBossFightSystem';
import type { WorldFxBus } from '../vfx/WorldFxBus';
import {
  PIP_SKULL_BOSS_FIGHT,
  type PipBossFightConfig,
} from '@shared/definitions/pipSkullBossFight';

export type PveInstanceSource =
  | 'evil_mountain_door'
  | 'hidden_mountain_city_door'
  | 'warlords_dungeon_portal'
  | 'sector_boss_arena'
  | 'home_island_mine';

export interface PveBossInstanceCallbacks {
  onEnter?: (dungeonId: string, dungeonName: string, source: PveInstanceSource) => void;
  onExit?: (dungeonId: string) => void;
  onBossDeath?: (bossId: string, dungeonId: string) => void;
  onPlayerHit?: (hit: LargeBossHitEvent) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface PveBossInstanceOpts {
  scene: THREE.Scene;
  worldFx?: WorldFxBus | null;
  /** World offset for the instance chamber (m) */
  instanceOffset?: THREE.Vector3;
  cfg?: PipBossFightConfig;
  cb?: PveBossInstanceCallbacks;
}

export class PveBossInstanceSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private worldFx: WorldFxBus | null;
  private cfg: PipBossFightConfig;
  private cb: PveBossInstanceCallbacks;
  private chamber: THREE.Group | null = null;
  private exitPad: THREE.Mesh | null = null;
  private active = false;
  private entryStamp: THREE.Vector3 | null = null;
  private dungeonId = '';
  private dungeonName = '';
  private source: PveInstanceSource = 'evil_mountain_door';
  public largeBoss: LargeBossFightSystem | null = null;
  private disposed = false;

  constructor(opts: PveBossInstanceOpts) {
    this.scene = opts.scene;
    this.worldFx = opts.worldFx ?? null;
    this.cfg = opts.cfg ?? PIP_SKULL_BOSS_FIGHT;
    this.cb = opts.cb ?? {};
    this.root.name = 'PveBossInstances';
    this.root.position.copy(
      opts.instanceOffset ?? new THREE.Vector3(0, 520, -280),
    );
    this.root.visible = false;
    this.scene.add(this.root);
    this.buildChamber();
  }

  get isInside(): boolean {
    return this.active;
  }

  get currentDungeonId(): string {
    return this.dungeonId;
  }

  private buildChamber(): void {
    const g = new THREE.Group();
    g.name = 'PveBossChamber';

    // Floor — dark stone arena
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(32, 34, 1.2, 32),
      new THREE.MeshStandardMaterial({
        color: 0x2a2420,
        roughness: 0.92,
        metalness: 0.08,
      }),
    );
    floor.position.y = -0.5;
    floor.receiveShadow = true;

    // Ring wall suggestion
    const wall = new THREE.Mesh(
      new THREE.TorusGeometry(30, 1.2, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0x3f3a36,
        roughness: 0.95,
        emissive: 0x1a0a0a,
        emissiveIntensity: 0.25,
      }),
    );
    wall.rotation.x = Math.PI / 2;
    wall.position.y = 1.2;

    // Ceiling haze light
    const lamp = new THREE.PointLight(0xff6622, 1.4, 60);
    lamp.position.set(0, 18, 0);

    // Exit pad
    const exit = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.22, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
      }),
    );
    exit.rotation.x = Math.PI / 2;
    exit.position.set(0, 0.4, 22);
    exit.name = 'PveBossExit';
    this.exitPad = exit;

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 4, 6),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.55,
      }),
    );
    marker.position.set(0, 2.2, 22);

    g.add(floor, wall, lamp, exit, marker);
    this.chamber = g;
    this.root.add(g);
  }

  /**
   * Enter PvE boss instance from a mountain / dungeon doorway.
   * Teleports `playerPos` into the chamber and spawns large boss.
   */
  enter(
    playerPos: THREE.Vector3,
    opts: {
      dungeonId: string;
      dungeonName: string;
      source: PveInstanceSource;
      bossId?: string;
    },
  ): boolean {
    if (this.disposed || !this.chamber) return false;

    this.entryStamp = playerPos.clone();
    this.dungeonId = opts.dungeonId;
    this.dungeonName = opts.dungeonName;
    this.source = opts.source;
    this.active = true;
    this.root.visible = true;

    // Place player near entrance of chamber
    const enterLocal = new THREE.Vector3(0, 1.2, 18);
    const world = enterLocal.clone();
    this.root.localToWorld(world);
    playerPos.copy(world);

    this.spawnBoss(opts.bossId ?? `${opts.dungeonId}_colossus`);

    this.cb.onEnter?.(opts.dungeonId, opts.dungeonName, opts.source);
    this.cb.onPrompt?.(
      `${opts.dungeonName} — defeat the colossus · E at blue ring to exit`,
    );

    try {
      window.dispatchEvent(
        new CustomEvent('grudge:pve-boss-instance', {
          detail: {
            type: 'enter',
            dungeonId: opts.dungeonId,
            dungeonName: opts.dungeonName,
            source: opts.source,
          },
        }),
      );
    } catch {
      /* */
    }
    return true;
  }

  private spawnBoss(bossId: string): void {
    this.largeBoss?.dispose();
    const local = new THREE.Vector3(0, 0, -4);
    const world = local.clone();
    this.root.localToWorld(world);
    this.largeBoss = new LargeBossFightSystem({
      scene: this.scene,
      position: world,
      arenaCenter: world.clone(),
      bossId,
      cfg: this.cfg,
      worldFx: this.worldFx,
      cb: {
        onPrompt: (msg) => this.cb.onPrompt?.(msg),
        onPlayerHit: (hit) => this.cb.onPlayerHit?.(hit),
        onDeath: (id) => {
          this.cb.onBossDeath?.(id, this.dungeonId);
          this.cb.onPrompt?.(
            `${id} defeated — E at blue ring to leave ${this.dungeonName}`,
          );
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:pve-boss-instance', {
                detail: {
                  type: 'death',
                  bossId: id,
                  dungeonId: this.dungeonId,
                },
              }),
            );
          } catch {
            /* */
          }
        },
        onPhase: (p) => this.cb.onPrompt?.(`Phase: ${p.name}`),
      },
    });
  }

  /** Exit if near pad (or force). */
  tryExit(playerPos: THREE.Vector3, range = 5.5, force = false): boolean {
    if (!this.active || !this.entryStamp) return false;
    if (!force && this.exitPad) {
      const exitWorld = new THREE.Vector3();
      this.exitPad.getWorldPosition(exitWorld);
      if (playerPos.distanceTo(exitWorld) > range) return false;
    }

    playerPos.copy(this.entryStamp);
    this.active = false;
    this.root.visible = false;
    this.largeBoss?.dispose();
    this.largeBoss = null;
    const id = this.dungeonId;
    this.cb.onExit?.(id);
    this.cb.onPrompt?.(`Returned from ${this.dungeonName || 'instance'}`);
    this.entryStamp = null;

    try {
      window.dispatchEvent(
        new CustomEvent('grudge:pve-boss-instance', {
          detail: { type: 'exit', dungeonId: id },
        }),
      );
    } catch {
      /* */
    }
    return true;
  }

  update(dt: number, playerPos?: THREE.Vector3): void {
    if (!this.active) return;
    if (this.exitPad) this.exitPad.rotation.z += dt * 1.3;
    this.largeBoss?.update(dt, playerPos);
  }

  tryHitBoss(point: THREE.Vector3, damage: number): boolean {
    return this.largeBoss?.tryHitWeakness(point, damage) ?? false;
  }

  dispose(): void {
    this.disposed = true;
    this.largeBoss?.dispose();
    this.largeBoss = null;
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
