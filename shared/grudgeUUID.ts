/**
 * Grudge Warlords Custom UUID System
 * Format: SLOT-TIER-ITEMID-TIMESTAMP-COUNTER
 * 
 * SLOT (4 chars): Equipment slot code
 * TIER (2 chars): t0-t8 or oo (no tier)
 * ITEMID (4 digits): 0001-9999
 * TIMESTAMP (12 digits): HHMMMMDDYYYY (hour, minute, month, day, year) in Texas time (CST/CDT)
 * COUNTER (6 alphanumeric): 000001-zzzzzz
 * 
 * Example: head-t1-0001-011901012025-000001
 */

// Equipment slot to 4-letter code mapping
export const SLOT_CODES: Record<string, string> = {
  // Armor slots
  'Helm': 'helm',
  'Head': 'head',
  'Shoulder': 'shou',
  'Chest': 'ches',
  'Hands': 'hand',
  'Gloves': 'glov',
  'Legs': 'legs',
  'Feet': 'feet',
  'Ring': 'ring',
  'Necklace': 'neck',
  'Relic': 'reli',
  'Offhand': 'offh',
  'Shield': 'shld',
  
  // Weapon slots
  'MainHand': 'main',
  'TwoHand': 'twoh',
  'Weapon': 'weap',
  'Sword': 'swrd',
  'Axe': 'axee',
  'Mace': 'mace',
  'Dagger': 'dagr',
  'Staff': 'staf',
  'Wand': 'wand',
  'Bow': 'boww',
  'Crossbow': 'xbow',
  'Polearm': 'pole',
  'Hammer': 'hamr',
  'Spear': 'sper',
  
  // Resource types
  'Ore': 'orex',
  'Mine': 'mine',
  'Wood': 'wood',
  'Log': 'logs',
  'Herb': 'herb',
  'Fiber': 'fibr',
  'Hide': 'hide',
  'Leather': 'lthr',
  'Cloth': 'clth',
  'Metal': 'metl',
  'Gem': 'gemx',
  'Stone': 'ston',
  'Crystal': 'crys',
  'Essence': 'essn',
  
  // Consumables
  'Potion': 'potn',
  'Food': 'food',
  'Scroll': 'scrl',
  'Elixir': 'elix',
  
  // Crafting materials
  'Material': 'matl',
  'Component': 'comp',
  'Ingredient': 'ingr',
  
  // Misc item types
  'Item': 'item',
  'Quest': 'qust',
  'Key': 'keyy',
  'Token': 'tokn',
  'Currency': 'curr',
  'Loot': 'loot',
  'Treasure': 'trea',
  'Artifact': 'artf',
  
  // Fallback
  'Unknown': 'unkn',
  'Other': 'othr',
};

// Reverse mapping for lookup
export const CODE_TO_SLOT: Record<string, string> = Object.fromEntries(
  Object.entries(SLOT_CODES).map(([k, v]) => [v, k])
);

// Tier codes
export const TIER_CODES = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 'oo'] as const;
export type TierCode = typeof TIER_CODES[number];

// Counter state (in-memory, would be persisted in production)
// Starts at 1 so first UUID has counter 000001
let counterState = 1;

// Alphanumeric characters for counter (0-9, a-z = 36 chars)
const ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Convert a number to base-36 alphanumeric string with padding
 */
function toAlphanumeric(num: number, length: number = 6): string {
  let result = '';
  let n = num;
  
  do {
    result = ALPHANUMERIC[n % 36] + result;
    n = Math.floor(n / 36);
  } while (n > 0);
  
  return result.padStart(length, '0');
}

/**
 * Convert alphanumeric string back to number
 */
function fromAlphanumeric(str: string): number {
  let result = 0;
  for (const char of str.toLowerCase()) {
    result = result * 36 + ALPHANUMERIC.indexOf(char);
  }
  return result;
}

/**
 * Get current timestamp in Texas time (CST/CDT)
 * Format: HHMMMMDDYYYY (hour, minute, month, day, year)
 */
function getTexasTimestamp(): string {
  const now = new Date();
  
  // Convert to Texas time (Central Time)
  const texasTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  
  const hour = texasTime.getHours().toString().padStart(2, '0');
  const minute = texasTime.getMinutes().toString().padStart(2, '0');
  const month = (texasTime.getMonth() + 1).toString().padStart(2, '0');
  const day = texasTime.getDate().toString().padStart(2, '0');
  const year = texasTime.getFullYear().toString();
  
  return `${hour}${minute}${month}${day}${year}`;
}

/**
 * Get the next counter value and increment
 */
function getNextCounter(): string {
  const counter = toAlphanumeric(counterState, 6);
  counterState++;
  
  // Check if we exceeded 6 chars (36^6 = 2,176,782,336 values)
  if (counterState >= Math.pow(36, 6)) {
    console.warn('[GrudgeUUID] Counter overflow - extending to 7 digits');
    // In production, extend to 7 digits or reset with new timestamp
  }
  
  return counter;
}

