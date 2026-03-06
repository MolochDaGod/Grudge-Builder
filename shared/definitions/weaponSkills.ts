export interface WeaponSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  slot: 1 | 2 | 3 | 4;
  maxUpgrades: number;
  baseDamage: number;
  damagePerUpgrade: number;
  cooldown: number;
  cooldownReductionPerUpgrade: number;
  manaCost: number;
  effects: string[];
  upgradeEffects: string[];
}

export interface WeaponSkillTree {
  weaponType: string;
  skills: WeaponSkill[];
}

export interface CharacterSkillSlot {
  skillId: string | null;
  upgradeLevel: number;
}

export interface CharacterSkillLoadout {
  weaponType: string;
  slots: {
    1: CharacterSkillSlot;
    2: CharacterSkillSlot;
    3: CharacterSkillSlot;
    4: CharacterSkillSlot;
  };
}

export interface StoredSkillLoadout {
  slots: {
    1: CharacterSkillSlot;
    2: CharacterSkillSlot;
    3: CharacterSkillSlot;
    4: CharacterSkillSlot;
  };
}

const SWORD_SKILLS: WeaponSkill[] = [
  { id: "sword_slash", name: "Slash", description: "A quick horizontal slash dealing physical damage.", icon: "⚔️", slot: 1, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 1.5, cooldownReductionPerUpgrade: 0.1, manaCost: 10, effects: ["Physical Damage"], upgradeEffects: ["+8 Damage", "+8 Damage, -0.1s CD", "+8 Damage, Bleed 2s", "+8 Damage, -0.1s CD", "+8 Damage, 10% Armor Pen"] },
  { id: "sword_thrust", name: "Piercing Thrust", description: "A powerful thrust that pierces armor.", icon: "🗡️", slot: 1, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 18, effects: ["Armor Penetration 15%"], upgradeEffects: ["+10 Damage", "+5% Armor Pen", "+10 Damage", "Stun 0.5s", "+15% Armor Pen"] },
  { id: "sword_parry", name: "Parry", description: "Block incoming attack and counter.", icon: "🛡️", slot: 1, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 5, cooldown: 4, cooldownReductionPerUpgrade: 0.3, manaCost: 15, effects: ["Block Next Attack", "Counter Attack"], upgradeEffects: ["+Block Duration", "+5 Counter Damage", "Reflect 20%", "+Block Duration", "Stun on Counter"] },
  
  { id: "sword_whirlwind", name: "Whirlwind", description: "Spin attack hitting all nearby enemies.", icon: "🌀", slot: 2, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["AoE 360°", "3m Radius"], upgradeEffects: ["+12 Damage", "+0.5m Radius", "+12 Damage, Slow 20%", "+1m Radius", "Pull Enemies In"] },
  { id: "sword_charge", name: "Heroic Charge", description: "Dash forward dealing damage and stunning.", icon: "💨", slot: 2, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 8, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 25, effects: ["Dash 5m", "Stun 1s"], upgradeEffects: ["+2m Dash", "+8 Damage", "Stun +0.5s", "+8 Damage", "Leave Fire Trail"] },
  { id: "sword_execute", name: "Execute", description: "Powerful strike, bonus damage to low HP.", icon: "💀", slot: 2, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 10, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["2x Damage below 30% HP"], upgradeEffects: ["+15 Damage", "Threshold 35%", "+15 Damage", "Threshold 40%", "Reset CD on Kill"] },

  { id: "sword_defensive_stance", name: "Defensive Stance", description: "Take reduced damage for 5 seconds.", icon: "🏰", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 35, effects: ["30% Damage Reduction", "5s Duration"], upgradeEffects: ["+5% DR", "+1s Duration", "+5% DR", "Reflect 10%", "Immunity to CC"] },
  { id: "sword_battle_cry", name: "Battle Cry", description: "Boost attack damage for you and allies.", icon: "📯", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["+20% Damage", "5s Duration", "10m Range"], upgradeEffects: ["+5% Damage Buff", "+2s Duration", "+5% Damage Buff", "+Attack Speed 15%", "+Crit Chance 10%"] },
  { id: "sword_riposte", name: "Riposte", description: "Counter next attack with devastating blow.", icon: "⚡", slot: 3, maxUpgrades: 5, baseDamage: 60, damagePerUpgrade: 20, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 30, effects: ["Counter Window 2s", "Guaranteed Crit"], upgradeEffects: ["+20 Damage", "+0.5s Window", "+20 Damage", "Stun 1.5s", "Reset All CDs on Counter"] },

  { id: "sword_bladestorm", name: "Bladestorm", description: "Ultimate: Become a whirlwind of blades.", icon: "🌪️", slot: 4, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 30, cooldown: 45, cooldownReductionPerUpgrade: 5, manaCost: 80, effects: ["Channel 4s", "Immune to CC", "AoE 5m"], upgradeEffects: ["+30 Damage, +1s Duration", "+30 Damage, Pull Enemies", "+50 Damage, Heals 2% per hit"] },
  { id: "sword_avatar", name: "Avatar of War", description: "Ultimate: Transform into an unstoppable warrior.", icon: "👹", slot: 4, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["+50% All Stats", "8s Duration", "Immune to Death"], upgradeEffects: ["+10% Stats, +2s Duration", "+10% Stats, Reset CDs", "+20% Stats, Explode on End"] },
];

