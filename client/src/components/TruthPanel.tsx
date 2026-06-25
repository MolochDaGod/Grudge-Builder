import { useCallback, useEffect, useState } from "react";
import {
  runTruthAudit,
  GRUDGE_TRUTH_LAYERS,
  type TruthProbe,
} from "@/lib/grudgeTruth";
import { cn } from "@/lib/utils";

export interface TruthPanelProps {
  /** Full-page layout vs compact floating badge panel */
  variant?: "page" | "compact";
  /** Auto-refresh interval ms; 0 disables */
  refreshMs?: number;
  className?: string;
}

export function TruthPanel({
  variant = "compact",
  refreshMs = 120_000,
  className,
}: TruthPanelProps) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [probes, setProbes] = useState<TruthProbe[]>([]);
  const [splitBrain, setSplitBrain] = useState<string[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const audit = useCallback(async () => {
    setLoading(true);
    try {
      const r = await runTruthAudit("browser");
      setProbes(r.probes);
      setScore(r.score);
      setSplitBrain(r.splitBrain);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    audit();
    if (refreshMs <= 0) return;
    const t = setInterval(audit, refreshMs);
    return () => clearInterval(t);
  }, [audit, refreshMs]);

  const healthy = score !== null && score >= 85;
  const isPage = variant === "page";

  return (
    <div
      className={cn(
        isPage
          ? "rounded-xl border border-stone-700/60 bg-stone-950/90 p-6 text-stone-300 shadow-xl"
          : "rounded-lg border border-stone-600/60 bg-stone-950/95 p-3 text-stone-300 shadow-xl",
        className,
      )}
    >
      <div className={cn("flex items-start justify-between gap-4", isPage && "mb-4")}>
        <div>
          <p
            className={cn(
              "font-semibold text-amber-400",
              isPage ? "text-lg" : "mb-1",
            )}
          >
            Grudge Warlords — ONE TRUTH
          </p>
          <p className={cn("text-stone-500", isPage ? "text-sm mt-1" : "text-[10px] mb-2")}>
            Game state → Railway · JSON → objectstore · Icons → assets CDN pack
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-full px-3 py-1 font-semibold border",
            healthy
              ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
              : "bg-amber-950/90 border-amber-600/50 text-amber-100",
            isPage ? "text-sm" : "text-xs",
          )}
        >
          {loading ? "Checking…" : `Truth ${score ?? "—"}%`}
        </div>
      </div>

      <div className={cn("space-y-1", isPage ? "mb-6 grid sm:grid-cols-2 gap-2" : "mb-2")}>
        {Object.entries(GRUDGE_TRUTH_LAYERS).map(([k, v]) => (
          <div
            key={k}
            className={cn(
              "flex justify-between gap-2",
              isPage ? "text-xs rounded-md bg-stone-900/60 px-3 py-2" : "text-[10px]",
            )}
          >
            <span className="text-stone-400">{v.label}</span>
            <span className="truncate text-stone-500">{v.url.replace("https://", "")}</span>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "border-t border-stone-700 pt-2",
          isPage ? "space-y-2" : "space-y-1",
        )}
      >
        {probes.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex items-center justify-between gap-2",
              isPage && "rounded-md bg-stone-900/40 px-3 py-2 text-sm",
            )}
          >
            <span>{p.label}</span>
            <span
              className={cn(
                "text-right",
                p.ok ? "text-emerald-400" : "text-red-400",
                !isPage && "text-[11px]",
              )}
            >
              {p.ok ? `✓ ${p.status}` : `✗ ${p.detail || p.status}`}
            </span>
          </div>
        ))}
      </div>

      {splitBrain.length > 0 && (
        <div
          className={cn(
            "mt-3 rounded-md border border-red-900/50 bg-red-950/30 text-red-200",
            isPage ? "p-3 text-sm" : "p-2 text-[10px]",
          )}
        >
          <p className="font-medium mb-1">Split-brain detected</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {splitBrain.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={cn("mt-3 flex items-center gap-4", isPage && "text-sm")}>
        <button
          type="button"
          onClick={audit}
          disabled={loading}
          className="text-amber-400 hover:underline disabled:opacity-50"
        >
          Re-check
        </button>
        {lastChecked && (
          <span className="text-stone-500 text-[10px] sm:text-xs">
            Last checked {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}