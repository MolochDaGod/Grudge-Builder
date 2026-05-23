import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword, Shield, Pickaxe, Leaf, Hammer, LogOut,
  ChevronRight, Crown, Zap, Map, Swords,
  Plus, Check, Globe, Code2, Flame, Coins, Anchor,
  User, Skull, BookOpen, Compass, Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, Character } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { getCurrentUser } from "@/lib/grudgeBackend";
import {
  GAME_CARD_BACKGROUNDS, FACTION_EMBLEMS, RACE_PORTRAITS,
  PROFESSION_ICONS, CLASS_HERO_IMAGES, BACKGROUNDS,
} from "@/lib/artAssets";

// ── Types ────────────────────────────────────────────────────────────────────

interface GameMode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  icon: string;
  tier: "core" | "combat" | "explore" | "craft";
  badge: string;
  badgeColor: string;
}

// ── Game Modes ───────────────────────────────────────────────────────────────

const GAME_MODES: GameMode[] = [
  { id: "character", title: "Hero Forge",        subtitle: "Create & Manage Heroes",    description: "Build heroes, allocate attributes, equip gear, and manage your roster.",                url: "/character",    icon: "user",     tier: "core",    badge: "Core",    badgeColor: "amber" },
  { id: "island",    title: "Home Island",       subtitle: "Auto-Harvest & Build",      description: "Your island. Heroes auto-harvest, build structures, craft gear.",                       url: "/island-v2",    icon: "leaf",     tier: "core",    badge: "Core",    badgeColor: "emerald" },
  { id: "crafting",  title: "Warlord Crafting",  subtitle: "Forge Weapons & Armor",     description: "Craft weapons, armor, consumables using your profession skills.",                       url: "/crafting",     icon: "hammer",   tier: "craft",   badge: "Craft",   badgeColor: "orange" },
  { id: "rtsgrudge", title: "RTS GRUDGE",        subtitle: "3D Open World Battle",      description: "Enter the 3D Grudge world. Faction Wars, Siege Mode, and PvP.",                        url: "/rts-grudge",   icon: "shield",   tier: "combat",  badge: "3D",      badgeColor: "red" },
  { id: "combat",    title: "Combat Arena",      subtitle: "RPG Battle",                description: "Turn-based combat with class skills, abilities, and party tactics.",                     url: "/combat",       icon: "swords",   tier: "combat",  badge: "Battle",  badgeColor: "slate" },
  { id: "dungeon",   title: "Dungeon Crawler",   subtitle: "Roguelike",                 description: "Procedural dungeons with enemies, loot, and boss fights.",                               url: "/dungeon",      icon: "skull",    tier: "combat",  badge: "Solo",    badgeColor: "zinc" },
  { id: "worldmap",  title: "World Map",         subtitle: "Explore & Capture",         description: "100\u00d7100 zone grid with capturable territory and weekly rotation.",                  url: "/world-map",    icon: "compass",  tier: "explore", badge: "Explore", badgeColor: "teal" },
  { id: "sailing",   title: "Open Water",        subtitle: "Naval Combat",              description: "Command your ship. Fight pirates, discover islands, dock at ports.",                     url: "/sailing",      icon: "anchor",   tier: "explore", badge: "Sail",    badgeColor: "cyan" },
  { id: "adventure", title: "Adventure Island",  subtitle: "Combat & Harvest",          description: "Explore hostile islands. Fight waves, harvest rare resources.",                          url: "/island-3d",    icon: "flame",    tier: "explore", badge: "Combat",  badgeColor: "rose" },
  { id: "professions", title: "Professions",     subtitle: "Gathering & Crafting",      description: "Level 1\u2013100 gathering and crafting professions with tier unlocks.",                url: "/professions",  icon: "pickaxe",  tier: "craft",   badge: "Craft",   badgeColor: "green" },
  { id: "skills",    title: "Skill Trees",       subtitle: "Class Abilities",           description: "Class-specific skill trees. Choose 1 skill per tier as you level.",                     url: "/skills",       icon: "zap",      tier: "craft",   badge: "Skills",  badgeColor: "blue" },
  { id: "harvest",   title: "Harvest Mode",      subtitle: "Live Gathering",            description: "Send heroes to gather resources in real-time on your island.",                          url: "/harvest",      icon: "leaf",     tier: "craft",   badge: "Gather",  badgeColor: "lime" },
];

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  core:    { label: "Core",    color: "#f6c945", icon: <Crown className="w-3.5 h-3.5" /> },
  combat:  { label: "Combat",  color: "#ff6b57", icon: <Swords className="w-3.5 h-3.5" /> },
  explore: { label: "Explore", color: "#6aa9ff", icon: <Compass className="w-3.5 h-3.5" /> },
  craft:   { label: "Progress", color: "#6bdc8b", icon: <Hammer className="w-3.5 h-3.5" /> },
};

