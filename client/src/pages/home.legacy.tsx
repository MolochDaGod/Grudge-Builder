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
import { RACES } from "@/lib/gameData";
import { assetUrl } from "@/lib/assetConfig";
import { GRUDGEDOT_LAUNCHER_URL, isGrudgedotLauncherLive } from "@/lib/grudgeConfig";

const LIVE_GAMES = [
  {
    id: "island", title: "Island Builder", subtitle: "Auto-Harvest & Build",
    description: "Your home island. Heroes auto-harvest resources, build structures, craft gear. AI-generated unique map.",
    url: "/island", external: false,
    icon: "leaf", color: "from-emerald-950/90 via-emerald-900/70 to-emerald-800/40",
    border: "border-emerald-500/50 hover:border-emerald-400/70", badge: "Core",
    badgeColor: "bg-emerald-600/90 text-emerald-100",
  },
  {
    id: "character", title: "Character Builder", subtitle: "Heroes & cNFTs",
    description: "Create heroes, allocate attributes, equip gear, mint as cNFTs on Solana.",
    url: "/character", external: false,
    icon: "sword", color: "from-amber-950/90 via-yellow-900/70 to-amber-800/40",
    border: "border-amber-500/50 hover:border-amber-400/70", badge: "Core",
    badgeColor: "bg-amber-600/90 text-amber-100",
  },
  {
    id: "combat", title: "Combat Arena", subtitle: "RPG Battle",
    description: "Turn-based combat with class skills, abilities, and party tactics.",
    url: "/combat", external: false,
    icon: "swords", color: "from-red-950/90 via-red-900/70 to-red-800/40",
    border: "border-red-700/40 hover:border-red-500/60", badge: "Battle",
    badgeColor: "bg-red-700/80 text-red-200",
  },
  {
    id: "dungeon", title: "Dungeon Crawler", subtitle: "Roguelike",
    description: "Procedural dungeons with enemies, loot, and boss fights. Clear for character tokens.",
    url: "/dungeon", external: false,
    icon: "pickaxe", color: "from-purple-950/90 via-purple-900/70 to-purple-800/40",
    border: "border-purple-700/40 hover:border-purple-500/60", badge: "Solo",
    badgeColor: "bg-purple-700/80 text-purple-200",
  },
  {
    id: "professions", title: "Professions", subtitle: "Gathering & Crafting",
    description: "6 gathering + 5 crafting professions. Level 1-100 with tier unlocks and rare drops.",
    url: "/professions", external: false,
    icon: "pickaxe", color: "from-green-950/90 via-green-900/70 to-green-800/40",
    border: "border-green-700/40 hover:border-green-500/60", badge: "Craft",
    badgeColor: "bg-green-700/80 text-green-200",
  },
  {
    id: "worldmap", title: "World Map", subtitle: "Explore & Capture",
    description: "100\u00d7100 zone grid. Your 3\u00d73 player block with home island + 8 capturable zones. Weekly rotation.",
    url: "/world-map", external: false,
    icon: "map", color: "from-teal-950/90 via-teal-900/70 to-teal-800/40",
    border: "border-teal-700/40 hover:border-teal-500/60", badge: "Explore",
    badgeColor: "bg-teal-700/80 text-teal-200",
  },
  {
    id: "tower-wars", title: "Tower Defense", subtitle: "Island Defense",
    description: "Build beam & catapult towers on capturable islands. Defend against PvE waves.",
    url: "/tower-wars", external: false,
    icon: "sword", color: "from-yellow-950/90 via-yellow-900/70 to-orange-800/40",
    border: "border-yellow-700/40 hover:border-yellow-500/60", badge: "Defense",
    badgeColor: "bg-yellow-700/80 text-yellow-200",
  },
  {
    id: "crafting", title: "Crafting", subtitle: "Forge & Brew",
    description: "5 crafting stations, T1-T8 recipes. Smelt ingots, cut planks, weave cloth, cook food, build gadgets.",
    url: "/crafting", external: false,
    icon: "hammer", color: "from-orange-950/90 via-orange-900/70 to-amber-800/40",
    border: "border-orange-500/50 hover:border-orange-400/70", badge: "Core",
    badgeColor: "bg-orange-600/90 text-orange-100",
  },
  {
    id: "skills", title: "Skill Trees", subtitle: "Class Abilities",
    description: "Class-specific skill trees. Choose 1 skill per tier as you level up. Permanent choices.",
    url: "/skills", external: false,
    icon: "code", color: "from-blue-950/90 via-blue-900/70 to-blue-800/40",
    border: "border-blue-700/40 hover:border-blue-500/60", badge: "Skills",
    badgeColor: "bg-blue-700/80 text-blue-200",
  },
  {
    id: "client", title: "Game Client", subtitle: "3D Open World",
    description: "Enter the full 3D Grudge Warlords world. Ships, islands, combat, crews.",
    url: "https://client.grudge-studio.com", external: true,
    icon: "globe", color: "from-slate-950/90 via-slate-800/70 to-slate-700/40",
    border: "border-slate-600/40 hover:border-slate-400/60", badge: "3D",
    badgeColor: "bg-slate-600/80 text-slate-200",
  },
  {
    id: "nexus-admin", title: "Nexus Admin", subtitle: "Admin Panel",
    description: "Manage users, GBUX balances, reward packs, cards, and live game statistics.",
    url: "https://nexus-nemesis.vercel.app", external: true,
    icon: "crown", color: "from-red-950/90 via-rose-900/70 to-red-800/40",
    border: "border-red-700/40 hover:border-red-500/60", badge: "Admin",
    badgeColor: "bg-red-800/90 text-red-100", adminOnly: true,
  },
];

