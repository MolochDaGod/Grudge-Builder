/**
 * Dangerroom explorer animator bridge — LocomotionBlend gait + one-shot crossfades.
 */
import * as THREE from 'three';
import type { AnimationManager, AnimState } from '@/island3d/player/AnimationManager';
import { LocomotionBlend } from './LocomotionBlend';

const LOCO_FADE = 0.12;

export class ExplorerAnimDriver {
  private readonly locoBlend: LocomotionBlend;
  private locoActive = false;
  private oneShotUntil = 0;
  private smoothedSpeed = 0;

  constructor(private readonly animations: AnimationManager) {
    this.locoBlend = new LocomotionBlend((id) => this.animations.getAction(id as AnimState) ?? null);
  }

  /** Weight-blended idle/walk/run (dangerroom LocomotionBlend). */
  updateLocomotion(opts: {
    moving: boolean;
    sprinting: boolean;
    dt: number;
    crouch?: boolean;
  }): void {
    if (this.oneShotUntil > 0) {
      this.oneShotUntil -= opts.dt;
      if (this.oneShotUntil > 0) {
        this.locoBlend.stopAll();
        this.locoActive = false;
        return;
      }
    }

    const target = opts.moving ? (opts.sprinting ? 1 : 0.55) : 0;
    this.smoothedSpeed += (target - this.smoothedSpeed) * Math.min(1, 12 * opts.dt);

    const idleId = this.pickLocoId('idle', 'idle_alt');
    const walkId = this.pickLocoId('walk');
    const runId = this.pickLocoId('run');

    this.locoActive = !!(idleId || walkId || runId);
    this.locoBlend.update({
      idleId,
      walkId,
      runId,
      speed: this.smoothedSpeed,
      crouch: opts.crouch ?? false,
      active: this.locoActive,
      dt: opts.dt,
    });
  }

  /** Play a one-shot attack/skill; collapses blend then crossfades. */
  playOneShot(state: AnimState, duration = 0.5): void {
    const dominant = this.locoBlend.collapseToDominant();
    const action = this.animations.getAction(state);
    if (!action) {
      this.animations.play(state, { loop: false });
      this.oneShotUntil = duration;
      return;
    }
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(1);
    if (dominant) {
      action.crossFadeFrom(dominant.action, LOCO_FADE, false);
    }
    action.play();
    this.oneShotUntil = duration;
    this.locoActive = false;
  }

  isOneShotActive(): boolean {
    return this.oneShotUntil > 0;
  }

  dispose(): void {
    this.locoBlend.stopAll();
  }

  private pickLocoId(...candidates: AnimState[]): string | undefined {
    for (const c of candidates) {
      if (this.animations.hasClip(c)) return c;
    }
    return undefined;
  }
}