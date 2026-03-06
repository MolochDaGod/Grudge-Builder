import { useState, useMemo } from "react";
import { ProfessionData } from "@/lib/craftingTypes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpCircle, Coins, Gem, Hammer, Sparkles, Shield, Sword, Zap, ChevronRight } from "lucide-react";
import {
  TieredRecipe,
  TIER_MATERIALS,
  TIER_COSTS,
  getUpgradePath,
  getCraftingBonuses,
  getMaxCraftableTier,
  getRecipesByProfession,
  WEAPON_SETS,
  ARMOR_SETS,
  Tier,
} from "@/data/crafting/tieredCrafting";

interface UpgradeInterfaceProps {
  data: ProfessionData;
  unlockedSkills?: string[];
}

const INFUSION_OPTIONS = [
  { id: 'blood', name: 'Blood Essence', effect: '+5% Lifesteal', color: 'text-red-400' },
  { id: 'void', name: 'Void Essence', effect: '+5% Mana Drain', color: 'text-purple-400' },
  { id: 'iron', name: 'Iron Essence', effect: '+5% Thorns', color: 'text-slate-400' },
  { id: 'solar', name: 'Solar Essence', effect: '+5% Fire Dmg', color: 'text-orange-400' },
  { id: 'frost', name: 'Frost Essence', effect: '+5% Slow', color: 'text-cyan-400' },
  { id: 'shadow', name: 'Shadow Essence', effect: '+5% Crit', color: 'text-violet-400' },
];

const TIER_COLORS: Record<number, string> = {
  1: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
  2: 'text-green-400 bg-green-500/20 border-green-500/30',
  3: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  4: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  5: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  6: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  7: 'text-red-400 bg-red-500/20 border-red-500/30',
  8: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
};

function getWeaponIcon(subtype: string): string {
  if (subtype.includes('Sword')) return '⚔️';
  if (subtype.includes('Axe')) return '🪓';
  if (subtype.includes('Dagger')) return '🗡️';
  if (subtype.includes('Hammer')) return '🔨';
  if (subtype.includes('Bow')) return '🏹';
  if (subtype.includes('Crossbow')) return '🎯';
  if (subtype.includes('Gun')) return '🔫';
  if (subtype.includes('Staff')) return '🪄';
  return '⚔️';
}

function getArmorIcon(slot: string): string {
  if (slot === 'helm') return '🪖';
  if (slot === 'shoulder') return '🛡️';
  if (slot === 'chest') return '🦺';
  if (slot === 'hands') return '🧤';
  if (slot === 'feet') return '👢';
  if (slot === 'ring') return '💍';
  if (slot === 'necklace') return '📿';
  if (slot === 'relic') return '🔮';
  return '🛡️';
}

