# GRUDGE Warlords Data Exports

This folder contains CSV exports of all game data for easy reference and external tool integration.

## CSV Files

### weapons.csv
All 96+ weapons in the game with complete stats.

| Column | Description |
|--------|-------------|
| id | Unique weapon identifier |
| name | Display name |
| type | Weapon type (Sword, Axe, Bow, Staff, etc.) |
| category | 1h, 2h, or Ranged 2h |
| craftedBy | Profession that crafts this (Miner, Forester, Mystic, Engineer) |
| lore | Flavor text description |
| damageBase | Base damage at T1 |
| damagePerTier | Damage increase per tier |
| speedBase | Base attack speed at T1 |
| speedPerTier | Speed increase per tier |
| comboBase | Base combo points at T1 |
| comboPerTier | Combo increase per tier |
| critBase | Base crit chance % at T1 |
| critPerTier | Crit increase per tier |
| blockBase | Base block chance % at T1 |
| blockPerTier | Block increase per tier |
| defenseBase | Base defense at T1 |
| defensePerTier | Defense increase per tier |
| basicAbility | Default auto-attack ability |
| signatureAbility | Ultimate ability unique to this weapon |
| abilities | List of learnable abilities (semicolon-separated) |
| passives | List of passive bonuses (semicolon-separated) |

### equipment.csv
All 240+ armor pieces across 4 material types and 6 sets.

| Column | Description |
|--------|-------------|
| id | Unique equipment identifier |
| name | Display name |
| type | Slot type (Helm, Shoulder, Chest, Hands, Feet, Ring, Necklace, Relic) |
| material | Armor material (Cloth, Leather, Metal, Gem) |
| lore | Flavor text description |
| hpBase | Base HP at T1 |
| hpPerTier | HP increase per tier |
| manaBase | Base mana at T1 |
| manaPerTier | Mana increase per tier |
| critBase | Base crit chance % at T1 |
| critPerTier | Crit increase per tier |
| blockBase | Base block chance % at T1 |
| blockPerTier | Block increase per tier |
| defenseBase | Base defense at T1 |
| defensePerTier | Defense increase per tier |
| passive | Passive bonus effect |
| attribute | Primary attribute bonus |
| effect | Special effect |
| proc | Triggered effect with % chance |
| setBonus | Bonus when wearing multiple pieces of same set |

### materials.csv
All 200+ crafting materials organized by tier and category.

| Column | Description |
|--------|-------------|
| id | Unique material identifier |
| name | Display name |
| tier | Material tier (1-8) |
| category | Material type (ore, wood, cloth, essence, ingredient, component, gem, leather, infusion) |
| gatheredBy | Profession that gathers this (or empty if crafted) |
| description | Material description |
| icon | Emoji icon |
| dropSource | Where it drops (if applicable) |
| unlockNode | Skill node required to unlock (if applicable) |

### recipes.csv
All 400+ crafting recipes with acquisition methods.

| Column | Description |
|--------|-------------|
| id | Unique recipe identifier |
| name | Recipe name |
| category | Item category (weapon, armor, consumable, material) |
| subCategory | Specific type within category |
| acquisition | How to obtain (purchasable, skillTree, dropOnly) |
| profession | Profession that can craft |
| unlockNode | Skill node that unlocks this (if skillTree) |
| dropSource | Where it drops (if dropOnly) |
| purchaseCost | Gold cost to purchase recipe (if purchasable) |
| tierMin | Minimum craftable tier |
| tierMax | Maximum craftable tier |
| description | Recipe description |

### skill_trees.csv
All 400+ skill nodes across 5 professions.

| Column | Description |
|--------|-------------|
| profession | Profession name (Miner, Forester, Mystic, Chef, Engineer) |
| nodeId | Unique node ID within profession |
| name | Node display name |
| x | X position (0-100%) |
| y | Y position (0-100%) |
| requiredLevel | Character level required |
| parentId | Parent node ID (empty if root) |
| branch | Branch/constellation name |
| nodeType | Type (stat, recipe, effect, mastery) |
| description | Node description |
| bonuses | Crafting bonuses (format: type:value:target) |
| unlocks | Recipes/items unlocked (semicolon-separated) |

