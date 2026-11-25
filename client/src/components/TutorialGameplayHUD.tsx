/**
 * TutorialGameplayHUD — overlay HUD for the Home Island gameplay page.
 *
 * Renders the harvest/combat mode toggle, character vitals, canonical class +
 * weapon mastery hotbars, gathered resources, professions, ally messaging, and
 * transient notifications. Real skill icon assets render directly from the shared
 * Grudge skill definitions; emoji remains supported for definitions that use it.
 */
import { Pickaxe, Swords, Hammer, Sparkles, Leaf } from 'lucide-react';
import type { HotbarSlot, GatheringProfession } from '@/lib/tutorialSkills';

/** Build is a harvest sub-state (R radial → hammer); top-level modes are combat|harvest only. */
export type ControlMode = 'harvest' | 'combat' | 'build';

interface TutorialStep {
  id: string;
  title: string;
  completed: boolean;
}

interface TutorialGameplayHUDProps {
  characterName: string;
  heroClass: string;
  level: number;
  hp: number;
  maxHp: number;
  playMode: ControlMode;
  onModeChange: (mode: ControlMode) => void;
  steps: TutorialStep[];
  classHotbar: HotbarSlot[];
  weaponHotbar: HotbarSlot[];
  professions: GatheringProfession[];
  resources: Record<string, number>;
  hasWeapon: boolean;
  allyName: string;
  allyMessage: string | null;
  notification: string | null;
  onHarvest: () => void;
  onAttack: () => void;
  onCraft: () => void;
  onBuildRaft: () => void;
  onUseSkill: (slot: HotbarSlot) => void;
}

const MODES: { id: 'harvest' | 'combat'; label: string; icon: typeof Pickaxe }[] = [
  { id: 'harvest', label: 'Harvest', icon: Pickaxe },
  { id: 'combat', label: 'Combat', icon: Swords },
];

const PANEL = 'bg-black/70 backdrop-blur-sm rounded-xl border border-amber-600/30';

function isAssetIcon(icon?: string): boolean {
  if (!icon) return false;
  return icon.startsWith('/') || icon.startsWith('https://') || icon.startsWith('http://');
}

function HotbarButton({ slot, hotkey, onUse }: { slot: HotbarSlot; hotkey: string; onUse: (s: HotbarSlot) => void }) {
  const title = slot.locked
    ? slot.lockReason ?? 'Locked'
    : [slot.label, slot.description, slot.cooldown ? `${slot.cooldown}s cooldown` : null]
        .filter(Boolean)
        .join(' — ');
  const assetIcon = isAssetIcon(slot.icon);

  return (
    <button
      type="button"
      onClick={() => {
        if (!slot.locked) onUse(slot);
      }}
      disabled={slot.locked}
      aria-label={title}
      title={title}
      className={`relative w-12 h-12 rounded-lg border flex items-center justify-center text-lg transition-all pointer-events-auto overflow-hidden ${
        slot.locked
          ? 'border-stone-700 bg-stone-900/60 opacity-45 cursor-not-allowed'
          : 'border-amber-600/40 bg-stone-900/75 hover:border-amber-300 hover:scale-105 hover:bg-stone-800/90'
      }`}
    >
      {assetIcon ? (
        <img
          src={slot.icon}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-9 h-9 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        />
      ) : (
        <span aria-hidden className="text-xl leading-none">{slot.icon ?? '•'}</span>
      )}
      <span className="absolute top-0 left-0 text-[9px] leading-4 text-amber-200/90 font-mono bg-black/80 rounded-br px-1.5">{hotkey}</span>
      {!!slot.cooldown && slot.cooldown > 0 && !slot.locked && (
        <span className="absolute bottom-0 right-0 text-[8px] leading-4 text-stone-200 font-mono bg-black/75 rounded-tl px-1">
          {slot.cooldown}s
        </span>
      )}
      {slot.locked && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-stone-300 text-sm">🔒</span>
      )}
    </button>
  );
}

