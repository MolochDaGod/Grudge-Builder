/**
 * StormShipIntroGate — production opener for /island-3d
 *
 * Uses the Tactical Infinity Three.js IntroScene (storm + Stonewisp attacks ship).
 * UI + options stay ON. Overboard float is a separate home-island flow.
 *
 * Embed: water.grudge-studio.com/intro
 * Local fallback: storyboard + skip if embed blocked.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STORM_SHIP_INTRO,
  OVERBOARD_HOME_INTRO,
  AFTER_INTRO_DESTINATIONS,
  DEFAULT_INTRO_OPTIONS,
  INTRO_OPTIONS_KEY,
  INTRO_SESSION_KEY,
  buildAfterIntroUrl,
  type AfterIntroDestination,
  type Island3dIntroOptions,
} from '@shared/definitions/productionIntro';
import {
  SkipForward, Volume2, VolumeX, Settings, Play, Ship, Anchor, Home, Waves,
} from 'lucide-react';

function loadOptions(): Island3dIntroOptions {
  try {
    const raw = localStorage.getItem(INTRO_OPTIONS_KEY);
    if (raw) return { ...DEFAULT_INTRO_OPTIONS, ...JSON.parse(raw) };
  } catch { /* */ }
  return { ...DEFAULT_INTRO_OPTIONS };
}

function saveOptions(o: Island3dIntroOptions) {
  try {
    localStorage.setItem(INTRO_OPTIONS_KEY, JSON.stringify(o));
  } catch { /* */ }
}

export interface StormShipIntroGateProps {
  characterId?: string | null;
  characterName?: string;
  /** Force show even if session already saw intro */
  force?: boolean;
  onEnter: (destination: AfterIntroDestination, opts: Island3dIntroOptions) => void;
  onSkipToGame?: () => void;
}

