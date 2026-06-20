export type SlotType = 'primary' | 'secondary' | 'ability' | 'ultimate' | 'recipe' | 'utility' | 'shapeshift';

export interface WeaponSkillOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  damage: number;
  cooldown: number;
  effects: string[];
  /** If set, this skill pulls from another weapon type's spell list */
  sourceWeaponType?: string;
}

export interface SkillSlot {
  type: SlotType;
  unlockTier: number;
  label: string;
  skills: WeaponSkillOption[];
  /**
   * For 'recipe' slots: which weapon type's spell list to pull from.
   * Wand slots 1-3 pull from STAFF arcane recipes.
   */
  recipeSource?: string;
}

/** Per-form hotbar override when shapeshifted (Worge Grimoire) */
export interface FormSkillSet {
  formId: string;
  formName: string;
  formIcon: string;
  formType: 'tank' | 'dps' | 'travel';
  description: string;
  /** Skills that replace hotbar slots 1-5 while in this form */
  skills: WeaponSkillOption[];
}

export interface WeaponTypeDefinition {
  id: string;
  name: string;
  icon: string;
  slots: SkillSlot[];
  /** Number of hotbar slots this weapon uses (default 4, wand uses 5) */
  hotbarSlots?: number;
  /** For shapeshift weapons (Grimoire): per-form hotbar skill overrides */
  formSkills?: FormSkillSet[];
}

export type SelectedSkillKey =
  | 'primary'
  | 'secondary'
  | 'ability'
  | 'ultimate'
  | 'recipe1'
  | 'recipe2'
  | 'recipe3'
  | 'utility1'
  | 'utility2'
  | 'shapeshift1'
  | 'shapeshift2'
  | 'shapeshift3';

export interface SelectedSkills {
  primary: string | null;
  secondary: string | null;
  ability: string | null;
  ultimate: string | null;
  /** Wand recipe slots */
  recipe1?: string | null;
  recipe2?: string | null;
  recipe3?: string | null;
  /** Wand / Grimoire utility slots */
  utility1?: string | null;
  utility2?: string | null;
  /** Grimoire shapeshift slots */
  shapeshift1?: string | null;
  shapeshift2?: string | null;
  shapeshift3?: string | null;
}

/** Map a weapon's slot list position to the persisted selection key. */
export function getSlotSelectionKey(slot: SkillSlot, slots: SkillSlot[]): SelectedSkillKey | null {
  if (slot.type === 'primary' || slot.type === 'secondary' || slot.type === 'ability' || slot.type === 'ultimate') {
    return slot.type;
  }

  const ordinal = slots
    .slice(0, slots.indexOf(slot) + 1)
    .filter((s) => s.type === slot.type).length;

  if (slot.type === 'recipe') return (`recipe${ordinal}` as SelectedSkillKey);
  if (slot.type === 'utility') return (`utility${ordinal}` as SelectedSkillKey);
  if (slot.type === 'shapeshift') return (`shapeshift${ordinal}` as SelectedSkillKey);
  return null;
}

/** Recipe slots 2-3 share the pool from the first recipe column. */
export function getSkillsForSlot(slot: SkillSlot, slots: SkillSlot[]): WeaponSkillOption[] {
  if (slot.skills.length > 0) return slot.skills;
  if (slot.type !== 'recipe') return [];

  const recipePool = slots.find((s) => s.type === 'recipe' && s.skills.length > 0);
  return recipePool?.skills ?? [];
}

