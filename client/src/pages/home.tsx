/**
 * Warlords production home — grudgewarlords.com/home
 *
 * WCS hub: Layout + ObjectStore icons + Railway bag + craft/arsenal/suite.
 * Play funnel is a button (and ?play=1), not an auto-redirect that blanks the page.
 *
 * Query: ?play=1 auto-forward · ?legacy=1 ops tiles · ?ops=1 info WORLD_MAP
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LogIn, AlertCircle, ExternalLink, Hammer, Sword, Leaf, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import CharacterProfessionHub from "@/components/profession/CharacterProfessionHub";
import { CharacterManager, type Character } from "@/lib/characterManager";
import {
  isAuthenticated as hasAuthToken,
  waitForAuthReady,
  ensureFleetSessionClaim,
  getToken,
} from "@/lib/grudgeBackend";
import { useAuth } from "@/contexts/AuthContext";
import { useCharacters } from "@/hooks/use-characters";
import { useAccountInventory, useAccountResources } from "@/hooks/use-account";
import {
  isTutorialComplete,
  postCreatePlayPath,
  markOpeningSeen,
} from "@/lib/warlordsOnboarding";
import { fetchPlayReadiness } from "@/lib/playHub";
import { WARLORDS_HOME_ACTIONS, WARLORDS_LOBBY_PATH } from "@shared/fleet";
import { useObjectStoreData, getBaseItems } from "@/lib/objectStoreData";
import { resolveIconUrl, iconOnError } from "@/lib/iconResolver";

type RouteReason =
  | "loading"
  | "sign_in"
  | "no_character"
  | "tutorial"
  | "no_island"
  | "play_home_island"
  | "play_open_world"
  | "redirecting"
  | "error";

function qs(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Where Enter Play / ?play=1 should send the player. */
async function resolveHomeForward(): Promise<{ path: string; reason: RouteReason }> {
  try {
    const { ensurePlayEntrySession } = await import("@/lib/characterHandoff");
    await ensurePlayEntrySession({ search: window.location.search });
  } catch {
    await ensureFleetSessionClaim().catch(() => {});
    await waitForAuthReady(8000);
  }

  if (!getToken() && !hasAuthToken()) {
    return { path: "", reason: "sign_in" };
  }

  const readiness = await fetchPlayReadiness();

  if (!readiness.signedIn && !getToken()) {
    return { path: "", reason: "sign_in" };
  }

  let charId = readiness.activeCharacterId;
  try {
    const { parseCharacterHandoff } = await import("@/lib/characterHandoff");
    const h = parseCharacterHandoff();
    if (h.characterId) charId = h.characterId;
  } catch {
    /* ignore */
  }
  if (!charId && readiness.hasCharacter) {
    try {
      const list = await CharacterManager.getAll("warlords");
      if (list[0]?.id) {
        CharacterManager.setActive(list[0].id);
        charId = list[0].id;
      }
    } catch {
      /* ignore */
    }
  }

  if (!readiness.hasCharacter && !charId) {
    const returnTo = encodeURIComponent(postCreatePlayPath());
    return {
      path: `/create-character?returnTo=${returnTo}&from=home`,
      reason: "no_character",
    };
  }

  const idQ = charId
    ? `characterId=${encodeURIComponent(charId)}&from=home`
    : "from=home";

  if (!isTutorialComplete()) {
    return { path: `/leviathan-cinema?${idQ}`, reason: "tutorial" };
  }

  if (!readiness.hasHomeIsland) {
    return { path: `/island-reveal?${idQ}`, reason: "no_island" };
  }

  return { path: `/home-island?${idQ}`, reason: "play_home_island" };
}

const REASON_COPY: Record<RouteReason, string> = {
  loading: "Checking your account…",
  sign_in: "Sign in to enter Warlords",
  no_character: "Create your first hero…",
  tutorial: "First voyage — leviathan attack…",
  no_island: "Claiming your home island…",
  play_home_island: "Entering home island…",
  play_open_world: "Entering open world…",
  redirecting: "Taking you into the game…",
  error: "Could not resolve play destination",
};