/**
 * Set the counter state (for initialization from database)
 */
export function setCounterState(value: number): void {
  counterState = value;
}

/**
 * Get current counter state
 */
export function getCounterState(): number {
  return counterState;
}

/**
 * Parse a tier number to tier code
 */
export function tierToCode(tier: number | null | undefined): TierCode {
  if (tier === null || tier === undefined) return 'oo';
  if (tier >= 0 && tier <= 8) return `t${tier}` as TierCode;
  return 'oo';
}

/**
 * Parse tier code back to number
 */
export function codeToTier(code: TierCode): number | null {
  if (code === 'oo') return null;
  return parseInt(code.slice(1), 10);
}

/**
 * Get slot code from slot name or type
 */
export function getSlotCode(slot: string | null | undefined): string {
  if (!slot) return 'item';
  
  // Try direct match
  if (SLOT_CODES[slot]) return SLOT_CODES[slot];
  
  // Try case-insensitive match
  const normalizedSlot = slot.charAt(0).toUpperCase() + slot.slice(1).toLowerCase();
  if (SLOT_CODES[normalizedSlot]) return SLOT_CODES[normalizedSlot];
  
  // Try partial match
  for (const [key, code] of Object.entries(SLOT_CODES)) {
    if (key.toLowerCase().includes(slot.toLowerCase()) || 
        slot.toLowerCase().includes(key.toLowerCase())) {
      return code;
    }
  }
  
  // Return first 4 chars of slot or 'unkn'
  return slot.toLowerCase().slice(0, 4).padEnd(4, 'x') || 'unkn';
}

export interface GrudgeUUIDComponents {
  slot: string;       // 4-char slot code
  tier: TierCode;     // 2-char tier code
  itemId: string;     // 4-digit item ID (0001-9999)
  timestamp: string;  // 12-digit timestamp
  counter: string;    // 6-char alphanumeric counter
}

/**
 * Generate a Grudge UUID
 */
export function generateGrudgeUUID(
  slotOrType: string,
  tier: number | null,
  itemId: number
): string {
  const slotCode = getSlotCode(slotOrType);
  const tierCode = tierToCode(tier);
  const itemIdStr = itemId.toString().padStart(4, '0');
  const timestamp = getTexasTimestamp();
  const counter = getNextCounter();
  
  return `${slotCode}-${tierCode}-${itemIdStr}-${timestamp}-${counter}`;
}

/**
 * Parse a Grudge UUID back to components
 */
export function parseGrudgeUUID(uuid: string): GrudgeUUIDComponents | null {
  const parts = uuid.split('-');
  
  if (parts.length !== 5) return null;
  
  const [slot, tier, itemId, timestamp, counter] = parts;
  
  if (slot.length !== 4 || tier.length !== 2 || itemId.length !== 4 || 
      timestamp.length !== 12 || counter.length < 6) {
    return null;
  }
  
  return {
    slot,
    tier: tier as TierCode,
    itemId,
    timestamp,
    counter,
  };
}

/**
 * Validate a Grudge UUID format
 */
export function isValidGrudgeUUID(uuid: string): boolean {
  return parseGrudgeUUID(uuid) !== null;
}

/**
 * Get human-readable info from a Grudge UUID
 */
export function describeGrudgeUUID(uuid: string): string | null {
  const components = parseGrudgeUUID(uuid);
  if (!components) return null;
  
  const slotName = CODE_TO_SLOT[components.slot] || components.slot;
  const tierNum = codeToTier(components.tier);
  const tierStr = tierNum !== null ? `Tier ${tierNum}` : 'No Tier';
  
  // Parse timestamp
  const ts = components.timestamp;
  const hour = ts.slice(0, 2);
  const minute = ts.slice(2, 4);
  const month = ts.slice(4, 6);
  const day = ts.slice(6, 8);
  const year = ts.slice(8, 12);
  const dateStr = `${month}/${day}/${year} ${hour}:${minute} CST`;
  
  return `${slotName} ${tierStr} (Item #${components.itemId}) - Created ${dateStr} [${components.counter}]`;
}

/**
 * Batch generate UUIDs for a list of items
 */
export function batchGenerateUUIDs(items: Array<{
  slot: string;
  tier: number | null;
  itemId: number;
}>): string[] {
  return items.map(item => generateGrudgeUUID(item.slot, item.tier, item.itemId));
}

// Export max counter value for documentation
export const MAX_COUNTER_6_DIGIT = Math.pow(36, 6); // 2,176,782,336
export const MAX_COUNTER_7_DIGIT = Math.pow(36, 7); // 78,364,164,096
