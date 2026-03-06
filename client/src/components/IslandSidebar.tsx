import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Character } from "@/lib/characterManager";
import { 
  CharacterStateData, 
  STATE_DISPLAY_NAMES, 
  STATE_COLORS,
  STAMINA_CONFIG,
  needsSleep,
} from "@/lib/characterState";
import * as professionSystem from "@/lib/professionSystem";
import { 
  Users, 
  ScrollText, 
  ChevronLeft, 
  Zap, 
  Moon,
  TreePine,
  Pickaxe,
  Fish,
  Leaf,
  Scissors,
  ChefHat,
  Hammer,
  Sparkles,
  Shield,
  Gem,
  FlaskConical,
} from "lucide-react";

interface ActivityLogEntry {
  id: string;
  timestamp: number;
  heroName: string;
  action: string;
  details?: string;
  type: 'harvest' | 'loot' | 'level' | 'sleep' | 'wake' | 'error';
}

interface IslandSidebarProps {
  characters: Character[];
  characterStates: Record<string, CharacterStateData>;
  activityLog: ActivityLogEntry[];
  selectedHeroId: string | null;
  onSelectHero: (heroId: string | null) => void;
  onHeroSettingsClick: (heroId: string) => void;
}

const PROFESSION_ICONS: Record<string, React.ReactNode> = {
  Mining: <Pickaxe className="w-4 h-4" />,
  Logging: <TreePine className="w-4 h-4" />,
  Herbalism: <Leaf className="w-4 h-4" />,
  Fishing: <Fish className="w-4 h-4" />,
  Skinning: <Scissors className="w-4 h-4" />,
  Blacksmithing: <Hammer className="w-4 h-4" />,
  Armorsmithing: <Shield className="w-4 h-4" />,
  Tailoring: <ChefHat className="w-4 h-4" />,
  Jewelcrafting: <Gem className="w-4 h-4" />,
  Enchanting: <Sparkles className="w-4 h-4" />,
  Alchemy: <FlaskConical className="w-4 h-4" />,
};

const GATHERING_PROFESSIONS = ['Mining', 'Logging', 'Herbalism', 'Fishing', 'Skinning'];

interface ProfessionTreeProps {
  profession: string;
  level: number;
  xp: number;
  onBack: () => void;
}

