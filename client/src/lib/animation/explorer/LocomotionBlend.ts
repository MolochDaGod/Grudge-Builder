/**
 * Phase-synced idle/walk/run weight blend — ported from dangerroom explorer.
 */
import * as THREE from 'three';

interface BlendEntry {
  action: THREE.AnimationAction;
  weight: number;
  target: number;
  stride: boolean;
  duration: number;
}

export interface LocoBlendInput {
  idleId?: string;
  walkId?: string;
  runId?: string;
  speed: number;
  crouch: boolean;
  active: boolean;
  dt: number;
}

const IDLE_AT = 0.06;
const WALK_AT = 0.45;
const RUN_AT = 0.9;
const WEIGHT_K = 14;
const SILENCE_EPS = 0.001;

export class LocomotionBlend {
  private readonly entries = new Map<string, BlendEntry>();
  private phase = 0;

  constructor(private readonly resolveAction: (id: string) => THREE.AnimationAction | null) {}

  update(input: LocoBlendInput): void {
    const { dt } = input;
    let wIdle = 0;
    let wWalk = 0;
    let wRun = 0;
    if (input.active) {
      const s = THREE.MathUtils.clamp(input.speed, 0, 1);
      if (s <= WALK_AT) {
        const t = THREE.MathUtils.clamp((s - IDLE_AT) / (WALK_AT - IDLE_AT), 0, 1);
        wIdle = 1 - t;
        wWalk = t;
      } else {
        const t = THREE.MathUtils.clamp((s - WALK_AT) / (RUN_AT - WALK_AT), 0, 1);
        wWalk = 1 - t;
        wRun = t;
      }
      if (input.crouch) {
        wWalk += wRun;
        wRun = 0;
      }
    }

    const want = new Map<string, number>();
    const request = (id: string | undefined, weight: number, stride: boolean): void => {
      if (!id || weight <= 0) return;
      want.set(id, (want.get(id) ?? 0) + weight);
      let entry = this.entries.get(id);
      if (!entry) {
        const action = this.resolveAction(id);
        if (!action) return;
        if (!action.isRunning()) action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.enabled = true;
        action.setEffectiveWeight(0);
        action.play();
        entry = { action, weight: 0, target: 0, stride, duration: action.getClip().duration };
        this.entries.set(id, entry);
      }
      entry.stride = stride;
    };
    request(input.idleId, wIdle, false);
    request(input.walkId, wWalk, true);
    request(input.runId, wRun, true);

    const walkEntry = input.walkId ? this.entries.get(input.walkId) : undefined;
    const runEntry = input.runId ? this.entries.get(input.runId) : undefined;
    const walkRate = walkEntry ? 1 / Math.max(0.1, walkEntry.duration) : 0;
    const runRate = runEntry ? 1 / Math.max(0.1, runEntry.duration) : 0;
    const denom = wWalk + wRun;
    const naturalRate =
      denom > 0 ? (walkRate * wWalk + runRate * wRun) / denom : walkRate || runRate || 1;
    const speedScale = (input.crouch ? 0.5 : 0.7) + 0.6 * THREE.MathUtils.clamp(input.speed, 0, 1);
    this.phase = (this.phase + naturalRate * speedScale * dt) % 1;

    const k = Math.min(1, WEIGHT_K * dt);
    for (const [id, entry] of this.entries) {
      entry.target = want.get(id) ?? 0;
      entry.weight += (entry.target - entry.weight) * k;
      if (entry.target === 0 && entry.weight < SILENCE_EPS) {
        entry.action.stop();
        this.entries.delete(id);
        continue;
      }
      entry.action.setEffectiveWeight(entry.weight);
      if (entry.stride) {
        actionSetTimeScale(entry.action, 0);
        entry.action.time = this.phase * entry.duration;
      } else {
        actionSetTimeScale(entry.action, 1);
      }
    }
  }

  collapseToDominant(): { action: THREE.AnimationAction; id: string } | null {
    let bestId: string | null = null;
    let bestEntry: BlendEntry | null = null;
    for (const [id, entry] of this.entries) {
      if (!bestEntry || entry.weight > bestEntry.weight) {
        bestId = id;
        bestEntry = entry;
      }
    }
    for (const [id, entry] of this.entries) {
      if (bestId && id === bestId) continue;
      entry.action.stop();
    }
    this.entries.clear();
    if (!bestEntry || !bestId) return null;
    actionSetTimeScale(bestEntry.action, 1);
    bestEntry.action.setEffectiveWeight(1);
    return { action: bestEntry.action, id: bestId };
  }

  stopAll(): void {
    for (const entry of this.entries.values()) entry.action.stop();
    this.entries.clear();
  }

  get driving(): boolean {
    return this.entries.size > 0;
  }
}

function actionSetTimeScale(action: THREE.AnimationAction, scale: number): void {
  action.setEffectiveTimeScale(scale);
}