# Combat System Reference

## Overview

Grudge Warlords uses a turn-based combat system with 8 steps per attack. Combat calculations incorporate attributes, equipment, traits, and buffs to determine final damage output and mitigation.

## Combat Flow (8 Steps)

### Step 1: Calculate Base Damage
```
Base Damage = Level Damage + Attribute Bonuses + Equipment + Traits + Sets
```

Level damage scales with character level. Attribute bonuses come from STR, INT, DEX, AGI, WIS, and TAC based on their flat/percent modifiers.

### Step 2: Apply Defense Break
```
Effective Defense = Target Defense × (1 - Attacker's Defense Break Factor)
```

Defense Break Factor allows attackers to ignore a portion of the target's defense (capped at 75%).

### Step 3: Calculate Mitigation (Relational Damage)
```
Damage Taken = Incoming Damage × (100 - √Defense) / 100
```

Defense mitigation uses a square root formula providing diminishing returns:

| Defense | √Defense | Damage Reduction | Example (100 DMG) |
|---------|----------|------------------|-------------------|
| 100     | 10       | 10%              | 90 damage taken   |
| 400     | 20       | 20%              | 80 damage taken   |
| 900     | 30       | 30%              | 70 damage taken   |
| 2500    | 50       | 50%              | 50 damage taken   |

**Note:** Defense reduction is capped at 90% maximum.

### Step 4: Apply Random Variance
```
Variance = 0.75 + Random(0, 0.5)  // ±25% deviation
Final = Damage × Variance
```

Enabled by default. Adds tactical uncertainty to combat outcomes.

### Step 5: Check Block
```
IF Random(0,1) < Effective Block Chance:
    Damage = Damage × (1 - Block Factor)

Effective Block Chance = Defender Block Chance - Attacker Block Break Factor
```

**Caps:**
- Block Chance: 75% maximum
- Block Factor: 90% maximum (blocks up to 90% of damage)

**Example:** 100 damage incoming, 40% block chance, 0.35 block factor
- 40% chance to trigger block
- If blocked: 100 × (1 - 0.35) = 65 damage taken

### Step 6: Check Critical Hit
```
IF Random(0,1) < Effective Critical Chance:
    Damage = Damage × Critical Factor

Effective Critical Chance = Attacker Crit Chance - Defender Crit Evasion
```

**Important:** Critical hits CANNOT occur on blocked attacks. Block check happens before critical check.

**Caps:**
- Critical Chance: 75% maximum
- Critical Factor: 3.0× maximum (300% damage)

**Example:** 100 base damage, 45% crit chance, 1.8× crit factor
- 45% chance to trigger critical
- If critical: 100 × 1.8 = 180 damage

### Step 7: Apply Damage
```
Target HP = Target HP - Final Damage
```

Minimum damage is always 1 (attacks cannot deal 0 damage).

### Step 8: Trigger Effects

#### Drain (Lifesteal/Manasteal)
```
Health Restored = Damage Dealt × Drain Health Factor
Mana Restored = Damage Dealt × Drain Mana Factor
```
**Cap:** 50% maximum for both

#### Reflect Damage
```
Damage Reflected = Damage Received × Reflect Factor
```
**Cap:** 50% maximum
**Note:** Reflect does NOT proc on blocked hits.

#### Absorb Mechanics
```
Health Regenerated = Damage Received × Absorb Health Factor
Mana Regenerated = Damage Received × Absorb Mana Factor
```
**Cap:** 50% maximum for both

## Accuracy & Resistance (Debuffs)

```
Debuff Success Chance = Attacker Accuracy - Target Resistance
```

**Caps:**
- Maximum success chance: 95% (always 5% chance to resist)
- Minimum success chance: 5% (always 5% chance for debuffs to land)

## Stat Caps Summary

| Stat              | Cap Value | Rationale                           |
|-------------------|-----------|-------------------------------------|
| Block Chance      | 75%       | Maintains counterplay               |
| Critical Chance   | 75%       | Preserves non-crit damage builds    |
| Block Factor      | 90%       | Allows blocking without immunity    |
| Critical Factor   | 3.0×      | Prevents one-shot mechanics         |
| Accuracy          | 95%       | Always 5% chance to resist          |
| Resistance        | 95%       | Always 5% chance for debuffs to land|
| Drain Health      | 50%       | Prevents infinite sustain loops     |
| Drain Mana        | 50%       | Prevents infinite sustain loops     |
| Reflect Damage    | 50%       | Prevents reflect-only strategies    |
| Absorb Health     | 50%       | Prevents excessive regeneration     |
| Absorb Mana       | 50%       | Prevents excessive regeneration     |
| Defense Break     | 75%       | Tanks remain somewhat effective     |
| Block Break       | 75%       | Blocking remains viable             |
| Crit Evasion      | 50%       | Critical builds stay relevant       |

## Implementation

The combat system is implemented in `shared/attributeSystem.ts`:

```typescript
import { 
  calculateCombatDamage, 
  calculateMitigation,
  checkDebuffSuccess 
} from '@shared/attributeSystem';

// Full combat calculation
const result = calculateCombatDamage(attackerStats, defenderStats, true);
// Returns: { rawDamage, mitigatedDamage, finalDamage, blocked, critical, 
//            healthDrained, manaDrained, reflected, healthAbsorbed, manaAbsorbed }

// Defense mitigation only
const mitigated = calculateMitigation(incomingDamage, defense);

// Debuff check
const success = checkDebuffSuccess(attackerAccuracy, defenderResistance);
```

## Level 20 Combat Examples

### Tank Build (60 STR / 50 VIT / 50 END)
- Health: ~2,200
- Defense: ~1,500 (38.7% damage reduction)
- Block Chance: ~70%
- Block Factor: ~75%
- Damage: ~140

### Physical DPS (50 STR / 55 DEX / 55 AGI)
- Health: ~850
- Damage: ~155
- Critical Chance: 75% (CAPPED)
- Critical Factor: ~2.1×

### Magic DPS (80 INT / 80 WIS)
- Health: ~540
- Mana: ~1,345
- Damage: ~215 + spell bonuses
- Accuracy: ~40%
- Resistance: ~45%

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/attributeSystem.ts` | Combat formulas and stat calculations |
| `shared/schema.ts` | combatLogs, monsters, spells, skills tables |
| `server/storage.ts` | Combat log storage |
| `server/routes.ts` | Combat API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/combat.tsx` | Main combat page |
| `client/src/pages/rpg-battle.tsx` | Alternative battle UI |
| `client/src/components/CombatEffects.tsx` | Visual combat effects |
| `client/src/components/CombatUnitStatus.tsx` | Unit health/status display |
| `client/src/components/CombatEffectAnimator.tsx` | Effect animations |
| `client/src/components/AbilityBar.tsx` | Hotkey ability bar |
| `client/src/components/SlashEffect.tsx` | Attack visual effects |

### Core Functions (`shared/attributeSystem.ts`)
| Function | Purpose |
|----------|---------|
| `calculateStats()` | Calculate all stats from attributes |
| `calculateCombatDamage()` | Full damage calculation with all modifiers |
| `calculateMitigation()` | Defense damage reduction |
| `checkDebuffSuccess()` | Accuracy vs resistance roll |
| `getEffectivePoints()` | Apply diminishing returns |
