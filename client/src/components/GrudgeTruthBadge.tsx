import { useEffect, useState } from 'react';
import { runTruthAudit, GRUDGE_TRUTH_LAYERS, type TruthProbe } from '@/lib/grudgeTruth';
import { cn } from '@/lib/utils';

/**
 * Floating ONE TRUTH health panel — shows whether fleet wiring + icons are live.
 * Visible on all pages; collapsed by default.
 */
export function GrudgeTruthBadge() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [probes, setProbes] = useState<TruthProbe[]>([]);
  const [splitBrain, setSplitBrain] = useState<string[]>([]);

  const audit = async () => {
    setLoading(true);
    try {
      const r = await runTruthAudit();
      setProbes(r.probes);
      setScore(r.score);
      setSplitBrain(r.splitBrain);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    audit();
    const t = setInterval(audit, 120_000);
    return () => clearInterval(t);
  }, []);

  const healthy = score !== null && score >= 85;

  return (
    <div className="fixed bottom-20 right-3 z-[9998] font-sans text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-full px-3 py-1.5 shadow-lg border backdrop-blur-md transition-colors',
          healthy
            ? 'bg-emerald-950/90 border-emerald-600/50 text-emerald-200'
            : 'bg-amber-950/90 border-amber-600/50 text-amber-100',
        )}
        title="Grudge ONE TRUTH fleet health"
      >
        {loading ? '…' : `Truth ${score ?? '—'}%`}
      </button>

      {open && (
        <div className="mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-stone-600/60 bg-stone-950/95 p-3 text-stone-300 shadow-xl">
          <p className="font-semibold text-amber-400 mb-1">Grudge Warlords — ONE TRUTH</p>
          <p className="text-[10px] text-stone-500 mb-2">
            Game state → Railway · JSON → objectstore · Icons → assets CDN pack
          </p>

          <div className="space-y-1 mb-2">
            {Object.entries(GRUDGE_TRUTH_LAYERS).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 text-[10px]">
                <span className="text-stone-400">{v.label}</span>
                <span className="truncate text-stone-500">{v.url.replace('https://', '')}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-700 pt-2 space-y-1">
            {probes.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span>{p.label}</span>
                <span className={cn(p.ok ? 'text-emerald-400' : 'text-red-400')}>
                  {p.ok ? `✓ ${p.status}` : `✗ ${p.detail || p.status}`}
                </span>
              </div>
            ))}
          </div>

          {splitBrain.length > 0 && (
            <div className="mt-2 text-[10px] text-red-300">
              Split-brain: {splitBrain.join('; ')}
            </div>
          )}

          <button
            type="button"
            onClick={audit}
            className="mt-2 text-[10px] text-amber-400 hover:underline"
          >
            Re-check
          </button>
        </div>
      )}
    </div>
  );
}