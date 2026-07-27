/**
 * Warlords production home — client.grudge-studio.com/home
 *
 * ONLY these destinations (Warlords era):
 *  1. Characters
 *  2. 2D gameplay
 *  3. Home island
 *  4. Start tutorial
 *  5. Enter lobby scene (center tile of era 9)
 *  6. 9 sector map (overview; sail from lobby edge in play)
 *
 * Character roster loads from Railway via CharacterManager after auth is ready.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Leaf,
  Globe,
  Flame,
  Anchor,
  Map,
  Plus,
  LogOut,
  Crown,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import {
  getCurrentUser,
  isAuthenticated as hasAuthToken,
  waitForAuthReady,
} from "@/lib/grudgeBackend";
import { useAuth } from "@/contexts/AuthContext";
import {
  WARLORDS_HOME_ACTIONS,
  WARLORDS_LOBBY_PATH,
  THREE_HOME_ISLAND_PATH,
  THREE_WORLD_MAP_PATH,
} from "@shared/fleet";
import { CLASS_HERO_IMAGES } from "@/lib/artAssets";

const FONTS = {
  title: "'Cinzel', serif",
  ui: "'Inter', sans-serif",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  user: <User className="w-5 h-5" />,
  leaf: <Leaf className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  flame: <Flame className="w-5 h-5" />,
  anchor: <Anchor className="w-5 h-5" />,
  map: <Map className="w-5 h-5" />,
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loadingChars, setLoadingChars] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { account } = useAccount();
  const { isAuthenticated, openLogin, handleLogout: authLogout } = useAuth();

  const refreshUser = useCallback(() => {
    const saved =
      localStorage.getItem("grudge_user") || localStorage.getItem("grudge-session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser({
          username:
            parsed.username || parsed.displayName || parsed.puterUsername || "Warlord",
        });
        return;
      } catch {
        /* fall through */
      }
    }
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser({ username: currentUser.username || currentUser.displayName || "Warlord" });
    }
  }, []);

  const loadCharacters = useCallback(async () => {
    setLoadingChars(true);
    setLoadError(null);
    try {
      // Wait for JWT / SSO bridge so Railway /api/characters is authorized
      await waitForAuthReady(8000);
      if (!hasAuthToken() && !isAuthenticated) {
        setCharacters([]);
        setActiveCharacter(null);
        setLoadError(null);
        return;
      }
      const list = await CharacterManager.getAll("warlords");
      setCharacters(list);
      if (list.length === 0) {
        setActiveCharacter(null);
      } else {
        let active = await CharacterManager.getActiveCharacter();
        if (!active) {
          CharacterManager.setActive(list[0].id);
          active = list[0];
        }
        setActiveCharacter(active);
      }
    } catch (e) {
      console.error("[home] character load failed", e);
      setLoadError(e instanceof Error ? e.message : "Failed to load characters");
      setCharacters([]);
      setActiveCharacter(null);
    } finally {
      setLoadingChars(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUser();
    void loadCharacters();
  }, [refreshUser, loadCharacters, isAuthenticated]);

  // Re-load when auth events fire (SSO bridge / login popup)
  useEffect(() => {
    const onAuth = () => {
      refreshUser();
      void loadCharacters();
    };
    window.addEventListener("grudge:auth:ready", onAuth);
    window.addEventListener("grudge:auth:success", onAuth);
    return () => {
      window.removeEventListener("grudge:auth:ready", onAuth);
      window.removeEventListener("grudge:auth:success", onAuth);
    };
  }, [refreshUser, loadCharacters]);

  const handleLogout = () => {
    authLogout();
    setLocation("/");
  };

  const selectCharacter = (c: Character) => {
    CharacterManager.setActive(c.id);
    setActiveCharacter(c);
  };

  const go = (url: string) => {
    if (url.startsWith("http")) {
      window.location.href = url;
      return;
    }
    setLocation(url);
  };

  const displayName = user?.username || account?.username || "Warlord";

  return (
    <div
      className="min-h-screen text-[#eef2ff]"
      style={{ background: "#05060c", fontFamily: FONTS.ui }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1000px 600px at 50% 100%, rgba(40,30,10,.5), transparent 55%), linear-gradient(180deg,#0a0c14,#05060c)",
          }}
        />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/[.06]"
        style={{ background: "rgba(5,6,12,.9)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/grudge-logo.png"
              alt=""
              className="w-8 h-8 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <div
                style={{ fontFamily: FONTS.title }}
                className="font-bold tracking-[2px] text-sm text-amber-300"
              >
                GRUDGE WARLORDS
              </div>
              <div className="text-[10px] text-white/35">Production hub · Warlords era only</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-800 flex items-center justify-center text-[11px] font-bold text-[#05060c]">
              {displayName[0]?.toUpperCase() || "W"}
            </div>
            <span className="hidden sm:block text-xs text-white/70 max-w-[140px] truncate">
              {displayName}
            </span>
            {isAuthenticated || hasAuthToken() ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/account")}
                  className="text-white/40 hover:text-amber-400 h-8 w-8 p-0"
                  title="Account"
                >
                  <Crown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white/40 hover:text-white/70 h-8 w-8 p-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={openLogin}
                className="font-cinzel text-[11px] px-4 h-8"
                style={{
                  background: "linear-gradient(180deg, #f6c945, #d8a819)",
                  color: "#20180a",
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── Characters ── */}
        <section
          className="rounded-2xl border border-white/[.08] overflow-hidden"
          style={{
            background: "linear-gradient(180deg,rgba(14,18,32,.9),rgba(8,10,20,.95))",
          }}
        >
          <div className="px-4 py-3 border-b border-white/[.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h2
                style={{ fontFamily: FONTS.title }}
                className="text-sm font-bold tracking-wider text-white"
              >
                Characters
              </h2>
              {!loadingChars && (
                <span className="text-[10px] text-white/35 font-mono">
                  {characters.length} hero{characters.length === 1 ? "" : "es"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void loadCharacters()}
                className="text-white/40 hover:text-white h-8 text-[11px]"
                disabled={loadingChars}
              >
                {loadingChars ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/character")}
                className="h-8 text-[11px] bg-amber-600/20 border border-amber-600/40 text-amber-200 hover:bg-amber-600/30"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Manage
              </Button>
            </div>
          </div>

          <div className="p-4">
            {loadingChars && (
              <div className="flex items-center gap-2 text-white/40 text-sm py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                Loading roster from account…
              </div>
            )}

            {!loadingChars && loadError && (
              <div className="flex items-start gap-2 text-rose-300/90 text-xs bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">Could not load characters</div>
                  <div className="text-rose-200/60">{loadError}</div>
                  <button
                    type="button"
                    className="mt-2 text-amber-300 underline"
                    onClick={() => void loadCharacters()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!loadingChars && !loadError && characters.length === 0 && (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-3">
                  <User className="w-7 h-7 text-white/20" />
                </div>
                <p style={{ fontFamily: FONTS.title }} className="text-sm text-white/50 mb-1">
                  No Warlords heroes yet
                </p>
                <p className="text-[11px] text-white/30 mb-4 max-w-sm mx-auto">
                  {isAuthenticated || hasAuthToken()
                    ? "Create a hero to unlock lobby, home island, and the 9-sector map."
                    : "Sign in with Grudge ID to load your account characters."}
                </p>
                {isAuthenticated || hasAuthToken() ? (
                  <Button
                    onClick={() => setLocation("/character")}
                    className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Create hero
                  </Button>
                ) : (
                  <Button
                    onClick={openLogin}
                    className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm"
                  >
                    Sign in to load heroes
                  </Button>
                )}
              </div>
            )}

            {!loadingChars && characters.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {characters.map((c) => {
                  const active = activeCharacter?.id === c.id;
                  const portrait =
                    CLASS_HERO_IMAGES[c.classId as keyof typeof CLASS_HERO_IMAGES] ||
                    CLASS_HERO_IMAGES.warrior;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCharacter(c)}
                      className="text-left rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5"
                      style={{
                        borderColor: active
                          ? "rgba(246,201,69,.55)"
                          : "rgba(255,255,255,.06)",
                        background: active
                          ? "linear-gradient(135deg,rgba(246,201,69,.12),rgba(14,18,32,.9))"
                          : "rgba(10,12,22,.8)",
                        boxShadow: active
                          ? "0 0 0 1px rgba(246,201,69,.2), 0 8px 24px -12px rgba(246,201,69,.4)"
                          : undefined,
                      }}
                    >
                      <div className="relative h-24 overflow-hidden">
                        <img
                          src={c.avatarUrl || portrait}
                          alt=""
                          className="w-full h-full object-cover object-top brightness-[.7]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = portrait;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080a14] to-transparent" />
                        {active && (
                          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/90 text-[#1a1408] px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <div
                          style={{ fontFamily: FONTS.title }}
                          className="text-sm font-bold text-white truncate"
                        >
                          {c.name}
                        </div>
                        <div className="text-[10px] text-white/40 capitalize mt-0.5">
                          Lv {c.level} · {c.raceId} {c.classId}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Production destinations (Warlords only) ── */}
        <section>
          <h2
            style={{ fontFamily: FONTS.title }}
            className="text-[11px] font-bold tracking-wider text-white/50 mb-3 flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            Warlords play · production only
          </h2>
          <p className="text-[11px] text-white/30 mb-4 max-w-2xl leading-relaxed">
            The pirate <strong className="text-white/50">lobby</strong> is the{" "}
            <strong className="text-white/50">middle square</strong> of the 9-sector era map.
            Sail to the edge of the lobby scene to enter a neighboring sector. Use the sector map
            for overview; entry in production is from the lobby.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WARLORDS_HOME_ACTIONS.map((action, i) => {
              const needsHero =
                action.id !== "tutorial" &&
                action.id !== "characters" &&
                characters.length === 0;
              return (
                <motion.button
                  key={action.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  onClick={() => {
                    if (needsHero && action.id !== "characters") {
                      setLocation("/character");
                      return;
                    }
                    go(action.url);
                  }}
                  className="text-left rounded-2xl border border-white/[.07] p-4 hover:border-amber-500/35 transition-all hover:-translate-y-0.5 group"
                  style={{
                    background:
                      "linear-gradient(160deg,rgba(18,22,38,.95),rgba(8,10,18,.98))",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-300/80 group-hover:text-amber-200 shrink-0"
                      style={{
                        background: "rgba(246,201,69,.08)",
                        border: "1px solid rgba(246,201,69,.2)",
                      }}
                    >
                      {ACTION_ICONS[action.icon] || <Globe className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        style={{ fontFamily: FONTS.title }}
                        className="text-sm font-bold text-white tracking-wide group-hover:text-amber-100"
                      >
                        {action.title}
                      </div>
                      <div className="text-[10px] text-cyan-400/70 mt-0.5">{action.subtitle}</div>
                      <p className="text-[11px] text-white/40 mt-2 leading-relaxed line-clamp-3">
                        {action.description}
                      </p>
                      {needsHero && (
                        <div className="text-[9px] text-amber-500/70 mt-2">
                          Create a hero first
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400/80 shrink-0 mt-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Quick strip for active hero */}
        {activeCharacter && (
          <div className="flex flex-wrap gap-2 justify-center pb-6">
            <Button
              size="sm"
              onClick={() => go(WARLORDS_LOBBY_PATH)}
              className="bg-gradient-to-r from-amber-600 to-amber-700 text-[#1a1408] font-cinzel text-xs"
            >
              Enter lobby as {activeCharacter.name}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => go(THREE_HOME_ISLAND_PATH)}
              className="border-white/15 text-white/70 text-xs"
            >
              Home island
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => go(THREE_WORLD_MAP_PATH)}
              className="border-white/15 text-white/70 text-xs"
            >
              9 sector map
            </Button>
          </div>
        )}

        <div className="text-center pb-8">
          <p
            style={{ fontFamily: FONTS.title }}
            className="text-[8px] text-white/15 tracking-[3px]"
          >
            WARLORDS ERA · LOBBY = CENTER TILE
          </p>
        </div>
      </main>
    </div>
  );
}
