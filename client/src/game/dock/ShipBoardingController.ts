/**
 * ShipBoardingController — Grudge6 on-deck walk, hull climb, swim, dive.
 * Fishing: equipped main-hand fishing pole + harvest-mode LMB (Cast Line).
 * Deck physics follow OpenWaterSailing / BoatBoardingSystem + ShipDeckRig.
 *
 * Colliders / deck terrain / cannons / helm come from ShipInteractable mesh probe
 * (steering wheel up the stairs when the GLB names allow).
 */
import * as THREE from 'three';
import type { CharacterController3D } from '@/island3d/player/CharacterController3D';
import { ShipDeckRig } from '@/game/sailing/ShipDeckPhysics';
import { hasFishingRodEquipped } from '@/game/harvest/HarvestToolActions';
import {
  buildShipInteractable,
  defaultBoardLocalAnchor,
  getDeckBounds,
  isNearDeckEdge,
  isAtHelm,
  nearestCannon,
  sampleLocalDeckY,
  scaleCharacterHeadwear,
  resetCharacterHeadwearScale,
  type ShipInteractable,
  worldDeckHeight,
} from './ShipInteractable';
import type { ShipSize } from '@shared/definitions/shipCatalog';

export type BoardingPhase = 'ashore' | 'deck' | 'fishing' | 'cannon';

export interface ShipBoardingControllerOpts {
  shipRoot: THREE.Group;
  shipSize: ShipSize;
  waterLevel: number;
  character: CharacterController3D;
  riderId?: string;
  /** Hat scale on deck (default 1.2 = +20% so tricorn doesn't clip beams). */
  hatScale?: number;
  onCannonFire?: (side: number, localPos: THREE.Vector3) => void;
  onPrompt?: (msg: string | null) => void;
}

export class ShipBoardingController {
  readonly shipRoot: THREE.Group;
  readonly interactable: ShipInteractable;
  readonly deckRig: ShipDeckRig;
  private character: CharacterController3D;
  private localAnchor: THREE.Vector3;
  private waterLevel: number;
  private riderId: string;
  private phase: BoardingPhase = 'ashore';
  private fishingTimer = 0;
  private helmKeys = false;
  private hatScale: number;
  private onCannonFire?: (side: number, localPos: THREE.Vector3) => void;
  private onPrompt?: (msg: string | null) => void;
  private _muzzleFlash: THREE.Mesh | null = null;
  private _flashTimer = 0;

  constructor(opts: ShipBoardingControllerOpts) {
    this.shipRoot = opts.shipRoot;
    this.character = opts.character;
    this.waterLevel = opts.waterLevel;
    this.riderId = opts.riderId ?? 'player';
    this.hatScale = opts.hatScale ?? 1.2;
    this.onCannonFire = opts.onCannonFire;
    this.onPrompt = opts.onPrompt;

    this.interactable = buildShipInteractable(opts.shipRoot, opts.shipSize);
    this.localAnchor = defaultBoardLocalAnchor(this.interactable.bounds);
    this.deckRig = new ShipDeckRig({ deck: opts.shipRoot });

    this.character.registerClimbMeshes(this.interactable.climbColliders);
    this.character.setWaterLevel(opts.waterLevel);
    this.character.setDeckCastLineHandler(() => this.tryCastLine());

    if (typeof console !== 'undefined') {
      console.info(
        '[ShipBoard] layout',
        this.interactable.probedFromMesh ? 'mesh-probed' : 'catalog-fallback',
        {
          deckY: this.interactable.bounds.deckY,
          upper: this.interactable.bounds.upperDeckY,
          helm: this.interactable.helmLocal.toArray(),
          cannons: this.interactable.cannons.length,
          stairs: this.interactable.stairsLocal.length,
        },
      );
    }
  }

  get isOnDeck(): boolean {
    return this.phase === 'deck' || this.phase === 'fishing' || this.phase === 'cannon';
  }

