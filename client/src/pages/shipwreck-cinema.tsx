/**
 * Shipwreck / Leviathan cinema — full-systems production frontend surface.
 *
 * Replaces the purged standalone `shipwreck-cinema-preview.html` (no assets / video).
 * Runs LeviathanOceanCinema on startingfalls map with stage UUIDs, spine IK,
 * 4 mages + unarmed hero + leviathan battle script.
 *
 * Routes:
 *   /shipwreck-cinema
 *   /island-3d?intro=1  (via StormShipIntroGate on island-3d page)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  LeviathanOceanCinema,
  LEVIATHAN_CINEMA_DURATION_SEC,
  LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC,
  STAGE_ID,
} from '@/island3d/intro/LeviathanOceanCinema';
import { SkipForward, ExternalLink } from 'lucide-react';

export default function ShipwreckCinemaPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<LeviathanOceanCinema | null>(null);
  const [, navigate] = useLocation();
  const [caption, setCaption] = useState('LOADING');
  const [sub, setSub] = useState('Staging startingfalls · leviathan · grudge6 cast…');
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    cinemaRef.current?.dispose();
    cinemaRef.current = null;
    navigate('/tutorial?from=shipwreck-intro');
  }, [navigate]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Clear any stale session so QA always plays
    try {
      sessionStorage.removeItem('grudge_shipwreck_intro_seen_v8');
      sessionStorage.removeItem('grudge_storm_intro_seen_v1');
      sessionStorage.removeItem('grudge_shipwreck_intro_seen_v4');
      sessionStorage.removeItem('grudge_shipwreck_intro_seen_v7');
    } catch { /* */ }

    let skippable = false;
    const cinema = new LeviathanOceanCinema(host, {
      onCaption: (c, s) => {
        setCaption(c || '…');
        setSub(s);
      },
      onProgress: (u, t) => {
        setProgress(u);
        if (t >= LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC) {
          skippable = true;
          setCanSkip(true);
        }
      },
      onReady: () => setReady(true),
      onComplete: () => finish(),
    });
    cinemaRef.current = cinema;

    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && skippable) {
        e.preventDefault();
        cinema.skip();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      cinema.dispose();
      cinemaRef.current = null;
    };
  }, [finish]);

  return (
    <div className="fixed inset-0 z-[300] bg-black text-white">
      <div className="h-[7vh] bg-black" />
      <div className="relative" style={{ height: '86vh' }}>
        <div ref={hostRef} className="absolute inset-0 w-full h-full" />

        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-cyan-200/90">Loading startingfalls · leviathan battle systems…</p>
            <p className="text-[10px] text-slate-500 font-mono">{STAGE_ID}</p>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-amber-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {(caption || sub) && (
          <div className="absolute bottom-10 inset-x-0 z-10 flex justify-center px-4 pointer-events-none">
            <div className="rounded-xl border border-cyan-800/40 bg-black/75 backdrop-blur-md px-6 py-3 max-w-xl text-center">
              <div className="font-cinzel text-lg tracking-widest text-amber-200">{caption}</div>
              {sub && <p className="text-sm text-slate-300 mt-1">{sub}</p>}
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 right-3 z-20 flex justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-cyan-800/40 bg-black/80 px-3 py-2 max-w-md">
            <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">
              Frontend cinema · full systems
            </div>
            <div className="text-sm font-medium">Leviathan · startingfalls · stage UUIDs · spine IK</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {Math.round(progress * LEVIATHAN_CINEMA_DURATION_SEC)}s / {LEVIATHAN_CINEMA_DURATION_SEC}s
              {' · '}no video · no TI iframe
            </div>
          </div>
          <div className="pointer-events-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/island-3d?intro=1')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-black/80 border border-slate-600 text-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              island-3d gate
            </button>
            <button
              type="button"
              disabled={!canSkip}
              onClick={() => {
                cinemaRef.current?.skip();
                finish();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-800 border border-emerald-500 text-white disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {canSkip ? 'Skip · Tutorial' : 'Skip soon…'}
            </button>
          </div>
        </div>
      </div>
      <div className="h-[7vh] bg-black" />
    </div>
  );
}
