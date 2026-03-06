# Spell, Skill & Ability UI Icon Reference

This document maps all spells, skills, and abilities in Grudge Warlords to their UI 2D sprite icons.

## Icon Directory Structure

| Directory | Purpose | Count |
|-----------|---------|-------|
| `/icons/misc/` | Magic effects, status icons, UI elements | ~200+ |
| `/icons/weapons/` | Weapon icons | ~300+ |
| `/icons/armor/` | Armor slot icons | ~500+ |
| `/icons/potions/` | Consumable items | ~50+ |
| `/icons/resources/` | Crafting materials | ~300+ |
| `/icons/entities/` | Character/creature icons | ~100+ |

---

## SPELLS (15 Total)

### Fire School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_fireball` | Fireball | 🔥 | `/icons/misc/Fires.png` | Hurls a ball of fire at the enemy |
| `spell_inferno` | Inferno | 🌋 | `/icons/misc/Firestar.png` | Engulfs all enemies in flames |

### Ice School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_frostbolt` | Frostbolt | ❄️ | `/icons/misc/CircleW.png` | Launches a shard of ice |
| `spell_blizzard` | Blizzard | 🌨️ | `/icons/misc/Flow.png` | Summons a devastating ice storm |

### Lightning School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_lightning_bolt` | Lightning Bolt | ⚡ | `/icons/misc/Lighting.png` | Strikes with a bolt of lightning |
| `spell_chain_lightning` | Chain Lightning | ⛈️ | `/icons/misc/Electro.png` | Lightning arcs between enemies |

### Holy School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_holy_light` | Holy Light | ✨ | `/icons/misc/Lights.png` | Heals an ally with divine energy |
| `spell_divine_shield` | Divine Shield | 🛡️ | `/icons/misc/Glow.png` | Grants temporary invulnerability |
| `spell_smite` | Smite | ☀️ | `/icons/misc/Life.png` | Calls down holy wrath |

### Shadow School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_shadow_bolt` | Shadow Bolt | 🌑 | `/icons/misc/Chaos.png` | Hurls a bolt of dark energy |
| `spell_drain_life` | Drain Life | 💀 | `/icons/misc/Chaos_2.png` | Drains health from the enemy |

### Nature School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_poison_cloud` | Poison Cloud | ☠️ | `/icons/misc/Effect.png` | Creates a toxic cloud |
| `spell_entangle` | Entangle | 🌿 | `/icons/misc/Leaf.png` | Roots the enemy with vines |

### Arcane School
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `spell_arcane_missiles` | Arcane Missiles | 💫 | `/icons/misc/Core.png` | Fires missiles of pure arcane energy |
| `spell_mana_shield` | Mana Shield | 🔮 | `/icons/misc/AquaCircle.png` | Converts mana into a barrier |

---

## SKILLS (21 Total)

### Sword Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_slash` | Slash | ⚔️ | `/icons/misc/Slash_07.png` | Basic sword attack |
| `skill_power_strike` | Power Strike | 💥 | `/icons/weapons/Sword_01.png` | Devastating overhead blow |
| `skill_whirlwind` | Whirlwind | 🌀 | `/icons/misc/CircleF.png` | Spin attack hitting all enemies |
| `skill_taunt` | Taunt | 😡 | `/icons/misc/Burns.png` | Force enemies to target you |
| `skill_battle_cry` | Battle Cry | 📢 | `/icons/misc/flag_icon.png` | Boost attack for all allies |

### Axe Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_cleave` | Cleave | 🪓 | `/icons/weapons/Axe_01.png` | Powerful swing cleaving armor |
| `skill_raging_blow` | Raging Blow | 😤 | `/icons/weapons/Axe_04.png` | Enraged attack fueled by fury |
| `skill_skull_splitter` | Skull Splitter | 💀 | `/icons/weapons/Axe_12.png` | Ignores defense |

### Dagger Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_backstab` | Backstab | 🗡️ | `/icons/weapons/Dagger_01.png` | Strike from shadows |
| `skill_envenom` | Envenom | 🐍 | `/icons/weapons/Dagger_02.png` | Coat blade with poison |
| `skill_shadow_dance` | Shadow Dance | 🌙 | `/icons/misc/ChaosCircle.png` | Become one with shadows |

