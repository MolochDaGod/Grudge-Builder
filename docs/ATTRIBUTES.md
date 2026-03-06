# Attribute System Reference

## Overview

Grudge Warlords features 8 core attributes that determine character capabilities. Each attribute provides both flat bonuses (fixed amounts) and percentage bonuses (scaling with base stats).

## Character Progression

| Parameter          | Value                    |
|--------------------|--------------------------|
| Level Range        | 0 - 20                   |
| Starting Points    | 20                       |
| Points Per Level   | 7                        |
| Maximum Points     | 160 (at level 20)        |

### Points By Level

| Level | Total Points | Example Tank Build           |
|-------|--------------|------------------------------|
| 0     | 20           | 10 STR, 5 VIT, 5 END         |
| 5     | 55           | 25 STR, 15 VIT, 15 END       |
| 10    | 90           | 35 STR, 30 VIT, 25 END       |
| 15    | 125          | 50 STR, 40 VIT, 35 END       |
| 20    | 160          | 60 STR, 50 VIT, 50 END       |

## Stat Calculation Formula

```
Total Stat = (Flat Bonus × Effective Points) + (Base Stat × Percent Bonus × Effective Points)
```

**Example:** Level 10, 35 Strength (30 effective after DR), 30 Vitality (27.5 effective)
```
Base Health: 100
Strength: (26 × 30) + (100 × 0.008 × 30) = 780 + 24 = 804
Vitality: (25 × 27.5) + (100 × 0.005 × 27.5) = 687.5 + 13.75 = 701.25
Total: 100 + 804 + 701.25 = 1,605 HP
```

## Diminishing Returns

After 25 points in a single attribute, efficiency decreases to encourage balanced builds.

| Points Range | Efficiency | Example                        |
|--------------|------------|--------------------------------|
| 1 - 25       | 100%       | 25 points → 25 effective       |
| 26 - 50      | 50%        | 50 points → 37.5 effective     |
| 51+          | 25%        | 80 points → 45 effective       |

### Efficiency Table

| Actual | Calculation                    | Effective | Efficiency |
|--------|--------------------------------|-----------|------------|
| 20     | 20                             | 20        | 100%       |
| 25     | 25                             | 25        | 100%       |
| 35     | 25 + (10 × 0.5)                | 30        | 85.7%      |
| 50     | 25 + (25 × 0.5)                | 37.5      | 75%        |
| 60     | 25 + 12.5 + (10 × 0.25)        | 40        | 66.7%      |
| 80     | 25 + 12.5 + (30 × 0.25)        | 45        | 56.25%     |
| 160    | 25 + 12.5 + (110 × 0.25)       | 65        | 40.6%      |

**Warning:** Putting all 160 points into one attribute yields only 65 effective points (40.6% efficiency). Balanced builds are significantly more effective.

---

## The 8 Attributes

### 💪 STRENGTH (STR)
**Role:** Tank / Melee DPS

| Stat            | Flat Bonus | Percent Bonus |
|-----------------|------------|---------------|
| Health          | +26        | +0.8%         |
| Damage          | +3         | +2%           |
| Defense         | +12        | +1.5%         |
| Block Chance    | +0.5%      | +5%           |
| Critical Chance | +0.32%     | +7%           |
| Block Factor    | +0.85%     | +26.3%        |
| Critical Factor | +1.1%      | +1.5%         |

### ❤️ VITALITY (VIT)
**Role:** Tank / Survivability

| Stat         | Flat Bonus | Percent Bonus |
|--------------|------------|---------------|
| Health       | +25        | +0.5%         |
| Mana         | +2         | +0.2%         |
| Stamina      | +5         | +0.1%         |
| Damage       | +2         | +0.1%         |
| Defense      | +12        | —             |
| Block Factor | +0.3%      | +17%          |
| Resistance   | +0.5%      | —             |

### 🛡️ ENDURANCE (END)
**Role:** Defensive Specialist

| Stat         | Flat Bonus | Percent Bonus |
|--------------|------------|---------------|
| Health       | +10        | +0.1%         |
| Stamina      | +1         | +0.3%         |
| Defense      | +12        | +12%          |
| Block Chance | +0.11%     | +73.5%        |
| Block Factor | +0.27%     | —             |
| Resistance   | +0.46%     | —             |

### 🧠 INTELLECT (INT)
**Role:** Mage / Caster

| Stat            | Flat Bonus | Percent Bonus |
|-----------------|------------|---------------|
| Mana            | +5         | +5%           |
| Damage          | +4         | +2.5%         |
| Defense         | +2         | —             |
| Critical Chance | +0.23%     | +0.1%         |
| Accuracy        | +0.12%     | +33.8%        |
| Resistance      | +0.38%     | +17%          |

### 🔮 WISDOM (WIS)
**Role:** Healer / Support / Mana Efficiency

| Stat            | Flat Bonus | Percent Bonus |
|-----------------|------------|---------------|
| Health          | +10        | —             |
| Mana            | +20        | +3%           |
| Damage          | +2         | +1.5%         |
| Defense         | +2         | —             |
| Critical Chance | +0.5%      | +0.15%        |
| Resistance      | +0.5%      | —             |

### 🎯 DEXTERITY (DEX)
**Role:** Rogue / Precision Fighter

