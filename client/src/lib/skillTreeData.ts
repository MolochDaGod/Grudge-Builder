export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: string;
  maxPoints: number;
  requires: string | null;
  isPassive?: boolean;
  scaling?: { stat: string; perLevel: number; unit?: 'percent' | 'flat' };
  statBonus?: { stat: string; value: number; type: 'flat' | 'percent' };
}

export interface SkillTier {
  name: string;
  skills: Skill[];
}

export interface SkillTree {
  className: string;
  color: string;
  tiers: SkillTier[];
}

export interface WeaponSkillTree extends SkillTree {
  prefab?: { model: string; script: string };
  hasSubtrees?: boolean;
  subtrees?: Record<string, { name: string; icon: string; color: string; description: string; tiers: SkillTier[] }>;
}

export function calculateScaledEffect(skill: Skill, characterLevel: number): string {
  if (!skill.scaling) return skill.effect;
  
  const totalValue = skill.scaling.perLevel * characterLevel;
  const roundedTotal = Math.round(totalValue * 10) / 10;
  const isPercent = skill.scaling.unit === 'percent';
  
  const suffix = isPercent ? '%' : '';
  return `${skill.effect} (Lv${characterLevel}: +${roundedTotal}${suffix})`;
}

export function getScaledStatValue(skill: Skill, characterLevel: number): number {
  if (!skill.scaling) return 0;
  const total = skill.scaling.perLevel * characterLevel;
  return skill.scaling.unit === 'percent' ? total / 100 : total;
}

