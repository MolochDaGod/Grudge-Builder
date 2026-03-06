import Layout from "@/components/Layout";
import { ITEMS, GrudaItem } from "@/lib/grudaDB";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Sword, Shield, Sparkles } from "lucide-react";

const TIER_COLORS: Record<number, { border: string; bg: string; text: string; badge: string }> = {
  1: { border: "border-slate-500", bg: "bg-slate-500", text: "text-slate-300", badge: "bg-slate-600" },
  2: { border: "border-green-500", bg: "bg-green-500", text: "text-green-400", badge: "bg-green-600" },
  3: { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-400", badge: "bg-blue-600" },
  4: { border: "border-purple-500", bg: "bg-purple-500", text: "text-purple-400", badge: "bg-purple-600" },
  5: { border: "border-pink-500", bg: "bg-pink-500", text: "text-pink-400", badge: "bg-pink-600" },
  6: { border: "border-orange-500", bg: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-600" },
  7: { border: "border-amber-400", bg: "bg-amber-400", text: "text-amber-300", badge: "bg-amber-500" },
  8: { border: "border-red-500", bg: "bg-red-500", text: "text-red-400", badge: "bg-red-600" },
};

const STAT_COLORS: Record<string, { bar: string; icon: string }> = {
  Damage: { bar: "bg-red-500", icon: "text-red-400" },
  Speed: { bar: "bg-yellow-400", icon: "text-yellow-400" },
  Combo: { bar: "bg-cyan-400", icon: "text-cyan-400" },
  Crit: { bar: "bg-amber-400", icon: "text-amber-400" },
  Block: { bar: "bg-orange-500", icon: "text-orange-400" },
  Defense: { bar: "bg-teal-500", icon: "text-teal-400" },
  Armor: { bar: "bg-teal-500", icon: "text-teal-400" },
  Health: { bar: "bg-green-500", icon: "text-green-400" },
  Mana: { bar: "bg-blue-500", icon: "text-blue-400" },
  DamageBonus: { bar: "bg-red-400", icon: "text-red-400" },
};

function StatBar({ name, value, maxValue = 200 }: { name: string; value: number; maxValue?: number }) {
  const colors = STAT_COLORS[name] || { bar: "bg-slate-500", icon: "text-slate-400" };
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn("w-2 h-2 rounded-full", colors.bar)} />
      <span className="text-slate-400 w-16">{name}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colors.bar)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("font-mono w-8 text-right", colors.icon)}>{value}</span>
    </div>
  );
}