// GrudgeDot launcher — canonical URL is launcher.grudge-studio.com (status: planned).
// The previous hard-coded grudgedot-launcher.vercel.app returned 404; we now read the
// canonical URL from grudgeConfig and disable the tile until the planned host is live.
const GRUDGEDOT_PORTAL = GRUDGEDOT_LAUNCHER_URL;
const GRUDGEDOT_LIVE = isGrudgedotLauncherLive();

const SERVICES = [
  { id: "account", label: "My Account", desc: "Profile, stats & settings", url: "/account", color: "text-amber-400" },
  { id: "wallet", label: "Wallet & NFTs", desc: "Gold, GBUX & cNFTs", url: "/wallet", color: "text-purple-400" },
  GRUDGEDOT_LIVE
    ? { id: "grudgedot", label: "Game Portal", desc: "grudgeDot game launcher", url: GRUDGEDOT_PORTAL, color: "text-cyan-400" }
    : { id: "grudgedot", label: "Game Portal", desc: "grudgeDot launcher — coming soon", url: "", color: "text-cyan-400/50", disabled: true as const },
  { id: "arsenal", label: "Arsenal", desc: "Weapons, armor & items", url: "/arsenal", color: "text-green-400" },
  { id: "nexus-admin", label: "Nexus Admin", desc: "Users, GBUX, cards & packs", url: "https://nexus-nemesis.vercel.app", color: "text-red-400", adminOnly: true as const },
];

const GAME_ICONS: Record<string, React.ReactNode> = {
  globe: <Globe className="w-6 h-6" />,
  swords: <Swords className="w-6 h-6" />,
  pickaxe: <Pickaxe className="w-6 h-6" />,
  leaf: <Leaf className="w-6 h-6" />,
  sword: <Sword className="w-6 h-6" />,
  hammer: <Hammer className="w-6 h-6" />,
  code: <Code2 className="w-6 h-6" />,
  map: <Map className="w-6 h-6" />,
  crown: <Crown className="w-6 h-6" />,
};

/** XP needed to reach next level (mirrors CharacterStats formula) */
function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

