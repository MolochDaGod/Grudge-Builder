/**
 * /heroes · /characters · /select-character
 * Warlords 4-slot roster — seaside sector cinema (NO painted airship plate).
 *
 * NOT a dead-end: after intro / load-fail, auto-forward into first voyage
 * (shipwreck cinema → tutorial) when a hero is selected. Use ?stay=1 to pick.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Home, LogIn, Map, Plus, Swords, Hammer, Loader2, GitBranch, Users } from "lucide-react";
import { useCharacters } from "@/hooks/use-characters";
import { getRacePortrait } from "@/lib/artAssets";
import { isAuthenticated } from "@/lib/grudgeBackend";
import { buildSsoLoginUrl } from "@/lib/grudgeConfig";
import { buildGcsUrl } from "@/lib/gcsRedirect";
import { RACES, CLASSES } from "@/lib/gameData";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { pickCrewSlots } from "@/components/heroes/heroesCrewLoader";
import HeroesSeasideCinemaScene from "@/components/heroes/HeroesSeasideCinemaScene";
import { Link } from "wouter";
import { isTutorialComplete } from "@/lib/warlordsOnboarding";

const MAX_SLOTS = 4;

/** Simple slot labels — not airship crew stations. */
const SLOT_META = [
  { id: "slot1", label: "Hero 1", role: "Warlord slot" },
  { id: "slot2", label: "Hero 2", role: "Warlord slot" },
  { id: "slot3", label: "Hero 3", role: "Warlord slot" },
  { id: "slot4", label: "Hero 4", role: "Warlord slot" },
] as const;

type PlayDest = "shipwreck" | "home_island" | "zone" | "lobby" | "tutorial" | "world";

