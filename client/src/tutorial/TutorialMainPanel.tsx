/**
 * TutorialMainPanel — production-style main panel for /tutorial.
 * Tabs: Character · Inventory · Craft · Skills · Quests (Traveler)
 */
import {
  User, Backpack, Hammer, Sparkles, ScrollText, X, Check, ChevronRight,
} from 'lucide-react';
import {
  TUTORIAL_QUICK_CRAFT,
  canCraftQuick,
} from '@shared/definitions/tutorialFirstSegment';
import type { UseTravelerMissions } from './useTravelerMissions';
import type { HotbarSlot } from '@/lib/tutorialSkills';

export type MainPanelTab = 'character' | 'inventory' | 'craft' | 'skills' | 'quests';

export interface TutorialMainPanelProps {
  open: boolean;
  tab: MainPanelTab;
  onTabChange: (t: MainPanelTab) => void;
  onClose: () => void;
  characterName: string;
  raceId: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  sticks: number;
  stones: number;
  inventory: string[];
  equippedMainHand: string | null;
  classHotbar: HotbarSlot[];
  weaponHotbar: HotbarSlot[];
  missions: UseTravelerMissions;
  onCraft: (recipeId: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: () => void;
}

const TABS: { id: MainPanelTab; label: string; Icon: typeof User; hotkey: string }[] = [
  { id: 'character', label: 'Character', Icon: User, hotkey: 'C' },
  { id: 'inventory', label: 'Inventory', Icon: Backpack, hotkey: 'I' },
  { id: 'craft', label: 'Craft', Icon: Hammer, hotkey: 'Q' },
  { id: 'skills', label: 'Skills', Icon: Sparkles, hotkey: 'K' },
  { id: 'quests', label: 'Quests', Icon: ScrollText, hotkey: 'L' },
];

const PANEL =
  'bg-[#0c0b10]/96 backdrop-blur-xl border border-amber-600/40 rounded-2xl shadow-2xl shadow-black/60';

export function TutorialMainPanel(props: TutorialMainPanelProps) {
  if (!props.open) return null;

  const {
    tab, onTabChange, onClose, characterName, raceId, classId, level,
    hp, maxHp, sticks, stones, inventory, equippedMainHand,
    classHotbar, weaponHotbar, missions, onCraft, onEquip, onUnequip,
  } = props;

  const inv = { stick: sticks, stone: stones };
  const recipes = TUTORIAL_QUICK_CRAFT;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-3xl max-h-[min(86vh,720px)] flex flex-col ${PANEL}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-600/25">
          <div>
            <h2
              className="text-lg font-black tracking-[0.14em] text-transparent bg-clip-text"
              style={{
                fontFamily: 'Cinzel, serif',
                backgroundImage: 'linear-gradient(135deg,#f5d77a,#c9952a)',
              }}
            >
              MAIN PANEL
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {characterName} · {raceId} {classId} · Lv {level}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-stone-700 text-stone-400 hover:text-amber-300 hover:border-amber-600/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/5 bg-black/30">
          {TABS.map(({ id, label, Icon, hotkey }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                tab === id
                  ? 'bg-amber-600/25 text-amber-200 border border-amber-500/50'
                  : 'text-stone-400 border border-transparent hover:text-stone-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className="text-[9px] opacity-50 font-mono ml-0.5">{hotkey}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[280px]">
          {tab === 'character' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-2">Identity</div>
                <div className="text-amber-200 font-cinzel text-xl font-bold">{characterName}</div>
                <div className="text-stone-400 text-sm mt-1 capitalize">{raceId} · {classId}</div>
                <div className="mt-4">
                  <div className="text-[10px] text-stone-500 uppercase mb-1">Hull (tutorial locked)</div>
                  <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-700 to-red-400"
                      style={{ width: `${(hp / Math.max(1, maxHp)) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">{hp} / {maxHp}</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-2">Equipment</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center border border-amber-600/20 rounded-lg px-3 py-2">
                    <span className="text-stone-400">Main Hand</span>
                    <span className="text-amber-200 font-medium">
                      {equippedMainHand || '— empty —'}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Equip from Inventory after crafting a Flint Pickaxe.
                  </div>
                  {equippedMainHand && (
                    <button
                      type="button"
                      onClick={onUnequip}
                      className="text-xs text-stone-400 hover:text-amber-300 underline"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'inventory' && (
            <div>
              <div className="flex gap-3 mb-4 text-sm">
                <span className="px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-200">
                  Sticks ×{sticks}
                </span>
                <span className="px-2 py-1 rounded bg-stone-800 border border-stone-600 text-stone-200">
                  Stones ×{stones}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {inventory.length === 0 && (
                  <p className="text-stone-500 text-sm col-span-full">No crafted items yet. Harvest, then Quick Craft.</p>
                )}
                {inventory.map((id) => (
                  <div
                    key={id}
                    className="rounded-lg border border-white/10 bg-black/50 p-3 flex flex-col gap-2"
                  >
                    <span className="text-amber-100 text-sm font-medium truncate">{id}</span>
                    <button
                      type="button"
                      onClick={() => onEquip(id)}
                      disabled={equippedMainHand === id}
                      className="text-[11px] px-2 py-1 rounded border border-amber-600/40 text-amber-200 hover:bg-amber-600/20 disabled:opacity-40"
                    >
                      {equippedMainHand === id ? 'Equipped' : 'Equip MainHand'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'craft' && (
            <div className="space-y-2">
              <p className="text-[11px] text-stone-500 mb-2">
                Quick Craft · traveler T0 kit (sticks + stones)
              </p>
              {recipes.map((r) => {
                const ok = canCraftQuick(r.id, inv);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5"
                  >
                    <div>
                      <div className="text-amber-100 text-sm font-semibold">{r.name}</div>
                      <div className="text-[10px] text-stone-500">{r.description || r.tab}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!ok}
                      onClick={() => onCraft(r.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/50 text-amber-200 bg-amber-600/15 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Craft
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'skills' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Class</div>
                <div className="flex flex-wrap gap-2">
                  {classHotbar.map((s) => (
                    <div
                      key={s.id}
                      title={s.lockReason}
                      className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg ${
                        s.locked ? 'opacity-35 border-stone-700' : 'border-amber-600/40 bg-stone-900/60'
                      }`}
                    >
                      {s.icon ?? '•'}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Weapon</div>
                <div className="flex flex-wrap gap-2">
                  {weaponHotbar.map((s) => (
                    <div
                      key={s.id}
                      title={s.lockReason}
                      className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg ${
                        s.locked ? 'opacity-35 border-stone-700' : 'border-amber-600/40 bg-stone-900/60'
                      }`}
                    >
                      {s.icon ?? '•'}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-stone-500 mt-2">Weapon skills unlock after first fight.</p>
              </div>
            </div>
          )}

          {tab === 'quests' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3">
                <div className="text-cyan-300 text-xs font-bold tracking-wide uppercase">
                  {missions.npc.name}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Destination: {missions.dest.islandName} · Report to {missions.dest.commanderName}
                </div>
              </div>
              <ul className="space-y-1.5">
                {missions.checklist.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 border text-sm ${
                      s.completed
                        ? 'border-emerald-700/40 bg-emerald-950/20 text-emerald-200/80'
                        : s.active
                          ? 'border-amber-500/50 bg-amber-950/30 text-amber-100'
                          : 'border-white/5 bg-black/30 text-stone-500'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {s.completed ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : s.active ? (
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      ) : (
                        <span className="w-4 h-4 block rounded-full border border-stone-600" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px]">{s.title}</div>
                      <div className="text-[11px] opacity-80 leading-snug">{s.objective}</div>
                      {s.active && s.targetCount && s.targetCount > 1 && (
                        <div className="text-[10px] text-amber-300/80 mt-0.5">
                          Progress {s.count}/{s.target}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-2 border-t border-white/5 text-[10px] text-stone-600 flex justify-between">
          <span>Esc close · Traveler line is race-shared</span>
          <span>
            {missions.checklist.filter((c) => c.completed).length}/{missions.checklist.length} missions
          </span>
        </div>
      </div>
    </div>
  );
}

export default TutorialMainPanel;
