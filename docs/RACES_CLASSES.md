# Races & Classes Reference

## Overview

Grudge Warlords features 6 playable races and 4 character classes. Each race provides unique passive bonuses, while classes determine combat style and available abilities.

## The 6 Races

### Human
**Lore:** Adaptable survivors who thrive in any environment. Known for their resilience and determination.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| XP Gain         | +10% experience from all sources    |
| Skill Points    | +1 starting skill point             |
| Diplomacy       | Better prices from merchants        |

**Recommended Classes:** Any (versatile)

### Orc
**Lore:** Fierce warriors from the northern wastes. Valued for their raw strength and battle rage.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| Strength        | +2 starting STR                     |
| Damage          | +5% physical damage                 |
| Berserk         | Gain power when health drops low    |

**Recommended Classes:** Warrior

### Elf
**Lore:** Ancient beings with deep connection to magic and nature. Masters of precision and wisdom.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| Intellect       | +2 starting INT                     |
| Mana            | +10% maximum mana                   |
| Precision       | +5% critical chance                 |

**Recommended Classes:** Mage, Rogue

### Dwarf
**Lore:** Stout mountain folk, master smiths and defenders. Unmatched endurance in battle.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| Endurance       | +2 starting END                     |
| Defense         | +10% physical defense               |
| Crafting        | +10% crafting quality bonus         |

**Recommended Classes:** Warrior, Cleric

### Undead
**Lore:** Risen souls bound to serve the dark forces. Immune to many ailments of the living.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| Resistance      | +15% debuff resistance              |
| Drain           | +5% lifesteal on attacks            |
| Immortal Will   | Can fight at 0 HP briefly           |

**Recommended Classes:** Warrior, Mage

### Demon
**Lore:** Infernal beings of chaos and destruction. Masters of dark magic and overwhelming power.

| Bonus Type      | Effect                              |
|-----------------|-------------------------------------|
| Damage          | +8% all damage                      |
| Critical Factor | +10% critical damage multiplier     |
| Corruption      | Attacks can inflict debuffs         |

**Recommended Classes:** Mage, Rogue

---

## The 4 Classes

### ⚔️ Warrior
**Role:** Tank / Melee DPS

Front-line combatants specializing in physical damage and damage absorption. Warriors excel at protecting allies and controlling the battlefield.

| Primary Stats   | STR, VIT, END                       |
|-----------------|-------------------------------------|
| Armor Type      | Mail, Plate                         |
| Weapons         | Swords, Axes, Maces, Shields        |
| Resource        | Rage (builds in combat)             |

**Starting Attributes (20 points):**
- 10 Strength
- 5 Vitality
- 5 Endurance

**Key Abilities:**
| Ability         | Description                         |
|-----------------|-------------------------------------|
| Shield Bash     | Stun target briefly                 |
| Cleave          | Hit multiple enemies                |
| Battle Cry      | Buff allies' damage                 |
| Last Stand      | Damage reduction when low HP        |

### 🔮 Mage
**Role:** Magic DPS / Crowd Control

Wielders of arcane power who deal devastating magical damage from range. Masters of elemental destruction.

| Primary Stats   | INT, WIS                            |
|-----------------|-------------------------------------|
| Armor Type      | Cloth                               |
| Weapons         | Staves, Wands, Orbs                 |
| Resource        | Mana                                |

**Starting Attributes (20 points):**
- 10 Intellect
- 10 Wisdom

**Key Abilities:**
| Ability         | Description                         |
|-----------------|-------------------------------------|
| Fireball        | High damage single target           |
| Frost Nova      | AoE slow/freeze                     |
| Arcane Missiles | Sustained damage                    |
| Teleport        | Instant repositioning               |

### 🗡️ Rogue
**Role:** Melee DPS / Assassin

Agile fighters who rely on speed, precision, and critical strikes. Excel at eliminating high-value targets.

| Primary Stats   | DEX, AGI, STR                       |
|-----------------|-------------------------------------|
| Armor Type      | Leather                             |
| Weapons         | Daggers, Swords, Bows               |
| Resource        | Energy (regenerates quickly)        |

**Starting Attributes (20 points):**
- 6 Strength
- 7 Dexterity
- 7 Agility

**Key Abilities:**
| Ability         | Description                         |
|-----------------|-------------------------------------|
| Backstab        | High damage from behind             |
| Evade           | Dodge incoming attacks              |
| Poison Blade    | Apply damage over time              |
| Shadow Step     | Teleport behind target              |

### ✨ Cleric
**Role:** Healer / Support

Divine spellcasters who heal allies and smite enemies. Essential for group survival in difficult content.

| Primary Stats   | WIS, VIT, INT                       |
|-----------------|-------------------------------------|
| Armor Type      | Cloth, Mail                         |
| Weapons         | Maces, Staves, Shields              |
| Resource        | Mana, Holy Power                    |

**Starting Attributes (20 points):**
- 5 Vitality
- 5 Intellect
- 10 Wisdom

**Key Abilities:**
| Ability         | Description                         |
|-----------------|-------------------------------------|
| Heal            | Restore ally health                 |
| Smite           | Holy damage to enemies              |
| Blessing        | Buff ally stats                     |
| Resurrection    | Revive fallen allies                |

---

## Class Synergy

### Recommended Party Compositions

| Role      | Class Options      | Priority       |
|-----------|--------------------|----------------|
| Tank      | Warrior            | Required       |
| Healer    | Cleric             | Required       |
| DPS       | Mage, Rogue        | 1-2 recommended|

### 3-Character Party Examples

| Composition           | Playstyle                      |
|-----------------------|--------------------------------|
| Warrior + Cleric + Mage | Balanced, handles all content |
| Warrior + Cleric + Rogue | High single-target damage    |
| Warrior + Mage + Rogue | Fast clears, risky (no healer)|

---

## Database Schema

### Races Table

```typescript
export const races = pgTable("races", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  bonuses: jsonb("bonuses").$type<RaceBonus[]>(),
  lore: text("lore"),
  iconUrl: text("icon_url"),
});
```

### Classes Table

```typescript
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  primaryStats: text("primary_stats").array(),
  armorTypes: text("armor_types").array(),
  weaponTypes: text("weapon_types").array(),
  resource: text("resource"),
  startingAbilities: text("starting_abilities").array(),
});
```

### Character Reference

Characters store race and class as IDs:

```typescript
// In characters table
raceId: text("race_id").notNull(),
classId: text("class_id").notNull(),
```

---

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | races, classes, characters tables |
| `server/storage.ts` | Race/class lookup operations |
| `server/routes.ts` | GET /api/races, GET /api/classes |
| `server/gameDataSeeder.ts` | Race/class data seeding |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/character-creation.tsx` | Character creation UI |
| `client/src/pages/character-sheet.tsx` | Character details view |
| `client/src/components/HeroSpriteAnimator.tsx` | Race/class sprite display |

### Data Definitions
| File | Purpose |
|------|---------|
| `shared/definitions/classSkillTrees.ts` | Class skill tree progression |
| `client/src/lib/grudaDB.ts` | Race/class definitions |