| Stat            | Flat Bonus | Percent Bonus |
|-----------------|------------|---------------|
| Damage          | +3         | +1.8%         |
| Defense         | +10        | +1%           |
| Block Chance    | +0.41%     | +1%           |
| Critical Chance | +0.5%      | +1.2%         |
| Accuracy        | +0.7%      | +1.5%         |

### ⚡ AGILITY (AGI)
**Role:** Mobile DPS / Dodge Tank

| Stat            | Flat Bonus | Percent Bonus |
|-----------------|------------|---------------|
| Health          | +2         | +0.6%         |
| Stamina         | +5         | +0.5%         |
| Damage          | +3         | +1.6%         |
| Defense         | +5         | +0.8%         |
| Critical Chance | +0.42%     | +1%           |

### 🎲 TACTICS (TAC)
**Role:** Strategic Fighter / Commander

| Stat         | Flat Bonus | Percent Bonus |
|--------------|------------|---------------|
| Health       | +10        | +8.4%         |
| Mana         | +0         | +8.2%         |
| Stamina      | +1         | —             |
| Damage       | +3         | +0.2%         |
| Defense      | +5         | +0.5%         |
| Block Chance | +0.27%     | +0.8%         |

---

## 19 Secondary Stats

### Primary Resources
| Stat    | Description                        | Default | Cap     |
|---------|------------------------------------|---------|---------|
| Health  | Hit points, 0 = defeat             | 100     | 999,999 |
| Mana    | Magical energy for spells          | 50      | 999,999 |
| Stamina | Physical energy for special attacks| 100     | 999     |

### Combat Stats
| Stat    | Description              | Default | Cap    |
|---------|--------------------------|---------|--------|
| Damage  | Base physical/magic damage| 10     | 99,999 |
| Defense | Reduces incoming damage  | 0       | 9,999  |

### Chance Stats (Percentages)
| Stat            | Description                        | Default | Cap |
|-----------------|------------------------------------|---------|-----|
| Block Chance    | Chance to block attacks            | 0%      | 75% |
| Critical Chance | Chance for critical damage         | 5%      | 75% |
| Accuracy        | Debuff application success         | 50%     | 95% |
| Resistance      | Debuff resist chance               | 0%      | 95% |

### Factor Stats (Multipliers)
| Stat            | Description                     | Default | Cap  |
|-----------------|---------------------------------|---------|------|
| Block Factor    | Damage blocked on success       | 30%     | 90%  |
| Critical Factor | Crit damage multiplier          | 1.5×    | 3.0× |

### Advanced Combat
| Stat               | Description                          | Default | Cap |
|--------------------|--------------------------------------|---------|-----|
| Drain Health       | Lifesteal percentage                 | 0%      | 50% |
| Drain Mana         | Manasteal percentage                 | 0%      | 50% |
| Reflect            | Damage reflected to attacker         | 0%      | 50% |
| Absorb Health      | Damage converted to healing          | 0%      | 50% |
| Absorb Mana        | Damage converted to mana             | 0%      | 50% |
| Defense Break      | Target defense ignored               | 0%      | 75% |
| Block Break        | Reduces target block chance          | 0%      | 75% |
| Crit Evasion       | Reduces incoming crit chance         | 0%      | 50% |

---

## Implementation

Located in `shared/attributeSystem.ts`:

```typescript
import { 
  ATTRIBUTES,
  ATTRIBUTE_IDS,
  SECONDARY_STAT_IDS,
  STAT_CAPS,
  calculateStats,
  getEffectivePoints,
  getTotalAttributePoints,
  getClassStartingAttributes
} from '@shared/attributeSystem';

// Calculate all stats for a character
const stats = calculateStats(level, attributes, equipmentBonuses);

// Get effective points after diminishing returns
const effective = getEffectivePoints(actualPoints);

// Get total available points for a level
const total = getTotalAttributePoints(level);

// Get recommended starting attributes for a class
const starter = getClassStartingAttributes('warrior');
```

---

## Recommended Builds (Level 20)

### Pure Tank
**Distribution:** 60 STR / 50 VIT / 50 END
- Health: ~2,200
- Defense: ~1,500 (38.7% reduction)
- Block Chance: ~70%

### Physical DPS
**Distribution:** 50 STR / 55 DEX / 55 AGI
- Damage: ~155
- Critical Chance: 75% (capped)
- Critical Factor: ~2.1×

### Magic DPS
**Distribution:** 80 INT / 80 WIS
- Mana: ~1,345
- Damage: ~215 + spell bonuses
- Resistance: ~45%

### Balanced Hybrid
**Distribution:** 40 STR / 40 VIT / 40 DEX / 40 TAC
- Health: ~1,675
- Defense: ~715 (26.7% reduction)
- All-around competent

---

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/attributeSystem.ts` | Attribute formulas and stat calculations |
| `shared/schema.ts` | Character attributes field in characters table |
| `server/storage.ts` | Character attribute updates |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/components/AttributeAllocation.tsx` | Attribute point allocation UI |
| `client/src/components/CharacterStats.tsx` | Stat display panel |
| `client/src/pages/character-sheet.tsx` | Character sheet with attributes |

### Core Functions (`shared/attributeSystem.ts`)
| Function | Purpose |
|----------|---------|
| `calculateStats()` | Calculate all 19 secondary stats from attributes |
| `getEffectivePoints()` | Apply diminishing returns after 25 points |
| `getTotalAttributePoints()` | Get total points available at level |
| `getClassStartingAttributes()` | Default attribute distribution by class |
| `STAT_CAPS` | Maximum values for all stats |
