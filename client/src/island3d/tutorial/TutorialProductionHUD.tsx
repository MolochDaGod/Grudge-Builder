/**
 * TutorialProductionHUD — first-segment production UI:
 * phase objectives, harvest hotkeys, Quick Craft, equip, settings.
 */
import { useMemo, useState } from 'react';
import {
  TUTORIAL_FIRST_PHASES,
  TUTORIAL_QUICK_CRAFT,
  canCraftQuick,
  type TutorialSegmentPhase,
} from '@shared/definitions/tutorialFirstSegment';
import {
  Pickaxe,
  Settings,
  Backpack,
  Hammer,
  Crosshair,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

export interface TutorialProductionHUDProps {
  phase: TutorialSegmentPhase;
  characterName: string;
  raceLabel?: string;
  /** Tutorial locks at 5 */
  hp?: number;
  maxHp?: number;
  sticks: number;
  stones: number;
  inventory: string[];
  equippedMainHand: string | null;
  chunkHitsLeft?: number | null;
  chunkMaxHits?: number | null;
  allyMessage?: string | null;
  notification?: string | null;
  playMode: 'harvest' | 'combat' | 'build';
  onModeChange: (m: 'harvest' | 'combat' | 'build') => void;
  onCraft: (recipeId: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: () => void;
  onOpenSettings?: () => void;
  settingsOpen?: boolean;
  onSettingsChange?: (s: TutorialSettings) => void;
  settings?: TutorialSettings;
  onSkipIntro?: () => void;
  introActive?: boolean;
}

export interface TutorialSettings {
  masterVolume: number;
  showHints: boolean;
  autoHarvestHold: boolean;
  cameraSensitivity: number;
  reduceMotion: boolean;
}

export const DEFAULT_TUTORIAL_SETTINGS: TutorialSettings = {
  masterVolume: 0.8,
  showHints: true,
  autoHarvestHold: true,
  cameraSensitivity: 1,
  reduceMotion: false,
};

const PANEL =
  'bg-black/80 backdrop-blur-md rounded-xl border border-amber-600/35 shadow-xl';

export function TutorialProductionHUD(props: TutorialProductionHUDProps) {
  const {
    phase,
    characterName,
    raceLabel = 'Grudge6',
    hp = 5,
    maxHp = 5,
    sticks,
    stones,
    inventory,
    equippedMainHand,
    chunkHitsLeft,
    chunkMaxHits,
    allyMessage,
    notification,
    playMode,
    onModeChange,
    onCraft,
    onEquip,
    onUnequip,
    settingsOpen,
    onOpenSettings,
    onSettingsChange,
    settings = DEFAULT_TUTORIAL_SETTINGS,
    onSkipIntro,
    introActive,
  } = props;

  const [craftTab, setCraftTab] = useState<'tools' | 'camp' | 'benches'>('tools');
  const [panel, setPanel] = useState<'none' | 'craft' | 'inventory' | 'settings'>('none');

  const phaseInfo = TUTORIAL_FIRST_PHASES.find((p) => p.id === phase) ?? TUTORIAL_FIRST_PHASES[0];
  const phaseIdx = TUTORIAL_FIRST_PHASES.findIndex((p) => p.id === phase);

  const recipes = useMemo(
    () => TUTORIAL_QUICK_CRAFT.filter((r) => r.tab === craftTab),
    [craftTab],
  );

  const inv = { stick: sticks, stone: stones };

  if (introActive) {
    return (
      <div className="absolute inset-0 z-50 pointer-events-none">
        <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3">
          <h1
            className="text-3xl md:text-4xl font-black tracking-[0.2em] text-center"
            style={{
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(180deg,#f6c945,#fff3c2 50%,#f6c945)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SHIPWRECKED
          </h1>
          <p className="text-white/55 text-xs max-w-md text-center px-4">
            Unarmed · Harvest mode · Gather stick & stone · Craft pickaxe · Equip · Break rock
          </p>
          {onSkipIntro && (
            <button
              type="button"
              onClick={onSkipIntro}
              className="pointer-events-auto text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-lg border border-white/25 text-white/70 hover:text-white bg-black/50"
            >
              Skip · Awaken
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none">
      {/* Top-left: character + mode */}
      <div className="absolute top-3 left-3 space-y-2 max-w-[16rem]">
        <div className={`${PANEL} px-3 py-2 pointer-events-auto`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/40 flex items-center justify-center text-xs font-bold text-black">
              {characterName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-amber-200 truncate">{characterName}</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                {raceLabel} · Injured opener · {playMode}
              </div>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-800 to-amber-600"
              style={{ width: `${Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100))}%` }}
            />
          </div>
          <div className="text-[9px] text-amber-400/90 mt-0.5 font-mono text-right">
            {hp}/{maxHp} HP · locked · invincible
          </div>
          <div className="mt-2 flex gap-1">
            {(['harvest', 'combat', 'build'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`flex-1 text-[9px] font-bold py-1 rounded-md uppercase ${
                  playMode === m
                    ? m === 'harvest'
                      ? 'bg-emerald-600 text-white'
                      : m === 'combat'
                        ? 'bg-red-700 text-white'
                        : 'bg-sky-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div className={`${PANEL} px-3 py-1.5 flex gap-3 text-[11px] text-slate-200 pointer-events-auto`}>
          <span>🪵 Stick <b className="text-amber-300">{sticks}</b></span>
          <span>🪨 Stone <b className="text-amber-300">{stones}</b></span>
          {equippedMainHand && (
            <span className="text-cyan-300 truncate">⛏️ {equippedMainHand.replace('t0_', '')}</span>
          )}
        </div>

        {/* Phase objective */}
        <div className={`${PANEL} px-3 py-2 pointer-events-auto`}>
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-amber-400/90 mb-1">
            <Crosshair className="w-3 h-3" />
            Objective {phaseIdx + 1}/{TUTORIAL_FIRST_PHASES.length}
          </div>
          <div className="text-sm font-semibold text-white">{phaseInfo.title}</div>
          <div className="text-[11px] text-slate-300 mt-0.5">{phaseInfo.objective}</div>
          {settings.showHints && (
            <div className="text-[10px] text-emerald-400/90 mt-1.5 border-t border-white/10 pt-1.5">
              {phaseInfo.hint}
            </div>
          )}
          {/* Progress dots */}
          <div className="flex gap-1 mt-2">
            {TUTORIAL_FIRST_PHASES.map((p, i) => (
              <div
                key={p.id}
                className={`h-1 flex-1 rounded-full ${
                  i < phaseIdx ? 'bg-emerald-500' : i === phaseIdx ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Ally + toast */}
      {allyMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 max-w-lg pointer-events-none">
          <div className={`${PANEL} px-4 py-2 text-xs text-amber-50`}>
            <span className="text-amber-400 font-bold">Guide: </span>
            {allyMessage}
          </div>
        </div>
      )}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2">
          <div className="bg-black/85 border border-amber-500/50 rounded-lg px-4 py-1.5 text-sm text-amber-200 font-semibold">
            {notification}
          </div>
        </div>
      )}

      {/* Chunk rock HP */}
      {chunkHitsLeft != null && chunkMaxHits != null && phase === 'chunk_harvest_stone' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48">
          <div className={`${PANEL} px-3 py-2`}>
            <div className="text-[10px] text-amber-300 mb-1 text-center">Rock integrity</div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-stone-400 to-amber-500 transition-all"
                style={{ width: `${(chunkHitsLeft / chunkMaxHits) * 100}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-400 text-center mt-0.5">
              {chunkHitsLeft} / {chunkMaxHits} — soft-lock · hold E / 1
            </div>
          </div>
        </div>
      )}

      {/* Bottom dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Hotkey legend */}
        <div className={`${PANEL} px-3 py-1.5 flex flex-wrap justify-center gap-2 text-[9px] text-slate-300 max-w-md`}>
          <span><kbd className="text-amber-300">E</kbd> interact</span>
          <span><kbd className="text-amber-300">RMB</kbd> harvest</span>
          <span><kbd className="text-amber-300">1</kbd> auto</span>
          <span><kbd className="text-amber-300">2</kbd> simple</span>
          <span><kbd className="text-amber-300">Tab</kbd> mode</span>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setPanel(panel === 'craft' ? 'none' : 'craft')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border ${
              panel === 'craft'
                ? 'bg-orange-700 border-orange-400 text-white'
                : 'bg-black/80 border-orange-700/50 text-orange-100'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            Quick Craft
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'inventory' ? 'none' : 'inventory')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border ${
              panel === 'inventory'
                ? 'bg-sky-800 border-sky-400 text-white'
                : 'bg-black/80 border-sky-700/50 text-sky-100'
            }`}
          >
            <Backpack className="w-3.5 h-3.5" />
            Inventory
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(panel === 'settings' ? 'none' : 'settings');
              onOpenSettings?.();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border bg-black/80 border-slate-600 text-slate-200"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* Quick Craft panel */}
      {panel === 'craft' && (
        <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 w-[min(94vw,22rem)] ${PANEL} pointer-events-auto overflow-hidden`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[10px] uppercase tracking-widest text-orange-300 font-semibold">
              Main Panel · Quick Craft
            </span>
            <button type="button" onClick={() => setPanel('none')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex border-b border-white/10">
            {(['tools', 'camp', 'benches'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCraftTab(t)}
                className={`flex-1 text-[10px] py-1.5 uppercase font-semibold ${
                  craftTab === t ? 'text-amber-300 bg-white/5' : 'text-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="max-h-52 overflow-y-auto p-2 space-y-1.5">
            {recipes.map((r) => {
              const ok = canCraftQuick(r.id, inv);
              const owned = inventory.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border px-2.5 py-2 ${
                    owned ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-white flex items-center gap-1">
                        {r.name}
                        {owned && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <p className="text-[9px] text-slate-400 leading-snug">{r.description}</p>
                      <p className="text-[9px] text-amber-500/90 font-mono mt-0.5">
                        {r.cost.stick}🪵 {r.cost.stone}🪨
                      </p>
                    </div>
                    {!owned && (
                      <button
                        type="button"
                        disabled={!ok}
                        onClick={() => onCraft(r.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          ok ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        Craft
                      </button>
                    )}
                    {owned && r.equipSlot === 'MainHand' && (
                      <button
                        type="button"
                        onClick={() =>
                          equippedMainHand === r.id ? onUnequip() : onEquip(r.id)
                        }
                        className="text-[10px] font-bold px-2 py-1 rounded-md bg-cyan-800 text-cyan-50"
                      >
                        {equippedMainHand === r.id ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[8px] text-slate-500 px-3 py-1.5 border-t border-white/5">
            Camp · claim flag · torch · tent · storage · benches unlock after first rock break for refine /
            over-time harvest.
          </p>
        </div>
      )}

      {/* Inventory / equip */}
      {panel === 'inventory' && (
        <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 w-[min(94vw,20rem)] ${PANEL} pointer-events-auto`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[10px] uppercase tracking-widest text-sky-300 font-semibold">
              Inventory → Equipment
            </span>
            <button type="button" onClick={() => setPanel('none')}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-[10px] text-slate-400">
              MainHand slot (harvest tool in hand)
            </div>
            <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/30 px-3 py-2 flex items-center gap-2">
              <Pickaxe className="w-4 h-4 text-cyan-300" />
              <span className="text-sm text-white font-medium">
                {equippedMainHand ?? 'Empty — equip pickaxe'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">Bag items</div>
            <div className="flex flex-wrap gap-1.5">
              {inventory.length === 0 && (
                <span className="text-[10px] text-slate-500">No crafted tools yet</span>
              )}
              {inventory.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onEquip(id)}
                  className={`text-[10px] px-2 py-1 rounded-md border ${
                    equippedMainHand === id
                      ? 'border-cyan-400 bg-cyan-900/50 text-cyan-100'
                      : 'border-slate-600 bg-slate-900 text-slate-200'
                  }`}
                >
                  {id} <ChevronRight className="inline w-3 h-3" /> equip
                </button>
              ))}
            </div>
            {equippedMainHand && (
              <button
                type="button"
                onClick={onUnequip}
                className="text-[10px] text-slate-400 underline"
              >
                Clear MainHand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {(panel === 'settings' || settingsOpen) && onSettingsChange && (
        <div className={`absolute bottom-28 right-3 w-[min(90vw,16rem)] ${PANEL} pointer-events-auto p-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold">Settings</span>
            <button type="button" onClick={() => setPanel('none')}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <label className="block text-[10px] text-slate-400">
            Master volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) =>
                onSettingsChange({ ...settings, masterVolume: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-300">
            <input
              type="checkbox"
              checked={settings.showHints}
              onChange={(e) => onSettingsChange({ ...settings, showHints: e.target.checked })}
            />
            Show objective hints
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-300">
            <input
              type="checkbox"
              checked={settings.autoHarvestHold}
              onChange={(e) =>
                onSettingsChange({ ...settings, autoHarvestHold: e.target.checked })
              }
            />
            Hold 1 / E auto-harvest
          </label>
          <label className="block text-[10px] text-slate-400">
            Camera sensitivity
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  cameraSensitivity: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-300">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) =>
                onSettingsChange({ ...settings, reduceMotion: e.target.checked })
              }
            />
            Reduce intro motion
          </label>
        </div>
      )}
    </div>
  );
}