export function StormShipIntroGate({
  characterId,
  characterName = 'Captain',
  force = false,
  onEnter,
  onSkipToGame,
}: StormShipIntroGateProps) {
  const [opts, setOpts] = useState<Island3dIntroOptions>(() => loadOptions());
  const [optionsOpen, setOptionsOpen] = useState(true); // production: options ON
  const [progress, setProgress] = useState(0);
  const [embedFailed, setEmbedFailed] = useState(false);

  const alreadySeen = useMemo(() => {
    if (force) return false;
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }, [force]);

  const tiSrc = useMemo(() => {
    const u = new URL(STORM_SHIP_INTRO.tiUrl);
    u.searchParams.set('embed', '1');
    u.searchParams.set('from', 'warlords-island-3d');
    u.searchParams.set('variant', 'storm_ship_attack');
    u.searchParams.set('cutOverboard', '1');
    if (opts.mute) u.searchParams.set('mute', '1');
    if (characterName) u.searchParams.set('hero', characterName);
    return u.toString();
  }, [opts.mute, characterName]);

  const patchOpts = useCallback((partial: Partial<Island3dIntroOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...partial };
      saveOptions(next);
      return next;
    });
  }, []);

  const finish = useCallback((dest?: AfterIntroDestination) => {
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch { /* */ }
    const d = dest ?? opts.destination;
    onEnter(d, opts);
  }, [onEnter, opts]);

  // Auto-advance (cut before full overboard for island-3d)
  useEffect(() => {
    if (!opts.autoAdvance || alreadySeen) return;
    const start = performance.now();
    const dur = STORM_SHIP_INTRO.durationMs;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setProgress(t);
      if (t >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [opts.autoAdvance, alreadySeen, finish]);

  if (alreadySeen && !force) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* TI Three.js storm intro embed */}
      <div className="flex-1 relative min-h-0">
        {!embedFailed ? (
          <iframe
            title="Storm Ship Attack Intro — Tactical Infinity"
            src={tiSrc}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen"
            onError={() => setEmbedFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-black text-center px-6">
            <Waves className="w-12 h-12 text-cyan-500/80 mb-4" />
            <h1 className="font-cinzel text-2xl text-amber-300 tracking-widest mb-2">STORM SHIP ATTACK</h1>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-2">
              {STORM_SHIP_INTRO.description}
            </p>
            <p className="text-[11px] text-slate-600 max-w-sm">
              TI embed unavailable — open{' '}
              <a className="text-cyan-400 underline" href={STORM_SHIP_INTRO.tiUrl} target="_blank" rel="noreferrer">
                water.grudge-studio.com/intro
              </a>{' '}
              or continue into island-3d.
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-amber-500 transition-[width]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Top chrome — UI always on */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-start justify-between gap-2 p-3 pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-cyan-800/40 bg-black/75 backdrop-blur-md px-3 py-2 max-w-sm">
            <div className="text-[10px] uppercase tracking-widest text-cyan-400/90 font-semibold">
              Production Open · island-3d
            </div>
            <div className="text-sm text-white font-medium">{STORM_SHIP_INTRO.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              TI Three.js · Stonewisp attacks ship · not overboard (home-island only)
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Captain {characterName}
              {characterId ? ` · ${characterId.slice(0, 8)}…` : ''}
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => patchOpts({ mute: !opts.mute })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/80 border border-slate-600 text-slate-200"
              title="Mute"
            >
              {opts.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {opts.mute ? 'Muted' : 'Audio'}
            </button>
            <button
              type="button"
              onClick={() => setOptionsOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/80 border border-amber-700/50 text-amber-100"
            >
              <Settings className="w-3.5 h-3.5" />
              Options
            </button>
            <button
              type="button"
              onClick={() => finish()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-800/90 border border-emerald-500/50 text-white"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip · Enter
            </button>
          </div>
        </div>
      </div>

      {/* Options panel — production default open */}
      {optionsOpen && (
        <div className="shrink-0 border-t border-white/10 bg-black/95 backdrop-blur-md px-4 py-3 max-h-[42vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-amber-400/90 font-semibold mb-2">
                After storm intro
              </h3>
              <div className="space-y-1.5">
                {AFTER_INTRO_DESTINATIONS.map((d) => {
                  const Icon = d.id === 'lobby' ? Ship
                    : d.id === 'tutorial' ? Anchor
                      : d.id === 'home_overboard' ? Home
                        : Waves;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => patchOpts({ destination: d.id })}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                        opts.destination === d.id
                          ? 'border-amber-500/50 bg-amber-950/40'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="text-sm font-semibold text-white">{d.label}</span>
                        {d.id === 'home_overboard' && (
                          <span className="ml-auto text-[8px] uppercase text-rose-400 border border-rose-800/50 px-1 rounded">
                            overboard
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 pl-5">{d.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-cyan-400/90 font-semibold">
                Production options
              </h3>
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={opts.showUi}
                  onChange={(e) => patchOpts({ showUi: e.target.checked })}
                />
                Show game UI after enter
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={opts.showOptions}
                  onChange={(e) => patchOpts({ showOptions: e.target.checked })}
                />
                Keep options chrome on island-3d
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={opts.autoAdvance}
                  onChange={(e) => patchOpts({ autoAdvance: e.target.checked })}
                />
                Auto-enter after storm beat (cut before overboard)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={opts.playStormIntro}
                  onChange={(e) => patchOpts({ playStormIntro: e.target.checked })}
                />
                Play storm intro next visit
              </label>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-slate-500 space-y-1">
                <p>
                  <span className="text-cyan-400/90">Storm ship:</span> {STORM_SHIP_INTRO.tiUrl}
                </p>
                <p>
                  <span className="text-rose-400/90">Overboard (home only):</span>{' '}
                  {OVERBOARD_HOME_INTRO.label} → /island-reveal
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => finish()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-700 text-white border border-emerald-500/40"
                >
                  <Play className="w-4 h-4" />
                  Enter {AFTER_INTRO_DESTINATIONS.find((d) => d.id === opts.destination)?.label}
                </button>
                {onSkipToGame && (
                  <button
                    type="button"
                    onClick={onSkipToGame}
                    className="px-3 py-2 rounded-xl text-[11px] text-slate-400 border border-slate-700 hover:text-white"
                  >
                    Skip session forever
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { buildAfterIntroUrl, loadOptions as loadIsland3dIntroOptions };
