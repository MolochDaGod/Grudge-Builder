/**
 * Craftpix action / inventory slot — assets from ui.grudge-studio.com
 */
import type { CSSProperties } from 'react';
import { UI_SLOTS } from '@/lib/uiKit/craftpixAssets';

export interface UiKitActionSlotProps {
  keyLabel?: string;
  label?: string;
  iconUrl?: string | null;
  emoji?: string;
  qty?: number;
  active?: boolean;
  size?: number;
  title?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'action' | 'inventory';
}

export function UiKitActionSlot({
  keyLabel,
  label,
  iconUrl,
  emoji,
  qty,
  active,
  size = 52,
  title,
  onClick,
  className = '',
  variant = 'action',
}: UiKitActionSlotProps) {
  const bg = variant === 'inventory' ? UI_SLOTS.inventoryBg : UI_SLOTS.actionBg;
  const style = {
    '--uikit-slot-size': `${size}px`,
    '--uikit-slot-bg': `url(${bg})`,
    '--uikit-slot-hover': `url(${UI_SLOTS.actionHover})`,
    '--uikit-slot-press': `url(${UI_SLOTS.actionPress})`,
  } as CSSProperties;

  if (onClick) {
    return (
      <button
        type="button"
        title={title || label}
        onClick={onClick}
        className={`uikit-slot ${active ? 'is-active' : ''} ${className}`}
        style={style}
      >
        <SlotInner iconUrl={iconUrl} emoji={emoji} label={label} keyLabel={keyLabel} qty={qty} />
      </button>
    );
  }

  return (
    <div
      title={title || label}
      className={`uikit-slot ${active ? 'is-active' : ''} ${className}`}
      style={style}
    >
      <SlotInner iconUrl={iconUrl} emoji={emoji} label={label} keyLabel={keyLabel} qty={qty} />
    </div>
  );
}

function SlotInner({
  iconUrl,
  emoji,
  label,
  keyLabel,
  qty,
}: {
  iconUrl?: string | null;
  emoji?: string;
  label?: string;
  keyLabel?: string;
  qty?: number;
}) {
  return (
    <>
      {iconUrl ? (
        <img className="uikit-slot__icon" src={iconUrl} alt="" draggable={false} />
      ) : emoji ? (
        <span className="uikit-slot__emoji">{emoji}</span>
      ) : null}
      {label && !iconUrl ? <span className="uikit-slot__label">{label}</span> : null}
      {keyLabel ? <span className="uikit-slot__key">{keyLabel}</span> : null}
      {qty != null && qty > 0 ? <span className="uikit-slot__qty">{qty}</span> : null}
    </>
  );
}

export default UiKitActionSlot;
