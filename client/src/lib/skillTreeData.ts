import { getWeaponSkillDisplay } from "@shared/definitions/weaponSkillDisplay.generated";
import { findWeaponSkillById } from "@shared/definitions/weaponSkillsNew";

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
        name: 'Level 0 - Starting Ability',
        skills: [
          { id: 'warrior_0_strike', name: 'Power Strike', icon: '⚔️', description: 'Heavy melee attack that deals bonus damage and can knock back.', effect: '+50% weapon damage, knockback', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 1 - Combat Basics (Options)',
        skills: [
          { id: 'warrior_1_taunt', name: 'Taunt', icon: '📢', description: 'Force nearby enemies to attack you. AoE threat, +damage reduction.', effect: 'AoE threat 3s, +20% DR', maxPoints: 1, requires: null },
          { id: 'warrior_1_quickstrike', name: 'Quick Strike', icon: '⚔️', description: 'Fast attack combo granting attack speed bonus.', effect: '3 rapid strikes, +15% AS 4s', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 5 - Specialization (Options)',
        skills: [
          { id: 'warrior_5_damage_surge', name: 'Damage Surge', icon: '💥', description: 'Empower attacks with fury. +40% damage 6s, +crit, bleed.', effect: '+40% dmg, +25% crit, bleed', maxPoints: 1, requires: 'warrior_1_quickstrike' },
          { id: 'warrior_5_guardian_aura', name: "Guardian's Aura", icon: '🔰', description: 'Defense buff for nearby allies, share some damage taken.', effect: '+30% party def 8s', maxPoints: 1, requires: 'warrior_1_taunt' }
        ]
      },
      {
        name: 'Level 10 - Advanced Combat (Options)',
        skills: [
          { id: 'warrior_10_whirlwind', name: 'Whirlwind', icon: '🌀', description: '360 AoE channel damage.', effect: '360 AoE, +dmg per enemy', maxPoints: 1, requires: 'warrior_5_damage_surge' },
          { id: 'warrior_10_shield_wall', name: 'Shield Wall', icon: '🛡️', description: 'Block front damage, reflect some.', effect: 'Block 90% front, reflect 25%', maxPoints: 1, requires: 'warrior_5_guardian_aura' },
          { id: 'warrior_10_execute', name: 'Execute', icon: '💀', description: 'Massive damage to low HP enemies, instant kill low.', effect: '3x dmg <30% HP, execute <10%', maxPoints: 1, requires: 'warrior_5_damage_surge' }
        ]
      },
      {
        name: 'Level 15 - Elite Skills (Options)',
        skills: [
          { id: 'warrior_15_berserker', name: 'Berserker', icon: '😤', description: 'Frenzy: +dmg +AS, take more dmg but cannot be stunned.', effect: '+60% dmg +30% AS 8s', maxPoints: 1, requires: 'warrior_10_whirlwind' },
          { id: 'warrior_15_paladin', name: 'Paladin', icon: '✨', description: 'Heal self/allies, holy damage boost, purge debuffs.', effect: 'Heal 30% HP +50% holy 10s', maxPoints: 1, requires: 'warrior_10_shield_wall' }
        ]
      },
      {
        name: 'Level 20 - Legendary (Options)',
        skills: [
          { id: 'warrior_20_avatar', name: 'Avatar Form', icon: '⭐', description: 'Allies +dmg/def, slow enemies, 15s.', effect: '+50% ally dmg/def, slow enemies', maxPoints: 1, requires: 'warrior_15_berserker' },
          { id: 'warrior_20_champion', name: 'Champion', icon: '👑', description: 'Ultimate tank/support hybrid.', effect: 'Massive stats, party buffs', maxPoints: 1, requires: 'warrior_15_paladin' }
        ]
      }
    ]
  },
  mage: {
    className: 'Mage Priest',
    color: '#8b5cf6',
    tiers: [
      {
        name: 'Level 0 - Starting Ability',
        skills: [
          { id: 'mage_0_missile', name: 'Magic Missile', icon: '✨', description: 'Fire multiple seeking missiles of arcane energy. Cannot miss.', effect: '5 missiles, 15 arcane dmg each', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 1 - Basic Arts (Options)',
        skills: [
          { id: 'mage_1_fireball', name: 'Fireball', icon: '🔥', description: 'Hurl a ball of fire that explodes on impact. Burns.', effect: 'AoE fire, burn 3s', maxPoints: 1, requires: null },
          { id: 'mage_1_heal', name: 'Healing Light', icon: '💚', description: 'Channel divine energy to restore health and remove debuff.', effect: 'Heal 25% HP, remove 1 debuff', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 5 - Specialization (Options)',
        skills: [
          { id: 'mage_5_meteor', name: 'Meteor Strike', icon: '☄️', description: 'Call down devastating meteor. Massive AoE, stun.', effect: 'Massive AoE, stun 2s, 2s delay', maxPoints: 1, requires: 'mage_1_fireball' },
          { id: 'mage_5_greater_heal', name: 'Greater Heal', icon: '💖', description: 'Powerful single-target healing with absorption shield.', effect: 'Heal 60% HP + shield', maxPoints: 1, requires: 'mage_1_heal' }
        ]
      },
      {
        name: 'Level 10 - Advanced Arts (Options)',
        skills: [
          { id: 'mage_10_chain', name: 'Lightning Chain', icon: '⚡', description: 'Chain lightning to multiple targets. Stun chance.', effect: 'Chain to 4, stun', maxPoints: 1, requires: 'mage_5_meteor' },
          { id: 'mage_10_portal', name: 'Portal', icon: '🌀', description: 'Set a portal for teleportation and team use.', effect: 'Teleport, team mobility', maxPoints: 1, requires: 'mage_5_meteor' },
          { id: 'mage_10_group_heal', name: 'Group Heal', icon: '💗', description: 'Heal multiple allies in area.', effect: 'AoE heal + cleanse', maxPoints: 1, requires: 'mage_5_greater_heal' }
        ]
      },
      {
        name: 'Level 15 - Master Tier (Options)',
        skills: [
          { id: 'mage_15_mana_shield', name: 'Mana Shield', icon: '🛡️', description: 'Passive shield from mana. Activate for +spell power.', effect: 'Shield = 50% mana, +75% spell dmg 15s', maxPoints: 1, requires: 'mage_10_chain' },
          { id: 'mage_15_reality_tear', name: 'Reality Tear', icon: '🌌', description: 'Line damage that rips space.', effect: 'Line devastate dmg', maxPoints: 1, requires: 'mage_10_portal' }
        ]
      },
      {
        name: 'Level 20 - Legendary (Options)',
        skills: [
          { id: 'mage_20_archmage', name: 'Archmage', icon: '🔮', description: 'Ultimate spell power and cooldown reduction.', effect: '+100% spell power, -50% CD', maxPoints: 1, requires: 'mage_15_mana_shield' },
          { id: 'mage_20_divine_intervention', name: 'Divine Intervention', icon: '✨', description: 'Mass heal + resurrect allies.', effect: 'Mass heal + res', maxPoints: 1, requires: 'mage_10_group_heal' }
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
        name: 'Level 0 - Starting Ability',
        skills: [
          { id: 'ranger_0_powershot', name: 'Power Shot', icon: '🏹', description: 'Charged arrow that deals massive damage. Pierces.', effect: '+100% weapon dmg, pierce', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 1 - Basic Training (Options)',
        skills: [
          { id: 'ranger_1_multishot', name: 'Multi-Shot', icon: '🌀', description: 'Volley of arrows at multiple targets in cone.', effect: '5 arrows 60% dmg each', maxPoints: 1, requires: null },
          { id: 'ranger_1_stealth_strike', name: 'Stealth Strike', icon: '🗡️', description: 'Attack from shadows with lethal precision.', effect: '+200% dmg from stealth, crit', maxPoints: 1, requires: null }
        ]
      },
      {
        name: 'Level 5 - Specialization (Options)',
        skills: [
          { id: 'ranger_5_explosive_arrow', name: 'Explosive Arrow', icon: '💥', description: 'Arrow explodes on impact. Knockback and burn.', effect: 'AoE 4m, knockback, burn 4s', maxPoints: 1, requires: 'ranger_1_multishot' },
          { id: 'ranger_5_shadow_step', name: 'Shadow Step', icon: '🌑', description: 'Teleport behind target, enter stealth.', effect: '15m teleport + stealth 2s', maxPoints: 1, requires: 'ranger_1_stealth_strike' }
        ]
      },
      {
        name: 'Level 10 - Advanced Techniques (Options)',
        skills: [
          { id: 'ranger_10_arrow_volley', name: 'Arrow Volley', icon: '🌧️', description: 'Rain arrows on area. Slows.', effect: '8m AoE 5s, slow 40%', maxPoints: 1, requires: 'ranger_5_explosive_arrow' },
          { id: 'ranger_10_vanish', name: 'Vanish', icon: '🌿', description: 'Disappear completely, break targeting.', effect: '6s stealth +40% MS', maxPoints: 1, requires: 'ranger_5_shadow_step' },
          { id: 'ranger_10_trap', name: "Hunter's Trap", icon: '🪤', description: 'Place trap that roots and poisons.', effect: 'Root 4s + poison', maxPoints: 1, requires: 'ranger_5_explosive_arrow' }
        ]
      },
      {
        name: 'Level 15 - Elite Skills (Options)',
        skills: [
          { id: 'ranger_15_sniper', name: 'Sniper Shot', icon: '🎯', description: 'Long range shot ignore armor, high dmg.', effect: '50m, ignore 50% armor, +300% dmg', maxPoints: 1, requires: 'ranger_10_arrow_volley' },
          { id: 'ranger_15_death_mark', name: 'Death Mark', icon: '💀', description: 'Mark target to take +damage, execute low HP.', effect: '+40% dmg to target 6s, execute', maxPoints: 1, requires: 'ranger_10_vanish' }
        ]
      },
      {
        name: 'Level 20 - Ultimate Mastery (Options)',
        skills: [
          { id: 'ranger_20_rain_of_arrows', name: 'Rain of Arrows', icon: '🌧️', description: 'Endless barrage. Roots and burns.', effect: '12m AoE 8s, root/burn', maxPoints: 1, requires: 'ranger_15_sniper' },
          { id: 'ranger_20_shadow_dance', name: 'Shadow Dance', icon: '👤', description: 'Permanent stealth 10s, no cooldowns, +crit.', effect: 'Stealth 10s, no CD, +100% crit dmg', maxPoints: 1, requires: 'ranger_15_death_mark' }
        ]
      }
    ]
  }
};

// Special Item Skill Trees for classes (tomes, shields, wands, grimoires, nimble fingers, dual wield)
// These are class-specific special item / offhand / style skill trees in the spellbook area.
export const SPECIAL_ITEM_SKILL_TREES: Record<string, Record<string, WeaponSkillTree>> = {
  warrior: {
    shield: {
      className: 'Shield Mastery (Special Item)',
      color: '#64748b',
      tiers: [
        { name: 'Tier 1 - Defense Basics', skills: [
          { id: 'shield_block', name: 'Solid Block', icon: '🛡️', description: 'Increases block chance with shield items', effect: '+7% Block', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'block', value: 7, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Counter Play', skills: [
          { id: 'shield_counter', name: 'Counter Bash', icon: '⚡', description: 'Counter attacks with shield', effect: '+12% Counter Dmg', maxPoints: 1, requires: 'shield_block' }
        ]},
        { name: 'Tier 3 - Advanced Defense', skills: [
          { id: 'shield_reflect', name: 'Reflect', icon: '🔄', description: 'Reflect damage when blocking', effect: '+15% Reflect', maxPoints: 1, requires: 'shield_counter' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'shield_bulwark', name: 'Bulwark', icon: '⭐', description: 'All shield stats increased', effect: '+8% All Shield Stats', maxPoints: 1, requires: 'shield_reflect', isPassive: true, statBonus: { stat: 'allShield', value: 8, type: 'percent' } }
        ]}
      ]
    },
    dual_wield: {
      className: 'Dual Wield (Special Item)',
      color: '#f97316',
      tiers: [
        { name: 'Tier 1 - Offhand Basics', skills: [
          { id: 'dual_offhand', name: 'Offhand Strike', icon: '⚔️', description: 'Extra attacks with offhand weapon', effect: '+5% Offhand Dmg', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'offhandDamage', value: 5, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Flurry', skills: [
          { id: 'dual_flurry', name: 'Flurry', icon: '🌪️', description: 'Rapid multi hits', effect: 'Extra hits chance', maxPoints: 1, requires: 'dual_offhand' }
        ]},
        { name: 'Tier 3 - Mastery', skills: [
          { id: 'dual_cleave', name: 'Cross Cleave', icon: '💥', description: 'Hit with both weapons', effect: '+12% Dual Dmg', maxPoints: 1, requires: 'dual_flurry' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'dual_blade_dancer', name: 'Blade Dancer', icon: '⭐', description: 'All dual stats increased', effect: '+8% All Dual Stats', maxPoints: 1, requires: 'dual_cleave', isPassive: true, statBonus: { stat: 'allDual', value: 8, type: 'percent' } }
        ]}
      ]
    }
  },
  mage: {
    tome: {
      className: 'Tome Mastery (Special Item)',
      color: '#3b82f6',
      tiers: [
        { name: 'Tier 1 - Arcane Basics', skills: [
          { id: 'tome_knowledge', name: 'Arcane Knowledge', icon: '📖', description: 'Spell power from tomes', effect: '+6% Spell Power', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellPower', value: 6, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Spell Weaving', skills: [
          { id: 'tome_cast', name: 'Faster Casting', icon: '✨', description: 'Reduce cast time with tomes', effect: '-5% Cast Time', maxPoints: 1, requires: 'tome_knowledge' }
        ]},
        { name: 'Tier 3 - Mastery', skills: [
          { id: 'tome_summon', name: 'Familiar Summon', icon: '🐦', description: 'Summon from tome', effect: '+1 Summon Slot', maxPoints: 1, requires: 'tome_cast' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'tome_grand', name: 'Grand Grimoire', icon: '⭐', description: 'All tome stats increased', effect: '+8% All Tome Stats', maxPoints: 1, requires: 'tome_summon', isPassive: true, statBonus: { stat: 'allTome', value: 8, type: 'percent' } }
        ]}
      ]
    },
    wand: {
      className: 'Wand Mastery (Special Item)',
      color: '#a78bfa',
      tiers: [
        { name: 'Tier 1 - Quick Cast', skills: [
          { id: 'wand_speed', name: 'Quick Draw', icon: '🪄', description: 'Faster wand attacks', effect: '+10% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 10, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Elemental', skills: [
          { id: 'wand_element', name: 'Elemental Bolt', icon: '🔥', description: 'Basic elemental from wand', effect: '+8% Elemental Dmg', maxPoints: 1, requires: 'wand_speed' }
        ]},
        { name: 'Tier 3 - Mastery', skills: [
          { id: 'wand_dualcast', name: 'Dual Cast', icon: '✨', description: 'Chance to cast twice', effect: '+10% Dualcast', maxPoints: 1, requires: 'wand_element' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'wand_conductor', name: 'Arcane Conductor', icon: '⭐', description: 'All wand stats increased', effect: '+8% All Wand Stats', maxPoints: 1, requires: 'wand_dualcast', isPassive: true, statBonus: { stat: 'allWand', value: 8, type: 'percent' } }
        ]}
      ]
    },
    grimoire: {
      className: 'Grimoire Mastery (Special Item)',
      color: '#7c3aed',
      hasSubtrees: true,
      subtrees: {
        destruction: {
          name: 'Destruction Form',
          icon: '🔥',
          color: '#ef4444',
          description: 'Focus on direct damage and explosions',
          tiers: [
            { name: 'Tier 1 - Blast Basics', skills: [
              { id: 'grim_dest_blast', name: 'Arcane Blast', icon: '💥', description: 'Direct damage blast', effect: '+10% Spell Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellDamage', value: 10, type: 'percent' } }
            ]},
            { name: 'Tier 2 - Explosions', skills: [
              { id: 'grim_dest_exp', name: 'Explosive Rune', icon: '🔥', description: 'AoE explosion on cast', effect: '+15% AoE Damage', maxPoints: 1, requires: 'grim_dest_blast' }
            ]},
            { name: 'Tier 3 - Mastery', skills: [
              { id: 'grim_dest_chain', name: 'Chain Explosion', icon: '💣', description: 'Cascading blasts', effect: 'Chain to 2 targets', maxPoints: 1, requires: 'grim_dest_exp' }
            ]},
            { name: 'Tier 4 - Ultimate', skills: [
              { id: 'grim_dest_meteor', name: 'Cataclysm', icon: '☄️', description: 'Massive destruction', effect: '+25% Ultimate Damage', maxPoints: 1, requires: 'grim_dest_chain', isPassive: true, statBonus: { stat: 'allGrimoire', value: 25, type: 'percent' } }
            ]}
          ]
        },
        protection: {
          name: 'Protection Form',
          icon: '🛡️',
          color: '#3b82f6',
          description: 'Focus on barriers, wards and absorption',
          tiers: [
            { name: 'Tier 1 - Ward Basics', skills: [
              { id: 'grim_prot_ward', name: 'Arcane Ward', icon: '🛡️', description: 'Personal barrier', effect: '+10% Magic Resist', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'magicResist', value: 10, type: 'percent' } }
            ]},
            { name: 'Tier 2 - Shields', skills: [
              { id: 'grim_prot_shield', name: 'Mana Shield', icon: '💧', description: 'Absorb damage with mana', effect: '+15% Absorb', maxPoints: 1, requires: 'grim_prot_ward' }
            ]},
            { name: 'Tier 3 - Mastery', skills: [
              { id: 'grim_prot_reflect', name: 'Spell Reflect', icon: '🔄', description: 'Reflect spells', effect: 'Reflect 20%', maxPoints: 1, requires: 'grim_prot_shield' }
            ]},
            { name: 'Tier 4 - Ultimate', skills: [
              { id: 'grim_prot_fortify', name: 'Fortify', icon: '⭐', description: 'Party wide protection', effect: '+20% Party Resist', maxPoints: 1, requires: 'grim_prot_reflect', isPassive: true, statBonus: { stat: 'allGrimoire', value: 20, type: 'percent' } }
            ]}
          ]
        },
        conjuration: {
          name: 'Conjuration Form',
          icon: '👹',
          color: '#a78bfa',
          description: 'Focus on summons, minions and rituals',
          tiers: [
            { name: 'Tier 1 - Summon Basics', skills: [
              { id: 'grim_conj_minion', name: 'Lesser Minion', icon: '👹', description: 'Summon basic familiar', effect: '+1 Minion', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'minions', value: 1, type: 'flat' } }
            ]},
            { name: 'Tier 2 - Rituals', skills: [
              { id: 'grim_conj_ritual', name: 'Summon Ritual', icon: '🩸', description: 'Stronger summon', effect: '+20% Minion Power', maxPoints: 1, requires: 'grim_conj_minion' }
            ]},
            { name: 'Tier 3 - Mastery', skills: [
              { id: 'grim_conj_swarm', name: 'Minion Swarm', icon: '🐦', description: 'Multiple minions', effect: '+1 Additional Minion', maxPoints: 1, requires: 'grim_conj_ritual' }
            ]},
            { name: 'Tier 4 - Ultimate', skills: [
              { id: 'grim_conj_lord', name: 'Grimoire Lord', icon: '⭐', description: 'Ultimate summon power', effect: '+30% All Minion Stats', maxPoints: 1, requires: 'grim_conj_swarm', isPassive: true, statBonus: { stat: 'allGrimoire', value: 30, type: 'percent' } }
            ]}
          ]
        }
      },
      // Fallback simple tiers
      tiers: [
        { name: 'Tier 1 - Forbidden Lore', skills: [
          { id: 'grimoire_power', name: 'Forbidden Power', icon: '📜', description: 'Raw spell power from grimoire', effect: '+9% Spell Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellDamage', value: 9, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Rituals', skills: [
          { id: 'grimoire_ritual', name: 'Dark Ritual', icon: '🩸', description: 'Sacrifice for power', effect: 'High cost high reward', maxPoints: 1, requires: 'grimoire_power' }
        ]},
        { name: 'Tier 3 - Mastery', skills: [
          { id: 'grimoire_banish', name: 'Banishment', icon: '💥', description: 'Remove enemy buffs', effect: 'Dispel + damage', maxPoints: 1, requires: 'grimoire_ritual' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'grimoire_eternal', name: 'Eternal Tome', icon: '⭐', description: 'All grimoire stats increased', effect: '+8% All Grimoire Stats', maxPoints: 1, requires: 'grimoire_banish', isPassive: true, statBonus: { stat: 'allGrimoire', value: 8, type: 'percent' } }
        ]}
      ]
    }
  },
  ranger: {
    nimble_fingers: {
      className: 'Nimble Fingers (Special Item)',
      color: '#f472b6',
      tiers: [
        { name: 'Tier 1 - Tricks', skills: [
          { id: 'nimble_speed', name: 'Nimble Hands', icon: '🖐️', description: 'Increased dexterity with items', effect: '+8% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 8, type: 'percent' } }
        ]},
        { name: 'Tier 2 - Dirty Tricks', skills: [
          { id: 'nimble_pick', name: 'Sleight', icon: '🎭', description: 'Steal or disarm with items', effect: 'Chance to disarm', maxPoints: 1, requires: 'nimble_speed' }
        ]},
        { name: 'Tier 3 - Mastery', skills: [
          { id: 'nimble_shadow', name: 'Shadow Step', icon: '🌑', description: 'Short teleport from nimble items', effect: 'Mobility skill', maxPoints: 1, requires: 'nimble_pick' }
        ]},
        { name: 'Tier 4 - Ultimate', skills: [
          { id: 'nimble_master', name: 'Master Thief', icon: '⭐', description: 'All nimble stats increased', effect: '+8% All Nimble Stats', maxPoints: 1, requires: 'nimble_shadow', isPassive: true, statBonus: { stat: 'allNimble', value: 8, type: 'percent' } }
        ]}
      ]
    }
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
  },
  // === 6 Special Skill Sheet Types (Spellbook weapon style selection) ===
  tome: {
    className: 'Tome Mastery',
    color: '#3b82f6',
    tiers: [
      { name: 'Tier 1 - Arcane Basics', skills: [
        { id: 'tome_knowledge', name: 'Arcane Knowledge', icon: '📖', description: 'Increases spell power from tomes', effect: '+6% Spell Power', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellPower', value: 6, type: 'percent' } },
        { id: 'tome_mana', name: 'Mana Reservoir', icon: '💧', description: 'Tomes store extra mana', effect: '+10% Max Mana', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'maxMana', value: 10, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Spell Weaving', skills: [
        { id: 'tome_cast', name: 'Faster Casting', icon: '✨', description: 'Reduce cast time', effect: '-5% Cast Time', maxPoints: 1, requires: 'tome_knowledge', isPassive: true, statBonus: { stat: 'castSpeed', value: 5, type: 'percent' } },
        { id: 'tome_ward', name: 'Arcane Ward', icon: '🛡️', description: 'Magic shield from tome', effect: '+8% Magic Resist', maxPoints: 1, requires: 'tome_mana', isPassive: true, statBonus: { stat: 'magicResist', value: 8, type: 'percent' } }
      ]},
      { name: 'Tier 3 - Mastery', skills: [
        { id: 'tome_summon', name: 'Familiar Summon', icon: '🐦', description: 'Summon minor familiar', effect: '+1 Summon Slot', maxPoints: 1, requires: 'tome_cast' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'tome_ultimate', name: 'Grand Grimoire', icon: '⭐', description: 'All tome stats increased', effect: '+8% All Tome Stats', maxPoints: 1, requires: 'tome_summon', isPassive: true, statBonus: { stat: 'allTome', value: 8, type: 'percent' } }
      ]}
    ]
  },
  shield: {
    className: 'Shield Mastery',
    color: '#64748b',
    tiers: [
      { name: 'Tier 1 - Basics', skills: [
        { id: 'shield_block', name: 'Solid Block', icon: '🛡️', description: 'Increases block chance', effect: '+7% Block', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'block', value: 7, type: 'percent' } },
        { id: 'shield_stam', name: 'Stamina Guard', icon: '💪', description: 'Better stamina for blocking', effect: '+8% Stamina', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'stamina', value: 8, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Defense', skills: [
        { id: 'shield_counter', name: 'Counter Bash', icon: '⚡', description: 'Counter on successful block', effect: '+12% Counter Dmg', maxPoints: 1, requires: 'shield_block' },
        { id: 'shield_aegis', name: 'Aegis Wall', icon: '🏰', description: 'Party defense buff', effect: '+5% Party Defense', maxPoints: 1, requires: 'shield_stam' }
      ]},
      { name: 'Tier 3 - Advanced', skills: [
        { id: 'shield_reflect', name: 'Reflect', icon: '🔄', description: 'Reflect damage when blocking', effect: '+15% Reflect', maxPoints: 1, requires: 'shield_counter' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'shield_ultimate', name: 'Bulwark', icon: '⭐', description: 'All shield stats increased', effect: '+8% All Shield Stats', maxPoints: 1, requires: 'shield_reflect', isPassive: true, statBonus: { stat: 'allShield', value: 8, type: 'percent' } }
      ]}
    ]
  },
  wand: {
    className: 'Wand Mastery',
    color: '#a78bfa',
    tiers: [
      { name: 'Tier 1 - Quick Cast', skills: [
        { id: 'wand_speed', name: 'Quick Draw', icon: '🪄', description: 'Faster wand attacks', effect: '+10% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 10, type: 'percent' } },
        { id: 'wand_focus', name: 'Wand Focus', icon: '🎯', description: 'Accuracy with wands', effect: '+5% Accuracy', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'accuracy', value: 5, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Elemental', skills: [
        { id: 'wand_element', name: 'Elemental Bolt', icon: '🔥', description: 'Basic elemental damage', effect: '+8% Elemental Dmg', maxPoints: 1, requires: 'wand_speed' },
        { id: 'wand_charm', name: 'Charm', icon: '💫', description: 'Minor control effect', effect: 'Chance to charm', maxPoints: 1, requires: 'wand_focus' }
      ]},
      { name: 'Tier 3 - Mastery', skills: [
        { id: 'wand_dualcast', name: 'Dual Cast', icon: '✨', description: 'Chance to cast twice', effect: '+10% Dualcast', maxPoints: 1, requires: 'wand_element' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'wand_ultimate', name: 'Arcane Conductor', icon: '⭐', description: 'All wand stats increased', effect: '+8% All Wand Stats', maxPoints: 1, requires: 'wand_dualcast', isPassive: true, statBonus: { stat: 'allWand', value: 8, type: 'percent' } }
      ]}
    ]
  },
  grimoire: {
    className: 'Grimoire Mastery',
    color: '#7c3aed',
    tiers: [
      { name: 'Tier 1 - Forbidden Lore', skills: [
        { id: 'grimoire_power', name: 'Forbidden Power', icon: '📜', description: 'Raw spell power', effect: '+9% Spell Damage', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'spellDamage', value: 9, type: 'percent' } },
        { id: 'grimoire_runes', name: 'Runic Inscriptions', icon: '🔮', description: 'Passive rune effects', effect: '+4% All Resist', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'resist', value: 4, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Rituals', skills: [
        { id: 'grimoire_ritual', name: 'Dark Ritual', icon: '🩸', description: 'Sacrifice for power', effect: 'High cost high reward', maxPoints: 1, requires: 'grimoire_power' },
        { id: 'grimoire_summon', name: 'Greater Summon', icon: '👹', description: 'Stronger familiars', effect: '+1 Strong Summon', maxPoints: 1, requires: 'grimoire_runes' }
      ]},
      { name: 'Tier 3 - Mastery', skills: [
        { id: 'grimoire_banish', name: 'Banishment', icon: '💥', description: 'Remove enemy buffs', effect: 'Dispel + damage', maxPoints: 1, requires: 'grimoire_ritual' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'grimoire_ultimate', name: 'Eternal Tome', icon: '⭐', description: 'All grimoire stats increased', effect: '+8% All Grimoire Stats', maxPoints: 1, requires: 'grimoire_banish', isPassive: true, statBonus: { stat: 'allGrimoire', value: 8, type: 'percent' } }
      ]}
    ]
  },
  nimble_fingers: {
    className: 'Nimble Fingers',
    color: '#f472b6',
    tiers: [
      { name: 'Tier 1 - Tricks', skills: [
        { id: 'nimble_speed', name: 'Nimble Hands', icon: '🖐️', description: 'Increased dexterity', effect: '+8% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 8, type: 'percent' } },
        { id: 'nimble_evasion', name: 'Evasion', icon: '💨', description: 'Dodge chance', effect: '+6% Dodge', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'dodge', value: 6, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Dirty Tricks', skills: [
        { id: 'nimble_pick', name: 'Sleight', icon: '🎭', description: 'Steal or disarm', effect: 'Chance to disarm', maxPoints: 1, requires: 'nimble_speed' },
        { id: 'nimble_poison', name: 'Apply Poison', icon: '☠️', description: 'Coat weapons', effect: '+poison chance', maxPoints: 1, requires: 'nimble_evasion' }
      ]},
      { name: 'Tier 3 - Mastery', skills: [
        { id: 'nimble_shadow', name: 'Shadow Step', icon: '🌑', description: 'Short teleport', effect: 'Mobility skill', maxPoints: 1, requires: 'nimble_pick' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'nimble_ultimate', name: 'Master Thief', icon: '⭐', description: 'All nimble stats increased', effect: '+8% All Nimble Stats', maxPoints: 1, requires: 'nimble_shadow', isPassive: true, statBonus: { stat: 'allNimble', value: 8, type: 'percent' } }
      ]}
    ]
  },
  dual_wield: {
    className: 'Dual Wield',
    color: '#f97316',
    tiers: [
      { name: 'Tier 1 - Basics', skills: [
        { id: 'dual_offhand', name: 'Offhand Strike', icon: '⚔️', description: 'Extra offhand attacks', effect: '+5% Offhand Dmg', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'offhandDamage', value: 5, type: 'percent' } },
        { id: 'dual_speed', name: 'Twin Strikes', icon: '🔄', description: 'Faster dual attacks', effect: '+7% Attack Speed', maxPoints: 1, requires: null, isPassive: true, statBonus: { stat: 'attackSpeed', value: 7, type: 'percent' } }
      ]},
      { name: 'Tier 2 - Combat', skills: [
        { id: 'dual_flurry', name: 'Flurry', icon: '🌪️', description: 'Rapid multi hits', effect: 'Extra hits chance', maxPoints: 1, requires: 'dual_offhand' },
        { id: 'dual_parry', name: 'Twin Guard', icon: '🛡️', description: 'Block with both', effect: '+6% Block', maxPoints: 1, requires: 'dual_speed' }
      ]},
      { name: 'Tier 3 - Mastery', skills: [
        { id: 'dual_cleave', name: 'Cross Cleave', icon: '💥', description: 'Hit with both weapons', effect: '+12% Dual Dmg', maxPoints: 1, requires: 'dual_flurry' }
      ]},
      { name: 'Tier 4 - Ultimate', skills: [
        { id: 'dual_ultimate', name: 'Blade Dancer', icon: '⭐', description: 'All dual stats increased', effect: '+8% All Dual Stats', maxPoints: 1, requires: 'dual_cleave', isPassive: true, statBonus: { stat: 'allDual', value: 8, type: 'percent' } }
      ]}
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

/** Resolve any skill id (class, weapon, special item or form subtree) to its Skill definition for HUD names, icons, execution hints. */
export function getSkillById(id: string): Skill | null {
  if (!id) return null;
  const searchTrees: SkillTree[] = [
    ...Object.values(CLASS_SKILL_TREES),
    ...Object.values(WEAPON_SKILL_TREES)
  ];
  for (const tree of searchTrees) {
    for (const tier of tree.tiers) {
      const found = tier.skills.find(s => s.id === id);
      if (found) return found;
    }
  }
  // Special item trees (incl. grimoire subtrees)
  for (const classId of Object.keys(SPECIAL_ITEM_SKILL_TREES)) {
    const specials = SPECIAL_ITEM_SKILL_TREES[classId];
    for (const key of Object.keys(specials)) {
      const spec = specials[key];
      if (spec.hasSubtrees && spec.subtrees) {
        for (const subKey of Object.keys(spec.subtrees)) {
          const sub = spec.subtrees[subKey];
          for (const tier of sub.tiers) {
            const found = tier.skills.find(s => s.id === id);
            if (found) return found;
          }
        }
      }
      for (const tier of spec.tiers || []) {
        const found = tier.skills.find(s => s.id === id);
        if (found) return found;
      }
    }
  }
  const catalog = getWeaponSkillDisplay(id);
  if (catalog) {
    return {
      id: catalog.id,
      name: catalog.name,
      icon: catalog.icon,
      description: catalog.description,
      effect: catalog.description,
      maxPoints: 1,
      requires: null,
    };
  }
  const hit = findWeaponSkillById(id);
  if (hit) {
    return {
      id: hit.skill.id,
      name: hit.skill.name,
      icon: hit.skill.icon,
      description: hit.skill.description,
      effect: hit.skill.description,
      maxPoints: 1,
      requires: null,
    };
  }
  return null;
}

/** Get nice display for a skill id (used in hotbar HUD and assignment) */
export function getSkillDisplay(id: string | null | undefined): { name: string; icon: string } {
  if (!id) return { name: 'Empty', icon: '⬜' };
  const s = getSkillById(id);
  if (s) return { name: s.name, icon: s.icon || '✨' };
  // Fallbacks for demo ids
  if (id.includes('basic')) return { name: 'Basic Attack', icon: '⚔️' };
  if (id.includes('slot')) return { name: `Slot ${id}`, icon: '🔹' };
  return { name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: '✨' };
}
