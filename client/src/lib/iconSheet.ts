import { assetUrl } from "@/lib/assetConfig";
export interface SpriteIcon {
  name: string;
  row: number;
  col: number;
  category: string;
}

export const ICON_SHEET_PATH = assetUrl("/images/ui/icons-sheet.png");
export const ICON_SIZE = 16;
export const ICONS_PER_ROW = 5;

export const SPRITE_ICONS: SpriteIcon[] = [
  { name: 'arrow_up', row: 0, col: 0, category: 'ui' },
  { name: 'arrow_down', row: 0, col: 1, category: 'ui' },
  { name: 'arrow_left', row: 0, col: 2, category: 'ui' },
  { name: 'arrow_right', row: 0, col: 3, category: 'ui' },
  { name: 'star', row: 0, col: 4, category: 'ui' },
  
  { name: 'pause', row: 1, col: 0, category: 'ui' },
  { name: 'play', row: 1, col: 1, category: 'ui' },
  { name: 'close', row: 1, col: 2, category: 'ui' },
  { name: 'menu', row: 1, col: 3, category: 'ui' },
  { name: 'settings', row: 1, col: 4, category: 'ui' },
  
  { name: 'gold_coin', row: 2, col: 0, category: 'currency' },
  { name: 'silver_coin', row: 2, col: 1, category: 'currency' },
  { name: 'bronze_coin', row: 2, col: 2, category: 'currency' },
  { name: 'gem_currency', row: 2, col: 3, category: 'currency' },
  { name: 'diamond', row: 2, col: 4, category: 'currency' },
  
  { name: 'music', row: 3, col: 0, category: 'ui' },
  { name: 'sound', row: 3, col: 1, category: 'ui' },
  { name: 'info', row: 3, col: 2, category: 'ui' },
  { name: 'question', row: 3, col: 3, category: 'ui' },
  { name: 'lock', row: 3, col: 4, category: 'ui' },
  
  { name: 'heart', row: 4, col: 0, category: 'status' },
  { name: 'heart_empty', row: 4, col: 1, category: 'status' },
  { name: 'health_potion', row: 4, col: 2, category: 'consumable' },
  { name: 'mana_potion', row: 4, col: 3, category: 'consumable' },
  { name: 'stamina_potion', row: 4, col: 4, category: 'consumable' },
  
  { name: 'shield_wood', row: 5, col: 0, category: 'armor' },
  { name: 'shield_iron', row: 5, col: 1, category: 'armor' },
  { name: 'shield_gold', row: 5, col: 2, category: 'armor' },
  { name: 'armor_leather', row: 5, col: 3, category: 'armor' },
  { name: 'armor_plate', row: 5, col: 4, category: 'armor' },
  
  { name: 'sword_iron', row: 6, col: 0, category: 'weapon' },
  { name: 'sword_steel', row: 6, col: 1, category: 'weapon' },
  { name: 'sword_gold', row: 6, col: 2, category: 'weapon' },
  { name: 'dagger', row: 6, col: 3, category: 'weapon' },
  { name: 'axe', row: 6, col: 4, category: 'weapon' },
  
  { name: 'gem_red', row: 7, col: 0, category: 'resource' },
  { name: 'gem_blue', row: 7, col: 1, category: 'resource' },
  { name: 'gem_green', row: 7, col: 2, category: 'resource' },
  { name: 'gem_purple', row: 7, col: 3, category: 'resource' },
  { name: 'crystal', row: 7, col: 4, category: 'resource' },
  
  { name: 'ring_silver', row: 8, col: 0, category: 'accessory' },
  { name: 'ring_gold', row: 8, col: 1, category: 'accessory' },
  { name: 'amulet', row: 8, col: 2, category: 'accessory' },
  { name: 'necklace', row: 8, col: 3, category: 'accessory' },
  { name: 'belt', row: 8, col: 4, category: 'accessory' },
  
  { name: 'ore_iron', row: 9, col: 0, category: 'resource' },
  { name: 'ore_copper', row: 9, col: 1, category: 'resource' },
  { name: 'ore_gold', row: 9, col: 2, category: 'resource' },
  { name: 'wood_log', row: 9, col: 3, category: 'resource' },
  { name: 'leather', row: 9, col: 4, category: 'resource' },
  
  { name: 'herb_green', row: 10, col: 0, category: 'resource' },
  { name: 'herb_red', row: 10, col: 1, category: 'resource' },
  { name: 'bone', row: 10, col: 2, category: 'resource' },
  { name: 'feather', row: 10, col: 3, category: 'resource' },
  { name: 'cloth', row: 10, col: 4, category: 'resource' },
];

export function getIconByName(name: string): SpriteIcon | undefined {
  return SPRITE_ICONS.find(icon => icon.name === name);
}

export function getIconsByCategory(category: string): SpriteIcon[] {
  return SPRITE_ICONS.filter(icon => icon.category === category);
}

export function getSpriteStyle(icon: SpriteIcon, scale: number = 2): Record<string, string | number> {
  return {
    width: ICON_SIZE * scale,
    height: ICON_SIZE * scale,
    backgroundImage: `url(${ICON_SHEET_PATH})`,
    backgroundPosition: `-${icon.col * ICON_SIZE * scale}px -${icon.row * ICON_SIZE * scale}px`,
    backgroundSize: `${ICONS_PER_ROW * ICON_SIZE * scale}px auto`,
    imageRendering: 'pixelated' as const,
  };
}

export function mapItemToIcon(itemName: string, itemType: string): SpriteIcon | undefined {
  const name = itemName.toLowerCase();
  
  if (name.includes('sword')) return getIconByName('sword_iron');
  if (name.includes('dagger')) return getIconByName('dagger');
  if (name.includes('axe')) return getIconByName('axe');
  if (name.includes('shield')) return getIconByName('shield_iron');
  
  if (name.includes('health') || name.includes('hp')) return getIconByName('health_potion');
  if (name.includes('mana') || name.includes('mp')) return getIconByName('mana_potion');
  if (name.includes('stamina')) return getIconByName('stamina_potion');
  
  if (name.includes('ring')) return getIconByName('ring_gold');
  if (name.includes('amulet') || name.includes('necklace')) return getIconByName('amulet');
  if (name.includes('belt')) return getIconByName('belt');
  
  if (name.includes('ore') || name.includes('iron')) return getIconByName('ore_iron');
  if (name.includes('copper')) return getIconByName('ore_copper');
  if (name.includes('gold') && itemType === 'Resource') return getIconByName('ore_gold');
  if (name.includes('wood') || name.includes('log')) return getIconByName('wood_log');
  if (name.includes('leather') || name.includes('hide')) return getIconByName('leather');
  if (name.includes('herb')) return getIconByName('herb_green');
  if (name.includes('bone')) return getIconByName('bone');
  if (name.includes('cloth') || name.includes('fabric')) return getIconByName('cloth');
  if (name.includes('feather')) return getIconByName('feather');
  
  if (name.includes('gem') || name.includes('ruby')) return getIconByName('gem_red');
  if (name.includes('sapphire')) return getIconByName('gem_blue');
  if (name.includes('emerald')) return getIconByName('gem_green');
  if (name.includes('amethyst')) return getIconByName('gem_purple');
  if (name.includes('crystal') || name.includes('diamond')) return getIconByName('crystal');
  
  if (itemType === 'currency' || name.includes('coin')) return getIconByName('gold_coin');
  
  return undefined;
}
