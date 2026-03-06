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

### Database Schema

```typescript
// Items table in shared/schema.ts
export const items = pgTable("items", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  tier: text("tier").notNull(),
  itemLevel: integer("item_level").notNull(),
  stats: jsonb("stats").$type<Record<string, number>>(),
  effects: jsonb("effects").$type<ItemEffect[]>(),
  requirements: jsonb("requirements").$type<ItemRequirements>(),
  description: text("description"),
  iconUrl: text("icon_url"),
  stackable: boolean("stackable").default(false),
  maxStack: integer("max_stack").default(1),
});
```

### Example Item

```json
{
  "id": "iron_sword_01",
  "name": "Iron Longsword",
  "type": "weapon",
  "subtype": "1h_sword",
  "tier": "common",
  "itemLevel": 10,
  "stats": {
    "damage": 15,
    "criticalChance": 0.02
  },
  "requirements": {
    "level": 5,
    "strength": 10
  }
}
```

## Google Sheets Integration

Game data (weapons, armor, items, recipes) is managed via Google Sheets for easy updates:

| Sheet        | Content                             |
|--------------|-------------------------------------|
| Weapons      | All weapon definitions              |
| Armor        | All armor definitions               |
| Consumables  | Potions, food, elixirs              |
| Materials    | Crafting materials                  |
| Recipes      | Crafting recipes                    |

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
| `client/src/data/crafting/equipment.ts` | Equipment definitions |
| `client/src/data/crafting/weapons.ts` | Weapon definitions |
| `client/src/data/crafting/materials.ts` | Crafting materials |
| `client/src/data/crafting/recipes.ts` | Crafting recipes |
| `client/src/lib/grudaDB.ts` | Client-side game database |

### Sprite Assets
| Directory | Contents |
|-----------|----------|
| `public/sprites/weapons/` | Weapon sprites |
| `public/sprites/gear/` | Armor/gear sprites |
| `public/sprites/2dassets/` | Item icons |
