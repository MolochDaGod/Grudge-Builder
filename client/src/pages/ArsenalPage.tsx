import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Sword, Shield, Search, Filter, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { 
  SWORDS, AXES, BOWS, CROSSBOWS, GUNS, DAGGERS, 
  GREATAXES, GREATSWORDS, HAMMERS_2H, STAVES, TOMES,
  type Weapon 
} from '@shared/definitions/weaponsData';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { 
  CLOTH_EQUIPMENT, LEATHER_EQUIPMENT, METAL_EQUIPMENT,
  type EquipmentItem 
} from '@shared/definitions/equipmentData';

type TabType = 'weapons' | 'armor';
type WeaponCategory = '1h' | '2h' | 'Ranged 2h' | 'Magic';

const WEAPON_TYPE_ICONS: Record<string, string> = {
  Sword: '⚔️',
  Axe: '🪓',
  Dagger: '🗡️',
  Hammer1h: '🔨',
  Greatsword: '⚔️',
  Greataxe: '🪓',
  Hammer2h: '🔨',
  Bow: '🏹',
  Crossbow: '🎯',
  Gun: '🔫',
  'Fire Staff': '🔥',
  'Frost Staff': '❄️',
  'Nature Staff': '🌿',
  'Holy Staff': '✨',
  'Arcane Staff': '💜',
  'Lightning Staff': '⚡',
  'Fire Tome': '📕',
  'Frost Tome': '📘',
  'Nature Tome': '📗',
  'Holy Tome': '📒',
  'Arcane Tome': '📓',
  'Lightning Tome': '📔',
};

const ARMOR_ICONS: Record<string, string> = {
  Helm: '🪖',
  Shoulder: '🦺',
  Chest: '👕',
  Hands: '🧤',
  Feet: '👢',
  Ring: '💍',
  Necklace: '📿',
  Relic: '🔮',
  Offhand: '🛡️',
};

const MATERIAL_COLORS: Record<string, string> = {
  Cloth: 'from-purple-500/20 to-blue-500/20 border-purple-500/50',
  Leather: 'from-amber-500/20 to-orange-500/20 border-amber-500/50',
  Metal: 'from-slate-400/20 to-zinc-500/20 border-slate-400/50',
  Gem: 'from-pink-500/20 to-rose-500/20 border-pink-500/50',
};

const PROFESSION_COLORS: Record<string, string> = {
  Miner: '#ef4444',
  Forester: '#22c55e',
  Engineer: '#3b82f6',
  Mystic: '#a855f7',
};

function getAllWeapons(): Weapon[] {
  return [
    ...SWORDS, ...AXES, ...DAGGERS,
    ...GREATSWORDS, ...GREATAXES, ...(HAMMERS_2H || []),
    ...BOWS, ...CROSSBOWS, ...GUNS,
    ...(STAVES || []), ...(TOMES || []),
  ];
}

