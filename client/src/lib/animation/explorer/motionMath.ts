/**
 * Motion-math (MM) profiles — ported from dangerroom explorer Studio.ts.
 * 100 MM units = 1 metre of body displacement.
 */
import * as THREE from 'three';

export const MM_TO_M = 0.01;

/** Per-attack motion descriptor in motion-math units. */
export interface MotionProfile {
  /** Forward displacement at strike (negative = retreating attack). */
  peak: number;
  /** Optional recoil target after peak (net settle behind start when negative). */
  settle?: number;
  /** Fraction of dash duration where the strike lands. */
  impactAt: number;
}

/** Attack2 (Z): committed lunge-through that recoils behind start (+100 → -50). */
export const ATTACK2_MOTION: MotionProfile = { peak: 100, settle: -50, impactAt: 0.45 };

/** Attack3 (X): poke that retreats on the same beat (-50). */
export const ATTACK3_MOTION: MotionProfile = { peak: -50, impactAt: 0.5 };

/** Combo follow-up advance per non-opener swing (+55 MM ≈ 0.55m). */
export const COMBO_ADVANCE_MM = 55;

export function mmToMetres(mm: number): number {
  return mm * MM_TO_M;
}

export function profileToMetres(profile: MotionProfile): { peakM: number; settleM: number } {
  const peakM = profile.peak * MM_TO_M;
  const settleM = (profile.settle ?? profile.peak) * MM_TO_M;
  return { peakM, settleM };
}

/** Combo stage → motion profile (opener closes gap; hits 1-2 use +/- MM). */
export function comboMotionProfile(stage: number): MotionProfile {
  if (stage <= 0) {
    return { peak: COMBO_ADVANCE_MM, impactAt: 0.5 };
  }
  if (stage === 1) return ATTACK2_MOTION;
  return ATTACK3_MOTION;
}

export function dashDurationForClip(clipDur: number, fallback = 0.24): number {
  return clipDur > 0
    ? THREE.MathUtils.clamp(clipDur * 0.7, 0.18, 0.5)
    : fallback;
}