### Bow Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_aimed_shot` | Aimed Shot | 🎯 | `/icons/weapons/Bow_01.png` | Carefully aimed arrow |
| `skill_multi_shot` | Multi-Shot | 🏹 | `/icons/weapons/Bow_02.png` | Fire at all enemies |
| `skill_explosive_arrow` | Explosive Arrow | 💣 | `/icons/weapons/Crossbow_01.png` | Explodes on impact |

### Mace Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_shield_bash` | Shield Bash | `/icons/weapons/Hammer_01.png` | `/icons/weapons/Hammer_01.png` | Bash enemy, stunning them |
| `skill_holy_strike` | Holy Strike | `/icons/weapons/Hammer_02.png` | `/icons/weapons/Hammer_02.png` | Infuse weapon with holy energy |

### Staff Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_staff_strike` | Staff Strike | `/icons/weapons/staff_10.png` | `/icons/weapons/staff_10.png` | Basic melee attack |

### Spear Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_spear_thrust` | Spear Thrust | 🔱 | `/icons/weapons/Spear_01.png` | Precise thrust |
| `skill_impale` | Impale | 🩸 | `/icons/weapons/Spear_02.png` | Causes bleeding |

### Unarmed Skills
| ID | Name | Current Icon | UI Sprite Path | Description |
|----|------|--------------|----------------|-------------|
| `skill_feral_strike` | Feral Strike | 🐾 | `/icons/misc/Lava.png` | Attack with primal fury |
| `skill_savage_pounce` | Savage Pounce | 🐺 | `/icons/misc/NatureFlower.png` | Leap with bestial ferocity |

---

## WEAPON SKILLS (by Weapon Type)

### Sword Weapon Skills (Slot 1-4)
| ID | Name | Slot | UI Sprite Path | Effects |
|----|------|------|----------------|---------|
| `sword_slash` | Slash | 1 | `/icons/misc/Slash_07.png` | Physical Damage |
| `sword_thrust` | Piercing Thrust | 1 | `/icons/weapons/Sword_02.png` | Armor Penetration 15% |
| `sword_parry` | Parry | 1 | `/icons/armor/Shield_01.png` | Block + Counter |
| `sword_whirlwind` | Whirlwind | 2 | `/icons/misc/CircleF.png` | AoE 360° |
| `sword_charge` | Heroic Charge | 2 | `/icons/misc/Effect.png` | Dash + Stun |
| `sword_execute` | Execute | 2 | `/icons/misc/Chaos_2.png` | 2x dmg below 30% HP |
| `sword_defensive_stance` | Defensive Stance | 3 | `/icons/armor/Chest_12.png` | 30% Damage Reduction |
| `sword_battle_cry` | Battle Cry | 3 | `/icons/misc/Flag Icon.png` | +20% Damage |
| `sword_riposte` | Riposte | 3 | `/icons/misc/Lighting.png` | Guaranteed Crit counter |
| `sword_bladestorm` | Bladestorm | 4 | `/icons/misc/CircleE.png` | Ultimate: Whirlwind 4s |
| `sword_avatar` | Avatar of War | 4 | `/icons/entities/Human Warrior.png` | Ultimate: +50% Stats |

### Axe Weapon Skills (Slot 1-4)
| ID | Name | Slot | UI Sprite Path | Effects |
|----|------|------|----------------|---------|
| `axe_cleave` | Cleave | 1 | `/icons/weapons/Axe_01.png` | 25% Armor Ignore |
| `axe_rend` | Rending Strike | 1 | `/icons/weapons/Axe_04.png` | Bleed 5s |
| `axe_crush` | Crushing Blow | 1 | `/icons/weapons/Axe_12.png` | Reduce Armor 20% |
| `axe_frenzy` | Blood Frenzy | 2 | `/icons/misc/Burns.png` | 5 Rapid Hits |
| `axe_leap` | Savage Leap | 2 | `/icons/misc/Effect.png` | Leap 8m + AoE |
| `axe_rampage` | Rampage | 2 | `/icons/misc/Fires.png` | 3 Heavy Swings |
| `axe_bloodlust` | Bloodlust | 3 | `/icons/misc/Lava.png` | Stack Damage +5% |
| `axe_berserker_rage` | Berserker Rage | 3 | `/icons/misc/Firestar.png` | Cannot Die 4s |
| `axe_intimidate` | Intimidating Shout | 3 | `/icons/misc/Chaos.png` | Fear, -25% Enemy Damage |
| `axe_annihilation` | Annihilation | 4 | `/icons/misc/Chaos_2.png` | Ultimate: 5 Hit Combo |
| `axe_warlord` | Warlord's Fury | 4 | `/icons/entities/Barb warrior.png` | Ultimate: +100% Attack Speed |