function ProfessionTree({ profession, level, xp, onBack }: ProfessionTreeProps) {
  const { xpInLevel, xpForNextLevel } = professionSystem.calculateLevelFromXp(xp);
  const progressPercent = level >= 100 ? 100 : (xpInLevel / xpForNextLevel) * 100;
  
  const milestones = [
    { level: 1, name: "Novice", unlocks: "Basic gathering" },
    { level: 10, name: "Apprentice", unlocks: "Rare nodes visible" },
    { level: 25, name: "Journeyman", unlocks: "10% faster gathering" },
    { level: 50, name: "Expert", unlocks: "Epic nodes visible" },
    { level: 75, name: "Master", unlocks: "25% faster gathering" },
    { level: 100, name: "Grandmaster", unlocks: "Legendary nodes + 50% bonus" },
  ];
  
  return (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack}
        className="text-slate-400 hover:text-white -ml-2"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Character
      </Button>
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
          {PROFESSION_ICONS[profession] || <Pickaxe className="w-6 h-6 text-white" />}
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">{profession}</h3>
          <div className="text-sm text-amber-400">Level {level}</div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>XP Progress</span>
          <span>{xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-300">Milestones</h4>
        <div className="space-y-1">
          {milestones.map((m) => {
            const isUnlocked = level >= m.level;
            const isCurrent = level >= m.level && (milestones.find(next => next.level > m.level)?.level ?? 101) > level;
            
            return (
              <div 
                key={m.level}
                className={cn(
                  "p-2 rounded-lg border text-xs",
                  isUnlocked 
                    ? isCurrent 
                      ? "bg-amber-900/50 border-amber-500 text-amber-100"
                      : "bg-green-900/30 border-green-700 text-green-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-500"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold">Lv{m.level} - {m.name}</span>
                  {isUnlocked && <Badge className="text-[9px] bg-green-600">Unlocked</Badge>}
                </div>
                <div className="text-[10px] mt-0.5 opacity-75">{m.unlocks}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CharacterInfoPanelProps {
  hero: Character;
  state: CharacterStateData | undefined;
}

function CharacterInfoPanel({ hero, state }: CharacterInfoPanelProps) {
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  
  const profLevels = (hero as any).professionLevels as Record<string, professionSystem.ProfessionLevel> || {};
  const stamina = state?.stamina ?? STAMINA_CONFIG.maxStamina;
  const staminaPercent = (stamina / STAMINA_CONFIG.maxStamina) * 100;
  const isLowStamina = needsSleep(stamina);
  
  if (selectedProfession && profLevels[selectedProfession]) {
    const data = profLevels[selectedProfession];
    return (
      <ProfessionTree
        profession={selectedProfession}
        level={data.level}
        xp={data.xp}
        onBack={() => setSelectedProfession(null)}
      />
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 shadow-lg",
          "bg-gradient-to-br from-amber-500 to-orange-700 border-amber-400"
        )}>
          {hero.avatarUrl ? (
            <img src={hero.avatarUrl} className="w-full h-full rounded-full object-cover" alt={hero.name} />
          ) : (
            hero.name.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-white">{hero.name}</h3>
          <div className="text-xs text-slate-400">Level {hero.level} {hero.classId}</div>
          {state && (
            <Badge className={cn("text-[10px] mt-1", STATE_COLORS[state.state])}>
              {STATE_DISPLAY_NAMES[state.state]}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-300">
            <Zap className="w-3 h-3 text-yellow-400" /> Stamina
          </span>
          <span className={cn(
            isLowStamina ? "text-red-400" : "text-slate-400"
          )}>
            {Math.floor(stamina)} / {STAMINA_CONFIG.maxStamina}
          </span>
        </div>
        <Progress 
          value={staminaPercent} 
          className={cn("h-2", isLowStamina && "bg-red-900/50")}
        />
        {isLowStamina && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <Moon className="w-3 h-3" /> Needs rest!
          </div>
        )}
      </div>
      
      {state && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-slate-500">Harvests</div>
            <div className="text-lg font-bold text-white">{state.harvestCount}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-slate-500">XP Earned</div>
            <div className="text-lg font-bold text-amber-400">{state.totalXpEarned}</div>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1">
          <TreePine className="w-4 h-4 text-green-400" /> Gathering Professions
        </h4>
        <div className="space-y-1">
          {GATHERING_PROFESSIONS.map(prof => {
            const data = profLevels[prof];
            const level = data?.level ?? 0;
            const xp = data?.xp ?? 0;
            const { xpInLevel, xpForNextLevel } = professionSystem.calculateLevelFromXp(xp);
            const progress = level >= 100 ? 100 : (xpInLevel / xpForNextLevel) * 100;
            
            return (
              <div 
                key={prof}
                onClick={() => level > 0 && setSelectedProfession(prof)}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  level > 0 
                    ? "bg-slate-800/60 border-slate-600 cursor-pointer hover:border-amber-500 hover:bg-slate-700/60"
                    : "bg-slate-900/40 border-slate-700/50 opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {PROFESSION_ICONS[prof]}
                    <span className="text-sm text-white">{prof}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Lv {level}
                  </Badge>
                </div>
                {level > 0 && (
                  <Progress value={progress} className="h-1 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
        {Object.keys(profLevels).length === 0 && (
          <div className="text-xs text-slate-500 text-center py-2">
            Start harvesting to level up professions!
          </div>
        )}
      </div>
    </div>
  );
}

export default function IslandSidebar({
  characters,
  characterStates,
  activityLog,
  selectedHeroId,
  onSelectHero,
  onHeroSettingsClick,
}: IslandSidebarProps) {
  const [activeTab, setActiveTab] = useState<'heroes' | 'log'>('heroes');
  const [viewingHeroId, setViewingHeroId] = useState<string | null>(null);
  
  const selectedHero = characters.find(c => c.id === viewingHeroId);
  const selectedState = viewingHeroId ? characterStates[viewingHeroId] : undefined;
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getLogTypeColor = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'harvest': return 'text-green-400';
      case 'loot': return 'text-amber-400';
      case 'level': return 'text-purple-400';
      case 'sleep': return 'text-indigo-400';
      case 'wake': return 'text-cyan-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };
  
  return (
    <Card className="bg-slate-900/90 border-slate-700 h-full flex flex-col" data-testid="island-sidebar">
      <CardHeader className="pb-2 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'heroes' | 'log')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="heroes" className="text-xs" data-testid="tab-heroes">
              <Users className="w-3 h-3 mr-1" /> Heroes
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs" data-testid="tab-log">
              <ScrollText className="w-3 h-3 mr-1" /> Activity Log
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {activeTab === 'heroes' && (
          <>
            {viewingHeroId && selectedHero ? (
              <div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewingHeroId(null)}
                  className="text-slate-400 hover:text-white -ml-2 mb-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Heroes
                </Button>
                <CharacterInfoPanel hero={selectedHero} state={selectedState} />
              </div>
            ) : (
              <div className="space-y-2">
                {characters.slice(0, 5).map(hero => {
                  const state = characterStates[hero.id];
                  const stamina = state?.stamina ?? STAMINA_CONFIG.maxStamina;
                  const isSelected = selectedHeroId === hero.id;
                  const isLowStamina = needsSleep(stamina);
                  
                  return (
                    <div 
                      key={hero.id}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all cursor-pointer",
                        isSelected 
                          ? "bg-amber-900/60 border-amber-400"
                          : "bg-slate-800/60 border-slate-600 hover:border-slate-500"
                      )}
                      onClick={() => onSelectHero(isSelected ? null : hero.id)}
                      data-testid={`hero-sidebar-${hero.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2",
                          isSelected 
                            ? "bg-gradient-to-br from-amber-500 to-orange-700 border-amber-400"
                            : "bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500"
                        )}>
                          {hero.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate text-sm flex items-center gap-1">
                            {hero.name}
                            {state && (
                              <Badge className={cn("text-[8px] px-1", STATE_COLORS[state.state])}>
                                {STATE_DISPLAY_NAMES[state.state]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Progress 
                              value={(stamina / STAMINA_CONFIG.maxStamina) * 100} 
                              className={cn("h-1 w-16", isLowStamina && "bg-red-900")}
                            />
                            <span className={cn(
                              "text-[10px]",
                              isLowStamina ? "text-red-400" : "text-slate-400"
                            )}>
                              {Math.floor(stamina)}⚡
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingHeroId(hero.id);
                          }}
                          className="text-xs px-2 py-1 h-7"
                          data-testid={`view-hero-${hero.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'log' && (
          <div className="space-y-1">
            {activityLog.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">
                No activity yet. Assign heroes to harvest resources!
              </div>
            ) : (
              activityLog.slice(0, 50).map(entry => (
                <div 
                  key={entry.id}
                  className="p-2 bg-slate-800/50 rounded text-xs border border-slate-700/50"
                >
                  <div className="flex justify-between items-start">
                    <span className={cn("font-medium", getLogTypeColor(entry.type))}>
                      {entry.heroName}
                    </span>
                    <span className="text-slate-500 text-[10px]">{formatTime(entry.timestamp)}</span>
                  </div>
                  <div className="text-slate-300">{entry.action}</div>
                  {entry.details && (
                    <div className="text-slate-500 text-[10px] mt-0.5">{entry.details}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { ActivityLogEntry };