const AXE_SKILLS: WeaponSkill[] = [
  { id: "axe_cleave", name: "Cleave", description: "Heavy overhead swing cleaving through armor.", icon: "🪓", slot: 1, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 15, effects: ["25% Armor Ignore"], upgradeEffects: ["+10 Damage", "+10% Armor Ignore", "+10 Damage", "Bleed 3s", "+15% Armor Ignore"] },
  { id: "axe_rend", name: "Rending Strike", description: "Tear through flesh causing bleeding.", icon: "🩸", slot: 1, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 12, effects: ["Bleed 5s", "8 DPS"], upgradeEffects: ["+2 Bleed DPS", "+6 Damage", "+2 Bleed DPS", "+2s Duration", "Spread to Nearby"] },
  { id: "axe_crush", name: "Crushing Blow", description: "Smash down reducing enemy defenses.", icon: "💥", slot: 1, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 8, cooldown: 3, cooldownReductionPerUpgrade: 0.2, manaCost: 18, effects: ["Reduce Armor 20%", "3s Duration"], upgradeEffects: ["+8 Damage", "+10% Armor Reduce", "+8 Damage", "+2s Duration", "Shatter Shields"] },

  { id: "axe_frenzy", name: "Blood Frenzy", description: "Attack rapidly, gaining speed with each hit.", icon: "😤", slot: 2, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 5, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 35, effects: ["5 Rapid Hits", "+10% Speed per Hit"], upgradeEffects: ["+1 Hit", "+5 Damage", "+1 Hit", "Lifesteal 5%", "+2 Hits, Crit Chance"] },
  { id: "axe_leap", name: "Savage Leap", description: "Leap to target location slamming down.", icon: "🦘", slot: 2, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 12, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 30, effects: ["Leap 8m", "AoE 3m", "Slow 30%"], upgradeEffects: ["+12 Damage", "+2m Leap", "+1m AoE", "+20% Slow", "Stun on Land"] },
  { id: "axe_rampage", name: "Rampage", description: "Go berserk dealing massive damage.", icon: "🔥", slot: 2, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 15, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["3 Heavy Swings", "+30% Damage Taken"], upgradeEffects: ["+15 Damage", "Reduce Penalty to 20%", "+15 Damage", "Heal 10% on Kill", "No Penalty"] },

  { id: "axe_bloodlust", name: "Bloodlust", description: "Gain power from dealing damage.", icon: "💉", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 40, effects: ["Stack Damage +5%", "Max 10 Stacks", "8s Duration"], upgradeEffects: ["+2% per Stack", "+2 Max Stacks", "+2s Duration", "Lifesteal at Max", "+3 Max Stacks"] },
  { id: "axe_berserker_rage", name: "Berserker Rage", description: "Enter rage state, immune to pain.", icon: "😡", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 50, effects: ["Cannot Die for 4s", "Take Damage After"], upgradeEffects: ["+1s Duration", "Heal 20% After", "+1s Duration", "Reduce Damage Taken After 50%", "Heal 50% After"] },
  { id: "axe_intimidate", name: "Intimidating Shout", description: "Fear nearby enemies reducing their damage.", icon: "😱", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 35, effects: ["-25% Enemy Damage", "5s Duration", "8m Range"], upgradeEffects: ["-5% More", "+2s Duration", "-5% More", "Slow 30%", "Root 2s"] },

  { id: "axe_annihilation", name: "Annihilation", description: "Ultimate: Devastating combo destroying all.", icon: "☠️", slot: 4, maxUpgrades: 3, baseDamage: 120, damagePerUpgrade: 40, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["5 Hit Combo", "Final Hit 3x Damage"], upgradeEffects: ["+40 Damage, +1 Hit", "+40 Damage, Armor Shred", "+60 Damage, Execute Below 25%"] },
  { id: "axe_warlord", name: "Warlord's Fury", description: "Ultimate: Become an unstoppable berserker.", icon: "🐺", slot: 4, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["+100% Attack Speed", "+50% Damage", "10s Duration"], upgradeEffects: ["+2s Duration, Lifesteal 10%", "+3s Duration, No Mana Cost", "+5s Duration, Cleave All Attacks"] },
];

