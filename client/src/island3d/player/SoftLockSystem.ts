/**
 * SoftLockSystem — Tab cycles soft-lock targets (not hard camera lock).
 *
 * Soft lock: aim assist / attack priority + yellow UI frame over target.
 * Hard focus (RMB click-toggle) remains separate strafe-lock.
 */
import * as THREE from 'three';

export interface SoftLockTarget {
  id: string;
  name: string;
  kind: 'creature' | 'boss' | 'npc' | 'camp';
  /** World position (chest-ish height already applied by provider) */
  position: THREE.Vector3;
  hp?: number;
  maxHp?: number;
  level?: number;
}

export interface SoftLockScreenFrame {
  active: boolean;
  id: string | null;
  name: string;
  kind: SoftLockTarget['kind'] | null;
  /** CSS pixel coords relative to canvas container */
  screenX: number;
  screenY: number;
  /** Frame size in px (scales with distance) */
  size: number;
  onScreen: boolean;
  hp01: number;
  distanceM: number;
}

export const SOFT_LOCK_CONFIG = {
  /** Max soft-lock range (m) */
  maxRange: 36,
  /** Prefer targets in camera frustum / forward cone */
  forwardConeDeg: 110,
  /** Base UI frame size */
  baseFramePx: 72,
  minFramePx: 48,
  maxFramePx: 120,
  /** Yellow border accent */
  frameColor: '#facc15',
  frameGlow: 'rgba(250, 204, 21, 0.55)',
} as const;

export class SoftLockSystem {
  private lockedId: string | null = null;
  private lastTargets: SoftLockTarget[] = [];
  private readonly _toTarget = new THREE.Vector3();
  private readonly _fwd = new THREE.Vector3();
  private readonly _ndc = new THREE.Vector3();

  get lockedTargetId(): string | null {
    return this.lockedId;
  }

  clear(): void {
    this.lockedId = null;
  }

  /**
   * Tab / Shift+Tab — cycle soft-lock among live candidates.
   * First Tab with no lock → nearest in cone; subsequent → next in ring.
   */
  cycle(
    candidates: SoftLockTarget[],
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
    reverse = false,
  ): SoftLockTarget | null {
    const sorted = this.sortCandidates(candidates, playerPos, camera);
    this.lastTargets = sorted;
    if (sorted.length === 0) {
      this.lockedId = null;
      return null;
    }

    if (!this.lockedId) {
      this.lockedId = sorted[0].id;
      return sorted[0];
    }

    const idx = sorted.findIndex((t) => t.id === this.lockedId);
    let next: number;
    if (idx < 0) {
      next = 0;
    } else if (reverse) {
      next = (idx - 1 + sorted.length) % sorted.length;
    } else {
      next = (idx + 1) % sorted.length;
    }
    this.lockedId = sorted[next].id;
    return sorted[next];
  }

  /** Keep lock if still valid; else clear or reacquire nearest. */
  refresh(
    candidates: SoftLockTarget[],
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
  ): SoftLockTarget | null {
    const sorted = this.sortCandidates(candidates, playerPos, camera);
    this.lastTargets = sorted;
    if (sorted.length === 0) {
      this.lockedId = null;
      return null;
    }
    if (this.lockedId) {
      const still = sorted.find((t) => t.id === this.lockedId);
      if (still) return still;
    }
    // Lost target — clear (player re-Tabs to acquire)
    this.lockedId = null;
    return null;
  }

  getCurrent(): SoftLockTarget | null {
    if (!this.lockedId) return null;
    return this.lastTargets.find((t) => t.id === this.lockedId) ?? null;
  }

  projectToScreen(
    target: SoftLockTarget | null,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number,
    playerPos: THREE.Vector3,
  ): SoftLockScreenFrame {
    const empty: SoftLockScreenFrame = {
      active: false,
      id: null,
      name: '',
      kind: null,
      screenX: 0,
      screenY: 0,
      size: SOFT_LOCK_CONFIG.baseFramePx,
      onScreen: false,
      hp01: 1,
      distanceM: 0,
    };
    if (!target) return empty;

    const dist = playerPos.distanceTo(target.position);
    this._ndc.copy(target.position).project(camera);
    const behind = this._ndc.z > 1;
    const sx = (this._ndc.x * 0.5 + 0.5) * canvasWidth;
    const sy = (-this._ndc.y * 0.5 + 0.5) * canvasHeight;
    const onScreen =
      !behind &&
      sx > -40 &&
      sy > -40 &&
      sx < canvasWidth + 40 &&
      sy < canvasHeight + 40;

    // Closer = larger frame
    const t = THREE.MathUtils.clamp(1 - dist / SOFT_LOCK_CONFIG.maxRange, 0, 1);
    const size = THREE.MathUtils.lerp(
      SOFT_LOCK_CONFIG.minFramePx,
      SOFT_LOCK_CONFIG.maxFramePx,
      t,
    );

    const hp01 =
      target.maxHp && target.maxHp > 0
        ? THREE.MathUtils.clamp((target.hp ?? target.maxHp) / target.maxHp, 0, 1)
        : 1;

    return {
      active: true,
      id: target.id,
      name: target.name,
      kind: target.kind,
      screenX: sx,
      screenY: sy,
      size,
      onScreen,
      hp01,
      distanceM: dist,
    };
  }

  private sortCandidates(
    candidates: SoftLockTarget[],
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
  ): SoftLockTarget[] {
    camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-6) this._fwd.set(0, 0, -1);
    else this._fwd.normalize();

    const halfCone = (SOFT_LOCK_CONFIG.forwardConeDeg * Math.PI) / 180 / 2;
    const scored: Array<SoftLockTarget & { score: number }> = [];

    for (const t of candidates) {
      const dist = playerPos.distanceTo(t.position);
      if (dist > SOFT_LOCK_CONFIG.maxRange || dist < 0.4) continue;
      this._toTarget.copy(t.position).sub(playerPos);
      this._toTarget.y = 0;
      if (this._toTarget.lengthSq() < 1e-6) continue;
      this._toTarget.normalize();
      const ang = Math.acos(THREE.MathUtils.clamp(this._fwd.dot(this._toTarget), -1, 1));
      // Prefer forward cone, still allow full circle at lower priority
      const conePenalty = ang <= halfCone ? 0 : ang * 8;
      const score = dist + conePenalty;
      scored.push({ ...t, position: t.position.clone(), score });
    }

    scored.sort((a, b) => a.score - b.score);
    return scored.map(({ score: _s, ...rest }) => rest);
  }
}
