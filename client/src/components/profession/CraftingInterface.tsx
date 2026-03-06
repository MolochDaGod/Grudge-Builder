import { useState, useMemo } from "react";
import { ProfessionRecipe, ProfessionData } from "@/lib/craftingTypes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface CraftingInterfaceProps {
  data: ProfessionData;
}

const PROFESSION_TABS: Record<string, { value: string; label: string; color: string }[]> = {
  Miner: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "melee", label: "Weapons", color: "text-red-400" },
    { value: "armor", label: "Armor", color: "text-blue-400" },
    { value: "shields", label: "Shields", color: "text-cyan-400" },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "refining", label: "Refining", color: "text-orange-400" },
  ],
  Forester: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "bows", label: "Bows", color: "text-emerald-400" },
    { value: "armor", label: "Armor", color: "text-amber-500" },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "materials", label: "Materials", color: "text-green-400" },
  ],
  Mystic: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "staves", label: "Staves", color: "text-violet-400" },
    { value: "armor", label: "Armor", color: "text-purple-400" },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "enchants", label: "Enchants", color: "text-pink-400" },
    { value: "cloth", label: "Cloth", color: "text-indigo-400" },
  ],
  Chef: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "red", label: "Red", color: "text-red-500" },
    { value: "green", label: "Green", color: "text-green-500" },
    { value: "blue", label: "Blue", color: "text-blue-500" },
  ],
  Engineer: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "ranged", label: "Ranged", color: "text-orange-400" },
    { value: "armor", label: "Armor", color: "text-blue-400" },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "components", label: "Parts", color: "text-slate-400" },
    { value: "siege", label: "Siege", color: "text-red-500" },
  ],
};

