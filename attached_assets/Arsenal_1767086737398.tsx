import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Sword, Shield, Sparkles, Target, Search, ChevronRight, Heart,
  Axe, Hammer, Crosshair, Flame, Snowflake, Sun, Zap, Leaf, BookOpen,
  Gauge, RefreshCw, Radius, Cylinder
} from "lucide-react";
import { ALL_WEAPONS, Weapon } from "@/data/weapons";
import { ALL_EQUIPMENT, EquipmentItem, EQUIPMENT_SETS, EQUIPMENT_SLOTS, ARMOR_MATERIALS } from "@/data/equipment";
import { TIER_LABELS } from "@/data/tieredCrafting";

type ItemCategory = "weapons" | "armor" | "accessories";

interface WeaponMaxStats {
  damage: number;
  speed: number;
  combo: number;
  crit: number;
  block: number;
  defense: number;
}

interface EquipmentMaxStats {
  hp: number;
  mana: number;
  crit: number;
  block: number;
  defense: number;
}

const TIER_COLORS = [
  "bg-slate-500", "bg-green-500", "bg-blue-500", "bg-purple-500",
  "bg-orange-500", "bg-red-500", "bg-pink-500", "bg-yellow-400"
];

const STAT_BAR_COLORS: Record<string, string> = {
  "text-red-400": "#f87171",
  "text-cyan-400": "#22d3ee",
  "text-pink-400": "#f472b6",
  "text-yellow-400": "#facc15",
  "text-orange-400": "#fb923c",
  "text-purple-400": "#c084fc",
  "text-green-400": "#4ade80",
  "text-blue-400": "#60a5fa",
};

function StatBar({ label, value, maxValue, color, icon: Icon }: { label: string; value: number; maxValue: number; color: string; icon?: any }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const barColor = STAT_BAR_COLORS[color] || "#facc15";
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />}
      <span className="text-xs text-slate-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: barColor }} />
      </div>
      <span className={cn("text-xs font-bold w-10 text-right", color)}>{value}</span>
    </div>
  );
}

