import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Sword, Shield, Pickaxe, Leaf, Hammer, LogOut,
  ChevronRight, Crown, Zap, Map, Swords,
  Plus, Check, Globe, Code2, Flame, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, Character } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { isAuthenticated, getCurrentUser } from "@/lib/grudgeBackend";
import { GAME_CARD_BACKGROUNDS, FACTION_EMBLEMS, RACE_PORTRAITS, PROFESSION_ICONS } from "@/lib/artAssets";

interface SavedAccount {
  username: string;
  level: number;
  gold: number;
}

const LIVE_GAMES = [
  { id: "island",    title: "Home Island",       subtitle: "Auto-Harvest & Build",      description: "Your home island. Heroes auto-harvest resources, build structures, craft gear.",         url: "/island-v2",   external: false, icon: "leaf",   color: "from-emerald-950/90 via-emerald-900/70 to-emerald-800/40", border: "border-emerald-500/50 hover:border-emerald-400/70", badge: "Core",    badgeColor: "bg-emerald-600/90 text-emerald-100" },
  { id: "crafting", title: "Warlord Crafting",   subtitle: "Forge Weapons & Armor",     description: "Craft weapons, armor, consumables, and materials using your profession skills.",        url: "/crafting",    external: false, icon: "hammer", color: "from-orange-950/90 via-orange-900/70 to-orange-800/40", border: "border-orange-500/50 hover:border-orange-400/70", badge: "Craft",   badgeColor: "bg-orange-600/90 text-orange-100" },
  { id: "character",title: "Character Builder",  subtitle: "Heroes & Stats",            description: "Create heroes, allocate attributes, equip gear, and manage your roster.",              url: "/character",   external: false, icon: "sword",  color: "from-amber-950/90 via-yellow-900/70 to-amber-800/40",   border: "border-amber-500/50 hover:border-amber-400/70",   badge: "Core",    badgeColor: "bg-amber-600/90 text-amber-100" },
  { id: "rtsgrudge", title: "RTS GRUDGE",          subtitle: "3D Open World Battle",      description: "Enter the 3D Grudge world. Open World, Faction Wars, Siege Mode, and PvP.",          url: "/rts-grudge",  external: false, icon: "shield", color: "from-red-950/90 via-red-900/70 to-red-800/40",         border: "border-red-600/40 hover:border-red-400/60",       badge: "3D",      badgeColor: "bg-red-700/80 text-red-200" },
  { id: "combat",   title: "Combat Arena",       subtitle: "RPG Battle",               description: "Turn-based combat with class skills, abilities, and party tactics.",                  url: "/combat",      external: false, icon: "swords", color: "from-slate-950/90 via-slate-800/70 to-slate-700/40",   border: "border-slate-600/40 hover:border-slate-400/60",   badge: "Battle",  badgeColor: "bg-slate-600/80 text-slate-200" },
  { id: "dungeon",  title: "Dungeon Crawler",    subtitle: "Roguelike",                description: "Procedural dungeons with enemies, loot, and boss fights.",                           url: "/dungeon",     external: false, icon: "pickaxe",color: "from-zinc-950/90 via-zinc-800/70 to-zinc-700/40",     border: "border-zinc-600/40 hover:border-zinc-400/60",     badge: "Solo",    badgeColor: "bg-zinc-600/80 text-zinc-200" },
  { id: "professions",title:"Professions",       subtitle: "Gathering & Crafting",     description: "Level 1\u2013100 gathering and crafting professions with tier unlocks.",           url: "/professions", external: false, icon: "pickaxe",color: "from-green-950/90 via-green-900/70 to-green-800/40",   border: "border-green-700/40 hover:border-green-500/60",   badge: "Craft",   badgeColor: "bg-green-700/80 text-green-200" },
  { id: "worldmap", title: "World Map",          subtitle: "Explore & Capture",        description: "100\u00d7100 zone grid with capturable territory and weekly rotation.",             url: "/world-map",   external: false, icon: "map",    color: "from-teal-950/90 via-teal-900/70 to-teal-800/40",     border: "border-teal-700/40 hover:border-teal-500/60",     badge: "Explore", badgeColor: "bg-teal-700/80 text-teal-200" },
  { id: "skills",   title: "Skill Trees",        subtitle: "Class Abilities",          description: "Class-specific skill trees. Choose 1 skill per tier as you level up.",              url: "/skills",      external: false, icon: "code",   color: "from-blue-950/90 via-blue-900/70 to-blue-800/40",     border: "border-blue-700/40 hover:border-blue-500/60",     badge: "Skills",  badgeColor: "bg-blue-700/80 text-blue-200" },
  { id: "harvest",  title: "Harvest Mode",       subtitle: "Live Resource Gathering",  description: "Send heroes to gather resources in real-time on your personal island.",             url: "/harvest",     external: false, icon: "leaf",   color: "from-lime-950/90 via-lime-900/70 to-lime-800/40",     border: "border-lime-700/40 hover:border-lime-500/60",     badge: "Gather",  badgeColor: "bg-lime-700/80 text-lime-200" },
];

