/**
 * Eased body lunge — pairs joint clips with root motion (dangerroom Controller.dash).
 */
import * as THREE from 'three';
import type { MotionProfile } from './motionMath';
import { dashDurationForClip, profileToMetres } from './motionMath';

export class MotionDash {
  private active = false;
  private elapsed = 0;
  private duration = 0.24;
  private reach = 0;
  private settle = 0;
  private impactAt = 0.5;
  private impactFired = false;
  private justImpact = false;
  private readonly origin = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  get isActive(): boolean {
    return this.active;
  }

  /** Start a lunge from `position` along `direction`. */
  start(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    distance: number,
    duration: number,
    bounceBack = 0,
    impactAt = 0.5,
  ): void {
    const flat = new THREE.Vector3(direction.x, 0, direction.z);
    if (flat.lengthSq() < 1e-4 || duration <= 0) return;
    flat.normalize();
    this.active = true;
    this.elapsed = 0;
    this.duration = duration;
    this.reach = distance;
    this.settle = distance - bounceBack;
    this.impactAt = THREE.MathUtils.clamp(impactAt, 0.05, 0.95);
    this.impactFired = false;
    this.origin.copy(position);
    this.dir.copy(flat);
  }

  /** Drive body from a motion-math profile (dangerroom motionAttack). */
  startFromProfile(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    profile: MotionProfile,
    clipDur = 0,
  ): void {
    const { peakM, settleM } = profileToMetres(profile);
    const dur = dashDurationForClip(clipDur);
    this.start(position, direction, peakM, dur, peakM - settleM, profile.impactAt);
  }

  consumeImpact(): boolean {
    const v = this.justImpact;
    this.justImpact = false;
    return v;
  }

  /** Apply eased displacement; returns true while dash owns movement. */
  apply(position: THREE.Vector3, dt: number): boolean {
    if (!this.active) return false;
    this.elapsed += dt;
    const tau = THREE.MathUtils.clamp(this.elapsed / this.duration, 0, 1);
    const disp = this.displacement(tau);
    position.x = this.origin.x + this.dir.x * disp;
    position.z = this.origin.z + this.dir.z * disp;
    if (!this.impactFired && tau >= this.impactAt) {
      this.impactFired = true;
      this.justImpact = true;
    }
    if (tau >= 1) this.active = false;
    return true;
  }

  cancel(): void {
    this.active = false;
  }

  private displacement(tau: number): number {
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    const impact = this.impactAt;
    if (tau <= impact) {
      return this.reach * easeOut(impact > 0 ? tau / impact : 1);
    }
    const k = (tau - impact) / (1 - impact);
    return THREE.MathUtils.lerp(this.reach, this.settle, easeOut(k));
  }
}