/** Resolve best portrait URL for a character */
function getCharPortrait(char: Character): string {
  if (char.avatarUrl) return char.avatarUrl;
  const race = RACES.find(r => r.id === char.raceId);
  const portrait = race?.portraits?.[char.classId] || race?.image;
  return portrait || assetUrl(`/images/portraits/${char.raceId}.png`);
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<GrudgeUser | null>(getCurrentUser());
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    if (!isAuthenticated()) { setLocation("/"); return; }
    verifyToken().then((r) => { if (!r.valid) { doLogout(); setLocation("/"); } else { setUser(getCurrentUser()); } });
    CharacterManager.getAll().then((c) => { setCharacters(c); CharacterManager.getActiveCharacter().then(setActiveCharacter); }).catch(() => {});
    // Real server health check
    fetch('/api/health', { signal: AbortSignal.timeout(4000) })
      .then(r => setServerStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setServerStatus('offline'));
  }, [setLocation]);

  // Navigate to internal routes or external games with auth token passthrough
  const nav = (url: string, ext: boolean) => {
    if (!ext) return setLocation(url);
    // Pass Grudge auth token to external games so they can authenticate against the backend
    const token = localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token') || '';
    const grudgeId = user?.grudgeId || '';
    const separator = url.includes('?') ? '&' : '?';
    const authUrl = token ? `${url}${separator}sso_token=${token}&grudge_id=${grudgeId}` : url;
    window.open(authUrl, '_blank', 'noopener');
  };
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
                <Button variant="outline" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20 font-cinzel" onClick={() => setLocation("/create-character")}>
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
                  {/* Character portrait — avatar → race portrait → initial */}
                  <div className="w-12 h-12 rounded-lg border border-amber-700/30 overflow-hidden shrink-0 bg-black/50">
                    <img
                      src={getCharPortrait(activeCharacter)}
                      alt={activeCharacter.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        const parent = el.parentElement!;
                        parent.classList.add('bg-gradient-to-br', 'from-amber-600/30', 'to-red-900/30', 'flex', 'items-center', 'justify-center');
                        parent.innerHTML = `<span class="text-lg font-bold font-cinzel text-amber-300">${activeCharacter.name[0]?.toUpperCase()}</span>`;
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="font-cinzel font-bold text-amber-300 text-sm leading-tight">{activeCharacter.name}</h2>
                    <p className="text-xs text-muted-foreground capitalize">{activeCharacter.raceId} · {activeCharacter.classId}</p>
                    <p className="text-xs text-amber-400/70">Level {activeCharacter.level}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-6">XP</span>
                    <Progress
                      value={Math.min(100, ((activeCharacter.xp || 0) / xpToNextLevel(activeCharacter.level)) * 100)}
                      className="flex-1 h-1.5"
                    />
                    <span className="text-muted-foreground/60 text-[10px] w-12 text-right">
                      {activeCharacter.xp || 0}/{xpToNextLevel(activeCharacter.level)}
                    </span>
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
                <Button className="w-full bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-cinzel text-xs" onClick={() => setLocation("/create-character")}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Character
                </Button>
              </div>
            )}

            {/* Services */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <h3 className="font-cinzel text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Services</h3>
              <div className="space-y-0.5">
                {SERVICES.filter((svc) => {
                  // Hide admin-only services for non-admin users
                  if ((svc as { adminOnly?: boolean }).adminOnly && role !== "master" && role !== "admin") return false;
                  return true;
                }).map((svc) => {
                  const disabled = (svc as { disabled?: boolean }).disabled === true;
                  return (
                    <button
                      key={svc.id}
                      disabled={disabled}
                      onClick={() => { if (!disabled) nav(svc.url, svc.url.startsWith("http")); }}
                      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors group text-left ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"}`}
                    >
                      <span className={`${svc.color} text-lg`}>
          {svc.id === "account" ? <UserCircle className="w-4 h-4" /> : svc.id === "engine" ? <Code2 className="w-4 h-4" /> : svc.id === "cloud" ? <Cloud className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-none mb-0.5">{svc.label}</div>
                        <div className="text-xs text-muted-foreground/60">{svc.desc}</div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                    </button>
                  );
                })}
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
                <span className={`w-1.5 h-1.5 rounded-full ${
                  serverStatus === 'online'   ? 'bg-emerald-500 animate-pulse' :
                  serverStatus === 'offline'  ? 'bg-red-500' :
                  'bg-yellow-500 animate-pulse'
                }`} />
                <span className={`text-xs ${
                  serverStatus === 'online'  ? 'text-emerald-400' :
                  serverStatus === 'offline' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {serverStatus === 'online' ? 'Servers online' : serverStatus === 'offline' ? 'Server offline' : 'Checking...'}
                </span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {LIVE_GAMES.filter((g) => !(g as { adminOnly?: boolean }).adminOnly || role === "master" || role === "admin").map((game, i) => (
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