  board(): boolean {
    if (this.isOnDeck) return false;
    this.phase = 'deck';
    // Snap feet to probed main deck
    this.localAnchor.y = this.interactable.bounds.deckY + 0.05;
    this.deckRig.addRider({
      id: this.riderId,
      rider: this.character.model,
      localAnchor: this.localAnchor.clone(),
      grip: 0.92,
      tiltFollow: 0.55,
    });
    this.character.enterShipDeckMode(this.shipRoot, this.interactable.bounds, {
      sampleLocalY: (lx, lz) => sampleLocalDeckY(this.interactable, lx, lz),
      deckColliders: this.interactable.deckColliders,
    });
    // Calvin / pirate hat: +20% so tricorn clears deck beams
    scaleCharacterHeadwear(this.character.model, this.hatScale);
    this.character.stateMachine?.transition('sailing');
    this.onPrompt?.('WASD walk deck · W at helm to sail · F fire cannon · Space jump off');
    return true;
  }

  disembark(groundRoot: THREE.Object3D, dockPosition: THREE.Vector3): THREE.Vector3 | null {
    if (!this.isOnDeck) return null;
    this.deckRig.removeRider(this.riderId);
    resetCharacterHeadwearScale(this.character.model);
    this.character.exitShipDeckMode(groundRoot);
    this.phase = 'ashore';
    this.onPrompt?.(null);
    const off = dockPosition.clone();
    off.x += 8;
    return off;
  }

  /** Cast line when main-hand fishing pole is equipped and character is at deck edge. */
  tryCastLine(): boolean {
    if (!this.isOnDeck || this.phase === 'fishing') return false;
    if (!hasFishingRodEquipped(this.character.equipment)) return false;

    const pos = this.character.model.position;
    if (!isNearDeckEdge(this.shipRoot, this.interactable.bounds, pos)) return false;

    this.phase = 'fishing';
    this.fishingTimer = 2.8;
    const sm = this.character.stateMachine;
    if (sm?.canTransitionTo('fishing')) sm.transition('fishing');
    if (sm?.canTransitionTo('fishing_idle')) sm.transition('fishing_idle');
    sm?.transition('fishing_casting');
    this.character.animations?.play('fishing_cast', { loop: false });
    setTimeout(() => {
      if (this.phase === 'fishing') {
        sm?.transition('fishing_waiting');
        this.character.animations?.play('fishing_wait');
      }
    }, 600);
    return true;
  }

  /** Fire nearest broadside cannon (attached to boat mesh or synthetic mount). */
  tryFireCannon(): boolean {
    if (!this.isOnDeck) return false;
    const cannon = nearestCannon(this.interactable, this.localAnchor, 2.4);
    if (!cannon) return false;
    const now = performance.now();
    if (now - cannon.lastFireAt < cannon.cooldownMs) {
      this.onPrompt?.('Cannon reloading…');
      return false;
    }
    cannon.lastFireAt = now;
    this.phase = 'cannon';
    this.character.animations?.play('attack', { loop: false });
    this.spawnMuzzleFlash(cannon.mesh);
    this.onCannonFire?.(cannon.side, cannon.local.clone());
    this.onPrompt?.(`Cannon fire · ${cannon.side < 0 ? 'port' : 'starboard'}`);
    setTimeout(() => {
      if (this.phase === 'cannon') this.phase = 'deck';
    }, 400);
    return true;
  }

