/**
 * Leviathan Ocean cinema — production first-voyage opener.
 *
 * Beat flow (LeviathanOceanCinema / battle script):
 *   leviathan attack → ship destroy (breach/pinata) → throw/sink → blackout logo
 *   → handoff to /tutorial on chicken-gun pirate-islands shipwreck_cove wash-up
 *
 * Routes:
 *   /leviathan-cinema          ← CANONICAL (home / heroes / Foundry returnTo)
 *   /shipwreck-cinema         ← legacy redirect only (see legacy-shipwreck-cinema-redirect)
 *   /island-3d?intro=1        ← StormShipIntroGate (same engine, not primary entry)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  LeviathanOceanCinema,
  LEVIATHAN_CINEMA_DURATION_SEC,
  LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC,
  STAGE_ID,
} from '@/island3d/intro/LeviathanOceanCinema';
import { INTRO_SESSION_KEY } from '@shared/definitions/productionIntro';
import { tutorialShipwreckWashupPath } from '@shared/definitions/warlordsProductionFlow';
import {
  applyCharacterHandoffFromLocation,
  ensurePlayEntrySession,
  persistActiveCharacter,
} from '@/lib/characterHandoff';
import { SkipForward } from 'lucide-react';

export default function ShipwreckCinemaPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<LeviathanOceanCinema | null>(null);
  const [, navigate] = useLocation();
  const [caption, setCaption] = useState('');
  const [sub, setSub] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadU, setLoadU] = useState(0);
  const [loadStage, setLoadStage] = useState('Preparing cinema…');
  const [ready, setReady] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const finished = useRef(false);

  // Phase B: claim JWT + activate characterId before cinema (handoff to tutorial)
  useEffect(() => {
    void ensurePlayEntrySession({ search: window.location.search });
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    cinemaRef.current?.dispose();
    cinemaRef.current = null;

    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }

    const handoff = applyCharacterHandoffFromLocation();
    const id = handoff.characterId?.trim() || null;
    if (id) persistActiveCharacter(id, handoff.from || 'shipwreck-intro');

    // Chicken-gun pirate-islands · shipwreck_cove wash-up tutorial
    navigate(tutorialShipwreckWashupPath(id, 'shipwreck-intro'));
  }, [navigate]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Purge stale intro keys so the ship-destroy cut re-plays after v11 bump
    try {
      for (const k of [
        'grudge_shipwreck_intro_seen_v4',
        'grudge_shipwreck_intro_seen_v7',
        'grudge_shipwreck_intro_seen_v8',
        'grudge_shipwreck_intro_seen_v9',
        'grudge_shipwreck_intro_seen_v10',
        'grudge_shipwreck_intro_seen_v11',
        'grudge_shipwreck_intro_seen_v12',
        'grudge_shipwreck_intro_seen_v13',
        'grudge_shipwreck_intro_seen_v14',
        'grudge_shipwreck_intro_seen_v15',
        'grudge_shipwreck_intro_seen_v16',
        'grudge_shipwreck_intro_seen_v17',
        'grudge_shipwreck_intro_seen_v21',
        'grudge_shipwreck_intro_seen_v22',
        'grudge_shipwreck_intro_seen_v23',
        'grudge_shipwreck_intro_seen_v24',
        'grudge_storm_intro_seen_v1',
        'grudge_island3d_intro_options_v9',
        'grudge_island3d_intro_options_v10',
        'grudge_island3d_intro_options_v23',
        'grudge_island3d_intro_options_v24',
      ]) {
        sessionStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }

    let skippable = false;
    const cinema = new LeviathanOceanCinema(host, {
      onCaption: (c, s) => {
        setCaption(c || '…');
        setSub(s);
      },
      onLoadProgress: (u, stage) => {
        setLoadU(u);
        setLoadStage(stage);
      },
      onProgress: (u, t) => {
        setProgress(u);
        if (t >= LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC) {
          skippable = true;
          setCanSkip(true);
        }
      },
      onReady: () => {
        setReady(true);
        setLoadU(1);
        try {
          const q = new URLSearchParams(window.location.search);
          const seekRaw = q.get('seek') ?? q.get('t');
          if (seekRaw != null) {
            const sec = Number(seekRaw);
            if (Number.isFinite(sec) && sec > 0) {
              cinema.seekTo(sec);
              skippable = true;
              setCanSkip(true);
              setCaption(`SEEK ${sec}s`);
              setSub('QA jump into leviathan cinema');
            }
          }
        } catch { /* */ }
      },
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#04080f] z-20 px-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(14,60,90,0.35)_0%,_transparent_65%)]" />
            <div className="relative z-[1] w-full max-w-sm text-center">
              <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/90 font-semibold mb-2">
                First voyage
              </div>
              <div className="font-cinzel text-2xl tracking-widest text-amber-100/95">
                Leviathan Ocean
              </div>
              <div className="mt-8 h-1.5 rounded-full bg-white/10 overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-sky-400 to-amber-400 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, loadU * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
                <span className="text-cyan-300/80 truncate max-w-[70%] text-left">{loadStage}</span>
                <span>{Math.round(loadU * 100)}%</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-4 font-mono">{STAGE_ID}</p>
            </div>
          </div>
        )}

        {ready && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-amber-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {ready && (caption || sub) && (
          <div className="absolute bottom-10 inset-x-0 z-10 flex justify-center px-4 pointer-events-none">
            <div className="rounded-xl border border-cyan-800/40 bg-black/75 backdrop-blur-md px-6 py-3 max-w-xl text-center">
              <div className="font-cinzel text-lg tracking-widest text-amber-200">{caption}</div>
              {sub && <p className="text-sm text-slate-300 mt-1">{sub}</p>}
            </div>
          </div>
        )}

        <div
          className={`absolute top-3 left-3 right-3 z-20 flex justify-between gap-2 pointer-events-none transition-opacity ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="pointer-events-auto rounded-xl border border-cyan-800/40 bg-black/80 px-3 py-2 max-w-md">
            <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">
              First voyage cinema
            </div>
            <div className="text-sm font-medium">
              Leviathan attack → ship destroyed → wash-up
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {Math.round(progress * LEVIATHAN_CINEMA_DURATION_SEC)}s / {LEVIATHAN_CINEMA_DURATION_SEC}s
              {' · '}then pirate-islands shipwreck_cove tutorial
              {' · '}skip after {LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC}s
            </div>
          </div>
          <div className="pointer-events-auto flex gap-1.5">
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
              Skip · wash up
            </button>
          </div>
        </div>
      </div>
      <div className="h-[7vh] bg-black flex items-center justify-center">
        <p className="text-[10px] text-slate-600 tracking-wide">
          Destination: chicken-gun pirate-islands · shipwreck_cove · unarmed Grudge6
        </p>
      </div>
    </div>
  );
}
