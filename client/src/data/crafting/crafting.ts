export { TIER_COSTS, CRAFTING_MATERIALS, getMaterialsByTier, getMaterialsByCategory, getMaterialsByProfession, getMaterialById, getTierCost } from "./materials";

export const STATIONS = [
  { id: 'Smithing Table', name: 'Miner', icon: '⚒️', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'Lumber Table', name: 'Forester', icon: '🌲', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { id: 'Loom Table', name: 'Mystic', icon: '🔮', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 'Cooking Table', name: 'Chef', icon: '👨‍🍳', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'Tinker Table', name: 'Engineer', icon: '🔧', color: 'text-orange-600', bg: 'bg-orange-600/10', border: 'border-orange-600/30' },
];

export const FILTERS = ['Weapons', 'Armor', 'Utilities', 'Refining'];
export const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

export interface CraftingRecipe {
  id: string;
  name: string;
  type: 'Weapons' | 'Armor' | 'Utilities' | 'Refining';
  tier: string;
  station: string;
  time: string;
  chance: string;
  mats: Record<string, number>;
  description?: string;
}

export const RECIPES: CraftingRecipe[] = [
  // Dock / open-water (Forester Lumber Table + dock UI)
  {
    id: 'waveboard',
    name: 'Waveboard',
    type: 'Utilities',
    tier: 'T1',
    station: 'Lumber Table',
    time: '8s',
    chance: '100%',
    mats: { 'Wood Scraps': 2, 'Scrap Cloth': 2 },
    description:
      'Back-slot open-water board. Craft at dock: 2 wood + 2 cloth. Deploy with B on the ocean.',
  },

  { id: 'copper-ingot', name: 'Copper Ingot', type: 'Refining', tier: 'T1', station: 'Smithing Table', time: '3s', chance: '100%', mats: { 'Copper Ore': 3, 'Coal': 1 }, description: 'Basic smelted metal' },
  { id: 'iron-ingot', name: 'Iron Ingot', type: 'Refining', tier: 'T2', station: 'Smithing Table', time: '4s', chance: '100%', mats: { 'Iron Ore': 3, 'Coal': 1, 'Flux': 1 }, description: 'Common crafting metal' },
  { id: 'steel-ingot', name: 'Steel Ingot', type: 'Refining', tier: 'T3', station: 'Smithing Table', time: '5s', chance: '98%', mats: { 'Steel Ore': 4, 'Coal': 2, 'Flux': 1 }, description: 'Quality refined metal' },
  { id: 'mithril-ingot', name: 'Mithril Ingot', type: 'Refining', tier: 'T4', station: 'Smithing Table', time: '6s', chance: '95%', mats: { 'Mithril Ore': 5, 'Coal': 2, 'Flux': 2 }, description: 'Rare lightweight metal' },
  { id: 'adamantine-ingot', name: 'Adamantine Ingot', type: 'Refining', tier: 'T5', station: 'Smithing Table', time: '8s', chance: '90%', mats: { 'Adamantine Ore': 6, 'Coal': 3, 'Superior Essence': 1 }, description: 'Nearly indestructible metal' },
  { id: 'orichalcum-ingot', name: 'Orichalcum Ingot', type: 'Refining', tier: 'T6', station: 'Smithing Table', time: '10s', chance: '85%', mats: { 'Orichalcum Ore': 8, 'Coal': 4, 'Perfect Essence': 1 }, description: 'Legendary mythical metal' },
  { id: 'starmetal-ingot', name: 'Starmetal Ingot', type: 'Refining', tier: 'T7', station: 'Smithing Table', time: '12s', chance: '80%', mats: { 'Starmetal Ore': 10, 'Coal': 5, 'Ancient Essence': 1 }, description: 'Celestial fallen metal' },
  { id: 'divine-ingot', name: 'Divine Ingot', type: 'Refining', tier: 'T8', station: 'Smithing Table', time: '15s', chance: '75%', mats: { 'Divine Ore': 12, 'Coal': 6, 'Divine Essence': 2 }, description: 'Godly blessed metal' },
  
  { id: 'iron-sword', name: 'Bloodfeud Blade', type: 'Weapons', tier: 'T2', station: 'Smithing Table', time: '5s', chance: '95%', mats: { 'Iron Ingot': 5, 'Rawhide': 2, 'Coal': 2 }, description: 'Forged in endless clan blood feuds' },
  { id: 'steel-axe', name: 'Gorehowl', type: 'Weapons', tier: 'T3', station: 'Smithing Table', time: '6s', chance: '92%', mats: { 'Steel Ingot': 6, 'Oak Plank': 2, 'Thick Hide': 2 }, description: 'Howls with the gore of fallen foes' },
  { id: 'mithril-dagger', name: 'Nightfang', type: 'Weapons', tier: 'T4', station: 'Smithing Table', time: '7s', chance: '88%', mats: { 'Mithril Ingot': 4, 'Silk Cloth': 1, 'Fine Gem': 1 }, description: 'Fang of endless night grudges' },
  { id: 'adamantine-greatsword', name: 'Doomspire', type: 'Weapons', tier: 'T5', station: 'Smithing Table', time: '10s', chance: '85%', mats: { 'Adamantine Ingot': 10, 'Ironwood Plank': 3, 'Pristine Gem': 1, 'Refined Essence': 2 }, description: 'Spire of impending doom' },
  { id: 'orichalcum-greataxe', name: 'Skullsunder', type: 'Weapons', tier: 'T6', station: 'Smithing Table', time: '12s', chance: '80%', mats: { 'Orichalcum Ingot': 12, 'Ebony Plank': 4, 'Flawless Gem': 2, 'Perfect Essence': 2 }, description: 'Sunders skulls in massive swings' },
  { id: 'starmetal-hammer', name: 'Titanmaul', type: 'Weapons', tier: 'T7', station: 'Smithing Table', time: '14s', chance: '75%', mats: { 'Starmetal Ingot': 15, 'Wyrmwood Plank': 5, 'Radiant Gem': 2, 'Ancient Essence': 3 }, description: 'Maul of titanic grudges' },
  { id: 'divine-sword', name: 'Divine Blade', type: 'Weapons', tier: 'T8', station: 'Smithing Table', time: '18s', chance: '70%', mats: { 'Divine Ingot': 20, 'Worldtree Plank': 6, 'Divine Gem': 3, 'Divine Essence': 5 }, description: 'Weapon blessed by the gods' },

  { id: 'metal-bloodfeud-helm', name: 'Bloodfeud Helm (Metal)', type: 'Armor', tier: 'T2', station: 'Smithing Table', time: '6s', chance: '95%', mats: { 'Iron Ingot': 4, 'Rawhide': 2, 'Coal': 1 }, description: 'Forged tank protection' },
  { id: 'metal-bloodfeud-chest', name: 'Bloodfeud Chest (Metal)', type: 'Armor', tier: 'T3', station: 'Smithing Table', time: '8s', chance: '92%', mats: { 'Steel Ingot': 8, 'Rugged Leather': 3, 'Flux': 2 }, description: 'Heavy tank protection' },
  
  { id: 'pine-plank', name: 'Pine Plank', type: 'Refining', tier: 'T1', station: 'Lumber Table', time: '3s', chance: '100%', mats: { 'Pine Log': 2 }, description: 'Processed softwood' },
  { id: 'oak-plank', name: 'Oak Plank', type: 'Refining', tier: 'T2', station: 'Lumber Table', time: '4s', chance: '100%', mats: { 'Oak Log': 2, 'String': 1 }, description: 'Sturdy hardwood boards' },
  { id: 'maple-plank', name: 'Maple Plank', type: 'Refining', tier: 'T3', station: 'Lumber Table', time: '5s', chance: '98%', mats: { 'Maple Log': 3 }, description: 'Quality maple boards' },
  { id: 'ash-plank', name: 'Ash Plank', type: 'Refining', tier: 'T4', station: 'Lumber Table', time: '6s', chance: '95%', mats: { 'Ash Log': 3, 'Bowstring': 1 }, description: 'Resilient ash boards' },
  { id: 'ironwood-plank', name: 'Ironwood Plank', type: 'Refining', tier: 'T5', station: 'Lumber Table', time: '8s', chance: '90%', mats: { 'Ironwood Log': 4, 'Refined Essence': 1 }, description: 'Metal-hard planks' },
  { id: 'ebony-plank', name: 'Ebony Plank', type: 'Refining', tier: 'T6', station: 'Lumber Table', time: '10s', chance: '85%', mats: { 'Ebony Log': 5, 'Perfect Essence': 1 }, description: 'Dark legendary planks' },
  { id: 'wyrmwood-plank', name: 'Wyrmwood Plank', type: 'Refining', tier: 'T7', station: 'Lumber Table', time: '12s', chance: '80%', mats: { 'Wyrmwood Log': 6, 'Ancient Essence': 1 }, description: 'Dragon-touched planks' },
  { id: 'worldtree-plank', name: 'Worldtree Plank', type: 'Refining', tier: 'T8', station: 'Lumber Table', time: '15s', chance: '75%', mats: { 'Worldtree Log': 8, 'Divine Essence': 2 }, description: 'Sacred world planks' },
  
  { id: 'oak-bow', name: 'Wraithbone Bow', type: 'Weapons', tier: 'T2', station: 'Lumber Table', time: '5s', chance: '95%', mats: { 'Oak Plank': 3, 'Bowstring': 2, 'Rawhide': 1 }, description: 'Carved from wraith bones' },
  { id: 'maple-bow', name: 'Bloodstring Bow', type: 'Weapons', tier: 'T3', station: 'Lumber Table', time: '6s', chance: '92%', mats: { 'Maple Plank': 4, 'Bowstring': 3, 'Thick Hide': 2 }, description: 'Strung with strings of blood' },
  { id: 'ash-bow', name: 'Shadowflight Bow', type: 'Weapons', tier: 'T4', station: 'Lumber Table', time: '8s', chance: '88%', mats: { 'Ash Plank': 5, 'Bowstring': 4, 'Superior Essence': 1 }, description: 'Flies shadows as arrows' },
  { id: 'ironwood-bow', name: 'Emberthorn Bow', type: 'Weapons', tier: 'T5', station: 'Lumber Table', time: '10s', chance: '85%', mats: { 'Ironwood Plank': 6, 'Bowstring': 5, 'Refined Essence': 2, 'Pristine Gem': 1 }, description: 'Thorns of ember fire' },
  { id: 'ebony-bow', name: 'Ironvine Bow', type: 'Weapons', tier: 'T6', station: 'Lumber Table', time: '12s', chance: '80%', mats: { 'Ebony Plank': 8, 'Bowstring': 6, 'Perfect Essence': 2, 'Flawless Gem': 1 }, description: 'Vines of iron entangle' },
  { id: 'wyrmwood-bow', name: 'Duskreaver Bow', type: 'Weapons', tier: 'T7', station: 'Lumber Table', time: '14s', chance: '75%', mats: { 'Wyrmwood Plank': 10, 'Bowstring': 8, 'Ancient Essence': 3, 'Radiant Gem': 2 }, description: 'Reaves at dusk fall' },

  { id: 'leather-bloodfeud-helm', name: 'Bloodfeud Helm (Leather)', type: 'Armor', tier: 'T2', station: 'Lumber Table', time: '6s', chance: '95%', mats: { 'Thick Hide': 4, 'Oak Plank': 2 }, description: 'Rogue leather protection' },
  { id: 'leather-bloodfeud-chest', name: 'Bloodfeud Chest (Leather)', type: 'Armor', tier: 'T3', station: 'Lumber Table', time: '8s', chance: '92%', mats: { 'Rugged Leather': 6, 'Maple Plank': 3 }, description: 'Agility-focused protection' },
  
  { id: 'linen-cloth', name: 'Linen Cloth', type: 'Refining', tier: 'T1', station: 'Loom Table', time: '3s', chance: '100%', mats: { 'Linen Thread': 4 }, description: 'Woven linen' },
  { id: 'wool-cloth', name: 'Wool Cloth', type: 'Refining', tier: 'T2', station: 'Loom Table', time: '4s', chance: '100%', mats: { 'Wool Thread': 4, 'Minor Essence': 1 }, description: 'Woven wool fabric' },
  { id: 'cotton-cloth', name: 'Cotton Cloth', type: 'Refining', tier: 'T3', station: 'Loom Table', time: '5s', chance: '98%', mats: { 'Cotton Thread': 5, 'Lesser Essence': 1 }, description: 'Quality cotton fabric' },
  { id: 'silk-cloth', name: 'Silk Cloth', type: 'Refining', tier: 'T4', station: 'Loom Table', time: '6s', chance: '95%', mats: { 'Silk Thread': 6, 'Greater Essence': 1 }, description: 'Luxurious silk fabric' },
  { id: 'moonweave-cloth', name: 'Moonweave Cloth', type: 'Refining', tier: 'T5', station: 'Loom Table', time: '8s', chance: '90%', mats: { 'Moonweave Thread': 8, 'Superior Essence': 2 }, description: 'Lunar fabric' },
  { id: 'starweave-cloth', name: 'Starweave Cloth', type: 'Refining', tier: 'T6', station: 'Loom Table', time: '10s', chance: '85%', mats: { 'Starweave Thread': 10, 'Refined Essence': 2 }, description: 'Star fabric' },
  { id: 'voidweave-cloth', name: 'Voidweave Cloth', type: 'Refining', tier: 'T7', station: 'Loom Table', time: '12s', chance: '80%', mats: { 'Voidweave Thread': 12, 'Perfect Essence': 3 }, description: 'Void fabric' },
  { id: 'divine-cloth', name: 'Divine Cloth', type: 'Refining', tier: 'T8', station: 'Loom Table', time: '15s', chance: '75%', mats: { 'Divine Thread': 15, 'Divine Essence': 4 }, description: 'Holy fabric' },
  
  { id: 'fire-staff', name: 'Emberwrath Staff', type: 'Weapons', tier: 'T3', station: 'Loom Table', time: '8s', chance: '90%', mats: { 'Cotton Cloth': 3, 'Maple Plank': 4, 'Greater Essence': 3, 'Standard Gem': 1 }, description: 'Wrath of burning embers' },
  { id: 'frost-staff', name: 'Glacial Spire', type: 'Weapons', tier: 'T4', station: 'Loom Table', time: '10s', chance: '88%', mats: { 'Silk Cloth': 4, 'Ash Plank': 5, 'Superior Essence': 4, 'Fine Gem': 1 }, description: 'Spire of glacial cold' },
  { id: 'holy-staff', name: 'Dawnspire', type: 'Weapons', tier: 'T5', station: 'Loom Table', time: '12s', chance: '85%', mats: { 'Moonweave Cloth': 5, 'Ironwood Plank': 6, 'Refined Essence': 5, 'Pristine Gem': 2 }, description: 'Spire of dawning light' },
  { id: 'lightning-staff', name: 'Stormwrath', type: 'Weapons', tier: 'T6', station: 'Loom Table', time: '14s', chance: '80%', mats: { 'Starweave Cloth': 6, 'Ebony Plank': 7, 'Perfect Essence': 6, 'Flawless Gem': 2 }, description: 'Wrath of storms' },
  { id: 'arcane-staff', name: 'Voidspire', type: 'Weapons', tier: 'T7', station: 'Loom Table', time: '16s', chance: '75%', mats: { 'Voidweave Cloth': 8, 'Wyrmwood Plank': 8, 'Ancient Essence': 8, 'Radiant Gem': 3 }, description: 'Spire into the void' },

  { id: 'cloth-bloodfeud-helm', name: 'Bloodfeud Helm (Cloth)', type: 'Armor', tier: 'T2', station: 'Loom Table', time: '6s', chance: '95%', mats: { 'Wool Cloth': 3, 'Lesser Essence': 2, 'Flawed Gem': 1 }, description: 'Mage cloth protection' },
  { id: 'cloth-bloodfeud-chest', name: 'Bloodfeud Chest (Cloth)', type: 'Armor', tier: 'T3', station: 'Loom Table', time: '8s', chance: '92%', mats: { 'Cotton Cloth': 5, 'Greater Essence': 3, 'Standard Gem': 1 }, description: 'Arcane protection' },
  
  { id: 'grilled-fish', name: 'Grilled Fish', type: 'Utilities', tier: 'T1', station: 'Cooking Table', time: '2s', chance: '100%', mats: { 'Raw Fish': 1, 'Salt': 1 }, description: '+10 HP regen for 30s' },
  { id: 'meat-stew', name: 'Meat Stew', type: 'Utilities', tier: 'T2', station: 'Cooking Table', time: '4s', chance: '100%', mats: { 'Raw Meat': 2, 'Vegetables': 2, 'Salt': 1 }, description: '+20 HP regen for 60s' },
  { id: 'spiced-roast', name: 'Spiced Roast', type: 'Utilities', tier: 'T3', station: 'Cooking Table', time: '6s', chance: '98%', mats: { 'Prime Meat': 2, 'Spice': 2, 'Herb': 2 }, description: '+30 HP regen, +10% atk for 90s' },
  { id: 'mana-brew', name: 'Mana Brew', type: 'Utilities', tier: 'T3', station: 'Cooking Table', time: '5s', chance: '95%', mats: { 'Honey': 2, 'Mushroom': 3, 'Greater Essence': 1 }, description: '+50 Mana restore' },
  { id: 'feast-of-kings', name: 'Feast of Kings', type: 'Utilities', tier: 'T5', station: 'Cooking Table', time: '15s', chance: '90%', mats: { 'Prime Meat': 5, 'Vegetables': 5, 'Rare Spice': 3, 'Honey': 2 }, description: '+All stats for 5min' },
  { id: 'dragon-feast', name: 'Dragon Feast', type: 'Utilities', tier: 'T7', station: 'Cooking Table', time: '20s', chance: '80%', mats: { 'Prime Meat': 10, 'Dragon Pepper': 3, 'Celestial Herb': 2, 'Ancient Essence': 2 }, description: '+Fire resist, +50% dmg' },
  { id: 'divine-ambrosia', name: 'Divine Ambrosia', type: 'Utilities', tier: 'T8', station: 'Cooking Table', time: '30s', chance: '70%', mats: { 'Divine Nectar': 5, 'Celestial Herb': 5, 'Divine Essence': 3 }, description: 'Resurrection + full heal' },

  { id: 'health-potion', name: 'Health Potion', type: 'Utilities', tier: 'T1', station: 'Cooking Table', time: '3s', chance: '100%', mats: { 'Herb': 3, 'Salt': 1, 'Minor Essence': 1 }, description: 'Restore 100 HP instantly' },
  { id: 'mana-potion', name: 'Mana Potion', type: 'Utilities', tier: 'T2', station: 'Cooking Table', time: '4s', chance: '100%', mats: { 'Mushroom': 3, 'Honey': 1, 'Lesser Essence': 1 }, description: 'Restore 100 Mana instantly' },
  { id: 'stamina-potion', name: 'Stamina Elixir', type: 'Utilities', tier: 'T3', station: 'Cooking Table', time: '5s', chance: '95%', mats: { 'Herb': 4, 'Spice': 2, 'Greater Essence': 1 }, description: '+20% move speed for 60s' },
  
  { id: 'bronze-gear', name: 'Bronze Gear', type: 'Refining', tier: 'T1', station: 'Tinker Table', time: '4s', chance: '98%', mats: { 'Copper Ingot': 2, 'Coal': 1 }, description: 'Basic mechanism' },
  { id: 'iron-gear', name: 'Iron Gear', type: 'Refining', tier: 'T2', station: 'Tinker Table', time: '5s', chance: '95%', mats: { 'Iron Ingot': 2, 'Coal': 1, 'Spring': 1 }, description: 'Standard mechanism' },
  { id: 'steel-gear', name: 'Steel Gear', type: 'Refining', tier: 'T3', station: 'Tinker Table', time: '6s', chance: '92%', mats: { 'Steel Ingot': 3, 'Coal': 2, 'Spring': 2 }, description: 'Quality mechanism' },
  { id: 'precision-gear', name: 'Precision Gear', type: 'Refining', tier: 'T4', station: 'Tinker Table', time: '8s', chance: '88%', mats: { 'Mithril Ingot': 3, 'Lens': 1, 'Circuit': 1 }, description: 'Fine mechanism' },
  { id: 'clockwork-core', name: 'Clockwork Core', type: 'Refining', tier: 'T5', station: 'Tinker Table', time: '10s', chance: '85%', mats: { 'Adamantine Ingot': 4, 'Precision Gear': 3, 'Circuit': 2 }, description: 'Complex mechanism' },
  { id: 'arcane-gear', name: 'Arcane Gear', type: 'Refining', tier: 'T6', station: 'Tinker Table', time: '12s', chance: '80%', mats: { 'Orichalcum Ingot': 5, 'Clockwork Core': 2, 'Perfect Essence': 2 }, description: 'Magic-infused gear' },
  
  { id: 'iron-crossbow', name: 'Ironveil Repeater', type: 'Weapons', tier: 'T2', station: 'Tinker Table', time: '6s', chance: '95%', mats: { 'Iron Gear': 3, 'Oak Plank': 4, 'Bowstring': 2 }, description: 'Rapid fire from iron veils' },
  { id: 'steel-crossbow', name: 'Skullpiercer', type: 'Weapons', tier: 'T3', station: 'Tinker Table', time: '8s', chance: '90%', mats: { 'Steel Gear': 4, 'Maple Plank': 5, 'Bowstring': 3, 'Lens': 1 }, description: 'Pierces skulls with precision' },
  { id: 'mithril-crossbow', name: 'Bloodreaver', type: 'Weapons', tier: 'T4', station: 'Tinker Table', time: '10s', chance: '85%', mats: { 'Precision Gear': 5, 'Ash Plank': 6, 'Circuit': 2 }, description: 'Reaves blood with bolts' },
  
  { id: 'iron-gun', name: 'Blackpowder Blaster', type: 'Weapons', tier: 'T3', station: 'Tinker Table', time: '10s', chance: '88%', mats: { 'Steel Gear': 5, 'Gunpowder': 5, 'Maple Plank': 3, 'Lens': 1 }, description: 'Blasts with ancient blackpowder' },
  { id: 'mithril-gun', name: 'Ironstorm Gun', type: 'Weapons', tier: 'T4', station: 'Tinker Table', time: '12s', chance: '82%', mats: { 'Precision Gear': 6, 'Gunpowder': 8, 'Ash Plank': 4, 'Circuit': 2 }, description: 'Storms of iron bullets' },
  { id: 'adamantine-gun', name: 'Bloodcannon', type: 'Weapons', tier: 'T5', station: 'Tinker Table', time: '14s', chance: '78%', mats: { 'Clockwork Core': 4, 'Gunpowder': 12, 'Ironwood Plank': 5, 'Refined Essence': 2 }, description: 'Cannon of blood tribute' },
  { id: 'orichalcum-gun', name: 'Wraithbarrel', type: 'Weapons', tier: 'T6', station: 'Tinker Table', time: '16s', chance: '72%', mats: { 'Arcane Gear': 5, 'Gunpowder': 15, 'Ebony Plank': 6, 'Perfect Essence': 3 }, description: 'Barrel whispers wraith grudges' },

  { id: 'auto-turret', name: 'Auto-Turret', type: 'Weapons', tier: 'T4', station: 'Tinker Table', time: '15s', chance: '85%', mats: { 'Precision Gear': 8, 'Iron Ingot': 10, 'Circuit': 3, 'Gunpowder': 5 }, description: 'Automated defense system' },
  { id: 'siege-cannon', name: 'Siege Cannon', type: 'Weapons', tier: 'T6', station: 'Tinker Table', time: '25s', chance: '75%', mats: { 'Arcane Gear': 10, 'Orichalcum Ingot': 15, 'Gunpowder': 20, 'Perfect Essence': 5 }, description: 'Fortress-breaking cannon' },
];

export const MOCK_RECIPES = RECIPES;
