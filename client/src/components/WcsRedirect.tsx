/**
 * WcsRedirect — historically bounced users to warlord-crafting-suite.vercel.app.
 *
 * Production rule (2026-07): WCS surfaces (Arsenal, Characters, Professions,
 * Skill Trees) live on this SPA (grudgewarlords.com / grudge.studio).
 * Paths listed in LOCAL_PRODUCTION_PATHS navigate in-app; other legacy WCS
 * routes may still open the Vercel app with a return URL.
 *
 * Usage:
 *   <WcsRedirect to="/character-creation" returnPath="/home" label="Create Character" />
 *   <WcsRedirect to="/arsenal" label="Open Arsenal" />  // → local /arsenal
 */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';

const WCS_ORIGIN =
  (import.meta as any).env?.VITE_WCS_URL ||
  'https://warlord-crafting-suite.vercel.app';

/** Paths fully migrated onto GrudgeBuilder production. */
const LOCAL_PRODUCTION_PATHS: Record<string, string> = {
  '/arsenal': '/arsenal',
  '/professions': '/professions',
  '/skill-tree': '/skill-tree',
  '/skills': '/skill-tree',
  '/crafting': '/crafting',
  '/heroes': '/heroes',
  '/characters': '/heroes',
  '/home': '/home',
  '/lore': '/lore',
};

interface WcsRedirectProps {
  /** Path on WCS or production (e.g. '/character-creation', '/arsenal', '/home'). */
  to: string;
  /**
   * Relative path on THIS app to return to after a remote WCS flow finishes.
   * Defaults to `/home` (or the current location).
   */
  returnPath?: string;
  /** Button label shown in the splash. */
  label?: string;
  /** Auto-redirect delay (ms). Set to 0 for instant. */
  autoDelayMs?: number;
}

export default function WcsRedirect({
  to,
  returnPath,
  label = 'Continue',
  autoDelayMs = 400,
}: WcsRedirectProps) {
  const [, setLocation] = useLocation();
  const path = to.startsWith('/') ? to : `/${to}`;
  const localTarget = LOCAL_PRODUCTION_PATHS[path] ?? null;

  const remoteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const retAbs = new URL(
      returnPath || window.location.pathname || '/home',
      window.location.origin,
    );
    const target = new URL(path, WCS_ORIGIN);
    target.searchParams.set('return', retAbs.toString());
    return target.toString();
  }, [path, returnPath]);

  useEffect(() => {
    if (localTarget) {
      const t = setTimeout(() => setLocation(localTarget), autoDelayMs);
      return () => clearTimeout(t);
    }
    if (!remoteUrl || autoDelayMs < 0) return;
    const t = setTimeout(() => {
      window.location.href = remoteUrl;
    }, autoDelayMs);
    return () => clearTimeout(t);
  }, [localTarget, remoteUrl, autoDelayMs, setLocation]);

  if (localTarget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-6">
        <div className="max-w-md w-full bg-stone-900/95 border-2 border-amber-800/40 rounded-xl p-8 text-center shadow-2xl">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-amber-500 animate-spin" />
          <h1 className="text-2xl font-bold text-amber-400 font-cinzel mb-2 tracking-wide">
            Opening Production {localTarget.replace(/^\//, '')}
          </h1>
          <p className="text-stone-400 text-sm mb-6">
            Arsenal and Warlords suite tools run on this app — no external WCS hop.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation(localTarget)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-400 hover:to-amber-500"
          >
            {label}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-6">
      <div className="max-w-md w-full bg-stone-900/95 border-2 border-amber-800/40 rounded-xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
        <h1 className="text-2xl font-bold text-amber-400 font-cinzel mb-2 tracking-wide">
          Opening Warlord Crafting Suite
        </h1>
        <p className="text-stone-400 text-sm mb-6">
          Taking you to the legacy {path.replace(/^\//, '')} flow&hellip;
        </p>
        <Button
          size="lg"
          onClick={() => {
            if (remoteUrl) window.location.href = remoteUrl;
          }}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-400 hover:to-amber-500"
        >
          <ExternalLink className="w-4 h-4 mr-2" /> {label}
        </Button>
        <p className="text-xs text-stone-500 mt-4">
          Prefer production surfaces at grudgewarlords.com when available.
        </p>
      </div>
    </div>
  );
}
