/**
 * /war-scene — Conqueror's Blade–style island siege
 *
 * Flow: load fortress → cinematic declaration (AI voice) → deploy → siege waves
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  WarSceneEngine,
  type WarSceneStats,
  type DeployHudStats,
  type WarMatchPhase,
} from '@/warscene/WarSceneEngine';
import {
  Swords,
  Shield,
  Flame,
  ArrowLeft,
  Volume2,
  SkipForward,
  Flag,
  Users,
} from 'lucide-react';

export default function WarScenePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WarSceneEngine | null>(null);
  const [, navigate] = useLocation();

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
  const [starting, setStarting] = useState(false);

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
      onCombatLog: (line) => {
        setLog((prev) => [...prev.slice(-40), line]);
      },
      onPhaseChange: (p) => setPhase(p),
      onSubtitle: (text, role) => {
        setSubtitle(text);
        setSpeaker(role);
      },
      onDeployStats: (d) => setDeploy(d),
      onReady: () => {
        setLoading(false);
        engine.start();
        refreshStats();
      },
    });
    engineRef.current = engine;

    engine
      .init()
      .catch((err) => {
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
      await eng.beginSiege({ playerFaction: 'crimson' });
      refreshStats();
    } finally {
      setStarting(false);
    }
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

  return (
    <div className="relative w-full h-screen bg-[#0a0c12] overflow-hidden" ref={containerRef}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 py-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={() => navigate('/play')}
          className="pointer-events-auto text-slate-400 hover:text-white text-sm inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Swords className="w-4 h-4 text-amber-400" />
        <h1 className="text-amber-300 font-bold text-sm tracking-wide">
          Warlord Isle · Siege
        </h1>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          cinematic · deploy · waves · walls
        </span>
        <PhaseBadge phase={phase} />
        {stats && (
          <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-slate-300">
            <span className="text-red-400">Crimson {stats.crimson}</span>
            <span className="text-sky-400">Azure {stats.azure}</span>
            <span className="text-amber-400">Gold {stats.gold}</span>
            <span className="text-emerald-400">Field {stats.alive}</span>
            <span className="text-stone-300">
              Walls {stats.wallsIntact}
              {stats.wallsDestroyed > 0 ? (
                <span className="text-orange-400"> · −{stats.wallsDestroyed}</span>
              ) : null}
            </span>
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
              className="h-full bg-gradient-to-r from-amber-700 to-amber-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-600 text-[10px] mt-3 font-mono">{Math.round(progress)}%</p>
          <p className="text-slate-600 text-[10px] mt-6 max-w-sm text-center leading-relaxed">
            Island fortress loads first. Armies stay in reserve until the declaration
            ends and you deploy — Conqueror&apos;s Blade style siege waves.
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 px-6">
          <div className="max-w-xl text-center space-y-3">
            <p className="text-red-400 font-semibold">Failed to load war scene</p>
            <p className="text-slate-400 text-xs break-words whitespace-pre-wrap text-left font-mono bg-black/40 rounded-lg p-3 max-h-48 overflow-auto">
              {error}
            </p>
            <div className="text-slate-500 text-[11px] space-y-1 text-left">
              <p>
                <strong className="text-slate-300">Production:</strong> fortress must be on R2 CDN
                (<code className="text-amber-600">models/war/huge_medieval_battle_scene.glb</code>
                ~517MB). Not the local API path.
              </p>
              <p>
                <strong className="text-slate-300">Local dev:</strong>{' '}
                <code className="text-amber-600">npm run dev</code> +{' '}
                <code className="text-amber-600">/war-scene?local=1</code> (streams D: drive GLB).
              </p>
              <p>
                Upload:{' '}
                <code className="text-amber-600">npm run upload:war-scene</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-amber-400 text-sm underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Cinematic subtitles + skip */}
      {!loading && !error && phase === 'cinematic' && (
        <div className="absolute inset-x-0 bottom-0 z-30 pb-10 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 text-amber-500/90 text-[10px] uppercase tracking-[0.25em] mb-3">
              <Volume2 className="w-3.5 h-3.5" />
              Declaration of War
              {speakerLabel ? (
                <span className="text-slate-400 normal-case tracking-normal">· {speakerLabel}</span>
              ) : null}
            </div>
            <p className="text-lg sm:text-xl text-amber-50 font-serif leading-relaxed drop-shadow-lg min-h-[3.5rem]">
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

      {/* Deploy panel */}
      {!loading && !error && phase === 'deploy' && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-4 sm:p-6 pointer-events-none">
          <div className="max-w-xl mx-auto bg-black/75 backdrop-blur-md border border-amber-900/50 rounded-2xl px-5 py-4 pointer-events-auto shadow-2xl">
            <div className="flex items-start gap-3 mb-3">
              <Flag className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-amber-200 font-bold text-sm tracking-wide">
                  Deployment Phase
                </h2>
                <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                  Companies wait in reserve — nothing floods the island yet. Opening
                  deploy fields ~{deploy?.zones[0]?.deployCap ?? 10} per banner, then
                  the siege starts. Reinforcements arrive in timed waves.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] font-mono">
              <ReserveChip label="Crimson" n={deploy?.reserve.crimson ?? 0} color="text-red-400" />
              <ReserveChip label="Azure" n={deploy?.reserve.azure ?? 0} color="text-sky-400" />
              <ReserveChip label="Gold" n={deploy?.reserve.gold ?? 0} color="text-amber-400" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                disabled={starting}
                onClick={onBeginSiege}
                className="flex-1 min-w-[10rem] bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-black font-bold text-sm py-2.5 rounded-xl disabled:opacity-50"
              >
                {starting ? 'Fielding companies…' : 'Begin Siege'}
              </button>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Cap {deploy?.maxFielded ?? 64} on field
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Siege reinforcement strip */}
      {!loading && !error && phase === 'siege' && stats && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/60 border border-orange-900/40 rounded-full px-4 py-1.5 text-[10px] font-mono text-slate-300 flex items-center gap-3">
            <span className="text-orange-400 font-bold uppercase tracking-wider">Siege</span>
            <span>Wave {stats.waveNumber || '—'}</span>
            <span className="text-slate-500">
              Next {Math.ceil(stats.nextWaveIn)}s
            </span>
            <span className="text-slate-500">
              Reserve C{stats.reserve.crimson ?? 0}/A{stats.reserve.azure ?? 0}/G
              {stats.reserve.gold ?? 0}
            </span>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-serif text-amber-200 mb-2">Siege Resolved</p>
            <p className="text-slate-400 text-sm">Check battle log for the victor.</p>
          </div>
        </div>
      )}

      {/* Combat log */}
      {!loading && !error && phase !== 'cinematic' && (
        <div className="absolute bottom-4 left-4 z-20 w-80 max-h-40 overflow-hidden pointer-events-none">
          <div className="bg-black/65 backdrop-blur border border-amber-900/40 rounded-xl px-3 py-2">
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Battle log
            </div>
            <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
              {log.slice(-8).map((l, i) => (
                <div key={i} className="truncate">
                  {l}
                </div>
              ))}
              {log.length === 0 && (
                <div className="text-slate-600">Awaiting orders…</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && phase === 'siege' && (
        <div className="absolute bottom-4 right-4 z-20 text-[10px] text-slate-500 bg-black/50 rounded-lg px-3 py-2 pointer-events-none">
          Orbit: drag · Zoom: scroll · AI siege walls · Wave reinforcements
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

function ReserveChip({
  label,
  n,
  color,
}: {
  label: string;
  n: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
      <div className={`font-bold ${color}`}>{n}</div>
      <div className="text-slate-500">{label} reserve</div>
    </div>
  );
}
