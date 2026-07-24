/**
 * /boss-walkup — Puter-style boss approach before combat.
 * Query: ?characterId=&returnTo=/rpg-battle&boss=malachar
 */
import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useCharacters } from "@/hooks/use-characters";
import BossWalkupScene from "@/components/scenes/BossWalkupScene";
import { Loader2 } from "lucide-react";

export default function BossWalkupPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const characterId = params.get("characterId") || undefined;
  const returnTo = params.get("returnTo") || "/rpg-battle";
  const bossKey = params.get("boss") || "malachar";

  const { characters, loading, activeCharacter } = useCharacters();
  const hero =
    (characterId && characters.find((c) => c.id === characterId)) ||
    activeCharacter ||
    characters[0] ||
    null;

  const bossConfig = useMemo(() => {
    if (bossKey === "malachar" || bossKey === "undead") {
      return {
        bossId: "malachar",
        bossName: "Malachar the Undying",
        bossTitle: "Endgame Boss",
        quote: "You dare trespass in my domain? Your souls will fuel my eternal flame!",
        plate: "/backgrounds/lava_boss_walkup.png",
        bossRaceId: "undead",
      };
    }
    if (bossKey === "orc" || bossKey === "gharthok") {
      return {
        bossId: "gharthok",
        bossName: "Gharthok the Relentless",
        bossTitle: "Orc War-Boss",
        quote: "Crush the soft-skins! The peaks will drink their blood!",
        plate: "/backgrounds/lava_boss_walkup.png",
        bossRaceId: "orc",
      };
    }
    return {
      bossId: bossKey,
      bossName: bossKey,
      bossTitle: "Boss",
      quote: "Face me!",
      plate: "/backgrounds/lava_boss_walkup.png",
      bossRaceId: "undead",
    };
  }, [bossKey]);

  const goBattle = () => {
    const q = new URLSearchParams();
    if (hero?.id) q.set("characterId", hero.id);
    q.set("from", "boss-walkup");
    q.set("boss", bossKey);
    const base = returnTo.split("?")[0] || "/rpg-battle";
    setLocation(`${base}?${q.toString()}`);
  };

  const retreat = () => {
    setLocation(hero?.id ? `/heroes` : "/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-amber-200">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <BossWalkupScene
        hero={hero}
        config={bossConfig}
        onChallenge={goBattle}
        onRetreat={retreat}
        className="w-full h-full"
      />
    </div>
  );
}
