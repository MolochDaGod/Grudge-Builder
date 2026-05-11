import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Sword, Shield, Pickaxe, Leaf, Hammer, LogOut,
  ChevronRight, Crown, Zap, Map, Swords,
  Plus, Check, Globe, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, Character } from "@/lib/characterManager";

interface SavedAccount {
  username: string;
  level: number;
  gold: number;
}

const LIVE_GAMES = [
  { id: "island", title: "Island Builder", subtitle: "Auto-Harvest & Build", description: "Your home island. Heroes auto-harvest resources, build structures, craft gear.", url: "/island", external: false, icon: "leaf", color: "from-emerald-950/90 via-emerald-900/70 to-emerald-800/40", border: "border-emerald-500/50 hover:border-emerald-400/70", badge: "Core", badgeColor: "bg-emerald-600/90 text-emerald-100" },
  { id: "character", title: "Character Builder", subtitle: "Heroes & Stats", description: "Create heroes, allocate attributes, equip gear, and manage your roster.", url: "/character", external: false, icon: "sword", color: "from-amber-950/90 via-yellow-900/70 to-amber-800/40", border: "border-amber-500/50 hover:border-amber-400/70", badge: "Core", badgeColor: "bg-amber-600/90 text-amber-100" },
  { id: "combat", title: "Combat Arena", subtitle: "RPG Battle", description: "Turn-based combat with class skills, abilities, and party tactics.", url: "/combat", external: false, icon: "swords", color: "from-slate-950/90 via-slate-800/70 to-slate-700/40", border: "border-slate-600/40 hover:border-slate-400/60", badge: "Battle", badgeColor: "bg-slate-600/80 text-slate-200" },
  { id: "dungeon", title: "Dungeon Crawler", subtitle: "Roguelike", description: "Procedural dungeons with enemies, loot, and boss fights.", url: "/dungeon", external: false, icon: "pickaxe", color: "from-zinc-950/90 via-zinc-800/70 to-zinc-700/40", border: "border-zinc-600/40 hover:border-zinc-400/60", badge: "Solo", badgeColor: "bg-zinc-600/80 text-zinc-200" },
  { id: "professions", title: "Professions", subtitle: "Gathering & Crafting", description: "Level 1\u2013100 gathering and crafting professions with tier unlocks.", url: "/professions", external: false, icon: "pickaxe", color: "from-green-950/90 via-green-900/70 to-green-800/40", border: "border-green-700/40 hover:border-green-500/60", badge: "Craft", badgeColor: "bg-green-700/80 text-green-200" },
  { id: "worldmap", title: "World Map", subtitle: "Explore & Capture", description: "100\u00d7100 zone grid with capturable territory and weekly rotation.", url: "/world-map", external: false, icon: "map", color: "from-teal-950/90 via-teal-900/70 to-teal-800/40", border: "border-teal-700/40 hover:border-teal-500/60", badge: "Explore", badgeColor: "bg-teal-700/80 text-teal-200" },
  { id: "skills", title: "Skill Trees", subtitle: "Class Abilities", description: "Class-specific skill trees. Choose 1 skill per tier as you level up.", url: "/skills", external: false, icon: "code", color: "from-blue-950/90 via-blue-900/70 to-blue-800/40", border: "border-blue-700/40 hover:border-blue-500/60", badge: "Skills", badgeColor: "bg-blue-700/80 text-blue-200" },
];

