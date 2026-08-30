/**
 * /main-panel — full-page Warlords main panel on Grudge-Builder production.
 * Static bundle lives at /main-panel/; this page also hosts the overlay.
 */
import { useEffect, useMemo, useState } from "react";
import MainPanelHost, { buildMainPanelUrl } from "@/components/MainPanelHost";
import { CharacterManager } from "@/lib/characterManager";

export default function MainPanelPage() {
  const [token, setToken] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const keys = [
        "grudge_auth_token",
        "grudge_session_token",
        "grudge.token",
        "sso_token",
      ];
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) {
          setToken(v);
          break;
        }
      }
      const active =
        localStorage.getItem("grudge.activeCharId") ||
        localStorage.getItem("grudge_active_character");
      if (active) setCharacterId(active);
      void CharacterManager.getActiveCharacter?.().then((c) => {
        if (c?.id) setCharacterId(c.id);
      });
    } catch {
      /* private mode */
    }
  }, []);

  const external = useMemo(
    () => buildMainPanelUrl({ era: "warlords", tab: "equipment", embed: false, characterId }),
    [characterId],
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="font-serif text-2xl text-amber-100 tracking-wide">
          Warlords Main Panel
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Production panel on this host — paperdoll, equipment, camps, boats, crew, pit, and skills.
        </p>
        <p className="text-xs text-stone-500 mt-2">
          Open fullscreen:{" "}
          <a className="text-amber-500/90 underline" href={external}>
            {external}
          </a>
        </p>
      </div>
      <MainPanelHost
        open
        onClose={() => {
          window.history.length > 1 ? window.history.back() : (window.location.href = "/");
        }}
        characterId={characterId}
        token={token}
        tab="equipment"
        era="warlords"
      />
    </div>
  );
}
