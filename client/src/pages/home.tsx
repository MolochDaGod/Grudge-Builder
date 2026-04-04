import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword, Shield, Pickaxe, Leaf, Hammer, Gem, LogOut, User,
  ExternalLink, Sparkles, Wallet, Cloud, Code2, Gamepad2,
  ChevronRight, Star, Crown, Zap, Map, Swords, Package,
  Plus, Check, Globe, UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CharacterManager, Character } from "@/lib/characterManager";
import {
  isAuthenticated, getCurrentUser, logout as doLogout,
  verifyToken, type GrudgeUser,
} from "@/lib/grudgeBackend";

const LIVE_GAMES = [
  {
    id: "client", title: "Game Client", subtitle: "3D Open World",
    description: "Enter the full 3D Grudge Warlords world. Explore islands, fight, sail, and play with your crew.",
    url: "https://play.grudge-studio.com", external: true,
    icon: "globe", color: "from-amber-950/90 via-yellow-900/70 to-amber-800/40",
    border: "border-amber-500/50 hover:border-amber-400/70", badge: "Featured",
    badgeColor: "bg-amber-600/90 text-amber-100",
  },
  {
    id: "grudawars", title: "GrudaWars", subtitle: "PvP Arena",
    description: "Real-time multiplayer combat. Battle players worldwide with your character.",
    url: "https://pvp.grudge-studio.com", external: true,
    icon: "swords", color: "from-red-950/90 via-red-900/70 to-red-800/40",
    border: "border-red-700/40 hover:border-red-500/60", badge: "PvP",
    badgeColor: "bg-red-700/80 text-red-200",
  },
  {
    id: "dungeon", title: "Dungeon Crawler", subtitle: "Roguelike",
    description: "Descend into procedurally generated dungeons. Loot, fight, survive.",
    url: "/dungeon", external: false,
    icon: "pickaxe", color: "from-purple-950/90 via-purple-900/70 to-purple-800/40",
    border: "border-purple-700/40 hover:border-purple-500/60", badge: "Solo",
    badgeColor: "bg-purple-700/80 text-purple-200",
  },
  {
    id: "island", title: "Island Builder", subtitle: "Base Building",
    description: "Claim your island, build your base, establish your faction.",
    url: "/island", external: false,
    icon: "leaf", color: "from-emerald-950/90 via-emerald-900/70 to-emerald-800/40",
    border: "border-emerald-700/40 hover:border-emerald-500/60", badge: "Strategy",
    badgeColor: "bg-emerald-700/80 text-emerald-200",
  },
  {
    id: "combat", title: "Combat Arena", subtitle: "Action",
    description: "Master combat with skills, parries, and perfect timing.",
    url: "/combat", external: false,
    icon: "sword", color: "from-amber-950/90 via-amber-900/70 to-amber-800/40",
    border: "border-amber-700/40 hover:border-amber-500/60", badge: "Action",
    badgeColor: "bg-amber-700/80 text-amber-200",
  },
  {
    id: "grudgedev", title: "GrudgeDev", subtitle: "Game Editor",
    description: "Build and launch Grudge games. Editor, asset manager, and services hub.",
    url: "/launcher", external: false,
    icon: "code", color: "from-blue-950/90 via-blue-900/70 to-blue-800/40",
    border: "border-blue-700/40 hover:border-blue-500/60", badge: "Editor",
    badgeColor: "bg-blue-700/80 text-blue-200",
  },
  {
    id: "tower-wars", title: "Tower Wars", subtitle: "PvP Tower Defense",
    description: "WC3-style tower defense. Build towers, send units, outmaneuver your opponent.",
    url: "/tower-wars", external: false,
    icon: "sword", color: "from-yellow-950/90 via-yellow-900/70 to-orange-800/40",
    border: "border-yellow-700/40 hover:border-yellow-500/60", badge: "PvP",
    badgeColor: "bg-yellow-700/80 text-yellow-200",
  },
  {
    id: "harvest", title: "Harvesting", subtitle: "Professions",
    description: "Mine, forage, cook, engineer, and master mysticism. Gather resources and craft.",
    url: "/harvest", external: false,
    icon: "pickaxe", color: "from-green-950/90 via-green-900/70 to-green-800/40",
    border: "border-green-700/40 hover:border-green-500/60", badge: "Gather",
    badgeColor: "bg-green-700/80 text-green-200",
  },
  {
    id: "worldmap", title: "World Map", subtitle: "Exploration",
    description: "Navigate the Grudge universe. Discover zones, factions, secrets.",
    url: "/world-map", external: false,
    icon: "map", color: "from-teal-950/90 via-teal-900/70 to-teal-800/40",
    border: "border-teal-700/40 hover:border-teal-500/60", badge: "Explore",
    badgeColor: "bg-teal-700/80 text-teal-200",
  },
];

