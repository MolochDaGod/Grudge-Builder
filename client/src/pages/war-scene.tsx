/**
 * /war-scene — Conqueror's Blade island siege
 * Hero select → cinematic → ordered deploy → 10min / 3-zone siege
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  WarSceneEngine,
  type WarSceneStats,
  type DeployHudStats,
  type WarMatchPhase,
  type PlayerHeroOpts,
} from '@/warscene/WarSceneEngine';
import type { MatchHud } from '@/warscene/WarMatchRules';
import { buildFactionRoster, type RosterEntry } from '@/warscene/WarRoster';
import { useCharacters } from '@/hooks/use-characters';
import { normalizeRaceId } from '@shared/fleet';
import {
  Swords,
  Shield,
  Flame,
  ArrowLeft,
  Volume2,
  SkipForward,
  Flag,
  Timer,
  Crosshair,
  User,
  Wallet,
} from 'lucide-react';
import { GrudgeTokenWidget } from '@/components/grudge-token/GrudgeTokenWidget';

const RACE_OPTIONS = [
  { id: 'human', label: 'Human' },
  { id: 'elf', label: 'Elf' },
  { id: 'orc', label: 'Orc' },
  { id: 'dwarf', label: 'Dwarf' },
  { id: 'barbarian', label: 'Barbarian' },
  { id: 'undead', label: 'Undead' },
];

export default function WarScenePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WarSceneEngine | null>(null);
  const [, navigate] = useLocation();
  const { characters, loading: charsLoading, activeCharacter } = useCharacters();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Booting…');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WarSceneStats | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<WarMatchPhase>('loading');
  const [subtitle, setSubtitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [deploy, setDeploy] = useState<DeployHudStats | null>(null);
  const [matchHud, setMatchHud] = useState<MatchHud | null>(null);
  const [starting, setStarting] = useState(false);
  const [endMsg, setEndMsg] = useState<string | null>(null);
  const [weather, setWeather] = useState('storm');
  const [camMode, setCamMode] = useState<'follow' | 'tactical' | 'orbit'>('follow');

  // Deploy UX state
  const [step, setStep] = useState<'hero' | 'roster' | 'ready'>('hero');
  const [heroRace, setHeroRace] = useState('human');
  const [heroName, setHeroName] = useState('Warlord');
  const [heroCharId, setHeroCharId] = useState<string | undefined>();
  const [roster, setRoster] = useState<RosterEntry[]>(() => buildFactionRoster('crimson'));
  const [useHero, setUseHero] = useState(true);

  useEffect(() => {
    if (activeCharacter) {
      setHeroName(activeCharacter.name || 'Warlord');
      setHeroRace(normalizeRaceId(activeCharacter.raceId || 'human'));
      setHeroCharId(activeCharacter.id);
    }
  }, [activeCharacter]);

  const refreshStats = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    setStats(eng.getStats());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const params = new URLSearchParams(window.location.search);

    const engine = new WarSceneEngine({
      canvas,
      width: w,
      height: h,
      maxUnits: Number(params.get('units') || 64),
      skipCinematic: params.get('skip') === '1',
      deployPerFaction: Number(params.get('deploy') || 10),
      onLoadProgress: (pct, label) => {
        setProgress(pct);
        setLoadLabel(label);
      },
      onCombatLog: (line) => setLog((prev) => [...prev.slice(-40), line]),
      onPhaseChange: (p) => setPhase(p),
      onSubtitle: (text, role) => {
        setSubtitle(text);
        setSpeaker(role);
      },
      onDeployStats: (d) => setDeploy(d),
      onMatchHud: (m) => setMatchHud(m),
      onMatchEnd: (winner, reason) => {
        setEndMsg(`${winner.toUpperCase()} — ${reason}`);
      },
      onReady: () => {
        setLoading(false);
        engine.start();
        refreshStats();
      },
    });
    engineRef.current = engine;

    engine.init().catch((err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });

    const onResize = () => {
      if (!container) return;
      engine.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);
    const statsIv = setInterval(refreshStats, 1000);

    return () => {
      window.removeEventListener('resize', onResize);
      clearInterval(statsIv);
      engine.dispose();
      engineRef.current = null;
    };
  }, [refreshStats]);

  const onBeginSiege = async () => {
    const eng = engineRef.current;
    if (!eng || starting) return;
    setStarting(true);
    try {
      const hero: PlayerHeroOpts | null = useHero
        ? { raceId: heroRace, name: heroName, characterId: heroCharId, faction: 'crimson' }
        : null;
      await eng.beginSiege({
        playerFaction: 'crimson',
        hero,
        roster,
      });
      refreshStats();
    } finally {
      setStarting(false);
    }
  };

  const toggleRoster = (id: string) => {
    setRoster((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)),
    );
  };

  const speakerLabel =
    speaker === 'crimson_lord'
      ? 'Crimson Lord'
      : speaker === 'azure_lord'
        ? 'Azure Lord'
        : speaker === 'herald'
          ? 'Royal Herald'
          : speaker === 'narrator'
            ? 'Narrator'
            : '';

  const orderedRoster = useMemo(
    () => [...roster].sort((a, b) => a.order - b.order),
    [roster],
  );

  return (
    <div className="relative w-full h-screen bg-[#0a0c12] overflow-hidden" ref={containerRef}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Canonical fleet surface: wallet FAB (also global App widget; force-show here) */}
      <div className="pointer-events-auto">
        <GrudgeTokenWidget />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 py-2 bg-gradient-to-b from-black/85 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={() => navigate('/play')}
          className="pointer-events-auto text-slate-400 hover:text-white text-sm inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Swords className="w-4 h-4 text-amber-400" />
        <h1 className="text-amber-300 font-bold text-sm tracking-wide">Warlord Isle · Siege</h1>
        <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">
          grudgewarlords.com/war-scene
        </span>
        <PhaseBadge phase={phase} />
        <button
          type="button"
          onClick={() => navigate('/wallet')}
          className="pointer-events-auto ml-1 inline-flex items-center gap-1 text-[11px] text-amber-300/90 hover:text-amber-200 border border-amber-700/40 rounded-full px-2.5 py-1 bg-black/40"
          title="Grudge wallet"
          data-testid="war-scene-wallet"
        >
          <Wallet className="w-3.5 h-3.5" />
          Wallet
        </button>
        {stats && (
          <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-slate-300">
            {(phase === 'siege' || phase === 'ended') && (
              <span className="text-amber-300 inline-flex items-center gap-1">
                <Timer className="w-3 h-3" /> {stats.clock}
              </span>
            )}
            <span className="text-red-400">C {stats.crimson}</span>
            <span className="text-sky-400">A {stats.azure}</span>
            <span className="text-stone-300">Walls {stats.wallsIntact}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0c12]/95">
          <Flame className="w-10 h-10 text-amber-500 animate-pulse mb-4" />
          <p className="text-amber-200 font-semibold tracking-widest text-sm uppercase mb-2">
            Assembling Warlord Isle
          </p>
          <p className="text-slate-400 text-xs mb-4 max-w-md text-center">{loadLabel}</p>
          <div className="w-72 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-700 to-amber-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-600 text-[10px] mt-3 font-mono">{Math.round(progress)}%</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 px-6">
          <div className="max-w-xl text-center space-y-3">
            <p className="text-red-400 font-semibold">Failed to load war scene</p>
            <p className="text-slate-400 text-xs break-words whitespace-pre-wrap font-mono bg-black/40 rounded-lg p-3 text-left max-h-48 overflow-auto">
              {error}
            </p>
            <p className="text-slate-500 text-[11px]">
              Production: <code className="text-amber-600">npm run upload:war-scene</code> · Local:{' '}
              <code className="text-amber-600">?local=1</code>
            </p>
            <button type="button" onClick={() => window.location.reload()} className="text-amber-400 text-sm underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Cinematic */}
      {!loading && !error && phase === 'cinematic' && (
        <div className="absolute inset-x-0 bottom-0 z-30 pb-10 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 text-amber-500/90 text-[10px] uppercase tracking-[0.25em] mb-3">
              <Volume2 className="w-3.5 h-3.5" /> Declaration of War
              {speakerLabel ? <span className="text-slate-400 normal-case tracking-normal">· {speakerLabel}</span> : null}
            </div>
            <p className="text-lg sm:text-xl text-amber-50 font-serif leading-relaxed min-h-[3.5rem]">
              {subtitle || '…'}
            </p>
            <button
              type="button"
              onClick={() => engineRef.current?.skipCinematic()}
              className="pointer-events-auto mt-6 inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white border border-white/20 rounded-full px-4 py-2 bg-black/40"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip intro
            </button>
          </div>
        </div>
      )}

      {/* Deploy UX: hero + ordered roster */}
      {!loading && !error && phase === 'deploy' && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-3 sm:p-5 pointer-events-none">
          <div className="max-w-2xl mx-auto bg-black/80 backdrop-blur-md border border-amber-900/50 rounded-2xl px-4 py-4 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-amber-200 font-bold text-sm">Deploy your army</h2>
                <p className="text-slate-400 text-[11px]">
                  Conqueror&apos;s Blade style: pick hero → order companies → siege opens with catapult fire. Capture all 3
                  zones or win on the 10:00 timer.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="flex gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider">
              {(['hero', 'roster', 'ready'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`px-2.5 py-1 rounded-full ${
                    step === s ? 'bg-amber-600 text-black' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {s === 'hero' ? '1. Hero' : s === 'roster' ? '2. Companies' : '3. Launch'}
                </button>
              ))}
            </div>

            {step === 'hero' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={useHero} onChange={(e) => setUseHero(e.target.checked)} />
                  Play as grudge6 hero in the battle
                </label>
                {useHero && (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> Your characters
                      </p>
                      {charsLoading && <p className="text-[10px] text-slate-600">Loading characters…</p>}
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                        {characters.slice(0, 12).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setHeroCharId(c.id);
                              setHeroName(c.name || 'Warlord');
                              setHeroRace(normalizeRaceId(c.raceId || 'human'));
                            }}
                            className={`text-[10px] px-2 py-1 rounded border ${
                              heroCharId === c.id
                                ? 'border-amber-500 bg-amber-900/40 text-amber-100'
                                : 'border-white/10 text-slate-400 hover:border-white/30'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                        {!charsLoading && characters.length === 0 && (
                          <span className="text-[10px] text-slate-600">No saved heroes — pick a race below</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        value={heroName}
                        onChange={(e) => setHeroName(e.target.value)}
                        className="bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white w-36"
                        placeholder="Hero name"
                      />
                      <div className="flex flex-wrap gap-1">
                        {RACE_OPTIONS.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setHeroRace(r.id)}
                            className={`text-[10px] px-2 py-1 rounded ${
                              heroRace === r.id ? 'bg-amber-600 text-black' : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setStep('roster')}
                  className="w-full bg-amber-700/80 hover:bg-amber-600 text-black font-bold text-sm py-2 rounded-xl"
                >
                  Next: order companies
                </button>
              </div>
            )}

            {step === 'roster' && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500">
                  Ordered list (siege engines first). Toggle what you field — catapult starts damaging walls at round start.
                </p>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {orderedRoster.map((e, idx) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleRoster(e.id)}
                      className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg border ${
                        e.selected
                          ? 'border-amber-700/60 bg-amber-950/30'
                          : 'border-white/5 bg-white/[0.02] opacity-50'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-slate-500 w-5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-amber-100 font-semibold">
                          {e.label}
                          {e.kind === 'siege' && (
                            <span className="ml-1 text-[9px] uppercase text-orange-400">siege</span>
                          )}
                          <span className="ml-2 text-slate-500 font-normal">×{e.count}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{e.description}</div>
                      </div>
                      <span className="text-[10px] text-slate-400">{e.selected ? 'ON' : 'off'}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('ready')}
                  className="w-full bg-amber-700/80 hover:bg-amber-600 text-black font-bold text-sm py-2 rounded-xl"
                >
                  Next: launch siege
                </button>
              </div>
            )}

            {step === 'ready' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <StatChip label="Beach" value={deploy?.captureZones?.find((z) => z.id === 'zone_beach')?.owner ?? '—'} />
                  <StatChip label="Gate" value={deploy?.captureZones?.find((z) => z.id === 'zone_gate')?.owner ?? '—'} />
                  <StatChip label="Keep" value={deploy?.captureZones?.find((z) => z.id === 'zone_keep')?.owner ?? '—'} />
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Round: <strong className="text-amber-200">10:00</strong> or last zone captured</li>
                  <li>Catapult damages walls from second 0</li>
                  <li>
                    Hero:{' '}
                    {useHero ? (
                      <strong className="text-amber-200">
                        {heroName} ({heroRace})
                      </strong>
                    ) : (
                      'observer'
                    )}
                  </li>
                  <li>Click ground in battle to move your hero</li>
                </ul>
                <button
                  type="button"
                  disabled={starting}
                  onClick={onBeginSiege}
                  className="w-full bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-black font-bold text-sm py-2.5 rounded-xl disabled:opacity-50"
                >
                  {starting ? 'Fielding army…' : 'Begin Siege'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Siege HUD */}
      {!loading && !error && phase === 'siege' && matchHud && (
        <>
          <div className="absolute top-12 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
            <div className="bg-black/65 border border-white/10 rounded-xl px-2 py-1.5 text-[9px] text-slate-300">
              <div className="text-slate-500 uppercase tracking-wider mb-1">Weather</div>
              <div className="flex flex-col gap-0.5">
                {(
                  [
                    ['storm', 'Storm'],
                    ['dusk_battle', 'Dusk'],
                    ['golden_hour', 'Golden'],
                    ['overcast', 'Overcast'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setWeather(id);
                      engineRef.current?.setWeather(id as any);
                    }}
                    className={`text-left px-1.5 py-0.5 rounded ${
                      weather === id ? 'bg-amber-700/50 text-amber-100' : 'hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-slate-500 uppercase tracking-wider mt-2 mb-1">Camera</div>
              <div className="flex flex-col gap-0.5">
                {(
                  [
                    ['follow', 'Follow hero'],
                    ['tactical', 'Tactical'],
                    ['orbit', 'Free orbit'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCamMode(id);
                      engineRef.current?.setCameraMode(id);
                    }}
                    className={`text-left px-1.5 py-0.5 rounded ${
                      camMode === id ? 'bg-sky-800/50 text-sky-100' : 'hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-black/70 border border-orange-900/40 rounded-2xl px-4 py-2 text-[10px] font-mono text-slate-200 flex flex-col items-center gap-1.5 min-w-[280px]">
              <div className="flex items-center gap-3">
                <span className="text-orange-400 font-bold uppercase tracking-wider">Siege</span>
                <span className="text-amber-300 text-sm font-bold">{stats?.clock ?? '10:00'}</span>
                <span className="text-slate-500">Wave {stats?.waveNumber || 0}</span>
              </div>
              <div className="flex gap-2 w-full justify-center">
                {matchHud.zones.map((z) => (
                  <div key={z.id} className="flex flex-col items-center min-w-[72px]">
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        z.owner === 'crimson'
                          ? 'text-red-400'
                          : z.owner === 'azure'
                            ? 'text-sky-400'
                            : z.owner === 'gold'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                      }`}
                    >
                      {z.label}
                    </span>
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${Math.round(z.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-slate-500">
                Catapults {matchHud.catapults} · Walls {matchHud.wallsIntact}
                {matchHud.wallsDestroyed > 0 ? ` (−${matchHud.wallsDestroyed})` : ''}
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 z-20 text-[10px] text-slate-400 bg-black/55 rounded-lg px-3 py-2 pointer-events-none max-w-[200px]">
            <Crosshair className="w-3 h-3 inline mr-1 text-amber-500" />
            Click ground to move hero · Orbit: drag · Zoom: scroll · Capture banners
          </div>
        </>
      )}

      {phase === 'ended' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55">
          <div className="text-center bg-black/80 border border-amber-800/50 rounded-2xl px-8 py-6 max-w-md">
            <p className="text-2xl font-serif text-amber-200 mb-2">Siege Resolved</p>
            <p className="text-slate-300 text-sm mb-4">{endMsg ?? 'Check battle log.'}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-amber-400 text-sm underline"
            >
              Fight again
            </button>
          </div>
        </div>
      )}

      {/* Combat log — offset above wallet FAB (bottom-left token) */}
      {!loading && !error && phase !== 'cinematic' && (
        <div className="absolute bottom-28 left-4 z-20 w-80 max-h-36 overflow-hidden pointer-events-none">
          <div className="bg-black/65 backdrop-blur border border-amber-900/40 rounded-xl px-3 py-2">
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Battle log
            </div>
            <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
              {log.slice(-7).map((l, i) => (
                <div key={i} className="truncate">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: WarMatchPhase }) {
  const map: Record<WarMatchPhase, { label: string; cls: string }> = {
    loading: { label: 'Loading', cls: 'bg-slate-700 text-slate-200' },
    cinematic: { label: 'Cinematic', cls: 'bg-violet-900/80 text-violet-200' },
    deploy: { label: 'Deploy', cls: 'bg-amber-900/80 text-amber-200' },
    siege: { label: 'Siege', cls: 'bg-orange-900/80 text-orange-200' },
    ended: { label: 'Ended', cls: 'bg-emerald-900/80 text-emerald-200' },
  };
  const m = map[phase];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${m.cls}`}>
      {m.label}
    </span>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
      <div className="text-slate-500 text-[9px] uppercase">{label}</div>
      <div className="text-slate-200 font-bold capitalize truncate">{value}</div>
    </div>
  );
}
