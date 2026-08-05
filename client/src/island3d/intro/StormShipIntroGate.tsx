/**
 * StormShipIntroGate — production opener for /island-3d
 *
 * Native Three.js LeviathanOceanCinema (scripted battle · stage UUIDs · spine IK).
 * NO TI iframe · NO Stonewisp · NO intro.mp4 as primary gate.
 *
 * Default handoff: /tutorial wash-up on chicken-gun pirate-islands shipwreck_cove
 * (after leviathan attack + ship destroy beat).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AFTER_INTRO_DESTINATIONS,
  DEFAULT_INTRO_OPTIONS,
  INTRO_OPTIONS_KEY,
  INTRO_SESSION_KEY,
  type AfterIntroDestination,
  type Island3dIntroOptions,
} from '@shared/definitions/productionIntro';
import {
  LeviathanOceanCinema,
  LEVIATHAN_CINEMA_DURATION_SEC,
  LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC,
} from './LeviathanOceanCinema';
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
  const [loadU, setLoadU] = useState(0);
  const [loadStage, setLoadStage] = useState('Preparing cinema…');
  const [caption, setCaption] = useState('');
  const [sub, setSub] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [booting, setBooting] = useState(true);
  const [fadeOutBoot, setFadeOutBoot] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<LeviathanOceanCinema | null>(null);
  const finishedRef = useRef(false);

  const alreadySeen = useMemo(() => {
    if (force) return false;
    try {
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
    cinemaRef.current?.dispose();
    cinemaRef.current = null;
    const d = dest ?? opts.destination;
    onEnter(d, opts);
  }, [onEnter, opts]);

  // Mount native Three.js cinema (NOT an mp4 / not an iframe)
  useEffect(() => {
    if (alreadySeen && !force) return;
    let cancelled = false;
    let cinema: LeviathanOceanCinema | null = null;

    const mount = () => {
      const host = hostRef.current;
      if (!host || cancelled) return;
      // Ensure host has layout size before WebGL canvas
      if (host.clientWidth < 2 || host.clientHeight < 2) {
        requestAnimationFrame(mount);
        return;
      }

      setBooting(true);
      setFadeOutBoot(false);
      setLoadU(0.02);
      setLoadStage('Mounting WebGL…');

      cinema = new LeviathanOceanCinema(host, {
        onCaption: (c, s) => {
          setCaption(c);
          setSub(s);
        },
        onLoadProgress: (u, stage) => {
          setLoadU(u);
          setLoadStage(stage);
        },
        onProgress: (u, t) => {
          setProgress(u);
          if (t >= LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC) setCanSkip(true);
        },
        onReady: () => {
          setLoadU(1);
          setLoadStage('Ready');
          setFadeOutBoot(true);
          // Smooth plate fade then unmount boot layer
          window.setTimeout(() => setBooting(false), 480);
          // Apply gate mute preference once WebGL + audio bus exist
          cinema?.setAudioMuted(!!opts.mute);
          // QA: ?seek=29 or ?t=29 jumps to ward shatter / pinata review
          try {
            const q = new URLSearchParams(window.location.search);
            const seekRaw = q.get('seek') ?? q.get('t');
            if (seekRaw != null && cinema) {
              const sec = Number(seekRaw);
              if (Number.isFinite(sec) && sec > 0) {
                cinema.seekTo(sec);
                setCanSkip(true);
                setCaption(`SEEK ${sec}s`);
                setSub('QA jump — native Three.js cinema (not video)');
              }
            }
          } catch { /* */ }
        },
        onComplete: () => finish(),
      });
      cinemaRef.current = cinema;
    };

    // Double-rAF so letterbox flex layout settles before canvas size
    const id = requestAnimationFrame(() => requestAnimationFrame(mount));

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      cinema?.dispose();
      cinemaRef.current = null;
    };
  }, [alreadySeen, force, finish]);

  // Keyboard skip
  useEffect(() => {
    if (alreadySeen && !force) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        if (canSkip || e.key === 'Escape') {
          e.preventDefault();
          cinemaRef.current?.skip();
          finish();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alreadySeen, force, canSkip, finish]);

  if (alreadySeen && !force) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Letterbox top */}
      <div className="h-[7vh] shrink-0 bg-black z-20" />

      <div className="flex-1 relative min-h-0">
        {/* Native Three.js canvas host — NOT an mp4 / not a video tag */}
        <div
          ref={hostRef}
          className="absolute inset-0 w-full h-full bg-[#060a10]"
          data-cinema="leviathan-ocean"
        />

        {/* Full-screen load plate — assets + GPU warm before play */}
        {booting && (
          <div
            className={`absolute inset-0 z-[15] flex flex-col items-center justify-center bg-[#04080f] transition-opacity duration-500 ${
              fadeOutBoot ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-busy="true"
            aria-live="polite"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(14,60,90,0.35)_0%,_transparent_65%)]" />
            <div className="relative z-[1] flex flex-col items-center px-6 max-w-md w-full">
              <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/90 font-semibold mb-2">
                Grudge · Production cinema
              </div>
              <div className="font-cinzel text-2xl md:text-3xl tracking-widest text-amber-100/95 text-center">
                Leviathan Ocean
              </div>
              <p className="text-[12px] text-slate-400 mt-2 text-center leading-relaxed">
                Preparing native Three.js cutscene — ship, storm, and cast.
              </p>
              {/* Load bar */}
              <div className="mt-8 w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-sky-400 to-amber-400 transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(4, loadU * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
                  <span className="text-cyan-300/80 truncate max-w-[70%]">{loadStage}</span>
                  <span>{Math.round(loadU * 100)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-6 text-center">
                Timeline starts after shaders warm · smoother first frames
              </p>
            </div>
          </div>
        )}

        {/* Beat progress (after ready) */}
        {!booting && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-amber-500 transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {/* Caption plate */}
        {!booting && (caption || sub) && (
          <div className="absolute bottom-[10vh] inset-x-0 z-10 flex justify-center pointer-events-none px-4">
            <div className="rounded-xl border border-cyan-800/40 bg-black/70 backdrop-blur-md px-6 py-3 max-w-xl text-center">
              {caption && (
                <div className="font-cinzel text-lg md:text-xl tracking-widest text-amber-200">
                  {caption}
                </div>
              )}
              {sub && <p className="text-sm text-slate-300 mt-1 leading-relaxed">{sub}</p>}
            </div>
          </div>
        )}

        {/* Top chrome — hide during boot so load plate is clean */}
        <div
          className={`absolute top-0 inset-x-0 z-10 flex items-start justify-between gap-2 p-3 pointer-events-none transition-opacity duration-300 ${
            booting ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="pointer-events-auto rounded-xl border border-cyan-800/40 bg-black/75 backdrop-blur-md px-3 py-2 max-w-sm">
            <div className="text-[10px] uppercase tracking-widest text-cyan-400/90 font-semibold">
              Production Open · island-3d · v22 film
            </div>
            <div className="text-sm text-white font-medium">Leviathan Ocean Battle</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Adaptive quality · deck pathfind · letterbox
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Captain {characterName}
              {characterId ? ` · ${characterId.slice(0, 8)}…` : ''}
              {' · '}
              {Math.round(progress * LEVIATHAN_CINEMA_DURATION_SEC)}s / {LEVIATHAN_CINEMA_DURATION_SEC}s
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => {
                const next = !opts.mute;
                patchOpts({ mute: next });
                cinemaRef.current?.setAudioMuted(next);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/80 border border-slate-600 text-slate-200"
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
              disabled={!canSkip}
              onClick={() => {
                cinemaRef.current?.skip();
                finish();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-800/90 border border-emerald-500/50 text-white disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {canSkip ? 'Skip · Enter' : `Skip in ${Math.ceil(Math.max(0, LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC - progress * LEVIATHAN_CINEMA_DURATION_SEC))}s`}
            </button>
          </div>
        </div>
      </div>

      {/* Letterbox bottom */}
      <div className="h-[7vh] shrink-0 bg-black z-20" />

      {optionsOpen && (
        <div className="absolute bottom-[7vh] inset-x-0 z-30 shrink-0 border-t border-white/10 bg-black/95 backdrop-blur-md px-4 py-3 max-h-[42vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-amber-400/90 font-semibold mb-2">
                After leviathan cinema
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
                  checked={opts.playStormIntro}
                  onChange={(e) => patchOpts({ playStormIntro: e.target.checked })}
                />
                Play cinema next visit
              </label>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-slate-500 space-y-1">
                <p>
                  <span className="text-cyan-400/90">Engine:</span> LeviathanOceanCinema v24 · post · ~100fps budget · casting tornados
                </p>
                <p>
                  <span className="text-amber-400/90">Cast:</span> leviathan + 4 orc mages · GPU wind cyclones (casting-abilities)
                </p>
                <p>
                  <span className="text-rose-400/90">Kill list:</span> TI iframe · Stonewisp · intro.mp4 · dual WebGL
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    cinemaRef.current?.skip();
                    finish();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-700 text-white border border-emerald-500/40"
                >
                  <Play className="w-4 h-4" />
                  Enter {AFTER_INTRO_DESTINATIONS.find((d) => d.id === opts.destination)?.label}
                </button>
                {onSkipToGame && (
                  <button
                    type="button"
                    onClick={() => {
                      cinemaRef.current?.dispose();
                      onSkipToGame();
                    }}
                    className="px-3 py-2 rounded-xl text-xs text-slate-300 border border-white/15"
                  >
                    Skip all
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