  update(dt: number, keys: Set<string>, cameraYaw: number): void {
    // Helm = standing at steering wheel (up stairs on upper deck) + holding W
    const atHelm = isAtHelm(this.interactable, this.localAnchor, 2.0);
    this.helmKeys = atHelm && keys.has('w');

    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0 && this._muzzleFlash) {
        this._muzzleFlash.visible = false;
      }
    }

    if (this.isOnDeck) {
      // F = fire cannon when near one; also board prompt off-deck
      if (keys.has('f') || keys.has('F')) {
        this.tryFireCannon();
      }

      if (this.character.mode === 'harvest' && this.phase !== 'fishing') {
        this.updateDeckMovement(dt, keys, cameraYaw);
      } else if (this.phase === 'deck' || this.phase === 'cannon') {
        // Always allow deck walk when boarded (not only harvest mode)
        this.updateDeckMovement(dt, keys, cameraYaw);
      }

      // Sync foot Y to multi-level deck terrain
      this.localAnchor.y = sampleLocalDeckY(
        this.interactable,
        this.localAnchor.x,
        this.localAnchor.z,
      ) + 0.05;
      this.deckRig.updateRiderLocalAnchor(this.riderId, this.localAnchor);
      this.deckRig.update(dt);

      if (this.fishingTimer > 0) {
        this.fishingTimer -= dt;
        if (this.fishingTimer <= 0 && this.phase === 'fishing') {
          this.character.stateMachine?.transition('fishing_catching');
          this.character.animations?.play('fishing_catch', { loop: false });
          this.phase = 'deck';
          setTimeout(() => {
            this.character.stateMachine?.transition('fishing_idle');
          }, 1200);
        }
      }

      // HUD prompt
      const nearCannon = nearestCannon(this.interactable, this.localAnchor, 2.4);
      if (atHelm) {
        this.onPrompt?.(this.helmKeys ? 'Sailing — hold W at helm' : 'Helm · hold W to sail · stairs from main deck');
      } else if (nearCannon) {
        this.onPrompt?.('F — fire cannon');
      } else {
        this.onPrompt?.('Deck · walk to stairs/helm · Space jump off');
      }

      if (keys.has(' ')) {
        this.jumpOffDeck();
      }
      return;
    }

    this.tryClimbAboard();
  }

  private updateDeckMovement(dt: number, keys: Set<string>, cameraYaw: number): void {
    const bounds = this.interactable.bounds;
    const speed = (keys.has('shift') ? 1.6 : 1) * 4.5;
    const fwd = (keys.has('w') ? 1 : 0) + (keys.has('s') ? -1 : 0);
    const side = (keys.has('q') || keys.has('a') ? -1 : 0) + (keys.has('e') || keys.has('d') ? 1 : 0);

    if (fwd !== 0 || side !== 0) {
      // At helm, W is reserved for sail thrust — still allow slight reposition
      const moveFwd = this.helmKeys && fwd > 0 ? 0 : fwd;
      if (moveFwd !== 0 || side !== 0) {
        const angle = Math.atan2(side, moveFwd || 0.001) + cameraYaw;
        this.localAnchor.x += Math.sin(angle) * speed * dt;
        this.localAnchor.z -= Math.cos(angle) * speed * dt;
      }
      this.localAnchor.x = THREE.MathUtils.clamp(
        this.localAnchor.x,
        -bounds.halfWidth + 0.4,
        bounds.halfWidth - 0.4,
      );
      this.localAnchor.z = THREE.MathUtils.clamp(
        this.localAnchor.z,
        -bounds.halfLength + 0.5,
        bounds.halfLength - 0.5,
      );
      const anim = keys.has('shift') ? 'run' : 'walk';
      this.character.animations?.play(anim);
      const shipYaw = new THREE.Euler().setFromQuaternion(
        this.shipRoot.getWorldQuaternion(new THREE.Quaternion()),
        'YXZ',
      ).y;
      this.character.model.rotation.y = shipYaw + (moveFwd !== 0 || side !== 0
        ? Math.atan2(side, moveFwd || 0.001) + cameraYaw
        : 0);
    } else if (this.phase === 'deck') {
      this.character.animations?.play('idle');
    }

    this.deckRig.updateRiderLocalAnchor(this.riderId, this.localAnchor);
  }

  wantsHelm(): boolean {
    return this.helmKeys;
  }

  private jumpOffDeck(): void {
    this.deckRig.removeRider(this.riderId);
    resetCharacterHeadwearScale(this.character.model);
    this.character.exitShipDeckMode();
    this.phase = 'ashore';
    this.onPrompt?.(null);
    const jump = this.character.model.position.clone();
    jump.y = this.waterLevel - 0.3;
    this.character.teleportTo(jump);
    this.character.setMovementState('swimming_surface');
    this.character.stateMachine?.transition('idle');
  }

  /**
   * Overboard recovery (worldSurfaceLayers):
   *  - Swim next to hull + hold Space → climb wall (CharacterController)
   *  - Climbing near deck Y + W/Space → mantle onto deck and board
   *  - Swimming already at deck lip → W boards
   */
  private tryClimbAboard(): void {
    const ms = this.character.getMovementState();
    if (ms !== 'climbing' && ms !== 'swimming_surface' && ms !== 'swimming_underwater') return;

    const shipWorld = this.shipRoot.getWorldPosition(this._shipWorld);
    const pos = this.character.model.position;
    const dist = pos.distanceTo(shipWorld);
    if (dist > 18) return;

    const deckH = worldDeckHeight(
      this.shipRoot,
      this.interactable.bounds,
      pos.x,
      pos.z,
      this.interactable,
    );
    if (deckH === null) return;

    const keys = this.character.getKeys();
    const wantUp = keys.has('w') || keys.has(' ') || keys.has('W');
    if (!wantUp) return;

    // Mantle: climbing and feet within ~1.1 m of deck → board
    if (ms === 'climbing' && pos.y >= deckH - 1.1) {
      this.board();
      return;
    }

    // Already at gunwale while swimming (wave lift / shallow)
    if (
      (ms === 'swimming_surface' || ms === 'swimming_underwater')
      && pos.y >= deckH - 1.1
      && dist < 10
    ) {
      this.board();
      return;
    }

    // Prompt while climbing hull below deck
    if (ms === 'climbing' && pos.y < deckH - 1.1) {
      this.onPrompt?.('Climb up · W to mantle onto deck');
    }
  }

  private readonly _shipWorld = new THREE.Vector3();

  private spawnMuzzleFlash(cannonMesh: THREE.Object3D): void {
    if (!this._muzzleFlash) {
      this._muzzleFlash = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.9 }),
      );
      this._muzzleFlash.name = 'cannon_muzzle_flash';
      this.shipRoot.add(this._muzzleFlash);
    }
    const wp = new THREE.Vector3();
    cannonMesh.getWorldPosition(wp);
    this.shipRoot.worldToLocal(wp);
    this._muzzleFlash.position.copy(wp);
    this._muzzleFlash.visible = true;
    this._flashTimer = 0.12;

    // CodePen KwaNNap barrel smoke + trail (fleet-consistent muzzle FX)
    try {
      // Lazy import avoids circular deps with island3d barrel
      void import('@/island3d/vfx/WorldFxBus').then(({ getWorldFxBus }) => {
        const bus = getWorldFxBus();
        if (!bus) return;
        const worldMuzzle = new THREE.Vector3();
        cannonMesh.getWorldPosition(worldMuzzle);
        // Barrel along local +X (procedural cannons use rotation.z = PI/2)
        const dir = new THREE.Vector3(1, 0, 0);
        dir.applyQuaternion(cannonMesh.getWorldQuaternion(new THREE.Quaternion()));
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        bus.barrelMuzzle(worldMuzzle, dir.normalize());
      });
    } catch {
      /* VFX optional */
    }
  }

  dispose(): void {
    this.character.setDeckCastLineHandler(null);
    resetCharacterHeadwearScale(this.character.model);
    this.deckRig.dispose();
    this.interactable.dispose();
    this.character.clearClimbMeshes(this.interactable.climbColliders);
    this.character.exitShipDeckMode();
    if (this._muzzleFlash) {
      this.shipRoot.remove(this._muzzleFlash);
      this._muzzleFlash.geometry.dispose();
      (this._muzzleFlash.material as THREE.Material).dispose();
      this._muzzleFlash = null;
    }
  }
}

export function shipSizeFromAccount(accountId: string): ShipSize {
  try {
    const raw = localStorage.getItem(`grudge-ships:${accountId || 'guest'}`);
    if (raw) {
      const roster = JSON.parse(raw) as { activeShipId: string | null; ships: { id: string; size: ShipSize }[] };
      const active = roster.ships.find((s) => s.id === roster.activeShipId) ?? roster.ships[0];
      if (active?.size) return active.size;
    }
  } catch { /* ignore */ }
  return 'rowboat';
}
