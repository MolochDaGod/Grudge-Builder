/**
 * Islands Hub — gameplay entry for rts-grudge.vercel.app
 *
 * Connects to Railway (island data) + world.grudge-studio.com (Colyseus),
 * then routes players into home-island, open world, or RTS lobby.
 */
import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentUser } from "@/lib/grudgeBackend";
import {
  fetchCurrentHomeIsland,
  fetchRtsStatus,
  type HomeIslandDto,
} from "@/lib/homeIslandApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home, Swords, Globe, Map, Anchor, Leaf, Wifi, WifiOff,
  Users, ArrowLeft, Play, RefreshCw, ChevronRight, LogIn,
} from "lucide-react";

interface IslandModeEntry {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  path: string;
  icon: ReactNode;
  color: string;
  border: string;
  badge: string;
  badgeColor: string;
  primary?: boolean;
  requiresServer?: boolean;
}

const ISLAND_MODES: IslandModeEntry[] = [
  {
    id: "home-island",
    label: "Home Island",
    subtitle: "3D harvest · build · defend",
    description: "Your persistent island — Colyseus sync, profession XP, evil mountain dungeons.",
    path: "/home-island",
    icon: <Home className="w-5 h-5" />,
    color: "from-amber-900/80 to-amber-800/60",
    border: "border-amber-600/60 hover:border-amber-400",
    badge: "LIVE",
    badgeColor: "bg-amber-600 text-white",
    primary: true,
  },
  {
    id: "play",
    label: "Open World",
    subtitle: "Sector PvP · WorldRoom",
    description: "Join the live world server — explore sectors, fight creatures, build outposts.",
    path: "/play",
    icon: <Globe className="w-5 h-5" />,
    color: "from-emerald-900/80 to-emerald-800/60",
    border: "border-emerald-600/60 hover:border-emerald-400",
    badge: "MMO",
    badgeColor: "bg-emerald-600 text-white",
    requiresServer: true,
  },
  {
    id: "rts-grudge",
    label: "RTS Lobby",
    subtitle: "Faction wars · siege · quick match",
    description: "3D lobby with mode picker — open world, PvP, faction war, siege.",
    path: "/rts-grudge",
    icon: <Swords className="w-5 h-5" />,
    color: "from-red-900/80 to-red-800/60",
    border: "border-red-600/60 hover:border-red-400",
    badge: "RTS",
    badgeColor: "bg-red-600 text-white",
  },
  {
    id: "war-scene",
    label: "Warlord Isle Siege",
    subtitle: "CB-style · walls · zones · hero",
    description:
      "Canonical medieval siege at grudgewarlords.com/war-scene — deploy, catapults, capture zones, grudge6 hero.",
    path: "/war-scene",
    icon: <Swords className="w-5 h-5" />,
    color: "from-amber-950/90 to-orange-900/70",
    border: "border-amber-600/60 hover:border-amber-400",
    badge: "SIEGE",
    badgeColor: "bg-amber-700 text-white",
  },
  {
    id: "island",
    label: "2D Island",
    subtitle: "Auto-harvest · sprite map",
    description: "Classic top-down island with heroes, sheep, and profession gathering.",
    path: "/island",
    icon: <Leaf className="w-5 h-5" />,
    color: "from-green-900/80 to-green-800/60",
    border: "border-green-600/60 hover:border-green-400",
    badge: "2D",
    badgeColor: "bg-green-700 text-white",
  },
  {
    id: "island-v2",
    label: "Adventure Island",
    subtitle: "Shipwreck survival",
    description: "Wave defense and rare resource harvest on a hostile shore.",
    path: "/island-v2",
    icon: <Anchor className="w-5 h-5" />,
    color: "from-rose-900/80 to-rose-800/60",
    border: "border-rose-600/60 hover:border-rose-400",
    badge: "3D",
    badgeColor: "bg-rose-700 text-white",
  },
  {
    id: "world-map",
    label: "World Map",
    subtitle: "Territory grid",
    description: "100×100 zone map — capture sectors and plan naval routes.",
    path: "/world-map",
    icon: <Map className="w-5 h-5" />,
    color: "from-teal-900/80 to-teal-800/60",
    border: "border-teal-600/60 hover:border-teal-400",
    badge: "MAP",
    badgeColor: "bg-teal-700 text-white",
  },
];

const RACE_EMOJI: Record<string, string> = {
  human: "🧝", orc: "👹", elf: "🌿", dwarf: "⚒️",
  barbarian: "🪓", undead: "💀", worge: "🐺",
};

