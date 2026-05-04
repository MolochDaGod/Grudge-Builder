export const EQUIPMENT_SLOTS = {
  weapon: ['mainHand', 'offHand'] as const,
  armor: ['head', 'chest', 'legs', 'feet', 'hands', 'shoulders'] as const,
  accessory: ['ring1', 'ring2', 'necklace', 'back'] as const,
} as const;

export const WEAPON_TYPES = [
  'sword', 'axe', 'dagger', 'hammer', 'greatsword', 'greataxe', 'greathammer',
  'bow', 'crossbow', 'gun', 'staff', 'tome', 'shield', 'focus'
] as const;

export const ARMOR_TYPES = {
  head: ['helm', 'hood', 'circlet'],
  chest: ['plate', 'leather', 'robe'],
  legs: ['greaves', 'pants', 'skirt'],
  feet: ['boots', 'shoes', 'sandals'],
  hands: ['gauntlets', 'gloves', 'wraps'],
  shoulders: ['pauldrons', 'mantle', 'cape'],
} as const;

export const ACCESSORY_TYPES = {
  ring: ['band', 'signet', 'loop'],
  necklace: ['pendant', 'amulet', 'chain'],
  back: ['cape', 'cloak', 'wings'],
} as const;

export const ALL_TIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AllTier = typeof ALL_TIERS[number];

export const TIER_NAMES: Record<AllTier, string> = {
  0: 'Broken',
  1: 'Copper',
  2: 'Iron', 
  3: 'Steel',
  4: 'Mithril',
  5: 'Adamantine',
  6: 'Orichalcum',
  7: 'Starmetal',
  8: 'Divine',
};

export const TIER0_WEAPON_PREFIXES: Record<string, string> = {
  sword: 'Broken Blade',
  axe: 'Chipped Hatchet',
  dagger: 'Rusty Shiv',
  hammer: 'Cracked Mallet',
  greatsword: 'Shattered Claymore',
  greataxe: 'Splintered Broadaxe',
  greathammer: 'Ruined Maul',
  bow: 'Warped Bow',
  crossbow: 'Jammed Crossbow',
  gun: 'Broken Pistol',
  staff: 'Cracked Rod',
  tome: 'Faded Tome',
  shield: 'Dented Buckler',
  focus: 'Dim Orb',
};

export const TIER0_ARMOR_NAMES: Record<string, string> = {
  head: 'Tattered Cap',
  chest: 'Worn Tunic',
  legs: 'Patched Trousers',
  feet: 'Scuffed Boots',
  hands: 'Frayed Gloves',
  shoulders: 'Ragged Shawl',
};

export const TIER0_ACCESSORY_NAMES: Record<string, string> = {
  ring: 'Bent Ring',
  necklace: 'Frayed Cord',
  back: 'Tattered Cloak',
};

export const CRAFTING_COMPONENTS = {
  weapon: {
    sword: { component: 'blade-core', material: 'ingot' },
    axe: { component: 'axe-head', material: 'ingot' },
    dagger: { component: 'knife-blade', material: 'ingot' },
    hammer: { component: 'hammer-head', material: 'ingot' },
    greatsword: { component: 'great-blade', material: 'ingot' },
    greataxe: { component: 'great-head', material: 'ingot' },
    greathammer: { component: 'great-maul', material: 'ingot' },
    bow: { component: 'bow-limb', material: 'plank' },
    crossbow: { component: 'crossbow-frame', material: 'plank' },
    gun: { component: 'gun-barrel', material: 'ingot' },
    staff: { component: 'staff-core', material: 'plank' },
    tome: { component: 'tome-binding', material: 'cloth' },
    shield: { component: 'shield-frame', material: 'ingot' },
    focus: { component: 'focus-lens', material: 'gem' },
  },
  armor: {
    head: { component: 'helm-frame', material: 'ingot' },
    chest: { component: 'chest-plate', material: 'ingot' },
    legs: { component: 'leg-guards', material: 'ingot' },
    feet: { component: 'boot-sole', material: 'leather' },
    hands: { component: 'glove-lining', material: 'leather' },
    shoulders: { component: 'pauldron-base', material: 'ingot' },
  },
  accessory: {
    ring: { component: 'ring-setting', material: 'ingot' },
    necklace: { component: 'chain-link', material: 'ingot' },
    back: { component: 'cape-clasp', material: 'ingot' },
  },
} as const;

