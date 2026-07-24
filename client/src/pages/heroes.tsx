/**
 * /heroes — Full Three.js seaside sector cinema (cave + islands + deep ocean).
 * Capture zone under seaside_treasure_cave; islands nearby; once-per-sector SSOT.
 * Crew = player explorer/voxel + warlords selections.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Home, LogIn, Map, Plus, Ship, Swords, Hammer, Loader2 } from "lucide-react";
import { useCharacters } from "@/hooks/use-characters";
import { getRacePortrait } from "@/lib/artAssets";
import { isAuthenticated } from "@/lib/grudgeBackend";
import { buildSsoLoginUrl } from "@/lib/grudgeConfig";
import { buildGcsUrl } from "@/lib/gcsRedirect";
import { RACES, CLASSES } from "@/lib/gameData";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { characterAPI } from "@/lib/api";
import { pickCrewSlots } from "@/components/heroes/heroesCrewLoader";
import HeroesSeasideCinemaScene from "@/components/heroes/HeroesSeasideCinemaScene";
import { CREW_STATIONS } from "@/components/heroes/HeroesBlackTideScene";

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
  const { characters: warlordsChars, loading, activeId, setActive, error } = useCharacters();
  const [voxelChars, setVoxelChars] = useState<Character[]>([]);
  const [dest, setDest] = useState<PlayDest>("zone");
  const signedIn = isAuthenticated();

  // Explorer / voxel era selections (GRUDOX 4-slot) — merged with warlords for crew AI
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await characterAPI.getAll("voxel");
        if (!cancelled) setVoxelChars(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setVoxelChars([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, loading]);

  const crew = useMemo(
    () => pickCrewSlots(voxelChars, warlordsChars, MAX_SLOTS),
    [voxelChars, warlordsChars],
  );

  const slots: (Character | null)[] = useMemo(() => {
    return Array.from({ length: MAX_SLOTS }, (_, i) => crew[i] ?? null);
  }, [crew]);

  const selected =
    crew.find((c) => c.id === activeId) ??
    warlordsChars.find((c) => c.id === activeId) ??
    crew[0] ??
    null;
  const selectedSlotIndex = selected
    ? slots.findIndex((s) => s?.id === selected.id)
    : -1;

  const enterPlay = () => {
    if (!selected) return;
    setActive(selected.id);
    try {
      localStorage.setItem("grudge_active_character", selected.id);
      localStorage.setItem("gruda_active_character", selected.id);
      localStorage.setItem("grudge.open.selectedCharacterId", selected.id);
      localStorage.setItem("voxelrealms.selectedCharacterId", selected.id);
      const era =
        selected.gameEra ||
        (selected.model3d as { gameEra?: string } | undefined)?.gameEra ||
        "warlords";
      try {
        const byEra = JSON.parse(localStorage.getItem("grudge.selectedCharacterByEra") || "{}");
        byEra[String(era)] = selected.id;
        if (String(era) === "voxel" || String(era) === "warlords") {
          byEra.voxel = byEra.voxel || selected.id;
          byEra.warlords = byEra.warlords || selected.id;
        }
        localStorage.setItem("grudge.selectedCharacterByEra", JSON.stringify(byEra));
      } catch {
        /* ignore */
      }
      const gid = localStorage.getItem("grudge_account_id") || "guest";
      localStorage.setItem(`gruda_active_character_${gid}`, selected.id);
      localStorage.setItem("grudge_character_handoff_from", "heroes");
      CharacterManager.setActive(selected.id);
    } catch {
      /* ignore */
    }
    const d = DEST.find((x) => x.id === dest) ?? DEST[1];
    setLocation(d.path(selected.id));
  };

  const forgeUrl = buildGcsUrl({
    era: voxelChars.length > 0 ? "voxel" : "warlords",
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
      {/* Full-bleed Three.js seaside cinema (cave + islands + deep ocean) */}
      <div className="absolute inset-0 z-0">
        <HeroesSeasideCinemaScene
          slots={slots}
          selectedId={selected?.id ?? null}
          onSelectSlot={onSelectSlot}
          className="w-full h-full"
        />
      </div>
      {/* Light vignette only — keep 3D scene readable */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/35 via-transparent to-black/70" />

      <div className="relative z-10 flex flex-col flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 gap-4">
        <header className="text-center pointer-events-none">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-cyan-200/80 mb-1 drop-shadow">
            Grudge Warlords · Sector seaside cinema
          </p>
          <h1 className="font-cinzel text-2xl sm:text-4xl font-bold tracking-[0.18em] text-cyan-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            SEASIDE TREASURE CAVE
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-cyan-50/85 max-w-xl mx-auto drop-shadow">
            Full Three.js scene — treasure cave + islands on deep ocean (world-map water). Capture zone
            under the cave. Pick your explorer crew, then enter play.
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
            className="p-3 sm:p-4 rounded-md border border-emerald-400/30 pointer-events-auto backdrop-blur-sm grid sm:grid-cols-[auto_1fr] gap-3"
            style={{ background: "linear-gradient(180deg, rgba(8,32,28,0.92), rgba(6,14,18,0.95))" }}
          >
            <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.25)] shrink-0">
                <img
                  src={selected.avatarUrl || getRacePortrait(selected.raceId)}
                  alt={selected.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getRacePortrait(selected.raceId);
                  }}
                />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <div className="font-cinzel text-lg tracking-[0.12em] text-amber-100">
                  {selected.name.toUpperCase()}
                </div>
                <div className="text-xs text-emerald-100/80 mt-0.5">
                  {selectedSlotIndex >= 0 ? `${CREW_STATIONS[selectedSlotIndex].role} · ` : ""}
                  {raceName(selected.raceId)} · {className(selected.classId)} · Lv {selected.level}
                </div>
                {selected.grudgeCode && (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {selected.grudgeCode}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="col-span-2 sm:col-span-3 text-[9px] uppercase tracking-[0.2em] text-sky-200/55 font-cinzel">
                Stats · equipment · active selection
              </div>
              {Object.entries(selected.attributes || {})
                .slice(0, 6)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-white/5 pb-0.5">
                    <span className="text-slate-400 capitalize">{k}</span>
                    <span className="text-amber-100 font-semibold">{v}</span>
                  </div>
                ))}
              <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-1.5 mt-1">
                {Object.entries(selected.equipment || {})
                  .filter(([, id]) => !!id)
                  .slice(0, 8)
                  .map(([slot, id]) => (
                    <span
                      key={slot}
                      className="px-1.5 py-0.5 rounded border border-amber-600/30 bg-black/30 text-[9px] text-amber-100/90"
                      title={String(id)}
                    >
                      {slot}: {String(id).slice(0, 18)}
                    </span>
                  ))}
                {!Object.values(selected.equipment || {}).some(Boolean) && (
                  <span className="text-[10px] text-slate-500">No equipment equipped</span>
                )}
              </div>
              <p className="col-span-2 sm:col-span-3 text-[10px] text-emerald-200/70 mt-1">
                Selected for all play options below — stays active until you pick another crewmate on this
                scene.
              </p>
            </div>
          </div>
        )}

        <section
          className="p-4 flex flex-col gap-3 rounded-md border border-sky-400/25 pointer-events-auto backdrop-blur-sm"
          style={{ background: "linear-gradient(180deg, rgba(8,24,36,0.92), rgba(6,12,20,0.96))" }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-sky-200/60 font-cinzel text-center">
            Enter live play as selected hero
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
