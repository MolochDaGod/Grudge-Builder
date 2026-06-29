import { useEffect, type ComponentType } from "react";
import { useLocation } from "wouter";
import {
  buildGcsUrl,
  isGcsLegacyMode,
  type GcsLaunchMode,
} from "@/lib/gcsRedirect";
import type { GameEra } from "@shared/definitions/gameEras";

interface GcsRedirectProps {
  legacyComponent?: ComponentType;
  era?: GameEra;
  mode?: GcsLaunchMode;
  returnPath?: string;
}

/**
 * Redirects to canonical GCS unless ?legacy=1 (dev escape hatch).
 */
export default function GcsRedirect({
  legacyComponent: Legacy,
  era = "warlords",
  mode = "landing",
  returnPath,
}: GcsRedirectProps) {
  const [location] = useLocation();
  const legacy = isGcsLegacyMode();

  useEffect(() => {
    if (legacy) return;
    const returnTo =
      returnPath && typeof window !== "undefined"
        ? `${window.location.origin}${returnPath}`
        : undefined;
    window.location.replace(
      buildGcsUrl({ era, mode, returnTo, forwardSearch: true }),
    );
  }, [location, legacy, era, mode, returnPath]);

  if (legacy && Legacy) return <Legacy />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-black text-white/80 text-sm">
      <div>Opening Grudge Character Studio…</div>
      <div className="text-white/40 text-xs">Warlords era · account roster</div>
    </div>
  );
}