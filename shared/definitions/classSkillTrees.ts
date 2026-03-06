export interface ClassSkillChoice {
  id: string;
  name: string;
  description: string;
  icon: string;
  effectType: "passive" | "active" | "ultimate";
  effects: string[];
  cooldown?: number;
  manaCost?: number;
  staminaCost?: number;
}

export interface ClassSkillTier {
  level: number;
  tierName: string;
  description: string;
  choices: ClassSkillChoice[];
}

export interface ClassSkillTree {
  classId: string;
  className: string;
  classIcon: string;
  specialAbility: ClassSkillChoice;
  tiers: ClassSkillTier[];
}

export const CLASS_SKILL_TREES: Record<string, ClassSkillTree> = {
  warrior: {
    classId: "warrior",
    className: "Warrior",
    classIcon: "/icons/entities/Human Warrior.png",
    specialAbility: {
      id: "warrior_invincibility",
      name: "Invincibility",
      description: "Become completely immune to all damage for a short duration.",
      icon: "/icons/misc/Glow.png",
      effectType: "ultimate",
      effects: ["1-4 seconds immunity", "Duration scales with level", "Break free from CC"],
      cooldown: 60,
      manaCost: 0,
      staminaCost: 30
    },
    tiers: [
      {
        level: 0,
        tierName: "Starting Ability",
        description: "Your innate combat training",
        choices: [
          {
            id: "warrior_0_strike",
            name: "Power Strike",
            description: "A heavy melee attack that deals bonus damage.",
            icon: "/icons/weapons/Sword_01.png",
            effectType: "active",
            effects: ["+50% weapon damage", "Can knock back enemies"],
            cooldown: 6,
            staminaCost: 15
          }
        ]
      },
      {
        level: 1,
        tierName: "Combat Basics",
        description: "Choose your foundational combat style",
        choices: [
          {
            id: "warrior_1_taunt",
            name: "Taunt",
            description: "Force nearby enemies to attack you for 3 seconds.",
            icon: "/icons/misc/Burns.png",
            effectType: "active",
            effects: ["AoE threat generation", "3s forced targeting", "+20% damage reduction while active"],
            cooldown: 8,
            staminaCost: 10
          },
          {
            id: "warrior_1_quickstrike",
            name: "Quick Strike",
            description: "Fast attack combo that grants attack speed bonus.",
            icon: "/icons/misc/Slash_07.png",
            effectType: "active",
            effects: ["3 rapid strikes", "+15% attack speed for 4s", "Low stamina cost"],
            cooldown: 4,
            staminaCost: 8
          }
        ]
      },
      {
        level: 5,
        tierName: "Specialization",
        description: "Define your role on the battlefield",
        choices: [
          {
            id: "warrior_5_damage_surge",
            name: "Damage Surge",
            description: "Empower your attacks with raw fury.",
            icon: "/icons/misc/Fires.png",
            effectType: "active",
            effects: ["+40% damage for 6s", "+25% crit chance", "Attacks cause bleed"],
            cooldown: 20,
            staminaCost: 25
          },
          {
            id: "warrior_5_guardian_aura",
            name: "Guardian's Aura",
            description: "Project a protective field around yourself.",
            icon: "/icons/armor/Shield_01.png",
            effectType: "active",
            effects: ["+30% defense for allies within 5m", "Duration: 8s", "You take 15% of ally damage"],
            cooldown: 25,
            staminaCost: 20
          }
        ]
      },
      {
        level: 10,
        tierName: "Advanced Techniques",
        description: "Master powerful combat abilities",
        choices: [
          {
            id: "warrior_10_whirlwind",
            name: "Whirlwind",
            description: "Spin in a deadly circle striking all nearby foes.",
            icon: "/icons/misc/CircleF.png",
            effectType: "active",
            effects: ["360° AoE damage", "3 second channel", "+10% damage per enemy hit"],
            cooldown: 12,
            staminaCost: 35
          },
          {
            id: "warrior_10_shield_wall",
            name: "Shield Wall",
            description: "Raise an impenetrable shield defense.",
            icon: "/icons/weapons/shield_01.png",
            effectType: "active",
            effects: ["Block 90% damage from front", "Cannot attack while active", "Reflects 25% damage"],
            cooldown: 18,
            staminaCost: 30
          },
          {
            id: "warrior_10_execute",
            name: "Execute",
            description: "Devastating finisher against wounded foes.",
            icon: "/icons/misc/Chaos_2.png",
            effectType: "active",
            effects: ["3x damage to enemies below 30% HP", "Instant kill below 10% HP", "Reset cooldown on kill"],
            cooldown: 15,
            staminaCost: 40
          }
        ]
      },
      {
        level: 15,
        tierName: "Elite Training",
        description: "Unlock devastating combat mastery",
        choices: [
          {
            id: "warrior_15_berserker",
            name: "Berserker Rage",
            description: "Enter an unstoppable fury state.",
            icon: "/icons/misc/Firestar.png",
            effectType: "active",
            effects: ["+60% damage, +30% attack speed", "-25% defense", "Cannot be stunned", "8s duration"],
            cooldown: 45,
            staminaCost: 50
          },
          {
            id: "warrior_15_paladin",
            name: "Divine Blessing",
            description: "Call upon holy power to protect and heal.",
            icon: "/icons/misc/Lights.png",
            effectType: "active",
            effects: ["Heal 30% HP to self and allies", "+50% holy damage for 10s", "Purge all debuffs"],
            cooldown: 40,
            manaCost: 35
          }
        ]
      },
      {
        level: 20,
        tierName: "Ultimate Mastery",
        description: "Your pinnacle combat ability",
        choices: [
          {
            id: "warrior_20_avatar",
            name: "Avatar of War",
            description: "Transform into an unstoppable avatar of battle.",
            icon: "/icons/entities/heavy barb merc.PNG",
            effectType: "ultimate",
            effects: ["+100% all stats for 10s", "Immune to death (can't drop below 1 HP)", "All cooldowns reset"],
            cooldown: 120,
            staminaCost: 100
          },
          {
            id: "warrior_20_champion",
            name: "Champion's Stand",
            description: "Plant your banner and inspire your allies.",
            icon: "/icons/misc/Flag Icon.png",
            effectType: "ultimate",
            effects: ["All allies gain +50% damage/defense", "Enemies within 10m are slowed 50%", "15s duration"],
            cooldown: 90,
            staminaCost: 80
          }
        ]
      }
    ]
  },

  mage: {
    classId: "mage",
    className: "Mage Priest",
    classIcon: "/icons/entities/elf mage.png",
    specialAbility: {
      id: "mage_mana_shield",
      name: "Arcane Affinity",
      description: "Passive mana shield that charges when not taking damage. Activate for massive spell power boost.",
      icon: "/icons/misc/AquaCircle.png",
      effectType: "passive",
      effects: ["Passive: Shield = 50% current mana", "Active: +75% spell damage for 15s", "Charges over 5s without damage"],
      cooldown: 45,
      manaCost: 0
    },
    tiers: [
      {
        level: 0,
        tierName: "Starting Ability",
        description: "Your innate magical talent",
        choices: [
          {
            id: "mage_0_missile",
            name: "Magic Missile",
            description: "Fire multiple seeking missiles of arcane energy.",
            icon: "/icons/misc/Core.png",
            effectType: "active",
            effects: ["5 missiles", "Cannot miss", "Each deals 15 arcane damage"],
            cooldown: 3,
            manaCost: 15
          }
        ]
      },
      {
        level: 1,
        tierName: "Basic Arts",
        description: "Choose your foundational magical path",
        choices: [
          {
            id: "mage_1_fireball",
            name: "Fireball",
            description: "Hurl a ball of fire that explodes on impact.",
            icon: "/icons/misc/Fires.png",
            effectType: "active",
            effects: ["AoE fire damage", "Burns enemies for 3s", "+50% damage to frozen targets"],
            cooldown: 6,
            manaCost: 20
          },
          {
            id: "mage_1_heal",
            name: "Healing Light",
            description: "Channel divine energy to restore health.",
            icon: "/icons/misc/Lights.png",
            effectType: "active",
            effects: ["Heal target for 25% max HP", "Remove 1 debuff", "1.5s cast time"],
            cooldown: 8,
            manaCost: 25
          }
        ]
      },
      {
        level: 5,
        tierName: "Specialization",
        description: "Define your magical identity",
        choices: [
          {
            id: "mage_5_meteor",
            name: "Meteor Strike",
            description: "Call down a devastating meteor from the sky.",
            icon: "/icons/misc/Firestar.png",
            effectType: "active",
            effects: ["Massive AoE damage", "Stuns for 2s", "2s delay before impact"],
            cooldown: 20,
            manaCost: 45
          },
          {
            id: "mage_5_greater_heal",
            name: "Greater Heal",
            description: "Powerful single-target healing spell.",
            icon: "/icons/misc/Life.png",
            effectType: "active",
            effects: ["Heal 60% max HP", "Creates absorption shield", "2s cast time"],
            cooldown: 15,
            manaCost: 40
          }
        ]
      },
      {
        level: 10,
        tierName: "Advanced Arts",
        description: "Master complex magical techniques",
        choices: [
          {
            id: "mage_10_blizzard",
            name: "Blizzard",
            description: "Summon a freezing storm in target area.",
            icon: "/icons/misc/Flow.png",
            effectType: "active",
            effects: ["AoE ice damage over 6s", "Slows enemies 50%", "Can freeze enemies solid"],
            cooldown: 25,
            manaCost: 50
          },
          {
            id: "mage_10_chain_heal",
            name: "Chain Heal",
            description: "Healing energy that jumps between allies.",
            icon: "/icons/misc/AquaCore.png",
            effectType: "active",
            effects: ["Heals up to 5 targets", "Each jump heals 80% of previous", "Smart targeting prioritizes wounded"],
            cooldown: 12,
            manaCost: 35
          },
          {
            id: "mage_10_blink",
            name: "Blink",
            description: "Instantly teleport to target location.",
            icon: "/icons/misc/Effect.png",
            effectType: "active",
            effects: ["15m teleport range", "Removes movement impairing effects", "Brief invulnerability during blink"],
            cooldown: 15,
            manaCost: 25
          }
        ]
      },
      {
        level: 15,
        tierName: "Elite Magic",
        description: "Unlock devastating arcane power",
        choices: [
          {
            id: "mage_15_armageddon",
            name: "Armageddon",
            description: "Rain fire and destruction on the battlefield.",
            icon: "/icons/misc/Firestar.png",
            effectType: "active",
            effects: ["Massive AoE 12m radius", "8s duration", "Random meteor impacts"],
            cooldown: 60,
            manaCost: 80
          },
          {
            id: "mage_15_divine_intervention",
            name: "Divine Intervention",
            description: "Save an ally from certain death.",
            icon: "/icons/misc/Glow.png",
            effectType: "active",
            effects: ["Target becomes invulnerable 3s", "Heals to full HP", "Purges all debuffs"],
            cooldown: 90,
            manaCost: 100
          }
        ]
      },
      {
        level: 20,
        tierName: "Ultimate Mastery",
        description: "Your pinnacle magical ability",
        choices: [
          {
            id: "mage_20_arcane_form",
            name: "Arcane Ascension",
            description: "Become pure arcane energy.",
            icon: "/icons/misc/Glow.png",
            effectType: "ultimate",
            effects: ["+100% spell damage", "Spells cost no mana", "Hovering/immune to ground effects", "12s duration"],
            cooldown: 120,
            manaCost: 0
          },
          {
            id: "mage_20_mass_resurrect",
            name: "Mass Resurrection",
            description: "Revive all fallen allies with full health.",
            icon: "/icons/misc/Life.png",
            effectType: "ultimate",
            effects: ["Resurrect all dead allies", "Full HP restoration", "+50% damage buff for 30s"],
            cooldown: 180,
            manaCost: 150
          }
        ]
      }
    ]
  },

  ranger: {
    classId: "ranger",
    className: "Ranger Scout",
    classIcon: "/icons/entities/elf archer.png",
    specialAbility: {
      id: "ranger_precision",
      name: "Hunter's Instinct",
      description: "Passive accuracy and critical strike bonus. Enhanced tracking and resource gathering.",
      icon: "/icons/weapons/Bow_01.png",
      effectType: "passive",
      effects: ["+15% accuracy", "+10% crit chance", "+25% move speed in nature", "Track enemy positions"],
      cooldown: 0,
      manaCost: 0
    },
    tiers: [
      {
        level: 0,
        tierName: "Starting Ability",
        description: "Your natural hunting instincts",
        choices: [
          {
            id: "ranger_0_powershot",
            name: "Power Shot",
            description: "A charged arrow that deals massive damage.",
            icon: "/icons/weapons/Bow_02.png",
            effectType: "active",
            effects: ["+100% weapon damage", "Pierces through enemies", "1s charge time"],
            cooldown: 8,
            staminaCost: 20
          }
        ]
      },
      {
        level: 1,
        tierName: "Basic Training",
        description: "Choose your combat approach",
        choices: [
          {
            id: "ranger_1_multishot",
            name: "Multi-Shot",
            description: "Fire a volley of arrows at multiple targets.",
            icon: "/icons/weapons/Crossbow_01.png",
            effectType: "active",
            effects: ["5 arrows in cone", "Each arrow deals 60% damage", "Good for groups"],
            cooldown: 6,
            staminaCost: 15
          },
          {
            id: "ranger_1_stealth_strike",
            name: "Stealth Strike",
            description: "Attack from the shadows with lethal precision.",
            icon: "/icons/misc/ChaosCircle.png",
            effectType: "active",
            effects: ["+200% damage from stealth", "Guaranteed critical hit", "Requires stealth"],
            cooldown: 4,
            staminaCost: 12
          }
        ]
      },
      {
        level: 5,
        tierName: "Specialization",
        description: "Ranged Mastery or Melee Assassin?",
        choices: [
          {
            id: "ranger_5_explosive_arrow",
            name: "Explosive Arrow",
            description: "Fire an arrow that explodes on impact.",
            icon: "/icons/weapons/Crossbow_03.png",
            effectType: "active",
            effects: ["AoE explosion 4m", "Knockback enemies", "Burns for 4s"],
            cooldown: 12,
            staminaCost: 25
          },
          {
            id: "ranger_5_shadow_step",
            name: "Shadow Step",
            description: "Teleport behind your target.",
            icon: "/icons/misc/Chaos.png",
            effectType: "active",
            effects: ["Teleport 15m to target", "Enter stealth for 2s", "+50% next attack damage"],
            cooldown: 15,
            staminaCost: 20
          }
        ]
      },
      {
        level: 10,
        tierName: "Advanced Techniques",
        description: "Master your chosen path",
        choices: [
          {
            id: "ranger_10_arrow_volley",
            name: "Arrow Volley",
            description: "Rain arrows on target area.",
            icon: "/icons/misc/Flow.png",
            effectType: "active",
            effects: ["8m radius AoE", "5s duration", "Slows enemies 40%"],
            cooldown: 20,
            staminaCost: 40
          },
          {
            id: "ranger_10_vanish",
            name: "Vanish",
            description: "Disappear completely from sight.",
            icon: "/icons/misc/Chaos.png",
            effectType: "active",
            effects: ["6s stealth", "+40% move speed", "Break all targeting"],
            cooldown: 25,
            staminaCost: 30
          },
          {
            id: "ranger_10_trap",
            name: "Hunter's Trap",
            description: "Place a trap that roots enemies.",
            icon: "/icons/misc/Loot_27.png",
            effectType: "active",
            effects: ["Root for 4s", "Reveals stealthed enemies", "Poison damage"],
            cooldown: 18,
            staminaCost: 20
          }
        ]
      },
      {
        level: 15,
        tierName: "Elite Skills",
        description: "Deadly mastery techniques",
        choices: [
          {
            id: "ranger_15_sniper",
            name: "Sniper Shot",
            description: "Long-range devastating shot.",
            icon: "/icons/weapons/Crossbow_05.png",
            effectType: "active",
            effects: ["50m range", "Ignore 50% armor", "+300% damage", "2s channel"],
            cooldown: 30,
            staminaCost: 50
          },
          {
            id: "ranger_15_death_mark",
            name: "Death Mark",
            description: "Mark target for death, amplifying all damage.",
            icon: "/icons/misc/Chaos_2.png",
            effectType: "active",
            effects: ["Target takes +40% damage from all sources", "6s duration", "Execute at end if below 20% HP"],
            cooldown: 35,
            staminaCost: 40
          }
        ]
      },
      {
        level: 20,
        tierName: "Ultimate Mastery",
        description: "Your pinnacle ability",
        choices: [
          {
            id: "ranger_20_rain_of_arrows",
            name: "Rain of Arrows",
            description: "Unleash an endless barrage of arrows.",
            icon: "/icons/misc/Flow.png",
            effectType: "ultimate",
            effects: ["12m AoE", "8s duration", "Roots on final wave", "Burns enemies"],
            cooldown: 90,
            staminaCost: 80
          },
          {
            id: "ranger_20_shadow_dance",
            name: "Shadow Dance",
            description: "Become one with the shadows.",
            icon: "/icons/misc/ChaosCircle.png",
            effectType: "ultimate",
            effects: ["Permanent stealth 10s", "No cooldowns on abilities", "+100% crit damage"],
            cooldown: 120,
            staminaCost: 100
          }
        ]
      }
    ]
  },

  worg: {
    classId: "worg",
    className: "Worg Shapeshifter",
    classIcon: "/icons/entities/Heavy Orc Merc.PNG",
    specialAbility: {
      id: "worg_primal_shift",
      name: "Primal Shift",
      description: "Transform into Bear Form with massive HP and defense bonuses.",
      icon: "/icons/misc/NatureFlower.png",
      effectType: "active",
      effects: ["+100% HP", "+50% damage reduction", "Threat generation aura", "Cannot be polymorphed"],
      cooldown: 30,
      staminaCost: 40
    },
    tiers: [
      {
        level: 0,
        tierName: "Starting Ability",
        description: "Your primal connection",
        choices: [
          {
            id: "worg_0_maul",
            name: "Savage Maul",
            description: "Brutal attack that shreds armor.",
            icon: "/icons/misc/Lava.png",
            effectType: "active",
            effects: ["+75% weapon damage", "Reduce target armor 25%", "Causes bleed"],
            cooldown: 6,
            staminaCost: 18
          }
        ]
      },
      {
        level: 1,
        tierName: "Pack Instincts",
        description: "Choose your pack role",
        choices: [
          {
            id: "worg_1_howl",
            name: "Primal Howl",
            description: "A terrifying howl that strikes fear into enemies.",
            icon: "/icons/misc/Burns.png",
            effectType: "active",
            effects: ["AoE fear 3s", "-20% enemy damage", "8m radius"],
            cooldown: 15,
            staminaCost: 20
          },
          {
            id: "worg_1_pack_hunt",
            name: "Pack Hunt",
            description: "Coordinate with allies for bonus damage.",
            icon: "/icons/misc/NatureFlower.png",
            effectType: "passive",
            effects: ["+5% damage per nearby ally", "Max +25% damage", "Share 10% lifesteal with pack"],
            cooldown: 0
          }
        ]
      },
      {
        level: 5,
        tierName: "Primal Mastery",
        description: "Embrace your bestial nature",
        choices: [
          {
            id: "worg_5_feral_rage",
            name: "Feral Rage",
            description: "Enter a savage frenzy.",
            icon: "/icons/misc/Firestar.png",
            effectType: "active",
            effects: ["+50% attack speed", "+30% damage", "5% lifesteal", "8s duration"],
            cooldown: 25,
            staminaCost: 35
          },
          {
            id: "worg_5_alpha_call",
            name: "Alpha's Call",
            description: "Summon spectral wolves to fight.",
            icon: "/icons/misc/Chaos.png",
            effectType: "active",
            effects: ["Summon 3 wolf spirits", "Wolves deal 30% your damage", "15s duration"],
            cooldown: 30,
            manaCost: 40
          }
        ]
      },
      {
        level: 10,
        tierName: "Form Mastery",
        description: "Unlock additional beast forms",
        choices: [
          {
            id: "worg_10_cat_form",
            name: "Cat Form",
            description: "Transform into a swift and deadly cat.",
            icon: "/icons/misc/Effect.png",
            effectType: "active",
            effects: ["+50% move speed", "+30% crit chance", "Stealth on demand", "DPS focused"],
            cooldown: 30,
            staminaCost: 30
          },
          {
            id: "worg_10_turtle_form",
            name: "Turtle Form",
            description: "Transform into an armored turtle.",
            icon: "/icons/armor/Shield_01.png",
            effectType: "active",
            effects: ["+200% armor", "Damage reflection", "Cannot move but immune to CC"],
            cooldown: 45,
            staminaCost: 40
          },
          {
            id: "worg_10_bird_form",
            name: "Bird Form",
            description: "Transform into a swift bird.",
            icon: "/icons/misc/Leaf.png",
            effectType: "active",
            effects: ["Flight ability", "+100% move speed", "Cannot attack", "Scout mode"],
            cooldown: 60,
            staminaCost: 25
          }
        ]
      },
      {
        level: 15,
        tierName: "Alpha Dominance",
        description: "Lead your pack with power",
        choices: [
          {
            id: "worg_15_dire_form",
            name: "Dire Beast Form",
            description: "Transform into a massive dire beast.",
            icon: "/icons/misc/Firestar.png",
            effectType: "active",
            effects: ["+150% size", "+75% damage", "+100% HP", "Terrify nearby enemies"],
            cooldown: 60,
            staminaCost: 60
          },
          {
            id: "worg_15_pack_alpha",
            name: "Pack Alpha Aura",
            description: "Your presence empowers all allies.",
            icon: "/icons/misc/Glow.png",
            effectType: "passive",
            effects: ["Allies gain +20% all stats", "Your forms buff nearby allies", "15m aura range"],
            cooldown: 0
          }
        ]
      },
      {
        level: 20,
        tierName: "Ultimate Mastery",
        description: "Your pinnacle form",
        choices: [
          {
            id: "worg_20_primal_avatar",
            name: "Primal Avatar",
            description: "Become an avatar of nature itself.",
            icon: "/icons/misc/NatureFlower.png",
            effectType: "ultimate",
            effects: ["Combine all forms at once", "+200% all stats", "Nature damage aura", "15s duration"],
            cooldown: 180,
            staminaCost: 100
          },
          {
            id: "worg_20_pack_master",
            name: "Pack Master",
            description: "Command an army of beasts.",
            icon: "/icons/misc/Chaos.png",
            effectType: "ultimate",
            effects: ["Summon 6 powerful beast spirits", "Beasts deal 60% your damage", "30s duration"],
            cooldown: 120,
            manaCost: 80,
            staminaCost: 50
          }
        ]
      }
    ]
  }
};

export function getClassSkillTree(classId: string): ClassSkillTree | undefined {
  return CLASS_SKILL_TREES[classId];
}

export function getSkillTierAtLevel(classId: string, level: number): ClassSkillTier | undefined {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return undefined;
  return tree.tiers.find(t => t.level === level);
}

export function getUnlockedTiers(classId: string, characterLevel: number): ClassSkillTier[] {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return [];
  return tree.tiers.filter(t => t.level <= characterLevel);
}

export function getLockedTiers(classId: string, characterLevel: number): ClassSkillTier[] {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return [];
  return tree.tiers.filter(t => t.level > characterLevel);
}

export const SKILL_TIER_LEVELS = [0, 1, 5, 10, 15, 20];
