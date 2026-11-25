import type { MotionProfile } from '@/lib/animation/explorer/motionMath';
import type { SoftLockScreenFrame } from './SoftLockSystem';

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
  actionBar?: Record<number, string | null>;
  /** Last used hotbar slot (for visual feedback in dr-hotbar) */
  lastUsedSlot?: number;
  /** Cooldown progress per slot (0 = ready, 1 = on cooldown) for overlay */
  cooldowns?: Record<number, number>;
  /** Player windup bar — only when catalog windup ≥ 0.12 s */
  castName?: string | null;
  castProgress?: number;
  castRemainingSec?: number;
  /** Hostile wind-ups (wildlife / camps) */
  enemyCasts?: Array<{ id: string; name: string; progress: number; remainingSec: number }>;
  /** Soft-lock target frame (Tab cycle) — yellow border UI */
  softLock?: SoftLockScreenFrame | null;
  softLockTargetId?: string | null;
  softLockTargetName?: string | null;
  /** Heal/buff first click: 1=self, 2–4=allies. Null until that click. */
  allyPick?: Array<{ slot: number; label: string; id: string; hpFrac?: number }> | null;
  allyPickSkill?: string | null;
  /** Stun totem: first click, LMB places AOE zone */
  zonePickSkill?: string | null;
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
  actionBar: { 1: null, 2: null, 3: null, 4: null, 5: null },
  lastUsedSlot: undefined,
  cooldowns: {},
  castName: null,
  castProgress: 0,
  castRemainingSec: 0,
  enemyCasts: [],
  softLock: null,
  softLockTargetId: null,
  softLockTargetName: null,
  allyPick: null,
  allyPickSkill: null,
  zonePickSkill: null,
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