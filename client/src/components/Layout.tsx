import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Hammer, Sword, Gem, Book, Pickaxe, Leaf, Shield, Menu, Settings, Wallet, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPageByPath } from "@/lib/pageRegistry";
import { CharacterManager } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { FantasySidebar } from "@/components/FantasyNavigation";
import { assetUrl } from "@/lib/assetConfig";
import { onImageError } from "@/lib/assetResolver";

const accountPanelBg = assetUrl("/images/ui/fantasy_rpg_account_panel_background.png");

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  tooltip: string;
  number: string;
}

const navItems: NavItem[] = [
  { label: "Home", path: "/home", icon: <Book className="w-4 h-4" />, tooltip: "Main dashboard with events and quick access", number: "1" },
  { label: "Character", path: "/character", icon: <Shield className="w-4 h-4" />, tooltip: "Manage your heroes, equipment, and attributes", number: "2" },
  { label: "Dungeon", path: "/dungeon", icon: <Pickaxe className="w-4 h-4" />, tooltip: "Explore procedural dungeons and battle monsters", number: "3" },
  { label: "Combat", path: "/combat", icon: <Sword className="w-4 h-4" />, tooltip: "Turn-based party combat against enemies", number: "4" },
  { label: "Island", path: "/island", icon: <Leaf className="w-4 h-4" />, tooltip: "Build and manage your island base", number: "5" },
  { label: "Professions", path: "/professions", icon: <Hammer className="w-4 h-4" />, tooltip: "Craft items with blacksmithing, alchemy, and more", number: "6" },
  { label: "Skills", path: "/skill-tree", icon: <Gem className="w-4 h-4" />, tooltip: "Unlock abilities and customize your build", number: "7" },
  { label: "Database", path: "/database", icon: <Book className="w-4 h-4" />, tooltip: "Browse all items, monsters, and game data", number: "8" },
  { label: "Admin", path: "/admin", icon: <Settings className="w-4 h-4" />, tooltip: "Sprite manager, editor, and dev tools", number: "9" },
];

interface CharacterInfo {
  id: string;
  name: string;
  level: number;
}

// XP thresholds for Grudge Account leveling (4x scaling each level)
// Level 1: 0 XP, Level 2: 500 XP, Level 3: 2000 XP, Level 4: 8000 XP, Level 5: 32000 XP, etc.
const XP_THRESHOLDS = [0, 500, 2000, 8000, 32000, 128000, 512000, 2048000, 8192000, 32768000];

