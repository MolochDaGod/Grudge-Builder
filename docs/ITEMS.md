# Items & Equipment System Reference

## Overview

Grudge Warlords features a comprehensive item system with weapons, armor, consumables, crafting materials, and quest items. Items are stored in an account-level shared inventory accessible by all characters.

## Item Categories

### Equipment
| Category   | Slots                              |
|------------|-------------------------------------|
| Weapons    | Main Hand, Off-Hand, Two-Hand       |
| Armor      | Head, Chest, Legs, Feet, Hands      |
| Accessories| Ring (×2), Necklace, Trinket        |
| Cosmetic   | Back (Cape), Shoulder               |

### Consumables
| Type       | Effect                              |
|------------|-------------------------------------|
| Potions    | Instant or over-time healing/mana   |
| Food       | Stat buffs with duration            |
| Elixirs    | Combat buffs with duration          |
| Scrolls    | One-time spell effects              |

### Materials
| Type       | Source                              |
|------------|-------------------------------------|
| Ores       | Mining                              |
| Herbs      | Herbalism                           |
| Leather    | Skinning                            |
| Wood       | Woodcutting                         |
| Cloth      | Monster drops, Tailoring            |
| Gems       | Mining, Jewelcrafting               |

### Other
| Type       | Purpose                             |
|------------|-------------------------------------|
| Quest      | Required for quest completion       |
| Currency   | Gold, tokens, special currencies    |
| Recipes    | Teaches crafting recipes            |

## Equipment Slots

### Weapon Slots
| Slot       | Accepts                             |
|------------|-------------------------------------|
| Main Hand  | 1H Swords, Axes, Maces, Daggers, Wands |
| Off-Hand   | Shields, Orbs, Daggers, Books       |
| Two-Hand   | 2H Swords, Axes, Staves, Bows       |

### Armor Categories
| Category   | Classes                             |
|------------|-------------------------------------|
| Cloth      | Mage, Cleric                        |
| Leather    | Rogue                               |
| Mail       | Warrior (low level)                 |
| Plate      | Warrior (high level)                |

### Slot Bonuses
| Slot       | Primary Stats                       |
|------------|-------------------------------------|
| Head       | Defense, Intellect                  |
| Chest      | Health, Defense                     |
| Legs       | Health, Stamina                     |
| Feet       | Agility, Movement                   |
| Hands      | Damage, Critical                    |
| Ring       | Various secondary stats             |
| Necklace   | Mana, Resistance                    |
| Trinket    | Unique effects                      |

## Item Tiers

Items are organized into quality tiers affecting base stats:

| Tier       | Color  | Stat Multiplier | Drop Rate |
|------------|--------|-----------------|-----------|
| Common     | White  | 1.0×            | 60%       |
| Uncommon   | Green  | 1.15×           | 25%       |
| Rare       | Blue   | 1.35×           | 10%       |
| Epic       | Purple | 1.6×            | 4%        |
| Legendary  | Orange | 2.0×            | 1%        |

## Item Level

Items have an item level (ilvl) determining their base stats:

```
Base Stats = (Item Level × Tier Multiplier × Slot Weight)
```

| Level Range | Content Source         |
|-------------|------------------------|
| 1 - 20      | Starting zones         |
| 21 - 50     | Mid-game dungeons      |
| 51 - 80     | End-game dungeons      |
| 81 - 100    | Raids, World bosses    |

## Inventory System

### Account-Level Shared Inventory

Items are stored at the account level, accessible by all characters:

```typescript
// In shared/schema.ts - characters table
inventory: jsonb("inventory").$type<Array<{ 
  itemId: string; 
  quantity: number; 
  tier?: number 
}>>()
```

### Character-Bound Items

Some items are bound to specific characters:
- Soulbound on pickup
- Soulbound on equip
- Quest items

### Inventory Capacity

| Storage Type    | Default Capacity |
|-----------------|------------------|
| Character Bag   | 20 slots         |
| Bank            | 100 slots        |
| Equipped Items  | 14 slots         |

## Equipment Stats

### Primary Stats (from Attributes)
| Stat        | Effect                              |
|-------------|-------------------------------------|
| Strength    | Physical damage, health             |
| Intellect   | Magic damage, mana                  |
| Vitality    | Health, defense                     |
| Dexterity   | Critical, accuracy                  |

### Secondary Stats
| Stat            | Effect                          |
|-----------------|---------------------------------|
| Critical Chance | % chance for critical hits      |
| Critical Factor | Critical damage multiplier      |
| Block Chance    | % chance to block               |
| Block Factor    | Damage reduction when blocking  |
| Accuracy        | Debuff application success      |
| Resistance      | Debuff resistance               |

### Special Effects
| Effect      | Description                         |
|-------------|-------------------------------------|
| Lifesteal   | Heal % of damage dealt              |
| Manasteal   | Restore mana from damage dealt      |
| Reflect     | Return % of damage to attacker      |
| Penetration | Ignore % of target defense          |

## Item Database

### Data Source — ObjectStore (Single Source of Truth)

All item data comes from **ObjectStore** at runtime. No hardcoded data in the frontend.

- `master-items.json` — 818 items with GRUDGE UUIDs, tier expansion (T1-T8), recipe links, icon URLs
- `master-recipes.json` — 118 recipes with GRUDGE UUIDs, material references
- `master-materials.json` — 93 materials with GRUDGE UUIDs
- `weapons.json`, `armor.json`, `consumables.json` — raw category data

Regenerate: `npm run generate:master` in the ObjectStore repo.

### Example Item (from master-items.json)

```json
{
  "uuid": "ITEM-20260409062100-000001-21216734",
  "baseUuid": "ITEM-20260409062100-000001-21216734",
  "name": "Bloodfeud Blade",
  "baseName": "Bloodfeud Blade",
  "category": "swords",
  "type": "weapon",
  "subCategory": "1h",
  "tier": 1,
  "tierLabel": "Common",
  "tierColor": "#8b7355",
  "iconUrl": "https://molochdagod.github.io/ObjectStore/icons/pack/weapons/Sword_01.png",
  "stats": { "damage": 50, "speed": 100, "crit": 3, "block": 5, "defense": 20 },
  "craftedBy": "Miner",
  "recipeUuid": "RECP-20260409062100-000002-DA4E2014",
  "abilities": ["Blood Rush", "Iron Grudge", "Clan Charge"]
}
```

## API Endpoints

```
GET  /api/items                 - List all items
GET  /api/items/:id             - Get item details
GET  /api/inventory/:characterId - Get character inventory
POST /api/inventory/:characterId - Add item to inventory
PUT  /api/equipment/:characterId - Equip/unequip item
```

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | Item database schema (items table) |
| `server/storage.ts` | Item CRUD operations |
| `server/routes.ts` | Item API endpoints |
| `server/googleSheets.ts` | Google Sheets data sync |

### Frontend Data
| File | Purpose |
|------|---------|
| `client/src/lib/objectStoreApi.ts` | ObjectStore API client (fetchMasterItems, fetchMasterRecipes, etc.) |
| `client/src/lib/grudaDB.ts` | Item database — loads from ObjectStore at runtime, icon resolver |
| `client/src/lib/assetConfig.ts` | ObjectStore URL configuration (R2 CDN + GitHub Pages) |
| `client/src/data/weaponSpriteMap.ts` | Weapon/armor sprite path mappings |

### Asset Sources
| Source | Contents |
|--------|----------|
| `assets.grudge-studio.com` (R2 CDN) | All binary assets (sprites, icons, models) |
| `molochdagod.github.io/ObjectStore/api/v1/` | All JSON game data (items, recipes, etc.) |
