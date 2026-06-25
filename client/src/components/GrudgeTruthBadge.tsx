import { useState } from "react";
import { TruthPanel } from "@/components/TruthPanel";
import { cn } from "@/lib/utils";
import { runTruthAudit } from "@/lib/grudgeTruth";
import { useEffect } from "react";

/**
 * Floating ONE TRUTH health panel — shows whether fleet wiring + icons are live.
 * Visible on all pages; collapsed by default. Full detail at /systems.
 */
export function GrudgeTruthBadge() {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      setLoading(true);
      try {
        const r = await runTruthAudit("browser");
        if (!cancelled) setScore(r.score);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    poll();
    const t = setInterval(poll, 120_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const healthy = score !== null && score >= 85;

  return (
    <div className="fixed bottom-20 right-3 z-[9998] font-sans text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-full px-3 py-1.5 shadow-lg border backdrop-blur-md transition-colors",
          healthy
            ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
            : "bg-amber-950/90 border-amber-600/50 text-amber-100",
        )}
        title="Grudge ONE TRUTH fleet health — open /systems for full panel"
      >
        {loading ? "…" : `Truth ${score ?? "—"}%`}
      </button>

      {open && (
        <div className="mt-2 w-80 max-h-96 overflow-auto">
          <TruthPanel variant="compact" refreshMs={0} />
        </div>
      )}
    </div>
  );
}