### Bow Weapon Skills (Slot 1-4)
| ID | Name | Slot | UI Sprite Path | Effects |
|----|------|------|----------------|---------|
| `bow_quickshot` | Quick Shot | 1 | `/icons/weapons/Bow_01.png` | Range 25m |
| `bow_aimed` | Aimed Shot | 1 | `/icons/weapons/Crossbow_01.png` | Guaranteed Crit |
| `bow_poison` | Poison Arrow | 1 | `/icons/misc/Effect.png` | Poison + Slow |
| `bow_multishot` | Multishot | 2 | `/icons/weapons/Bow_02.png` | 5 Arrows, 60° Cone |
| `bow_explosive` | Explosive Arrow | 2 | `/icons/weapons/Crossbow_03.png` | AoE + Knockback |
| `bow_volley` | Arrow Volley | 2 | `/icons/misc/Flow.png` | Rain arrows 6m |
| `bow_evasion` | Evasive Roll | 3 | `/icons/misc/Effect.png` | Dash + Attack Speed |
| `bow_trap` | Hunter's Trap | 3 | `/icons/misc/Loot_27.png` | Root 3s |
| `bow_camouflage` | Camouflage | 3 | `/icons/misc/Leaf.png` | Stealth 5s |
| `bow_sniper` | Sniper Shot | 4 | `/icons/weapons/Crossbow_05.png` | Ultimate: 50m Range |
| `bow_rain` | Rain of Arrows | 4 | `/icons/misc/Flow.png` | Ultimate: AoE 10m, 5s |

### Staff Weapon Skills (Slot 1-4)
| ID | Name | Slot | UI Sprite Path | Effects |
|----|------|------|----------------|---------|
| `staff_fireball` | Fireball | 1 | `/icons/misc/Fires.png` | Magic Damage + AoE |
| `staff_frostbolt` | Frost Bolt | 1 | `/icons/misc/CircleW.png` | Slow 30% |
| `staff_lightning` | Lightning Bolt | 1 | `/icons/misc/Lighting.png` | Chain to 2 Targets |
| `staff_meteor` | Meteor Strike | 2 | `/icons/misc/Firestar.png` | AoE 5m + Stun |
| `staff_blizzard` | Blizzard | 2 | `/icons/misc/Flow.png` | AoE 6m, Slow 50% |
| `staff_chain_lightning` | Chain Lightning | 2 | `/icons/misc/Electro.png` | Bounces 5 Times |
| `staff_shield` | Arcane Shield | 3 | `/icons/misc/AquaCircle.png` | Absorb 200 Damage |
| `staff_teleport` | Blink | 3 | `/icons/misc/Core.png` | Teleport 15m |
| `staff_mana_surge` | Mana Surge | 3 | `/icons/misc/AquaCore.png` | Restore 50% Mana |
| `staff_armageddon` | Armageddon | 4 | `/icons/misc/Firestar.png` | Ultimate: Fire AoE 12m |
| `staff_arcane_form` | Arcane Ascension | 4 | `/icons/misc/Glow.png` | Ultimate: +100% Spell Damage |

### Dagger Weapon Skills (Slot 1-4)
| ID | Name | Slot | UI Sprite Path | Effects |
|----|------|------|----------------|---------|
| `dagger_stab` | Backstab | 1 | `/icons/weapons/Dagger_01.png` | +50% from Behind |
| `dagger_flurry` | Blade Flurry | 1 | `/icons/weapons/Dagger_02.png` | 4 Rapid Hits |
| `dagger_throw` | Throwing Knife | 1 | `/icons/weapons/Dagger_07.png` | Range 15m + Slow |
| `dagger_assassinate` | Assassinate | 2 | `/icons/weapons/Dagger_18.png` | 3x Damage from Stealth |
| `dagger_shadowstep` | Shadow Step | 2 | `/icons/misc/ChaosCircle.png` | Teleport Behind |
| `dagger_fan` | Fan of Knives | 2 | `/icons/weapons/Dagger_33.png` | 360° AoE |
| `dagger_vanish` | Vanish | 3 | `/icons/misc/Chaos.png` | Stealth 6s |
| `dagger_poison_blade` | Envenom | 3 | `/icons/misc/Effect.png` | Poison 5 Attacks |
| `dagger_evasion` | Evasion | 3 | `/icons/misc/Effect.png` | 100% Dodge 3s |
| `dagger_death_mark` | Death Mark | 4 | `/icons/misc/Chaos_2.png` | Ultimate: +30% Damage |
| `dagger_shadow_dance` | Shadow Dance | 4 | `/icons/misc/ChaosCircle.png` | Ultimate: No CD |

