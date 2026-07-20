/**
 * Soft-lock frame — yellow corner brackets over the soft-locked target.
 * Buff/debuff magic orbs render above the frame (status-magic pack).
 */
import { StatusEffectIcons } from '@/components/StatusEffectIcons';
import { useEntityStatusEffects } from '@/hooks/useStatusEffects';
import type { SoftLockScreenFrame } from '../player/SoftLockSystem';
import { SOFT_LOCK_CONFIG } from '../player/SoftLockSystem';
import './softLockFrame.css';

interface SoftLockFrameProps {
  frame: SoftLockScreenFrame | null;
}

export function SoftLockFrame({ frame }: SoftLockFrameProps) {
  const entityId = frame?.active && frame.onScreen ? frame.id : null;
  const statusEffects = useEntityStatusEffects(entityId);

  if (!frame?.active || !frame.onScreen) return null;

  const half = frame.size / 2;
  const corner = Math.max(10, frame.size * 0.22);

  return (
    <div
      className="sl-frame-root"
      style={{
        left: frame.screenX,
        top: frame.screenY,
        width: frame.size,
        height: frame.size,
        marginLeft: -half,
        marginTop: -half,
        ['--sl-yellow' as string]: SOFT_LOCK_CONFIG.frameColor,
        ['--sl-glow' as string]: SOFT_LOCK_CONFIG.frameGlow,
        ['--sl-corner' as string]: `${corner}px`,
      }}
      aria-label={`Soft lock: ${frame.name}`}
    >
      <span className="sl-corner sl-tl" />
      <span className="sl-corner sl-tr" />
      <span className="sl-corner sl-bl" />
      <span className="sl-corner sl-br" />

      {/* Magic buff/debuff indicators ABOVE the unit frame */}
      {statusEffects.length > 0 && (
        <div className="sl-status-row" data-testid="softlock-status-icons">
          <StatusEffectIcons effects={statusEffects} size="sm" maxVisible={8} showTimers />
        </div>
      )}

      <div className="sl-nameplate">
        <span className="sl-name">{frame.name}</span>
        {frame.distanceM > 0 && (
          <span className="sl-dist">{frame.distanceM.toFixed(0)}m</span>
        )}
      </div>
      <div className="sl-hp-track">
        <div className="sl-hp-fill" style={{ width: `${Math.round(frame.hp01 * 100)}%` }} />
      </div>
    </div>
  );
}
