/**
 * ShipBoardingController — Grudge6 on-deck walk, hull climb, swim, dive.
 * Fishing: equipped main-hand fishing pole + harvest-mode LMB (Cast Line).
 * Deck physics follow OpenWaterSailing / BoatBoardingSystem + ShipDeckRig.
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
  type ShipInteractable,
  worldDeckHeight,
} from './ShipInteractable';
import type { ShipSize } from '@shared/definitions/shipCatalog';

export type BoardingPhase = 'ashore' | 'deck' | 'fishing';

export interface ShipBoardingControllerOpts {
  shipRoot: THREE.Group;
  shipSize: ShipSize;
  waterLevel: number;
  character: CharacterController3D;
  riderId?: string;
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

  constructor(opts: ShipBoardingControllerOpts) {
    this.shipRoot = opts.shipRoot;
    this.character = opts.character;
    this.waterLevel = opts.waterLevel;
    this.riderId = opts.riderId ?? 'player';
    const bounds = getDeckBounds(opts.shipSize);
    this.interactable = buildShipInteractable(opts.shipRoot, opts.shipSize);
    this.localAnchor = defaultBoardLocalAnchor(bounds);
    this.deckRig = new ShipDeckRig({ deck: opts.shipRoot });

    this.character.registerClimbMeshes(this.interactable.climbColliders);
    this.character.setWaterLevel(opts.waterLevel);
    this.character.setDeckCastLineHandler(() => this.tryCastLine());
  }

  get isOnDeck(): boolean {
    return this.phase === 'deck' || this.phase === 'fishing';
  }

  board(): boolean {
    if (this.isOnDeck) return false;
    this.phase = 'deck';
    this.deckRig.addRider({
      id: this.riderId,
      rider: this.character.model,
      localAnchor: this.localAnchor.clone(),
      grip: 0.92,
      tiltFollow: 0.55,
    });
    this.character.enterShipDeckMode(this.shipRoot, this.interactable.bounds);
    this.character.stateMachine?.transition('sailing');
    return true;
  }

  disembark(groundRoot: THREE.Object3D, dockPosition: THREE.Vector3): THREE.Vector3 | null {
    if (!this.isOnDeck) return null;
    this.deckRig.removeRider(this.riderId);
    this.character.exitShipDeckMode(groundRoot);
    this.phase = 'ashore';
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

  update(dt: number, keys: Set<string>, cameraYaw: number): void {
    this.helmKeys = keys.has('w') && Math.abs(this.localAnchor.z) > this.interactable.bounds.halfLength * 0.55;

    if (this.isOnDeck) {
      if (this.character.mode === 'harvest' && this.phase !== 'fishing') {
        this.updateDeckMovement(dt, keys, cameraYaw);
      }
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
      const angle = Math.atan2(side, fwd) + cameraYaw;
      this.localAnchor.x += Math.sin(angle) * speed * dt;
      this.localAnchor.z -= Math.cos(angle) * speed * dt;
      this.localAnchor.x = THREE.MathUtils.clamp(this.localAnchor.x, -bounds.halfWidth + 0.4, bounds.halfWidth - 0.4);
      this.localAnchor.z = THREE.MathUtils.clamp(this.localAnchor.z, -bounds.halfLength + 0.5, bounds.halfLength - 0.5);
      const anim = keys.has('shift') ? 'run' : 'walk';
      this.character.animations?.play(anim);
      const shipYaw = new THREE.Euler().setFromQuaternion(
        this.shipRoot.getWorldQuaternion(new THREE.Quaternion()),
        'YXZ',
      ).y;
      this.character.model.rotation.y = shipYaw + angle;
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
    this.character.exitShipDeckMode();
    this.phase = 'ashore';
    const jump = this.character.model.position.clone();
    jump.y = this.waterLevel - 0.3;
    this.character.teleportTo(jump);
    this.character.setMovementState('swimming_surface');
    this.character.stateMachine?.transition('idle');
  }

  private tryClimbAboard(): void {
    const ms = this.character.getMovementState();
    if (ms !== 'climbing' && ms !== 'swimming_surface' && ms !== 'swimming_underwater') return;
    const dist = this.character.model.position.distanceTo(
      this.shipRoot.getWorldPosition(new THREE.Vector3()),
    );
    if (dist > 14) return;
    const deckH = worldDeckHeight(
      this.shipRoot,
      this.interactable.bounds,
      this.character.model.position.x,
      this.character.model.position.z,
    );
    if (deckH === null) return;
    if (this.character.model.position.y < deckH - 0.5) return;
    if (!this.character.getKeys().has('w')) return;
    this.board();
  }

  dispose(): void {
    this.character.setDeckCastLineHandler(null);
    this.deckRig.dispose();
    this.interactable.dispose();
    this.character.clearClimbMeshes(this.interactable.climbColliders);
    this.character.exitShipDeckMode();
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