const GAME_ICONS: Record<string, React.ReactNode> = {
  globe: <Globe className="w-6 h-6" />, swords: <Swords className="w-6 h-6" />, pickaxe: <Pickaxe className="w-6 h-6" />,
  leaf: <Leaf className="w-6 h-6" />, sword: <Sword className="w-6 h-6" />, hammer: <Hammer className="w-6 h-6" />,
  code: <Code2 className="w-6 h-6" />, map: <Map className="w-6 h-6" />, crown: <Crown className="w-6 h-6" />,
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<SavedAccount | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("grudge_current_user");
    if (!saved) { setLocation("/"); return; }
    try { setUser(JSON.parse(saved)); } catch { setLocation("/"); return; }
    CharacterManager.getAll()
      .then((c) => { setCharacters(c); CharacterManager.getActiveCharacter().then(setActiveCharacter); })
      .catch(() => {});
  }, [setLocation]);

  const handleLogout = () => { localStorage.removeItem("grudge_current_user"); setLocation("/"); };
  const displayName = user?.username || "Warlord";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none opacity-50" style={{ backgroundImage: "radial-gradient(ellipse at 15% 0%, hsla(45,30%,30%,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, hsla(210,20%,30%,0.05) 0%, transparent 55%)" }} />
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow"><Crown className="w-4 h-4 text-white" /></div>
            <span className="font-cinzel font-bold tracking-wider text-sm"><span className="text-amber-400">GRUDGE </span><span className="text-white">WARLORDS</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-xs font-bold text-white border border-amber-700/50">{displayName[0]?.toUpperCase()}</div>
            <span className="hidden sm:block text-sm font-medium">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-slate-300 h-8 w-8 p-0"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Welcome back, {displayName}</h1>
              <p className="text-muted-foreground text-sm mt-1">{activeCharacter ? `Playing as ${activeCharacter.name} \u00b7 Level ${activeCharacter.level}` : "Create a character to begin your journey"}</p>
            </div>
            {!activeCharacter && <Button variant="outline" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20 font-cinzel" onClick={() => setLocation("/character")}><Plus className="w-4 h-4 mr-1" /> Create Character</Button>}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
          <div><h2 className="font-cinzel font-bold text-lg">Game Library</h2><p className="text-xs text-muted-foreground mt-0.5">{LIVE_GAMES.length} live games</p></div>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {LIVE_GAMES.map((game, i) => (
            <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 * i }}>
              <div onClick={() => game.external ? window.open(game.url, "_blank", "noopener") : setLocation(game.url)}
                className={`relative overflow-hidden rounded-xl border ${game.border} bg-gradient-to-br ${game.color} cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-xl p-5 flex flex-col h-full min-h-[156px]`}>
                <div className="absolute top-3 right-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${game.badgeColor}`}>{game.badge}</span></div>
                <div className="flex items-start gap-3 mb-2.5">
                  <div className="text-foreground/60 group-hover:text-foreground/90 transition-colors mt-0.5">{GAME_ICONS[game.icon]}</div>
                  <div><h3 className="font-cinzel font-bold text-sm text-foreground">{game.title}</h3><p className="text-xs text-muted-foreground">{game.subtitle}</p></div>
                </div>
                <p className="text-xs text-foreground/55 group-hover:text-foreground/75 flex-1 mb-4 line-clamp-2">{game.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400/70 flex items-center gap-1"><Check className="w-3 h-3" /> Live</span>
                  <span className="text-xs text-foreground/40 group-hover:text-foreground/70 flex items-center gap-1"><span>Play</span><ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
          <h2 className="font-cinzel font-bold text-base mb-3 flex items-center gap-2 text-foreground/80"><Hammer className="w-4 h-4 text-amber-500" /> Progression</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{ label: "Professions", path: "/professions", icon: <Hammer className="w-4 h-4" />, color: "text-amber-400" },
              { label: "Skill Tree", path: "/skill-tree", icon: <Zap className="w-4 h-4" />, color: "text-blue-400" },
              { label: "Arsenal", path: "/arsenal", icon: <Shield className="w-4 h-4" />, color: "text-emerald-400" },
              { label: "Missions", path: "/missions", icon: <Swords className="w-4 h-4" />, color: "text-cyan-400" },
            ].map((item) => (
              <button key={item.path} onClick={() => setLocation(item.path)} className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 hover:border-border/60 transition-all group">
                <span className={`${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
                <span className="text-sm font-medium text-foreground/75 group-hover:text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