export default function IslandsPage() {
  const [, setLocation] = useLocation();
  const { account } = useAccount();
  const { isAuthenticated, openLogin } = useAuth();

  const [character, setCharacter] = useState<Character | null>(null);
  const [homeIsland, setHomeIsland] = useState<HomeIslandDto | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      try {
        const chars = await CharacterManager.getAll();
        const active = await CharacterManager.getActiveCharacter();
        setCharacter(active || chars[0] || null);

        if (isAuthenticated) {
          try {
            const island = await fetchCurrentHomeIsland();
            setHomeIsland(island);
            setApiOnline(true);
          } catch {
            setApiOnline(false);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [isAuthenticated]);

  useEffect(() => {
    const poll = async () => {
      const status = await fetchRtsStatus();
      setServerOnline(status.online);
      setPlayerCount(status.playerCount);
    };
    poll();
    const iv = setInterval(poll, 30_000);
    return () => clearInterval(iv);
  }, []);

  const enterMode = (path: string, requiresServer?: boolean) => {
    if (!character) {
      setLocation("/create-character");
      return;
    }
    if (requiresServer && serverOnline === false) {
      return;
    }
    setLocation(path);
  };

  const user = getCurrentUser();
  const isRtsDomain = typeof window !== "undefined" &&
    window.location.hostname === "rts-grudge.vercel.app";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950/50 to-black">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16, 185, 129, 0.35), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-2/5 opacity-25"
          style={{
            background: "linear-gradient(to top, rgba(4, 120, 87, 0.55), transparent)",
          }}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.7) 100%), " +
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 45%)",
        }}
      />

      {!isRtsDomain && (
        <button
          onClick={() => setLocation("/home")}
          className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white/70 hover:text-white transition-all text-sm pointer-events-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Command Hub
        </button>
      )}

      {/* Server + API status */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs">
          {serverOnline === null ? (
            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
          ) : serverOnline ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span className={serverOnline ? "text-emerald-300" : "text-red-300"}>
            World {serverOnline === null ? "…" : serverOnline ? "Online" : "Offline"}
          </span>
          {playerCount !== null && serverOnline && (
            <>
              <span className="text-white/30">·</span>
              <Users className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-300">{playerCount}</span>
            </>
          )}
        </div>
        {apiOnline !== null && (
          <div className="px-3 py-1 rounded-lg bg-black/40 border border-white/5 text-[10px] text-white/50">
            Island API {apiOnline ? "connected" : "guest / offline"}
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-8 px-4 pointer-events-none">
        <div className="w-full max-w-5xl pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1
              className="text-4xl md:text-5xl font-cinzel font-black tracking-widest text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(180deg, #6ee7b7 0%, #10b981 50%, #047857 100%)",
              }}
            >
              GRUDGE ISLANDS
            </h1>
            <p className="text-emerald-400/60 text-xs tracking-[0.25em] uppercase mt-1 font-cinzel">
              {isRtsDomain ? "rts-grudge.vercel.app" : "Fleet"} · Server-linked gameplay
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {ISLAND_MODES.map((mode) => {
                const blocked = mode.requiresServer && serverOnline === false;
                return (
                  <button
                    key={mode.id}
                    disabled={blocked}
                    onClick={() => enterMode(mode.path, mode.requiresServer)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r ${mode.color} ${mode.border} transition-all ${blocked ? "opacity-40 cursor-not-allowed" : "opacity-90 hover:opacity-100 hover:scale-[1.01]"} ${mode.primary ? "ring-1 ring-amber-500/30" : ""}`}
                  >
                    <span className="text-white/80">{mode.icon}</span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-cinzel font-bold text-sm text-white">{mode.label}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 ${mode.badgeColor}`}>{mode.badge}</Badge>
                      </div>
                      <p className="text-xs text-white/50 truncate">{mode.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              {!isAuthenticated ? (
                <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm p-4 text-center">
                  <p className="text-sm text-white/60 mb-3">Sign in to load your island from the server</p>
                  <Button onClick={() => openLogin()} className="w-full gap-2">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </div>
              ) : loading ? (
                <div className="rounded-xl border border-white/10 bg-black/60 p-4 text-center text-white/40 text-sm">
                  Loading hero…
                </div>
              ) : character ? (
                <div className="rounded-xl border border-amber-600/30 bg-black/60 backdrop-blur-sm p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-cinzel">Active Hero</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-700 to-red-900 flex items-center justify-center text-lg ring-2 ring-amber-600/40">
                      {RACE_EMOJI[character.raceId] || "🧝"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-cinzel font-bold text-amber-200 text-sm truncate">{character.name}</div>
                      <div className="text-xs text-white/50">Lv {character.level} · {character.classId}</div>
                    </div>
                  </div>
                  {homeIsland && (
                    <p className="text-xs text-emerald-400/80 mb-3 truncate">
                      🏝 {homeIsland.name}
                    </p>
                  )}
                  <Button
                    className="w-full gap-2 bg-amber-700 hover:bg-amber-600"
                    onClick={() => enterMode("/home-island")}
                  >
                    <Play className="w-4 h-4" />
                    Enter Home Island
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setLocation("/create-character")} className="w-full">
                  Create Hero
                </Button>
              )}

              {user && (
                <p className="text-[10px] text-center text-white/30">
                  {user.username || account?.displayName || "Warlord"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}