const DEST: { id: PlayDest; label: string; path: (id: string) => string; icon: React.ReactNode }[] = [
  {
    id: "shipwreck",
    label: "First Voyage",
    path: (id) =>
      `/leviathan-cinema?characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Swords className="w-4 h-4" />,
  },
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
    label: "Tutorial Island",
    path: (id) => `/tutorial?characterId=${encodeURIComponent(id)}&from=heroes`,
    icon: <Users className="w-4 h-4" />,
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

function readQueryParams() {
  if (typeof window === "undefined") {
    return {
      characterId: null as string | null,
      errorCode: null as string | null,
      stay: false,
      auto: false,
      from: null as string | null,
    };
  }
  const q = new URLSearchParams(window.location.search);
  return {
    characterId: q.get("characterId"),
    errorCode: q.get("error"),
    stay: q.get("stay") === "1",
    auto: q.get("auto") === "1",
    from: q.get("from"),
  };
}

export default function HeroesPage() {
  const [, setLocation] = useLocation();
  // Warlords product page — era=warlords only (voxel/nexus have their own hosts).
  const { characters: warlordsChars, loading, activeId, setActive, error, refetch } = useCharacters();
  const tutorialDone = isTutorialComplete();
  /** First voyage until tutorial flag; then home island */
  const [dest, setDest] = useState<PlayDest>(() =>
    isTutorialComplete() ? "home_island" : "shipwreck",
  );
  const signedIn = isAuthenticated();
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [query] = useState(() => readQueryParams());
  const queryCharId = query.characterId;
  const queryError = query.errorCode;
  const autoForwarded = useRef(false);

  // Phase B: fleet session + activate before roster / auto-forward
  useEffect(() => {
    void import("@/lib/characterHandoff").then(({ ensurePlayEntrySession }) =>
      ensurePlayEntrySession({ search: window.location.search }),
    );
  }, []);

  // Honor ?characterId= handoff + surface ?error=load recovery
  useEffect(() => {
    if (queryError === "load") {
      setHandoffError(
        signedIn
          ? "Could not load that character. Pick a crew slot or create one — ownership is on your Grudge ID account (cNFT claim is optional)."
          : "Sign in with Grudge ID to load your heroes. Characters are account-bound on Railway; cNFTs stay in server escrow until you claim.",
      );
    }
  }, [queryError, signedIn]);

  useEffect(() => {
    if (!queryCharId || loading) return;
    const found = warlordsChars.find((c) => c.id === queryCharId);
    if (found) {
      setActive(found.id);
      setHandoffError(null);
      // Clean error/query noise from URL without reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
      } catch {
        /* ignore */
      }
    } else if (signedIn && warlordsChars.length > 0) {
      setHandoffError(
        `Character ${queryCharId.slice(0, 8)}… is not on this Warlords roster (era=warlords). Select another hero or create one in Foundry.`,
      );
    } else if (signedIn && !loading && warlordsChars.length === 0) {
      setHandoffError("No Warlords heroes on this Grudge ID yet. Create one in Foundry (4 slots, grudge6).");
    }
  }, [queryCharId, loading, warlordsChars, signedIn, setActive]);

  // Warlords-only: never merge voxel/nexus into product /heroes (era SSOT).
  const crew = useMemo(
    () => pickCrewSlots([], warlordsChars, MAX_SLOTS, "warlords"),
    [warlordsChars],
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

  const enterPlay = useCallback(
    (overrideDest?: PlayDest) => {
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
      // Never send first-voyage players to home island (locked / empty)
      let pick = overrideDest ?? dest;
      if (!tutorialDone && (pick === "home_island" || pick === "zone" || pick === "world")) {
        pick = "shipwreck";
      }
      if (tutorialDone && pick === "shipwreck") {
        pick = "home_island";
      }
      const d = DEST.find((x) => x.id === pick) ?? DEST[0];
      setLocation(d.path(selected.id));
    },
    [selected, setActive, dest, tutorialDone, setLocation],
  );

  // Escape the /heroes? dead-end: once roster is ready, auto-enter play
  // unless user asked to stay and pick (?stay=1).
  useEffect(() => {
    if (loading || autoForwarded.current || query.stay) return;
    if (!signedIn || !selected) return;

    // Auto when: explicit auto, handoff characterId, or bare /heroes after intro
    const shouldAuto =
      query.auto ||
      !!queryCharId ||
      queryError === "load" ||
      query.from === "intro" ||
      query.from === "start" ||
      query.from === "home" ||
      // Bare /heroes with exactly one hero → don't strand on layered UI
      (warlordsChars.length === 1 && !query.stay);

    if (!shouldAuto) return;
    autoForwarded.current = true;
    const t = setTimeout(() => {
      enterPlay(tutorialDone ? "home_island" : "shipwreck");
    }, 650);
    return () => clearTimeout(t);
  }, [
    loading,
    signedIn,
    selected,
    query.stay,
    query.auto,
    query.from,
    queryCharId,
    queryError,
    warlordsChars.length,
    tutorialDone,
    enterPlay,
  ]);

  // First voyage → tutorial; after tutorial → airship → home (not empty /heroes)
  const forgeUrl = buildGcsUrl({
    era: "warlords",
    mode: "create",
    // omit returnTo → defaultWarlordsReturnTo() uses postCreatePlayPath()
  });

  const onSelectSlot = (index: number) => {
    const hero = slots[index];
    if (hero) setActive(hero.id);
  };

  return (
    <div className="min-h-screen w-full text-slate-100 relative overflow-hidden flex flex-col">
      {/* Full-bleed sector seaside cinema — NO painted airship plate */}
      <div className="absolute inset-0 z-0">
        <HeroesSeasideCinemaScene
          slots={slots}
          selectedId={selected?.id ?? null}
          onSelectSlot={onSelectSlot}
          className="w-full h-full"
        />
      </div>
      {/* Light vignette only — avoid heavy stacked opaque layers over cinema */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <div className="relative z-10 flex flex-col flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 pt-3 pb-36 gap-3">
        {/* Thin product tabs — single row, not competing with cinema HUD */}
        <nav className="flex flex-wrap justify-center gap-1 sm:gap-1.5 pointer-events-auto">
          {[
            { href: "/heroes?stay=1", label: "Characters", icon: <Users className="w-3.5 h-3.5" /> },
            { href: "/arsenal", label: "Arsenal", icon: <Swords className="w-3.5 h-3.5" /> },
            { href: "/professions", label: "Professions", icon: <Hammer className="w-3.5 h-3.5" /> },
            { href: "/skill-tree", label: "Skill Trees", icon: <GitBranch className="w-3.5 h-3.5" /> },
            { href: "/crafting", label: "Crafting", icon: <Hammer className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <Link key={t.href} href={t.href}>
              <a className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-600/30 bg-black/50 hover:bg-amber-500/10 text-[10px] font-cinzel uppercase tracking-wider text-amber-100/90 no-underline backdrop-blur-sm">
                {t.icon}
                {t.label}
              </a>
            </Link>
          ))}
        </nav>

        <header className="text-center pointer-events-none">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-amber-200/80 mb-0.5 drop-shadow">
            Grudge Warlords · 4-slot roster
          </p>
          <h1 className="font-cinzel text-xl sm:text-3xl font-bold tracking-[0.18em] text-amber-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            HEROES
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs text-amber-50/80 max-w-lg mx-auto drop-shadow">
            {tutorialDone
              ? "Pick a warlord, then enter home island or open world."
              : "First voyage: leviathan cinema → shipwreck tutorial. Enter play below (or wait for auto-start)."}
          </p>
        </header>

        {!signedIn && (
          <div
            className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-amber-500/30 pointer-events-auto backdrop-blur-sm"
            style={{ background: "linear-gradient(180deg, rgba(28,16,8,0.9), rgba(12,8,6,0.94))" }}
          >
            <p className="text-sm text-slate-200">
              Sign in with Grudge ID to load your 4-slot Warlords crew. Characters are account-owned; cNFTs
              mint to server escrow (claim to wallet is optional).
            </p>
            <a
              href={buildSsoLoginUrl(
                undefined,
                queryCharId ? `/heroes?characterId=${encodeURIComponent(queryCharId)}` : "/heroes",
              )}
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

        {(error || handoffError) && (
          <div
            className="p-3 rounded-md border border-red-400/40 pointer-events-auto backdrop-blur-sm text-center"
            style={{ background: "linear-gradient(180deg, rgba(40,12,12,0.9), rgba(20,8,8,0.95))" }}
          >
            <p className="text-red-200 text-sm drop-shadow">{handoffError || error}</p>
            {signedIn && (
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-2 text-xs text-amber-200/90 underline underline-offset-2"
              >
                Retry load roster
              </button>
            )}
          </div>
        )}

        {/* Compact slot strip (works with 3D pick) */}
        {!loading && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pointer-events-auto">
            {slots.map((hero, i) => {
              const station = SLOT_META[i] ?? SLOT_META[0];
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

        {/* Leave cinema visible — no full-width stats panel stacking over it */}
        <div className="flex-1 min-h-[28vh] pointer-events-none" />
      </div>

      {/* Fixed bottom dock — sole enter-play surface (avoids layered mid-page cards) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 pointer-events-auto border-t border-sky-400/25 px-3 py-3"
        style={{ background: "linear-gradient(180deg, rgba(6,12,20,0.72), rgba(4,8,14,0.96))" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {selected && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-100/90">
              <span className="font-cinzel tracking-wider text-amber-100">
                {selected.name}
              </span>
              <span className="text-slate-400">
                · {raceName(selected.raceId)} · {className(selected.classId)} · Lv {selected.level}
                {selectedSlotIndex >= 0
                  ? ` · ${SLOT_META[selectedSlotIndex]?.label ?? `Slot ${selectedSlotIndex + 1}`}`
                  : ""}
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            {DEST.filter((d) => {
              if (!tutorialDone) return d.id === "shipwreck" || d.id === "tutorial";
              return d.id !== "shipwreck";
            }).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDest(d.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-cinzel uppercase tracking-wider border transition ${
                  dest === d.id
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                    : "border-sky-500/20 text-slate-400 hover:text-amber-100 bg-black/30"
                }`}
              >
                {d.icon}
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={!selected}
              onClick={() => enterPlay()}
              className="flex items-center gap-2 px-7 py-2.5 font-cinzel font-bold text-sm tracking-wider uppercase rounded border border-amber-600/50 bg-gradient-to-b from-[#5a2818] to-[#2a0e08] text-amber-50 disabled:opacity-40 shadow-[0_0_16px_rgba(200,60,20,0.25)]"
            >
              <Swords className="w-4 h-4" />
              {!selected
                ? "Select a hero"
                : tutorialDone
                  ? "Enter play"
                  : "Start first voyage"}
            </button>
            <a
              href={forgeUrl}
              className="flex items-center gap-2 px-4 py-2.5 font-cinzel text-sm tracking-wider uppercase rounded border border-slate-500/40 bg-black/40 text-slate-200 hover:text-amber-100"
            >
              <Hammer className="w-4 h-4" /> Forge new
            </a>
            {!query.stay && selected && (
              <button
                type="button"
                onClick={() => {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set("stay", "1");
                    window.history.replaceState({}, "", url.pathname + url.search);
                  } catch {
                    /* ignore */
                  }
                  autoForwarded.current = true;
                }}
                className="px-3 py-2 text-[10px] text-slate-400 underline underline-offset-2"
              >
                Stay on roster
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
