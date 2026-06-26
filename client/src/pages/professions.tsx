
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { GATHERING_PROFESSIONS, CRAFTING_PROFESSIONS, ITEMS, RECIPES, RESOURCE_NODES, GrudaRecipe, GrudaProfession } from "@/lib/grudaDB";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Hammer, Pickaxe, Search, Leaf, Fish, Bone, Magnet, TreePine, Wrench, ChefHat, Sparkles, ChevronRight, ChevronDown, TrendingUp, Clock, Gem, Award, Zap, Target, Package, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Character } from "@/lib/characterManager";
import { useCharacters } from "@/hooks/use-characters";
import { useAccountInventory, useAccountResources } from "@/hooks/use-account";
import { useToast } from "@/hooks/use-toast";
import CharacterProfessionHub from "@/components/profession/CharacterProfessionHub";
import { buildMaterialMap, canAffordRecipe } from "@/lib/materialAvailability";
import { resolveProfessionLevel } from "@/lib/professionLevels";
import { professionAPI } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { 
  getGatheringBonuses, 
  GATHERING_LEVEL_MILESTONES, 
  GATHERING_PROFESSIONS_CONFIG,
  getXpForLevel,
  calculateLevelFromXp,
  GatheringBonuses
} from "@/lib/professionSystem";
import { TreeVisualizer } from "@/components/profession/TreeVisualizer";
import { minerData } from "@/data/crafting/miner";
import { foresterData } from "@/data/crafting/forester";
import { mysticData } from "@/data/crafting/mystic";
import { chefData } from "@/data/crafting/chef";
import { engineerData } from "@/data/crafting/engineer";
import type { ProfessionData } from "@/lib/craftingTypes";
import { assetUrl } from "@/lib/assetConfig";
import { professionIcon, professionBackground } from "@/lib/artAssets";
import { useAuthGuard } from '@/hooks/use-auth-guard';

const CRAFTING_SKILL_TREES: Record<string, ProfessionData> = {
  Miner: minerData,
  Forester: foresterData,
  Mystic: mysticData,
  Chef: chefData,
  Engineer: engineerData,
};

type ProfessionTab = "gathering" | "crafting" | "skillTrees";

const TIER_COLORS: Record<number, string> = {
  1: "text-gray-400 border-gray-600",
  2: "text-green-400 border-green-600",
  3: "text-blue-400 border-blue-600",
  4: "text-purple-400 border-purple-600",
  5: "text-orange-400 border-orange-600",
  6: "text-red-400 border-red-600",
  7: "text-pink-400 border-pink-600",
  8: "text-amber-400 border-amber-600",
};

const TIER_NAMES = ["", "Novice", "Apprentice", "Journeyman", "Expert", "Artisan", "Master", "Grandmaster", "Legendary"];