const BOW_SKILLS: WeaponSkill[] = [
  { id: "bow_quickshot", name: "Quick Shot", description: "Rapid arrow dealing physical damage.", icon: "🏹", slot: 1, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 1, cooldownReductionPerUpgrade: 0.05, manaCost: 8, effects: ["Range 25m"], upgradeEffects: ["+6 Damage", "-0.1s CD", "+6 Damage", "Pierce 1 Target", "+6 Damage, +5m Range"] },
  { id: "bow_aimed", name: "Aimed Shot", description: "Charged shot with guaranteed critical.", icon: "🎯", slot: 1, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 3, cooldownReductionPerUpgrade: 0.2, manaCost: 20, effects: ["Guaranteed Crit", "1s Channel"], upgradeEffects: ["+12 Damage", "+25% Crit Damage", "+12 Damage", "-0.3s Channel", "+50% Crit Damage"] },
  { id: "bow_poison", name: "Poison Arrow", description: "Arrow coated in deadly poison.", icon: "☠️", slot: 1, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 4, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 15, effects: ["Poison 6s", "5 DPS", "Slow 15%"], upgradeEffects: ["+2 Poison DPS", "+5% Slow", "+2 Poison DPS", "+3s Duration", "Spread on Death"] },

  { id: "bow_multishot", name: "Multishot", description: "Fire multiple arrows in a cone.", icon: "🌙", slot: 2, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["5 Arrows", "60° Cone"], upgradeEffects: ["+1 Arrow", "+8 Damage", "+1 Arrow", "+15° Cone", "+2 Arrows, Pierce"] },
  { id: "bow_explosive", name: "Explosive Arrow", description: "Arrow that explodes on impact.", icon: "💣", slot: 2, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 35, effects: ["AoE 4m", "Knockback"], upgradeEffects: ["+10 Damage", "+1m AoE", "+10 Damage", "Burn 3s", "Stun 1s"] },
  { id: "bow_volley", name: "Arrow Volley", description: "Rain arrows on target area.", icon: "🌧️", slot: 2, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["AoE 6m", "3s Duration", "30m Range"], upgradeEffects: ["+15 Damage", "+1s Duration", "+2m AoE", "Slow 40%", "Root Final Wave"] },

  { id: "bow_evasion", name: "Evasive Roll", description: "Roll away gaining attack speed.", icon: "🏃", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 10, cooldownReductionPerUpgrade: 0.8, manaCost: 20, effects: ["Dash 6m", "Invincible During", "+20% Attack Speed 3s"], upgradeEffects: ["+2m Dash", "+10% Attack Speed", "+1s Duration", "2 Charges", "+1 Charge"] },
  { id: "bow_trap", name: "Hunter's Trap", description: "Place trap that roots enemies.", icon: "🪤", slot: 3, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 8, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 30, effects: ["Root 3s", "Reveal Stealth"], upgradeEffects: ["+8 Damage", "+1s Root", "+8 Damage", "+1 Trap Active", "Poison 5s"] },
  { id: "bow_camouflage", name: "Camouflage", description: "Become invisible and gain crit.", icon: "🌿", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["Stealth 5s", "+50% Crit from Stealth", "+30% Move Speed"], upgradeEffects: ["+2s Duration", "+10% Crit Bonus", "+10% Move Speed", "No CD Break on Attack", "+20% Crit Bonus"] },

  { id: "bow_sniper", name: "Sniper Shot", description: "Ultimate: Devastating long-range shot.", icon: "🔭", slot: 4, maxUpgrades: 3, baseDamage: 150, damagePerUpgrade: 50, cooldown: 40, cooldownReductionPerUpgrade: 5, manaCost: 70, effects: ["50m Range", "2s Channel", "Ignore 50% Armor"], upgradeEffects: ["+50 Damage, Pierce All", "+50 Damage, -0.5s Channel", "+75 Damage, Reset on Kill"] },
  { id: "bow_rain", name: "Rain of Arrows", description: "Ultimate: Carpet bomb an area.", icon: "⬇️", slot: 4, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 25, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["AoE 10m", "5s Duration", "Slow 50%"], upgradeEffects: ["+25 Damage, +2m AoE", "+25 Damage, +2s Duration", "+40 Damage, Root Last Wave, Burn"] },
];