const SERVICES = [
  { id: "account", label: "My Account", desc: "Profile, stats & settings", url: "https://account.grudge-studio.com", color: "text-amber-400" },
  { id: "engine", label: "Grudge Engine", desc: "3D world editor (BabylonJS 9)", url: "https://engine.grudge-studio.com", color: "text-blue-400" },
  { id: "grudgedev", label: "GrudgeDev", desc: "Game editor & launcher", url: "/launcher", color: "text-green-400" },
  { id: "wallet", label: "Wallet & NFTs", desc: "Gold, GBUX & NFTs", url: "/wallet", color: "text-amber-400" },
];

const GAME_ICONS: Record<string, React.ReactNode> = {
  globe: <Globe className="w-6 h-6" />,
  swords: <Swords className="w-6 h-6" />,
  pickaxe: <Pickaxe className="w-6 h-6" />,
  leaf: <Leaf className="w-6 h-6" />,
  sword: <Sword className="w-6 h-6" />,
  code: <Code2 className="w-6 h-6" />,
  map: <Map className="w-6 h-6" />,
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<GrudgeUser | null>(getCurrentUser());

  useEffect(() => {
    if (!isAuthenticated()) { setLocation("/"); return; }
    verifyToken().then((r) => { if (!r.valid) { doLogout(); setLocation("/"); } else { setUser(getCurrentUser()); } });
    CharacterManager.getAll().then((c) => { setCharacters(c); CharacterManager.getActiveCharacter().then(setActiveCharacter); }).catch(() => {});
  }, [setLocation]);

  const nav = (url: string, ext: boolean) => ext ? window.open(url, "_blank", "noopener") : setLocation(url);
  const displayName = user?.displayName || user?.username || "Warlord";
  const grudgeIdShort = (user?.grudgeId || "").slice(0, 8).toUpperCase();
  const role = (user as any)?.role || "pleb";
  const roleLabel = role === "master" ? "Master" : role === "admin" ? "Admin" : role === "member" ? "Member" : "Pleb";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-50"
        style={{ backgroundImage: `radial-gradient(ellipse at 15% 0%, hsla(45,70%,40%,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, hsla(265,60%,50%,0.07) 0%, transparent 55%)` }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-red-700 flex items-center justify-center shadow">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <span className="font-cinzel font-bold tracking-wider text-sm">
              <span className="text-amber-400">GRUDGE </span>
              <span className="text-white">WARLORDS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {grudgeIdShort && <span className="hidden sm:block text-xs text-muted-foreground font-mono">{grudgeIdShort}</span>}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-red-800 flex items-center justify-center text-xs font-bold text-white border border-amber-700/50">
                {displayName[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium">{displayName}</span>
              <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/30 text-xs hidden sm:flex">{roleLabel}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { doLogout(); setLocation("/"); }} className="text-muted-foreground hover:text-red-400 h-8 w-8 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome + Enter Client CTA */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                Welcome back, {displayName}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {activeCharacter ? `Playing as ${activeCharacter.name} · Level ${activeCharacter.level}` : "Create a character to begin your journey"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white font-cinzel tracking-wider shadow-lg shadow-amber-900/30 border border-amber-500/30"
                onClick={() => window.open("https://play.grudge-studio.com", "_blank", "noopener")}
              >
                <Globe className="w-4 h-4 mr-2" /> Enter Game Client
              </Button>
              {!activeCharacter && (
                <Button variant="outline" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20 font-cinzel" onClick={() => setLocation("/character")}>
                  <Plus className="w-4 h-4 mr-1" /> Create Character
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT: Character + Services */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1 space-y-4">

            {/* Character card */}
            {activeCharacter ? (
              <div className="rounded-xl border border-amber-700/30 bg-gradient-to-b from-amber-950/40 to-slate-950/60 p-5 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600/30 to-red-900/30 border border-amber-700/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-amber-400/70" />
                  </div>
                  <div>
                    <h2 className="font-cinzel font-bold text-amber-300 text-sm leading-tight">{activeCharacter.name}</h2>
                    <p className="text-xs text-muted-foreground capitalize">{activeCharacter.raceId} {activeCharacter.classId}</p>
                    <p className="text-xs text-amber-400/70">Level {activeCharacter.level}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-6">XP</span>
                    <Progress value={(activeCharacter.xp || 0) % 100} className="flex-1 h-1.5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Button className="w-full bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-cinzel text-xs tracking-wider" size="sm" onClick={() => window.open("https://pvp.grudge-studio.com", "_blank", "noopener")}>
                    <Swords className="w-3.5 h-3.5 mr-2" /> Play GrudaWars
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20 text-xs" onClick={() => setLocation("/character")}>
                      <Shield className="w-3 h-3 mr-1" /> Manage
                    </Button>
                    <Button variant="outline" size="sm" className="border-purple-700/40 text-purple-400 hover:bg-purple-900/20 text-xs" onClick={() => setLocation("/wallet")}>
                      <Star className="w-3 h-3 mr-1" /> Mint NFT
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-700/30 bg-gradient-to-b from-amber-950/30 to-slate-950/50 p-6 text-center shadow-xl">
                <Sparkles className="w-10 h-10 text-amber-400/60 mx-auto mb-3" />
                <h3 className="font-cinzel font-bold text-amber-300 text-sm mb-1">No Character</h3>
                <p className="text-xs text-muted-foreground mb-4">Create your hero to play all games and mint as an NFT</p>
                <Button className="w-full bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-cinzel text-xs" onClick={() => setLocation("/character")}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Character
                </Button>
              </div>
            )}

            {/* Services */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <h3 className="font-cinzel text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Services</h3>
              <div className="space-y-0.5">
                {SERVICES.map((svc) => (
                  <button key={svc.id} onClick={() => svc.url.startsWith("http") ? window.open(svc.url, "_blank", "noopener") : setLocation(svc.url)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group text-left">
                    <span className={`${svc.color} text-lg`}>
        {svc.id === "account" ? <UserCircle className="w-4 h-4" /> : svc.id === "engine" ? <Code2 className="w-4 h-4" /> : svc.id === "cloud" ? <Cloud className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-none mb-0.5">{svc.label}</div>
                      <div className="text-xs text-muted-foreground/60">{svc.desc}</div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Account info */}
            <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-xs text-muted-foreground">
              <div className="flex justify-between mb-1">
                <span>Characters</span><span className="text-foreground/70">{characters.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Account</span><span className={role === "master" ? "text-amber-400" : role === "admin" ? "text-blue-400" : role === "member" ? "text-green-400" : "text-muted-foreground"}>{roleLabel}</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Game Library */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-cinzel font-bold text-lg">Game Library</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{LIVE_GAMES.length} live games</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400">All servers online</span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {LIVE_GAMES.map((game, i) => (
                <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 * i }}>
                  <div onClick={() => nav(game.url, game.external)}
                    className={`relative overflow-hidden rounded-xl border ${game.border} bg-gradient-to-br ${game.color} cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-xl p-5 flex flex-col h-full min-h-[156px]`}>
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${game.badgeColor}`}>{game.badge}</span>
                    </div>
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="text-foreground/60 group-hover:text-foreground/90 transition-colors mt-0.5">{GAME_ICONS[game.icon]}</div>
                      <div>
                        <h3 className="font-cinzel font-bold text-sm text-foreground">{game.title}</h3>
                        <p className="text-xs text-muted-foreground">{game.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/55 group-hover:text-foreground/75 flex-1 mb-4 line-clamp-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400/70 flex items-center gap-1"><Check className="w-3 h-3" /> Live</span>
                      <span className="text-xs text-foreground/40 group-hover:text-foreground/70 flex items-center gap-1">
                        {game.external ? <><span>Open</span><ExternalLink className="w-3 h-3" /></> : <><span>Play</span><ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></>}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Progression */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
              <h2 className="font-cinzel font-bold text-base mb-3 flex items-center gap-2 text-foreground/80">
                <Hammer className="w-4 h-4 text-amber-500" /> Character Progression
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Professions", path: "/professions", icon: <Hammer className="w-4 h-4" />, color: "text-orange-400" },
                  { label: "Skill Tree", path: "/skill-tree", icon: <Gem className="w-4 h-4" />, color: "text-blue-400" },
                  { label: "Arsenal", path: "/arsenal", icon: <Package className="w-4 h-4" />, color: "text-red-400" },
                  { label: "Missions", path: "/missions", icon: <Zap className="w-4 h-4" />, color: "text-yellow-400" },
                ].map((item) => (
                  <button key={item.path} onClick={() => setLocation(item.path)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 hover:border-border/60 transition-all group">
                    <span className={`${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
                    <span className="text-sm font-medium text-foreground/75 group-hover:text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