const ICON_MAP: Record<string, React.ReactNode> = {
  user: <User className="w-5 h-5" />, leaf: <Leaf className="w-5 h-5" />, hammer: <Hammer className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />, swords: <Swords className="w-5 h-5" />, skull: <Skull className="w-5 h-5" />,
  compass: <Compass className="w-5 h-5" />, anchor: <Anchor className="w-5 h-5" />, flame: <Flame className="w-5 h-5" />,
  pickaxe: <Pickaxe className="w-5 h-5" />, zap: <Zap className="w-5 h-5" />,
};

const BADGE_COLORS: Record<string, string> = {
  amber: "bg-amber-600/90 text-amber-100", emerald: "bg-emerald-600/90 text-emerald-100",
  orange: "bg-orange-600/90 text-orange-100", red: "bg-red-700/80 text-red-200",
  slate: "bg-slate-600/80 text-slate-200", zinc: "bg-zinc-600/80 text-zinc-200",
  teal: "bg-teal-700/80 text-teal-200", cyan: "bg-cyan-700/80 text-cyan-200",
  rose: "bg-rose-700/80 text-rose-200", green: "bg-green-700/80 text-green-200",
  blue: "bg-blue-700/80 text-blue-200", lime: "bg-lime-700/80 text-lime-200",
};

