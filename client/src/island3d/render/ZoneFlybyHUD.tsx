/**
 * ZoneFlybyHUD / TrailerHUD — cinematic flyby + multi-surface game trailer package.
 *
 * Modes:
 *  - Single surface: record flyby for current sector / lobby / home
 *  - Trailer: accumulate all 9 sectors + lobby + islands into a cut list
 *
 * Query: ?flyby=1 | ?proof=1 | ?trailer=1
 */
import { useCallback, useMemo, useState } from 'react';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  createZoneFlyby,
  downloadFlybyResult,
} from '../cinematic/ZoneFlyby';
import {
  getGameTrailerSession,
  openSurfaceForTrailer,
} from '../cinematic/GameTrailer';
import type { SurfaceFlybyResult } from '../cinematic/SurfaceFlyby';
import {
  allTrailerSurfaces,
  resolveTrailerSurfaceId,
  getTrailerSurface,
} from '@shared/definitions/trailerShotCatalog';

type ResultWithChecklist = SurfaceFlybyResult & {
  checklist?: Array<{ id: string; label: string; seen: boolean }>;
};

export function ZoneFlybyHUD({
  engine,
  sectorId,
  mode,
}: {
  engine: Island3DEngine | null;
  sectorId?: string;
  mode?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultWithChecklist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'flyby' | 'trailer'>('trailer');
  const [, tick] = useState(0);

  const surfaceId = useMemo(
    () =>
      resolveTrailerSurfaceId({
        mode: mode ?? engine?.getPlayMode?.(),
        sectorId: sectorId ?? engine?.zoneSector?.id,
      }),
    [mode, sectorId, engine],
  );
  const surface = getTrailerSurface(surfaceId);
  const session = getGameTrailerSession();
  const all = allTrailerSurfaces();
  const recorded = new Set(session.listSegments().map((s) => s.surfaceId));

  const runFlyby = useCallback(async () => {
    if (!engine || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const flyby = createZoneFlyby(engine);
      const r = (await flyby.start({
        record: true,
        snapshotEachWp: true,
      })) as ResultWithChecklist;
      setResult(r);
      flyby.dispose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [engine, busy]);

  const runTrailerSegment = useCallback(async () => {
    if (!engine || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await session.recordSurface(engine, { surfaceId });
      setResult(r as ResultWithChecklist);
      tick((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [engine, busy, session, surfaceId]);

  if (!engine) return null;

  return (
    <div className="absolute bottom-24 left-4 z-50 pointer-events-auto max-w-md">
      <div className="bg-black/90 border border-violet-500/45 rounded-xl p-3 text-xs text-slate-200 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setTab('flyby')}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
              tab === 'flyby' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Flyby
          </button>
          <button
            type="button"
            onClick={() => setTab('trailer')}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
              tab === 'trailer' ? 'bg-amber-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Game trailer
          </button>
        </div>

        {tab === 'flyby' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-violet-300">
                  Cinematic flyby
                </p>
                <p className="text-[11px] text-slate-300 font-medium">
                  {surface?.title ?? surfaceId}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">{surfaceId}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runFlyby()}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-medium"
              >
                {busy ? 'Recording…' : 'Start flyby'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Sole cinematic camera (TPC/Orbit disabled). Path: establish → islands → camps →
              ships → harvest → landmarks → brand close. WebM + PNG for proof package.
            </p>
          </>
        )}

        {tab === 'trailer' && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400/90">
                Full game trailer package
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record each surface → cut list JSON → combine in CapCut / Premiere
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runTrailerSegment()}
                className="flex-1 px-2 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-[11px] font-semibold"
              >
                {busy ? 'Recording…' : 'Record this surface'}
              </button>
              <button
                type="button"
                onClick={() => session.downloadManifest()}
                className="px-2 py-1.5 rounded-lg border border-amber-600/50 text-amber-200 text-[10px]"
              >
                Cut list JSON
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
              {all.map((s) => {
                const done = recorded.has(s.id);
                const current = s.id === surfaceId;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded ${
                      current ? 'bg-white/10' : ''
                    }`}
                  >
                    <span className={done ? 'text-emerald-400' : 'text-slate-600'}>
                      {done ? '✓' : '·'}
                    </span>
                    <span className="text-slate-500 w-4 tabular-nums">{s.trailerOrder}</span>
                    <span className={done ? 'text-slate-200' : 'text-slate-400'}>{s.title}</span>
                    {!current && (
                      <button
                        type="button"
                        className="ml-auto text-[9px] text-violet-400 hover:text-violet-200"
                        onClick={() => openSurfaceForTrailer(s.id)}
                      >
                        open
                      </button>
                    )}
                    {done && (
                      <button
                        type="button"
                        className="text-[9px] text-amber-400/80 hover:text-amber-200"
                        onClick={() => session.downloadSegment(s.id)}
                      >
                        dl
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-600">
              {recorded.size}/{all.length} surfaces · missing: {session.missingSurfaces().length}
            </p>
          </>
        )}

        {error && <p className="text-red-400 text-[10px]">{error}</p>}
        {result && (
          <div className="space-y-1.5 border-t border-white/10 pt-2">
            <p className="text-[10px] text-emerald-400">
              {result.snapshots.length} snapshots
              {result.videoBlob
                ? ` · video ${(result.videoBlob.size / 1e6).toFixed(1)} MB`
                : ' · no video (browser)'}
              {result.durationSec != null
                ? ` · ${result.durationSec.toFixed(1)}s`
                : ''}
            </p>
            {result.checklist && (
              <ul className="grid grid-cols-2 gap-0.5 text-[9px]">
                {result.checklist.map((c) => (
                  <li key={c.id} className={c.seen ? 'text-emerald-400/90' : 'text-slate-600'}>
                    {c.seen ? '✓' : '·'} {c.label}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => downloadFlybyResult(surfaceId, result)}
              className="w-full mt-1 px-2 py-1 rounded bg-amber-700/80 hover:bg-amber-600 text-[10px] text-white"
            >
              Re-download segment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Alias for trailer branding */
export const TrailerHUD = ZoneFlybyHUD;
