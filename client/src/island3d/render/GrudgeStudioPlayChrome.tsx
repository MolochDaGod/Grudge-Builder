/**
 * GrudgeStudioPlayChrome — production play HUD chrome inspired by
 * ui.grudge-studio.com (fantasy equipment / tactical kit).
 *
 * Uses real fleet portraits + parchment panel art; yellow soft-lock lives
 * in SoftLockFrame. Inventory panel toggled with I.
 */
import { useEffect, useState } from 'react';
import {
  getRacePortraitUrl,
  getPanelParchmentUrl,
  getClassAccentColor,
} from '@shared/fleet/uiArt';
import { StatusEffectIcons } from '@/components/StatusEffectIcons';
import { usePlayerStatusEffects } from '@/hooks/useStatusEffects';
import { preloadMagicIndicatorThumbs } from '@/lib/magicIndicatorThumbs';
import type { SoftLockScreenFrame } from '../player/SoftLockSystem';
import { SoftLockFrame } from './SoftLockFrame';
import './grudgeStudioPlayChrome.css';

export interface GrudgeStudioPlayChromeProps {
  characterName?: string;
  raceId?: string;
  classId?: string;
  level?: number;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  stamina?: number;
  maxStamina?: number;
  softLockFrame?: SoftLockScreenFrame | null;
  /** Equipment slot ids for inventory grid (display names) */
  inventorySlots?: Array<{ id: string; label: string; icon?: string }>;
}

const DEFAULT_INV: Array<{ id: string; label: string; icon: string }> = [
  { id: 'main', label: 'Main Hand', icon: '⚔' },
  { id: 'off', label: 'Off Hand', icon: '🛡' },
  { id: 'head', label: 'Head', icon: '⛑' },
  { id: 'chest', label: 'Chest', icon: '🦺' },
  { id: 'legs', label: 'Legs', icon: '👖' },
  { id: 'feet', label: 'Feet', icon: '👢' },
  { id: 'back', label: 'Back', icon: '🎒' },
  { id: 'ring', label: 'Ring', icon: '💍' },
  { id: 'amulet', label: 'Amulet', icon: '📿' },
  { id: 'bag1', label: 'Bag', icon: '📦' },
  { id: 'bag2', label: 'Bag', icon: '📦' },
  { id: 'bag3', label: 'Bag', icon: '📦' },
];

export function GrudgeStudioPlayChrome({
  characterName = 'Hero',
  raceId = 'human',
  classId = 'warrior',
  level = 1,
  hp = 100,
  maxHp = 100,
  mana = 50,
  maxMana = 50,
  stamina = 100,
  maxStamina = 100,
  softLockFrame = null,
  inventorySlots,
}: GrudgeStudioPlayChromeProps) {
  const [invOpen, setInvOpen] = useState(false);
  const portrait = getRacePortraitUrl(raceId);
  const parchment = getPanelParchmentUrl();
  const accent = getClassAccentColor(classId);
  const slots = inventorySlots?.length ? inventorySlots : DEFAULT_INV;
  const statusEffects = usePlayerStatusEffects();

  useEffect(() => {
    void preloadMagicIndicatorThumbs();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        // Don't steal focus from inputs
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        setInvOpen((v) => !v);
        e.preventDefault();
      }
      if (e.key === 'Escape' && invOpen) {
        setInvOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [invOpen]);

  const hpPct = maxHp > 0 ? Math.min(100, (hp / maxHp) * 100) : 0;
  const mpPct = maxMana > 0 ? Math.min(100, (mana / maxMana) * 100) : 0;
  const spPct = maxStamina > 0 ? Math.min(100, (stamina / maxStamina) * 100) : 0;

  return (
    <div className="gspc-root pointer-events-none absolute inset-0 z-32">
      <SoftLockFrame frame={softLockFrame ?? null} />

      {/* Player unit frame — ui.grudge-studio fantasy kit language */}
      <div className="gspc-unit-frame pointer-events-auto" style={{ ['--gspc-accent' as string]: accent }}>
        {/* Magic buff/debuff orbs above player frame */}
        {statusEffects.length > 0 && (
          <div className="gspc-status-row" data-testid="player-status-magic-icons">
            <StatusEffectIcons effects={statusEffects} size="sm" maxVisible={8} showTimers />
          </div>
        )}
        <div className="gspc-portrait-wrap">
          <img src={portrait} alt="" className="gspc-portrait" draggable={false} />
          <div className="gspc-level">{level}</div>
        </div>
        <div className="gspc-bars">
          <div className="gspc-name-row">
            <span className="gspc-name">{characterName}</span>
            <span className="gspc-class">{classId}</span>
          </div>
          <div className="gspc-bar gspc-hp" title="Health">
            <div className="gspc-bar-fill" style={{ width: `${hpPct}%` }} />
            <span className="gspc-bar-text">
              {Math.round(hp)}/{Math.round(maxHp)}
            </span>
          </div>
          <div className="gspc-bar gspc-mp" title="Mana">
            <div className="gspc-bar-fill" style={{ width: `${mpPct}%` }} />
            <span className="gspc-bar-text">
              {Math.round(mana)}/{Math.round(maxMana)}
            </span>
          </div>
          <div className="gspc-bar gspc-sp" title="Stamina">
            <div className="gspc-bar-fill" style={{ width: `${spPct}%` }} />
            <span className="gspc-bar-text">
              {Math.round(stamina)}/{Math.round(maxStamina)}
            </span>
          </div>
        </div>
      </div>

      {/* Soft-lock hint */}
      {softLockFrame?.active && (
        <div className="gspc-softlock-hint pointer-events-none">
          <span className="gspc-sl-dot" />
          Soft Lock · Tab cycle · Shift+Tab reverse
        </div>
      )}

      {/* Inventory — I */}
      {invOpen && (
        <div
          className="gspc-inventory pointer-events-auto"
          style={{ backgroundImage: `linear-gradient(rgba(12,10,9,0.82), rgba(12,10,9,0.9)), url(${parchment})` }}
        >
          <div className="gspc-inv-titlebar">
            <span className="gspc-inv-title">Inventory</span>
            <span className="gspc-inv-sub">I to close · ui.grudge-studio kit</span>
            <button type="button" className="gspc-inv-close" onClick={() => setInvOpen(false)}>
              ✕
            </button>
          </div>
          <div className="gspc-inv-grid">
            {slots.map((s) => (
              <div key={s.id} className="gspc-inv-slot" title={s.label}>
                <span className="gspc-inv-icon">{s.icon ?? '·'}</span>
                <span className="gspc-inv-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