function ItemIcon({
  src,
  category,
  type,
  name,
}: {
  src?: string | null;
  category?: string;
  type?: string;
  name?: string;
}) {
  return (
    <img
      src={resolveIconUrl(src, { category, type, name })}
      alt=""
      width={40}
      height={40}
      className="w-10 h-10 object-contain"
      referrerPolicy="no-referrer"
      onError={iconOnError}
      draggable={false}
    />
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { openLogin, isAuthenticated, handleLogout } = useAuth();
  const [reason, setReason] = useState<RouteReason>("loading");
  const [detail, setDetail] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [playBridge, setPlayBridge] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  const {
    characters: roster,
    activeCharacter: hubChar,
    loading: charsLoading,
    refetch: refetchChars,
  } = useCharacters();
  const { inventory, loading: bagLoading, refetch: refetchBag } = useAccountInventory();
  const { resources, loading: resLoading, refetch: refetchRes } = useAccountResources();
  const { items, recipes, materials, isLoading: osLoading, totalItems } = useObjectStoreData();

  const go = useCallback(
    (path: string) => {
      if (!path) return;
      if (path.startsWith("http")) {
        window.location.href = path;
        return;
      }
      setLocation(path);
    },
    [setLocation],
  );

  const refreshAccount = useCallback(async () => {
    await Promise.all([refetchChars(), refetchBag(), refetchRes()]);
  }, [refetchChars, refetchBag, refetchRes]);

  useEffect(() => {
    const p = qs();
    if (p.get("ops") === "1") {
      window.location.href =
        "https://info.grudge-studio.com/WORLD_MAP.html?from=client-home";
      return;
    }
    if (p.get("legacy") === "1") {
      setLegacy(true);
      return;
    }
    if (p.get("play") !== "1") {
      markOpeningSeen();
      return;
    }

    setPlayBridge(true);
    let cancelled = false;
    (async () => {
      try {
        markOpeningSeen();
        const next = await resolveHomeForward();
        if (cancelled) return;
        if (next.reason === "sign_in") {
          setReason("sign_in");
          return;
        }
        setReason("redirecting");
        setDetail(REASON_COPY[next.reason] || next.path);
        go(next.path);
      } catch (e) {
        if (cancelled) return;
        setReason("error");
        setDetail(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [go]);

  useEffect(() => {
    if (!legacy) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureFleetSessionClaim().catch(() => {});
        await waitForAuthReady(5000);
        const list = await CharacterManager.getAll("warlords");
        if (cancelled) return;
        setCharacters(list);
        const active = await CharacterManager.getActiveCharacter();
        setActiveCharacter(active && list.some((c) => c.id === active.id) ? active : list[0] ?? null);
      } catch {
        if (!cancelled) setCharacters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [legacy]);

  const signedIn = isAuthenticated || hasAuthToken() || !!getToken();
  const featuredWeapons = useMemo(
    () => getBaseItems(items).filter((i) => i.type === "weapon").slice(0, 8),
    [items],
  );
  const featuredArmor = useMemo(
    () => getBaseItems(items).filter((i) => i.type === "armor").slice(0, 8),
    [items],
  );
  const featuredMats = useMemo(() => materials.slice(0, 10), [materials]);
  const bagPreview = useMemo(() => inventory.slice(0, 12), [inventory]);
  const resourceRows = useMemo(
    () => Object.entries(resources).filter(([, n]) => Number(n) > 0).slice(0, 12),
    [resources],
  );

  const enterPlay = useCallback(async () => {
    setPlayBridge(true);
    setReason("loading");
    try {
      const next = await resolveHomeForward();
      if (next.reason === "sign_in") {
        setPlayBridge(false);
        openLogin();
        return;
      }
      setReason("redirecting");
      setDetail(REASON_COPY[next.reason] || next.path);
      go(next.path);
    } catch (e) {
      setReason("error");
      setDetail(e instanceof Error ? e.message : "Unknown error");
    }
  }, [go, openLogin]);

  if (playBridge && !legacy) {
    return (
      <div className="min-h-screen bg-[#05060c] flex flex-col items-center justify-center text-amber-100/90 gap-4 px-4">
        {reason !== "sign_in" && reason !== "error" && (
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        )}
        {reason === "error" && <AlertCircle className="w-10 h-10 text-rose-400" />}
        <p className="text-sm tracking-wide text-center max-w-md">
          {REASON_COPY[reason]}
        </p>
        {detail && (
          <p className="text-[11px] text-white/35 font-mono text-center break-all max-w-lg">
            {detail}
          </p>
        )}
        {reason === "error" && (
          <Button onClick={() => window.location.reload()} className="bg-amber-700 text-white">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (legacy) {
    return (
      <div className="min-h-screen bg-[#05060c] text-[#eef2ff] px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-cinzel text-amber-300 text-lg tracking-wide">
                Warlords · legacy hub
              </h1>
              <p className="text-[11px] text-white/40 mt-1">Ops tile menu. Default /home is the WCS hub.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => go("/home")} className="bg-amber-700 text-white text-xs">
                WCS home
              </Button>
              {signedIn && (
                <Button size="sm" variant="ghost" onClick={() => handleLogout()} className="text-white/40 text-xs">
                  Sign out
                </Button>
              )}
            </div>
          </div>
          {activeCharacter && (
            <p className="text-sm text-white/60">
              Active: <span className="text-amber-200">{activeCharacter.name}</span> · Lv{" "}
              {activeCharacter.level}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {WARLORDS_HOME_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  if (action.id === "characters") {
                    go(characters.length ? "/heroes" : "/create-character");
                    return;
                  }
                  if (activeCharacter?.id && action.url.startsWith("/")) {
                    const u = new URL(action.url, window.location.origin);
                    u.searchParams.set("characterId", activeCharacter.id);
                    u.searchParams.set("from", "home-legacy");
                    go(u.pathname + u.search);
                    return;
                  }
                  go(action.url);
                }}
                className="text-left rounded-xl border border-white/10 p-4 hover:border-amber-500/40 bg-white/[.03]"
              >
                <div className="text-sm font-semibold text-white">{action.title}</div>
                <div className="text-[11px] text-cyan-400/70 mt-0.5">{action.subtitle}</div>
                <p className="text-[11px] text-white/40 mt-2">{action.description}</p>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="border-white/15 text-white/60 text-xs"
            onClick={() => go(WARLORDS_LOBBY_PATH)}
          >
            Lobby (pirate-islands)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
              Warlords Home
            </h1>
            <p className="text-stone-400 text-sm">
              WCS hub — shared account bag, character XP, ObjectStore icons.
              {osLoading ? " Loading catalog…" : ` ${totalItems} items live.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!signedIn && (
              <Button onClick={() => openLogin()} className="bg-amber-700 text-[#1a1408] font-semibold">
                <LogIn className="w-4 h-4 mr-1.5" />
                Sign in with Grudge ID
              </Button>
            )}
            <Button onClick={() => void enterPlay()} className="bg-emerald-800 text-emerald-100">
              <Leaf className="w-4 h-4 mr-1.5" />
              Enter play
            </Button>
            <Button variant="outline" className="border-stone-600 text-stone-300" onClick={() => go("/craft/")}>
              Full craft suite
            </Button>
          </div>
        </div>

        <CharacterProfessionHub
          activeCharacter={hubChar}
          onCharacterSelected={() => void refreshAccount()}
        />

        {!signedIn && (
          <p className="text-sm text-amber-200/70">
            Guest browse: catalogs and icons load. Bag, XP, and craft stay empty until Grudge ID.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/crafting", title: "Crafting", sub: "Stations · T0–T8 recipes", icon: Hammer },
            { href: "/arsenal", title: "Arsenal", sub: "Weapons · armor · skills", icon: Sword },
            { href: "/craft/", title: "WCS suite", sub: "Production craft HTML", icon: Package },
            { href: "/heroes", title: "Heroes", sub: roster.length ? `${roster.length} on account` : "Create at Foundry", icon: Leaf },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.href}
                type="button"
                onClick={() => go(card.href)}
                className="text-left rounded-xl border border-amber-800/40 bg-stone-900/70 p-4 hover:border-amber-500/60"
              >
                <Icon className="w-5 h-5 text-amber-400 mb-2" />
                <div className="font-semibold text-stone-100">{card.title}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{card.sub}</div>
              </button>
            );
          })}
        </div>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-200">Account bag</h2>
            {(bagLoading || resLoading) && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
          </div>
          {resourceRows.length === 0 && bagPreview.length === 0 ? (
            <p className="text-xs text-stone-500">No mats yet — harvest on the island or sign in.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {resourceRows.map(([key, n]) => {
                const mat = materials.find((m) => m.name.toLowerCase() === key.toLowerCase() || m.uuid === key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900/80 px-2 py-1"
                  >
                    <ItemIcon src={mat?.iconUrl} category={mat?.category} name={mat?.name || key} />
                    <span className="text-xs text-stone-200">{mat?.name || key}</span>
                    <span className="text-xs text-amber-400">{n}</span>
                  </div>
                );
              })}
              {bagPreview.map((row) => {
                const item = items.find((i) => i.uuid === row.itemId || i.baseUuid === row.itemId);
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900/80 px-2 py-1"
                  >
                    <ItemIcon
                      src={item?.iconUrl}
                      category={item?.category}
                      type={item?.type}
                      name={item?.name || row.itemId}
                    />
                    <span className="text-xs text-stone-200">{item?.name || row.itemId}</span>
                    <span className="text-xs text-amber-400">×{row.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-200">Arsenal · weapons</h2>
            <button type="button" className="text-[11px] text-cyan-400 hover:underline" onClick={() => go("/arsenal")}>
              Open arsenal
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {featuredWeapons.map((item) => (
              <button
                key={item.uuid}
                type="button"
                onClick={() => go("/arsenal")}
                className="rounded-lg border border-stone-700 bg-stone-900/70 p-2 hover:border-amber-600/50"
                title={item.name}
              >
                <ItemIcon src={item.iconUrl} category={item.category} type={item.type} name={item.name} />
                <div className="text-[10px] text-stone-300 truncate mt-1">{item.name}</div>
              </button>
            ))}
            {!osLoading && featuredWeapons.length === 0 && (
              <p className="col-span-full text-xs text-stone-500">Catalog empty — check ObjectStore / info recipes.</p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-200">Crafting · armor + materials</h2>
            <button type="button" className="text-[11px] text-cyan-400 hover:underline" onClick={() => go("/crafting")}>
              Open crafting
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {featuredArmor.map((item) => (
              <button
                key={item.uuid}
                type="button"
                onClick={() => go("/crafting")}
                className="rounded-lg border border-stone-700 bg-stone-900/70 p-2 hover:border-amber-600/50"
                title={item.name}
              >
                <ItemIcon src={item.iconUrl} category={item.category} type={item.type} name={item.name} />
                <div className="text-[10px] text-stone-300 truncate mt-1">{item.name}</div>
              </button>
            ))}
            {featuredMats.map((mat) => (
              <div
                key={mat.uuid}
                className="rounded-lg border border-stone-700 bg-stone-900/70 p-2"
                title={mat.name}
              >
                <ItemIcon src={mat.iconUrl} category={mat.category} name={mat.name} />
                <div className="text-[10px] text-stone-300 truncate mt-1">{mat.name}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            {recipes.length} recipes · mats stay on the account · XP on{" "}
            {hubChar?.name || (charsLoading ? "…" : "the active hero")}.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-200">Back · wings</h2>
            <span className="text-[11px] text-stone-500">WCS accessory slot (cape / cloak / wings)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "outline", label: "Wings", category: "wings" },
              { id: "feathered", label: "Feathered wings", name: "feathered wings" },
            ].map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2"
              >
                <ItemIcon category={w.category} name={w.name} />
                <span className="text-xs text-stone-200">{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 text-[11px] text-white/30">
          <a href="https://ai.grudge-studio.com/puter-space" className="underline hover:text-amber-300">
            Puter Space
          </a>
          <a
            href="https://info.grudge-studio.com/WORLD_MAP.html"
            className="underline hover:text-amber-300 inline-flex items-center gap-0.5"
          >
            Ops map <ExternalLink className="w-3 h-3" />
          </a>
          <button type="button" className="underline hover:text-amber-300" onClick={() => go("/home?legacy=1")}>
            Legacy tiles
          </button>
        </div>
      </div>
    </Layout>
  );
}