const GAME_ICONS: Record<string, React.ReactNode> = {
  globe: <Globe className="w-6 h-6" />, swords: <Swords className="w-6 h-6" />, pickaxe: <Pickaxe className="w-6 h-6" />,
  leaf: <Leaf className="w-6 h-6" />, sword: <Sword className="w-6 h-6" />, hammer: <Hammer className="w-6 h-6" />,
  code: <Code2 className="w-6 h-6" />, map: <Map className="w-6 h-6" />, crown: <Crown className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />, flame: <Flame className="w-6 h-6" />,
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<SavedAccount | null>(null);
  const { account } = useAccount();

  useEffect(() => {
    // Check canonical auth token (synced to cookies for middleware compat)
    if (!isAuthenticated()) {
      setLocation("/");
      return;
    }
    // Try grudge_user (set by auth modal), fallback to grudge-session, fallback to token user
    const saved = localStorage.getItem("grudge_user") || localStorage.getItem("grudge-session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore parse errors */ }
    } else {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser({ username: currentUser.username || "Warlord", level: 1, gold: 0 });
      }
    }
    CharacterManager.getAll()
      .then((c) => { setCharacters(c); CharacterManager.getActiveCharacter().then(setActiveCharacter); })
      .catch(() => {});
  }, [setLocation]);

  const handleLogout = () => {
    ["grudge_user", "grudge-session", "grudge_auth_token", "grudge_user_id", "grudge_id", "grudge_username"].forEach(k => localStorage.removeItem(k));
    // Clear cookies so middleware sees logout on next page load
    document.cookie = "grudge_auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "grudge_id=; path=/; max-age=0; SameSite=Lax";
    setLocation("/");
  };
  const displayName = user?.username || "Warlord";

  return (
    <div className="min-h-screen bg-[#05060c] text-[#eef2ff]">
      {/* Animated background layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img src="https://i.imgur.com/byUrl5f.png" alt="" className="w-full h-full object-cover opacity-[0.06]" loading="lazy" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 50% 110%, rgba(0,0,0,.75), transparent 55%), radial-gradient(900px 500px at 10% -10%, rgba(10,15,40,.6), transparent 60%), linear-gradient(180deg, rgba(5,6,12,.4), rgba(5,6,12,.92))' }} />
        {/* Animated conic sheen */}
        <div className="absolute -inset-[20%] opacity-70" style={{ background: 'conic-gradient(from 0deg at 30% 40%, rgba(106,169,255,.08), transparent 25%, rgba(199,146,255,.06) 55%, transparent 80%, rgba(107,220,139,.05))', filter: 'blur(60px)', animation: 'spin 50s linear infinite' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }`}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#05060c]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/grudge-logo.png" alt="" className="w-8 h-8 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span className="font-cinzel font-bold tracking-[3px] text-sm" style={{ background: 'linear-gradient(90deg, #f6c945, #fff3c2 50%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GRUDGE WARLORDS</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Faction emblems */}
            <div className="hidden md:flex items-center gap-1.5">
              {Object.entries(FACTION_EMBLEMS).map(([name, src]) => (
                <img key={name} src={src} alt={name} className="w-6 h-6 rounded opacity-60 hover:opacity-100 transition-opacity" title={name} />
              ))}
            </div>
            {account && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                {account.gbuxBalance > 0 && (
                  <span className="flex items-center gap-1 bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded-full text-cyan-300 font-mono text-[11px]">
                    <Coins className="w-3 h-3" />{account.gbuxBalance.toLocaleString()}
                  </span>
                )}
                {(account.characterTokens ?? 0) > 0 && (
                  <span className="flex items-center gap-1 bg-amber-950/50 border border-amber-800/30 px-2 py-0.5 rounded-full text-amber-300 text-[11px]">
                    <Crown className="w-3 h-3" />{account.characterTokens}
                  </span>
                )}
              </div>
            )}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-[#05060c] border border-amber-600/50 shadow-lg shadow-amber-900/30">{displayName[0]?.toUpperCase()}</div>
            <span className="hidden sm:block text-sm font-medium text-white/80">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/account")} className="text-white/40 hover:text-amber-400 h-8 w-8 p-0" title="Account"><Crown className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/40 hover:text-white/70 h-8 w-8 p-0"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Welcome + race portrait strip */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-cinzel font-bold" style={{ background: 'linear-gradient(90deg, #f6c945, #fff3c2 40%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome back, {displayName}</h1>
              <p className="text-[#9aa3c7] text-sm mt-1">{activeCharacter ? `Playing as ${activeCharacter.name} \u00b7 Level ${activeCharacter.level}` : "Create a character to begin your journey"}</p>
            </div>
            {!activeCharacter && (
              <button onClick={() => setLocation("/character")} className="font-cinzel font-bold text-sm px-5 py-2.5 rounded-xl border-0 cursor-pointer transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(180deg, #f6c945, #d8a819)', color: '#20180a', boxShadow: '0 10px 30px -10px rgba(246,201,69,.65)', letterSpacing: '.5px' }}>
                <Plus className="w-4 h-4 inline mr-1" /> Create Character
              </button>
            )}
          </div>
          {/* Race portrait strip */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {Object.entries(RACE_PORTRAITS).map(([race, src]) => (
              <div key={race} className="w-14 h-14 rounded-xl overflow-hidden border border-white/[.08] bg-[#0b0f1e] flex-shrink-0 group cursor-pointer hover:-translate-y-0.5 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/20">
                <img src={src} alt={race} className="w-full h-full object-cover object-top scale-105 group-hover:scale-110 transition-transform saturate-[.9] brightness-[.85] group-hover:saturate-110 group-hover:brightness-100" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Game Library header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-cinzel font-bold text-lg tracking-wider">Game Library</h2>
            <p className="text-xs text-[#9aa3c7] mt-0.5">{LIVE_GAMES.length} live games</p>
          </div>
        </motion.div>

        {/* Game cards with full-bleed background art */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {LIVE_GAMES.map((game, i) => (
            <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <div
                onClick={() => game.external ? window.open(game.url, "_blank", "noopener") : setLocation(game.url)}
                className="relative overflow-hidden rounded-2xl border border-white/[.06] cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:border-white/[.15] h-full min-h-[172px]"
                style={{ background: 'linear-gradient(180deg, rgba(16,20,36,.85), rgba(8,10,20,.85))', backdropFilter: 'blur(12px)', boxShadow: '0 20px 60px -20px rgba(0,0,0,.45)' }}
              >
                {/* Full-bleed background image */}
                {GAME_CARD_BACKGROUNDS[game.id] && (
                  <div className="absolute inset-0 transition-all duration-700">
                    <img src={GAME_CARD_BACKGROUNDS[game.id]} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 saturate-[.8] brightness-[.5] group-hover:saturate-100 group-hover:brightness-[.65]" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,6,12,.3) 0%, rgba(5,6,12,.75) 60%, rgba(5,6,12,.92) 100%)' }} />
                  </div>
                )}
                {/* Subtle grid overlay like reference */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)' }} />

                {/* Card content */}
                <div className="relative z-10 p-5 flex flex-col h-full">
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase ${game.badgeColor}`}>{game.badge}</span>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#eef2ff]/70 group-hover:text-[#eef2ff] transition-colors" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.03))', border: '1px solid rgba(255,255,255,.08)', boxShadow: 'inset 0 0 20px rgba(255,255,255,.03)' }}>
                      {GAME_ICONS[game.icon]}
                    </div>
                    <div>
                      <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">{game.title}</h3>
                      <p className="text-[11px] text-[#9aa3c7]">{game.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#cfd5f5]/60 group-hover:text-[#cfd5f5]/80 flex-1 mb-4 line-clamp-2 leading-relaxed">{game.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400/70 flex items-center gap-1"><Check className="w-3 h-3" /> Live</span>
                    <span className="text-[11px] text-white/30 group-hover:text-white/60 flex items-center gap-1 font-medium">Play <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progression section with profession icons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
          <h2 className="font-cinzel font-bold text-base mb-4 flex items-center gap-2 tracking-wider">
            <Hammer className="w-4 h-4 text-amber-400" /> Progression
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Professions", path: "/professions", img: PROFESSION_ICONS.miner, fallbackIcon: <Hammer className="w-5 h-5" />, color: "amber" },
              { label: "Skill Tree", path: "/skill-tree", img: "/assets/skill-icons/FireMage_Free/FireMage_1.png", fallbackIcon: <Zap className="w-5 h-5" />, color: "blue" },
              { label: "Arsenal", path: "/arsenal", img: "/assets/skill-icons/Hunter_Free/Hunter_1.png", fallbackIcon: <Shield className="w-5 h-5" />, color: "emerald" },
              { label: "Missions", path: "/missions", img: "/assets/skill-icons/Necromancer_Free/Necromancer_1.png", fallbackIcon: <Swords className="w-5 h-5" />, color: "cyan" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[.06] hover:border-white/[.15] transition-all group cursor-pointer hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(180deg, rgba(18,22,40,.6), rgba(10,12,22,.6))', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/[.08] flex-shrink-0 flex items-center justify-center bg-white/[.04]">
                  <img src={item.img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-white/60">' + item.label[0] + '</span>'; }} />
                </div>
                <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Footer version */}
        <div className="text-center mt-12 pb-4">
          <p className="text-[10px] text-[#9aa3c7]/40 font-cinzel tracking-[4px]">GRUDGE WARLORDS v2.5.0</p>
          <p className="text-[10px] text-[#9aa3c7]/30 mt-1">© Powered by Grudge Studio</p>
        </div>
      </main>
    </div>
  );
}
