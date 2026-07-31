/**
 * /home — DEPRECATED as multi-system hub.
 *
 * Production player entry: /airship (Warlords era character scene)
 * Ops / zone testing: https://info.grudge-studio.com/WORLD_MAP.html
 *
 * Query:
 *   ?ops=1 | ?map=1  → external info WORLD_MAP (systems browser)
 *   default          → /airship (happy path)
 *   ?legacy=1        → old multi-destination home (debug only)
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { INFO_WORLD_MAP_URL } from "@shared/definitions/warlordsProductionFlow";
import { Loader2 } from "lucide-react";

/** Thin legacy strip only when ?legacy=1 — not production chrome */
function LegacyHomeStub({ onAirship, onMap, onHomeIsland }: {
  onAirship: () => void;
  onMap: () => void;
  onHomeIsland: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e8e6e3] flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-serif text-2xl text-amber-200 tracking-wide">Warlords · legacy /home</h1>
      <p className="text-sm text-white/50 max-w-md text-center">
        Production entry is the airship. Ops zone testing is info WORLD_MAP.
        This page is not the world deployment hub.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onAirship}
          className="px-4 py-2 rounded-lg bg-amber-600 text-black font-semibold text-sm"
        >
          Airship
        </button>
        <button
          type="button"
          onClick={onHomeIsland}
          className="px-4 py-2 rounded-lg border border-emerald-600/60 text-emerald-200 text-sm"
        >
          Home Island
        </button>
        <button
          type="button"
          onClick={onMap}
          className="px-4 py-2 rounded-lg border border-sky-600/60 text-sky-200 text-sm"
        >
          Info WORLD_MAP
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"redirect" | "legacy">("redirect");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);

    if (q.get("legacy") === "1") {
      setMode("legacy");
      return;
    }

    // Ops / systems browser — leave client SPA
    if (q.get("ops") === "1" || q.get("map") === "1" || q.get("worldmap") === "1") {
      window.location.replace(INFO_WORLD_MAP_URL);
      return;
    }

    // Player happy path: airship era scene
    const characterId = q.get("characterId");
    const dest = characterId
      ? `/airship?characterId=${encodeURIComponent(characterId)}&from=home`
      : "/airship";
    setLocation(dest);
  }, [setLocation]);

  if (mode === "legacy") {
    return (
      <LegacyHomeStub
        onAirship={() => setLocation("/airship")}
        onHomeIsland={() => setLocation("/home-island")}
        onMap={() => {
          window.location.href = INFO_WORLD_MAP_URL;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-white/70 text-sm">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      <div>Entering Warlords airship…</div>
      <div className="text-white/35 text-xs">
        Ops map:{" "}
        <a className="text-amber-400/80 underline" href={INFO_WORLD_MAP_URL}>
          info WORLD_MAP
        </a>
      </div>
    </div>
  );
}