---

## STATUS EFFECTS

| Effect ID | Name | Type | UI Sprite Path |
|-----------|------|------|----------------|
| `slow` | Chilled | Debuff | `/icons/misc/CircleW.png` |
| `armor_break` | Armor Broken | Debuff | `/icons/armor/Chest_68.png` |
| `stunned` | Stunned | Debuff | `/icons/misc/Lighting.png` |
| `bleed` | Bleeding | Debuff | `/icons/misc/Lava.png` |
| `poison` | Poisoned | Debuff | `/icons/misc/Effect.png` |
| `rooted` | Rooted | Debuff | `/icons/misc/Leaf.png` |
| `taunted` | Taunted | Debuff | `/icons/misc/Burns.png` |
| `battle_fury` | Battle Fury | Buff | `/icons/misc/Fires.png` |
| `invulnerable` | Divine Protection | Buff | `/icons/misc/Glow.png` |
| `mana_shield` | Mana Shield | Buff | `/icons/misc/AquaCircle.png` |

---

## VISUAL EFFECTS (Combat Animations)

| Effect Type | Description | Sprite Folder |
|-------------|-------------|---------------|
| `fire` | Fire-based spells | `/sprites/effects/fire/` |
| `ice` | Ice/frost effects | `/sprites/effects/ice/` |
| `electric` | Lightning effects | `/sprites/effects/lightning/` |
| `holy` | Holy/light effects | `/sprites/effects/holy/` |
| `shadow` | Dark magic effects | `/sprites/effects/shadow/` |
| `poison` | Poison/nature effects | `/sprites/effects/poison/` |
| `arcane` | Arcane magic effects | `/sprites/effects/arcane/` |
| `slash` | Melee slash effects | Character Split Effects |
| `heal` | Healing effects | `/sprites/effects/heal/` |
| `blood` | Bleed/damage effects | `/sprites/effects/blood/` |

---

## Implementation Notes

### Updating Spell Icons
To update a spell's UI icon, modify the `icon` field in `/shared/definitions/spells.ts`:

```typescript
"spell_fireball": {
  id: "spell_fireball",
  name: "Fireball",
  icon: "/icons/misc/Fires.png",  // Path to UI sprite
  // ... other properties
}
```

### Updating Skill Icons
To update a skill's UI icon, modify the `icon` field in `/shared/definitions/skills.ts`:

```typescript
"skill_slash": {
  id: "skill_slash",
  name: "Slash",
  icon: "/icons/misc/Slash_07.png",  // Path to UI sprite
  // ... other properties
}
```

### Database Sync
After updating icon paths, sync the database:
```bash
npm run db:push
```

---

## Icon Naming Conventions

| Prefix | Category | Example |
|--------|----------|---------|
| `Fire*` | Fire effects | `Fires.png`, `Firestar.png` |
| `Circle*` | Element circles | `CircleF.png` (Fire), `CircleW.png` (Water) |
| `Chaos*` | Shadow/dark magic | `Chaos.png`, `ChaosCircle.png` |
| `Slash_*` | Physical attack effects | `Slash_07.png` |
| `Sword_*` | Sword weapon icons | `Sword_01.png` |
| `Axe_*` | Axe weapon icons | `Axe_01.png` |
| `Dagger_*` | Dagger weapon icons | `Dagger_01.png` |
| `Bow_*` | Bow weapon icons | `Bow_01.png` |
| `Staff_*` | Staff weapon icons | `Staff_01.png` |

---

## Missing Icons To Create

The following abilities need custom UI icons:

1. **Nature School** - Need leaf/vine themed icons
2. **Arcane School** - Need purple/magical themed icons  
3. **Buff/Debuff States** - Need status indicator icons
4. **Ultimate Abilities** - Need dramatic/powerful icons

Use AI image generation or source from Craftpix packs to fill gaps.
