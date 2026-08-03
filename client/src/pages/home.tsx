/**
 * Warlords production home — client.grudge-studio.com/home
 *                          — grudgewarlords.com/home
 *
 * SSOT (docs/HAPPY_PATH.md): /home is NOT a destination hub.
 * Default: resolve next production step and FORWARD the player there.
 *
 * Query overrides:
 *   ?legacy=1  — old multi-tile menu (ops only)
 *   ?ops=1     — info WORLD_MAP zone test frontend
 *   ?stay=1    — stay on hub after resolve (debug)
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LogIn, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, type Character } from "@/lib/characterManager";
import {
  isAuthenticated as hasAuthToken,
  waitForAuthReady,
  ensureFleetSessionClaim,
  getToken,
} from "@/lib/grudgeBackend";
import { useAuth } from "@/contexts/AuthContext";
import {
  isTutorialComplete,
  postCreatePlayPath,
  markOpeningSeen,
} from "@/lib/warlordsOnboarding";
import { fetchPlayReadiness } from "@/lib/playHub";
import { WARLORDS_HOME_ACTIONS, WARLORDS_LOBBY_PATH } from "@shared/fleet";

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

/**
 * Where /home should send the player next — single funnel, no dead tiles.
 */
async function resolveHomeForward(): Promise<{ path: string; reason: RouteReason }> {
  await ensureFleetSessionClaim().catch(() => {});
  await waitForAuthReady(8000);

  if (!getToken() && !hasAuthToken()) {
    return { path: "", reason: "sign_in" };
  }

  const readiness = await fetchPlayReadiness();

  if (!readiness.signedIn && !getToken()) {
    return { path: "", reason: "sign_in" };
  }

  // Ensure roster has an active hero when Railway has one
  let charId = readiness.activeCharacterId;
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

  // First voyage: leviathan → shipwreck tutorial (once per browser/account flag)
  if (!isTutorialComplete()) {
    return {
      path: `/shipwreck-cinema?${idQ}`,
      reason: "tutorial",
    };
  }

  if (!readiness.hasHomeIsland) {
    return {
      path: `/island-reveal?${idQ}`,
      reason: "no_island",
    };
  }

  // Production play: personal home island (not lobby soup, not a menu)
  return {
    path: `/home-island?${idQ}`,
    reason: "play_home_island",
  };
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

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { openLogin, isAuthenticated, handleLogout } = useAuth();
  const [reason, setReason] = useState<RouteReason>("loading");
  const [detail, setDetail] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

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

        if (p.get("stay") === "1") {
          setReason(next.reason);
          setDetail(next.path);
          return;
        }

        setReason("redirecting");
        setDetail(REASON_COPY[next.reason] || next.path);
        // Immediate forward — /home is a bridge, not a lobby
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

  // Legacy menu data (ops only)
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

  // ── Default: bridge UI (not a destination) ─────────────────────
  if (!legacy) {
    return (
      <div className="min-h-screen bg-[#05060c] flex flex-col items-center justify-center text-amber-100/90 gap-4 px-4">
        {reason !== "sign_in" && reason !== "error" && (
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        )}
        {reason === "sign_in" && (
          <LogIn className="w-10 h-10 text-amber-400" />
        )}
        {reason === "error" && (
          <AlertCircle className="w-10 h-10 text-rose-400" />
        )}

        <p className="text-sm tracking-wide text-center max-w-md">
          {REASON_COPY[reason]}
        </p>
        {detail && reason !== "sign_in" && (
          <p className="text-[11px] text-white/35 font-mono text-center break-all max-w-lg">
            {detail}
          </p>
        )}

        {reason === "sign_in" && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              onClick={() => openLogin()}
              className="bg-gradient-to-r from-amber-500 to-amber-700 text-[#1a1408] font-semibold"
            >
              Sign in with Grudge ID
            </Button>
            <Button
              variant="outline"
              className="border-amber-600/40 text-amber-200"
              onClick={() =>
                go(
                  `/create-character?returnTo=${encodeURIComponent(postCreatePlayPath())}`,
                )
              }
            >
              Create hero after sign-in
            </Button>
          </div>
        )}

        {reason === "error" && (
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button
              onClick={() => window.location.reload()}
              className="bg-amber-700 text-white"
            >
              Retry
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white/70"
              onClick={() => go(`/home-island?from=home-retry`)}
            >
              Force home island
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white/70"
              onClick={() => go("/home?legacy=1")}
            >
              Legacy menu
            </Button>
          </div>
        )}

        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-500/40 mt-4">
          /home → production play path
        </p>
        <div className="flex gap-3 text-[11px] text-white/30">
          <button type="button" className="underline hover:text-amber-300" onClick={() => go("/home?legacy=1")}>
            Legacy menu
          </button>
          <a
            href="https://info.grudge-studio.com/WORLD_MAP.html"
            className="underline hover:text-amber-300 inline-flex items-center gap-0.5"
          >
            Ops map <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // ── Legacy multi-tile (explicit ?legacy=1 only) ────────────────
  return (
    <div className="min-h-screen bg-[#05060c] text-[#eef2ff] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-cinzel text-amber-300 text-lg tracking-wide">
              Warlords · legacy hub
            </h1>
            <p className="text-[11px] text-white/40 mt-1">
              Ops only. Default /home auto-forwards into play.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => go("/home")} className="bg-amber-700 text-white text-xs">
              Use play path
            </Button>
            {(isAuthenticated || hasAuthToken()) && (
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