export const WEAPON_TYPE_DEFINITIONS: Record<string, WeaponTypeDefinition> = {
  SWORD: {
    id: "SWORD",
    name: "Sword",
    icon: "⚔️",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "sword_vengeful_slash", name: "Vengeful Slash", description: "Single-target slash, builds 1 Grudge Mark stack, max 3", icon: "⚔️", tier: 1, damage: 45, cooldown: 0, effects: ["Builds Grudge Mark"] },
          { id: "sword_lunging_strike", name: "Lunging Strike", description: "Ranged thrust attack", icon: "🗡️", tier: 2, damage: 55, cooldown: 2, effects: ["Extended Range"] },
          { id: "sword_fearful_swipe", name: "Fearful Swipe", description: "AoE fear attack", icon: "😱", tier: 3, damage: 40, cooldown: 4, effects: ["AoE Fear 2s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "sword_blood_rush", name: "Blood Rush", description: "Dash forward 8m, AoE damage", icon: "💨", tier: 1, damage: 35, cooldown: 8, effects: ["Dash 8m", "AoE Damage"] },
          { id: "sword_iron_grudge", name: "Iron Grudge", description: "3s damage reduction + reflect", icon: "🛡️", tier: 2, damage: 0, cooldown: 12, effects: ["30% DR", "Reflect 20%"] },
          { id: "sword_clan_charge", name: "Clan Charge", description: "Gap-closer charge + 1s stun", icon: "🐂", tier: 3, damage: 40, cooldown: 10, effects: ["Charge", "Stun 1s"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "sword_heroic_cleave", name: "Heroic Cleave", description: "Cone AoE clear", icon: "🌀", tier: 1, damage: 60, cooldown: 6, effects: ["Cone AoE"] },
          { id: "sword_parry_counter", name: "Parry Counter", description: "Block + counter damage", icon: "⚡", tier: 2, damage: 80, cooldown: 8, effects: ["Block", "Counter Attack"] },
          { id: "sword_deep_wound", name: "Deep Wound", description: "Apply bleed stack", icon: "🩸", tier: 3, damage: 30, cooldown: 4, effects: ["Bleed 5s"] },
          { id: "sword_shadow_edge", name: "Shadow Edge", description: "Dash + stun", icon: "👤", tier: 4, damage: 55, cooldown: 10, effects: ["Dash", "Stun 1.5s"] },
          { id: "sword_execute", name: "Execute", description: "Bonus dmg below 30% HP", icon: "💀", tier: 5, damage: 150, cooldown: 15, effects: ["2x dmg <30% HP"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "sword_crimson_reprisal", name: "Crimson Reprisal", description: "Large AoE slash, heals per enemy hit", icon: "🌪️", tier: 1, damage: 150, cooldown: 45, effects: ["Large AoE", "Lifesteal"] },
          { id: "sword_nights_judgment", name: "Night's Judgment", description: "Teleport behind + bleed DoT", icon: "🌙", tier: 4, damage: 200, cooldown: 60, effects: ["Teleport", "Bleed DoT"] },
        ]
      }
    ]
  },
  
  AXE: {
    id: "AXE",
    name: "Axe",
    icon: "🪓",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "axe_rending_chop", name: "Rending Chop", description: "Single target, applies Bleed stack", icon: "🪓", tier: 1, damage: 50, cooldown: 0, effects: ["Applies Bleed"] },
          { id: "axe_lunging_chop", name: "Lunging Chop", description: "Extended range chop", icon: "🏃", tier: 2, damage: 55, cooldown: 2, effects: ["Extended Range"] },
          { id: "axe_ground_slam", name: "Ground Slam", description: "AoE slow attack", icon: "💥", tier: 3, damage: 45, cooldown: 4, effects: ["AoE Slow 30%"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "axe_adrenaline_surge", name: "Adrenaline Surge", description: "+Attack speed buff", icon: "⚡", tier: 1, damage: 0, cooldown: 15, effects: ["+30% Atk Speed 5s"] },
          { id: "axe_whirl_pain", name: "Whirl of Pain", description: "Channeled AoE spin", icon: "🌀", tier: 2, damage: 80, cooldown: 10, effects: ["Channel 3s", "360° AoE"] },
          { id: "axe_bloodletting", name: "Bloodletting", description: "AoE bleed apply", icon: "🩸", tier: 3, damage: 40, cooldown: 8, effects: ["AoE Bleed 6s"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "axe_carnage_spin", name: "Carnage Spin", description: "360 AoE refresh bleed", icon: "🌪️", tier: 1, damage: 70, cooldown: 12, effects: ["Refresh all bleeds"] },
          { id: "axe_headcracker", name: "Headcracker", description: "Single stun attack", icon: "🔨", tier: 2, damage: 65, cooldown: 8, effects: ["Stun 2s"] },
          { id: "axe_veinreaver", name: "Veinreaver", description: "AoE lifesteal attack", icon: "💉", tier: 3, damage: 55, cooldown: 10, effects: ["Lifesteal 25%"] },
          { id: "axe_frenzied_chop", name: "Frenzied Chop", description: "High burst, self-damage", icon: "😤", tier: 4, damage: 120, cooldown: 15, effects: ["Take 10% max HP"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "axe_apocalypse_cleave", name: "Apocalypse Cleave", description: "Large knockback AoE", icon: "☠️", tier: 1, damage: 180, cooldown: 50, effects: ["Huge AoE", "Knockback"] },
          { id: "axe_blood_harvest", name: "Blood Harvest", description: "AoE heal on hit", icon: "🩸", tier: 4, damage: 150, cooldown: 60, effects: ["Heal 30% per hit"] },
        ]
      }
    ]
  },

  BOW: {
    id: "BOW",
    name: "Bow",
    icon: "🏹",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "bow_quick_shot", name: "Quick Shot", description: "Basic arrow shot", icon: "🏹", tier: 1, damage: 45, cooldown: 0, effects: ["Range 25m"] },
          { id: "bow_aimed_shot", name: "Aimed Shot", description: "Charged precision shot", icon: "🎯", tier: 2, damage: 80, cooldown: 2, effects: ["Guaranteed Crit"] },
          { id: "bow_fire_arrow", name: "Fire Arrow", description: "Ignites target for DoT", icon: "🔥", tier: 3, damage: 40, cooldown: 10, effects: ["Burn 6s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "bow_multishot", name: "Multishot", description: "Fire 3 arrows at once", icon: "🌙", tier: 1, damage: 35, cooldown: 8, effects: ["3 Arrows", "Cone"] },
          { id: "bow_piercing", name: "Piercing Shot", description: "Arrow pierces through enemies", icon: "➡️", tier: 3, damage: 60, cooldown: 6, effects: ["Pierce All"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "bow_bear_trap", name: "Bear Trap", description: "Place trap that roots enemies", icon: "🪤", tier: 1, damage: 20, cooldown: 15, effects: ["Root 3s"] },
          { id: "bow_swift_quiver", name: "Swift Quiver", description: "+50% attack speed for 6s", icon: "⚡", tier: 4, damage: 0, cooldown: 20, effects: ["+50% Atk Speed"] },
          { id: "bow_poison_arrow", name: "Poison Arrow", description: "Spread poison DoT", icon: "☠️", tier: 5, damage: 30, cooldown: 12, effects: ["Poison 8s"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "bow_arrow_rain", name: "Arrow Rain", description: "Rain arrows on large area", icon: "🌧️", tier: 1, damage: 150, cooldown: 45, effects: ["AoE 10m", "5s Duration"] },
          { id: "bow_sniper_shot", name: "Sniper Shot", description: "Long range massive damage", icon: "🔭", tier: 4, damage: 350, cooldown: 60, effects: ["50m Range", "Ignore Armor"] },
        ]
      }
    ]
  },

  CROSSBOW: {
    id: "CROSSBOW",
    name: "Crossbow",
    icon: "🎯",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "xbow_heavy_bolt", name: "Heavy Bolt", description: "Single shot, builds Mark", icon: "🎯", tier: 1, damage: 55, cooldown: 0, effects: ["Builds Mark"] },
          { id: "xbow_rapid_fire", name: "Rapid Fire", description: "Quick successive shots", icon: "⚡", tier: 2, damage: 30, cooldown: 3, effects: ["3 Rapid Shots"] },
          { id: "xbow_explosive_round", name: "Explosive Round", description: "AoE explosion on hit", icon: "💥", tier: 3, damage: 50, cooldown: 6, effects: ["AoE 3m"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "xbow_knockback_bolt", name: "Knockback Bolt", description: "Push enemy back", icon: "💨", tier: 1, damage: 40, cooldown: 8, effects: ["Knockback 5m"] },
          { id: "xbow_trap_bolt", name: "Trap Bolt", description: "Root trap on ground", icon: "🪤", tier: 2, damage: 25, cooldown: 12, effects: ["Root 2s"] },
          { id: "xbow_sniper_shot", name: "Sniper Shot", description: "Long range precision", icon: "🔭", tier: 3, damage: 90, cooldown: 10, effects: ["30m Range"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "xbow_barrage", name: "Barrage of Vengeance", description: "Channeled 5 bolts", icon: "🌧️", tier: 1, damage: 120, cooldown: 15, effects: ["Channel 2s"] },
          { id: "xbow_headshot", name: "Headshot", description: "Silence single target", icon: "🎯", tier: 2, damage: 80, cooldown: 10, effects: ["Silence 3s"] },
          { id: "xbow_crimson_bolt", name: "Crimson Bolt", description: "Bleed AoE damage", icon: "🩸", tier: 3, damage: 45, cooldown: 8, effects: ["Bleed AoE"] },
          { id: "xbow_shrapnel", name: "Shrapnel Burst", description: "Armor break AoE", icon: "💣", tier: 4, damage: 70, cooldown: 12, effects: ["-30% Armor 6s"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "xbow_sweeping_bolt", name: "Sweeping Bolt", description: "Piercing AoE line", icon: "➡️", tier: 1, damage: 200, cooldown: 50, effects: ["Pierce Line", "Full Width"] },
          { id: "xbow_noise_eraser", name: "Noise Eraser", description: "Massive silence burst", icon: "🤫", tier: 4, damage: 180, cooldown: 60, effects: ["AoE Silence 5s"] },
        ]
      }
    ]
  },

  GUN: {
    id: "GUN",
    name: "Gun",
    icon: "🔫",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "gun_grudge_shot", name: "Grudge Shot", description: "Single shot, builds Powder Mark", icon: "🔫", tier: 1, damage: 60, cooldown: 0, effects: ["Builds Mark"] },
          { id: "gun_quick_reload", name: "Quick Reload", description: "+Attack speed buff", icon: "⚡", tier: 2, damage: 0, cooldown: 15, effects: ["+40% Atk Speed 4s"] },
          { id: "gun_smoke_shot", name: "Smoke Shot", description: "AoE blind effect", icon: "💨", tier: 3, damage: 30, cooldown: 12, effects: ["Blind 3s", "AoE 4m"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "gun_explosive_round", name: "Explosive Round", description: "AoE burst damage", icon: "💥", tier: 1, damage: 70, cooldown: 8, effects: ["AoE 4m"] },
          { id: "gun_flame_burst", name: "Flame Burst", description: "DoT AoE fire", icon: "🔥", tier: 2, damage: 50, cooldown: 10, effects: ["Burn 5s", "AoE"] },
          { id: "gun_sniper_round", name: "Sniper Round", description: "Long range high damage", icon: "🎯", tier: 3, damage: 120, cooldown: 12, effects: ["40m Range"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "gun_hellfire_barrage", name: "Hellfire Barrage", description: "Channeled AoE fire", icon: "🌋", tier: 1, damage: 100, cooldown: 18, effects: ["Channel 3s", "Large AoE"] },
          { id: "gun_crimson_blast", name: "Crimson Blast", description: "Lifesteal AoE", icon: "🩸", tier: 2, damage: 80, cooldown: 15, effects: ["Lifesteal 30%"] },
          { id: "gun_shadow_shot", name: "Shadow Shot", description: "Silence AoE", icon: "🌑", tier: 3, damage: 60, cooldown: 12, effects: ["Silence 4s", "AoE"] },
          { id: "gun_cannon_execute", name: "Cannon Execute", description: "Low HP burst", icon: "💀", tier: 4, damage: 200, cooldown: 20, effects: ["3x dmg <25% HP"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "gun_demon_blast", name: "Demon Blast", description: "Massive knockback explosion", icon: "👹", tier: 1, damage: 250, cooldown: 55, effects: ["Knockback 10m", "AoE 8m"] },
          { id: "gun_thunder_blast", name: "Thunder Blast", description: "Ultimate storm attack", icon: "⚡", tier: 4, damage: 300, cooldown: 70, effects: ["Lightning Storm", "Stun 2s"] },
        ]
      }
    ]
  },

  DAGGER: {
    id: "DAGGER",
    name: "Dagger",
    icon: "🗡️",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "dagger_shadow_stab", name: "Shadow Stab", description: "Single stab, builds Mark", icon: "🗡️", tier: 1, damage: 40, cooldown: 0, effects: ["Builds Mark"] },
          { id: "dagger_chain_slash", name: "Chain Slash", description: "Rapid burst combo", icon: "⚡", tier: 2, damage: 35, cooldown: 3, effects: ["3 Hit Combo"] },
          { id: "dagger_poison_shiv", name: "Poison Shiv", description: "Apply DoT poison", icon: "☠️", tier: 3, damage: 25, cooldown: 6, effects: ["Poison 8s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "dagger_phantom_dash", name: "Phantom Dash", description: "Dash through enemies", icon: "💨", tier: 1, damage: 45, cooldown: 8, effects: ["Dash 6m", "Invincible"] },
          { id: "dagger_assassin_focus", name: "Assassin's Focus", description: "+Attack speed buff", icon: "🎯", tier: 2, damage: 0, cooldown: 15, effects: ["+50% Atk Speed 5s"] },
          { id: "dagger_lunging_stabs", name: "Lunging Stabs", description: "Burst mobility combo", icon: "🏃", tier: 3, damage: 60, cooldown: 10, effects: ["Dash + 4 Stabs"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "dagger_vengeful_ambush", name: "Vengeful Ambush", description: "Teleport behind burst", icon: "👤", tier: 1, damage: 80, cooldown: 12, effects: ["Teleport Behind", "+50% Dmg"] },
          { id: "dagger_crimson_stab", name: "Crimson Stab", description: "Heavy bleed burst", icon: "🩸", tier: 2, damage: 50, cooldown: 8, effects: ["Bleed 6s", "High DoT"] },
          { id: "dagger_shadow_strike", name: "Shadow Strike", description: "AoE silence attack", icon: "🌑", tier: 3, damage: 55, cooldown: 10, effects: ["Silence 3s", "AoE"] },
          { id: "dagger_flame_dagger", name: "Flame Dagger", description: "DoT AoE fire", icon: "🔥", tier: 4, damage: 40, cooldown: 8, effects: ["Burn 5s", "AoE"] },
          { id: "dagger_bloodletter_rage", name: "Bloodletter Rage", description: "Heal burst frenzy", icon: "😤", tier: 5, damage: 100, cooldown: 18, effects: ["Heal 40%", "Frenzy"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "dagger_deathgiver", name: "Deathgiver's Fatal", description: "Execute low HP targets", icon: "💀", tier: 1, damage: 200, cooldown: 50, effects: ["Instant Kill <20%"] },
          { id: "dagger_death_blossom", name: "Death Blossom", description: "360 spin attack", icon: "🌸", tier: 4, damage: 180, cooldown: 45, effects: ["360° AoE", "Rapid Hits"] },
        ]
      }
    ]
  },

  STAFF: {
    id: "STAFF",
    name: "Staff",
    icon: "🪄",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "staff_fire_bolt", name: "Fire Bolt", description: "Single-target, builds Burn stack", icon: "🔥", tier: 1, damage: 50, cooldown: 0, effects: ["Builds Burn Stack"] },
          { id: "staff_frost_bolt", name: "Frost Bolt", description: "Single-target, builds Chill", icon: "❄️", tier: 2, damage: 45, cooldown: 0, effects: ["Slow 30%"] },
          { id: "staff_holy_light", name: "Holy Light", description: "Heal single ally", icon: "✨", tier: 3, damage: -60, cooldown: 2, effects: ["Heal Ally"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "staff_flame_wave", name: "Flame Wave", description: "Cone AoE DoT", icon: "🌊", tier: 1, damage: 60, cooldown: 8, effects: ["Cone", "Burn 4s"] },
          { id: "staff_ice_nova", name: "Ice Nova", description: "AoE slow around caster", icon: "❄️", tier: 2, damage: 55, cooldown: 10, effects: ["AoE 6m", "Slow 50%"] },
          { id: "staff_divine_wave", name: "Divine Wave", description: "AoE heal allies", icon: "💫", tier: 3, damage: -80, cooldown: 12, effects: ["Heal All Allies"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "staff_inferno_shield", name: "Inferno Shield", description: "Reflect damage", icon: "🛡️", tier: 1, damage: 0, cooldown: 15, effects: ["Absorb 200", "Reflect 30%"] },
          { id: "staff_glacial_shield", name: "Glacial Shield", description: "Absorb + slow attackers", icon: "🧊", tier: 2, damage: 0, cooldown: 15, effects: ["Absorb 250", "Slow Attackers"] },
          { id: "staff_meteor_strike", name: "Meteor Strike", description: "Delayed massive burst", icon: "☄️", tier: 3, damage: 150, cooldown: 18, effects: ["Delay 1.5s", "AoE 5m"] },
          { id: "staff_blizzard", name: "Blizzard", description: "Channeled freeze zone", icon: "🌨️", tier: 4, damage: 100, cooldown: 20, effects: ["Channel", "Freeze Chance"] },
          { id: "staff_radiant_heal", name: "Radiant Salvation", description: "AoE heal + cleanse", icon: "🌟", tier: 5, damage: -120, cooldown: 25, effects: ["Cleanse Debuffs"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "staff_hellstorm", name: "Hellstorm", description: "Large AoE DoT", icon: "🌋", tier: 1, damage: 250, cooldown: 50, effects: ["AoE 12m", "Burn 8s"] },
          { id: "staff_absolute_zero", name: "Absolute Zero", description: "Mass freeze all enemies", icon: "❄️", tier: 4, damage: 180, cooldown: 60, effects: ["Freeze 4s", "AoE 15m"] },
        ]
      }
    ]
  },

  HAMMER: {
    id: "HAMMER",
    name: "Hammer",
    icon: "🔨",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "hammer_earthshatter", name: "Earthshatter", description: "AoE, applies Slow", icon: "🔨", tier: 1, damage: 55, cooldown: 0, effects: ["Slow 30%", "AoE 3m"] },
          { id: "hammer_skullbash", name: "Skullbash", description: "Single target slow", icon: "💀", tier: 2, damage: 60, cooldown: 2, effects: ["Slow 50%"] },
          { id: "hammer_ground_pound", name: "Ground Pound", description: "Armor break attack", icon: "💥", tier: 3, damage: 50, cooldown: 4, effects: ["-25% Armor 5s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "hammer_thunderous_charge", name: "Thunderous Charge", description: "Charge stun", icon: "⚡", tier: 1, damage: 45, cooldown: 10, effects: ["Charge 8m", "Stun 1.5s"] },
          { id: "hammer_quake_strike", name: "Quake Strike", description: "Knockup AoE", icon: "🌍", tier: 2, damage: 70, cooldown: 12, effects: ["Knockup 1s", "AoE 4m"] },
          { id: "hammer_iron_skin", name: "Iron Skin", description: "Damage reduction", icon: "🛡️", tier: 3, damage: 0, cooldown: 18, effects: ["40% DR 5s"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "hammer_cataclysm_blow", name: "Cataclysm Blow", description: "AoE stun attack", icon: "💫", tier: 1, damage: 80, cooldown: 15, effects: ["Stun 2s", "AoE 5m"] },
          { id: "hammer_crimson_smash", name: "Crimson Smash", description: "Bleed AoE", icon: "🩸", tier: 2, damage: 65, cooldown: 10, effects: ["Bleed 5s", "AoE"] },
          { id: "hammer_shockwave", name: "Shockwave", description: "Knockback AoE", icon: "🌊", tier: 3, damage: 55, cooldown: 12, effects: ["Knockback 6m", "AoE 6m"] },
          { id: "hammer_titan_crush", name: "Titan Crush", description: "Massive single target", icon: "👊", tier: 4, damage: 150, cooldown: 18, effects: ["Armor Break 50%"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "hammer_seismic_slam", name: "Seismic Slam", description: "Large stun AoE", icon: "🌋", tier: 1, damage: 220, cooldown: 55, effects: ["Stun 3s", "AoE 10m"] },
          { id: "hammer_mjolnir_strike", name: "Mjolnir Strike", description: "Lightning AoE storm", icon: "⚡", tier: 4, damage: 280, cooldown: 65, effects: ["Lightning Storm", "Chain"] },
        ]
      }
    ]
  },

  MACE: {
    id: "MACE",
    name: "Mace",
    icon: "🏏",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "mace_crushing_bash", name: "Crushing Bash", description: "Single hit, applies Daze stack", icon: "🏏", tier: 1, damage: 50, cooldown: 0, effects: ["Builds Daze"] },
          { id: "mace_skull_crack", name: "Skull Crack", description: "Stun single target", icon: "💀", tier: 2, damage: 55, cooldown: 3, effects: ["Stun 1s"] },
          { id: "mace_concussive_slam", name: "Concussive Slam", description: "AoE slow attack", icon: "💥", tier: 3, damage: 45, cooldown: 4, effects: ["AoE Slow 40%"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "mace_shield_bash", name: "Shield Bash", description: "Block + counter damage", icon: "🛡️", tier: 1, damage: 35, cooldown: 8, effects: ["Block", "Counter"] },
          { id: "mace_battle_cry", name: "Battle Cry", description: "AoE damage buff", icon: "📯", tier: 2, damage: 0, cooldown: 15, effects: ["+25% Dmg 5s", "AoE"] },
          { id: "mace_iron_charge", name: "Iron Charge", description: "Charge + armor break", icon: "🐂", tier: 3, damage: 40, cooldown: 10, effects: ["Charge 6m", "-30% Armor"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "mace_armor_breaker", name: "Armor Breaker", description: "Reduce target defense", icon: "🔨", tier: 1, damage: 60, cooldown: 8, effects: ["-40% Armor 6s"] },
          { id: "mace_stunning_smash", name: "Stunning Smash", description: "AoE stun", icon: "💫", tier: 2, damage: 70, cooldown: 12, effects: ["Stun 2s", "AoE 4m"] },
          { id: "mace_holy_strike", name: "Holy Strike", description: "Heal self on hit", icon: "✨", tier: 3, damage: 55, cooldown: 10, effects: ["Heal 20% Dmg"] },
          { id: "mace_ground_pound", name: "Ground Pound", description: "Knockup AoE", icon: "🌍", tier: 4, damage: 80, cooldown: 14, effects: ["Knockup 1.5s", "AoE 5m"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "mace_bonecrusher", name: "Bonecrusher", description: "Massive single-target stun burst", icon: "☠️", tier: 1, damage: 200, cooldown: 50, effects: ["Stun 3s", "Armor Shred"] },
          { id: "mace_divine_judgment", name: "Divine Judgment", description: "AoE holy burst + heal party", icon: "⚡", tier: 4, damage: 180, cooldown: 60, effects: ["AoE 8m", "Heal Party 25%"] },
        ]
      }
    ]
  },

  SPEAR: {
    id: "SPEAR",
    name: "Spear",
    icon: "🔱",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "spear_thrust", name: "Piercing Thrust", description: "Long-range single, builds Impale Mark", icon: "🔱", tier: 1, damage: 48, cooldown: 0, effects: ["Range 4m", "Builds Mark"] },
          { id: "spear_lunging_stab", name: "Lunging Stab", description: "Extended range thrust", icon: "🏃", tier: 2, damage: 55, cooldown: 2, effects: ["Range 6m"] },
          { id: "spear_leg_sweep", name: "Leg Sweep", description: "AoE knockdown", icon: "🦶", tier: 3, damage: 40, cooldown: 5, effects: ["Knockdown 1s", "AoE 3m"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "spear_cavalry_charge", name: "Cavalry Charge", description: "Dash pierce enemies in line", icon: "💨", tier: 1, damage: 50, cooldown: 10, effects: ["Dash 10m", "Pierce All"] },
          { id: "spear_phalanx_stance", name: "Phalanx Stance", description: "Defense buff + reflect", icon: "🛡️", tier: 2, damage: 0, cooldown: 15, effects: ["+35% DR 5s", "Reflect 15%"] },
          { id: "spear_javelin_throw", name: "Javelin Throw", description: "Ranged throw attack", icon: "🎯", tier: 3, damage: 65, cooldown: 8, effects: ["Range 20m", "Slow 30%"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "spear_skewer", name: "Skewer", description: "Multi-target pierce line", icon: "➡️", tier: 1, damage: 70, cooldown: 10, effects: ["Pierce 3 Targets"] },
          { id: "spear_pinning_strike", name: "Pinning Strike", description: "Root single target", icon: "📌", tier: 2, damage: 50, cooldown: 8, effects: ["Root 3s"] },
          { id: "spear_whirlwind_spear", name: "Whirlwind Spear", description: "360° sweep attack", icon: "🌀", tier: 3, damage: 65, cooldown: 12, effects: ["360° AoE 4m"] },
          { id: "spear_hemorrhage", name: "Hemorrhage", description: "Apply massive bleed", icon: "🩸", tier: 4, damage: 40, cooldown: 10, effects: ["Bleed 10s", "High DoT"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "spear_impaling_rush", name: "Impaling Rush", description: "Charge + massive pierce through all", icon: "⚡", tier: 1, damage: 220, cooldown: 50, effects: ["Charge 12m", "Pierce All", "Stun 2s"] },
          { id: "spear_storm_of_spears", name: "Storm of Spears", description: "Rain javelins on area", icon: "🌧️", tier: 4, damage: 180, cooldown: 55, effects: ["AoE 10m", "6s Duration"] },
        ]
      }
    ]
  },

  SHIELD: {
    id: "SHIELD",
    name: "Shield",
    icon: "🛡️",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "shield_bash", name: "Shield Bash", description: "Slam shield into target, applies Daze", icon: "🛡️", tier: 1, damage: 35, cooldown: 0, effects: ["Daze 1s"] },
          { id: "shield_slam", name: "Shield Slam", description: "AoE cone knockback", icon: "💥", tier: 2, damage: 40, cooldown: 3, effects: ["Cone Knockback 3m"] },
          { id: "shield_punch", name: "Shield Punch", description: "Interrupt + silence", icon: "🤜", tier: 3, damage: 30, cooldown: 4, effects: ["Interrupt", "Silence 2s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "shield_wall", name: "Shield Wall", description: "Massive damage reduction", icon: "🏰", tier: 1, damage: 0, cooldown: 20, effects: ["60% DR 5s"] },
          { id: "shield_taunt", name: "Taunt", description: "Force enemies to attack you", icon: "😤", tier: 2, damage: 0, cooldown: 12, effects: ["Taunt 4s", "AoE 8m"] },
          { id: "shield_charge", name: "Shield Charge", description: "Charge + stun", icon: "🐂", tier: 3, damage: 35, cooldown: 10, effects: ["Charge 8m", "Stun 1.5s"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "shield_reflect", name: "Reflect", description: "Return damage to attacker", icon: "🔄", tier: 1, damage: 0, cooldown: 10, effects: ["Reflect 50% 3s"] },
          { id: "shield_guardian_aura", name: "Guardian Aura", description: "AoE party damage reduction", icon: "💫", tier: 2, damage: 0, cooldown: 18, effects: ["+20% DR Allies 6s"] },
          { id: "shield_ground_slam", name: "Ground Slam", description: "Shockwave AoE slow", icon: "🌍", tier: 3, damage: 50, cooldown: 12, effects: ["Slow 50%", "AoE 6m"] },
          { id: "shield_heal_block", name: "Healing Block", description: "Absorb damage and heal", icon: "💚", tier: 4, damage: 0, cooldown: 15, effects: ["Absorb 300", "Heal 50% Absorbed"] },
          { id: "shield_rally", name: "Rally", description: "Cleanse + buff party", icon: "📯", tier: 5, damage: 0, cooldown: 25, effects: ["Cleanse All", "+15% Stats 6s"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "shield_invincibility", name: "Invincibility", description: "Party-wide invulnerability", icon: "⭐", tier: 1, damage: 0, cooldown: 90, effects: ["Invulnerable 3s", "AoE 10m"] },
          { id: "shield_fortress", name: "Fortress", description: "Become immovable, taunt + AoE damage", icon: "🏯", tier: 4, damage: 150, cooldown: 60, effects: ["Taunt", "80% DR", "Thorns 8s"] },
        ]
      }
    ]
  },

  WAND: {
    id: "WAND",
    name: "Wand",
    icon: "✨",
    hotbarSlots: 5,
    slots: [
      // ── RECIPE SLOTS 1-3: Crafted/Found spell scrolls ──
      // Spells must be found as loot drops or crafted at a crafting table,
      // then slotted into the wand. These are NOT freely picked from a list.
      {
        type: "recipe",
        unlockTier: 1,
        label: "RECIPE 1",
        recipeSource: "STAFF",
        skills: [
          { id: "wand_r_fire_bolt", name: "Fire Bolt", description: "Single-target fire, builds Burn stack", icon: "🔥", tier: 1, damage: 50, cooldown: 0, effects: ["Builds Burn Stack"], sourceWeaponType: "STAFF" },
          { id: "wand_r_frost_bolt", name: "Frost Bolt", description: "Single-target ice, slows", icon: "❄️", tier: 1, damage: 45, cooldown: 0, effects: ["Slow 30%"], sourceWeaponType: "STAFF" },
          { id: "wand_r_arcane_bolt", name: "Arcane Bolt", description: "Pure arcane damage, builds Charge", icon: "✨", tier: 1, damage: 40, cooldown: 0, effects: ["Builds Arcane Charge"], sourceWeaponType: "STAFF" },
          { id: "wand_r_holy_light", name: "Holy Light", description: "Heal single ally", icon: "💛", tier: 1, damage: -60, cooldown: 2, effects: ["Heal Ally"], sourceWeaponType: "STAFF" },
          { id: "wand_r_nature_bolt", name: "Nature Bolt", description: "Poison + minor heal", icon: "🌿", tier: 1, damage: 35, cooldown: 0, effects: ["Poison 4s", "Self Heal 10"], sourceWeaponType: "STAFF" },
          { id: "wand_r_lightning_bolt", name: "Lightning Bolt", description: "Chain to 2 targets", icon: "⚡", tier: 2, damage: 55, cooldown: 2, effects: ["Chain 2"], sourceWeaponType: "STAFF" },
          { id: "wand_r_flame_wave", name: "Flame Wave", description: "Cone AoE burn", icon: "🌊", tier: 2, damage: 60, cooldown: 8, effects: ["Cone", "Burn 4s"], sourceWeaponType: "STAFF" },
          { id: "wand_r_ice_nova", name: "Ice Nova", description: "AoE slow around caster", icon: "❄️", tier: 2, damage: 55, cooldown: 10, effects: ["AoE 6m", "Slow 50%"], sourceWeaponType: "STAFF" },
          { id: "wand_r_chain_lightning", name: "Chain Lightning", description: "Bounces 5 times, +10% per bounce", icon: "🔗", tier: 3, damage: 45, cooldown: 8, effects: ["Bounce 5", "+10% per Bounce"], sourceWeaponType: "STAFF" },
          { id: "wand_r_meteor_strike", name: "Meteor Strike", description: "Delayed massive AoE burst", icon: "☄️", tier: 3, damage: 150, cooldown: 18, effects: ["Delay 1.5s", "AoE 5m"], sourceWeaponType: "STAFF" },
          { id: "wand_r_blizzard", name: "Blizzard", description: "Channeled freeze zone", icon: "🌨️", tier: 3, damage: 100, cooldown: 20, effects: ["Channel 4s", "Freeze Chance"], sourceWeaponType: "STAFF" },
          { id: "wand_r_divine_wave", name: "Divine Wave", description: "AoE heal allies", icon: "💫", tier: 3, damage: -80, cooldown: 12, effects: ["Heal All Allies 6m"], sourceWeaponType: "STAFF" },
          { id: "wand_r_inferno_shield", name: "Inferno Shield", description: "Absorb + reflect fire", icon: "🛡️", tier: 4, damage: 0, cooldown: 15, effects: ["Absorb 200", "Reflect 30%"], sourceWeaponType: "STAFF" },
          { id: "wand_r_radiant_salvation", name: "Radiant Salvation", description: "AoE heal + cleanse debuffs", icon: "🌟", tier: 5, damage: -120, cooldown: 25, effects: ["Cleanse All Debuffs", "AoE Heal"], sourceWeaponType: "STAFF" },
        ]
      },
      {
        type: "recipe",
        unlockTier: 1,
        label: "RECIPE 2",
        recipeSource: "STAFF",
        skills: []  // Same pool as Recipe 1 — UI filters out already-selected skills
      },
      {
        type: "recipe",
        unlockTier: 2,
        label: "RECIPE 3",
        recipeSource: "STAFF",
        skills: []  // Same pool as Recipe 1 — UI filters out already-selected skills
      },
      // ── UTILITY SLOTS 4-5: Class abilities (Mage-specific) ──
      // These are NOT from the staff list — they are class utility skills.
      {
        type: "utility",
        unlockTier: 1,
        label: "UTILITY 4",
        skills: [
          { id: "wand_blink", name: "Blink", description: "Instant teleport to cursor location", icon: "💨", tier: 1, damage: 0, cooldown: 12, effects: ["Teleport 15m", "Invincible During"] },
          { id: "wand_counterspell", name: "Counterspell", description: "Interrupt + lock out school 4s", icon: "🚫", tier: 1, damage: 0, cooldown: 20, effects: ["Interrupt", "Lockout 4s"] },
          { id: "wand_mana_shield", name: "Mana Shield", description: "Absorb damage using mana pool", icon: "🛡️", tier: 2, damage: 0, cooldown: 15, effects: ["Absorb 300", "Drains Mana"] },
          { id: "wand_spellsteal", name: "Spellsteal", description: "Steal 1 buff from target", icon: "🎭", tier: 3, damage: 0, cooldown: 25, effects: ["Steal 1 Buff"] },
          { id: "wand_evocation", name: "Evocation", description: "Channel to restore mana rapidly", icon: "🌟", tier: 2, damage: 0, cooldown: 45, effects: ["Channel 4s", "Restore 60% Mana"] },
          { id: "wand_ice_block", name: "Ice Block", description: "Become invulnerable in ice", icon: "🧊", tier: 3, damage: 0, cooldown: 60, effects: ["Invulnerable 5s", "Cleanse All", "Cannot Act"] },
        ]
      },
      {
        type: "utility",
        unlockTier: 2,
        label: "UTILITY 5",
        skills: [
          { id: "wand_portal_town", name: "Portal: Town", description: "Open portal to nearest town for party", icon: "🌀", tier: 1, damage: 0, cooldown: 300, effects: ["3s Cast", "Party Portal", "60s Duration"] },
          { id: "wand_portal_island", name: "Portal: Island", description: "Open portal to your island", icon: "🏝️", tier: 2, damage: 0, cooldown: 300, effects: ["3s Cast", "Party Portal", "60s Duration"] },
          { id: "wand_portal_faction", name: "Portal: Faction Hub", description: "Open portal to faction capital", icon: "🏰", tier: 3, damage: 0, cooldown: 300, effects: ["3s Cast", "Party Portal", "60s Duration"] },
          { id: "wand_polymorph", name: "Polymorph", description: "Turn enemy into harmless critter", icon: "🐑", tier: 1, damage: 0, cooldown: 20, effects: ["Disable 4s", "Breaks on Damage"] },
          { id: "wand_time_warp", name: "Time Warp", description: "Haste party, slow enemies", icon: "⏰", tier: 4, damage: 0, cooldown: 300, effects: ["+40% Haste Party 10s", "Cannot Reuse 10min"] },
          { id: "wand_arcane_intellect", name: "Arcane Intellect", description: "Buff party INT + mana regen", icon: "📚", tier: 1, damage: 0, cooldown: 0, effects: ["+10% INT", "+20% Mana Regen", "30min Buff"] },
          { id: "wand_slow_fall", name: "Slow Fall", description: "Reduce fall speed for party", icon: "🪂", tier: 1, damage: 0, cooldown: 30, effects: ["Slow Fall 30s", "Party"] },
          { id: "wand_conjure_food", name: "Conjure Food", description: "Create magic food that restores HP/Mana", icon: "🍞", tier: 1, damage: 0, cooldown: 10, effects: ["Create Food Stack", "Restores 50% HP+Mana"] },
        ]
      },
    ]
  },

  // ─── TOME: Off-hand modifier (NOT a standalone weapon) ────────────────
  // Tomes are off-hand equipment items. When equipped, they REPLACE the
  // main-hand weapon's hotbar slots 1-2-3 with tome-specific skills.
  // The tome type determines which skill overrides apply.
  // Tomes do NOT appear in weapon skill trees — they are equipment items
  // with a `slotOverrides` array that modifies the equipped main-hand.
  // See: shared/definitions/tomeOverrides.ts for the override definitions.
  //
  // Example tome types:
  //   - Tome of Fire:    replaces slots 1-2-3 with fire spells
  //   - Tome of Frost:   replaces slots 1-2-3 with frost spells
  //   - Tome of Holy:    replaces slots 1-2-3 with healing spells
  //   - Tome of Shadow:  replaces slots 1-2-3 with shadow/curse spells
  //   - Tome of Nature:  replaces slots 1-2-3 with nature/poison spells
  //   - Tome of Arcane:  replaces slots 1-2-3 with arcane burst spells
  // ──────────────────────────────────────────────────────────────────────

  TWO_HAND_SWORD: {
    id: "TWO_HAND_SWORD",
    name: "Two-Hand Sword",
    icon: "⚔️",
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "2h_heavy_slash", name: "Heavy Slash", description: "Slow powerful cleave", icon: "⚔️", tier: 1, damage: 65, cooldown: 0, effects: ["Cleave 2 Targets"] },
          { id: "2h_overhead_slam", name: "Overhead Slam", description: "Single target burst", icon: "💥", tier: 2, damage: 75, cooldown: 3, effects: ["Stagger 0.5s"] },
          { id: "2h_sweeping_strike", name: "Sweeping Strike", description: "Wide AoE arc", icon: "🌀", tier: 3, damage: 55, cooldown: 4, effects: ["AoE Cone 180°"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "2h_colossus_charge", name: "Colossus Charge", description: "Unstoppable charge", icon: "🐂", tier: 1, damage: 50, cooldown: 10, effects: ["Charge 10m", "Knockback"] },
          { id: "2h_war_cry", name: "War Cry", description: "Fear nearby enemies", icon: "😱", tier: 2, damage: 0, cooldown: 15, effects: ["Fear 3s", "AoE 6m"] },
          { id: "2h_berserker_stance", name: "Berserker Stance", description: "+Damage, -Defense", icon: "😤", tier: 3, damage: 0, cooldown: 18, effects: ["+40% Dmg", "-20% DR", "8s"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "2h_mortal_strike", name: "Mortal Strike", description: "Reduce healing received", icon: "💀", tier: 1, damage: 80, cooldown: 8, effects: ["-50% Healing 6s"] },
          { id: "2h_cleaving_combo", name: "Cleaving Combo", description: "3-hit AoE combo", icon: "🔥", tier: 2, damage: 100, cooldown: 12, effects: ["3 Hits", "AoE 4m"] },
          { id: "2h_impale", name: "Impale", description: "Pin target in place", icon: "📌", tier: 3, damage: 70, cooldown: 10, effects: ["Root 3s", "Bleed 5s"] },
          { id: "2h_titan_grip", name: "Titan Grip", description: "Gain massive strength", icon: "💪", tier: 4, damage: 0, cooldown: 20, effects: ["+50% Dmg 6s", "Immune CC"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "2h_bladestorm", name: "Bladestorm", description: "Channeled 360° devastation", icon: "🌪️", tier: 1, damage: 250, cooldown: 50, effects: ["Channel 5s", "360° AoE 6m", "Immune CC"] },
          { id: "2h_executioner", name: "Executioner's Sentence", description: "Massive execute", icon: "⚡", tier: 4, damage: 400, cooldown: 65, effects: ["3x Dmg <25% HP", "Reset on Kill"] },
        ]
      }
    ]
  },

  SCYTHE: {
    id: "SCYTHE",
    name: "Scythe",
    icon: "⚰️",
    // Artifact weapon — rare drop, any class can use. Not class-specific.
    slots: [
      {
        type: "primary",
        unlockTier: 1,
        label: "PRIMARY",
        skills: [
          { id: "scythe_reap", name: "Reap", description: "Wide sweeping cut, builds Soul stack", icon: "⚰️", tier: 1, damage: 50, cooldown: 0, effects: ["Builds Soul", "AoE 3m"] },
          { id: "scythe_soul_rend", name: "Soul Rend", description: "Drain life from target", icon: "👻", tier: 2, damage: 45, cooldown: 3, effects: ["Lifesteal 30%"] },
          { id: "scythe_death_mark", name: "Death Mark", description: "Mark target for bonus damage", icon: "💀", tier: 3, damage: 35, cooldown: 5, effects: ["+25% Dmg Taken 6s"] },
        ]
      },
      {
        type: "secondary",
        unlockTier: 2,
        label: "SECONDARY",
        skills: [
          { id: "scythe_phantom_dash", name: "Phantom Dash", description: "Phase through enemies", icon: "💨", tier: 1, damage: 40, cooldown: 8, effects: ["Dash 8m", "Invincible", "AoE Trail"] },
          { id: "scythe_soul_harvest", name: "Soul Harvest", description: "AoE life drain", icon: "🌑", tier: 2, damage: 60, cooldown: 12, effects: ["AoE 5m", "Lifesteal 40%"] },
          { id: "scythe_dark_embrace", name: "Dark Embrace", description: "Damage absorb shield from souls", icon: "🖤", tier: 3, damage: 0, cooldown: 15, effects: ["Absorb 300", "Consumes Soul Stacks"] },
        ]
      },
      {
        type: "ability",
        unlockTier: 2,
        label: "ABILITY",
        skills: [
          { id: "scythe_death_spiral", name: "Death Spiral", description: "Channeled AoE spin", icon: "🌀", tier: 1, damage: 80, cooldown: 10, effects: ["Channel 3s", "360° AoE"] },
          { id: "scythe_plague_touch", name: "Plague Touch", description: "Spread DoT to nearby", icon: "☠️", tier: 2, damage: 40, cooldown: 8, effects: ["Poison 8s", "Spread 3m"] },
          { id: "scythe_soul_shatter", name: "Soul Shatter", description: "Consume all Soul stacks for burst", icon: "💥", tier: 3, damage: 40, cooldown: 12, effects: ["+40 Dmg per Soul Stack"] },
          { id: "scythe_consume_soul", name: "Consume Soul", description: "Execute low HP + heal", icon: "💉", tier: 4, damage: 120, cooldown: 15, effects: ["Execute <20%", "Heal 30%"] },
        ]
      },
      {
        type: "ultimate",
        unlockTier: 3,
        label: "ULTIMATE",
        skills: [
          { id: "scythe_twilight_harvest", name: "Twilight Harvest", description: "Massive AoE drain, heal per enemy hit", icon: "🌑", tier: 1, damage: 200, cooldown: 55, effects: ["AoE 10m", "Lifesteal All", "6s"] },
          { id: "scythe_soul_storm", name: "Soul Storm", description: "Channel: pull enemies in + shred", icon: "🌪️", tier: 4, damage: 250, cooldown: 60, effects: ["Channel 4s", "Pull 8m", "AoE Shred"] },
        ]
      }
    ]
  },

  // ─── RELIC: Equipment slot item (NOT a weapon) ──────────────────────
  // Relics are equippable trinket items like WoW trinkets.
  // They provide: passive stats, resistances, on-use actives, proc effects.
  // They have their own equipment slot, NOT a weapon skill tree.
  // See: shared/definitions/relicDatabase.ts for relic item definitions.
  // ────────────────────────────────────────────────────────────────────

  GRIMOIRE: {
    id: "GRIMOIRE",
    name: "Grimoire",
    icon: "📗",
    hotbarSlots: 5,
    // Worge-exclusive green tome weapon.
    // Shift+1/2/3 = shapeshift into Bear(tank), Raptor(dps), Large Bird(travel)
    // Slots 4-5 = class abilities usable in ANY form from the Worge tree.
    // When shifted, hotbar slots 1-5 are replaced by form-specific skills.
    slots: [
      {
        type: "shapeshift",
        unlockTier: 1,
        label: "SHIFT 1 — Bear Form (Tank)",
        skills: [
          { id: "grim_bear_form", name: "Bear Form", description: "Shift into Bear — large, powerful tank", icon: "🐻", tier: 1, damage: 0, cooldown: 1.5, effects: ["Shapeshift", "+50% HP", "+40% Armor", "-30% Speed"] },
        ]
      },
      {
        type: "shapeshift",
        unlockTier: 1,
        label: "SHIFT 2 — Raptor Form (DPS)",
        skills: [
          { id: "grim_raptor_form", name: "Raptor Form", description: "Shift into Raptor — invisible rogue-like assassin", icon: "🦎", tier: 1, damage: 0, cooldown: 1.5, effects: ["Shapeshift", "Stealth", "+40% Crit", "+20% Speed"] },
        ]
      },
      {
        type: "shapeshift",
        unlockTier: 1,
        label: "SHIFT 3 — Bird Form (Travel)",
        skills: [
          { id: "grim_bird_form", name: "Large Bird Form", description: "Shift into Bird — flyable, mountable by party", icon: "🦅", tier: 1, damage: 0, cooldown: 1.5, effects: ["Shapeshift", "Flight", "+100% Speed", "Carry 1 Player"] },
        ]
      },
      // Slots 4-5: Worge class abilities usable in any form
      {
        type: "utility",
        unlockTier: 1,
        label: "CLASS ABILITY 4",
        skills: [
          { id: "grim_rejuvenation", name: "Rejuvenation", description: "HoT on self or ally", icon: "🌿", tier: 1, damage: -40, cooldown: 6, effects: ["HoT 8s", "Works in Any Form"] },
          { id: "grim_nature_swiftness", name: "Nature's Swiftness", description: "Next ability is instant cast", icon: "⚡", tier: 2, damage: 0, cooldown: 60, effects: ["Instant Next Ability"] },
          { id: "grim_entangling_roots", name: "Entangling Roots", description: "Root target in place", icon: "🌳", tier: 2, damage: 30, cooldown: 15, effects: ["Root 5s", "Breaks on Damage"] },
          { id: "grim_moonfire", name: "Moonfire", description: "Ranged instant DoT", icon: "🌙", tier: 1, damage: 25, cooldown: 0, effects: ["DoT 6s", "Instant", "Range 20m"] },
          { id: "grim_innervate", name: "Innervate", description: "Restore mana to ally", icon: "💧", tier: 3, damage: 0, cooldown: 90, effects: ["Restore 50% Mana", "10s Channel"] },
          { id: "grim_barkskin", name: "Barkskin", description: "Damage reduction, usable while CC'd", icon: "🪵", tier: 2, damage: 0, cooldown: 45, effects: ["20% DR 12s", "Usable While Stunned"] },
        ]
      },
      {
        type: "utility",
        unlockTier: 2,
        label: "CLASS ABILITY 5",
        skills: [
          { id: "grim_rebirth", name: "Rebirth", description: "Battle resurrect fallen ally", icon: "🌟", tier: 3, damage: 0, cooldown: 600, effects: ["Revive 30% HP", "Combat Rez"] },
          { id: "grim_wild_charge", name: "Wild Charge", description: "Dash to ally or enemy (form-dependent)", icon: "💨", tier: 1, damage: 20, cooldown: 15, effects: ["Dash 20m", "Bear: Stun", "Raptor: Backstab", "Bird: Fly To"] },
          { id: "grim_mark_of_the_wild", name: "Mark of the Wild", description: "Buff party stats", icon: "🐾", tier: 1, damage: 0, cooldown: 0, effects: ["+5% All Stats", "30min Buff", "Party"] },
          { id: "grim_hibernate", name: "Hibernate", description: "Sleep beast or dragon target", icon: "😴", tier: 2, damage: 0, cooldown: 20, effects: ["Sleep 8s", "Beasts/Dragons Only"] },
          { id: "grim_teleport_moonglade", name: "Teleport: Moonglade", description: "Teleport to Worge sanctuary", icon: "🌀", tier: 1, damage: 0, cooldown: 300, effects: ["Teleport", "10s Cast"] },
        ]
      },
    ],
    // Per-form hotbar overrides — when shifted, slots 1-5 become these:
    formSkills: [
      {
        formId: "bear",
        formName: "Bear Form",
        formIcon: "🐻",
        formType: "tank",
        description: "Tank form — taunt, absorb, AoE threat",
        skills: [
          { id: "bear_maul", name: "Maul", description: "Heavy single-target swipe", icon: "🐻", tier: 1, damage: 55, cooldown: 0, effects: ["Builds Rage"] },
          { id: "bear_swipe", name: "Swipe", description: "AoE threat + damage", icon: "🌀", tier: 1, damage: 35, cooldown: 3, effects: ["AoE 4m", "High Threat"] },
          { id: "bear_growl", name: "Growl", description: "Force taunt single target", icon: "😤", tier: 1, damage: 0, cooldown: 8, effects: ["Taunt 3s"] },
          { id: "bear_ironfur", name: "Ironfur", description: "Massive armor buff", icon: "🛡️", tier: 2, damage: 0, cooldown: 12, effects: ["+60% Armor 6s", "Costs Rage"] },
          { id: "bear_frenzied_regen", name: "Frenzied Regen", description: "Strong self-heal over time", icon: "💚", tier: 2, damage: -80, cooldown: 20, effects: ["HoT 6s", "Costs Rage"] },
        ]
      },
      {
        formId: "raptor",
        formName: "Raptor Form",
        formIcon: "🦎",
        formType: "dps",
        description: "DPS form — stealth, crit, bleed, burst",
        skills: [
          { id: "raptor_shred", name: "Shred", description: "Melee crit-focused attack, builds Combo", icon: "🦎", tier: 1, damage: 45, cooldown: 0, effects: ["Builds Combo Point", "+30% Crit from Behind"] },
          { id: "raptor_rake", name: "Rake", description: "Apply bleed DoT", icon: "🩸", tier: 1, damage: 30, cooldown: 0, effects: ["Bleed 8s", "Stealth: Stun 2s"] },
          { id: "raptor_rip", name: "Rip", description: "Spend combo for heavy bleed", icon: "☠️", tier: 1, damage: 20, cooldown: 0, effects: ["Bleed 12s", "+Dmg per Combo Spent"] },
          { id: "raptor_ferocious_bite", name: "Ferocious Bite", description: "Burst finisher, spends combo", icon: "🐊", tier: 2, damage: 80, cooldown: 0, effects: ["+50% Dmg per Combo", "Execute <25%"] },
          { id: "raptor_prowl", name: "Prowl", description: "Enter stealth", icon: "👤", tier: 1, damage: 0, cooldown: 6, effects: ["Stealth", "-30% Speed", "Break on Damage"] },
        ]
      },
      {
        formId: "bird",
        formName: "Large Bird Form",
        formIcon: "🦅",
        formType: "travel",
        description: "Travel form — flight, carry party member, limited combat",
        skills: [
          { id: "bird_takeoff", name: "Takeoff", description: "Launch into the air", icon: "🦅", tier: 1, damage: 0, cooldown: 0, effects: ["Flight", "+100% Move Speed"] },
          { id: "bird_dive_bomb", name: "Dive Bomb", description: "Dive attack from air, exits flight", icon: "💥", tier: 1, damage: 70, cooldown: 10, effects: ["AoE 3m", "Stun 1s", "Exits Flight"] },
          { id: "bird_carry", name: "Carry Ally", description: "Pick up a party member", icon: "🤝", tier: 1, damage: 0, cooldown: 5, effects: ["Carry 1 Player", "-20% Speed"] },
          { id: "bird_screech", name: "Screech", description: "AoE slow while flying", icon: "📢", tier: 2, damage: 25, cooldown: 8, effects: ["Slow 40% 3s", "AoE 6m Below"] },
          { id: "bird_wind_gust", name: "Wind Gust", description: "Knockback enemies below", icon: "🌬️", tier: 2, damage: 15, cooldown: 12, effects: ["Knockback 5m", "AoE Below"] },
        ]
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CLASS-SPECIFIC COMBAT TREES
// These are not weapon types — they are class ability trees that modify
// or extend the hotbar for specific classes regardless of weapon equipped.
// ═══════════════════════════════════════════════════════════════════════

export interface ClassCombatTree {
  classId: string;
  className: string;
  classIcon: string;
  description: string;
  skills: WeaponSkillOption[];
}

export const CLASS_COMBAT_TREES: Record<string, ClassCombatTree> = {

  // ── WARRIOR: Off-Hand & 2H Battle UI ─────────────────────────────────
  // Warriors can 1-hand 2H weapons or dual-wield. This tree provides
  // stance-based combat abilities for their off-hand and 2H grip options.
  WARRIOR_BATTLE: {
    classId: "WARRIOR_BATTLE",
    className: "Warrior Battle Stance",
    classIcon: "⚔️",
    description: "Warrior off-hand combat and 2H grip options. Toggle between Sword+Shield, Dual Wield, and 2H Grip stances for different combat bonuses.",
    skills: [
      // Stances
      { id: "war_stance_shield", name: "Shield Stance", description: "Equip off-hand shield: +Block, +DR, enables Shield skills", icon: "🛡️", tier: 1, damage: 0, cooldown: 1.5, effects: ["Stance", "+30% Block", "+15% DR"] },
      { id: "war_stance_dual", name: "Dual Wield Stance", description: "Dual wield: +Attack Speed, +Dmg, off-hand attacks", icon: "⚔️", tier: 1, damage: 0, cooldown: 1.5, effects: ["Stance", "+30% Atk Speed", "Off-Hand Attacks"] },
      { id: "war_stance_2h", name: "2H Grip Stance", description: "Two-hand grip: +Cleave range, +Crit Dmg, slower", icon: "🗡️", tier: 1, damage: 0, cooldown: 1.5, effects: ["Stance", "+40% Crit Dmg", "+1m Cleave", "-15% Speed"] },
      // Off-hand passives / abilities
      { id: "war_shield_block", name: "Shield Block", description: "Active block with shield equipped", icon: "🛡️", tier: 1, damage: 0, cooldown: 10, effects: ["Block 100% 2s", "Requires Shield"] },
      { id: "war_shield_throw", name: "Shield Throw", description: "Throw shield, bounces to 3 targets", icon: "💫", tier: 2, damage: 50, cooldown: 12, effects: ["Bounce 3", "Range 15m", "Stun 0.5s"] },
      { id: "war_off_hand_strike", name: "Off-Hand Strike", description: "Extra off-hand attack in Dual Wield", icon: "✊", tier: 2, damage: 40, cooldown: 4, effects: ["Only Dual Wield", "+Bleed"] },
      { id: "war_mighty_swing", name: "Mighty Swing", description: "Empowered 2H swing, wide arc", icon: "💪", tier: 2, damage: 90, cooldown: 6, effects: ["Only 2H Grip", "180° Arc"] },
      { id: "war_last_stand", name: "Last Stand", description: "Temporary max HP boost", icon: "❤️", tier: 3, damage: 0, cooldown: 60, effects: ["+40% Max HP 8s"] },
      { id: "war_rallying_cry", name: "Rallying Cry", description: "Party HP boost + heal", icon: "📯", tier: 3, damage: 0, cooldown: 90, effects: ["+15% Party HP 10s", "Heal 10%"] },
      { id: "war_avatar", name: "Avatar", description: "Remove all CC, immune to CC, +Dmg", icon: "👹", tier: 4, damage: 0, cooldown: 90, effects: ["Break CC", "Immune CC 8s", "+20% Dmg"] },
    ]
  },

  // ── MAGE: Wand Arcane UI ──────────────────────────────────────────────
  // Mage-specific class abilities that extend the wand's utility slots.
  // These are learned from the Mage class tree, not from the wand itself.
  MAGE_ARCANE: {
    classId: "MAGE_ARCANE",
    className: "Mage Arcane Mastery",
    classIcon: "✨",
    description: "Mage class tree for wand users. Unlocks spell schools, crafting recipe discoveries, and arcane passives.",
    skills: [
      // School specializations
      { id: "mage_fire_mastery", name: "Fire Mastery", description: "Unlock fire spell recipes, +20% fire damage", icon: "🔥", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "+20% Fire Dmg", "Unlock Fire Recipes"] },
      { id: "mage_frost_mastery", name: "Frost Mastery", description: "Unlock frost spell recipes, +20% frost damage", icon: "❄️", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "+20% Frost Dmg", "Unlock Frost Recipes"] },
      { id: "mage_arcane_mastery", name: "Arcane Mastery", description: "Unlock arcane spell recipes, +20% arcane damage", icon: "💜", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "+20% Arcane Dmg", "Unlock Arcane Recipes"] },
      { id: "mage_holy_mastery", name: "Holy Mastery", description: "Unlock holy spell recipes, +20% healing", icon: "💛", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "+20% Healing", "Unlock Holy Recipes"] },
      // Passives
      { id: "mage_spell_crit", name: "Spell Critical", description: "+15% spell crit chance", icon: "⚡", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "+15% Spell Crit"] },
      { id: "mage_mana_efficiency", name: "Mana Efficiency", description: "-15% mana cost on all spells", icon: "💧", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "-15% Mana Cost"] },
      { id: "mage_clearcasting", name: "Clearcasting", description: "10% chance: next spell costs no mana", icon: "✨", tier: 3, damage: 0, cooldown: 0, effects: ["Passive", "10% Proc", "Free Cast"] },
      { id: "mage_recipe_discovery", name: "Recipe Discovery", description: "Chance to discover new spell recipes when crafting", icon: "📜", tier: 3, damage: 0, cooldown: 0, effects: ["Passive", "5% Discovery Chance"] },
      // Actives (supplement utility slots)
      { id: "mage_mirror_image", name: "Mirror Image", description: "Create 3 decoy copies", icon: "👥", tier: 3, damage: 0, cooldown: 90, effects: ["3 Copies 15s", "Split Aggro"] },
      { id: "mage_combustion", name: "Combustion", description: "+100% spell crit for 10s", icon: "🔥", tier: 4, damage: 0, cooldown: 120, effects: ["+100% Spell Crit 10s"] },
    ]
  },

  // ── RANGER: Quick Fingers UI ──────────────────────────────────────────
  // Ranger-specific tree for ranged weapon bonuses and quick-swap choices.
  // Provides passive bonuses and active abilities for bow/crossbow/gun users.
  RANGER_QUICK_FINGERS: {
    classId: "RANGER_QUICK_FINGERS",
    className: "Ranger Quick Fingers",
    classIcon: "🏹",
    description: "Ranger class tree for ranged combat. Quick-swap bonuses, ammo types, and precision passives.",
    skills: [
      // Ammo type selections (toggle)
      { id: "ranger_ammo_standard", name: "Standard Ammo", description: "Normal projectiles, no bonus", icon: "➡️", tier: 1, damage: 0, cooldown: 0, effects: ["Toggle", "No Bonus"] },
      { id: "ranger_ammo_fire", name: "Fire Ammo", description: "All ranged attacks apply burn", icon: "🔥", tier: 2, damage: 0, cooldown: 0, effects: ["Toggle", "All Shots Burn 3s"] },
      { id: "ranger_ammo_frost", name: "Frost Ammo", description: "All ranged attacks slow", icon: "❄️", tier: 2, damage: 0, cooldown: 0, effects: ["Toggle", "All Shots Slow 20%"] },
      { id: "ranger_ammo_poison", name: "Poison Ammo", description: "All ranged attacks poison", icon: "☠️", tier: 2, damage: 0, cooldown: 0, effects: ["Toggle", "All Shots Poison 4s"] },
      { id: "ranger_ammo_explosive", name: "Explosive Ammo", description: "All ranged attacks have small AoE", icon: "💥", tier: 3, damage: 0, cooldown: 0, effects: ["Toggle", "All Shots AoE 2m", "-20% Atk Speed"] },
      // Passives
      { id: "ranger_steady_aim", name: "Steady Aim", description: "+10% ranged damage when standing still", icon: "🎯", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "+10% Dmg Stationary"] },
      { id: "ranger_quick_reload", name: "Quick Reload", description: "+20% attack speed for ranged weapons", icon: "⚡", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "+20% Atk Speed Ranged"] },
      { id: "ranger_eagle_eye", name: "Eagle Eye", description: "+10m range on all ranged attacks", icon: "🦅", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "+10m Range"] },
      { id: "ranger_lethal_shots", name: "Lethal Shots", description: "Crits deal +30% damage", icon: "💀", tier: 3, damage: 0, cooldown: 0, effects: ["Passive", "+30% Crit Dmg"] },
      // Actives
      { id: "ranger_quick_swap", name: "Quick Swap", description: "Instantly swap between two ranged weapons", icon: "🔄", tier: 1, damage: 0, cooldown: 1, effects: ["Swap Weapon", "No GCD"] },
      { id: "ranger_disengage", name: "Disengage", description: "Leap backward 8m", icon: "💨", tier: 1, damage: 0, cooldown: 15, effects: ["Leap Back 8m", "Drop Trap"] },
      { id: "ranger_aspect_hawk", name: "Aspect of the Hawk", description: "+25% ranged damage buff", icon: "🦅", tier: 2, damage: 0, cooldown: 0, effects: ["Toggle", "+25% Ranged Dmg", "-10% Melee Dmg"] },
      { id: "ranger_aspect_cheetah", name: "Aspect of the Cheetah", description: "+30% movement speed", icon: "🐆", tier: 2, damage: 0, cooldown: 0, effects: ["Toggle", "+30% Speed", "Daze on Hit"] },
      { id: "ranger_trueshot_aura", name: "Trueshot Aura", description: "Party ranged damage buff", icon: "🎯", tier: 3, damage: 0, cooldown: 120, effects: ["+15% Party Ranged Dmg 20s"] },
      { id: "ranger_rapid_fire", name: "Rapid Fire", description: "Channel: fire shots at max speed", icon: "⚡", tier: 4, damage: 30, cooldown: 90, effects: ["Channel 3s", "10 Shots", "+100% Speed"] },
    ]
  },

  // ── WORGE: Grimoire Mastery ────────────────────────────────────────────
  // Worge class tree that enhances Grimoire forms and unlocks form talents.
  WORGE_GRIMOIRE: {
    classId: "WORGE_GRIMOIRE",
    className: "Worge Grimoire Mastery",
    classIcon: "📗",
    description: "Worge class tree. Enhances Bear/Raptor/Bird forms, unlocks form-specific talents, and improves shapeshift speed.",
    skills: [
      // Form enhancements
      { id: "worge_thick_hide", name: "Thick Hide", description: "Bear Form: +20% additional armor", icon: "🐻", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "Bear Only", "+20% Armor"] },
      { id: "worge_savage_fury", name: "Savage Fury", description: "Raptor Form: +20% crit damage", icon: "🦎", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "Raptor Only", "+20% Crit Dmg"] },
      { id: "worge_swift_flight", name: "Swift Flight", description: "Bird Form: +30% flight speed", icon: "🦅", tier: 1, damage: 0, cooldown: 0, effects: ["Passive", "Bird Only", "+30% Flight Speed"] },
      { id: "worge_heart_of_the_wild", name: "Heart of the Wild", description: "Off-form stats partially carry over", icon: "💚", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "30% Off-Form Stats"] },
      { id: "worge_primal_fury", name: "Primal Fury", description: "Gain extra combo/rage on crit", icon: "😤", tier: 2, damage: 0, cooldown: 0, effects: ["Passive", "+1 Resource on Crit"] },
      { id: "worge_swift_shift", name: "Swift Shift", description: "Shifting costs no GCD", icon: "💨", tier: 3, damage: 0, cooldown: 0, effects: ["Passive", "No GCD on Shift"] },
      { id: "worge_predatory_swiftness", name: "Predatory Swiftness", description: "Finishing move grants instant spell", icon: "⚡", tier: 3, damage: 0, cooldown: 0, effects: ["Passive", "Free Heal/Root after Finisher"] },
      // Ultimate forms
      { id: "worge_berserk", name: "Berserk", description: "Bear: -50% ability cooldowns 15s", icon: "🐻", tier: 4, damage: 0, cooldown: 180, effects: ["Bear Only", "-50% CDs 15s"] },
      { id: "worge_tigers_fury", name: "Tiger's Fury", description: "Raptor: +50% damage 10s", icon: "🦎", tier: 4, damage: 0, cooldown: 120, effects: ["Raptor Only", "+50% Dmg 10s"] },
    ]
  },
};

export function getWeaponTypeDefinition(weaponType: string): WeaponTypeDefinition | undefined {
  return WEAPON_TYPE_DEFINITIONS[weaponType.toUpperCase()];
}

export function getSkillById(weaponType: string, skillId: string): WeaponSkillOption | undefined {
  const weapon = getWeaponTypeDefinition(weaponType);
  if (!weapon) return undefined;
  
  for (const slot of weapon.slots) {
    const skill = slot.skills.find(s => s.id === skillId);
    if (skill) return skill;
  }
  return undefined;
}

export function getAvailableSkillsForTier(weaponType: string, slotType: SlotType, playerTier: number): WeaponSkillOption[] {
  const weapon = getWeaponTypeDefinition(weaponType);
  if (!weapon) return [];
  
  const slot = weapon.slots.find(s => s.type === slotType);
  if (!slot || playerTier < slot.unlockTier) return [];
  
  return slot.skills.filter(skill => skill.tier <= playerTier);
}
