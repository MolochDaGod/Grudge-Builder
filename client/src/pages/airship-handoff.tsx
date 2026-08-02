/**
 * /airship — Foundry post-create handoff → Warlords era airship scene.
 *
 * Foundry default dest is /airship with ?characterId=&from=gcs.
 * Production path:
 *   create → /airship (persist id) → /combat (airship 4-character scene)
 *   → Continue → intro (if needed) → tutorial island → raft → home island
 *
 * Does NOT send new heroes straight to home-island (home unlocks after tutorial).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  applyCharacterHandoffFromLocation,
  persistActiveCharacter,
} from "@/lib/characterHandoff";
import { markAirshipSeen, isTutorialComplete } from "@/lib/warlordsOnboarding";
import { AFTER_TUTORIAL_PATH } from "@shared/definitions/warlordsProductionFlow";

export default function AirshipHandoffPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("Entering Warlords…");

  useEffect(() => {
    const handoff = applyCharacterHandoffFromLocation();
    const id = handoff.characterId?.trim() || null;
    const from = handoff.from || "gcs";

    // Returning players with base / finished tutorial skip airship opener
    if (id && isTutorialComplete()) {
      try {
        const hasClaimed =
          localStorage.getItem("warlords_home_island_claimed_v1") === "1";
        persistActiveCharacter(id, from);
        setStatus(
          hasClaimed
            ? "Welcome back — opening home island…"
            : "Tutorial complete — home island unlock…",
        );
        setLocation(
          hasClaimed
            ? `/home-island?characterId=${encodeURIComponent(id)}`
            : `${AFTER_TUTORIAL_PATH}&characterId=${encodeURIComponent(id)}`,
        );
        return;
      } catch {
        /* fall through */
      }
    }

    if (id) {
      persistActiveCharacter(id, from);
      markAirshipSeen();
      setStatus("Boarding the airship…");
      const q = new URLSearchParams({
        characterId: id,
        from: String(from),
        continue: "tutorial",
      });
      // Combat tab = same airship 4-character scene
      setLocation(`/combat?${q.toString()}`);
      return;
    }

    setStatus("No hero yet — open Foundry to create…");
    setLocation(
      "/create-character?returnTo=" +
        encodeURIComponent("/airship?from=gcs"),
    );
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#05060c] flex flex-col items-center justify-center text-amber-100/90 gap-3 px-4">
      <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
      <p className="text-sm tracking-wide">{status}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500/50">
        Foundry → airship → tutorial → home island
      </p>
      <a
        href="/create-character"
        className="text-xs text-amber-400/90 underline mt-2"
      >
        Create hero at Foundry
      </a>
      <a href="/home" className="text-xs text-white/40 underline">
        Back to home hub
      </a>
    </div>
  );
}