function TierSelector({ tier, setTier }: { tier: number; setTier: (t: number) => void }) {
  return (
    <div className="flex gap-1">
      {TIER_LABELS.map((label, idx) => (
        <button
          key={label}
          onClick={() => setTier(idx + 1)}
          className={cn(
            "px-2 py-1 text-xs font-bold rounded transition-all",
            tier === idx + 1
              ? cn(TIER_COLORS[idx], "text-white shadow-lg")
              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
          )}
          data-testid={`tier-selector-${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const WEAPON_ICON_MAP: Record<string, any> = {
  Sword: Sword,
  Axe: Axe,
  Dagger: Sword,
  Hammer1h: Hammer,
  Hammer2h: Hammer,
  Greatsword: Sword,
  Greataxe: Axe,
  Bow: Radius,
  Crossbow: Crosshair,
  Gun: Cylinder,
  "Fire Staff": Flame,
  "Frost Staff": Snowflake,
  "Nature Staff": Leaf,
  "Holy Staff": Sun,
  "Arcane Staff": Sparkles,
  "Lightning Staff": Zap,
  "Fire Tome": BookOpen,
  "Frost Tome": BookOpen,
  "Nature Tome": BookOpen,
  "Holy Tome": BookOpen,
  "Arcane Tome": BookOpen,
  "Lightning Tome": BookOpen,
};

const WEAPON_ICON_COLOR: Record<string, string> = {
  Sword: "text-cyan-500/50",
  Axe: "text-red-500/50",
  Dagger: "text-emerald-500/50",
  Hammer1h: "text-slate-400/50",
  Hammer2h: "text-slate-400/50",
  Greatsword: "text-cyan-500/50",
  Greataxe: "text-red-500/50",
  Bow: "text-amber-500/50",
  Crossbow: "text-amber-500/50",
  Gun: "text-orange-500/50",
  "Fire Staff": "text-orange-500/50",
  "Frost Staff": "text-blue-400/50",
  "Nature Staff": "text-green-500/50",
  "Holy Staff": "text-yellow-400/50",
  "Arcane Staff": "text-purple-500/50",
  "Lightning Staff": "text-yellow-500/50",
  "Fire Tome": "text-orange-500/50",
  "Frost Tome": "text-blue-400/50",
  "Nature Tome": "text-green-500/50",
  "Holy Tome": "text-yellow-400/50",
  "Arcane Tome": "text-purple-500/50",
  "Lightning Tome": "text-yellow-500/50",
};

function WeaponCard({ weapon, tier, maxStats }: { weapon: Weapon; tier: number; maxStats: WeaponMaxStats }) {
  const stats = weapon.stats;
  const tierDmg = stats.damageBase + stats.damagePerTier * tier;
  const tierSpeed = stats.speedBase + stats.speedPerTier * tier;
  const tierCombo = stats.comboBase + stats.comboPerTier * tier;
  const tierCrit = stats.critBase + stats.critPerTier * tier;
  const tierBlock = stats.blockBase + stats.blockPerTier * tier;
  const tierDef = stats.defenseBase + stats.defensePerTier * tier;

  const WeaponIcon = WEAPON_ICON_MAP[weapon.type] || Sword;
  const iconColor = WEAPON_ICON_COLOR[weapon.type] || "text-cyan-500/30";

  return (
    <Card className="bg-slate-800/80 border-slate-600 hover:border-cyan-500/50 transition-all group" data-testid={`weapon-card-${weapon.id}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <Badge className={cn(TIER_COLORS[tier - 1], "text-white text-[10px] mb-2")}>T{tier}</Badge>
            <CardTitle className="text-base text-cyan-300 group-hover:text-cyan-200">{weapon.name}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{weapon.type} • {weapon.category}</p>
          </div>
          <WeaponIcon className={cn("w-8 h-8", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs text-slate-400 italic line-clamp-2">{weapon.lore}</p>
        
        <div className="space-y-1.5">
          <StatBar label="Damage" value={Math.round(tierDmg)} maxValue={maxStats.damage || 1} color="text-red-400" icon={Sword} />
          <StatBar label="Speed" value={Math.round(tierSpeed)} maxValue={maxStats.speed || 1} color="text-cyan-400" icon={Gauge} />
          <StatBar label="Combo" value={Math.round(tierCombo)} maxValue={maxStats.combo || 1} color="text-pink-400" icon={RefreshCw} />
          <StatBar label="Crit" value={Math.round(tierCrit * 10) / 10} maxValue={maxStats.crit || 1} color="text-yellow-400" icon={Target} />
          <StatBar label="Block" value={Math.round(tierBlock * 10) / 10} maxValue={maxStats.block || 1} color="text-orange-400" icon={Shield} />
          <StatBar label="Defense" value={Math.round(tierDef)} maxValue={maxStats.defense || 1} color="text-purple-400" icon={Shield} />
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Basic Attack</div>
          <p className="text-xs text-slate-300">{weapon.basicAbility}</p>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Signature</div>
          <p className="text-xs text-amber-300">{weapon.signatureAbility}</p>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Passives</div>
          <div className="flex flex-wrap gap-1">
            {weapon.passives.map((passive, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                {passive.split('(')[0].trim()}
              </Badge>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 pt-1">
          Crafted by: <span className="text-amber-400">{weapon.craftedBy}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EquipmentCard({ item, tier, maxStats }: { item: EquipmentItem; tier: number; maxStats: EquipmentMaxStats }) {
  const stats = item.stats;
  const tierHp = stats.hpBase + stats.hpPerTier * tier;
  const tierMana = stats.manaBase + stats.manaPerTier * tier;
  const tierCrit = stats.critBase + stats.critPerTier * tier;
  const tierBlock = stats.blockBase + stats.blockPerTier * tier;
  const tierDef = stats.defenseBase + stats.defensePerTier * tier;

  const materialColors: Record<string, string> = {
    Cloth: "text-purple-400 border-purple-500/30",
    Leather: "text-amber-400 border-amber-500/30",
    Metal: "text-slate-300 border-slate-500/30",
    Gem: "text-cyan-400 border-cyan-500/30",
  };

  return (
    <Card className="bg-slate-800/80 border-slate-600 hover:border-purple-500/50 transition-all group" data-testid={`equipment-card-${item.id}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex gap-1 mb-2">
              <Badge className={cn(TIER_COLORS[tier - 1], "text-white text-[10px]")}>T{tier}</Badge>
              <Badge variant="outline" className={cn("text-[10px]", materialColors[item.material])}>
                {item.material}
              </Badge>
            </div>
            <CardTitle className="text-base text-purple-300 group-hover:text-purple-200">{item.name}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{item.type}</p>
          </div>
          <Shield className="w-8 h-8 text-purple-500/30" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs text-slate-400 italic line-clamp-2">{item.lore}</p>
        
        <div className="space-y-1.5">
          <StatBar label="HP" value={Math.round(tierHp)} maxValue={maxStats.hp || 1} color="text-green-400" icon={Heart} />
          <StatBar label="Mana" value={Math.round(tierMana)} maxValue={maxStats.mana || 1} color="text-blue-400" icon={Zap} />
          <StatBar label="Crit" value={Math.round(tierCrit * 10) / 10} maxValue={maxStats.crit || 1} color="text-yellow-400" icon={Target} />
          <StatBar label="Block" value={Math.round(tierBlock * 10) / 10} maxValue={maxStats.block || 1} color="text-orange-400" icon={Shield} />
          <StatBar label="Defense" value={Math.round(tierDef)} maxValue={maxStats.defense || 1} color="text-purple-400" icon={Shield} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Passive</div>
            <p className="text-xs text-emerald-300">{item.passive}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Attribute</div>
            <p className="text-xs text-cyan-300">{item.attribute}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Effect</div>
            <p className="text-xs text-amber-300">{item.effect}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Proc</div>
            <p className="text-xs text-pink-300">{item.proc}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Set Bonus</div>
          <p className="text-xs text-yellow-300">{item.setBonus}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArsenalPage() {
  const [category, setCategory] = useState<ItemCategory>("weapons");
  const [tier, setTier] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [weaponType, setWeaponType] = useState<string>("all");
  const [armorMaterial, setArmorMaterial] = useState<string>("all");
  const [armorSet, setArmorSet] = useState<string>("all");
  const [armorSlot, setArmorSlot] = useState<string>("all");

  const weaponTypes = useMemo(() => {
    const types = new Set(ALL_WEAPONS.map(w => w.type));
    return ["all", ...Array.from(types)];
  }, []);

  const filteredWeapons = useMemo(() => {
    return ALL_WEAPONS.filter(w => {
      if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (weaponType !== "all" && w.type !== weaponType) return false;
      return true;
    });
  }, [searchQuery, weaponType]);

  const filteredEquipment = useMemo(() => {
    return ALL_EQUIPMENT.filter(e => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (armorMaterial !== "all" && e.material !== armorMaterial) return false;
      if (armorSlot !== "all" && e.type !== armorSlot) return false;
      if (armorSet !== "all" && !e.id.includes(armorSet.toLowerCase())) return false;
      return true;
    });
  }, [searchQuery, armorMaterial, armorSlot, armorSet]);

  const weaponMaxStats = useMemo((): WeaponMaxStats => {
    if (filteredWeapons.length === 0) {
      return { damage: 1, speed: 1, combo: 1, crit: 1, block: 1, defense: 1 };
    }
    return filteredWeapons.reduce((max, w) => {
      const s = w.stats;
      return {
        damage: Math.max(max.damage, s.damageBase + s.damagePerTier * tier),
        speed: Math.max(max.speed, s.speedBase + s.speedPerTier * tier),
        combo: Math.max(max.combo, s.comboBase + s.comboPerTier * tier),
        crit: Math.max(max.crit, s.critBase + s.critPerTier * tier),
        block: Math.max(max.block, s.blockBase + s.blockPerTier * tier),
        defense: Math.max(max.defense, s.defenseBase + s.defensePerTier * tier),
      };
    }, { damage: 0, speed: 0, combo: 0, crit: 0, block: 0, defense: 0 });
  }, [filteredWeapons, tier]);

  const equipmentMaxStats = useMemo((): EquipmentMaxStats => {
    if (filteredEquipment.length === 0) {
      return { hp: 1, mana: 1, crit: 1, block: 1, defense: 1 };
    }
    return filteredEquipment.reduce((max, e) => {
      const s = e.stats;
      return {
        hp: Math.max(max.hp, s.hpBase + s.hpPerTier * tier),
        mana: Math.max(max.mana, s.manaBase + s.manaPerTier * tier),
        crit: Math.max(max.crit, s.critBase + s.critPerTier * tier),
        block: Math.max(max.block, s.blockBase + s.blockPerTier * tier),
        defense: Math.max(max.defense, s.defenseBase + s.defensePerTier * tier),
      };
    }, { hp: 0, mana: 0, crit: 0, block: 0, defense: 0 });
  }, [filteredEquipment, tier]);

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <header className="flex-shrink-0">
        <h1 className="text-3xl font-bold font-uncial gold-text mb-1">Arsenal</h1>
        <p className="text-slate-400 text-sm">Browse weapons, armor, and equipment with tier-scaled stats and effects.</p>
      </header>

      <div className="flex-shrink-0 flex flex-wrap items-center gap-4">
        <Tabs value={category} onValueChange={(v) => setCategory(v as ItemCategory)} className="flex-shrink-0">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="weapons" className="data-[state=active]:bg-cyan-600" data-testid="tab-weapons">
              <Sword className="w-4 h-4 mr-2" />Weapons
            </TabsTrigger>
            <TabsTrigger value="armor" className="data-[state=active]:bg-purple-600" data-testid="tab-armor">
              <Shield className="w-4 h-4 mr-2" />Armor
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TierSelector tier={tier} setTier={setTier} />

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-600"
            data-testid="search-items"
          />
        </div>
      </div>

      {category === "weapons" && (
        <div className="flex-shrink-0 flex gap-2">
          <Select value={weaponType} onValueChange={setWeaponType}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-600" data-testid="filter-weapon-type">
              <SelectValue placeholder="Weapon Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {weaponTypes.map(type => (
                <SelectItem key={type} value={type}>{type === "all" ? "All Types" : type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === "armor" && (
        <div className="flex-shrink-0 flex flex-wrap gap-2">
          <Select value={armorMaterial} onValueChange={setArmorMaterial}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600" data-testid="filter-material">
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all">All Materials</SelectItem>
              {ARMOR_MATERIALS.map(mat => (
                <SelectItem key={mat} value={mat}>{mat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={armorSet} onValueChange={setArmorSet}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-600" data-testid="filter-set">
              <SelectValue placeholder="Set" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all">All Sets</SelectItem>
              {EQUIPMENT_SETS.map(set => (
                <SelectItem key={set} value={set}>{set}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={armorSlot} onValueChange={setArmorSlot}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600" data-testid="filter-slot">
              <SelectValue placeholder="Slot" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all">All Slots</SelectItem>
              {EQUIPMENT_SLOTS.map(slot => (
                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {category === "weapons" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWeapons.map(weapon => (
              <WeaponCard key={weapon.id} weapon={weapon} tier={tier} maxStats={weaponMaxStats} />
            ))}
            {filteredWeapons.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No weapons found matching your filters.
              </div>
            )}
          </div>
        )}

        {category === "armor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEquipment.map(item => (
              <EquipmentCard key={item.id} item={item} tier={tier} maxStats={equipmentMaxStats} />
            ))}
            {filteredEquipment.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No equipment found matching your filters.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-xs text-slate-500 text-center pt-2 border-t border-slate-700">
        Showing {category === "weapons" ? filteredWeapons.length : filteredEquipment.length} items at Tier {tier}
      </div>
    </div>
  );
}