export default function ProfessionsPage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const { toast } = useToast();
  const {
    characters,
    activeCharacter,
    loading: charsLoading,
    refetch: refetchCharacters,
  } = useCharacters();
  const { inventory, refetch: refetchInventory } = useAccountInventory();
  const { resources, refetch: refetchResources } = useAccountResources();
  const [activeTab, setActiveTab] = useState<ProfessionTab>("gathering");
  const [selectedProf, setSelectedProf] = useState<string>("Mining");
  const [selectedSkillTreeProf, setSelectedSkillTreeProf] = useState<string>("Miner");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncedProfLevels, setSyncedProfLevels] = useState<Character['professionLevels']>({});
  const materialMap = buildMaterialMap(inventory, resources);

  const characterForProfessions: Character | null = activeCharacter
    ? {
        ...activeCharacter,
        professionLevels: { ...activeCharacter.professionLevels, ...syncedProfLevels },
      }
    : null;

  useEffect(() => {
    if (!activeCharacter?.id) {
      setSyncedProfLevels({});
      return;
    }
    professionAPI.getLevels(activeCharacter.id).then(setSyncedProfLevels).catch(() => {});
  }, [activeCharacter?.id]);

  const handleRefreshCharacter = async () => {
    await Promise.all([refetchCharacters(), refetchInventory(), refetchResources()]);
    if (activeCharacter?.id) {
      professionAPI.getLevels(activeCharacter.id).then(setSyncedProfLevels).catch(() => {});
    }
  };
  
  const professions = activeTab === "gathering" ? GATHERING_PROFESSIONS : CRAFTING_PROFESSIONS;
  const currentProf = professions.find(p => p.name === selectedProf);
  
  const recipes = RECIPES.filter(r => {
    const profName = currentProf?.name;
    if (!profName) return false;
    if (profName === "Miner") return r.profession === "Blacksmithing" || r.profession === "Armorsmithing";
    if (profName === "Forester") return r.profession === "Tailoring" || r.profession === "Fletcher" || r.profession === "Leatherworking";
    if (profName === "Mystic") return r.profession === "Enchanting" || r.profession === "Alchemy" || r.profession === "Jewelcrafting";
    if (profName === "Engineer") return r.profession === "Engineering" || r.profession === "Jewelcrafting" || r.profession === "Blacksmithing";
    if (profName === "Chef") return r.profession === "Cooking" || r.profession === "Alchemy";
    return r.profession === profName;
  });
  
  const harvestNodes = RESOURCE_NODES.filter(n => n.profession === currentProf?.name);

  useEffect(() => {
    const newProfs = activeTab === "gathering" ? GATHERING_PROFESSIONS : CRAFTING_PROFESSIONS;
    setSelectedProf(newProfs[0].name);
  }, [activeTab]);

  const handleCraft = async (recipe: GrudaRecipe) => {
    if (!characterForProfessions) {
      toast({ title: "No Active Character", description: "You must create or select a character first.", variant: "destructive" });
      return;
    }

    const outputItem = ITEMS.find(i => i.id === recipe.outputItemId);
    if (!outputItem) return;

    // Determine the crafting profession from the current selection
    const craftProfession = currentProf?.name || recipe.profession || "Miner";

    try {
      const result = await professionAPI.craft(characterForProfessions.id, {
        professionId: craftProfession,
        recipeId: recipe.id,
        outputItemId: outputItem.id,
        outputItemName: outputItem.name,
        outputItemTier: outputItem.tier || 1,
        outputItemRarity: outputItem.rarity || "Common",
        ingredients: recipe.ingredients,
      });

      // Show XP gain info
      const xpMsg = result.profession.xpGained > 0
        ? ` (+${result.profession.xpGained} ${craftProfession} XP)`
        : "";
      const lvlMsg = result.profession.leveledUp
        ? ` ${craftProfession} leveled up to ${result.profession.level}!`
        : "";

      toast({
        title: "Crafting Successful",
        description: `You created 1x ${outputItem.name}!${xpMsg}${lvlMsg}`,
        className: "bg-green-900 border-green-800 text-green-100",
      });

      await handleRefreshCharacter();
    } catch (err: any) {
      const msg = err?.message || "Crafting failed";
      toast({
        title: "Crafting Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (!searchTerm) return true;
    const item = ITEMS.find(i => i.id === r.outputItemId);
    return item?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredResources = harvestNodes.filter(n => {
    if (!searchTerm) return true;
    return n.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (charsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh] text-slate-400">Loading your account characters...</div>
      </Layout>
    );
  }

  if (!activeCharacter) {
    const needsCreate = characters.length === 0;
    return (
      <Layout>
        <div className="flex flex-col gap-6 py-6 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-200">
              {needsCreate ? 'Create a Character' : 'Select a Character'}
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Professions, crafting, inventory, and equipment are tracked per character on your Grudge account.
            </p>
          </div>
          <CharacterProfessionHub activeCharacter={null} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-80px)] animate-in fade-in duration-500">
        <CharacterProfessionHub
          activeCharacter={characterForProfessions}
          onCharacterSelected={handleRefreshCharacter}
        />

        {/* ── Compact header ── */}
        <div className="flex items-center justify-between gap-4 pb-3 pt-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
              <Hammer className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-2xl font-cinzel font-bold text-amber-400" data-testid="page-title">Artisan Guild</h1>
              {characterForProfessions && <span className="text-xs text-blue-400">Artisan: {characterForProfessions.name}</span>}
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfessionTab)} className="shrink-0">
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger 
                value="gathering" 
                className="data-[state=active]:bg-green-900/50 data-[state=active]:text-green-400 text-xs px-3"
                data-testid="tab-gathering"
              >
                <Leaf className="w-3.5 h-3.5 mr-1.5" />
                Gathering
              </TabsTrigger>
              <TabsTrigger 
                value="crafting"
                className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-400 text-xs px-3"
                data-testid="tab-crafting"
              >
                <Hammer className="w-3.5 h-3.5 mr-1.5" />
                Crafting
              </TabsTrigger>
              <TabsTrigger 
                value="skillTrees"
                className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-400 text-xs px-3"
                data-testid="tab-skill-trees"
              >
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                Skill Trees
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ── Tab content fills remaining viewport ── */}
        <div className="flex-1 min-h-0">
          {activeTab === "gathering" && (
            <div className="flex flex-col h-full gap-3">
              <div className="shrink-0">
                <GatheringProfessionGrid 
                  selectedProf={selectedProf}
                  setSelectedProf={setSelectedProf}
                  characters={characters}
                  activeCharacter={characterForProfessions}
                />
              </div>
              {selectedProf && (
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                  <GatheringProfessionDetails 
                    professionName={selectedProf}
                    activeCharacter={characterForProfessions}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredResources={filteredResources}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "crafting" && (
            <div className="flex flex-col h-full gap-3">
              {/* Profession selector with art */}
              <div className="shrink-0">
                <ProfessionGrid 
                  professions={CRAFTING_PROFESSIONS}
                  selectedProf={selectedProf}
                  setSelectedProf={(id) => {
                    const prof = CRAFTING_PROFESSIONS.find(p => p.id === id);
                    if (prof) setSelectedProf(prof.name);
                  }}
                  category="crafting"
                  activeCharacter={characterForProfessions}
                />
              </div>

              {/* Crafting workbench — contained single screen */}
              {currentProf && (
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left: Profession info (scrollable) */}
                  <div className="lg:col-span-4 xl:col-span-3 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                    <ProfessionInfoCard profession={currentProf} activeCharacter={characterForProfessions} />
                    <SynergiesCard profession={currentProf} />
                    {currentProf.name === "Chef" && <FoodCategoriesPanel />}
                  </div>

                  {/* Right: Search + Recipes (scrollable) */}
                  <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
                    <div className="relative shrink-0 mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        placeholder="Search recipes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-700"
                        data-testid="search-input"
                      />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                      {filteredRecipes.length > 0 ? (
                        <RecipesPanel
                          recipes={filteredRecipes}
                          materialMap={materialMap}
                          craftLevel={resolveProfessionLevel(characterForProfessions?.professionLevels, currentProf.name, 'crafting').level}
                          onCraft={handleCraft}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                          No recipes found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "skillTrees" && (
            <div className="h-full">
              <SkillTreesTab
                selectedProf={selectedSkillTreeProf}
                setSelectedProf={setSelectedSkillTreeProf}
                activeCharacter={characterForProfessions}
                onRefreshCharacter={handleRefreshCharacter}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function GatheringProfessionGrid({ selectedProf, setSelectedProf, characters, activeCharacter }: {
  selectedProf: string;
  setSelectedProf: (name: string) => void;
  characters: Character[];
  activeCharacter: Character | null;
}) {
  const professionNames = Object.keys(GATHERING_PROFESSIONS_CONFIG) as (keyof typeof GATHERING_PROFESSIONS_CONFIG)[];
  
  const getCharacterLevel = (profName: string): number =>
    resolveProfessionLevel(activeCharacter?.professionLevels, profName, 'gathering').level;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {professionNames.map((profName) => {
        const config = GATHERING_PROFESSIONS_CONFIG[profName];
        const level = getCharacterLevel(profName);
        const bonuses = getGatheringBonuses(level);
        
        return (
          <button
            key={profName}
            onClick={() => setSelectedProf(profName)}
            data-testid={`profession-${profName.toLowerCase()}`}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center group relative overflow-hidden",
              selectedProf === profName
                ? "bg-slate-800 border-green-500 text-green-400 shadow-lg shadow-green-900/20 transform -translate-y-1"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
            )}
          >
            <span className="text-3xl">{config.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{profName}</span>
            <div className="flex items-center gap-1 text-[10px]">
              <span className={cn(
                "font-bold",
                level >= 50 ? "text-amber-400" : level >= 25 ? "text-blue-400" : "text-green-400"
              )}>
                Lv.{level}
              </span>
              <span className="text-slate-600">/100</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                style={{ width: `${level}%` }}
              />
            </div>
            {level >= 50 && (
              <div className="absolute top-1 right-1">
                <Award className="w-3 h-3 text-amber-400" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

type AccordionPanel = 'tierResources' | 'harvestNodes' | 'milestones' | null;

function GatheringProfessionDetails({ professionName, activeCharacter, searchTerm, setSearchTerm, filteredResources }: {
  professionName: string;
  activeCharacter: Character | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredResources: any[];
}) {
  const [openPanel, setOpenPanel] = useState<AccordionPanel>('tierResources');
  
  const togglePanel = (panel: AccordionPanel) => {
    setOpenPanel(prev => prev === panel ? null : panel);
  };
  
  const config = GATHERING_PROFESSIONS_CONFIG[professionName as keyof typeof GATHERING_PROFESSIONS_CONFIG];
  if (!config) return null;
  
  const profData = resolveProfessionLevel(activeCharacter?.professionLevels, professionName, 'gathering');
  const level = profData.level;
  const totalXp = profData.xp;
  const { xpInLevel, xpForNextLevel } = calculateLevelFromXp(totalXp);
  const bonuses = getGatheringBonuses(level);
  const currentMilestones = GATHERING_LEVEL_MILESTONES.filter(m => m.level <= level);
  const nextMilestone = GATHERING_LEVEL_MILESTONES.find(m => m.level > level);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{professionName}</h2>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                Gathering
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Level Progress</span>
                <span className="text-green-400 font-bold">{level} / 100</span>
              </div>
              <Progress value={(level / 100) * 100} className="h-3" />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{xpInLevel.toLocaleString()} XP</span>
                <span>{xpForNextLevel.toLocaleString()} to next</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Quality
                </div>
                <div className="text-lg font-bold text-green-400">+{bonuses.qualityBonus}%</div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <Package className="w-3 h-3" />
                  Quantity
                </div>
                <div className="text-lg font-bold text-blue-400">+{bonuses.quantityBonus}</div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <Gem className="w-3 h-3" />
                  Gear Drop
                </div>
                <div className="text-lg font-bold text-purple-400">{(bonuses.gearDropChance * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <Clock className="w-3 h-3" />
                  Speed
                </div>
                <div className="text-lg font-bold text-amber-400">-{(bonuses.harvestSpeedReduction * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <Sparkles className="w-3 h-3" />
                  Rare Find
                </div>
                <div className="text-lg font-bold text-pink-400">{(bonuses.rareResourceChance * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                  <Zap className="w-3 h-3" />
                  Crit Gather
                </div>
                <div className="text-lg font-bold text-yellow-400">{(bonuses.criticalGatherChance * 100).toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-300">Tier Unlocked</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[1,2,3,4,5,6,7,8].map(t => (
                  <Badge 
                    key={t}
                    variant="outline" 
                    className={cn(
                      "text-[10px]", 
                      TIER_COLORS[t],
                      t <= bonuses.tierUnlocked ? "opacity-100" : "opacity-30"
                    )}
                  >
                    T{t} {TIER_NAMES[t]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs text-slate-500 mb-2">Feeds Into:</h4>
              <div className="flex flex-wrap gap-1">
                {config.feedsInto.map(craft => (
                  <Badge key={craft} variant="outline" className="border-amber-700/50 text-amber-400 text-xs">
                    {craft}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {nextMilestone && (
          <div className="bg-slate-900 rounded-xl border border-green-800/50 p-4">
            <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              Next Milestone: Level {nextMilestone.level}
            </h3>
            <p className="text-xs text-slate-400">{nextMilestone.unlock}</p>
            <p className="text-[10px] text-slate-500 mt-1">{nextMilestone.description}</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700"
            data-testid="search-input"
          />
        </div>

        <TierResourcesPanel 
          professionName={professionName} 
          currentTier={bonuses.tierUnlocked} 
          isOpen={openPanel === 'tierResources'}
          onToggle={() => togglePanel('tierResources')}
        />

        {filteredResources.length > 0 && (
          <ResourceNodesPanel 
            nodes={filteredResources} 
            currentLevel={level} 
            isOpen={openPanel === 'harvestNodes'}
            onToggle={() => togglePanel('harvestNodes')}
          />
        )}

        <MilestonesPanel 
          milestones={currentMilestones} 
          currentLevel={level} 
          isOpen={openPanel === 'milestones'}
          onToggle={() => togglePanel('milestones')}
        />
      </div>
    </div>
  );
}

function TierResourcesPanel({ professionName, currentTier, isOpen, onToggle }: { 
  professionName: string; 
  currentTier: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const config = GATHERING_PROFESSIONS_CONFIG[professionName as keyof typeof GATHERING_PROFESSIONS_CONFIG];
  if (!config) return null;
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        data-testid="toggle-tier-resources"
      >
        <h3 className="font-bold text-lg text-green-400">Tier Resources</h3>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-0">
          {Object.entries(config.tierResources).map(([tier, resources]) => {
            const tierNum = parseInt(tier);
            const unlocked = tierNum <= currentTier;
            
            return (
              <div 
                key={tier}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  unlocked 
                    ? "bg-slate-950 border-slate-700" 
                    : "bg-slate-950/50 border-slate-800 opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={cn("text-xs", TIER_COLORS[tierNum])}>
                    Tier {tier}
                  </Badge>
                  {!unlocked && (
                    <span className="text-[10px] text-slate-500">Locked</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {resources.map(res => (
                    <Badge 
                      key={res} 
                      className={cn(
                        "text-[10px]",
                        unlocked 
                          ? "bg-slate-800 text-slate-300" 
                          : "bg-slate-900 text-slate-600"
                      )}
                    >
                      {res}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MilestonesPanel({ milestones, currentLevel, isOpen, onToggle }: { 
  milestones: typeof GATHERING_LEVEL_MILESTONES; 
  currentLevel: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const allMilestones = GATHERING_LEVEL_MILESTONES;
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        data-testid="toggle-milestones"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-amber-400">Level Milestones</h3>
          <Badge variant="secondary" className="bg-slate-800">{milestones.length} / {allMilestones.length} Unlocked</Badge>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 pt-0 max-h-[400px] overflow-y-auto">
          {allMilestones.map(milestone => {
            const unlocked = milestone.level <= currentLevel;
            
            return (
              <div 
                key={milestone.level}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  unlocked 
                    ? "bg-green-950/30 border-green-800/50" 
                    : "bg-slate-950 border-slate-800 opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-bold",
                    unlocked ? "text-green-400" : "text-slate-500"
                  )}>
                    Level {milestone.level}
                  </span>
                  {unlocked && <Award className="w-3 h-3 text-green-400" />}
                </div>
                <p className={cn(
                  "text-sm font-medium",
                  unlocked ? "text-white" : "text-slate-400"
                )}>
                  {milestone.unlock}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">{milestone.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PROFESSION_GRID_STYLES = {
  gathering: {
    selected: "bg-slate-800 border-green-500 text-green-400 shadow-lg shadow-green-900/20 transform -translate-y-1",
  },
  crafting: {
    selected: "bg-slate-800 border-amber-500 text-amber-400 shadow-lg shadow-amber-900/20 transform -translate-y-1",
  },
};

function ProfessionGrid({ professions, selectedProf, setSelectedProf, category, activeCharacter }: {
  professions: GrudaProfession[];
  selectedProf: string;
  setSelectedProf: (id: string) => void;
  category: "gathering" | "crafting";
  activeCharacter?: Character | null;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {professions.map((prof) => {
        const iconSrc = professionIcon(prof.name);
        const level = category === 'crafting'
          ? resolveProfessionLevel(activeCharacter?.professionLevels, prof.name, 'crafting').level
          : 1;
        return (
          <button
            key={prof.id}
            onClick={() => setSelectedProf(prof.id)}
            data-testid={`profession-${prof.id}`}
            className={cn(
              "p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 text-center group relative overflow-hidden",
              prof.name === selectedProf
                ? PROFESSION_GRID_STYLES[category].selected
                : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
            )}
          >
            {iconSrc ? (
              <img src={iconSrc} alt={prof.name} className="w-10 h-10 object-contain rounded-md" loading="lazy" />
            ) : (
              <span className="text-2xl">{prof.icon}</span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider">{prof.name}</span>
            {category === 'crafting' && activeCharacter && (
              <>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className={cn(
                    "font-bold",
                    level >= 50 ? "text-amber-400" : level >= 25 ? "text-blue-400" : "text-amber-300/80",
                  )}>
                    Lv.{level}
                  </span>
                  <span className="text-slate-600">/100</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                    style={{ width: `${level}%` }}
                  />
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ProfessionInfoCard({
  profession,
  activeCharacter,
}: {
  profession: GrudaProfession;
  activeCharacter: Character | null;
}) {
  const [, setLocation] = useLocation();
  const professionRoute = `/profession/${profession.name.toLowerCase()}`;
  const bgSrc = professionBackground(profession.name);
  const iconSrc = professionIcon(profession.name);
  const profData = resolveProfessionLevel(activeCharacter?.professionLevels, profession.name, 'crafting');
  const masteryPct = Math.min(100, (profData.level / 100) * 100);
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Art banner */}
      {bgSrc && (
        <div className="relative h-24 overflow-hidden">
          <img src={bgSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-2 left-4 flex items-center gap-2">
            {iconSrc ? (
              <img src={iconSrc} alt={profession.name} className="w-10 h-10 object-contain rounded-md border border-amber-500/50 shadow-lg" loading="lazy" />
            ) : (
              <span className="text-3xl">{profession.icon}</span>
            )}
            <div>
              <h2 className="text-lg font-bold text-white drop-shadow">{profession.name}</h2>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-[10px]">
                Crafting
              </Badge>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 space-y-3">
        {!bgSrc && (
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{profession.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{profession.name}</h2>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs">Crafting</Badge>
            </div>
          </div>
        )}
        
        <p className="text-slate-400 text-xs leading-relaxed">{profession.description}</p>
        
        <Button 
          onClick={() => setLocation(professionRoute)}
          size="sm"
          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs"
          data-testid={`button-open-${profession.name.toLowerCase()}`}
        >
          <ChevronRight className="w-3.5 h-3.5 mr-1" />
          Open Workshop
        </Button>
        
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-500">Mastery</span>
            <span className="text-amber-400 font-bold">Lv.{profData.level} / 100</span>
          </div>
          <Progress value={masteryPct} className="h-1.5" />
        </div>
        
        <div className="flex flex-wrap gap-1">
          {TIER_NAMES.slice(1).map((name, i) => (
            <Badge 
              key={name}
              variant="outline" 
              className={cn("text-[9px] px-1", TIER_COLORS[i + 1], i === 0 ? "ring-1 ring-offset-1 ring-offset-slate-900" : "opacity-40")}
            >
              T{i + 1}
            </Badge>
          ))}
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trainers</h3>
          <div className="flex flex-wrap gap-1">
            {profession.trainers.map(t => (
              <Badge key={t} variant="outline" className="border-slate-700 text-slate-300 text-[10px] px-1.5">{t}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SynergiesCard({ profession }: { profession: GrudaProfession }) {
  const synergies: Record<string, string[]> = {
    "Miner": ["Mining", "Scavenging"],
    "Forester": ["Logging", "Skinning", "Herbalism"],
    "Mystic": ["Mining (Gems)", "Herbalism", "Fishing"],
    "Engineer": ["Mining", "Scavenging", "Logging"],
    "Chef": ["Fishing", "Skinning", "Herbalism"],
  };
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h3 className="text-sm font-bold text-amber-400 mb-3">Crafting Outputs</h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {profession.resourceTypes?.map(type => (
          <Badge key={type} className="bg-amber-900/30 text-amber-300 border-amber-700/50 text-xs">
            {type}
          </Badge>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-800">
        <h4 className="text-xs text-slate-500 mb-2">Gathering Synergies:</h4>
        <div className="flex flex-wrap gap-1">
          {synergies[profession.name]?.map(gather => (
            <Badge key={gather} variant="outline" className="border-green-700/50 text-green-400 text-xs">
              {gather}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceNodesPanel({ nodes, currentLevel, isOpen, onToggle }: { 
  nodes: any[]; 
  currentLevel: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        data-testid="toggle-harvest-nodes"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-green-400">Harvest Nodes</h3>
          <Badge variant="secondary" className="bg-slate-800">{nodes.length} Nodes</Badge>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-0 max-h-[500px] overflow-y-auto">
          {nodes.map(node => {
            const canHarvest = currentLevel >= node.minLevel;
            
            return (
              <div 
                key={node.id} 
                className={cn(
                  "bg-slate-950 border rounded-lg p-4 transition-colors group",
                  canHarvest 
                    ? "border-slate-800 hover:border-green-500/50" 
                    : "border-red-900/30 opacity-60"
                )}
                data-testid={`node-${node.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={cn(
                    "font-bold transition-colors",
                    canHarvest ? "text-slate-200 group-hover:text-green-400" : "text-slate-500"
                  )}>
                    {node.name}
                  </h4>
                  <Badge variant="outline" className={cn("text-[10px]", TIER_COLORS[node.tier])}>
                    T{node.tier}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mb-3 space-y-1">
                  <div>Tool: <span className="text-slate-300">{node.tool}</span></div>
                  <div>Location: <span className="text-slate-300">{node.location}</span></div>
                  <div>Min Level: <span className={cn(
                    canHarvest ? "text-green-400" : "text-red-400"
                  )}>{node.minLevel}</span></div>
                </div>
                <div className="text-xs bg-slate-900 p-2 rounded text-slate-400">
                  Drops: {node.drops.map((d: string) => {
                    const dropItem = ITEMS.find(i => i.id === d);
                    return dropItem?.name || d;
                  }).join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecipesPanel({
  recipes,
  materialMap,
  craftLevel,
  onCraft,
}: {
  recipes: GrudaRecipe[];
  materialMap: Record<string, number>;
  craftLevel: number;
  onCraft: (recipe: GrudaRecipe) => void;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-bold text-sm text-amber-400">Known Recipes</h3>
        <Badge variant="secondary" className="bg-slate-800 text-xs">{recipes.length} Recipes</Badge>
      </div>
      <div className="divide-y divide-slate-800">
        {recipes.map(recipe => {
          const outputItem = ITEMS.find(i => i.id === recipe.outputItemId);
          const tier = outputItem?.tier || 1;
          const tierLocked = craftLevel < Math.max(1, tier * 12);
          const afford = canAffordRecipe(materialMap, recipe.ingredients);
          const canCraft = afford.ok && !tierLocked;
          return (
            <div key={recipe.id} className="p-3 hover:bg-slate-800/50 transition-colors flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-950 rounded border border-slate-700 flex items-center justify-center shrink-0">
                <div className={cn("w-6 h-6 rounded-full", 
                  outputItem?.rarity === 'Common' ? "bg-slate-500" : 
                  outputItem?.rarity === 'Uncommon' ? "bg-green-500" :
                  outputItem?.rarity === 'Rare' ? "bg-blue-500" :
                  outputItem?.rarity === 'Epic' ? "bg-purple-500" : "bg-amber-500"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn("font-bold text-sm truncate", 
                     outputItem?.rarity === 'Common' ? "text-slate-200" : 
                     outputItem?.rarity === 'Uncommon' ? "text-green-400" : 
                     outputItem?.rarity === 'Rare' ? "text-blue-400" :
                     outputItem?.rarity === 'Epic' ? "text-purple-400" : "text-amber-400"
                  )}>{outputItem?.name || "Unknown Item"}</h4>
                  <Badge variant="outline" className={cn("text-[9px] shrink-0", TIER_COLORS[outputItem?.tier || 1])}>
                    T{outputItem?.tier || 1}
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-1">
                  {recipe.ingredients.map(ing => {
                    const ingItem = ITEMS.find(i => i.id === ing.itemId) || RESOURCE_NODES.find(n => n.drops.includes(ing.itemId));
                    const have = materialMap[ing.itemId] || 0;
                    const enough = have >= ing.quantity;
                    return (
                      <span
                        key={ing.itemId}
                        className={cn(
                          "px-1 py-0.5 rounded",
                          enough ? "bg-green-950/50 text-green-300" : "bg-red-950/40 text-red-300",
                        )}
                      >
                        {have}/{ing.quantity}x {ingItem?.name || ing.itemId}
                      </span>
                    );
                  })}
                </div>
                {tierLocked && (
                  <p className="text-[10px] text-amber-500 mt-1">Requires higher {recipe.profession || 'profession'} mastery for T{tier}</p>
                )}
              </div>
              <Button 
                size="sm" 
                className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-3 py-1 h-8 whitespace-nowrap shrink-0 shadow-md disabled:opacity-40"
                onClick={() => onCraft(recipe)}
                disabled={!canCraft}
                data-testid={`craft-${recipe.id}`}
              >
                <Hammer className="w-3 h-3 mr-1" />
                {afford.ok ? 'Craft' : 'Need mats'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function FoodCategoriesPanel() {
  const foodCategories = [
    {
      name: "Red Food",
      color: "red",
      icon: "🔴",
      source: "Land Meat",
      buffs: ["Health Regeneration", "Attack Damage", "Max Health", "Defense", "Block", "Counter"]
    },
    {
      name: "Blue Food", 
      color: "blue",
      icon: "🔵",
      source: "Ocean / Soup",
      buffs: ["Spell Damage", "Mana Regeneration", "Mana Pool", "Spell Speed", "Spell Crit", "Resistances"]
    },
    {
      name: "Green Food",
      color: "green", 
      icon: "🟢",
      source: "Plants",
      buffs: ["Stamina", "Movement Speed", "Armor", "Attack Speed", "Crit Chance"]
    }
  ];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h3 className="font-bold text-lg text-amber-400 mb-4">Chef Food System</h3>
      <p className="text-xs text-slate-500 mb-4">Characters may have ONE food of each color active at a time. All food scales T1 → T8.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {foodCategories.map(cat => (
          <div 
            key={cat.name}
            className={cn(
              "rounded-lg border p-3",
              cat.color === "red" ? "bg-red-950/30 border-red-800/50" :
              cat.color === "blue" ? "bg-blue-950/30 border-blue-800/50" :
              "bg-green-950/30 border-green-800/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{cat.icon}</span>
              <h4 className={cn(
                "font-bold",
                cat.color === "red" ? "text-red-400" :
                cat.color === "blue" ? "text-blue-400" : "text-green-400"
              )}>{cat.name}</h4>
            </div>
            <p className="text-xs text-slate-500 mb-2">Source: {cat.source}</p>
            <div className="flex flex-wrap gap-1">
              {cat.buffs.map(buff => (
                <Badge key={buff} variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                  {buff}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SKILL_TREE_ICONS: Record<string, string> = {
  Miner: "⛏️",
  Forester: "🪓",
  Mystic: "🔮",
  Chef: "👨‍🍳",
  Engineer: "⚙️",
};

function SkillTreesTab({ 
  selectedProf, 
  setSelectedProf, 
  activeCharacter,
  onRefreshCharacter
}: { 
  selectedProf: string; 
  setSelectedProf: (name: string) => void;
  activeCharacter: Character | null;
  onRefreshCharacter: () => Promise<void>;
}) {
  const professionNames = Object.keys(CRAFTING_SKILL_TREES);
  const currentTree = CRAFTING_SKILL_TREES[selectedProf];
  
  const characterForTree = activeCharacter ? {
    id: activeCharacter.id,
    level: activeCharacter.level || 1,
    skillPoints: activeCharacter.skillPoints || 0,
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {professionNames.map(profName => (
          <button
            key={profName}
            onClick={() => setSelectedProf(profName)}
            data-testid={`skill-tree-${profName.toLowerCase()}`}
            className={cn(
              "px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 font-medium",
              selectedProf === profName
                ? "bg-purple-900/50 border-purple-500 text-purple-300 shadow-lg shadow-purple-900/30"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            )}
          >
            <span className="text-xl">{SKILL_TREE_ICONS[profName]}</span>
            <span>{profName}</span>
          </button>
        ))}
      </div>

      {currentTree && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden" style={{ height: "70vh" }}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentTree.icon}</span>
              <div>
                <h3 className={cn("text-xl font-bold", currentTree.color)}>{currentTree.name}</h3>
                <p className="text-sm text-slate-500">{currentTree.role}</p>
              </div>
            </div>
            {activeCharacter && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  <span className="text-amber-400 font-bold">{activeCharacter.skillPoints || 0}</span> Skill Points
                </span>
                <span className="text-slate-400">
                  Level <span className="text-blue-400 font-bold">{activeCharacter.level || 1}</span>
                </span>
              </div>
            )}
          </div>
          <div className="h-[calc(100%-72px)]">
            <TreeVisualizer 
              nodes={currentTree.treeData}
              color={currentTree.color.replace('text-', '')}
              bgImage={currentTree.bgImage}
              profession={currentTree.name}
              fullscreen={false}
              character={characterForTree}
              onRefreshCharacter={onRefreshCharacter}
            />
          </div>
        </div>
      )}

      {!activeCharacter && (
        <div className="text-center py-8 text-slate-500">
          <p>Create a character to unlock and track skill tree progress.</p>
        </div>
      )}
    </div>
  );
}
