/**
 * /airship · /airship-zone — production Foundry handoff bridge.
 *
 * Foundry (character.grudge-studio.com) default post-create dest is /airship.
 * Production client previously had NO /airship route → SPA NotFound and broke
 * create → play for every new hero.
 *
 * Until the full AirshipSoloZone opener ships on main, this page:
 *   1. Accepts ?characterId=&from=gcs (and storage fallbacks)
 *   2. Persists active character keys
 *   3. Forwards to /home-island (immediate play) or /heroes if no id
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  applyCharacterHandoffFromLocation,
  persistActiveCharacter,
} from "@/lib/characterHandoff";

export default function AirshipHandoffPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("Entering Warlords…");

  useEffect(() => {
    const handoff = applyCharacterHandoffFromLocation();
    const id = handoff.characterId?.trim() || null;
    const from = handoff.from || "gcs";

    if (id) {
      persistActiveCharacter(id, from);
      setStatus("Loading your home island…");
      const q = new URLSearchParams({
        characterId: id,
        from: String(from),
      });
      // Prefer replace so back-button doesn't loop on this bridge
      setLocation(`/home-island?${q.toString()}`);
      return;
    }

    setStatus("No hero selected — open roster…");
    setLocation("/heroes");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#05060c] flex flex-col items-center justify-center text-amber-100/90 gap-3 px-4">
      <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
      <p className="text-sm tracking-wide">{status}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500/50">
        Foundry → client handoff
      </p>
    </div>
  );
}