function ItemCard({ item }: { item: GrudaItem }) {
  const tierColor = TIER_COLORS[item.tier] || TIER_COLORS[1];
  const isWeapon = item.type === "Weapon";
  const isArmor = item.type === "Armor";
  
  const weaponSubtype = (item as any).weaponType || item.slot || "";
  const armorMaterial = (item as any).material || "";
  
  return (
    <div 
      className={cn(
        "bg-slate-900/90 rounded-xl p-4 transition-all hover:shadow-xl hover:shadow-black/20 flex flex-col border-2",
        tierColor.border
      )}
      data-testid={`item-card-${item.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn("px-2 py-0.5 rounded text-xs font-bold", tierColor.badge, "text-white")}>
          T{item.tier}
        </div>
        {isWeapon && <Sword className="w-4 h-4 text-slate-500" />}
        {isArmor && <Shield className="w-4 h-4 text-slate-500" />}
        {!isWeapon && !isArmor && <Sparkles className="w-4 h-4 text-slate-500" />}
      </div>
      
      {/* Name */}
      <h3 className={cn("font-cinzel font-bold text-lg uppercase tracking-wide mb-1", tierColor.text)}>
        {item.name}
      </h3>
      
      {/* Subtype */}
      <div className="text-xs text-slate-500 mb-3">
        {isWeapon && weaponSubtype && `${weaponSubtype} • `}
        {isArmor && armorMaterial && `${armorMaterial} • `}
        {item.slot || item.type}
      </div>
      
      {/* Description/Lore */}
      {item.description && (
        <p className="text-xs text-slate-400 italic mb-4 line-clamp-2">
          {item.description.split('.')[0]}.
        </p>
      )}
      
      {/* Stats with colored bars */}
      <div className="space-y-1.5 mb-4">
        {Object.entries(item.stats).map(([stat, value]) => (
          <StatBar key={stat} name={stat} value={value as number} />
        ))}
      </div>
      
      {/* Basic Attack (first skill) */}
      {item.skills && item.skills.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase text-slate-600 font-bold mb-1">Basic Attack</div>
          <div className="text-sm text-slate-300">{item.skills[0]}</div>
        </div>
      )}
      
      {/* Signature (second skill if exists) */}
      {item.skills && item.skills.length > 1 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase text-slate-600 font-bold mb-1">Signature</div>
          <div className="text-sm text-amber-400">{item.skills[1]}</div>
        </div>
      )}
      
      {/* Passives (remaining skills) */}
      {item.skills && item.skills.length > 2 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase text-slate-600 font-bold mb-1">Passives</div>
          <div className="flex flex-wrap gap-1">
            {item.skills.slice(2).map((skill, i) => (
              <Badge 
                key={i} 
                className={cn("text-[10px] border-0", tierColor.badge, "text-white hover:opacity-80")}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Effects */}
      {item.effects && item.effects.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase text-slate-600 font-bold mb-1">Set Bonus</div>
          <div className="text-xs text-amber-400">{item.effects[0]}</div>
        </div>
      )}
      
      {/* Footer */}
      <div className="border-t border-slate-800 pt-3 mt-auto">
        {item.craftingProfession && (
          <div className="text-xs text-slate-500">
            Crafted by: <span className={tierColor.text}>{item.craftingProfession}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DatabasePage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"Weapons" | "Armor" | "All">("All");
  const [filterTier, setFilterTier] = useState<number | null>(null);

  const filteredItems = ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || 
      (filterType === "Weapons" && item.type === "Weapon") ||
      (filterType === "Armor" && item.type === "Armor");
    const matchesTier = filterTier === null || item.tier === filterTier;
    return matchesSearch && matchesType && matchesTier;
  });

  const tiers = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-cinzel font-bold text-amber-400 mb-2">Arsenal</h1>
          <p className="text-slate-400">Browse weapons, armor, and equipment with tier-scaled stats and effects.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setFilterType("Weapons")}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-colors",
                filterType === "Weapons" 
                  ? "bg-amber-600 text-white" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              )}
              data-testid="filter-weapons"
            >
              <Sword className="w-4 h-4 inline mr-1" /> Weapons
            </button>
            <button
              onClick={() => setFilterType("Armor")}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-colors border-l border-slate-700",
                filterType === "Armor" 
                  ? "bg-amber-600 text-white" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              )}
              data-testid="filter-armor"
            >
              <Shield className="w-4 h-4 inline mr-1" /> Armor
            </button>
            <button
              onClick={() => setFilterType("All")}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-colors border-l border-slate-700",
                filterType === "All" 
                  ? "bg-amber-600 text-white" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              )}
              data-testid="filter-all"
            >
              All
            </button>
          </div>

          {/* Tier Filter */}
          <div className="flex gap-1">
            {tiers.map(tier => {
              const tc = TIER_COLORS[tier];
              return (
                <button
                  key={tier}
                  onClick={() => setFilterTier(filterTier === tier ? null : tier)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-bold transition-all border-2",
                    filterTier === tier 
                      ? cn(tc.border, tc.bg, "text-white") 
                      : cn("border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-500")
                  )}
                  data-testid={`filter-tier-${tier}`}
                >
                  T{tier}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search items..." 
              className="pl-10 bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        
        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No items found matching your criteria.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 border-t border-slate-800 pt-4">
          Showing {filteredItems.length} items{filterTier && ` at Tier ${filterTier}`}
        </div>
      </div>
    </Layout>
  );
}
