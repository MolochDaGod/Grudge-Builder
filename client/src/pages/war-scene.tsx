/**
 * /war-scene — Active medieval battle from huge_medieval_battle_scene.glb
 *
 * Loads the fortress battlefield, replaces PG_* unit proxies with animated
 * grudge6 toon soldiers, runs goal-oriented AI + weapon skills.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { WarSceneEngine, type WarSceneStats } from '@/warscene/WarSceneEngine';
import { Swords, Shield, Flame, ArrowLeft } from 'lucide-react';

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

    const engine = new WarSceneEngine({
      canvas,
      width: w,
      height: h,
      maxUnits: Number(new URLSearchParams(window.location.search).get('units') || 64),
      onLoadProgress: (pct, label) => {
        setProgress(pct);
        setLoadLabel(label);
      },
      onCombatLog: (line) => {
        setLog((prev) => [...prev.slice(-40), line]);
      },
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
          Medieval War Scene
        </h1>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          fortress GLB · grudge6 units · GOAP AI · Mixamo skills
        </span>
        {stats && (
          <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-slate-300">
            <span className="text-red-400">Crimson {stats.crimson}</span>
            <span className="text-sky-400">Azure {stats.azure}</span>
            <span className="text-amber-400">Gold {stats.gold}</span>
            <span className="text-emerald-400">Alive {stats.alive}</span>
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
            Assembling the War
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
            Scene has no embedded skeletons — we hide PG_* proxies and bake grudge6
            race models with Mixamo weapon packs + goal AI at each unit pose.
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 px-6">
          <div className="max-w-lg text-center space-y-3">
            <p className="text-red-400 font-semibold">Failed to load war scene</p>
            <p className="text-slate-400 text-xs break-words">{error}</p>
            <p className="text-slate-500 text-[11px]">
              Place GLB at{' '}
              <code className="text-amber-600">D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb</code>
              {' '}and open with <code className="text-amber-600">?local=1</code>, or upload to R2
              as <code className="text-amber-600">/models/war/huge_medieval_battle_scene.glb</code>.
            </p>
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

      {/* Combat log */}
      {!loading && !error && (
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
                <div className="text-slate-600">Armies forming lines…</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {!loading && !error && (
        <div className="absolute bottom-4 right-4 z-20 text-[10px] text-slate-500 bg-black/50 rounded-lg px-3 py-2 pointer-events-none">
          Orbit: drag · Zoom: scroll · Units auto-aggro · Skills on attack CD
        </div>
      )}
    </div>
  );
}
