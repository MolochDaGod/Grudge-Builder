/**
 * /warlords/start — production deployment router for Warlords era.
 *
 * Resolves: create → airship → home island (immediate) → map / open world.
 * Ops zone testing: info.grudge-studio.com/WORLD_MAP.html
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { characterAPI } from '@/lib/api';
import {
  buildWarlordsProgress,
  getActiveCharacterId,
  markOpeningSeen,
  stepPath,
} from '@/lib/warlordsOnboarding';
import { WARLORDS_PRODUCTION_FLOW } from '@shared/definitions/warlordsProductionFlow';
import { ChevronRight, Lock, Check, Loader2 } from 'lucide-react';

export default function WarlordsStartPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, openLogin } = useAuth();
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasHomeIsland, setHasHomeIsland] = useState(false);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = getActiveCharacterId();
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const char = await characterAPI.get(id);
        if (cancelled) return;
        setLevel(char.level ?? 1);
        // best-effort home island probe
        try {
          const res = await fetch('/api/island/current', { credentials: 'include' });
          if (res.ok) setHasHomeIsland(true);
        } catch {
          /* optional */
        }
      } catch {
        /* no character */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = buildWarlordsProgress({
    isAuthenticated: !!isAuthenticated,
    characterLevel: level,
    hasHomeIsland,
  });

  // Auto-advance when ?auto=1 or default first visit
  useEffect(() => {
    if (loading || !auto) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === '0') {
      setAuto(false);
      return;
    }
    // Don't auto-skip UI on first paint of locked next — only when next is clear
    const t = setTimeout(() => {
      const path = progress.nextPath;
      if (progress.nextStepId === 'character_create' && !isAuthenticated) {
        openLogin?.();
        return;
      }
      if (progress.nextStepId === 'opening_scene') {
        markOpeningSeen();
      }
      setLocation(path);
    }, 900);
    return () => clearTimeout(t);
  }, [loading, auto, progress.nextPath, progress.nextStepId, isAuthenticated, openLogin, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060c] flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        Loading Warlords deployment…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060c] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400/70">Production Warlords</p>
        <h1 className="mt-2 text-3xl font-black text-amber-100" style={{ fontFamily: 'Cinzel, serif' }}>
          Deployment Path
        </h1>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          Intro → create → <strong className="text-amber-300">airship (combat)</strong>
          {' '}→ tutorial island → raft → <strong className="text-amber-300">home island</strong>
          {' '}(not level 20). Home island skips tutorial forever after claim.
          {level ? ` · you are level ${level}` : ''}. Zone ops:{' '}
          <a
            className="text-sky-300 underline"
            href="https://info.grudge-studio.com/WORLD_MAP.html"
            target="_blank"
            rel="noreferrer"
          >
            info WORLD_MAP
          </a>
          .
        </p>

        <div className="mt-8 space-y-3">
          {progress.steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              disabled={step.locked && !step.isNext}
              onClick={() => {
                if (step.id === 'opening_scene') markOpeningSeen();
                if (step.locked && step.id === 'home_island') return;
                if (step.id === 'character_create' && !isAuthenticated) {
                  openLogin?.();
                  return;
                }
                setLocation(stepPath(step.id, getActiveCharacterId()));
              }}
              className={`w-full text-left rounded-2xl border p-4 transition flex items-start gap-3 ${
                step.isNext
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : step.done
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : step.locked
                      ? 'border-white/5 bg-white/[0.02] opacity-60'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs font-mono text-white/50 shrink-0">
                {step.done ? <Check className="w-4 h-4 text-emerald-400" /> : step.locked ? <Lock className="w-3.5 h-3.5" /> : String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{step.title}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
                    {step.badge}
                  </span>
                  {step.isNext && (
                    <span className="text-[9px] text-amber-300 font-semibold">NEXT</span>
                  )}
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">{step.subtitle}</p>
                <p className="text-[11px] text-white/55 mt-1 leading-relaxed">{step.description}</p>
                {step.lockReason && (
                  <p className="text-[10px] text-amber-500/80 mt-1">{step.lockReason}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 shrink-0 mt-1" />
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLocation(progress.nextPath)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400"
          >
            Continue → {progress.steps.find((s) => s.isNext)?.title}
          </button>
          <button
            type="button"
            onClick={() => setLocation('/home')}
            className="px-4 py-2 rounded-xl border border-white/15 text-sm text-white/70 hover:bg-white/5"
          >
            Account home
          </button>
          <a
            href="/lore/tome-of-seasons-and-gods.html"
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/40 hover:text-white/70"
          >
            Black Tome
          </a>
        </div>

        <p className="mt-6 text-[10px] text-white/25 font-mono">
          SSOT: shared/definitions/warlordsProductionFlow.ts · {WARLORDS_PRODUCTION_FLOW.length} steps
        </p>
      </div>
    </div>
  );
}