const STAFF_SKILLS: WeaponSkill[] = [
  { id: "staff_fireball", name: "Fireball", description: "Hurl a ball of fire at enemies.", icon: "🔥", slot: 1, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 20, effects: ["Magic Damage", "Small AoE"], upgradeEffects: ["+10 Damage", "+1m AoE", "+10 Damage", "Burn 3s", "+10 Damage, Explode"] },
  { id: "staff_frostbolt", name: "Frost Bolt", description: "Freeze enemies with ice magic.", icon: "❄️", slot: 1, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 18, effects: ["Slow 30%", "3s Duration"], upgradeEffects: ["+8 Damage", "+10% Slow", "+8 Damage", "+2s Duration", "Chance to Freeze"] },
  { id: "staff_lightning", name: "Lightning Bolt", description: "Strike with pure electrical energy.", icon: "⚡", slot: 1, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 12, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 22, effects: ["Chain to 2 Targets"], upgradeEffects: ["+12 Damage", "+1 Chain Target", "+12 Damage", "Stun 0.5s", "+2 Chain, +Damage per Chain"] },

  { id: "staff_meteor", name: "Meteor Strike", description: "Call down a devastating meteor.", icon: "☄️", slot: 2, maxUpgrades: 5, baseDamage: 60, damagePerUpgrade: 20, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 50, effects: ["AoE 5m", "1.5s Delay", "Stun 1s"], upgradeEffects: ["+20 Damage", "+1m AoE", "+20 Damage", "Burn Ground 5s", "Instant Cast"] },
  { id: "staff_blizzard", name: "Blizzard", description: "Create a freezing storm.", icon: "🌨️", slot: 2, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["AoE 6m", "4s Duration", "Slow 50%"], upgradeEffects: ["+12 Damage", "+1s Duration", "+2m AoE", "Freeze Chance 20%", "+10% Freeze Chance"] },
  { id: "staff_chain_lightning", name: "Chain Lightning", description: "Lightning that bounces between enemies.", icon: "🔗", slot: 2, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["Bounces 5 Times", "+10% Damage per Bounce"], upgradeEffects: ["+2 Bounces", "+10 Damage", "+2 Bounces", "Stun Final Target", "+3 Bounces, Paralyze"] },

  { id: "staff_shield", name: "Arcane Shield", description: "Protect yourself with magical barrier.", icon: "🛡️", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 40, effects: ["Absorb 200 Damage", "6s Duration"], upgradeEffects: ["+50 Absorb", "+2s Duration", "+50 Absorb", "Reflect 20%", "Explode on Break"] },
  { id: "staff_teleport", name: "Blink", description: "Teleport to target location.", icon: "✨", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 30, effects: ["Teleport 15m", "Invincible During"], upgradeEffects: ["+5m Range", "-1s CD", "+5m Range", "2 Charges", "+1 Charge"] },
  { id: "staff_mana_surge", name: "Mana Surge", description: "Regenerate mana rapidly.", icon: "💫", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 0, effects: ["Restore 50% Mana", "+30% Cast Speed 5s"], upgradeEffects: ["+10% Mana", "+5% Cast Speed", "+10% Mana", "+2s Duration", "Instant All Spells 3s"] },

  { id: "staff_armageddon", name: "Armageddon", description: "Ultimate: Rain fire and destruction.", icon: "🌋", slot: 4, maxUpgrades: 3, baseDamage: 100, damagePerUpgrade: 35, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 100, effects: ["AoE 12m", "6s Duration", "Random Meteors"], upgradeEffects: ["+35 Damage, +3m AoE", "+35 Damage, +2s Duration", "+50 Damage, Guaranteed Stun Each Hit"] },
  { id: "staff_arcane_form", name: "Arcane Ascension", description: "Ultimate: Become pure arcane energy.", icon: "🌟", slot: 4, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 120, effects: ["+100% Spell Damage", "No Mana Cost", "8s Duration", "Floating"], upgradeEffects: ["+2s Duration, +20% Damage", "+3s Duration, CD Reset", "+5s Duration, Immune to Damage"] },
];

