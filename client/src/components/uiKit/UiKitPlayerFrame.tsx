/**
 * Production player unit frame — craftpix frame from ui.grudge-studio.com
 */
import type { CSSProperties } from 'react';
import { UI_FRAMES } from '@/lib/uiKit/craftpixAssets';

export interface UiKitPlayerFrameProps {
  name: string;
  level?: number;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  portraitUrl?: string | null;
  className?: string;
  elite?: boolean;
}

export function UiKitPlayerFrame({
  name,
  level = 1,
  hp,
  maxHp,
  mp,
  maxMp,
  portraitUrl,
  className = '',
  elite,
}: UiKitPlayerFrameProps) {
  const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const mpPct =
    mp != null && maxMp != null
      ? Math.max(0, Math.min(100, (mp / Math.max(1, maxMp)) * 100))
      : null;
  const hpClass =
    hpPct <= 25
      ? 'uikit-bar uikit-bar--hp uikit-bar--crit'
      : hpPct <= 50
        ? 'uikit-bar uikit-bar--hp uikit-bar--warn'
        : 'uikit-bar uikit-bar--hp';

  const frameBg = elite ? UI_FRAMES.unitElite : UI_FRAMES.unitBackground;

  return (
    <div
      className={`uikit-player-frame uikit-root ${className}`}
      style={{ '--uikit-frame-bg': `url(${frameBg})` } as CSSProperties}
    >
      <div className="uikit-player-frame__face">
        {portraitUrl ? (
          <img src={portraitUrl} alt="" />
        ) : (
          <span style={{ fontSize: 22, color: 'var(--uikit-gold)' }}>⚔</span>
        )}
      </div>
      <div className="uikit-player-frame__info">
        <div className="uikit-player-frame__name">
          {name}
          <span className="uikit-player-frame__lvl">Lv.{level}</span>
        </div>
        <div className={hpClass} title={`HP ${hp}/${maxHp}`}>
          <i style={{ width: `${hpPct}%` }} />
        </div>
        {mpPct != null && (
          <div className="uikit-bar uikit-bar--mp" title={`MP ${mp}/${maxMp}`}>
            <i style={{ width: `${mpPct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default UiKitPlayerFrame;
