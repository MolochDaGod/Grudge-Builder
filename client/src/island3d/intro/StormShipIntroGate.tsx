/**
 * StormShipIntroGate — production /island-3d opener (v4 leviathan ocean).
 *
 * Native Three.js LeviathanOceanCinema + logo stinger → tutorial island.
 * PURGED: TI iframe, Stonewisp, intro.mp4 primary gate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SHIPWRECK_TUTORIAL_INTRO,
  AFTER_INTRO_DESTINATIONS,
  DEFAULT_INTRO_OPTIONS,
  INTRO_OPTIONS_KEY,
  INTRO_SESSION_KEY,
  buildAfterIntroUrl,
  type AfterIntroDestination,
  type Island3dIntroOptions,
} from '@shared/definitions/productionIntro';
import {
  ShipwreckTutorialCinema,
  SHIPWRECK_CINEMA_SKIPPABLE_AFTER_SEC,
  SHIPWRECK_CINEMA_DURATION_SEC,
  CINEMA_LOGO_URL,
} from './ShipwreckTutorialCinema';
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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');
  const [sub, setSub] = useState('');
  const [captionKey, setCaptionKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const [beatIdx, setBeatIdx] = useState(0);
  const [blackout, setBlackout] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<ShipwreckTutorialCinema | null>(null);
  const finishedRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const alreadySeen = useMemo(() => {
    if (force) return false;
    // Hard reset stale keys when ?intro=1|shipwreck|force
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('intro') === '1' || p.get('intro') === 'shipwreck' || p.get('forceCinema') === '1') {
        sessionStorage.removeItem(INTRO_SESSION_KEY);
        // purge older session keys so remakes always play
        for (let i = 1; i <= 10; i++) {
          sessionStorage.removeItem(`grudge_shipwreck_intro_seen_v${i}`);
          sessionStorage.removeItem(`grudge_storm_intro_seen_v${i}`);
        }
        return false;
      }
      return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }, [force]);

  const patchOpts = useCallback((partial: Partial<Island3dIntroOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...partial };
      saveOptions(next);
      return next;
    });
  }, []);

  const finish = useCallback((dest?: AfterIntroDestination) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch { /* */ }
    const o = optsRef.current;
    // Production: always prefer tutorial for cold open story end
    const d = dest ?? o.destination ?? 'tutorial';
    onEnterRef.current(d, { ...o, destination: d });
  }, []);

  useEffect(() => {
    if (alreadySeen && !force) return;
    const host = hostRef.current;
    if (!host) return;

    finishedRef.current = false;
    const cinema = new ShipwreckTutorialCinema(host, {
      onReady: () => setReady(true),
      onCaption: (c, s) => {
        setCaption(c);
        setSub(s);
        setCaptionKey((k) => k + 1);
      },
      onBeat: (i) => setBeatIdx(i),
      onPresentation: ({ blackout: b, logo }) => {
        setBlackout(b);
        setShowLogo(logo);
      },
      onProgress: (t01, elapsed) => {
        setProgress(t01);
        if (elapsed >= SHIPWRECK_CINEMA_SKIPPABLE_AFTER_SEC) setSkippable(true);
      },
      onComplete: () => {
        if (optsRef.current.autoAdvance) finish();
      },
    });
    cinemaRef.current = cinema;

    return () => {
      cinema.dispose();
      cinemaRef.current = null;
    };
  }, [alreadySeen, force, finish]);

  useEffect(() => {
    if (alreadySeen && !force) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOptionsOpen((v) => !v);
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && (skippable || ready)) {
        e.preventDefault();
        cinemaRef.current?.skip();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alreadySeen, force, skippable, ready, finish]);

  if (alreadySeen && !force) return null;

  const destLabel =
    AFTER_INTRO_DESTINATIONS.find((d) => d.id === opts.destination)?.label ?? 'Shipwreck Tutorial';

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col select-none">
      <div className="flex-1 relative min-h-0">
        <div ref={hostRef} className="absolute inset-0 w-full h-full bg-[#04080e]" />

        {/* Letterbox */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[8vh] bg-black z-[5]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[8vh] bg-black z-[5]" />
        <div
          className="pointer-events-none absolute inset-0 z-[4]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Cinema blackout + production logo stinger */}
        <div
          className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center transition-opacity duration-300"
          style={{
            background: `rgba(0,0,0,${Math.min(1, blackout)})`,
            opacity: blackout > 0.02 || showLogo ? 1 : 0,
          }}
        >
          {showLogo && (
            <img
              src={CINEMA_LOGO_URL}
              alt="Grudge Warlords"
              className="max-w-[min(72vw,420px)] max-h-[42vh] object-contain drop-shadow-2xl"
              style={{
                opacity: Math.min(1, Math.max(0, (blackout - 0.35) * 1.6)),
                filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.25))',
              }}
            />
          )}
        </div>

        {!ready && (
          <div className="absolute inset-0 z-[6] flex items-center justify-center bg-[#04080e]">
            <div className="text-center px-6">
              <Waves className="w-10 h-10 text-cyan-300/90 mx-auto mb-3 animate-pulse" />
              <p className="text-[11px] tracking-[0.35em] uppercase text-cyan-200/80">
                Loading leviathan cinema
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Ship · wards · fire · pinata · tutorial
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-[8vh] left-0 right-0 h-[2px] bg-white/10 z-10">
          <div
            className="h-full bg-gradient-to-r from-orange-600 via-cyan-400 to-amber-400 transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {blackout < 0.85 && (
          <div className="absolute bottom-[11vh] inset-x-0 z-10 flex flex-col items-center pointer-events-none px-6">
            <div key={captionKey} className="max-w-3xl text-center">
              <div
                className="text-xl md:text-3xl font-bold text-amber-50 tracking-[0.08em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: 'Cinzel, Georgia, serif' }}
              >
                {caption}
              </div>
              <div className="mt-2 text-xs md:text-sm text-cyan-50/90 max-w-xl mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                {sub}
              </div>
            </div>
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === beatIdx ? 'w-5 bg-amber-400' : i < beatIdx ? 'w-2 bg-orange-600/80' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="absolute top-[8vh] inset-x-0 z-10 flex items-start justify-between gap-2 p-3 md:p-4 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md px-3.5 py-2.5 max-w-xs">
            <div className="text-[9px] uppercase tracking-[0.28em] text-orange-400/90 font-semibold">
              Production Open · island-3d
            </div>
            <div className="text-sm text-white font-semibold mt-0.5">
              {SHIPWRECK_TUTORIAL_INTRO.label}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
              Leviathan ocean · wards · pinata · 20 m throw · tutorial wake
            </div>
            <div className="text-[9px] text-slate-500 mt-1.5">
              Captain {characterName}
              {characterId ? ` · ${characterId.slice(0, 8)}` : ''}
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => patchOpts({ mute: !opts.mute })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/70 border border-white/15 text-slate-100"
            >
              {opts.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setOptionsOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/70 border border-amber-600/40 text-amber-50"
            >
              <Settings className="w-3.5 h-3.5" />
              Options
            </button>
            <button
              type="button"
              disabled={!skippable && !ready}
              onClick={() => {
                cinemaRef.current?.skip();
                finish();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-700/95 border border-emerald-400/40 text-white disabled:opacity-35"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip · {destLabel}
            </button>
          </div>
        </div>
      </div>

      {optionsOpen && (
        <div className="shrink-0 border-t border-white/10 bg-black/95 px-4 py-4 max-h-[42vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h3 className="text-[10px] uppercase tracking-[0.28em] text-amber-400/90 font-semibold mb-2">
                After leviathan open
              </h3>
              {AFTER_INTRO_DESTINATIONS.map((d) => {
                const Icon = d.id === 'lobby' ? Ship
                  : d.id === 'tutorial' ? Anchor
                    : d.id === 'home_overboard' || d.id === 'home_abandon_ship' ? Home
                      : Waves;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => patchOpts({ destination: d.id })}
                    className={`w-full text-left rounded-xl border px-3 py-2 ${
                      opts.destination === d.id
                        ? 'border-amber-500/55 bg-amber-950/45'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-sm font-semibold text-white">{d.label}</span>
                      {d.id === 'tutorial' && (
                        <span className="ml-auto text-[8px] uppercase text-emerald-400 border border-emerald-700/50 px-1 rounded">
                          start
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 pl-5">{d.hint}</p>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input type="checkbox" checked={opts.autoAdvance} onChange={(e) => patchOpts({ autoAdvance: e.target.checked })} />
                Auto-enter after cinema (~{SHIPWRECK_CINEMA_DURATION_SEC}s)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-200">
                <input type="checkbox" checked={opts.playStormIntro} onChange={(e) => patchOpts({ playStormIntro: e.target.checked })} />
                Play intro next visit
              </label>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Story: open ocean · casters raise yin-yang rings · leviathan fire beam/aura ·
                supernova shield contacts · dive · breach pinata · hero thrown 20 m · logo ·
                chicken-gun pirate shipwreck tutorial wake.
              </p>
              <button
                type="button"
                onClick={() => {
                  cinemaRef.current?.skip();
                  finish('tutorial');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-700 text-white"
              >
                <Play className="w-4 h-4" />
                Enter tutorial island
              </button>
              {onSkipToGame && (
                <button type="button" onClick={onSkipToGame} className="text-[11px] text-slate-500 underline">
                  Skip session
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { buildAfterIntroUrl, loadOptions as loadIsland3dIntroOptions };
