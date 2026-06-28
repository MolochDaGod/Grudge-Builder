import { useEffect } from "react";
import { useLocation } from "wouter";
import CharacterBuilder from "@/pages/character-builder";

const GCS_URL = "https://character.grudge-studio.com";

/** Redirect Warlords inline builder to canonical GCS unless ?legacy=1. */
export default function CharacterRedirect() {
  const [location] = useLocation();
  const legacy = new URLSearchParams(window.location.search).get("legacy") === "1";

  useEffect(() => {
    if (legacy) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("era")) params.set("era", "warlords");
    window.location.replace(`${GCS_URL}?${params.toString()}`);
  }, [location, legacy]);

  if (legacy) return <CharacterBuilder />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white/80 text-sm">
      Opening Grudge Character Studio…
    </div>
  );
}