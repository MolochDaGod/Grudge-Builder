/**
 * TutorialWakeCinematic — post-load shipwreck open:
 * slow zoom → injured ground (Mixamo pack) → get-up → injured idle harvest mode.
 *
 * Prefer injured anim pack; mesh tilt only if clips missing.
 */
import * as THREE from 'three';
import type { CharacterController3D } from '../player/CharacterController3D';
import { SHIPWRECK_WAKE } from '@shared/definitions/tutorialShipwreckScene';

export type WakeCinematicPhase =
  | 'idle'
  | 'zoom'
  | 'prone_hold'
  | 'standup'
  | 'done';

export interface WakeCinematicOptions {
  camera: THREE.PerspectiveCamera;
  character: CharacterController3D;
  onComplete?: () => void;
  skip?: boolean;
  /** True when injured_ground / death clip is loaded */
  hasInjuredGround?: boolean;
  /** True when get-up clip is loaded */
  hasInjuredGetUp?: boolean;
  /**
   * Optional Island3DEngine cinematic hooks (WebGL Insights sole-owner law).
   * When set, wake path calls beginCinematicCamera / endCinematicCamera.
   */
  onCinematicBegin?: () => void;
  onCinematicEnd?: () => void;
  /**
   * Optional world origin of shipwreck cove (pirate-islands). When set, camera
   * keys are offset; otherwise uses character position after teleport.
   */
  wakeOrigin?: { x: number; y: number; z: number };
}

function v3(p: { x: number; y: number; z: number }) {
  return new THREE.Vector3(p.x, p.y, p.z);
}

function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export class TutorialWakeCinematic {
  private phase: WakeCinematicPhase = 'idle';
  private elapsed = 0;
  private camera: THREE.PerspectiveCamera;
  private character: CharacterController3D;
  private onComplete?: () => void;
  private startCam = v3(SHIPWRECK_WAKE.cameraStart);
  private endCam = v3(SHIPWRECK_WAKE.cameraEnd);
  private lookAt = v3(SHIPWRECK_WAKE.lookAt);
  private spawn = v3(SHIPWRECK_WAKE.spawn);
  private root: THREE.Object3D | null = null;
  private skipOnStart = false;
  private useAnimGround = false;
  private useAnimGetUp = false;
  private getUpStarted = false;
  private onCinematicBegin?: () => void;
  private onCinematicEnd?: () => void;

  constructor(opts: WakeCinematicOptions) {
    this.camera = opts.camera;
    this.character = opts.character;
    this.onComplete = opts.onComplete;
    this.skipOnStart = !!opts.skip;
    this.useAnimGround = !!opts.hasInjuredGround
      || !!opts.character.animations?.hasClip('death');
    this.useAnimGetUp = !!opts.hasInjuredGetUp
      || !!opts.character.animations?.hasClip('hard_landing');
    this.onCinematicBegin = opts.onCinematicBegin;
    this.onCinematicEnd = opts.onCinematicEnd;
  }

  get active(): boolean {
    return this.phase !== 'idle' && this.phase !== 'done';
  }

  get phaseName(): WakeCinematicPhase {
    return this.phase;
  }

  start(): void {
    if (this.skipOnStart) {
      this.finishImmediate();
      return;
    }
    this.elapsed = 0;
    this.phase = 'zoom';
    this.getUpStarted = false;

    this.character.teleportTo?.(this.spawn.clone());
    const pos = this.character.getPosition();
    this.spawn.set(pos.x, pos.y, pos.z);
    this.lookAt.set(pos.x, pos.y + 0.35, pos.z);
    this.endCam.set(pos.x + 3.5, pos.y + 3.8, pos.z + 5.5);
    this.startCam.set(pos.x + 28, pos.y + 38, pos.z + 42);

    this.root = this.character.model ?? null;

    // Prefer Mixamo injured ground clip over mesh tilt
    if (this.useAnimGround) {
      this.character.playInjuredGround();
      this.applyPronePose(0);
    } else {
      this.applyPronePose(1);
    }
    this.lockPlayer(true);

    this.camera.position.copy(this.startCam);
    this.camera.lookAt(this.lookAt);
    this.onCinematicBegin?.();
  }

  skip(): void {
    this.finishImmediate();
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.elapsed += dt;

    if (this.phase === 'zoom') {
      const t = easeInOut(this.elapsed / SHIPWRECK_WAKE.zoomDurationSec);
      this.camera.position.lerpVectors(this.startCam, this.endCam, t);
      this.camera.lookAt(this.lookAt);
      if (!this.useAnimGround) this.applyPronePose(1);
      if (this.elapsed >= SHIPWRECK_WAKE.zoomDurationSec) {
        this.phase = 'prone_hold';
        this.elapsed = 0;
      }
      return;
    }

    if (this.phase === 'prone_hold') {
      this.camera.position.copy(this.endCam);
      this.camera.lookAt(this.lookAt);
      if (!this.useAnimGround) this.applyPronePose(1);
      if (this.elapsed >= SHIPWRECK_WAKE.proneHoldSec) {
        this.phase = 'standup';
        this.elapsed = 0;
        this.getUpStarted = false;
      }
      return;
    }

    if (this.phase === 'standup') {
      const t = easeInOut(this.elapsed / SHIPWRECK_WAKE.standUpSec);
      if (this.useAnimGetUp) {
        if (!this.getUpStarted) {
          this.getUpStarted = true;
          this.character.playInjuredGetUp();
        }
        this.applyPronePose(0);
      } else {
        this.applyPronePose(1 - t);
      }
      const standCam = this.endCam.clone().lerp(
        new THREE.Vector3(this.spawn.x + 0.5, this.spawn.y + 5.5, this.spawn.z + 8),
        t,
      );
      this.camera.position.copy(standCam);
      this.camera.lookAt(this.spawn.x, this.spawn.y + 1.4, this.spawn.z);
      if (this.elapsed >= SHIPWRECK_WAKE.standUpSec) {
        this.finishPlayable();
      }
    }
  }

  private applyPronePose(amount: number): void {
    // Fallback when injured_ground clip is missing
    const root = this.root ?? this.character.model;
    if (!root) return;
    const child = root.children[0] ?? root;
    child.rotation.x = (-Math.PI / 2) * amount;
    child.rotation.z = 0.12 * amount;
    if (child !== root) {
      child.position.y = amount > 0.05 ? 0.2 : 0;
    }
  }

  private lockPlayer(locked: boolean): void {
    this.character.cinematicLock = locked;
    if (locked) this.character.getKeys().clear();
  }

  private finishPlayable(): void {
    this.applyPronePose(0);
    this.lockPlayer(false);
    this.onCinematicEnd?.();
    // Stay on injured idle if pack loaded
    if (this.character.animations?.hasClip('idle')) {
      this.character.animations.play('idle', { loop: true });
    }
    void this.character.setControlMode('harvest').catch(() => {
      this.character.mode = 'harvest';
    });
    this.phase = 'done';
    this.onComplete?.();
  }

  private finishImmediate(): void {
    this.applyPronePose(0);
    this.lockPlayer(false);
    this.onCinematicEnd?.();
    if (this.character.animations?.hasClip('idle')) {
      this.character.animations.play('idle', { loop: true });
    }
    void this.character.setControlMode('harvest').catch(() => {
      this.character.mode = 'harvest';
    });
    const pos = this.character.getPosition();
    this.camera.position.set(pos.x + 0.5, pos.y + 5.5, pos.z + 8);
    this.camera.lookAt(pos.x, pos.y + 1.4, pos.z);
    this.phase = 'done';
    this.onComplete?.();
  }
}
