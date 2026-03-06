# Weapon Skill Lists Guide - GRUDA System

## Overview

Every weapon in GRUDA can have a **ScriptableWeaponSkillList** that defines which skills appear on the player's skillbar (slots 0-4) when that weapon is equipped.

---

## How Weapon Skills Work

### System Flow

```
1. Player equips weapon
   ↓
2. WeaponSkills.cs detects equipment change
   ↓
3. Reads weapon's scriptableWeaponSkillList
   ↓
4. Clears skillbar slots 0-4
   ↓
5. Populates slots with skills from the list
   ↓
6. Player can now use those skills
```

### Key Components

**WeaponItem.cs:**
```csharp
public class WeaponItem : EquipmentItem
{
    public ScriptableWeaponSkillList scriptableWeaponSkillList;
}
```

**ScriptableWeaponSkillList.cs:**
```csharp
[CreateAssetMenu(menuName = "uMMORPG Skill/WeaponSkillList")]
public class ScriptableWeaponSkillList : ScriptableObject
{
    public ScriptableSkill[] weaponSkills; // Array of 1-5 skills
}
```

**WeaponSkills.cs:**
- Automatically populates skillbar slots 0-4
- Runs on equipment change
- Preserves trait skill slots 5-9

---

## Creating Weapon Skill Lists

### Step 1: Create the ScriptableWeaponSkillList Asset

1. In Unity, right-click in Project window
2. Select **Create > uMMORPG Skill > WeaponSkillList**
3. Name it descriptively: `[Weapon]_[Tier]_Skills`

**Examples:**
- `Sword_T1-T3_Skills.asset`
- `Sword_T4-T6_Skills.asset`
- `Sword_T7-T8_Skills.asset`
- `FireStaff_T1-T3_Skills.asset`
- `Bow_T4-T6_Skills.asset`

### Step 2: Assign Skills to the List

1. Select the ScriptableWeaponSkillList asset
2. In Inspector, set **Weapon Skills** array size (1-5)
3. Drag skill assets into the array slots

**Skill Slot Guidelines:**
- **Slot 0**: Auto-attack / Basic attack (always)
- **Slot 1**: Primary damage skill
- **Slot 2**: Secondary skill (utility/defense/DPS/Stack)
- **Slot 3**: Advanced skill (T4+ weapons)
- **Slot 4**: Ultimate skill (T7+ weapons)

### Step 3: Assign Skill List to Weapon

1. Select the WeaponItem asset (e.g., `T1 Sword.asset`)
2. In Inspector, find **Scriptable Weapon Skill List** field
3. Drag the ScriptableWeaponSkillList asset into this field
4. Save the asset

---

## Weapon Skill Progression

### Tier-Based Skill Progression

Different tiers should have different skill lists to provide progression:

**T1-T3 (Beginner):**
- 2-3 skills
- Basic attacks and simple abilities
- Low mana costs
- Short cooldowns

**T4-T6 (Intermediate):**
- 3-4 skills
- More powerful abilities
- Moderate mana costs
- Medium cooldowns
- Introduces combo potential

**T7-T8 (Advanced):**
- 4-5 skills
- Ultimate abilities
- High mana costs
- Long cooldowns
- Complex combos and synergies

---

## Weapon Type Skill Templates

### Sword Skills

**T1-T3 Sword Skills:**
1. **Slash** (Auto-attack)
   - Fast, reliable damage
   - No mana cost
   - No cooldown
2. **Power Strike** (Damage)
   - 150% weapon damage
   - 10 mana
   - 5s cooldown
3. **Defensive Stance** (Buff)
   - +20% defense for 10s
   - 15 mana
   - 15s cooldown

**T4-T6 Sword Skills:**
1. **Enhanced Slash** (Auto-attack)
2. **Crushing Blow** (Damage)
   - 200% weapon damage
   - 15 mana
   - 6s cooldown
3. **Shield Wall** (Buff)
   - +30% defense for 15s
   - 20 mana
   - 20s cooldown
4. **Whirlwind** (AoE)
   - 120% weapon damage to all nearby enemies
   - 25 mana
   - 12s cooldown

**T7-T8 Sword Skills:**
1. **Master Slash** (Auto-attack)
2. **Devastating Strike** (Damage)
   - 300% weapon damage
   - 25 mana
   - 8s cooldown
3. **Fortress** (Buff)
   - +50% defense for 20s
   - 30 mana
   - 30s cooldown
4. **Blade Storm** (AoE)
   - 180% weapon damage to all nearby enemies
   - 40 mana
   - 15s cooldown
5. **Execute** (Finisher)
   - 500% weapon damage to targets below 30% health
   - 50 mana
   - 30s cooldown

### Fire Staff Skills

**T1-T3 Fire Staff Skills:**
1. **Fireball** (Auto-attack)
   - Ranged fire damage
   - No mana cost
