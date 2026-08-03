/**
 * /airship · /airship-handoff — production Foundry handoff bridge.
 *
 * After tutorial is complete (and for every later hero):
 *   Foundry → /airship?characterId&from=gcs → /home-island
 *
 * First character / tutorial not complete:
 *   /airship (or Foundry default) → /tutorial?characterId&from=gcs
 *
 * This page is the safety net when Foundry returns with characterId on /airship
 * or when Warlords set returnTo=/airship after tutorial.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  applyCharacterHandoffFromLocation,
  persistActiveCharacter,
} from "@/lib/characterHandoff";
import {
  isTutorialComplete,
  markAirshipSeen,
  resolveAirshipForward,
} from "@/lib/warlordsOnboarding";

export default function AirshipHandoffPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("Entering Warlords…");

  useEffect(() => {
    const handoff = applyCharacterHandoffFromLocation();
    const id = handoff.characterId?.trim() || null;
    const from = handoff.from || "gcs";

    if (id) {
      persistActiveCharacter(id, from);
      const dest = resolveAirshipForward(id, String(from));
      if (isTutorialComplete()) {
        markAirshipSeen();
        setStatus("Loading your home island…");
      } else {
        setStatus("First voyage — leviathan attack · ship destroy · wash-up…");
      }
      setLocation(dest);
      return;
    }

    // No characterId — Foundry create with smart returnTo
    setStatus("No hero yet — open Foundry to create…");
    setLocation(
      "/create-character?returnTo=" +
        encodeURIComponent(
          isTutorialComplete() ? "/airship?from=gcs" : "/tutorial?from=gcs",
        ),
    );
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#05060c] flex flex-col items-center justify-center text-amber-100/90 gap-3 px-4">
      <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
      <p className="text-sm tracking-wide">{status}</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500/50">
        {isTutorialComplete()
          ? "Foundry → airship → home island"
          : "Foundry → leviathan cinema → pirate-islands shipwreck cove"}
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