function WeaponCard({ weapon, tier }: { weapon: Weapon; tier: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tierBonus = tier - 1;
  
  const stats = useMemo(() => ({
    damage: Math.round(weapon.stats.damageBase + weapon.stats.damagePerTier * tierBonus),
    speed: Math.round(weapon.stats.speedBase + weapon.stats.speedPerTier * tierBonus),
    combo: Math.round(weapon.stats.comboBase + weapon.stats.comboPerTier * tierBonus),
    crit: (weapon.stats.critBase + weapon.stats.critPerTier * tierBonus).toFixed(1),
    block: (weapon.stats.blockBase + weapon.stats.blockPerTier * tierBonus).toFixed(1),
    defense: Math.round(weapon.stats.defenseBase + weapon.stats.defensePerTier * tierBonus),
  }), [weapon, tierBonus]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden",
        "hover:border-amber-500/50 transition-all cursor-pointer"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid={`weapon-card-${weapon.id}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{WEAPON_TYPE_ICONS[weapon.type] || '⚔️'}</div>
            <div>
              <h3 className="font-bold text-amber-400 font-serif">{weapon.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">{weapon.type}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{weapon.category}</span>
              </div>
            </div>
          </div>
          <div 
            className="px-2 py-1 rounded text-xs font-bold"
            style={{ backgroundColor: `${PROFESSION_COLORS[weapon.craftedBy]}20`, color: PROFESSION_COLORS[weapon.craftedBy] }}
          >
            {weapon.craftedBy}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic mb-3">{weapon.lore}</p>

        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-red-500/10 rounded px-2 py-1 text-center">
            <div className="text-red-400 font-bold">{stats.damage}</div>
            <div className="text-slate-500">DMG</div>
          </div>
          <div className="bg-blue-500/10 rounded px-2 py-1 text-center">
            <div className="text-blue-400 font-bold">{stats.speed}</div>
            <div className="text-slate-500">SPD</div>
          </div>
          <div className="bg-amber-500/10 rounded px-2 py-1 text-center">
            <div className="text-amber-400 font-bold">{stats.crit}%</div>
            <div className="text-slate-500">CRIT</div>
          </div>
        </div>

        <div className="flex gap-2 text-xs text-slate-400">
          <span>🎯 {stats.combo} Combo</span>
          <span>🛡️ {stats.block}% Block</span>
          <span>🔰 {stats.defense} Def</span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50 overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-400 mb-1">Basic Attack</h4>
                <p className="text-xs text-slate-300">{weapon.basicAbility}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-blue-400 mb-1">Abilities</h4>
                <div className="flex flex-wrap gap-1">
                  {weapon.abilities.slice(0, 6).map((ability, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 rounded text-xs text-blue-300">
                      {ability.split('(')[0].trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-400 mb-1">Signature</h4>
                <p className="text-xs text-amber-300">{weapon.signatureAbility}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-purple-400 mb-1">Passives</h4>
                <div className="flex flex-wrap gap-1">
                  {weapon.passives.map((passive, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/10 rounded text-xs text-purple-300">
                      {passive.split('(')[0].trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ArmorCard({ item, tier }: { item: EquipmentItem; tier: number }) {
  const tierBonus = tier - 1;
  const stats = useMemo(() => ({
    hp: Math.round(item.stats.hpBase + item.stats.hpPerTier * tierBonus),
    mana: Math.round(item.stats.manaBase + item.stats.manaPerTier * tierBonus),
    crit: (item.stats.critBase + item.stats.critPerTier * tierBonus).toFixed(1),
    block: (item.stats.blockBase + item.stats.blockPerTier * tierBonus).toFixed(1),
    defense: Math.round(item.stats.defenseBase + item.stats.defensePerTier * tierBonus),
  }), [item, tierBonus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br rounded-xl border overflow-hidden p-4",
        MATERIAL_COLORS[item.material]
      )}
      data-testid={`armor-card-${item.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ARMOR_ICONS[item.type]}</span>
          <div>
            <h3 className="font-bold text-sm text-white font-serif">{item.name}</h3>
            <span className="text-xs text-slate-400">{item.type} • {item.material}</span>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">{item.attribute}</span>
      </div>

      <p className="text-xs text-slate-500 italic mb-2">{item.lore}</p>

      <div className="grid grid-cols-5 gap-1 text-xs mb-2">
        <div className="text-center">
          <div className="text-red-400 font-bold">{stats.hp}</div>
          <div className="text-slate-500 text-[10px]">HP</div>
        </div>
        <div className="text-center">
          <div className="text-blue-400 font-bold">{stats.mana}</div>
          <div className="text-slate-500 text-[10px]">MP</div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 font-bold">{stats.crit}%</div>
          <div className="text-slate-500 text-[10px]">CRIT</div>
        </div>
        <div className="text-center">
          <div className="text-emerald-400 font-bold">{stats.block}%</div>
          <div className="text-slate-500 text-[10px]">BLK</div>
        </div>
        <div className="text-center">
          <div className="text-slate-300 font-bold">{stats.defense}</div>
          <div className="text-slate-500 text-[10px]">DEF</div>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex gap-1">
          <span className="text-purple-400">Passive:</span>
          <span className="text-slate-300">{item.passive}</span>
        </div>
        <div className="flex gap-1">
          <span className="text-blue-400">Effect:</span>
          <span className="text-slate-300">{item.effect}</span>
        </div>
        <div className="flex gap-1">
          <span className="text-amber-400">Proc:</span>
          <span className="text-slate-300">{item.proc}</span>
        </div>
        <div className="flex gap-1">
          <span className="text-emerald-400">Set:</span>
          <span className="text-slate-300">{item.setBonus}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ArsenalPage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('weapons');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<WeaponCategory | 'all'>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');

  const allWeapons = useMemo(() => getAllWeapons(), []);
  
  const filteredWeapons = useMemo(() => {
    return allWeapons.filter(weapon => {
      const matchesSearch = weapon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           weapon.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                             weapon.category === selectedCategory ||
                             (selectedCategory === 'Magic' && (weapon.type.includes('Staff') || weapon.type.includes('Tome')));
      return matchesSearch && matchesCategory;
    });
  }, [allWeapons, searchQuery, selectedCategory]);

  const allArmor = useMemo(() => {
    const cloth = CLOTH_EQUIPMENT || [];
    const leather = LEATHER_EQUIPMENT || [];
    const metal = METAL_EQUIPMENT || [];
    return [...cloth, ...leather, ...metal];
  }, []);

  const filteredArmor = useMemo(() => {
    return allArmor.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMaterial = selectedMaterial === 'all' || item.material === selectedMaterial;
      return matchesSearch && matchesMaterial;
    });
  }, [allArmor, searchQuery, selectedMaterial]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/home')}
                className="text-slate-400 hover:text-white"
                data-testid="btn-back"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <h1 className="text-3xl font-bold text-amber-400 font-serif flex items-center gap-2">
                <Sparkles className="w-8 h-8" /> Arsenal
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('weapons')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
                  activeTab === 'weapons' 
                    ? "bg-amber-500 text-black" 
                    : "text-slate-400 hover:text-white"
                )}
                data-testid="tab-weapons"
              >
                <Sword className="w-4 h-4" /> Weapons
              </button>
              <button
                onClick={() => setActiveTab('armor')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
                  activeTab === 'armor' 
                    ? "bg-amber-500 text-black" 
                    : "text-slate-400 hover:text-white"
                )}
                data-testid="tab-armor"
              >
                <Shield className="w-4 h-4" /> Armor
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500"
                data-testid="input-search"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tier:</span>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                data-testid="select-tier"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(t => (
                  <option key={t} value={t}>T{t}</option>
                ))}
              </select>
            </div>

            {activeTab === 'weapons' && (
              <div className="flex gap-1">
                {['all', '1h', '2h', 'Ranged 2h', 'Magic'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as WeaponCategory | 'all')}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-semibold transition-all",
                      selectedCategory === cat
                        ? "bg-amber-500 text-black"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    )}
                    data-testid={`filter-${cat}`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'armor' && (
              <div className="flex gap-1">
                {['all', 'Cloth', 'Leather', 'Metal'].map(mat => (
                  <button
                    key={mat}
                    onClick={() => setSelectedMaterial(mat)}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-semibold transition-all",
                      selectedMaterial === mat
                        ? "bg-amber-500 text-black"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    )}
                    data-testid={`filter-${mat}`}
                  >
                    {mat === 'all' ? 'All' : mat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 mb-4">
            Showing {activeTab === 'weapons' ? filteredWeapons.length : filteredArmor.length} items
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'weapons' && (
              <motion.div
                key="weapons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredWeapons.map(weapon => (
                  <WeaponCard key={weapon.id} weapon={weapon} tier={selectedTier} />
                ))}
              </motion.div>
            )}

            {activeTab === 'armor' && (
              <motion.div
                key="armor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredArmor.map(item => (
                  <ArmorCard key={item.id} item={item} tier={selectedTier} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