export function CraftingInterface({ data }: CraftingInterfaceProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<ProfessionRecipe | null>(null);
  const [craftingTier, setCraftingTier] = useState("T1");
  const [activeTab, setActiveTab] = useState("all");

  const [infusion, setInfusion] = useState<string | null>(null);
  const [passiveStacks, setPassiveStacks] = useState(0);

  const tabs = PROFESSION_TABS[data.name] || PROFESSION_TABS.Miner;

  const filteredRecipes = useMemo(() => {
    if (activeTab === "all") return data.recipes;
    
    return data.recipes.filter((recipe) => {
      const type = (recipe.type || "").toLowerCase();
      const name = recipe.n.toLowerCase();
      const category = recipe.category;
      
      switch (activeTab) {
        // Chef color categories - use explicit category field
        case "red": return category === "red";
        case "green": return category === "green";
        case "blue": return category === "blue";
        // Miner categories
        case "melee": return type === "sword" || type === "axe" || type === "dagger" || type === "hammer" || type === "greataxe" || type === "greatsword" || type === "spear" || type === "mace";
        case "armor": return type === "armor";
        case "shields": return type === "shield";
        case "refining": return type === "refining" || type === "tool";
        // Forester categories
        case "bows": return type === "bow";
        case "materials": return type === "wood" || type === "leather" || name.includes("plank") || name.includes("leather");
        // Mystic categories
        case "staves": return type === "staff";
        case "cloth": return type === "cloth" || name.includes("fabric");
        case "enchants": return type === "enchant" || type === "scroll" || type === "spellpage" || type === "codex" || type === "gem";
        // Engineer categories
        case "components": return type === "component" || type === "tool";
        case "ranged": return type === "crossbow" || type === "gun";
        case "siege": return type === "vehicle" || type === "utility" || type === "weapon";
        // Shared accessory category (rings, necklaces, relics, back)
        case "accessories": return type === "ring" || type === "necklace" || type === "relic" || type === "back";
        default: return true;
      }
    });
  }, [data.recipes, activeTab]);

  const handleCraft = () => {
    console.log(`Crafting ${selectedRecipe?.n} at ${craftingTier}`);
  };

  const getCostMultiplier = () => {
    return Math.pow(1.5, passiveStacks);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
      {/* Recipe List */}
      <Card className="lg:col-span-4 bg-slate-900/50 border-white/10 p-4 flex flex-col h-full">
        <h3 className="font-uncial text-xl mb-4 text-white flex items-center gap-2">
          <span className="text-2xl">{data.icon}</span> Blueprints
        </h3>
        
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger 
            className="w-full bg-slate-800 border-slate-700 text-sm mb-4"
            data-testid="recipe-category-select"
          >
            <SelectValue placeholder="Filter recipes..." />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {tabs.map((tab) => (
              <SelectItem 
                key={tab.value} 
                value={tab.value}
                className={cn("text-sm cursor-pointer", tab.color)}
                data-testid={`tab-${tab.value}`}
              >
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {filteredRecipes.map((recipe) => (
              <motion.div
                key={recipe.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setCraftingTier("T1");
                  setInfusion(null);
                  setPassiveStacks(0);
                }}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between group",
                  selectedRecipe?.id === recipe.id
                    ? `bg-${data.color.split('-')[1]}-500/20 border-${data.color.split('-')[1]}-500/50`
                    : "bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{recipe.icon}</div>
                  <div>
                    <div className={cn("font-bold text-sm group-hover:text-white", selectedRecipe?.id === recipe.id ? "text-white" : "text-slate-300")}>
                      {recipe.n}
                    </div>
                    <div className="text-xs text-slate-500">Lvl {recipe.lvl}</div>
                  </div>
                </div>
                {recipe.spec && (
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                    Spec {recipe.spec}
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Crafting Area */}
      <Card className="lg:col-span-8 bg-slate-900 border-white/10 relative overflow-hidden flex flex-col">
        {selectedRecipe ? (
          <div className="p-6 md:p-8 flex flex-col h-full z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <motion.h2 
                  key={selectedRecipe.n}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold font-uncial text-white mb-2"
                >
                  {selectedRecipe.n} <span className="text-slate-500 text-lg ml-2 font-sans">{craftingTier}</span>
                </motion.h2>
                <p className="text-slate-400 text-sm">Base Craft Time: 5s • Success Chance: 100%</p>
              </div>
              <div className="text-4xl bg-slate-800 p-4 rounded-xl border border-white/10 shadow-lg">
                {selectedRecipe.icon}
              </div>
            </div>

            {/* Tier Selection */}
            <div className="mb-6">
              <label className="text-xs uppercase font-bold text-slate-500 mb-2 block tracking-wider">Upgrade Tier</label>
              <div className="flex flex-wrap gap-2">
                {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setCraftingTier(tier)}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-bold transition-all border",
                      craftingTier === tier
                        ? `bg-${data.color.split('-')[1]}-500 text-black border-${data.color.split('-')[1]}-500`
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-auto">
              {/* Requirements */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className={cn("text-xs font-bold uppercase mb-3 tracking-widest", data.color)}>Required Materials</h4>
                <div className="space-y-2">
                  {selectedRecipe.mats && Object.entries(selectedRecipe.mats).map(([name, qty]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">{name}</span>
                      <span className="text-slate-500">
                        <span className={data.inventory[name] >= qty ? "text-green-400" : "text-red-400"}>
                          {data.inventory[name] || 0}
                        </span>
                        /{qty * (craftingTier === 'T1' ? 1 : 1.5 * parseInt(craftingTier.replace('T', '')))}
                      </span>
                    </div>
                  ))}
                  {craftingTier !== 'T1' && (
                     <div className="flex justify-between items-center text-sm border-t border-white/5 pt-2 mt-2">
                       <span className="text-blue-300">Essence Cost</span>
                       <span className="text-blue-400 font-bold">{craftingTier === 'T2' ? 'Common' : craftingTier === 'T8' ? 'Mythic' : 'Rare'}</span>
                     </div>
                  )}
                </div>
              </div>

              {/* Infusion / Customization Logic */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h4 className={cn("text-xs font-bold uppercase mb-3 tracking-widest flex justify-between", data.color)}>
                  <span>Grudge Infusion</span>
                  {craftingTier !== 'T1' && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">T2+ Feature</span>}
                </h4>
                
                {craftingTier === 'T1' ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm italic text-center p-4">
                    Base items cannot be infused. Upgrade to T2 to unlock customization.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs text-slate-400">Infusion Essence</label>
                       <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                        onChange={(e) => setInfusion(e.target.value)}
                       >
                         <option value="">None</option>
                         <option value="blood">Blood Essence (Lifesteal)</option>
                         <option value="void">Void Essence (Mana Drain)</option>
                         <option value="iron">Iron Essence (Thorns)</option>
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
                                className={cn(
                                  "h-2 flex-1 rounded-full cursor-pointer transition-colors",
                                  i <= passiveStacks ? `bg-${data.color.split('-')[1]}-500` : "bg-slate-800"
                                )}
                             />
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {passiveStacks === 0 ? "Base Effect (100%)" : passiveStacks === 1 ? "Enhanced (160%)" : "Max Overload (190%)"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button 
              className={cn(
                "w-full h-14 text-lg font-bold font-heading uppercase tracking-widest mt-6",
                `bg-${data.color.split('-')[1]}-600 hover:bg-${data.color.split('-')[1]}-500 text-white shadow-lg shadow-${data.color.split('-')[1]}-900/20`
              )}
              onClick={handleCraft}
            >
              Construct {selectedRecipe.n}
            </Button>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <span className="text-4xl grayscale opacity-50">{data.icon}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">Select a Blueprint</h3>
            <p className="max-w-xs text-sm">Choose a recipe from the list to view requirements and customization options.</p>
          </div>
        )}
        
        {/* Background Texture */}
        <div className={cn(
          "absolute top-0 right-0 w-96 h-96 bg-gradient-to-br opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none",
          `from-${data.color.split('-')[1]}-500 to-transparent`
        )} />
      </Card>
    </div>
  );
}
