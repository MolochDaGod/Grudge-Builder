import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Book, Shield, Pickaxe, Sword, Leaf, Hammer, Gem, Settings, Wallet, Sparkles, ExternalLink, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager } from "@/lib/characterManager";
import { useAccount } from "@/hooks/use-account";
import { assetUrl } from "@/lib/assetConfig";

// Images served from public/assets/ui/
const signPlank = assetUrl("/images/ui/single_wooden_hanging_sign_plank.png");
const headerSign = assetUrl("/images/ui/ornate_header_sign_for_logo.png");
const chainLink = assetUrl("/images/ui/iron_chain_link_connector.png");
const accountPanelBg = assetUrl("/images/ui/fantasy_rpg_account_panel_background.png");

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavItemConfig extends NavItem {
  scale: number;
  chainsAfter: number;
}

const navItems: NavItemConfig[] = [
  { label: "HOME", path: "/home", icon: <Book className="w-4 h-4" />, scale: 1.55 * 0.82, chainsAfter: 2 },
  { label: "CHARACTER", path: "/character", icon: <Shield className="w-4 h-4" />, scale: 1.7 * 0.82, chainsAfter: 2 },
  { label: "DUNGEON", path: "/dungeon", icon: <Pickaxe className="w-4 h-4" />, scale: 1.6 * 0.82, chainsAfter: 3 },
  { label: "COMBAT", path: "/combat", icon: <Sword className="w-4 h-4" />, scale: 1.75 * 0.82, chainsAfter: 1 },
  { label: "ISLAND", path: "/island", icon: <Leaf className="w-4 h-4" />, scale: 1.65 * 0.82, chainsAfter: 1 },
  { label: "PROFESSIONS", path: "/professions", icon: <Hammer className="w-4 h-4" />, scale: 1.55 * 0.82, chainsAfter: 2 },
  { label: "SKILLS", path: "/skill-tree", icon: <Gem className="w-4 h-4" />, scale: 1.6 * 0.82, chainsAfter: 2 },
  { label: "DATABASE", path: "/database", icon: <Book className="w-4 h-4" />, scale: 1.55 * 0.82, chainsAfter: 1 },
  { label: "ADMIN", path: "/admin", icon: <Settings className="w-4 h-4" />, scale: 1.5 * 0.82, chainsAfter: 0 },
];

function SwayingSign({ 
  children, 
  isActive, 
  onClick,
  delay = 0 
}: { 
  children: React.ReactNode; 
  isActive: boolean;
  onClick: () => void;
  delay?: number;
}) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = useCallback(() => {
    setIsClicked(true);
    onClick();
    setTimeout(() => setIsClicked(false), 800);
  }, [onClick]);

  return (
    <motion.div
      className="relative cursor-pointer"
      initial={{ rotate: 0 }}
      animate={isClicked ? {
        rotate: [0, -8, 6, -4, 2, 0],
        transition: { duration: 0.8, ease: "easeOut" }
      } : {
        rotate: [0, 1, -1, 0],
        transition: { 
          duration: 3 + delay, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: delay * 0.5
        }
      }}
      whileHover={{ 
        scale: 1.05,
        rotate: [-2, 2],
        transition: { duration: 0.3 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      style={{ transformOrigin: "top center" }}
    >
      {children}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            boxShadow: "0 0 20px 5px rgba(218,165,32,0.4), inset 0 0 15px rgba(255,193,7,0.2)",
          }}
        />
      )}
    </motion.div>
  );
}

// CSS wood-grain gradients (replacing missing /sprites/ui/wood_*.png)
const WOOD_GRADIENTS = {
  dark: 'linear-gradient(110deg, #3d2411 0%, #5a3520 15%, #4a2a18 30%, #5e3822 50%, #3d2411 70%, #4a2a18 85%, #3d2411 100%)',
  medium: 'linear-gradient(110deg, #6b4226 0%, #8b5e3c 15%, #7a4e30 30%, #8b5e3c 50%, #6b4226 70%, #7a4e30 85%, #6b4226 100%)',
  light: 'linear-gradient(110deg, #9b7340 0%, #c49b5a 15%, #ab8348 30%, #c49b5a 50%, #9b7340 70%, #ab8348 85%, #9b7340 100%)',
};