export const CLASS_SKILL_TREES: Record<string, SkillTree> = {
  warrior: {
    className: 'Warrior',
    color: '#ef4444',
    tiers: [
      {
        name: 'Level 0 - Invincibility',
        skills: [
          { id: 'invincibility', name: 'Invincibility', icon: '🛡️', description: 'Temporary Invulnerability with duration scaling by level', effect: '+2% duration/level', maxPoints: 1, requires: null, scaling: { stat: 'duration', perLevel: 2, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 1 - Combat Basics',
        skills: [
          { id: 'taunt', name: 'Taunt', icon: '📢', description: 'Force enemies to target you', effect: '+3% threat/level', maxPoints: 1, requires: null, scaling: { stat: 'threat', perLevel: 3, unit: 'percent' } },
          { id: 'quick_strike', name: 'Quick Strike', icon: '⚔️', description: 'Fast attack with speed bonus', effect: '+1% speed/level', maxPoints: 1, requires: null, scaling: { stat: 'attackSpeed', perLevel: 1, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 5 - Specialization',
        skills: [
          { id: 'damage_surge', name: 'Damage Surge', icon: '💥', description: 'Temporary damage boost', effect: '+2% damage/level', maxPoints: 1, requires: 'quick_strike', scaling: { stat: 'damage', perLevel: 2, unit: 'percent' } },
          { id: 'guardians_aura', name: "Guardian's Aura", icon: '🔰', description: 'Defense buff for nearby allies', effect: '+1.5% party def/level', maxPoints: 1, requires: 'taunt', scaling: { stat: 'partyDefense', perLevel: 1.5, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 10 - Advanced Combat',
        skills: [
          { id: 'dual_wield', name: 'Dual Wield', icon: '⚔️', description: 'Attack speed and multi-hit', effect: '+2% speed/level', maxPoints: 1, requires: 'damage_surge', scaling: { stat: 'attackSpeed', perLevel: 2, unit: 'percent' } },
          { id: 'shield_specialist', name: 'Shield Specialist', icon: '🛡️', description: 'Block chance and defense', effect: '+1% block/level', maxPoints: 1, requires: 'guardians_aura', scaling: { stat: 'block', perLevel: 1, unit: 'percent' } },
          { id: 'life_drain', name: 'Life Drain', icon: '❤️', description: 'Damage that heals you', effect: '+0.5% lifesteal/level', maxPoints: 1, requires: 'quick_strike', scaling: { stat: 'lifesteal', perLevel: 0.5, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 15 - Master Warrior',
        skills: [
          { id: 'execute', name: 'Execute', icon: '💀', description: 'Bonus damage vs low health enemies', effect: '+3% execute dmg/level', maxPoints: 1, requires: 'dual_wield', scaling: { stat: 'executeDamage', perLevel: 3, unit: 'percent' } },
          { id: 'double_strike', name: 'Double Strike', icon: '⚡', description: 'Two consecutive attacks', effect: '+1% proc chance/level', maxPoints: 1, requires: 'life_drain', scaling: { stat: 'doubleStrike', perLevel: 1, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 20 - Legendary',
        skills: [
          { id: 'avatar_form', name: 'Avatar Form', icon: '⭐', description: 'All stats boost + size increase', effect: '+2% all stats/level', maxPoints: 1, requires: 'execute', scaling: { stat: 'allStats', perLevel: 2, unit: 'percent' } },
          { id: 'perfect_counter', name: 'Perfect Counter', icon: '🔄', description: 'Counter-attack chance on block', effect: '+1.5% counter/level', maxPoints: 1, requires: 'shield_specialist', scaling: { stat: 'counter', perLevel: 1.5, unit: 'percent' } }
        ]
      }
    ]
  },
  mage: {
    className: 'Mage Priest',
    color: '#8b5cf6',
    tiers: [
      {
        name: 'Level 0 - Arcane Affinity',
        skills: [
          { id: 'mana_shield', name: 'Mana Shield', icon: '🛡️', description: 'Passive shield based on mana with active boost', effect: '+3% mana shield/level', maxPoints: 1, requires: null, scaling: { stat: 'manaShield', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 1 - Basic Arts',
        skills: [
          { id: 'magic_missile', name: 'Magic Missile', icon: '✨', description: 'Multi-projectile damage spell', effect: '+2% spell dmg/level', maxPoints: 1, requires: null, scaling: { stat: 'spellDamage', perLevel: 2, unit: 'percent' } },
          { id: 'heal', name: 'Heal', icon: '💚', description: 'Direct healing spell', effect: '+2% heal power/level', maxPoints: 1, requires: null, scaling: { stat: 'healPower', perLevel: 2, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 5 - Specialization',
        skills: [
          { id: 'fireball', name: 'Fireball', icon: '🔥', description: 'AoE damage spell', effect: '+2.5% fire dmg/level', maxPoints: 1, requires: 'magic_missile', scaling: { stat: 'fireDamage', perLevel: 2.5, unit: 'percent' } },
          { id: 'greater_heal', name: 'Greater Heal', icon: '💖', description: 'Powerful single-target heal', effect: '+3% heal power/level', maxPoints: 1, requires: 'heal', scaling: { stat: 'healPower', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 10 - Advanced Magic',
        skills: [
          { id: 'lightning_chain', name: 'Lightning Chain', icon: '⚡', description: 'Multi-target damage spell', effect: '+1 target/10 levels', maxPoints: 1, requires: 'fireball', scaling: { stat: 'chainTargets', perLevel: 0.1, unit: 'flat' } },
          { id: 'blink', name: 'Blink', icon: '🌟', description: '10 yard directional teleport', effect: '+0.5 yard range/level', maxPoints: 1, requires: 'magic_missile', scaling: { stat: 'blinkRange', perLevel: 0.5, unit: 'flat' } },
          { id: 'group_heal', name: 'Group Heal', icon: '💗', description: 'AoE healing spell', effect: '+2% AoE heal/level', maxPoints: 1, requires: 'greater_heal', scaling: { stat: 'aoeHeal', perLevel: 2, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 15 - Master Tier',
        skills: [
          { id: 'meteor', name: 'Meteor', icon: '☄️', description: 'Delayed massive AoE damage', effect: '+3% meteor dmg/level', maxPoints: 1, requires: 'lightning_chain', scaling: { stat: 'meteorDamage', perLevel: 3, unit: 'percent' } },
          { id: 'portal', name: 'Portal', icon: '🌀', description: 'Set/connect portals for team teleportation', effect: '+1 portal use/10 levels', maxPoints: 1, requires: 'blink', scaling: { stat: 'portalUses', perLevel: 0.1, unit: 'flat' } }
        ]
      },
      {
        name: 'Level 20 - Legendary Magic',
        skills: [
          { id: 'archmage', name: 'Archmage', icon: '🔮', description: 'Massive spell power, reduced cooldowns', effect: '+2% all spell/level', maxPoints: 1, requires: 'meteor', scaling: { stat: 'allSpell', perLevel: 2, unit: 'percent' } },
          { id: 'reality_tear', name: 'Reality Tear', icon: '🌌', description: 'Line of devastating damage', effect: '+4% rift dmg/level', maxPoints: 1, requires: 'portal', scaling: { stat: 'riftDamage', perLevel: 4, unit: 'percent' } }
        ]
      }
    ]
  },
  worg: {
    className: 'Worg Shapeshifter',
    color: '#d97706',
    tiers: [
      {
        name: 'Level 0 - Primal Shift',
        skills: [
          { id: 'bear_form', name: 'Bear Form', icon: '🐻', description: 'Transform into WorgBear for tanking', effect: '+3% HP & Def/level', maxPoints: 1, requires: null, scaling: { stat: 'bearStats', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 1 - Pack Instincts',
        skills: [
          { id: 'howl', name: 'Howl', icon: '🐺', description: 'AoE fear/debuff enemies', effect: '+2% fear duration/level', maxPoints: 1, requires: null, scaling: { stat: 'fearDuration', perLevel: 2, unit: 'percent' } },
          { id: 'pack_hunt', name: 'Pack Hunt', icon: '🐾', description: 'Damage bonus near allies', effect: '+1.5% ally dmg/level', maxPoints: 1, requires: null, scaling: { stat: 'allyDamage', perLevel: 1.5, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 5 - Primal Mastery',
        skills: [
          { id: 'feral_rage', name: 'Feral Rage', icon: '😤', description: 'Attack speed/damage boost', effect: '+2% atk speed/level', maxPoints: 1, requires: 'pack_hunt', scaling: { stat: 'attackSpeed', perLevel: 2, unit: 'percent' } },
          { id: 'alpha_call', name: 'Alpha Call', icon: '🐕', description: 'Summon temporary wolf allies', effect: '+1 wolf/15 levels', maxPoints: 1, requires: 'howl', scaling: { stat: 'wolfCount', perLevel: 0.067, unit: 'flat' } }
        ]
      },
      {
        name: 'Level 10 - Advanced Abilities',
        skills: [
          { id: 'alpha_bear', name: 'Alpha Bear', icon: '🐻', description: 'AoE taunt spell + tanking buffs', effect: '+2% tank power/level', maxPoints: 1, requires: 'bear_form', scaling: { stat: 'tankPower', perLevel: 2, unit: 'percent' } },
          { id: 'raptor_form', name: 'Raptor Form', icon: '🦖', description: 'Form for stealth DPS and crit', effect: '+2% crit dmg/level', maxPoints: 1, requires: 'feral_rage', scaling: { stat: 'critDamage', perLevel: 2, unit: 'percent' } },
          { id: 'blood_frenzy', name: 'Blood Frenzy', icon: '🩸', description: 'Damage increases as HP decreases', effect: '+3% low HP dmg/level', maxPoints: 1, requires: 'pack_hunt', scaling: { stat: 'lowHpDamage', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 15 - Apex Predator',
        skills: [
          { id: 'apex_predator', name: 'Apex Predator', icon: '🎯', description: 'Enhanced tracking and vs wounded dmg', effect: '+2% wounded dmg/level', maxPoints: 1, requires: 'raptor_form', scaling: { stat: 'woundedDamage', perLevel: 2, unit: 'percent' } },
          { id: 'primal_fury', name: 'Primal Fury', icon: '💢', description: 'Temporary massive stat boost', effect: '+3% fury stats/level', maxPoints: 1, requires: 'blood_frenzy', scaling: { stat: 'furyStats', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 20 - Legendary Forms',
        skills: [
          { id: 'worg_lord', name: 'Worg Lord', icon: '👑', description: 'Ultimate tank form with pack summoning', effect: '+2% all tank/level', maxPoints: 1, requires: 'alpha_bear', scaling: { stat: 'allTank', perLevel: 2, unit: 'percent' } },
          { id: 'primal_avatar', name: 'Primal Avatar', icon: '🦁', description: 'Massive size/stat increase, fear aura', effect: '+3% all form/level', maxPoints: 1, requires: 'primal_fury', scaling: { stat: 'allForm', perLevel: 3, unit: 'percent' } }
        ]
      }
    ]
  },
  ranger: {
    className: 'Ranger Scout',
    color: '#22c55e',
    tiers: [
      {
        name: "Level 0 - Hunter's Instinct",
        skills: [
          { id: 'precision', name: 'Precision', icon: '🎯', description: 'Passive accuracy/crit bonus', effect: '+1% acc & crit/level', maxPoints: 1, requires: null, scaling: { stat: 'accuracy', perLevel: 1, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 1 - Basic Training',
        skills: [
          { id: 'power_shot', name: 'Power Shot', icon: '🏹', description: 'High damage ranged attack', effect: '+2% ranged dmg/level', maxPoints: 1, requires: null, scaling: { stat: 'rangedDamage', perLevel: 2, unit: 'percent' } },
          { id: 'stealth_strike', name: 'Stealth Strike', icon: '🗡️', description: 'Melee attack from stealth', effect: '+3% stealth dmg/level', maxPoints: 1, requires: null, scaling: { stat: 'stealthDamage', perLevel: 3, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 5 - Specialization Path',
        skills: [
          { id: 'multi_shot', name: 'Multi Shot', icon: '🌀', description: 'Fire multiple arrows/bullets', effect: '+1 target/10 levels', maxPoints: 1, requires: 'power_shot', scaling: { stat: 'multiTargets', perLevel: 0.1, unit: 'flat' } },
          { id: 'shadow_step', name: 'Shadow Step', icon: '🌑', description: 'Short-range teleport behind enemy', effect: '+0.5 yard/level', maxPoints: 1, requires: 'stealth_strike', scaling: { stat: 'stepRange', perLevel: 0.5, unit: 'flat' } }
        ]
      },
      {
        name: 'Level 10 - Advanced Techniques',
        skills: [
          { id: 'explosive_shot', name: 'Explosive Shot', icon: '💥', description: 'AoE ranged damage', effect: '+2% explosion dmg/level', maxPoints: 1, requires: 'multi_shot', scaling: { stat: 'explosionDamage', perLevel: 2, unit: 'percent' } },
          { id: 'poison_blade', name: 'Poison Blade', icon: '☠️', description: 'DoT melee attacks', effect: '+2% poison dmg/level', maxPoints: 1, requires: 'shadow_step', scaling: { stat: 'poisonDamage', perLevel: 2, unit: 'percent' } },
          { id: 'trap_mastery', name: 'Trap Mastery', icon: '🪤', description: 'Deploy various trap types', effect: '+1 trap/10 levels', maxPoints: 1, requires: 'power_shot', scaling: { stat: 'trapCount', perLevel: 0.1, unit: 'flat' } }
        ]
      },
      {
        name: 'Level 15 - Master Hunter',
        skills: [
          { id: 'rain_of_arrows', name: 'Rain of Arrows', icon: '🌧️', description: 'Massive AoE ranged barrage', effect: '+3% AoE dmg/level', maxPoints: 1, requires: 'explosive_shot', scaling: { stat: 'aoeDamage', perLevel: 3, unit: 'percent' } },
          { id: 'assassinate', name: 'Assassinate', icon: '💀', description: 'High damage stealth execution', effect: '+4% execute dmg/level', maxPoints: 1, requires: 'poison_blade', scaling: { stat: 'executeDamage', perLevel: 4, unit: 'percent' } }
        ]
      },
      {
        name: 'Level 20 - Legendary Skills',
        skills: [
          { id: 'storm_of_arrows', name: 'Storm of Arrows', icon: '⛈️', description: 'Ultimate ranged devastation', effect: '+3% ultimate dmg/level', maxPoints: 1, requires: 'rain_of_arrows', scaling: { stat: 'ultimateDamage', perLevel: 3, unit: 'percent' } },
          { id: 'shadow_master', name: 'Shadow Master', icon: '👤', description: 'Enhanced stealth with multiple strikes', effect: '+2% stealth all/level', maxPoints: 1, requires: 'assassinate', scaling: { stat: 'stealthAll', perLevel: 2, unit: 'percent' } }
        ]
      }
    ]
  }
};

export const WEAPON_SKILL_TREES: Record<string, WeaponSkillTree> = {
  sword: {
    className: 'Sword Mastery',
    color: '#ef4444',
    prefab: { model: '/models/weapons/sword.glb', script: 'sword.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'sword_damage', name: 'Blade Mastery', icon: '⚔️', description: 'Increases sword damage', effect: '+5% Sword Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'swordDamage', value: 5, type: 'percent' } },
          { id: 'sword_speed', name: 'Swift Strikes', icon: '💨', description: 'Increases attack speed with swords', effect: '+3% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 3, type: 'percent' } },
          { id: 'sword_crit', name: 'Precision Cuts', icon: '🎯', description: 'Increases critical hit chance', effect: '+2% Crit Chance', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'critChance', value: 2, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'sword_parry', name: 'Parry Mastery', icon: '🛡️', description: 'Increases block chance', effect: '+4% Block Chance', maxPoints: 1, requires: 'sword_damage', isPassive: true, statBonus: { stat: 'blockChance', value: 4, type: 'percent' } },
          { id: 'sword_combo', name: 'Combo Extension', icon: '🔄', description: 'Increases combo damage', effect: '+6% Combo Damage', maxPoints: 1, requires: 'sword_speed', isPassive: true, statBonus: { stat: 'comboDamage', value: 6, type: 'percent' } },
          { id: 'sword_bleed', name: 'Bleeding Wounds', icon: '🩸', description: 'Chance to cause bleeding', effect: '+3% Bleed Chance', maxPoints: 1, requires: 'sword_crit', isPassive: true, statBonus: { stat: 'bleedChance', value: 3, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'sword_counter', name: 'Counter Specialist', icon: '⚡', description: 'Increases counter damage', effect: '+10% Counter Damage', maxPoints: 1, requires: 'sword_parry', isPassive: true, statBonus: { stat: 'counterDamage', value: 10, type: 'percent' } },
          { id: 'sword_cleave', name: 'Cleaving Blows', icon: '💥', description: 'Attacks hit additional targets', effect: '+1 Cleave Target', maxPoints: 1, requires: 'sword_combo', isPassive: true, statBonus: { stat: 'cleaveTargets', value: 1, type: 'flat' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'sword_ultimate', name: 'Master Swordsman', icon: '⭐', description: 'All sword stats increased', effect: '+8% All Sword Stats', maxPoints: 1, requires: 'sword_counter', isPassive: true, statBonus: { stat: 'allSword', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  bow: {
    className: 'Bow Mastery',
    color: '#f59e0b',
    prefab: { model: '/models/weapons/bow.glb', script: 'bow.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'bow_damage', name: 'Keen Eye', icon: '🎯', description: 'Increases bow accuracy', effect: '+5% Accuracy', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'accuracy', value: 5, type: 'percent' } },
          { id: 'bow_draw', name: 'Strong Draw', icon: '🏹', description: 'Increases charge speed', effect: '+4% Charge Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'chargeSpeed', value: 4, type: 'percent' } },
          { id: 'bow_range', name: 'Long Shot', icon: '📏', description: 'Increases arrow range', effect: '+10% Range', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'range', value: 10, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'bow_crit', name: 'Deadly Aim', icon: '💀', description: 'Increases critical damage', effect: '+8% Crit Damage', maxPoints: 1, requires: 'bow_damage', isPassive: true, statBonus: { stat: 'critDamage', value: 8, type: 'percent' } },
          { id: 'bow_power', name: 'Power Shot', icon: '💪', description: 'Increases charged shot damage', effect: '+10% Charged Damage', maxPoints: 1, requires: 'bow_draw', isPassive: true, statBonus: { stat: 'chargedDamage', value: 10, type: 'percent' } },
          { id: 'bow_pierce', name: 'Piercing Arrows', icon: '➡️', description: 'Arrows can pierce', effect: '+1 Pierce Target', maxPoints: 1, requires: 'bow_range', isPassive: true, statBonus: { stat: 'pierceTargets', value: 1, type: 'flat' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'bow_multi', name: 'Multi-Shot', icon: '🌀', description: 'Fire additional arrows', effect: '+1 Arrow', maxPoints: 1, requires: 'bow_crit', isPassive: true, statBonus: { stat: 'arrowCount', value: 1, type: 'flat' } },
          { id: 'bow_speed', name: 'Rapid Fire', icon: '⚡', description: 'Increases attack speed', effect: '+6% Attack Speed', maxPoints: 1, requires: 'bow_power', isPassive: true, statBonus: { stat: 'attackSpeed', value: 6, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'bow_ultimate', name: 'Master Archer', icon: '⭐', description: 'All bow stats increased', effect: '+8% All Bow Stats', maxPoints: 1, requires: 'bow_multi', isPassive: true, statBonus: { stat: 'allBow', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  staff: {
    className: 'Staff Mastery',
    color: '#8b5cf6',
    prefab: { model: '/models/weapons/staff.glb', script: 'staff.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'staff_power', name: 'Arcane Power', icon: '✨', description: 'Increases spell damage', effect: '+5% Spell Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellDamage', value: 5, type: 'percent' } },
          { id: 'staff_mana', name: 'Mana Flow', icon: '💧', description: 'Increases mana regeneration', effect: '+8% Mana Regen', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'manaRegen', value: 8, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'staff_crit', name: 'Spell Critical', icon: '⚡', description: 'Increases spell crit chance', effect: '+3% Spell Crit', maxPoints: 1, requires: 'staff_power', isPassive: true, statBonus: { stat: 'spellCrit', value: 3, type: 'percent' } },
          { id: 'staff_shield', name: 'Magic Ward', icon: '🛡️', description: 'Increases magic defense', effect: '+6% Magic Defense', maxPoints: 1, requires: 'staff_mana', isPassive: true, statBonus: { stat: 'magicDefense', value: 6, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'staff_chain', name: 'Chain Magic', icon: '🔗', description: 'Spells can chain', effect: '+1 Chain Target', maxPoints: 1, requires: 'staff_crit', isPassive: true, statBonus: { stat: 'chainTargets', value: 1, type: 'flat' } },
          { id: 'staff_cost', name: 'Efficiency', icon: '💎', description: 'Reduces mana costs', effect: '-5% Mana Cost', maxPoints: 1, requires: 'staff_shield', isPassive: true, statBonus: { stat: 'manaCost', value: -5, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'staff_ultimate', name: 'Archmage', icon: '⭐', description: 'All staff stats increased', effect: '+8% All Staff Stats', maxPoints: 1, requires: 'staff_chain', isPassive: true, statBonus: { stat: 'allStaff', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  dagger: {
    className: 'Dagger Mastery',
    color: '#6b7280',
    prefab: { model: '/models/weapons/dagger.glb', script: 'dagger.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'dagger_speed', name: 'Quick Hands', icon: '🗡️', description: 'Increases attack speed', effect: '+6% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 6, type: 'percent' } },
          { id: 'dagger_stealth', name: 'Stealth', icon: '👁️', description: 'Increases stealth', effect: '+10% Stealth', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'stealth', value: 10, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'dagger_crit', name: 'Vital Strikes', icon: '🎯', description: 'Increases crit chance', effect: '+4% Crit Chance', maxPoints: 1, requires: 'dagger_speed', isPassive: true, statBonus: { stat: 'critChance', value: 4, type: 'percent' } },
          { id: 'dagger_poison', name: 'Poison Coat', icon: '☠️', description: 'Chance to poison', effect: '+5% Poison Chance', maxPoints: 1, requires: 'dagger_stealth', isPassive: true, statBonus: { stat: 'poisonChance', value: 5, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'dagger_backstab', name: 'Backstab Mastery', icon: '🔪', description: 'Increases back damage', effect: '+15% Back Damage', maxPoints: 1, requires: 'dagger_crit', isPassive: true, statBonus: { stat: 'backDamage', value: 15, type: 'percent' } },
          { id: 'dagger_bleed', name: 'Deadly Wounds', icon: '🩸', description: 'Increases bleed damage', effect: '+10% Bleed Damage', maxPoints: 1, requires: 'dagger_poison', isPassive: true, statBonus: { stat: 'bleedDamage', value: 10, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'dagger_ultimate', name: 'Master Assassin', icon: '⭐', description: 'All dagger stats increased', effect: '+8% All Dagger Stats', maxPoints: 1, requires: 'dagger_backstab', isPassive: true, statBonus: { stat: 'allDagger', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  axe: {
    className: 'Axe Mastery',
    color: '#dc2626',
    prefab: { model: '/models/weapons/axe.glb', script: 'axe.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'axe_damage', name: 'Brutal Force', icon: '🪓', description: 'Increases axe damage', effect: '+6% Axe Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'axeDamage', value: 6, type: 'percent' } },
          { id: 'axe_cleave', name: 'Cleave', icon: '💥', description: 'Hit additional targets', effect: '+1 Cleave Target', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'cleaveTargets', value: 1, type: 'flat' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'axe_bleed', name: 'Rending Cuts', icon: '🩸', description: 'Chance to cause bleed', effect: '+5% Bleed Chance', maxPoints: 1, requires: 'axe_damage', isPassive: true, statBonus: { stat: 'bleedChance', value: 5, type: 'percent' } },
          { id: 'axe_execute', name: 'Executioner', icon: '💀', description: 'Bonus damage to low HP', effect: '+12% Execute Damage', maxPoints: 1, requires: 'axe_cleave', isPassive: true, statBonus: { stat: 'executeDamage', value: 12, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'axe_frenzy', name: 'Frenzy', icon: '😤', description: 'Speed on kill', effect: '+3% Speed/Kill', maxPoints: 1, requires: 'axe_bleed', isPassive: true, statBonus: { stat: 'killSpeed', value: 3, type: 'percent' } },
          { id: 'axe_armor', name: 'Armor Break', icon: '🛡️', description: 'Reduce enemy armor', effect: '+8% Armor Pen', maxPoints: 1, requires: 'axe_execute', isPassive: true, statBonus: { stat: 'armorPen', value: 8, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'axe_ultimate', name: 'Berserker', icon: '⭐', description: 'All axe stats increased', effect: '+8% All Axe Stats', maxPoints: 1, requires: 'axe_frenzy', isPassive: true, statBonus: { stat: 'allAxe', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  hammer: {
    className: 'Hammer Mastery',
    color: '#78716c',
    prefab: { model: '/models/weapons/hammer.glb', script: 'hammer.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'hammer_damage', name: 'Heavy Blows', icon: '🔨', description: 'Increases hammer damage', effect: '+6% Hammer Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'hammerDamage', value: 6, type: 'percent' } },
          { id: 'hammer_stun', name: 'Concussive', icon: '💫', description: 'Chance to stun', effect: '+4% Stun Chance', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'stunChance', value: 4, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'hammer_aoe', name: 'Ground Slam', icon: '💥', description: 'Increases AoE damage', effect: '+8% AoE Damage', maxPoints: 1, requires: 'hammer_damage', isPassive: true, statBonus: { stat: 'aoeDamage', value: 8, type: 'percent' } },
          { id: 'hammer_armor', name: 'Armor Crush', icon: '🛡️', description: 'Reduces enemy defense', effect: '+6% Armor Pen', maxPoints: 1, requires: 'hammer_stun', isPassive: true, statBonus: { stat: 'armorPen', value: 6, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'hammer_knockback', name: 'Knockback', icon: '🌊', description: 'Chance to knockback', effect: '+5% Knockback', maxPoints: 1, requires: 'hammer_aoe', isPassive: true, statBonus: { stat: 'knockbackChance', value: 5, type: 'percent' } },
          { id: 'hammer_vs_stun', name: 'Shatter', icon: '💎', description: 'Bonus vs stunned', effect: '+15% vs Stunned', maxPoints: 1, requires: 'hammer_armor', isPassive: true, statBonus: { stat: 'stunnedDamage', value: 15, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'hammer_ultimate', name: 'Titan', icon: '⭐', description: 'All hammer stats increased', effect: '+8% All Hammer Stats', maxPoints: 1, requires: 'hammer_knockback', isPassive: true, statBonus: { stat: 'allHammer', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  lance: {
    className: 'Lance Mastery',
    color: '#3b82f6',
    prefab: { model: '/models/weapons/lance.glb', script: 'lance.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'lance_reach', name: 'Extended Reach', icon: '🔱', description: 'Increases lance range', effect: '+10% Weapon Range', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'weaponRange', value: 10, type: 'percent' } },
          { id: 'lance_first', name: 'First Strike', icon: '⚡', description: 'Bonus on opener', effect: '+8% Opener Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'openerDamage', value: 8, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'lance_pierce', name: 'Piercing', icon: '➡️', description: 'Pierce through enemies', effect: '+1 Pierce Target', maxPoints: 1, requires: 'lance_reach', isPassive: true, statBonus: { stat: 'pierceTargets', value: 1, type: 'flat' } },
          { id: 'lance_block', name: 'Phalanx', icon: '🛡️', description: 'Increases block', effect: '+6% Block Chance', maxPoints: 1, requires: 'lance_first', isPassive: true, statBonus: { stat: 'blockChance', value: 6, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'lance_charge', name: 'Charge Bonus', icon: '🐎', description: 'Dash damage bonus', effect: '+12% Charge Damage', maxPoints: 1, requires: 'lance_pierce', isPassive: true, statBonus: { stat: 'chargeDamage', value: 12, type: 'percent' } },
          { id: 'lance_impale', name: 'Impale', icon: '💀', description: 'Chance to root', effect: '+4% Root Chance', maxPoints: 1, requires: 'lance_block', isPassive: true, statBonus: { stat: 'rootChance', value: 4, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'lance_ultimate', name: 'Cavalier', icon: '⭐', description: 'All lance stats increased', effect: '+8% All Lance Stats', maxPoints: 1, requires: 'lance_charge', isPassive: true, statBonus: { stat: 'allLance', value: 8, type: 'percent' } }
        ]
      }
    ]
  },
  mace: {
    className: 'Mace Mastery',
    color: '#a855f7',
    prefab: { model: '/models/weapons/mace.glb', script: 'mace.lua' },
    tiers: [
      {
        name: 'Tier 1 - Fundamentals',
        skills: [
          { id: 'mace_damage', name: 'Crushing Force', icon: '⚫', description: 'Increases mace damage', effect: '+6% Mace Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'maceDamage', value: 6, type: 'percent' } },
          { id: 'mace_daze', name: 'Daze', icon: '💫', description: 'Chance to daze', effect: '+5% Daze Chance', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'dazeChance', value: 5, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 2 - Combat',
        skills: [
          { id: 'mace_stun', name: 'Skull Crack', icon: '💥', description: 'Increases stun chance', effect: '+6% Stun Chance', maxPoints: 1, requires: 'mace_damage', isPassive: true, statBonus: { stat: 'stunChance', value: 6, type: 'percent' } },
          { id: 'mace_armor', name: 'Armor Crush', icon: '🛡️', description: 'Reduces enemy defense', effect: '+8% Armor Pen', maxPoints: 1, requires: 'mace_daze', isPassive: true, statBonus: { stat: 'armorPen', value: 8, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 3 - Mastery',
        skills: [
          { id: 'mace_holy', name: 'Holy Strike', icon: '✨', description: 'Holy damage bonus', effect: '+10% Holy Damage', maxPoints: 1, requires: 'mace_stun', isPassive: true, statBonus: { stat: 'holyDamage', value: 10, type: 'percent' } },
          { id: 'mace_slow', name: 'Bone Breaker', icon: '🦴', description: 'Chance to slow enemy', effect: '+5% Slow Chance', maxPoints: 1, requires: 'mace_armor', isPassive: true, statBonus: { stat: 'slowChance', value: 5, type: 'percent' } }
        ]
      },
      {
        name: 'Tier 4 - Ultimate',
        skills: [
          { id: 'mace_ultimate', name: 'Crusader', icon: '⭐', description: 'All mace stats increased', effect: '+8% All Mace Stats', maxPoints: 1, requires: 'mace_holy', isPassive: true, statBonus: { stat: 'allMace', value: 8, type: 'percent' } }
        ]
      }
    ]
  }
};

export const CLASS_TO_ID: Record<string, string> = {
  'Warrior': 'warrior',
  'warrior': 'warrior',
  'Mage Priest': 'mage',
  'mage': 'mage',
  'Worg Shapeshifter': 'worg',
  'worg': 'worg',
  'Ranger Scout': 'ranger',
  'ranger': 'ranger'
};
