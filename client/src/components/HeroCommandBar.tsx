import { useState } from 'react';
import { Character } from '@/lib/characterManager';
import { CharacterStateData, STAMINA_CONFIG, STATE_COLORS, STATE_DISPLAY_NAMES } from '@/lib/characterState';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RACES, CLASSES } from '@/lib/gameData';
import * as professionSystem from '@/lib/professionSystem';
import { Eye, Settings, Zap, Moon, Pickaxe, Users, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroCommandBarProps {
  heroes: Character[];
  selectedHeroId: string | null;
  onSelectHero: (heroId: string | null) => void;
  onFocusHero: (heroId: string) => void;
  onSettingsHero: (heroId: string) => void;
  onRecallHero?: (heroId: string) => void;
  characterStates: Record<string, CharacterStateData>;
  assignedHeroIds: Set<string>;
  heroAutoMode: Record<string, boolean>;
  assignedNodes: Record<string, { name: string; icon: string } | undefined>;
}

export function HeroCommandBar({
  heroes,
  selectedHeroId,
  onSelectHero,
  onFocusHero,
  onSettingsHero,
  onRecallHero,
  characterStates,
  assignedHeroIds,
  heroAutoMode,
  assignedNodes,
}: HeroCommandBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="pointer-events-auto">
        <div className="bg-gradient-to-t from-slate-900/95 via-slate-900/90 to-transparent pt-4 pb-2 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-center gap-2 flex-wrap">
              <TooltipProvider delayDuration={100}>
                {heroes.map((hero) => {
                  const isSelected = selectedHeroId === hero.id;
                  const isAssigned = assignedHeroIds.has(hero.id);
                  const state = characterStates[hero.id];
                  const stamina = state?.stamina ?? STAMINA_CONFIG.maxStamina;
                  const staminaPercent = (stamina / STAMINA_CONFIG.maxStamina) * 100;
                  const isSleeping = state?.state === 'sleeping';
                  const isAuto = heroAutoMode[hero.id];
                  const assignedNode = assignedNodes[hero.id];
                  const race = RACES.find(r => r.id === hero.raceId);

                  return (
                    <Tooltip key={hero.id}>
                      <TooltipTrigger asChild>
                        <motion.div
                          layout
                          className={cn(
                            "relative cursor-pointer transition-all duration-200",
                            isSelected ? "scale-110 z-10" : "hover:scale-105"
                          )}
                          onClick={() => onSelectHero(isSelected ? null : hero.id)}
                          data-testid={`hero-portrait-${hero.id}`}
                        >
                          <div
                            className={cn(
                              "w-16 h-16 rounded-full border-4 overflow-hidden shadow-lg transition-all",
                              isSelected
                                ? "border-amber-400 ring-4 ring-amber-400/40"
                                : isAssigned
                                  ? "border-green-500"
                                  : isSleeping
                                    ? "border-purple-500"
                                    : "border-slate-600 hover:border-slate-400"
                            )}
                          >
                            {hero.avatarUrl ? (
                              <img
                                src={hero.avatarUrl}
                                className="w-full h-full object-cover"
                                alt={hero.name}
                              />
                            ) : (
                              <div className={cn(
                                "w-full h-full flex items-center justify-center text-white font-bold text-xl",
                                isAssigned
                                  ? "bg-gradient-to-br from-green-600 to-green-800"
                                  : isSelected
                                    ? "bg-gradient-to-br from-amber-500 to-orange-700"
                                    : "bg-gradient-to-br from-slate-600 to-slate-800"
                              )}>
                                {hero.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <svg
                            className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90"
                            viewBox="0 0 36 36"
                          >
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="rgba(0,0,0,0.5)"
                              strokeWidth="2"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke={staminaPercent > 50 ? "#22c55e" : staminaPercent > 20 ? "#eab308" : "#ef4444"}
                              strokeWidth="2"
                              strokeDasharray={`${staminaPercent} ${100 - staminaPercent}`}
                              strokeLinecap="round"
                              className="transition-all duration-300"
                            />
                          </svg>

                          {isSleeping && (
                            <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-1 shadow-lg">
                              <Moon className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {isAuto && !isSleeping && (
                            <div className="absolute -top-1 -right-1 bg-cyan-600 rounded-full p-1 shadow-lg">
                              <Zap className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {isAssigned && assignedNode && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-700 rounded-full px-1.5 py-0.5 text-xs shadow-lg border border-green-500">
                              <span>{assignedNode.icon}</span>
                            </div>
                          )}

                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className={cn(
                              "text-[10px] font-medium px-1 rounded",
                              isSelected ? "text-amber-400" : "text-slate-400"
                            )}>
                              {hero.name.length > 8 ? hero.name.slice(0, 7) + '…' : hero.name}
                            </span>
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-slate-800 border-slate-600 p-3 max-w-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{hero.name}</span>
                            <Badge variant="outline" className="text-[10px] border-slate-500">
                              Lv{hero.level}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-400">
                            {race?.name} {CLASSES.find(c => c.id === hero.classId)?.name}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all",
                                  staminaPercent > 50 ? "bg-green-500" : staminaPercent > 20 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${staminaPercent}%` }}
                              />
                            </div>
                            <span className="text-slate-300">{Math.round(stamina)}/{STAMINA_CONFIG.maxStamina}</span>
                          </div>

                          {state && (
                            <div className={cn("text-xs px-2 py-0.5 rounded", STATE_COLORS[state.state])}>
                              {STATE_DISPLAY_NAMES[state.state]}
                            </div>
                          )}

                          {isAssigned && assignedNode && (
                            <div className="text-xs text-green-400 flex items-center gap-1">
                              <Pickaxe className="w-3 h-3" />
                              Harvesting {assignedNode.name}
                            </div>
                          )}

                          <div className="flex gap-1 pt-1 border-t border-slate-700">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs flex-1"
                              onClick={(e) => { e.stopPropagation(); onFocusHero(hero.id); }}
                              data-testid={`btn-focus-hero-${hero.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Focus
                            </Button>
                            {isAssigned && onRecallHero && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs flex-1 text-amber-400 hover:text-amber-300"
                                onClick={(e) => { e.stopPropagation(); onRecallHero(hero.id); }}
                                data-testid={`btn-recall-hero-${hero.id}`}
                              >
                                <Home className="w-3 h-3 mr-1" /> Recall
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs flex-1"
                              onClick={(e) => { e.stopPropagation(); onSettingsHero(hero.id); }}
                              data-testid={`btn-settings-hero-${hero.id}`}
                            >
                              <Settings className="w-3 h-3 mr-1" /> Settings
                            </Button>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {heroes.length === 0 && (
                  <div className="text-slate-500 text-sm flex items-center gap-2 py-4">
                    <Users className="w-4 h-4" />
                    No heroes available
                  </div>
                )}
              </TooltipProvider>
            </div>

            <div className="text-center mt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {heroes.length} Heroes • Click to select • Hover for details
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroCommandBar;