function getWoodGradient(index: number, isActive: boolean): string {
  if (isActive) return WOOD_GRADIENTS.light;
  if (index % 3 === 0) return WOOD_GRADIENTS.dark;
  if (index % 3 === 1) return WOOD_GRADIENTS.medium;
  return WOOD_GRADIENTS.light;
}

function SignButton({ item, index, isActive, scale = 1 }: { item: NavItemConfig; index: number; isActive: boolean; scale?: number }) {
  const [location, setLocation] = useLocation();
  const baseWidth = 180;
  const baseHeight = 44;
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const fontSize = 13 * scale;
  const iconSize = 16 * scale;
  
  return (
    <SwayingSign 
      isActive={isActive} 
      onClick={() => setLocation(item.path)}
      delay={index * 0.2}
    >
      <div 
        className="relative flex items-center justify-center overflow-hidden mt-[3px] mb-[3px] ml-[2px] mr-[2px]"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          background: getWoodGradient(index, isActive),
          border: '3px solid #1a1a1a',
          borderRadius: '8px',
          boxShadow: isActive 
            ? '0 0 20px rgba(255,200,50,0.5), 0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2)'
            : '0 4px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)'
        }}
      >
        {/* Wood grain texture overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(95deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 9px),
              repeating-linear-gradient(95deg, transparent, transparent 20px, rgba(255,255,255,0.04) 20px, rgba(255,255,255,0.04) 21px)`,
          }}
        />
        <div 
          className="relative z-10 flex items-center gap-2 font-cinzel font-black tracking-wide"
          style={{ 
            fontSize: `${fontSize}px`,
            color: '#1a1a1a',
            textShadow: '0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          <span style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
            {item.icon}
          </span>
          <span className="ml-3 mr-3 mt-[2px] mb-[2px]">{item.label}</span>
        </div>
      </div>
    </SwayingSign>
  );
}

function ChainConnector({ count = 1 }: { count?: number }) {
  return (
    <div className="flex justify-center gap-2 -my-1 relative z-0">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="w-4 h-5 rounded-full mt-[0px] mb-[0px] pt-[2px] pb-[2px]"
          style={{ 
            background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
            border: '2px solid #0a0a0a',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)'
          }}
        />
      ))}
    </div>
  );
}

export function FantasyNavigation() {
  const [location] = useLocation();
  
  return (
    <div className="flex flex-col items-center py-3">
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-2"
      >
        <SwayingSign isActive={false} onClick={() => {}} delay={0}>
          <div 
            className="relative flex flex-col items-center justify-center px-8 py-4 overflow-hidden"
            style={{ 
              width: '280px', 
              height: '100px',
              border: '4px solid #1a1a1a',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(255,200,50,0.6), 0 0 60px rgba(255,150,0,0.3), 0 8px 20px rgba(0,0,0,0.7), inset 0 3px 6px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <div 
              className="absolute inset-0"
              style={{ background: WOOD_GRADIENTS.dark }}
            />
            {/* Wood grain texture */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(95deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 9px)`,
              }}
            />
            <div className="relative z-10 text-center">
              <h1 
                className="font-cinzel font-black text-3xl tracking-widest"
                style={{ 
                  color: '#1a1a1a',
                  textShadow: '0 2px 0 rgba(255,255,255,0.6), 0 0 20px rgba(255,200,50,0.5), 0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                GRUDGE
              </h1>
              <p 
                className="font-cinzel font-bold text-base tracking-[0.5em] -mt-0.5"
                style={{ 
                  color: '#2a2a2a',
                  textShadow: '0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                WARLORDS
              </p>
            </div>
          </div>
        </SwayingSign>
      </motion.div>

      <ChainConnector count={3} />

      <AnimatePresence>
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Link href={item.path} className="block" data-testid={`nav-${item.label.toLowerCase()}`}>
              <SignButton 
                item={item} 
                index={index} 
                isActive={location === item.path}
                scale={item.scale}
              />
            </Link>
            {item.chainsAfter > 0 && <ChainConnector count={item.chainsAfter} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

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
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[level - 1] * 4;
  const xpIntoLevel = totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  
  return { level, xp: xpIntoLevel, xpForNext: xpNeeded, totalXp };
}

interface CharacterInfo {
  id: string;
  name: string;
  level: number;
}

function WarlordCard() {
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const { account } = useAccount();

  useEffect(() => {
    CharacterManager.getAll().then(chars => {
      setCharacters(chars);
    });
  }, []);

  const totalXp = account?.accountXp || characters.reduce((sum, c) => sum + ((c.level || 0) * 100), 0);
  const warlordStats = calculateWarlordLevel(totalXp);
  const xpPercentage = warlordStats.xpForNext > 0 ? (warlordStats.xp / warlordStats.xpForNext) * 100 : 0;

  return (
    <div 
      className="relative rounded-lg overflow-hidden border border-amber-800/40 mx-3 mb-3" 
      data-testid="warlord-card"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(218,165,32,0.1), 0 4px 12px rgba(0,0,0,0.4)'
      }}
    >
      <div 
        className="absolute inset-0"
        style={{ background: WOOD_GRADIENTS.dark }}
      />
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(95deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 9px)`,
        }}
      />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
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
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
            <div className="text-xs text-amber-500/80">
              Warlord Account
            </div>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 text-sm rounded-lg py-1.5 px-3"
               style={{
                 background: 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                 border: '1px solid rgba(212,175,55,0.4)'
               }}>
            <div className="flex items-center gap-1">
              <img 
                src={assetUrl("/sprites/gbux-token.png")} 
                alt="GBUX" 
                className="w-5 h-5 rounded-full shadow-lg shadow-cyan-500/30"
              />
              <span className="text-cyan-400/70 text-xs">GBUX</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 border border-amber-600/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-bold text-xs" data-testid="text-warlord-level">Lvl {warlordStats.level}</span>
            </div>
            <span className="text-cyan-200 font-bold" data-testid="text-gbux">
              {(account?.gbuxBalance || 0).toLocaleString()}
            </span>
          </div>
        </div>
        
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
  );
}

