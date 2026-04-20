import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Swords, Map, Shield, Hammer, User, Wallet, Settings, 
  ChevronRight, Sparkles, Zap, Crown, Skull, TreePine, Home,
  Compass, Castle, Flame, BookOpen, Package
} from "lucide-react";
import { CharacterManager, Character } from "@/lib/characterManager";
import { useAccountResources, useAccount } from "@/hooks/use-account";
import { getCurrentUser } from "@/lib/grudgeBackend";
import { getSpriteSetForCharacter } from "@/lib/gameData";
import SpriteAnimator from "@/components/SpriteAnimator";
import { getCharacterPalette } from "@/lib/spriteManifest";

// ── Game Mode Cards ─────────────────────────────────────────────

interface GameMode {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: typeof Swords;
  color: string;
  badge?: string;
}

const GAME_MODES: GameMode[] = [
  { id: "island", name: "Home Island", description: "Auto-harvest resources, build structures, manage heroes", route: "/island", icon: TreePine, color: "from-green-600 to-emerald-800" },
  { id: "character", name: "Character Builder", description: "Create heroes, allocate stats, choose skills, equip gear", route: "/character", icon: User, color: "from-amber-600 to-orange-800" },
  { id: "professions", name: "Professions", description: "6 gathering + 5 crafting professions with tiered progression", route: "/professions", icon: Hammer, color: "from-blue-600 to-blue-800" },
  { id: "combat", name: "Combat Arena", description: "Turn-based RPG battles with class skills and abilities", route: "/combat", icon: Swords, color: "from-red-600 to-red-800" },
  { id: "skills", name: "Skill Trees", description: "Class-specific skill trees with tier unlocks per level", route: "/skills", icon: Zap, color: "from-purple-600 to-purple-800" },
  { id: "world-map", name: "World Map", description: "100\u00d7100 zone grid, 3\u00d73 player blocks, explore and capture", route: "/world-map", icon: Compass, color: "from-cyan-600 to-teal-800", badge: "New" },
  { id: "dungeon", name: "Dungeon Crawler", description: "Procedural dungeons with enemies, loot, and boss fights", route: "/dungeon", icon: Skull, color: "from-gray-600 to-gray-800" },
  { id: "tower-wars", name: "Tower Defense", description: "Place towers, defend against waves on capturable islands", route: "/tower-wars", icon: Castle, color: "from-indigo-600 to-indigo-800", badge: "New" },
  { id: "rpg-battle", name: "RPG Battle", description: "Party-based tactical combat with positioning", route: "/rpg-battle", icon: Flame, color: "from-orange-600 to-red-800" },
  { id: "harvest", name: "Harvest Mode", description: "Standalone harvesting with resource management", route: "/harvest", icon: Package, color: "from-lime-600 to-green-800" },
];

const ADMIN_LINKS = [
  { name: "Scene Editor", route: "/editor", icon: Sparkles },
  { name: "Sprite Admin", route: "/admin", icon: Settings },
  { name: "Sprite Library", route: "/sprite-library", icon: BookOpen },
  { name: "Sprite Editor", route: "/sprite-editor", icon: Sparkles },
  { name: "Map Editor", route: "/admin-map", icon: Map },
  { name: "Database", route: "/database", icon: Shield },
  { name: "Wallet & NFTs", route: "/wallet", icon: Wallet },
  { name: "Account", route: "/account", icon: User },
];

// ── Main Launcher ───────────────────────────────────────────────