export const MATERIAL_TIERS: Record<AllTier, { ingot: string; plank: string; cloth: string; leather: string; gem: string }> = {
  0: { ingot: 'scrap-metal', plank: 'rotted-wood', cloth: 'torn-rag', leather: 'scraps', gem: 'pebble' },
  1: { ingot: 'copper-ingot', plank: 'pine-plank', cloth: 'linen-cloth', leather: 'rawhide', gem: 'rough-gem' },
  2: { ingot: 'iron-ingot', plank: 'oak-plank', cloth: 'cotton-cloth', leather: 'thick-hide', gem: 'flawed-gem' },
  3: { ingot: 'steel-ingot', plank: 'maple-plank', cloth: 'wool-cloth', leather: 'rugged-leather', gem: 'standard-gem' },
  4: { ingot: 'mithril-ingot', plank: 'ash-plank', cloth: 'silk-cloth', leather: 'hardened-leather', gem: 'fine-gem' },
  5: { ingot: 'adamantine-ingot', plank: 'ironwood-plank', cloth: 'enchanted-cloth', leather: 'wyrm-leather', gem: 'pristine-gem' },
  6: { ingot: 'orichalcum-ingot', plank: 'ebony-plank', cloth: 'arcane-cloth', leather: 'infernal-leather', gem: 'flawless-gem' },
  7: { ingot: 'starmetal-ingot', plank: 'wyrmwood-plank', cloth: 'celestial-cloth', leather: 'titan-leather', gem: 'radiant-gem' },
  8: { ingot: 'divine-ingot', plank: 'worldtree-plank', cloth: 'divine-cloth', leather: 'divine-leather', gem: 'divine-gem' },
};

export interface AssetDefinition {
  id: string;
  name: string;
  category: string;
  type: string;
  tier: AllTier;
  slot?: string;
  spritePath?: string;
  status: 'complete' | 'missing' | 'pending' | 'failed';
}

export function generateTier0Items(): AssetDefinition[] {
  const items: AssetDefinition[] = [];

  Object.entries(TIER0_WEAPON_PREFIXES).forEach(([weaponType, name]) => {
    items.push({
      id: `t0-${weaponType}`,
      name,
      category: 'weapon',
      type: weaponType,
      tier: 0,
      slot: 'mainHand',
      status: 'missing',
    });
  });

  Object.entries(TIER0_ARMOR_NAMES).forEach(([slot, name]) => {
    items.push({
      id: `t0-${slot}`,
      name,
      category: 'armor',
      type: slot,
      tier: 0,
      slot,
      status: 'missing',
    });
  });

  Object.entries(TIER0_ACCESSORY_NAMES).forEach(([type, name]) => {
    items.push({
      id: `t0-${type}`,
      name,
      category: 'accessory',
      type,
      tier: 0,
      slot: type === 'ring' ? 'ring1' : type,
      status: 'missing',
    });
  });

  return items;
}

export function generateComponentList(): AssetDefinition[] {
  const components: AssetDefinition[] = [];

  Object.entries(CRAFTING_COMPONENTS.weapon).forEach(([weaponType, config]) => {
    components.push({
      id: config.component,
      name: config.component.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'component',
      type: 'weapon-component',
      tier: 0,
      status: 'missing',
    });
  });

  Object.entries(CRAFTING_COMPONENTS.armor).forEach(([slot, config]) => {
    components.push({
      id: config.component,
      name: config.component.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'component',
      type: 'armor-component',
      tier: 0,
      status: 'missing',
    });
  });

  Object.entries(CRAFTING_COMPONENTS.accessory).forEach(([type, config]) => {
    components.push({
      id: config.component,
      name: config.component.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'component',
      type: 'accessory-component',
      tier: 0,
      status: 'missing',
    });
  });

  const uniqueComponents = components.filter((comp, index, self) => 
    index === self.findIndex(c => c.id === comp.id)
  );

  return uniqueComponents;
}

export function generateArmorSpriteList(): AssetDefinition[] {
  const items: AssetDefinition[] = [];
  const armorStyles = ['plate', 'leather', 'cloth'] as const;
  const armorSlots = EQUIPMENT_SLOTS.armor;

  ALL_TIERS.slice(1).forEach(tier => {
    armorSlots.forEach(slot => {
      armorStyles.forEach(style => {
        items.push({
          id: `${TIER_NAMES[tier as AllTier].toLowerCase()}-${style}-${slot}`,
          name: `${TIER_NAMES[tier as AllTier]} ${style.charAt(0).toUpperCase() + style.slice(1)} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`,
          category: 'armor',
          type: style,
          tier,
          slot,
          status: 'missing',
        });
      });
    });
  });

  return items;
}

export function generateAccessorySpriteList(): AssetDefinition[] {
  const items: AssetDefinition[] = [];

  ALL_TIERS.slice(1).forEach(tier => {
    ['ring', 'necklace', 'back'].forEach(type => {
      items.push({
        id: `${TIER_NAMES[tier as AllTier].toLowerCase()}-${type}`,
        name: `${TIER_NAMES[tier as AllTier]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        category: 'accessory',
        type,
        tier,
        slot: type === 'ring' ? 'ring1' : type,
        status: 'missing',
      });
    });
  });

  return items;
}

export function generateMissingSpriteReport(): {
  tier0Items: AssetDefinition[];
  components: AssetDefinition[];
  armor: AssetDefinition[];
  accessories: AssetDefinition[];
  totals: { tier0: number; components: number; armor: number; accessories: number; total: number };
} {
  const tier0Items = generateTier0Items();
  const components = generateComponentList();
  const armor = generateArmorSpriteList();
  const accessories = generateAccessorySpriteList();

  return {
    tier0Items,
    components,
    armor,
    accessories,
    totals: {
      tier0: tier0Items.length,
      components: components.length,
      armor: armor.length,
      accessories: accessories.length,
      total: tier0Items.length + components.length + armor.length + accessories.length,
    },
  };
}
