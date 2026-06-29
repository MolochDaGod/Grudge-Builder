/**
 * RTS GRUDGE — 3D Game Entrance
 *
 * Full-screen 3D lobby scene (Island3DRenderer in lobby mode) with a
 * semi-transparent game lobby overlay: active character, game mode picker,
 * and server status.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Island3DRenderer } from "@/island3d/render/Island3DRenderer";
import { WORLD_SERVER_URL } from "@/island3d/sync/MultiplayerSync";
import { getDefaultPublicLobbyMapId } from "@/island3d/engine/lobbyMapRuntime";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { useAdmin } from "@/contexts/AdminContext";
import { getCurrentUser, authHeaders } from "@/lib/grudgeBackend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Shield, Users, Crown, Zap, ArrowLeft,
  Wifi, WifiOff, Globe, Lock, Play, RefreshCw,
  ChevronRight, Star, Map,
} from "lucide-react";
import WorldMap3D from "@/components/WorldMap3D";
import { buildOceanDeployUrl } from "@/lib/oceanNavigation";

// ── Game mode definitions ────────────────────────────────────────────────────
const GAME_MODES = [
  {
    id: "open-world",
    label: "Open World",
    subtitle: "Explore & conquer the Grudge seas",
    icon: <Globe className="w-5 h-5" />,
    color: "from-emerald-900/80 to-emerald-800/60",
    border: "border-emerald-600/60 hover:border-emerald-400",
    badge: "LIVE",
    badgeColor: "bg-emerald-600 text-white",
    islandId: "grudge-open-world",
  },
  {
    id: "quick-match",
    label: "Quick Match",
    subtitle: "3v3 PvP — auto-balanced teams",
    icon: <Swords className="w-5 h-5" />,
    color: "from-red-900/80 to-red-800/60",
    border: "border-red-600/60 hover:border-red-400",
    badge: "PVP",
    badgeColor: "bg-red-600 text-white",
    islandId: "quick-match",
  },
  {
    id: "faction-war",
    label: "Faction War",
    subtitle: "Crusade vs Legion vs Fabled",
    icon: <Crown className="w-5 h-5" />,
    color: "from-amber-900/80 to-amber-800/60",
    border: "border-amber-600/60 hover:border-amber-400",
    badge: "WAR",
    badgeColor: "bg-amber-600 text-white",
    islandId: "faction-war",
  },
  {
    id: "siege",
    label: "Siege Mode",
    subtitle: "Defend or assault the fortress",
    icon: <Shield className="w-5 h-5" />,
    color: "from-blue-900/80 to-blue-800/60",
    border: "border-blue-600/60 hover:border-blue-400",
    badge: "CO-OP",
    badgeColor: "bg-blue-600 text-white",
    islandId: "siege",
  },
];

// ── Race / class display helpers ─────────────────────────────────────────────
const RACE_EMOJI: Record<string, string> = {
  human: "🧝", orc: "👹", elf: "🌿", dwarf: "⚒️",
  barbarian: "🪓", undead: "💀", worge: "🐺",
};
const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️", mage: "🔮", ranger: "🏹", shapeshifter: "🐺",
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RtsGrudgePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { account } = useAccount();
  const { isAdmin } = useAdmin();

  const [character, setCharacter] = useState<Character | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("open-world");
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [showForgeMap, setShowForgeMap] = useState(false);


  // Load characters from backend
  useEffect(() => {
    CharacterManager.getAll().then((chars) => {
      setCharacters(chars);
      CharacterManager.getActiveCharacter().then((active) => {
        setCharacter(active || chars[0] || null);
      });
    });
  }, []);

  // Check server status — fetch live telemetry from the island-server HTTP status endpoint
  // Convert wss:// → https:// (or ws:// → http://) so fetch() works against the HTTP health endpoint
  const pvpHttpUrl = WORLD_SERVER_URL
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${pvpHttpUrl}/status`);
        if (res.ok) {
          const data = await res.json();
          setServerOnline(true);
          setPlayerCount(typeof data.totalPlayers === 'number' ? data.totalPlayers : null);
        } else {
          setServerOnline(false);
          setPlayerCount(null);
        }
      } catch {
        setServerOnline(false);
        setPlayerCount(null);
      }
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, []);

  const handleEnter = () => {
    if (!character) {
      toast({
        title: "No character selected",
        description: "Create or select a hero first.",
        variant: "destructive",
      });
      return;
    }
    setEntering(true);
    // Navigate to island-3d lobby with multiplayer config
    const params = new URLSearchParams({
      mode: 'lobby',
      map: publicLobbyMap,
      island: mode.islandId,
      pvp: WORLD_SERVER_URL,
    });
    setTimeout(() => {
      setLocation(`/island-3d?${params.toString()}`);
    }, 600);
  };

  const mode = GAME_MODES.find((m) => m.id === selectedMode)!;
  const user = getCurrentUser();
  const publicLobbyMap = getDefaultPublicLobbyMapId();

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* ── 3D Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <Island3DRenderer
          seed="grudge-rts-lobby-2026"
          mode="lobby"
          lobbyMapId={publicLobbyMap}
          className="w-full h-full"
        />
      </div>

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%), " +
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%)",
        }}
      />

      {/* ── World Map 3D Overlay (Player) ─────────────────────────── */}
      {showWorldMap && (
        <div className="absolute inset-0 z-40">
          <WorldMap3D
            mode="player"
            onClose={() => setShowWorldMap(false)}
            onSectorSelect={(sectorId) => {
              setShowWorldMap(false);
              setSelectedMode("open-world");
              setLocation(buildOceanDeployUrl(sectorId, 'play'));
            }}
          />
        </div>
      )}

      {/* ── Forge Admin Map Overlay ──────────────────────────────── */}
      {showForgeMap && (
        <div className="absolute inset-0 z-40">
          <WorldMap3D
            mode="admin"
            onClose={() => setShowForgeMap(false)}
            onSectorSelect={(sectorId) => {
              toast({ title: `Forge: ${sectorId}`, description: "Editing sector..." });
            }}
            onTeleport={(sectorId, x, z) => {
              toast({ title: "Teleport", description: `Teleporting to ${sectorId} (${x}, ${z})` });
            }}
          />
        </div>
      )}

      {/* ── Back button ───────────────────────────────────────────────── */}
      <button
        onClick={() => setLocation("/home")}
        className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white/70 hover:text-white hover:bg-black/70 transition-all text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* ── World Map toggle ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowWorldMap(true)}
        className="absolute top-4 left-20 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-amber-600/30 text-amber-400/70 hover:text-amber-300 hover:bg-black/70 transition-all text-sm"
      >
        <Map className="w-4 h-4" />
        Strategic Map
      </button>
      <button
        onClick={() => setLocation('/ocean')}
        className="absolute top-4 left-44 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-cyan-600/30 text-cyan-400/70 hover:text-cyan-300 hover:bg-black/70 transition-all text-sm"
      >
        <Globe className="w-4 h-4" />
        Ocean Sail
      </button>

      {/* ── Forge Admin toggle (admin only) ──────────────────────── */}
      {isAdmin && (
        <button
          onClick={() => setShowForgeMap(true)}
          className="absolute top-4 left-48 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-red-600/30 text-red-400/70 hover:text-red-300 hover:bg-black/70 transition-all text-sm"
        >
          <Shield className="w-4 h-4" />
          Forge
        </button>
      )}

      {/* ── Server status pill ────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs">
        {serverOnline === null ? (
          <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
        ) : serverOnline ? (
          <Wifi className="w-3 h-3 text-emerald-400" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-400" />
        )}
        <span className={serverOnline ? "text-emerald-300" : "text-red-300"}>
          {serverOnline === null ? "Checking..." : serverOnline ? "Server Online" : "Offline"}
        </span>
        {playerCount !== null && serverOnline && (
          <>
            <span className="text-white/30">·</span>
            <Users className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300">{playerCount}</span>
          </>
        )}
      </div>

      {/* ── Main lobby UI ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-8 px-4 pointer-events-none">
        <div className="w-full max-w-4xl pointer-events-auto">

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <h1
              className="text-5xl md:text-6xl font-cinzel font-black tracking-widest text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 40%, #b45309 100%)",
                textShadow: "0 0 60px rgba(251,191,36,0.4)",
              }}
            >
              RTS GRUDGE
            </h1>
            <p className="text-amber-400/60 text-sm tracking-[0.3em] uppercase mt-1 font-cinzel">
              Open World · Faction Wars · Siege
            </p>
          </motion.div>

          {/* Two-column: Game modes + Character panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4"
          >
            {/* Left: Mode picker */}
            <div className="space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-cinzel">Select Mode</p>
              {GAME_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r ${m.color} ${m.border} transition-all duration-150 group ${selectedMode === m.id ? "ring-2 ring-white/20 scale-[1.01]" : "opacity-80 hover:opacity-100"}`}
                >
                  <span className="text-white/70 group-hover:text-white transition-colors">{m.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel font-bold text-sm text-white">{m.label}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 ${m.badgeColor}`}>{m.badge}</Badge>
                    </div>
                    <p className="text-xs text-white/50">{m.subtitle}</p>
                  </div>
                  {selectedMode === m.id && (
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  )}
                </button>
              ))}
            </div>

            {/* Right: Character + Enter */}
            <div className="flex flex-col gap-3">
              <p className="text-xs text-white/40 uppercase tracking-widest font-cinzel">Your Hero</p>

              {/* Character card */}
              <div
                className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all"
                onClick={() => setShowCharSelect(!showCharSelect)}
              >
                {character ? (
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {character.avatarUrl ? (
                        <img
                          src={character.avatarUrl}
                          alt={character.name}
                          className="w-12 h-12 rounded-lg object-cover ring-2 ring-amber-600/50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600 to-red-800 flex items-center justify-center text-xl ring-2 ring-amber-600/50">
                          {RACE_EMOJI[character.raceId] || "🧝"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-cinzel font-bold text-amber-200 text-sm truncate">
                          {character.name}
                        </div>
                        <div className="text-xs text-white/50">
                          {CLASS_EMOJI[character.classId]} {character.classId} · Lv {character.level}
                        </div>
                        <div className="text-xs text-white/30 capitalize">
                          {character.raceId}
                        </div>
                      </div>
                      <RefreshCw className="w-3.5 h-3.5 text-white/30" />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <div className="text-white/30 text-sm mb-2">No character selected</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLocation("/character-creator"); }}
                      className="text-xs text-amber-400 hover:text-amber-300 underline"
                    >
                      Create a hero →
                    </button>
                  </div>
                )}
              </div>

              {/* Character quick-switcher */}
              <AnimatePresence>
                {showCharSelect && characters.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-white/10 bg-black/60 backdrop-blur overflow-hidden"
                  >
                    <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                      {characters.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCharacter(c);
                            CharacterManager.setActive(c.id);
                            setShowCharSelect(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${c.id === character?.id ? "bg-amber-900/40 border border-amber-600/40" : "hover:bg-white/5"}`}
                        >
                          <span className="text-base">{RACE_EMOJI[c.raceId] || "🧝"}</span>
                          <div>
                            <div className="text-xs font-medium text-white">{c.name}</div>
                            <div className="text-[10px] text-white/40">{c.classId} · Lv {c.level}</div>
                          </div>
                          {c.id === character?.id && (
                            <Star className="w-3 h-3 text-amber-400 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account XP */}
              {account && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                  <span className="text-white/40">Warlord</span>
                  <span className="text-amber-300 font-mono">
                    {(account.accountXp || 0).toLocaleString()} XP
                  </span>
                </div>
              )}

              {/* Enter button */}
              <Button
                onClick={handleEnter}
                disabled={!character || entering}
                className="w-full h-12 font-cinzel text-base font-bold tracking-widest relative overflow-hidden group"
                style={{
                  background: entering
                    ? "rgba(120,53,15,0.8)"
                    : "linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)",
                  boxShadow: entering ? "none" : "0 0 30px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {entering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Entering World...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      ENTER BATTLE
                    </>
                  )}
                </span>
                {!entering && (
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                )}
              </Button>

              <p className="text-[10px] text-center text-white/20">
                {mode.label} · {user?.username || "Guest"} · {character?.name || "—"}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