export function FantasySidebar({ children }: { children?: React.ReactNode }) {
  return (
    <aside 
      className="hidden md:flex flex-col h-screen sticky top-0 w-64 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/50"
      style={{
        background: 'linear-gradient(180deg, rgba(15,12,8,0.98) 0%, rgba(25,18,12,0.98) 50%, rgba(12,9,6,0.98) 100%)',
        borderRight: '2px solid rgba(139,69,19,0.4)',
        boxShadow: '2px 0 30px rgba(0,0,0,0.6)'
      }}
    >
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C6B30\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}
      />
      <div className="flex-1">
        <FantasyNavigation />
      </div>
      <WarlordCard />
      {/* CLIENT HUB link */}
      <a
        href="https://client.grudge-studio.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 mx-3 mb-3 px-3 py-2.5 rounded-lg border border-amber-700/30 hover:border-amber-500/50 transition-colors group"
        style={{ background: 'linear-gradient(90deg, rgba(120,60,10,0.3) 0%, rgba(80,40,8,0.2) 100%)' }}
      >
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-400" />
          <div>
            <div className="text-xs font-cinzel font-bold text-amber-400/80 group-hover:text-amber-300 leading-none">CLIENT HUB</div>
            <div className="text-[10px] text-amber-700/60 group-hover:text-amber-600/80 leading-none mt-0.5">client.grudge-studio.com</div>
          </div>
        </div>
        <ExternalLink className="w-3 h-3 text-amber-700/40 group-hover:text-amber-500/60" />
      </a>
      {children}
    </aside>
  );
}

export default FantasyNavigation;
