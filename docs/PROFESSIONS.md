# Professions & Crafting System Reference

## Overview

The Artisan Guild profession system provides 100 levels of progression in both Gathering and Crafting professions. Professions are account-wide and shared across all characters.

**Note:** Character heroes have a level cap of 20, but professions progress to level 100.

## Profession Categories

### Gathering Professions
Resource collection from the world. Each gathering profession extracts specific material types.

| Profession   | Resources Gathered          | Primary Use           |
|--------------|-----------------------------|-----------------------|
| Mining       | Ores, gems, minerals        | Metalworking, Jewelry |
| Herbalism    | Plants, herbs, flowers      | Alchemy, Cooking      |
| Woodcutting  | Logs, bark, sap             | Carpentry, Fletching  |
| Fishing      | Fish, shells, pearls        | Cooking, Alchemy      |
| Skinning     | Hides, leather, bones       | Leatherworking        |
| Foraging     | Berries, mushrooms, roots   | Cooking, Alchemy      |

### Crafting Professions
Transform raw materials into usable items, equipment, and consumables.

| Profession     | Primary Output              | Input Materials       |
|----------------|-----------------------------|-----------------------|
| Blacksmithing  | Weapons, armor, tools       | Ores, metals          |
| Leatherworking | Light/medium armor, bags    | Hides, leather        |
| Tailoring      | Cloth armor, bags, capes    | Fibers, cloth         |
| Alchemy        | Potions, elixirs, oils      | Herbs, minerals       |
| Cooking        | Food buffs, consumables     | Fish, herbs, produce  |
| Enchanting     | Item enchantments           | Magical essences      |
| Jewelcrafting  | Rings, necklaces, gems      | Gems, metals          |
| Carpentry      | Furniture, tools, bows      | Wood, metals          |

## Progression System

### Level Range: 1 - 100

Professions use an XP-based progression system with increasing requirements at higher levels.

| Level Range | XP Requirement | Tier Name    |
|-------------|----------------|--------------|
| 1 - 10      | Low            | Novice       |
| 11 - 25     | Medium         | Apprentice   |
| 26 - 50     | High           | Journeyman   |
| 51 - 75     | Very High      | Expert       |
| 76 - 100    | Maximum        | Master       |

### XP Sources

| Activity                        | XP Gained    |
|---------------------------------|--------------|
| Successful gather (in tier)     | Base XP      |
| Successful craft (in tier)      | Base XP      |
| Challenging gather (+1 tier)    | 1.5× XP      |
| First-time recipe discovery     | Bonus XP     |
| Rare material discovery         | Bonus XP     |

### Skill Decay (Optional)

If enabled, professions may decay if not practiced regularly:
- No decay within active tier
- Slow decay if inactive for extended periods
- Cannot decay below tier thresholds (10, 25, 50, 75)

## Tiered Resource System

Resources and recipes are organized into tiers matching profession level ranges.

### Resource Tiers

| Tier | Level Req | Example Mining   | Example Herbs     |
|------|-----------|------------------|-------------------|
| 1    | 1+        | Copper Ore       | Silverleaf        |
| 2    | 11+       | Iron Ore         | Mageroyal         |
| 3    | 26+       | Mithril Ore      | Fadeleaf          |
| 4    | 51+       | Thorium Ore      | Dreamfoil         |
| 5    | 76+       | Adamantite Ore   | Black Lotus       |

### Recipe Difficulty

| Difficulty     | Color  | Description                |
|----------------|--------|----------------------------|
| Trivial        | Gray   | No XP, always succeeds     |
| Easy           | Green  | Low XP, high success       |
| Moderate       | Yellow | Normal XP, normal success  |
| Challenging    | Orange | High XP, may fail          |
| Difficult      | Red    | Max XP, likely to fail     |

## Crafting Mechanics

### Basic Crafting Flow

1. **Learn Recipe** - Discover or purchase recipe
2. **Gather Materials** - Collect required resources
3. **Craft Item** - Combine materials at crafting station
4. **Quality Roll** - Determine output quality tier

### Quality Tiers

Crafted items can have different quality levels based on skill and materials:

| Quality    | Stat Bonus | Chance (at skill) |
|------------|------------|-------------------|
| Poor       | -10%       | Below skill level |
| Normal     | Base       | At skill level    |
| Good       | +10%       | Above skill level |
| Superior   | +25%       | Master crafter    |
| Masterwork | +50%       | Critical success  |

### Crafting Stations

Certain crafting requires specific stations:
- **Forge** - Blacksmithing, some Jewelcrafting
- **Workbench** - Carpentry, Leatherworking
- **Cauldron** - Alchemy
- **Cooking Fire** - Cooking
- **Enchanting Table** - Enchanting
- **Loom** - Tailoring

## Data Storage

### Database Schema

Profession levels are stored per-account in the character record:

```typescript
// In shared/schema.ts - characters table
professionLevels: jsonb("profession_levels").$type<Record<string, { 
  level: number; 
  xp: number 
}>>()
```

### Example Structure

```json
{
  "mining": { "level": 45, "xp": 12500 },
  "blacksmithing": { "level": 38, "xp": 8200 },
  "herbalism": { "level": 22, "xp": 3100 }
}
```

## Integration with Items

Crafted items link to the item database with:
- Required profession and level to craft
- Material requirements
- Output item ID
- Quality modifier

See `docs/ITEMS.md` for equipment details.

## Resource Nodes

Resource nodes spawn on home islands and in dungeons:

| Node Type    | Profession   | Respawn Time |
|--------------|--------------|--------------|
| Ore Vein     | Mining       | 5 minutes    |
| Herb Cluster | Herbalism    | 3 minutes    |
| Tree         | Woodcutting  | 10 minutes   |
| Fishing Spot | Fishing      | 2 minutes    |

See `docs/ISLANDS.md` for resource node placement.

## API Endpoints

```
GET  /api/professions/:characterId     - Get profession levels
POST /api/professions/:characterId/xp  - Add profession XP
POST /api/craft                        - Craft an item
```

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | characterProfessions, unlockedSkills, experienceEvents tables |
| `server/storage.ts` | Profession CRUD operations |
| `server/routes.ts` | Profession XP and crafting endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/professions.tsx` | Artisan Guild main page |
| `client/src/pages/profession/*.tsx` | Individual profession pages |
| `client/src/components/profession/TreeVisualizer.tsx` | Skill tree visualization |
| `client/src/components/profession/CraftingInterface.tsx` | Crafting UI |
| `client/src/components/profession/UpgradeInterface.tsx` | Item upgrade UI |
| `client/src/components/profession/SkillTree.tsx` | Skill tree component |
| `client/src/components/profession/ActivitiesPanel.tsx` | Activity selection |

### Data Definitions
| File | Purpose |
|------|---------|
| `client/src/data/crafting/miner.ts` | Miner profession data |
| `client/src/data/crafting/forester.ts` | Forester profession data |
| `client/src/data/crafting/mystic.ts` | Mystic profession data |
| `client/src/data/crafting/engineer.ts` | Engineer profession data |
| `client/src/data/crafting/chef.ts` | Chef profession data |
| `client/src/data/crafting/professionActivities.ts` | Gathering activities |
| `client/src/data/crafting/professionTitles.ts` | Level title progression |
