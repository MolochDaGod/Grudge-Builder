/**
 * CinemaFpsBudget — film budget for LeviathanOceanCinema.
 *
 * Cinema reads at 48–60 FPS. Targeting 100 FPS used to treat a healthy 60 FPS
 * cut as failure, then yank DPR/post/rain mid-shot (hitch + missing visuals).
 * Pressure only on sustained <~32 FPS. DPR is never part of this state —
 * resizing the framebuffer mid-cut is a visible jump.
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

const TARGET_MS = 1000 / 48; // 20.8 ms — film/cinematic, not esports 100 fps
const DROP_MS = 1000 / 32; // only drop when sustained under ~32 fps
const RECOVER_MS = 1000 / 45;

export class CinemaFpsBudget {
  private emaMs = TARGET_MS;
  private coolDown = 0;
  private pressure = 0;
  private readonly baseQuality: CinemaBudgetQuality;
  private readonly baseDpr: number;

  constructor(baseQuality: CinemaBudgetQuality) {
    this.baseQuality = baseQuality;
    this.baseDpr = baseQuality === 'high' ? 1.25 : baseQuality === 'medium' ? 1.1 : 1.0;
  }

  /** Call once per frame with raw dt (seconds). */
  sample(dt: number): FpsBudgetState {
    const ms = Math.min(50, Math.max(1, dt * 1000));
    this.emaMs = this.emaMs * 0.92 + ms * 0.08;
    this.coolDown = Math.max(0, this.coolDown - dt);

    if (this.coolDown <= 0) {
      if (this.emaMs > DROP_MS) {
        this.pressure = Math.min(2, this.pressure + 1);
        this.coolDown = 1.6;
      } else if (this.emaMs < RECOVER_MS && this.pressure > 0) {
        this.pressure = Math.max(0, this.pressure - 1);
        this.coolDown = 2.4;
      }
    }

    const p = this.pressure;
    // Keep bloom/SMAA on unless the machine is actually dying
    let postQuality: QualityPreset =
      this.baseQuality === 'low' ? 'low' : this.baseQuality === 'medium' ? 'medium' : 'high';
    if (p >= 2 && postQuality === 'high') postQuality = 'medium';
    else if (p >= 2 && postQuality === 'medium') postQuality = 'medium';

    return {
      frameMs: this.emaMs,
      fps: 1000 / Math.max(1, this.emaMs),
      pressure: p,
      dprCap: this.baseDpr,
      postQuality,
      rainScale: p >= 2 ? 0.7 : p === 1 ? 0.85 : 1,
      tornadoShells: p >= 2 ? 2 : 3,
      allowLightningBolt: p < 2,
      dustScale: p >= 2 ? 0.7 : 1,
    };
  }

  getPressure(): number {
    return this.pressure;
  }
}
