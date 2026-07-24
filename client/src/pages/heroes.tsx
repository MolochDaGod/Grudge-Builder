/**
 * /heroes — Warlords character select on Black Tide (clear-sky galleon crew).
 * Up to 4 slots as working crew: helm, large cannons, small cannons, crow's rope.
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
import HeroesBlackTideScene, {
  CREW_STATIONS,
} from "@/components/heroes/HeroesBlackTideScene";

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
  const selectedSlotIndex = selected
    ? slots.findIndex((s) => s?.id === selected.id)
    : -1;

  const enterPlay = () => {
    if (!selected) return;
    setActive(selected.id);
    try {
      localStorage.setItem("grudge_active_character", selected.id);
      localStorage.setItem("gruda_active_character", selected.id);
      const gid = localStorage.getItem("grudge_account_id") || "guest";
      localStorage.setItem(`gruda_active_character_${gid}`, selected.id);
      localStorage.setItem("grudge_character_handoff_from", "heroes");
    } catch {
      /* ignore */
    }
    const d = DEST.find((x) => x.id === dest) ?? DEST[1];
    setLocation(d.path(selected.id));
  };

  const forgeUrl = buildGcsUrl({
    era: "warlords",
    mode: "create",
    returnTo:
      typeof window !== "undefined"
        ? `${window.location.origin}/heroes`
        : undefined,
  });

  const onSelectSlot = (index: number) => {
    const hero = slots[index];
    if (hero) setActive(hero.id);
  };

  return (
    <div className="min-h-screen w-full text-slate-100 relative overflow-hidden flex flex-col">
      {/* Full-bleed Black Tide 3D */}
      <div className="absolute inset-0 z-0">
        <HeroesBlackTideScene
          slots={slots}
          selectedId={selected?.id ?? null}
          onSelectSlot={onSelectSlot}
          className="w-full h-full"
        />
      </div>
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/85" />

      <div className="relative z-10 flex flex-col flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 gap-4">
        <header className="text-center pointer-events-none">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-sky-100/70 mb-1 drop-shadow">
            Grudge Warlords · Black Tide
          </p>
          <h1 className="font-cinzel text-2xl sm:text-4xl font-bold tracking-[0.18em] text-amber-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            CREW YOUR WARLORDS
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-sky-50/80 max-w-xl mx-auto drop-shadow">
            Clear skies on the Black Tide — four stations: helm, main battery, fore guns, crow&apos;s line.
            Select a crew member, then enter play.
          </p>
        </header>

        {!signedIn && (
          <div
            className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-sky-400/25 pointer-events-auto backdrop-blur-sm"
            style={{ background: "linear-gradient(180deg, rgba(12,28,40,0.88), rgba(6,12,20,0.92))" }}
          >
            <p className="text-sm text-slate-200">Sign in to load your 4-slot crew roster.</p>
            <a
              href={buildSsoLoginUrl(undefined, "/heroes")}
              className="inline-flex items-center gap-2 px-5 py-2 font-cinzel text-sm uppercase tracking-wider rounded border border-amber-600/50 bg-gradient-to-b from-[#5a2818] to-[#2a0e08] text-amber-50"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </a>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6 text-amber-200/80 pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-300 text-sm drop-shadow pointer-events-none">{error}</p>
        )}

        {/* Compact slot strip (works with 3D pick) */}
        {!loading && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pointer-events-auto">
            {slots.map((hero, i) => {
              const station = CREW_STATIONS[i];
              if (!hero) {
                return (
                  <a
                    key={`empty-${i}`}
                    href={forgeUrl}
                    className="min-h-[96px] p-3 flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-sky-400/30 hover:border-amber-400/50 transition backdrop-blur-sm"
                    style={{ background: "linear-gradient(180deg, rgba(8,20,32,0.82), rgba(6,12,18,0.9))" }}
                  >
                    <Plus className="w-6 h-6 text-amber-400/70" />
                    <span className="font-cinzel text-[10px] uppercase tracking-[0.15em] text-slate-300">
                      Slot {i + 1} · {station.label}
                    </span>
                    <span className="text-[9px] text-slate-500">{station.role}</span>
                  </a>
                );
              }
              const isSel = hero.id === (activeId || selected?.id);
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => setActive(hero.id)}
                  className={`min-h-[96px] p-3 flex items-center gap-3 text-left rounded-md border transition backdrop-blur-sm ${
                    isSel
                      ? "border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.25)] bg-emerald-500/10"
                      : "border-sky-500/20 hover:border-amber-500/40"
                  }`}
                  style={{
                    background: isSel
                      ? "linear-gradient(180deg, rgba(8,40,28,0.85), rgba(6,16,12,0.92))"
                      : "linear-gradient(180deg, rgba(8,20,32,0.85), rgba(6,12,18,0.92))",
                  }}
                >
                  <div
                    className={`relative w-14 h-14 rounded-full overflow-hidden bg-black/50 shrink-0 ${
                      isSel ? "ring-2 ring-emerald-400" : "ring-1 ring-sky-600/40"
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
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-cinzel text-[9px] uppercase tracking-wider text-sky-300/80">
                      {station.label}
                    </div>
                    <div className="font-cinzel font-bold text-amber-50 text-sm truncate">{hero.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Lv {hero.level} · {raceName(hero.raceId)} · {className(hero.classId)}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">{station.role}</div>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Spacer so 3D stays visible */}
        <div className="flex-1 min-h-[12vh] pointer-events-none" />

        {selected && (
          <div
            className="p-3 text-center rounded-md border border-sky-400/25 pointer-events-auto backdrop-blur-sm"
            style={{ background: "linear-gradient(180deg, rgba(8,24,36,0.9), rgba(6,12,20,0.94))" }}
          >
            <div className="font-cinzel text-lg tracking-[0.12em] text-amber-100">
              {selected.name.toUpperCase()}
            </div>
            <div className="text-xs text-sky-100/70 mt-0.5">
              {selectedSlotIndex >= 0
                ? `${CREW_STATIONS[selectedSlotIndex].role} · `
                : ""}
              {raceName(selected.raceId)} · {className(selected.classId)} · Level {selected.level}
            </div>
          </div>
        )}

        <section
          className="p-4 flex flex-col gap-3 rounded-md border border-sky-400/25 pointer-events-auto backdrop-blur-sm"
          style={{ background: "linear-gradient(180deg, rgba(8,24,36,0.92), rgba(6,12,20,0.96))" }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-sky-200/60 font-cinzel text-center">
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
                    : "border-sky-500/20 text-slate-400 hover:text-amber-100"
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
              className="flex items-center gap-2 px-5 py-2.5 font-cinzel text-sm tracking-wider uppercase rounded border border-slate-500/40 bg-black/40 text-slate-200 hover:text-amber-100"
            >
              <Hammer className="w-4 h-4" /> Forge new
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