const FONTS = {
  title: "'Cinzel', serif",
  ui: "'Inter', sans-serif",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [activeTier, setActiveTier] = useState<string | "all">("all");
  const { account } = useAccount();

  useEffect(() => {
    const saved = localStorage.getItem("grudge_user") || localStorage.getItem("grudge-session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    } else {
      const currentUser = getCurrentUser();
      if (currentUser) setUser({ username: currentUser.username || "Warlord" });
    }
    CharacterManager.getAll()
      .then((c) => { setCharacters(c); CharacterManager.getActiveCharacter().then(setActiveCharacter); })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    ["grudge_user", "grudge-session", "grudge_auth_token", "grudge_user_id", "grudge_id", "grudge_username"].forEach(k => localStorage.removeItem(k));
    document.cookie = "grudge_auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "grudge_id=; path=/; max-age=0; SameSite=Lax";
    setLocation("/");
  };

  const displayName = user?.username || "Warlord";
  const filtered = activeTier === "all" ? GAME_MODES : GAME_MODES.filter(g => g.tier === activeTier);

  return (
    <div className="min-h-screen text-[#eef2ff]" style={{ background: "#05060c", fontFamily: FONTS.ui }}>

      {/* ── BG ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img src={BACKGROUNDS.darkFantasy4} alt="" className="w-full h-full object-cover opacity-[0.05]" loading="lazy" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(1200px 700px at 50% 110%,rgba(0,0,0,.75),transparent 55%),radial-gradient(900px 500px at 10% -10%,rgba(10,15,40,.6),transparent 60%),linear-gradient(180deg,rgba(5,6,12,.4),rgba(5,6,12,.92))" }} />
        <div className="absolute -inset-[20%] opacity-60" style={{ background: "conic-gradient(from 0deg at 30% 40%,rgba(246,201,69,.06),transparent 25%,rgba(199,146,255,.04) 55%,transparent 80%)", filter: "blur(60px)", animation: "spin 50s linear infinite" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/[.06]" style={{ background: "rgba(5,6,12,.85)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/grudge-logo.png" alt="" className="w-7 h-7 rounded" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span style={{ fontFamily: FONTS.title, background: "linear-gradient(90deg,#f6c945,#fff3c2 50%,#f6c945)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} className="font-bold tracking-[3px] text-sm">GRUDGE WARLORDS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              {Object.entries(FACTION_EMBLEMS).map(([name, src]) => (
                <img key={name} src={src} alt={name} className="w-5 h-5 rounded opacity-50 hover:opacity-100 transition-opacity" title={name} />
              ))}
            </div>
            {account && account.gbuxBalance > 0 && (
              <span className="hidden sm:flex items-center gap-1 bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded-full text-cyan-300 font-mono text-[10px]">
                <Coins className="w-3 h-3" />{account.gbuxBalance.toLocaleString()}
              </span>
            )}
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-[10px] font-bold text-[#05060c] border border-amber-600/50">{displayName[0]?.toUpperCase()}</div>
            <span className="hidden sm:block text-xs font-medium text-white/70">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/account")} className="text-white/30 hover:text-amber-400 h-7 w-7 p-0" title="Account"><Crown className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/30 hover:text-white/60 h-7 w-7 p-0"><LogOut className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* ── Hero Panel (left) + Featured Modes (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 mb-5">

          {/* Hero Panel */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl overflow-hidden border border-white/[.06]" style={{ background: "linear-gradient(180deg,rgba(14,18,32,.85),rgba(8,10,20,.9))", backdropFilter: "blur(12px)" }}>
            {activeCharacter ? (
              <div className="flex flex-col h-full">
                <div className="relative h-40 overflow-hidden">
                  <img src={CLASS_HERO_IMAGES[activeCharacter.classId as keyof typeof CLASS_HERO_IMAGES] || CLASS_HERO_IMAGES.warrior} alt="" className="w-full h-full object-cover scale-110 saturate-[.9] brightness-[.5]" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 20%,rgba(8,10,20,.95) 100%)" }} />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div style={{ fontFamily: FONTS.title }} className="text-base font-bold text-white tracking-wide">{activeCharacter.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-600/80 text-amber-100 font-bold">Lv {activeCharacter.level}</span>
                      <span className="text-[10px] text-white/40 capitalize">{activeCharacter.raceId} {activeCharacter.classId}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 flex-1">
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {[
                      { label: "STR", value: activeCharacter.attributes?.Strength || 5, color: "#ff6b57" },
                      { label: "INT", value: activeCharacter.attributes?.Intellect || 5, color: "#6aa9ff" },
                      { label: "VIT", value: activeCharacter.attributes?.Vitality || 5, color: "#6bdc8b" },
                    ].map(s => (
                      <div key={s.label} className="text-center p-1.5 rounded-md" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                        <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[8px] text-white/35 uppercase tracking-wider">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setLocation("/character")} className="w-full bg-amber-600/15 hover:bg-amber-600/25 border border-amber-600/30 text-amber-300 text-[11px]" size="sm">
                    <BookOpen className="w-3 h-3 mr-1.5" /> Character Sheet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center flex flex-col items-center justify-center h-full min-h-[260px]">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-3">
                  <Sword className="w-6 h-6 text-white/15" />
                </div>
                <p style={{ fontFamily: FONTS.title }} className="text-xs text-white/40 mb-1">No Hero Found</p>
                <p className="text-[10px] text-white/25 mb-3">Create a character to begin</p>
                <Button onClick={() => setLocation("/character")} className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[11px] px-5" size="sm">
                  <Plus className="w-3 h-3 mr-1.5" /> Create Hero
                </Button>
              </div>
            )}
          </motion.div>

          {/* Featured — top 3 modes */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
              {GAME_MODES.filter(g => ["rtsgrudge", "character", "island"].includes(g.id)).map((game) => (
                <div
                  key={game.id}
                  onClick={() => setLocation(game.url)}
                  className="relative overflow-hidden rounded-2xl border border-white/[.06] cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:border-white/[.15] flex flex-col justify-end min-h-[240px]"
                  style={{ background: "linear-gradient(180deg,rgba(16,20,36,.85),rgba(8,10,20,.85))" }}
                >
                  {GAME_CARD_BACKGROUNDS[game.id] && (
                    <div className="absolute inset-0">
                      <img src={GAME_CARD_BACKGROUNDS[game.id]} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 saturate-[.8] brightness-[.4] group-hover:brightness-[.55]" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,6,12,.2) 0%,rgba(5,6,12,.85) 70%,rgba(5,6,12,.95) 100%)" }} />
                    </div>
                  )}
                  <div className="relative z-10 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 group-hover:text-white transition-colors" style={{ background: "linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02))", border: "1px solid rgba(255,255,255,.06)" }}>
                        {ICON_MAP[game.icon]}
                      </div>
                      <div>
                        <h3 style={{ fontFamily: FONTS.title }} className="text-xs font-bold text-white tracking-wide">{game.title}</h3>
                        <p className="text-[9px] text-white/35">{game.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/45 group-hover:text-white/65 leading-relaxed line-clamp-2 mb-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${BADGE_COLORS[game.badgeColor]}`}>{game.badge}</span>
                      <span className="text-[9px] text-white/25 group-hover:text-white/55 flex items-center gap-0.5">Play <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Race portraits ── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {Object.entries(RACE_PORTRAITS).map(([race, src]) => (
            <div key={race} className="w-11 h-11 rounded-xl overflow-hidden border border-white/[.06] bg-[#0b0f1e] flex-shrink-0 group cursor-pointer hover:-translate-y-0.5 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/20">
              <img src={src} alt={race} className="w-full h-full object-cover object-top scale-105 group-hover:scale-110 transition-transform saturate-[.85] brightness-[.8] group-hover:saturate-110 group-hover:brightness-100" />
            </div>
          ))}
        </div>

        {/* ── Tier filter ── */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTier("all")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all whitespace-nowrap"
            style={{
              background: activeTier === "all" ? "rgba(246,201,69,.12)" : "rgba(255,255,255,.03)",
              border: `1px solid ${activeTier === "all" ? "rgba(246,201,69,.4)" : "rgba(255,255,255,.05)"}`,
              color: activeTier === "all" ? "#f6c945" : "#555",
            }}
          >All</button>
          {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveTier(key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all whitespace-nowrap"
              style={{
                background: activeTier === key ? `${cfg.color}18` : "rgba(255,255,255,.03)",
                border: `1px solid ${activeTier === key ? `${cfg.color}60` : "rgba(255,255,255,.05)"}`,
                color: activeTier === key ? cfg.color : "#555",
              }}
            >{cfg.icon}{cfg.label}</button>
          ))}
        </div>

        {/* ── Game Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((game, i) => (
              <motion.div key={game.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: 0.03 * i }}>
                <div
                  onClick={() => setLocation(game.url)}
                  className="relative overflow-hidden rounded-xl border border-white/[.04] cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[.12] h-full min-h-[130px]"
                  style={{ background: "linear-gradient(180deg,rgba(14,18,32,.7),rgba(8,10,20,.7))" }}
                >
                  {GAME_CARD_BACKGROUNDS[game.id] && (
                    <div className="absolute inset-0">
                      <img src={GAME_CARD_BACKGROUNDS[game.id]} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-108 transition-transform duration-700 saturate-[.7] brightness-[.3] group-hover:brightness-[.45]" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,6,12,.4) 0%,rgba(5,6,12,.85) 60%,rgba(5,6,12,.95) 100%)" }} />
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none opacity-[.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
                  <div className="relative z-10 p-3.5 flex flex-col h-full">
                    <div className="absolute top-2 right-2">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase ${BADGE_COLORS[game.badgeColor]}`}>{game.badge}</span>
                    </div>
                    <div className="flex items-start gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-white/45 group-hover:text-white/75 transition-colors flex-shrink-0" style={{ background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))", border: "1px solid rgba(255,255,255,.04)" }}>
                        {ICON_MAP[game.icon]}
                      </div>
                      <div className="min-w-0">
                        <h3 style={{ fontFamily: FONTS.title }} className="text-[11px] font-bold text-white tracking-wide">{game.title}</h3>
                        <p className="text-[9px] text-white/30">{game.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/35 group-hover:text-white/55 flex-1 line-clamp-2 leading-relaxed">{game.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[.04]">
                      <span className="text-[9px] text-emerald-400/50 flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Live</span>
                      <span className="text-[9px] text-white/20 group-hover:text-white/50 flex items-center gap-0.5">Play <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Quick Access ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5">
          <h2 style={{ fontFamily: FONTS.title }} className="text-[11px] font-bold mb-2.5 flex items-center gap-1.5 tracking-wider text-white/60">
            <Hammer className="w-3 h-3 text-amber-400" /> Quick Access
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Professions", path: "/professions", img: PROFESSION_ICONS.miner },
              { label: "Skill Tree", path: "/skill-tree", img: "/assets/skill-icons/FireMage_Free/FireMage_1.png" },
              { label: "Arsenal", path: "/arsenal", img: "/assets/skill-icons/Hunter_Free/Hunter_1.png" },
              { label: "Missions", path: "/missions", img: "/assets/skill-icons/Necromancer_Free/Necromancer_1.png" },
            ].map(item => (
              <button key={item.path} onClick={() => setLocation(item.path)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-white/[.04] hover:border-white/[.1] transition-all group cursor-pointer hover:-translate-y-0.5" style={{ background: "linear-gradient(180deg,rgba(14,18,32,.4),rgba(8,10,20,.4))" }}>
                <div className="w-7 h-7 rounded-md overflow-hidden border border-white/[.05] flex-shrink-0 bg-white/[.03]">
                  <img src={item.img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                </div>
                <span className="text-[11px] font-medium text-white/45 group-hover:text-white/75 transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <div className="text-center mt-8 pb-4">
          <p style={{ fontFamily: FONTS.title }} className="text-[8px] text-white/15 tracking-[4px]">GRUDGE WARLORDS v2.6.0</p>
          <p className="text-[8px] text-white/10 mt-0.5">\u00a9 Grudge Studio \u00b7 By Racalvin The Pirate King</p>
        </div>
      </main>
    </div>
  );
}