function calculateWarlordLevel(totalXp: number): { level: number; xp: number; xpForNext: number; totalXp: number } {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (totalXp >= XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[level - 1] * 4; // 4x scaling
  const xpIntoLevel = totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  
  return { level, xp: xpIntoLevel, xpForNext: xpNeeded, totalXp };
}

// Calculate total XP from all characters (1:1 ratio)
function calculateTotalCharacterXp(characters: CharacterInfo[]): number {
  return characters.reduce((sum, c) => sum + ((c.level || 0) * 100), 0);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasCharacters, setHasCharacters] = useState<boolean>(false);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [useFantasyNav, setUseFantasyNav] = useState(true);
  const { account, loading: accountLoading } = useAccount();

  useEffect(() => {
    CharacterManager.getAll().then(chars => {
      setHasCharacters(chars.length > 0);
      setCharacters(chars);
    });
  }, [location]);

  // Global image error handler — catches any broken <img> and swaps to fallback
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        onImageError(e as unknown as React.SyntheticEvent<HTMLImageElement>);
      }
    };
    document.addEventListener('error', handler, true);
    return () => document.removeEventListener('error', handler, true);
  }, []);

  // Use accountXp from database if available, otherwise calculate from characters
  const totalXp = account?.accountXp || calculateTotalCharacterXp(characters);
  const warlordStats = calculateWarlordLevel(totalXp);
  const xpPercentage = warlordStats.xpForNext > 0 ? (warlordStats.xp / warlordStats.xpForNext) * 100 : 0;

  const visibleNavItems = hasCharacters 
    ? navItems
    : navItems.filter(item => ["1", "2"].includes(item.number));

  const shouldGlowCharacter = !hasCharacters;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Mobile Header */}
      <header className="md:hidden border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-xl font-cinzel font-bold text-amber-400">GRUDGE</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-slate-900 border-r-slate-800 p-0">
            <div className="p-6">
              <h2 className="text-2xl font-cinzel font-bold text-amber-400 mb-8">GRUDGE WARLORDS</h2>
              <nav className="flex flex-col gap-2">
                {visibleNavItems.map((item) => (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      location === item.path 
                        ? "bg-red-900 text-white shadow-lg shadow-red-900/50" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                      shouldGlowCharacter && item.number === "2" && "animate-pulse ring-2 ring-amber-400/60 bg-amber-900/20"
                    )}
                  >
                    {item.icon}
                    <span className="font-medium tracking-wide">{item.label}</span>
                    <span className="ml-auto text-xs text-slate-500 font-mono">{item.number}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <div className="flex">
        {/* Fantasy Sign Navigation */}
        {useFantasyNav ? (
          <FantasySidebar />
        ) : (
        <aside 
          className={cn(
            "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out relative",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(20,15,10,0.98) 0%, rgba(30,20,15,0.98) 50%, rgba(15,10,8,0.98) 100%)',
            borderRight: '2px solid rgba(139,69,19,0.5)',
            boxShadow: '2px 0 20px rgba(0,0,0,0.5), inset -1px 0 0 rgba(218,165,32,0.1)'
          }}
        >
          {/* Ornate Border Decoration */}
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gradient-to-b from-amber-600/40 via-amber-800/20 to-amber-600/40" />
          
          {/* Slide-out Tab */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "absolute -right-4 top-1/2 -translate-y-1/2 z-50 w-8 h-16 flex items-center justify-center cursor-pointer transition-all duration-200",
              "bg-gradient-to-r from-amber-900/90 to-amber-800/90 hover:from-amber-800 hover:to-amber-700",
              "border border-amber-600/50 rounded-r-lg shadow-lg shadow-black/50"
            )}
            style={{
              clipPath: 'polygon(0 0, 100% 10%, 100% 90%, 0 100%)'
            }}
            data-testid="btn-toggle-sidebar"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-amber-200" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-amber-200" />
            )}
          </button>

          {/* Header with Fantasy Styling */}
          <div className={cn(
            "border-b border-amber-900/30 transition-all duration-300",
            sidebarCollapsed ? "p-3" : "p-6"
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(139,69,19,0.15) 0%, transparent 100%)'
          }}
          >
            {sidebarCollapsed ? (
              <div className="w-10 h-10 mx-auto rounded bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center shadow-lg shadow-amber-900/50">
                <span className="text-lg font-bold text-white font-cinzel">G</span>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-lg"
                    style={{ textShadow: '0 0 20px rgba(255,193,7,0.3)' }}>
                  GRUDGE
                </h1>
                <p className="text-xs text-amber-700/80 uppercase tracking-[0.25em] mt-1 font-cinzel">Warlords</p>
              </>
            )}
          </div>
          
          {/* Navigation with Fantasy Theme */}
          <nav className={cn(
            "flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent",
            sidebarCollapsed ? "p-2" : "p-3"
          )}>
            <TooltipProvider delayDuration={100}>
              {visibleNavItems.map((item) => (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link 
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded transition-all duration-200 group relative overflow-hidden",
                        sidebarCollapsed ? "p-3 justify-center" : "px-4 py-3",
                        location === item.path 
                          ? "text-amber-100 shadow-lg" 
                          : "text-amber-600/70 hover:text-amber-200",
                        shouldGlowCharacter && item.number === "2" && "animate-pulse ring-2 ring-amber-400/60"
                      )}
                      style={{
                        background: location === item.path 
                          ? 'linear-gradient(90deg, rgba(139,69,19,0.4) 0%, rgba(180,100,30,0.3) 50%, rgba(139,69,19,0.2) 100%)'
                          : 'transparent',
                        borderLeft: location === item.path ? '3px solid rgba(218,165,32,0.8)' : '3px solid transparent'
                      }}
                    >
                      {/* Glow effect for active item */}
                      {location === item.path && (
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                      )}
                      {!sidebarCollapsed && (
                        <span className="text-xs text-amber-800/60 font-mono w-5">{item.number}</span>
                      )}
                      <span className={cn(
                        "transition-colors",
                        location === item.path ? "text-amber-300" : "text-amber-600/70 group-hover:text-amber-400"
                      )}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <span className="font-medium tracking-wide text-sm">{item.label}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className="bg-stone-900 border-amber-800/50 p-2 max-w-[200px]"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  >
                    <p className="text-amber-200 text-xs font-medium">{item.label}</p>
                    <p className="text-amber-600/80 text-xs mt-1">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>

          {/* Warlord Card - Fantasy Themed */}
          <div className={cn(
            "border-t border-amber-900/30 transition-all duration-300",
            sidebarCollapsed ? "p-2" : "p-3"
          )}
          style={{
            background: 'linear-gradient(0deg, rgba(139,69,19,0.15) 0%, transparent 100%)'
          }}
          >
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/wallet" className="block relative z-50">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 flex items-center justify-center shadow-lg shadow-purple-900/50 border border-purple-500/30 hover:from-purple-500 hover:to-pink-700 transition-all cursor-pointer">
                      <Wallet className="w-5 h-5 text-purple-200" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-stone-900 border-amber-800/50">
                  <p className="text-amber-200 text-xs">{(account?.gbuxBalance || 0).toLocaleString()} GBUX</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div 
                className="relative rounded-lg overflow-hidden border border-amber-800/40" 
                data-testid="warlord-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,20,15,0.95) 0%, rgba(45,30,20,0.9) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(218,165,32,0.1), 0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20"
                  style={{ backgroundImage: `url(${accountPanelBg})` }}
                />
                
                <div className="relative z-10 p-3 pt-[8px] pb-[8px]">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href="/account" className="cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-avatar-settings">
                      {account?.avatarUrl ? (
                        <img 
                          src={account.avatarUrl} 
                          alt="Avatar" 
                          className="w-11 h-11 rounded-lg ring-2 ring-amber-600/50 object-cover shadow-lg"
                        />
                      ) : characters[0]?.id ? (
                        <img 
                src={`/api/game/characters/${characters[0].id}/avatar`}
                          alt="Avatar" 
                          className="w-11 h-11 rounded-lg ring-2 ring-amber-600/50 object-cover shadow-lg"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center ring-2 ring-amber-600/50 shadow-lg">
                          <span className="text-lg font-bold text-white drop-shadow-lg font-cinzel">
                            {(account?.displayName || "W")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-amber-100 truncate font-cinzel" data-testid="text-warlord-name">
                        {account?.displayName || "Warlord"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500/80">
                        <Sparkles className="w-3 h-3" />
                        <span data-testid="text-warlord-level">Level {warlordStats.level}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* GBUX Display */}
                  <div className="mb-3">
                    <div className="flex items-center justify-center gap-2 text-sm rounded-lg py-1.5 px-3"
                         style={{
                           background: 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                           border: '1px solid rgba(212,175,55,0.4)'
                         }}>
                      <img 
                        src={assetUrl("/sprites/gbux-token.png")} 
                        alt="GBUX" 
                        className="w-6 h-6 rounded-full shadow-lg shadow-cyan-500/30"
                      />
                      <span className="text-cyan-200 font-bold" data-testid="text-gbux">
                        {(account?.gbuxBalance || 0).toLocaleString()}
                      </span>
                      <span className="text-cyan-400/70 text-xs">GBUX</span>
                    </div>
                  </div>
                  
                  {/* XP Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600/80 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Experience
                      </span>
                      <span className="text-amber-400 font-mono text-[10px]">
                        {warlordStats.xp.toLocaleString()}/{warlordStats.xpForNext.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden"
                         style={{ 
                           background: 'rgba(0,0,0,0.5)',
                           boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                         }}>
                      <div 
                        className="h-full rounded-full transition-all duration-500 relative"
                        style={{ 
                          width: `${Math.min(xpPercentage, 100)}%`,
                          background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                        }}
                        data-testid="progress-xp"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-700/60 text-center">
                      {warlordStats.totalXp.toLocaleString()} Total XP
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-900/30">
                    <Link href="/wallet" className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity">
                      <Shield className="w-3.5 h-3.5 text-amber-600/70" />
                      <span className="text-amber-600/70 hover:text-amber-400" data-testid="text-hero-count">{characters.length} Heroes</span>
                    </Link>
                    <Link href="/wallet">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-amber-400 hover:text-amber-200 hover:bg-amber-800/30"
                        data-testid="btn-wallet"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1" />
                        Wallet
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
