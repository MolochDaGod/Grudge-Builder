/**
 * ZoneFlybyHUD — proof controls for sector rewrite flyby + snapshots.
 */
import { useCallback, useState } from 'react';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  createZoneFlyby,
  downloadFlybyResult,
  type ZoneFlybyResult,
} from '../cinematic/ZoneFlyby';

export function ZoneFlybyHUD({
  engine,
  sectorId,
}: {
  engine: Island3DEngine | null;
  sectorId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ZoneFlybyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!engine || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const flyby = createZoneFlyby(engine);
      const r = await flyby.start({ record: true, snapshotEachWp: true });
      setResult(r);
      flyby.dispose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [engine, busy]);

  if (!engine) return null;

  return (
    <div className="absolute bottom-24 left-4 z-50 pointer-events-auto max-w-sm">
      <div className="bg-black/85 border border-violet-500/40 rounded-xl p-3 text-xs text-slate-200 space-y-2 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-violet-300">Sector proof flyby</p>
            <p className="text-[11px] text-slate-400 font-mono">{sectorId || 'zone'}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-medium"
          >
            {busy ? 'Recording…' : 'Start flyby'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Cinematic path over islands, NPC camps, enemy boats, wildlife skim, harvest markers, landmarks.
          Records WebM + PNG snapshots for the rewrite proof package.
        </p>
        {error && <p className="text-red-400 text-[10px]">{error}</p>}
        {result && (
          <div className="space-y-1.5 border-t border-white/10 pt-2">
            <p className="text-[10px] text-emerald-400">
              {result.snapshots.length} snapshots
              {result.videoBlob
                ? ` · video ${(result.videoBlob.size / 1e6).toFixed(1)} MB`
                : ' · no video (browser)'}
            </p>
            <ul className="grid grid-cols-2 gap-0.5 text-[9px]">
              {result.checklist.map((c) => (
                <li key={c.id} className={c.seen ? 'text-emerald-400/90' : 'text-slate-600'}>
                  {c.seen ? '✓' : '·'} {c.label}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => downloadFlybyResult(sectorId || 'sector', result)}
              className="w-full mt-1 px-2 py-1 rounded bg-amber-700/80 hover:bg-amber-600 text-[10px] text-white"
            >
              Download proof package
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