### activities.csv
All 85+ XP-earning activities by profession.

| Column | Description |
|--------|-------------|
| profession | Profession name |
| id | Activity identifier |
| name | Activity name |
| description | What the activity involves |
| activityType | Type (harvest, craft, mission, supply, event, combat, discovery) |
| baseXp | Base XP reward |
| tierMultiplier | Whether XP scales with tier (true/false) |
| repeatable | Whether activity is repeatable (true/false) |
| requirements | Any requirements to perform |

## Stat Calculation

To calculate stats at a specific tier:
```
stat_at_tier = base_stat + (per_tier_stat × (tier - 1))
```

Example for a weapon with damageBase=50 and damagePerTier=12 at T5:
```
damage_at_T5 = 50 + (12 × 4) = 98
```

## Tier System

| Tier | Material Level | Gold Cost Multiplier |
|------|---------------|---------------------|
| T1 | Copper/Pine/Linen | 1x (100g base) |
| T2 | Iron/Oak/Wool | 2x (200g base) |
| T3 | Steel/Maple/Cotton | 4x (400g base) |
| T4 | Mithril/Ash/Silk | 8x (800g base) |
| T5 | Adamantine/Ironwood | 16x (1,600g base) |
| T6 | Orichalcum/Ebony | 32x (3,200g base) |
| T7 | Starmetal/Wyrmwood | 64x (6,400g base) |
| T8 | Divine materials | 128x (12,800g base) |

## Recipe Acquisition Distribution

- **Purchasable (~50%)**: Available from vendors for gold
- **Skill Tree (~40%)**: Unlocked by spending skill points
- **Drop Only (~10%)**: Rare drops from bosses/dungeons

## Professions

| Profession | Primary Crafts | Gathering |
|------------|---------------|-----------|
| Miner | Melee weapons, Metal armor | Ore, Gems |
| Forester | Bows, Leather armor | Wood, Leather |
| Mystic | Staves, Tomes, Cloth armor | Cloth, Essence |
| Chef | Potions, Foods | Ingredients |
| Engineer | Crossbows, Guns | Components |

## Sharing & API Access

### database-sharing-guide.md
Complete guide for sharing your database and API with other Replit projects.

Covers two methods:
1. **Direct Database Access** - Share `DATABASE_URL` secret for both apps to use the same database
2. **API Access** - Call REST endpoints from external apps

### api-access-guide.ts
Ready-to-use TypeScript helper functions for calling all API endpoints.

Includes functions for:
- Fetching weapons, armor, recipes, items from Google Sheets
- Character CRUD operations
- Skill tree unlocks
- Shop transactions (buy/sell materials and recipes)

**Usage:** Copy to your other project, replace `YOUR_APP_URL` with your published URL.

---

## Profession-Specific CSV Files

### Recipe Files (what each profession can craft)
- `miner_recipes.csv` - Weapons (swords, axes, daggers, hammers, spears, maces), metal armor, shields, ingots
- `forester_recipes.csv` - Bows, nature staves, leather armor, bandages, arrows, traps
- `engineer_recipes.csv` - Crossbows, guns, explosives, turrets, mechanical utilities
- `mystic_recipes.csv` - Staves (fire, frost, holy, lightning, arcane), cloth armor, enchants, essences

### Crafting Material Files (what each profession gathers/uses)
- `miner_crafting.csv` - Ores (T1-T8), ingots, gems, coal, flux, infusion essences
- `forester_crafting.csv` - Logs (T1-T8), planks, leather (T1-T8), strings, infusion essences
- `engineer_crafting.csv` - Gears (T1-T8), gunpowder, circuits, lenses, springs, infusion essences
- `mystic_crafting.csv` - Cloth threads (T1-T8), cloth, magical essences (T1-T8), infusion essences

---
Generated: 2025-12-29
Version: 2.3.0