const DAGGER_SKILLS: WeaponSkill[] = [
  { id: "dagger_stab", name: "Backstab", description: "Quick stab from behind for bonus damage.", icon: "🗡️", slot: 1, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 1.5, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["+50% from Behind"], upgradeEffects: ["+10 Damage", "+10% Behind Bonus", "+10 Damage", "Guaranteed Crit from Behind", "+20% Behind Bonus"] },
  { id: "dagger_flurry", name: "Blade Flurry", description: "Rapid series of stabs.", icon: "💨", slot: 1, maxUpgrades: 5, baseDamage: 18, damagePerUpgrade: 5, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 15, effects: ["4 Rapid Hits"], upgradeEffects: ["+1 Hit", "+5 Damage", "+1 Hit", "Poison Each Hit", "+2 Hits"] },
  { id: "dagger_throw", name: "Throwing Knife", description: "Throw a knife at range.", icon: "🔪", slot: 1, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 2, cooldownReductionPerUpgrade: 0.12, manaCost: 10, effects: ["Range 15m", "Slow 20%"], upgradeEffects: ["+7 Damage", "+5m Range", "+7 Damage", "+15% Slow", "Bounce to 2nd Target"] },

  { id: "dagger_assassinate", name: "Assassinate", description: "Powerful strike from stealth.", icon: "☠️", slot: 2, maxUpgrades: 5, baseDamage: 70, damagePerUpgrade: 20, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 40, effects: ["Requires Stealth", "3x Damage"], upgradeEffects: ["+20 Damage", "+0.5x Multiplier", "+20 Damage", "Silence 3s", "+1x Multiplier, Reset Stealth"] },
  { id: "dagger_shadowstep", name: "Shadow Step", description: "Teleport behind target.", icon: "👤", slot: 2, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 25, effects: ["Teleport Behind", "15m Range"], upgradeEffects: ["+8 Damage", "+5m Range", "+8 Damage", "Slow 40%", "2 Charges"] },
  { id: "dagger_fan", name: "Fan of Knives", description: "Throw knives in all directions.", icon: "🌸", slot: 2, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["360° AoE", "5m Range"], upgradeEffects: ["+10 Damage", "+1m Range", "+10 Damage", "Poison 4s", "Cripple -30% Move"] },

  { id: "dagger_vanish", name: "Vanish", description: "Become invisible instantly.", icon: "💨", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 35, effects: ["Stealth 6s", "Break All Targeting", "+40% Move Speed"], upgradeEffects: ["+2s Duration", "Heal 15%", "+10% Move Speed", "Remove Debuffs", "+3s Duration"] },
  { id: "dagger_poison_blade", name: "Envenom", description: "Coat blades in deadly poison.", icon: "☠️", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 30, effects: ["Next 5 Attacks Poison", "8 DPS for 5s"], upgradeEffects: ["+2 DPS", "+2 Attacks", "+2 DPS", "+2s Duration", "Instant Kill Below 10%"] },
  { id: "dagger_evasion", name: "Evasion", description: "Dodge all attacks briefly.", icon: "🏃", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 40, effects: ["100% Dodge", "3s Duration"], upgradeEffects: ["+1s Duration", "Counter Attack on Dodge", "+1s Duration", "+50% Attack Speed After", "+2s Duration"] },

  { id: "dagger_death_mark", name: "Death Mark", description: "Ultimate: Mark target for death.", icon: "💀", slot: 4, maxUpgrades: 3, baseDamage: 200, damagePerUpgrade: 60, cooldown: 45, cooldownReductionPerUpgrade: 5, manaCost: 80, effects: ["Mark 6s", "All Damage +30%", "Execute at End"], upgradeEffects: ["+60 Damage, +10% Amp", "+60 Damage, +2s Duration", "+100 Damage, Spread to Nearby on Kill"] },
  { id: "dagger_shadow_dance", name: "Shadow Dance", description: "Ultimate: Become one with shadows.", icon: "🌑", slot: 4, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["Permanent Stealth 8s", "No CD on Abilities", "+100% Crit"], upgradeEffects: ["+3s Duration, +20% Crit Damage", "+3s Duration, Heal on Kill", "+4s Duration, All Kills Reset Duration"] },
];