export function TutorialGameplayHUD(props: TutorialGameplayHUDProps) {
  const {
    characterName, heroClass, level, hp, maxHp, playMode, onModeChange,
    classHotbar, weaponHotbar, professions, resources, hasWeapon,
    allyName, allyMessage, notification,
    onHarvest, onAttack, onCraft, onBuildRaft, onUseSkill,
  } = props;

  const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const resourceEntries = Object.entries(resources).filter(([, v]) => v > 0);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none">
      {/* ── Top-left: vitals + resources ── */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className={`${PANEL} px-3 py-2 min-w-[200px]`}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-cinzel font-bold text-amber-300 text-sm tracking-wide">{characterName}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-400">Lv {level} · {heroClass}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-stone-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5 text-right">{Math.round(hp)} / {maxHp} HP</div>
        </div>

        {resourceEntries.length > 0 && (
          <div className={`${PANEL} px-3 py-2 flex flex-wrap gap-2 max-w-[260px]`}>
            {resourceEntries.map(([name, qty]) => (
              <span key={name} className="text-[11px] text-stone-300 flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" />{name} <span className="text-amber-300 font-bold">{qty}</span>
              </span>
            ))}
          </div>
        )}

        {professions.length > 0 && (
          <div className={`${PANEL} px-3 py-2 text-[10px] text-stone-400 max-w-[280px]`}>
            {professions.map((p) => (
              <span key={p.id} className="inline-block mr-2 capitalize">{p.name} <span className="text-amber-300">{p.level}</span></span>
            ))}
          </div>
        )}
      </div>

      {/* ── Ally message ── */}
      {allyMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md">
          <div className={`${PANEL} px-4 py-2 text-xs text-amber-100`}>
            <span className="text-amber-400 font-bold">{allyName}: </span>{allyMessage}
          </div>
        </div>
      )}

      {/* ── Notification toast ── */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-amber-500/40 px-4 py-1.5 text-sm text-amber-200 font-semibold">
            {notification}
          </div>
        </div>
      )}

      {/* ── Bottom-center: mode toggle + hotbars + actions ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {/* Mode toggle */}
        <div className={`${PANEL} flex gap-1 p-1 pointer-events-auto`}>
          {MODES.map((m) => {
            const Icon = m.icon;
            // build sub-state counts as harvest for the dual-mode dock
            const active = m.id === 'combat' ? playMode === 'combat' : playMode !== 'combat';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active ? 'bg-amber-500 text-stone-900' : 'text-stone-400 hover:text-amber-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{m.label}
              </button>
            );
          })}
        </div>

        {/* Canonical class + weapon mastery hotbars */}
        <div className={`${PANEL} flex items-center gap-3 px-3 py-2`}>
          <div className="flex gap-1.5">
            {classHotbar.map((slot, i) => (
              <HotbarButton key={slot.skillId ?? i} slot={slot} hotkey={String(i + 1)} onUse={onUseSkill} />
            ))}
          </div>
          {weaponHotbar.length > 0 && (
            <>
              <span className="w-px h-8 bg-stone-700" />
              <div className="flex gap-1.5">
                {weaponHotbar.map((slot, i) => (
                  <HotbarButton key={slot.skillId ?? `w${i}`} slot={slot} hotkey={`F${i + 1}`} onUse={onUseSkill} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Context actions */}
        <div className="flex gap-2 pointer-events-auto">
          <button type="button" onClick={onHarvest} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700/70 hover:bg-emerald-600 text-emerald-50 border border-emerald-500/40 flex items-center gap-1">
            <Pickaxe className="w-3.5 h-3.5" /> Harvest
          </button>
          <button type="button" onClick={onAttack} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${hasWeapon ? 'bg-red-800/70 hover:bg-red-700 text-red-50 border-red-500/40' : 'bg-stone-800/70 text-stone-500 border-stone-700'}`}>
            <Swords className="w-3.5 h-3.5" /> Attack
          </button>
          <button type="button" onClick={onCraft} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-800/70 hover:bg-orange-700 text-orange-50 border border-orange-500/40 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Craft
          </button>
          <button type="button" onClick={onBuildRaft} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-800/70 hover:bg-amber-700 text-amber-50 border border-amber-500/40 flex items-center gap-1">
            <Hammer className="w-3.5 h-3.5" /> Build
          </button>
        </div>
      </div>
    </div>
  );
}

export default TutorialGameplayHUD;