export default function LauncherPage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeChar, setActiveChar] = useState<Character | null>(null);
  const { resources } = useAccountResources();
  const { account } = useAccount();
  const user = getCurrentUser();

  useEffect(() => {
    CharacterManager.getAll().then(chars => {
      setCharacters(chars);
      CharacterManager.getActiveCharacter().then(ac => setActiveChar(ac));
    });
  }, []);

  const goldAmount = resources['gold'] || resources['GOLD'] || 0;
  const woodAmount = resources['WOOD_PINE_T1'] || resources['wood'] || 0;
  const stoneAmount = resources['STONE_ROUGH'] || resources['stone'] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-amber-900/30 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-amber-500/20">G</div>
              <div>
                <h1 className="text-2xl font-cinzel font-bold text-amber-400">Grudge Warlords</h1>
                <p className="text-xs text-slate-500 tracking-widest uppercase">Game Launcher \u2022 {user?.username || 'Guest'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 text-sm bg-black/40 rounded-lg px-4 py-2 border border-slate-800">
                <span className="text-amber-400">\ud83e\ude99 {goldAmount}</span>
                <span className="text-green-400">\ud83e\udeb5 {woodAmount}</span>
                <span className="text-slate-300">\ud83e\udea8 {stoneAmount}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/home")} className="text-slate-400">
                <Home className="w-4 h-4 mr-1" /> Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Active Character Banner */}
        {activeChar && (
          <div className="bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 rounded-xl p-5 border border-slate-700 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500 overflow-hidden bg-black/50 flex items-center justify-center shrink-0">
              {activeChar.avatarUrl ? (
                <img src={activeChar.avatarUrl} alt={activeChar.name} className="w-full h-full object-cover" />
              ) : (
                <div className="scale-[1.3]">
                  <SpriteAnimator 
                    spriteSet={getSpriteSetForCharacter(activeChar.raceId, activeChar.classId)} 
                    action="Idle" 
                    palette={getCharacterPalette(activeChar.id)}
                    isUndead={activeChar.raceId === 'undead'}
                  />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-cinzel font-bold text-white">{activeChar.name}</h2>
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/50">Lv {activeChar.level}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{activeChar.raceId} {activeChar.classId}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>XP</span>
                    <span>{activeChar.xp || 0}</span>
                  </div>
                  <Progress value={Math.min(100, ((activeChar.xp || 0) % 100))} className="h-1.5" />
                </div>
                <span className="text-xs text-slate-500">{characters.length} heroes total</span>
                {(account as any)?.characterTokens !== undefined && (
                  <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-600/50">
                    <Crown className="w-3 h-3 mr-1" /> {(account as any).characterTokens} tokens
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={() => setLocation("/character")} variant="outline" className="border-amber-700 text-amber-400 hover:bg-amber-900/30 hidden md:flex">
              <User className="w-4 h-4 mr-2" /> Heroes
            </Button>
          </div>
        )}

        {/* No Character CTA */}
        {!activeChar && characters.length === 0 && (
          <Card className="border-amber-600/50 bg-amber-950/20">
            <CardContent className="p-8 text-center">
              <Crown className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-cinzel text-amber-400 mb-2">Create Your First Hero</h2>
              <p className="text-slate-400 mb-6">Begin your journey in the world of Grudge Warlords</p>
              <Button onClick={() => setLocation("/character")} size="lg" className="bg-amber-600 hover:bg-amber-500 text-black font-bold">
                Create Character <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Game Modes Grid */}
        <div>
          <h3 className="text-lg font-cinzel text-slate-300 mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-500" /> Game Modes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {GAME_MODES.map(mode => (
              <Card 
                key={mode.id}
                className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl border-slate-800 bg-slate-900/50 overflow-hidden"
                onClick={() => setLocation(mode.route)}
              >
                <div className={cn("h-1.5 bg-gradient-to-r", mode.color)} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", mode.color)}>
                      <mode.icon className="w-5 h-5 text-white" />
                    </div>
                    {mode.badge && (
                      <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-600/50 text-[10px]">{mode.badge}</Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">{mode.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{mode.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin & Tools Row */}
        <div>
          <h3 className="text-lg font-cinzel text-slate-300 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" /> Tools & Admin
          </h3>
          <div className="flex flex-wrap gap-2">
            {ADMIN_LINKS.map(link => (
              <Button 
                key={link.route}
                variant="outline" 
                size="sm" 
                className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-600/50 hover:bg-amber-900/10"
                onClick={() => setLocation(link.route)}
              >
                <link.icon className="w-3.5 h-3.5 mr-1.5" /> {link.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="text-2xl font-bold text-amber-400">{characters.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Heroes</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="text-2xl font-bold text-green-400">{Object.keys(resources).length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Resource Types</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="text-2xl font-bold text-blue-400">{(account as any)?.gbuxBalance || 0}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">GbuX Balance</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="text-2xl font-bold text-purple-400">{(account as any)?.accountXp || 0}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Account XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
