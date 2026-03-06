export type SlotType = 'primary' | 'secondary' | 'ability' | 'ultimate';

export interface WeaponSkillOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  damage: number;
  cooldown: number;
  effects: string[];
}

export interface SkillSlot {
  type: SlotType;
  unlockTier: number;
  label: string;
  skills: WeaponSkillOption[];
}

export interface WeaponTypeDefinition {
  id: string;
  name: string;
  icon: string;
  slots: SkillSlot[];
}

export interface SelectedSkills {
  primary: string | null;
  secondary: string | null;
  ability: string | null;
  ultimate: string | null;
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
  }
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
