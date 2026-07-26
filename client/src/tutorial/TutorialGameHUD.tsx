/**
 * TutorialGameHUD — in-world vitals, mode strip, hotkeys, traveler objective chip.
 * Pairs with TutorialMainPanel (not an iframe — native React shell).
 */
import { Pickaxe, Swords, Hammer, LayoutPanelLeft, MessageCircle } from 'lucide-react';
import type { ControlMode } from '@/components/TutorialGameplayHUD';
import type { UseTravelerMissions } from './useTravelerMissions';
import type { HotbarSlot } from '@/lib/tutorialSkills';

export interface TutorialGameHUDProps {
  characterName: string;
  raceId: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  playMode: ControlMode;
  onModeChange: (m: ControlMode) => void;
  sticks: number;
  stones: number;
  classHotbar: HotbarSlot[];
  weaponHotbar: HotbarSlot[];
  hasWeapon: boolean;
  missions: UseTravelerMissions;
  notification: string | null;
  allyMessage: string | null;
  onOpenMainPanel: (tab?: 'character' | 'inventory' | 'craft' | 'skills' | 'quests') => void;
  onTalkTraveler?: () => void;
  introActive?: boolean;
  onSkipIntro?: () => void;
  chunkHits?: { left: number; max: number } | null;
}

const PANEL = 'bg-black/75 backdrop-blur-md rounded-xl border border-amber-600/35 shadow-lg';
const MODES: { id: ControlMode; label: string; Icon: typeof Pickaxe }[] = [
  { id: 'harvest', label: 'Harvest', Icon: Pickaxe },
  { id: 'combat', label: 'Combat', Icon: Swords },
  { id: 'build', label: 'Build', Icon: Hammer },
];

export function TutorialGameHUD(props: TutorialGameHUDProps) {
  const {
    characterName, raceId, classId, level, hp, maxHp,
    playMode, onModeChange, sticks, stones,
    classHotbar, missions, notification, allyMessage,
    onOpenMainPanel, onTalkTraveler, introActive, onSkipIntro, chunkHits,
  } = props;

  const step = missions.activeStep;
  const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));

  if (introActive) {
    return (
      <div className="absolute inset-0 z-50 pointer-events-none">
        <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-3">
          <h1
            className="text-3xl md:text-4xl font-black tracking-[0.18em] text-center"
            style={{
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(180deg,#f6c945,#fff3c2 50%,#c9952a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SHIPWRECKED
          </h1>
          <p className="text-stone-400 text-xs tracking-widest uppercase">Dock Quest Traveler awaits</p>
          {onSkipIntro && (
            <button
              type="button"
              onClick={onSkipIntro}
              className="pointer-events-auto mt-2 px-4 py-2 rounded-lg border border-amber-600/40 text-amber-200 text-xs hover:bg-amber-600/20"
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none">
      {/* Vitals */}
      <div className="absolute top-4 left-4 space-y-2 pointer-events-auto">
        <div className={`${PANEL} px-3 py-2.5 min-w-[220px]`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-cinzel font-bold text-amber-300 text-sm">{characterName}</span>
            <span className="text-[10px] uppercase text-stone-400">
              Lv {level} · {classId}
            </span>
          </div>
          <div className="text-[10px] text-stone-500 capitalize mt-0.5">{raceId} · Grudge6</div>
          <div className="mt-2 h-2 rounded-full bg-stone-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-700 to-red-400 transition-all" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="text-[10px] text-stone-400 text-right mt-0.5">{hp}/{maxHp} HP</div>
        </div>

        <div className={`${PANEL} px-3 py-2 flex gap-3 text-xs text-stone-300`}>
          <span>🪵 {sticks}</span>
          <span>🪨 {stones}</span>
        </div>
      </div>

      {/* Traveler objective */}
      {step && !missions.completedAll && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-lg w-[min(92vw,480px)] pointer-events-auto">
          <div className={`${PANEL} px-4 py-3 border-cyan-500/30`}>
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-cyan-400/90 font-bold">
                  {missions.npc.name} · {step.title}
                </div>
                <div className="text-sm text-amber-50 font-medium mt-0.5 leading-snug">{step.objective}</div>
                <div className="text-[11px] text-stone-400 mt-1">{step.hint}</div>
                <p className="text-[11px] text-cyan-100/70 italic mt-2 border-t border-white/5 pt-2">
                  “{step.travelerLine}”
                </p>
              </div>
            </div>
            {step.id === 'meet_traveler' && onTalkTraveler && (
              <button
                type="button"
                onClick={onTalkTraveler}
                className="mt-3 w-full py-2 rounded-lg bg-cyan-600/25 border border-cyan-400/40 text-cyan-100 text-xs font-bold tracking-wide hover:bg-cyan-600/40"
              >
                Speak with Traveler (E)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ally / toast */}
      {(allyMessage || notification) && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 max-w-md pointer-events-none">
          <div className={`${PANEL} px-4 py-2 text-xs text-amber-100 text-center`}>
            {notification || allyMessage}
          </div>
        </div>
      )}

      {/* Chunk progress */}
      {chunkHits && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8 pointer-events-none">
          <div className={`${PANEL} px-4 py-2 text-xs text-amber-200`}>
            Node {chunkHits.max - chunkHits.left}/{chunkHits.max}
          </div>
        </div>
      )}

      {/* Mode + main panel */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              playMode === id
                ? 'bg-amber-600/30 border-amber-400 text-amber-100'
                : 'bg-black/60 border-stone-700 text-stone-400 hover:border-amber-600/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOpenMainPanel('quests')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-cyan-500/40 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/50"
        >
          <LayoutPanelLeft className="w-3.5 h-3.5" />
          Panel
          <span className="text-[9px] opacity-60 font-mono">P</span>
        </button>
      </div>

      {/* Hotbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-auto">
        {classHotbar.slice(0, 6).map((slot, i) => (
          <div
            key={slot.id}
            title={slot.locked ? slot.lockReason : slot.label}
            className={`relative w-11 h-11 rounded-lg border flex items-center justify-center text-base ${
              slot.locked
                ? 'border-stone-700 bg-stone-900/50 opacity-40'
                : 'border-amber-600/40 bg-stone-900/80'
            }`}
          >
            <span>{slot.icon ?? '•'}</span>
            <span className="absolute -top-1 -left-1 text-[9px] font-mono text-amber-300/80 bg-black/80 rounded px-1">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Prompt bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-stone-500 tracking-wide">
        WASD move · E interact · P main panel · 1–2 harvest · F attack
      </div>
    </div>
  );
}

export default TutorialGameHUD;
