import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sword, Zap, Target, Shield, Sparkles, Lock, Unlock,
  Flame, Snowflake, Wind, Sun, Leaf, Ghost
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeaponArsenal, WeaponAbility, WeaponPassive, ElementType } from "@shared/definitions/weaponArsenal";
import { getWeaponStatsAtTier, getUnlockedPassives, getAbilityDamageAtTier } from "@shared/definitions/weaponArsenal";

interface WeaponArsenalCardProps {
  weapon: WeaponArsenal;
  tier?: number;
  showAbilities?: boolean;
  compact?: boolean;
}

const BAR_COLORS = {
  damage: { bg: 'bg-red-900', fill: 'bg-gradient-to-r from-red-600 to-red-400', icon: Sword },
  speed: { bg: 'bg-yellow-900', fill: 'bg-gradient-to-r from-yellow-600 to-yellow-400', icon: Zap },
  combo: { bg: 'bg-purple-900', fill: 'bg-gradient-to-r from-purple-600 to-purple-400', icon: Sparkles },
  crit: { bg: 'bg-orange-900', fill: 'bg-gradient-to-r from-orange-600 to-orange-400', icon: Target },
  block: { bg: 'bg-blue-900', fill: 'bg-gradient-to-r from-blue-600 to-blue-400', icon: Shield },
  defense: { bg: 'bg-slate-700', fill: 'bg-gradient-to-r from-slate-500 to-slate-400', icon: Shield }
};

const ELEMENT_ICONS: Record<ElementType, typeof Flame> = {
  fire: Flame,
  ice: Snowflake,
  lightning: Zap,
  arcane: Ghost,
  holy: Sun,
  nature: Leaf,
  physical: Sword
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-slate-300 border-slate-500',
  2: 'text-green-400 border-green-500',
  3: 'text-blue-400 border-blue-500',
  4: 'text-purple-400 border-purple-500',
  5: 'text-orange-400 border-orange-500',
  6: 'text-red-400 border-red-500',
  7: 'text-pink-400 border-pink-500',
  8: 'text-yellow-400 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
};

function StatBar({ 
  name, 
  value, 
  barKey 
}: { 
  name: string; 
  value: number; 
  barKey: keyof typeof BAR_COLORS;
}) {
  const config = BAR_COLORS[barKey];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-xs text-slate-400 w-14 capitalize">{name}</span>
      <div className={cn("flex-1 h-2 rounded-full", config.bg)}>
        <div 
          className={cn("h-full rounded-full transition-all duration-300", config.fill)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 w-8 text-right">{value}</span>
    </div>
  );
}