2. **Flame Burst** (Damage)
   - 180% magic damage
   - 12 mana
   - 6s cooldown
3. **Fire Shield** (Buff)
   - Absorbs 100 damage
   - 15 mana
   - 20s cooldown

**T4-T6 Fire Staff Skills:**
1. **Greater Fireball** (Auto-attack)
2. **Inferno** (Damage)
   - 250% magic damage
   - 20 mana
   - 8s cooldown
3. **Flame Wall** (AoE)
   - Creates fire wall, 100% damage/sec for 5s
   - 25 mana
   - 15s cooldown
4. **Combustion** (DoT)
   - 50% damage/sec for 10s
   - 18 mana
   - 10s cooldown

**T7-T8 Fire Staff Skills:**
1. **Master Fireball** (Auto-attack)
2. **Meteor Strike** (Damage)
   - 400% magic damage
   - 35 mana
   - 12s cooldown
3. **Ring of Fire** (AoE)
   - 200% damage to all nearby enemies
   - 40 mana
   - 18s cooldown
4. **Pyroblast** (Channeled)
   - 600% magic damage after 3s channel
   - 50 mana
   - 25s cooldown
5. **Phoenix Form** (Ultimate)
   - +50% magic damage, immune to CC for 15s
   - 75 mana
   - 60s cooldown

### Bow Skills

**T1-T3 Bow Skills:**
1. **Quick Shot** (Auto-attack)
2. **Aimed Shot** (Damage)
   - 200% weapon damage
   - 10 mana
   - 5s cooldown
3. **Evasive Roll** (Mobility)
   - Dash backward 10m
   - 15 mana
   - 12s cooldown

**T4-T6 Bow Skills:**
1. **Rapid Shot** (Auto-attack)
2. **Piercing Arrow** (Damage)
   - 250% weapon damage, pierces enemies
   - 15 mana
   - 7s cooldown
3. **Explosive Arrow** (AoE)
   - 150% damage in 5m radius
   - 20 mana
   - 10s cooldown
4. **Camouflage** (Stealth)
   - Invisible for 10s
   - 25 mana
   - 30s cooldown

**T7-T8 Bow Skills:**
1. **Master Shot** (Auto-attack)
2. **Sniper Shot** (Damage)
   - 400% weapon damage at long range
   - 30 mana
   - 10s cooldown
3. **Rain of Arrows** (AoE)
   - 200% damage in 10m radius
   - 35 mana
   - 15s cooldown
4. **Multishot** (Burst)
   - Fire 5 arrows at once, 120% damage each
   - 40 mana
   - 12s cooldown
5. **Deadly Precision** (Ultimate)
   - Next 5 shots are guaranteed crits
   - 50 mana
   - 45s cooldown

---

## Skill Naming Conventions

### Format
```
[WeaponType]_[SkillName]_[Tier]
```

**Examples:**
- `Sword_Slash_T1`
- `Sword_PowerStrike_T1`
- `Sword_Execute_T7`
- `FireStaff_Fireball_T1`
- `FireStaff_MeteorStrike_T7`
- `Bow_QuickShot_T1`
- `Bow_SniperShot_T7`

---

## Skill List Naming Conventions

### Format
```
[WeaponType]_[TierRange]_Skills
```

**Examples:**
- `Sword_T1-T3_Skills`
- `Sword_T4-T6_Skills`
- `Sword_T7-T8_Skills`
- `FireStaff_T1-T3_Skills`
- `Bow_T4-T6_Skills`

---

## Implementation Checklist

For each weapon type (16 total):

- [ ] Create 3 ScriptableWeaponSkillList assets (T1-T3, T4-T6, T7-T8)
- [ ] Create 2-5 ScriptableSkill assets per tier range
- [ ] Assign skills to weapon skill lists
- [ ] Assign weapon skill lists to weapon items
- [ ] Test in-game: equip weapon, verify skills appear in skillbar
- [ ] Test skill functionality: cast each skill, verify effects

---

## Quick Reference: Weapon Types

1. **Sword** - Balanced melee
2. **Axe** - High damage melee
3. **Mace** - Armor penetration melee
4. **Dagger** - Fast melee
5. **Hammer** - CC two-handed
6. **Greataxe** - Damage two-handed
7. **Greatsword** - AoE two-handed
8. **Quarterstaff** - Defensive two-handed
9. **Bow** - Physical ranged
10. **Crossbow** - Heavy ranged
11. **Fire Staff** - Fire magic
12. **Frost Staff** - Ice magic
13. **Holy Staff** - Healing
14. **Nature Staff** - HoT/DoT
15. **Arcane Staff** - Utility magic
16. **Cursed Staff** - Debuff magic

---

## Next Steps

- See **EQUIPMENT_SETS_GUIDE.md** for equipment sets
- See **EQUIPMENT_CHECKLIST.md** for validation
- See **GRUDA_EQUIPMENT_SYSTEM.md** for system overview

