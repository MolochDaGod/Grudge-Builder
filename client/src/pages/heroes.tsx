/**
 * /heroes — Warlords character select (Undead forge aesthetic).
 * 4-slot roster → enter play, or jump to Foundry create on character.grudge-studio.com.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Home, LogIn, Map, Plus, Ship, Swords, Hammer, Loader2 } from "lucide-react";
import { useCharacters } from "@/hooks/use-characters";
import { getRacePortrait } from "@/lib/artAssets";
import { isAuthenticated } from "@/lib/grudgeBackend";
import { buildSsoLoginUrl } from "@/lib/grudgeConfig";
import { buildGcsUrl } from "@/lib/gcsRedirect";
import { RACES, CLASSES } from "@/lib/gameData";
import type { Character } from "@/lib/characterManager";

const MAX_SLOTS = 4;

type PlayDest = "home_island" | "zone" | "lobby" | "tutorial" | "world";

const DEST: { id: PlayDest; label: string; path: (id: string) => string; icon: React.ReactNode }[] = [
  {
    id: "home_island",
    label: "Home Island",
    path: (id) => `/home-island?characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Home className="w-4 h-4" />,
  },
  {
    id: "zone",
    label: "Open Zone",
    path: (id) =>
      `/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Map className="w-4 h-4" />,
  },
  {
    id: "lobby",
    label: "Lobby",
    path: (id) => `/play?mode=lobby&characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Swords className="w-4 h-4" />,
  },
  {
    id: "tutorial",
    label: "Tutorial",
    path: (id) => `/tutorial?characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Ship className="w-4 h-4" />,
  },
  {
    id: "world",
    label: "World",
    path: (id) => `/world?characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Map className="w-4 h-4" />,
  },
];

function raceName(id: string) {
  return RACES.find((r) => r.id === id)?.name ?? id;
}
function className(id: string) {
  return CLASSES.find((c) => c.id === id)?.name ?? id;
}

export default function HeroesPage() {
  const [, setLocation] = useLocation();
  const { characters, loading, activeId, setActive, error } = useCharacters();
  const [dest, setDest] = useState<PlayDest>("zone");
  const signedIn = isAuthenticated();

  const slots: (Character | null)[] = useMemo(() => {
    const list = characters.slice(0, MAX_SLOTS);
    return Array.from({ length: MAX_SLOTS }, (_, i) => list[i] ?? null);
  }, [characters]);

  const selected = characters.find((c) => c.id === activeId) ?? characters[0] ?? null;

  const enterPlay = () => {
    if (!selected) return;
    setActive(selected.id);
    const d = DEST.find((x) => x.id === dest) ?? DEST[1];
    setLocation(d.path(selected.id));
  };

  const forgeUrl = buildGcsUrl({
    era: "warlords",
    mode: "create",
    returnTo:
      typeof window !== "undefined"
        ? `${window.location.origin}/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1`
        : undefined,
  });

  return (
    <div className="min-h-screen w-full text-slate-100 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#0a0202",
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(180,40,10,0.4), transparent 55%),
            url(/assets/ui/create-bg-undead.jpg)
          `,
          backgroundSize: "cover, cover",
          backgroundPosition: "center",
          filter: "brightness(0.5) saturate(1.1)",
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/75 via-black/45 to-black/90" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
        <header className="text-center">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-amber-200/50 mb-2">
            Grudge Warlords
          </p>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold tracking-[0.2em] text-red-200 drop-shadow-[0_0_18px_rgba(220,50,40,0.45)]">
            SELECT YOUR HERO
          </h1>
          <p className="mt-2 text-sm text-amber-100/60 max-w-lg mx-auto">
            Choose a warlord for haven_shore dual-browser play — or forge a new champion.
          </p>
        </header>

        {!signedIn && (
          <div
            className="p-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-amber-700/40"
            style={{ background: "linear-gradient(180deg, rgba(28,12,10,0.92), rgba(12,6,6,0.96))" }}
          >
            <p className="text-sm text-slate-300">Sign in to load your 4-slot roster.</p>
            <a
              href={buildSsoLoginUrl(undefined, "/heroes")}
              className="inline-flex items-center gap-2 px-5 py-2 font-cinzel text-sm uppercase tracking-wider rounded border border-amber-600/50 bg-gradient-to-b from-[#5a2818] to-[#2a0e08] text-amber-50"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </a>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12 text-amber-200/70">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {error && <p className="text-center text-red-400 text-sm">{error}</p>}

        {!loading && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {slots.map((hero, i) => {
              if (!hero) {
                return (
                  <a
                    key={`empty-${i}`}
                    href={forgeUrl}
                    className="min-h-[200px] p-4 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-amber-600/35 hover:border-amber-400/50 transition group"
                    style={{ background: "linear-gradient(180deg, rgba(28,12,10,0.85), rgba(12,6,6,0.95))" }}
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-600/40 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]">
                      <Plus className="w-8 h-8 text-amber-400/60" />
                    </div>
                    <span className="font-cinzel text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Slot {i + 1} · Forge
                    </span>
                  </a>
                );
              }
              const isSel = hero.id === (activeId || selected?.id);
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => setActive(hero.id)}
                  className={`min-h-[200px] p-4 flex flex-col items-center gap-3 text-center rounded-md border transition ${
                    isSel
                      ? "border-amber-400/70 shadow-[0_0_28px_rgba(251,191,36,0.25)] bg-amber-500/10"
                      : "border-amber-800/30 hover:border-amber-600/40"
                  }`}
                  style={{ background: "linear-gradient(180deg, rgba(28,12,10,0.9), rgba(12,6,6,0.96))" }}
                >
                  <div
                    className={`relative w-24 h-24 rounded-full overflow-hidden bg-black/60 ${
                      isSel ? "ring-2 ring-amber-400" : "ring-1 ring-amber-700/40"
                    }`}
                  >
                    <img
                      src={hero.avatarUrl || getRacePortrait(hero.raceId)}
                      alt={hero.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getRacePortrait(hero.raceId);
                      }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono text-amber-300 py-0.5">
                      Lv {hero.level}
                    </span>
                  </div>
                  <div className="w-full min-w-0">
                    <div className="font-cinzel font-bold text-amber-50 text-sm truncate">{hero.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {raceName(hero.raceId)} · {className(hero.classId)}
                    </div>
                    {isSel && (
                      <span className="inline-block mt-1 text-[9px] font-cinzel uppercase tracking-wider text-emerald-300">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {selected && (
          <div
            className="p-4 text-center rounded-md border border-amber-700/35"
            style={{ background: "linear-gradient(180deg, rgba(28,12,10,0.92), rgba(12,6,6,0.96))" }}
          >
            <div className="font-cinzel text-xl tracking-[0.15em] text-red-300">
              {selected.name.toUpperCase()}
            </div>
            <div className="text-sm text-amber-100/70 mt-1">
              {raceName(selected.raceId)} · {className(selected.classId)} · Level {selected.level}
            </div>
          </div>
        )}

        <section
          className="p-5 flex flex-col gap-4 rounded-md border border-amber-700/35"
          style={{ background: "linear-gradient(180deg, rgba(28,12,10,0.92), rgba(12,6,6,0.96))" }}
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-200/50 font-cinzel text-center">
            Enter live play
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {DEST.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDest(d.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-cinzel uppercase tracking-wider border transition ${
                  dest === d.id
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                    : "border-amber-500/15 text-slate-400 hover:text-amber-100"
                }`}
              >
                {d.icon}
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={!selected}
              onClick={enterPlay}
              className="flex items-center gap-2 px-6 py-2.5 font-cinzel font-bold text-sm tracking-wider uppercase rounded border border-amber-600/50 bg-gradient-to-b from-[#5a2818] to-[#2a0e08] text-amber-50 disabled:opacity-40 shadow-[0_0_16px_rgba(200,60,20,0.25)]"
            >
              <Swords className="w-4 h-4" /> Enter with hero
            </button>
            <a
              href={forgeUrl}
              className="flex items-center gap-2 px-5 py-2.5 font-cinzel text-sm tracking-wider uppercase rounded border border-slate-600/50 bg-black/50 text-slate-300 hover:text-amber-100"
            >
              <Hammer className="w-4 h-4" /> Forge new
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