export const WEAPON_SKILL_TREES: Record<string, WeaponSkillTree> = {
  SWORD: { weaponType: "SWORD", skills: SWORD_SKILLS },
  AXE: { weaponType: "AXE", skills: AXE_SKILLS },
  BOW: { weaponType: "BOW", skills: BOW_SKILLS },
  STAFF: { weaponType: "STAFF", skills: STAFF_SKILLS },
  DAGGER: { weaponType: "DAGGER", skills: DAGGER_SKILLS },
  MACE: { weaponType: "MACE", skills: AXE_SKILLS },
  HAMMER: { weaponType: "HAMMER", skills: AXE_SKILLS },
  SPEAR: { weaponType: "SPEAR", skills: SWORD_SKILLS },
  WAND: { weaponType: "WAND", skills: STAFF_SKILLS },
  SCYTHE: { weaponType: "SCYTHE", skills: AXE_SKILLS },
};

export function getSkillsForSlot(weaponType: string, slot: 1 | 2 | 3 | 4): WeaponSkill[] {
  const tree = WEAPON_SKILL_TREES[weaponType];
  if (!tree) return [];
  return tree.skills.filter(s => s.slot === slot);
}

export function getMaxUpgradesForSlot(slot: 1 | 2 | 3 | 4): number {
  return slot === 4 ? 3 : 5;
}

export function calculateSkillDamage(skill: WeaponSkill, upgradeLevel: number): number {
  return skill.baseDamage + (skill.damagePerUpgrade * upgradeLevel);
}

export function calculateSkillCooldown(skill: WeaponSkill, upgradeLevel: number): number {
  return Math.max(0.5, skill.cooldown - (skill.cooldownReductionPerUpgrade * upgradeLevel));
}

export function getUpgradeEffect(skill: WeaponSkill, level: number): string {
  if (level < 1 || level > skill.upgradeEffects.length) return "";
  return skill.upgradeEffects[level - 1];
}
