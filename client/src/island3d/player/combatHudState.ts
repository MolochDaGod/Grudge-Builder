import type { MotionProfile } from '@/lib/animation/explorer/motionMath';

/** HUD snapshot pushed from CharacterController3D (dangerroom Hud pattern). */
export interface CombatHudSnapshot {
  combatMode: boolean;
  focusEnabled: boolean;
  crosshairVisible: boolean;
  comboStage: number;
  motionProfile: MotionProfile | null;
  motionLabel: string;
  isDashing: boolean;
  hitMarker: number;
  spread: number;
  rangeState: 'close' | 'optimal' | 'far' | 'none';
  /** Current form for special weapons (0-2), switched with Shift+F1/F2/F3 */
  currentForm?: number;
  /** Current action bar slots 1-5 for display/use */
  actionBar?: Record<number, string>;
}

export const EMPTY_COMBAT_HUD: CombatHudSnapshot = {
  combatMode: false,
  focusEnabled: false,
  crosshairVisible: false,
  comboStage: 0,
  motionProfile: null,
  motionLabel: '—',
  isDashing: false,
  hitMarker: 0,
  spread: 0,
  rangeState: 'none',
  currentForm: 0,
  actionBar: {1: 'slot1', 2: 'slot2', 3: 'slot3', 4: 'slot4', 5: 'slot5'},
};

export function formatMotionLabel(profile: MotionProfile | null): string {
  if (!profile) return '—';
  const peak = profile.peak >= 0 ? `+${profile.peak}` : `${profile.peak}`;
  if (profile.settle !== undefined && profile.settle !== profile.peak) {
    const settle = profile.settle >= 0 ? `+${profile.settle}` : `${profile.settle}`;
    return `${peak} → ${settle} MM`;
  }
  return `${peak} MM`;
}