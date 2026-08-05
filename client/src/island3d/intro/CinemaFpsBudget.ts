/**
 * CinemaFpsBudget — target ~100 FPS WebGL budget for LeviathanOceanCinema.
 *
 * Rolling frame-time EMA → quality steps (DPR, post SMAA/bloom, rain, tornado segs).
 * Does not invent a second cinema stack; only knobs already owned by the intro.
 */
import type { QualityPreset } from '@/island3d/render/PostProcessing';

export type CinemaBudgetQuality = 'low' | 'medium' | 'high';

export type FpsBudgetState = {
  /** EMA frame ms */
  frameMs: number;
  /** Instant FPS estimate */
  fps: number;
  /** 0..3 pressure (0 = headroom, 3 = critical) */
  pressure: number;
  /** Effective render DPR cap */
  dprCap: number;
  postQuality: QualityPreset;
  rainScale: number;
  tornadoShells: number;
  allowLightningBolt: boolean;
  dustScale: number;
};

const TARGET_MS = 1000 / 100; // 10 ms → 100 fps
const COMFORT_MS = 1000 / 90; // allow mild 90–100 band before drop

export class CinemaFpsBudget {
  private emaMs = TARGET_MS;
  private coolDown = 0;
  private pressure = 0;
  private readonly baseQuality: CinemaBudgetQuality;
  private readonly baseDpr: number;

  constructor(baseQuality: CinemaBudgetQuality) {
    this.baseQuality = baseQuality;
    this.baseDpr = baseQuality === 'high' ? 1.5 : baseQuality === 'medium' ? 1.25 : 1.0;
  }

  /** Call once per frame with raw dt (seconds). */
  sample(dt: number): FpsBudgetState {
    const ms = Math.min(50, Math.max(1, dt * 1000));
    this.emaMs = this.emaMs * 0.9 + ms * 0.1;
    this.coolDown = Math.max(0, this.coolDown - dt);

    if (this.coolDown <= 0) {
      if (this.emaMs > COMFORT_MS * 1.35) {
        this.pressure = Math.min(3, this.pressure + 1);
        this.coolDown = 0.85;
      } else if (this.emaMs < TARGET_MS * 0.92 && this.pressure > 0) {
        this.pressure = Math.max(0, this.pressure - 1);
        this.coolDown = 1.4;
      }
    }

    // Never go above base quality knobs
    const p = this.pressure;
    const dprCap = Math.max(0.85, this.baseDpr - p * 0.2);
    let postQuality: QualityPreset =
      this.baseQuality === 'low' ? 'low' : this.baseQuality === 'medium' ? 'medium' : 'high';
    if (p >= 2) postQuality = 'low';
    else if (p === 1 && postQuality === 'high') postQuality = 'medium';

    return {
      frameMs: this.emaMs,
      fps: 1000 / Math.max(1, this.emaMs),
      pressure: p,
      dprCap,
      postQuality,
      rainScale: p >= 3 ? 0.35 : p === 2 ? 0.55 : p === 1 ? 0.75 : 1,
      tornadoShells: p >= 2 ? 2 : 3,
      allowLightningBolt: p < 3,
      dustScale: p >= 2 ? 0.5 : 1,
    };
  }

  getPressure(): number {
    return this.pressure;
  }
}