function AbilityCard({ 
  ability, 
  weapon, 
  tier, 
  isLocked = false 
}: { 
  ability: WeaponAbility; 
  weapon: WeaponArsenal; 
  tier: number;
  isLocked?: boolean;
}) {
  const damage = getAbilityDamageAtTier(ability, weapon, tier);
  const ElementIcon = ability.element ? ELEMENT_ICONS[ability.element] : Sword;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "p-2 rounded border transition-all cursor-help",
            isLocked 
              ? "bg-slate-800/50 border-slate-700 opacity-50" 
              : "bg-slate-800 border-slate-600 hover:border-amber-500/50"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isLocked ? (
                <Lock className="w-4 h-4 text-slate-500" />
              ) : (
                <ElementIcon className={cn(
                  "w-4 h-4",
                  ability.element === 'fire' && "text-orange-400",
                  ability.element === 'ice' && "text-cyan-400",
                  ability.element === 'lightning' && "text-yellow-400",
                  ability.element === 'arcane' && "text-purple-400",
                  ability.element === 'holy' && "text-amber-300",
                  ability.element === 'nature' && "text-green-400",
                  !ability.element && "text-slate-400"
                )} />
              )}
              <span className={cn(
                "text-sm font-medium truncate",
                isLocked ? "text-slate-500" : "text-amber-100"
              )}>
                {ability.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-red-400">{damage} DMG</span>
              {ability.manaCost > 0 && <span className="text-blue-400">{ability.manaCost} MP</span>}
              {ability.staminaCost > 0 && <span className="text-green-400">{ability.staminaCost} SP</span>}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-slate-900 border-slate-700">
          <p className="font-semibold text-amber-400">{ability.name}</p>
          <p className="text-sm text-slate-300 mt-1">{ability.description}</p>
          {ability.effects && ability.effects.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-400">Effects:</p>
              <ul className="text-xs text-purple-300">
                {ability.effects.map((e, i) => <li key={i}>• {e.replace(/_/g, ' ')}</li>)}
              </ul>
            </div>
          )}
          {ability.cooldown > 0 && (
            <p className="text-xs text-slate-400 mt-1">Cooldown: {ability.cooldown} turns</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PassiveCard({ 
  passive, 
  isUnlocked 
}: { 
  passive: WeaponPassive; 
  isUnlocked: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 p-2 rounded border transition-all cursor-help",
            isUnlocked
              ? "bg-purple-900/30 border-purple-600/50"
              : "bg-slate-800/50 border-slate-700 opacity-50"
          )}>
            {isUnlocked ? (
              <Unlock className="w-4 h-4 text-purple-400" />
            ) : (
              <Lock className="w-4 h-4 text-slate-500" />
            )}
            <span className={cn(
              "text-sm",
              isUnlocked ? "text-purple-200" : "text-slate-500"
            )}>
              {passive.name}
            </span>
            {!isUnlocked && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-500 ml-auto">
                T{passive.unlockTier}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-slate-900 border-slate-700">
          <p className="font-semibold text-purple-400">{passive.name}</p>
          <p className="text-sm text-slate-300 mt-1">{passive.description}</p>
          <p className="text-xs text-slate-400 mt-1">Unlocks at Tier {passive.unlockTier}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WeaponArsenalCard({ 
  weapon, 
  tier = 1, 
  showAbilities = true,
  compact = false 
}: WeaponArsenalCardProps) {
  const [selectedTier, setSelectedTier] = useState(tier);
  const stats = getWeaponStatsAtTier(weapon, selectedTier);
  const unlockedPassives = getUnlockedPassives(weapon, selectedTier);
  const tierColor = TIER_COLORS[selectedTier];
  
  if (compact) {
    return (
      <Card className="bg-slate-800/50 border-slate-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-100 text-lg">{weapon.name}</CardTitle>
            <Badge variant="outline" className={tierColor}>T{selectedTier}</Badge>
          </div>
          <p className="text-xs text-slate-400">{weapon.weaponType} • {weapon.hand}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(weapon.bars).map(([key, value]) => (
            <StatBar key={key} name={key} value={value} barKey={key as keyof typeof BAR_COLORS} />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      "bg-slate-900/80 border-2 transition-all",
      TIER_COLORS[selectedTier].split(' ')[1]
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-amber-100 text-xl font-['Cinzel']">{weapon.name}</CardTitle>
            <p className="text-sm text-slate-400 capitalize">{weapon.weaponType} • {weapon.hand}</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-lg px-3 py-1", tierColor)}
          >
            Tier {selectedTier}
          </Badge>
        </div>
        <p className="text-sm text-slate-300 italic mt-2">{weapon.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(t => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={cn(
                "flex-1 py-1 text-xs rounded transition-all",
                t === selectedTier
                  ? "bg-amber-600 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              )}
            >
              T{t}
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">Weapon Stats</h4>
          {Object.entries(weapon.bars).map(([key, value]) => (
            <StatBar key={key} name={key} value={value} barKey={key as keyof typeof BAR_COLORS} />
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 rounded p-2">
            <span className="text-slate-400">Physical DMG</span>
            <span className="float-right text-red-400">{stats.physicalDamage}</span>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <span className="text-slate-400">Magic DMG</span>
            <span className="float-right text-purple-400">{stats.magicalDamage}</span>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <span className="text-slate-400">Crit Chance</span>
            <span className="float-right text-orange-400">{stats.critChance}%</span>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <span className="text-slate-400">Crit Damage</span>
            <span className="float-right text-orange-300">{stats.critDamage}%</span>
          </div>
        </div>
        
        {showAbilities && (
          <Tabs defaultValue="abilities" className="mt-4">
            <TabsList className="w-full bg-slate-800">
              <TabsTrigger value="abilities" className="flex-1">Abilities</TabsTrigger>
              <TabsTrigger value="passives" className="flex-1">Passives</TabsTrigger>
            </TabsList>
            
            <TabsContent value="abilities" className="mt-2 space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase">Basic Attack</p>
                <AbilityCard ability={weapon.basicAttack} weapon={weapon} tier={selectedTier} />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase">Signature</p>
                <AbilityCard ability={weapon.signature} weapon={weapon} tier={selectedTier} />
              </div>
              
              {weapon.attacks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase">Attacks</p>
                  <div className="grid grid-cols-1 gap-1">
                    {weapon.attacks.map((atk, i) => (
                      <AbilityCard 
                        key={atk.id} 
                        ability={atk} 
                        weapon={weapon} 
                        tier={selectedTier}
                        isLocked={selectedTier < (i + 1) * 2}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {weapon.spells.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase">Spells</p>
                  <div className="grid grid-cols-1 gap-1">
                    {weapon.spells.map((spell, i) => (
                      <AbilityCard 
                        key={spell.id} 
                        ability={spell} 
                        weapon={weapon} 
                        tier={selectedTier}
                        isLocked={selectedTier < (i + 1) * 2}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="passives" className="mt-2 space-y-2">
              {weapon.passives.map(passive => (
                <PassiveCard 
                  key={passive.id}
                  passive={passive}
                  isUnlocked={unlockedPassives.some(p => p.id === passive.id)}
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
        
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
          Crafted by: <span className="text-amber-400">{weapon.craftedBy}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeaponArsenalCard;