export function UpgradeInterface({ data, unlockedSkills = [] }: UpgradeInterfaceProps) {
  const [selectedBaseItem, setSelectedBaseItem] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>(1);
  const [infusion, setInfusion] = useState<string | null>(null);
  const [passiveStacks, setPassiveStacks] = useState(0);
  const [viewMode, setViewMode] = useState<'weapons' | 'armor'>('weapons');

  const professionRecipes = useMemo(() => {
    const professionMap: Record<string, 'Miner' | 'Forester' | 'Mystic' | 'Chef' | 'Engineer'> = {
      'miner': 'Miner',
      'forester': 'Forester', 
      'mystic': 'Mystic',
      'chef': 'Chef',
      'engineer': 'Engineer',
    };
    const normalizedName = data.name.toLowerCase().split(' ')[0];
    const profession = professionMap[normalizedName] || 'Miner';
    return getRecipesByProfession(profession);
  }, [data.name]);

  const uniqueBaseItems = useMemo(() => {
    const seen = new Set<string>();
    return professionRecipes
      .filter(r => {
        if (seen.has(r.baseId)) return false;
        seen.add(r.baseId);
        return true;
      })
      .filter(r => viewMode === 'weapons' ? r.type === 'weapon' : r.type === 'armor');
  }, [professionRecipes, viewMode]);

  const upgradePath = useMemo(() => {
    if (!selectedBaseItem) return [];
    return getUpgradePath(selectedBaseItem);
  }, [selectedBaseItem]);

  const currentRecipe = useMemo(() => {
    return upgradePath.find(r => r.tier === selectedTier) || null;
  }, [upgradePath, selectedTier]);

  const maxTier = useMemo(() => {
    if (!currentRecipe) return 6;
    return getMaxCraftableTier(unlockedSkills, currentRecipe.subtype);
  }, [unlockedSkills, currentRecipe]);

  const craftingBonuses = useMemo(() => {
    if (!currentRecipe) return { materialReduction: 0, successChanceBonus: 0, qualityBoostChance: 0, speedMultiplier: 1 };
    return getCraftingBonuses(unlockedSkills, currentRecipe);
  }, [unlockedSkills, currentRecipe]);

  const getCostMultiplier = () => Math.pow(1.5, passiveStacks);
  
  const adjustedSuccessChance = currentRecipe 
    ? Math.min(100, currentRecipe.successChance + craftingBonuses.successChanceBonus)
    : 100;

  const handleCraft = () => {
    if (!currentRecipe) return;
    console.log(`Crafting ${currentRecipe.name} with bonuses:`, craftingBonuses);
    if (selectedTier < 8 && selectedTier < maxTier) {
      setSelectedTier((selectedTier + 1) as Tier);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
      <Card className="lg:col-span-4 bg-slate-900/50 border-white/10 p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-uncial text-xl text-white flex items-center gap-2">
            <ArrowUpCircle className={data.color} /> Craftable Items
          </h3>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'weapons' ? 'default' : 'ghost'}
              onClick={() => setViewMode('weapons')}
              className="h-7 px-2"
              data-testid="toggle-weapons"
            >
              <Sword className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'armor' ? 'default' : 'ghost'}
              onClick={() => setViewMode('armor')}
              className="h-7 px-2"
              data-testid="toggle-armor"
            >
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {uniqueBaseItems.map((recipe) => (
              <motion.div
                key={recipe.baseId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`item-${recipe.baseId}`}
                onClick={() => {
                  setSelectedBaseItem(recipe.baseId);
                  setSelectedTier(1);
                }}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between group",
                  selectedBaseItem === recipe.baseId
                    ? "bg-amber-500/20 border-amber-500/50"
                    : "bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {recipe.type === 'weapon' ? getWeaponIcon(recipe.subtype) : getArmorIcon(recipe.slot || 'chest')}
                  </div>
                  <div>
                    <div className={cn("font-bold text-sm group-hover:text-white", selectedBaseItem === recipe.baseId ? "text-white" : "text-slate-300")}>
                      {recipe.name.replace(` T${recipe.tier}`, '')}
                    </div>
                    <div className="text-xs text-slate-500">{recipe.subtype} • T1-T8</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="lg:col-span-8 bg-slate-900 border-white/10 relative overflow-hidden flex flex-col">
        {currentRecipe ? (
          <div className="p-6 md:p-8 flex flex-col h-full z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold font-uncial text-white mb-2">{currentRecipe.name}</h2>
                <p className="text-sm text-slate-400 italic mb-3">{currentRecipe.description}</p>
                <div className="flex flex-wrap gap-2">
                  {upgradePath.map((recipe) => (
                    <Badge
                      key={recipe.tier}
                      data-testid={`tier-badge-${recipe.tier}`}
                      onClick={() => recipe.tier <= maxTier && setSelectedTier(recipe.tier)}
                      className={cn(
                        "cursor-pointer transition-all",
                        TIER_COLORS[recipe.tier],
                        recipe.tier === selectedTier && "ring-2 ring-white/50 scale-110",
                        recipe.tier > maxTier && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      T{recipe.tier}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-5xl bg-slate-800 p-4 rounded-xl border border-white/10 shadow-lg">
                {currentRecipe.type === 'weapon' ? getWeaponIcon(currentRecipe.subtype) : getArmorIcon(currentRecipe.slot || 'chest')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-auto">
              <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
                <h4 className={cn("text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2", data.color)}>
                  Required Materials
                </h4>
                
                <div className="space-y-3">
                  {Object.entries(currentRecipe.materials).map(([mat, count]) => {
                    const reducedCount = Math.ceil(count * (1 - craftingBonuses.materialReduction / 100));
                    return (
                      <div key={mat} className="flex justify-between items-center">
                        <span className="text-slate-300 flex items-center gap-2 text-sm">
                          <Hammer className="w-4 h-4 text-slate-400" /> {mat}
                        </span>
                        <span className="font-mono">
                          {craftingBonuses.materialReduction > 0 ? (
                            <>
                              <span className="text-green-400">{reducedCount}</span>
                              <span className="text-slate-600 line-through ml-1">{count}</span>
                            </>
                          ) : (
                            <span className="text-slate-200">{count}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-slate-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500" /> Gold
                    </span>
                    <span className="text-yellow-500 font-mono font-bold">
                      {Math.floor(TIER_COSTS.gold[selectedTier - 1] * getCostMultiplier()).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Success Chance</span>
                    <span className={adjustedSuccessChance >= 90 ? 'text-green-400' : adjustedSuccessChance >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                      {adjustedSuccessChance}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        adjustedSuccessChance >= 90 ? 'bg-green-500' : adjustedSuccessChance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      )} 
                      style={{ width: `${adjustedSuccessChance}%` }}
                    />
                  </div>
                  
                  {craftingBonuses.qualityBoostChance > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> Quality Boost
                      </span>
                      <span className="text-purple-400">{craftingBonuses.qualityBoostChance}% chance</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className={cn("text-xs font-bold uppercase mb-3 tracking-widest flex justify-between", data.color)}>
                  <span>Grudge Infusion</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Optional</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Infuse Essence</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                      value={infusion || ''}
                      onChange={(e) => setInfusion(e.target.value || null)}
                      data-testid="infusion-select"
                    >
                      <option value="">None</option>
                      {INFUSION_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name} ({opt.effect})</option>
                      ))}
                    </select>
                  </div>

                  {infusion && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Stack Intensity</span>
                        <span>x{getCostMultiplier().toFixed(1)} Cost</span>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div 
                            key={i} 
                            onClick={() => setPassiveStacks(i)}
                            data-testid={`stack-${i}`}
                            className={cn(
                              "h-2 flex-1 rounded-full cursor-pointer transition-colors",
                              i <= passiveStacks ? "bg-amber-500" : "bg-slate-800"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {passiveStacks === 0 ? "Base Effect (100%)" : passiveStacks === 1 ? "Enhanced (150%)" : "Max Overload (225%)"}
                      </p>
                    </div>
                  )}
                  
                  {currentRecipe.primaryStat && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-xs text-slate-400 mb-2">Weapon Bonuses</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-slate-800/50 border-slate-700">
                          <Zap className="w-3 h-3 mr-1 text-yellow-400" />
                          {currentRecipe.primaryStat}
                        </Badge>
                        {currentRecipe.secondaryStat && (
                          <Badge variant="outline" className="bg-slate-800/50 border-slate-700">
                            <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
                            {currentRecipe.secondaryStat}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {currentRecipe.setName && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-xs text-slate-400 mb-2">Set: {currentRecipe.setName}</div>
                      <p className="text-xs text-amber-400">
                        {ARMOR_SETS[currentRecipe.setName.toLowerCase() as keyof typeof ARMOR_SETS]?.setBonus || 'Set bonus available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button 
              className={cn(
                "w-full h-14 text-lg font-bold font-heading uppercase tracking-widest mt-6 relative overflow-hidden group",
                "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20"
              )}
              onClick={handleCraft}
              disabled={selectedTier > maxTier}
              data-testid="craft-button"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <Hammer className="w-5 h-5" /> Craft {currentRecipe.name}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>

            {selectedTier > maxTier && (
              <p className="text-center text-red-400 text-sm mt-2">
                Unlock higher tier crafting in your skill tree
              </p>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <ArrowUpCircle className="w-10 h-10 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">Select Item to Craft</h3>
            <p className="max-w-xs text-sm">
              Choose a weapon or armor piece to view all tier variants and their crafting requirements.
            </p>
          </div>
        )}
        
        <div className={cn(
          "absolute top-0 right-0 w-96 h-96 bg-gradient-to-br opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none",
          "from-amber-500 to-transparent"
        )} />
      </Card>
    </div>
  );
}
