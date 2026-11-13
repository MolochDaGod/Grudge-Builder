/* ObjectStore SSOT companion for /skill-tree.html.
 * Generated from live api/v1 (classes.json, master-skillTrees.json,
 * class-skill-bridges.json, play-classes.json). Do not invent values.
 * Does not overwrite warrior/mage/ranger/worg from class-skill-trees.js.
 */
window.GRUDGE_SSOT_CLASS_INFO = {
  "id": "grudge-ssot-class-info",
  "source": {
    "classes": "https://objectstore.grudge-studio.com/api/v1/classes.json",
    "skillTrees": "https://objectstore.grudge-studio.com/api/v1/master-skillTrees.json",
    "level0": "https://objectstore.grudge-studio.com/api/v1/class-skill-bridges.json",
    "playClasses": "https://objectstore.grudge-studio.com/api/v1/play-classes.json",
    "note": "Only classes absent from shared/definitions/classSkillTrees.ts are given trees here (priest, raider, thief, verduror). warrior/mage/ranger/worg are left to the Grudge-Builder pack because they conflict with ObjectStore — see the PR Conflicts table."
  },
  "playOrder": [
    "warrior",
    "raider",
    "mage",
    "priest",
    "ranger",
    "thief",
    "worg",
    "verduror"
  ],
  "dossier": {
    "warrior": {
      "id": "warrior",
      "name": "Warrior",
      "family": null,
      "emoji": "⚔️",
      "color": "#ef4444",
      "icon": "/icons/warlords/classes/warrior.png",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/warrior.png",
      "description": "A fearless frontline fighter specializing in raw power and defense.",
      "lore": "Forged in the crucible of the Grudge Wars, Warriors are the backbone of any warband. Their strength and endurance are unmatched on the battlefield.",
      "startingAttributes": {
        "Strength": 5,
        "Vitality": 3,
        "Endurance": 2,
        "Dexterity": 1,
        "Agility": 1,
        "Intellect": 0,
        "Wisdom": 0,
        "Tactics": 0
      },
      "signatureAbility": "w_l0_warbound",
      "level0Name": "Warbound",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "mage": {
      "id": "mage",
      "name": "Mage",
      "family": null,
      "emoji": "🔮",
      "color": "#8b5cf6",
      "icon": "/icons/warlords/classes/mage.png",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/mage.png",
      "description": "Master of arcane magic and divine healing arts.",
      "lore": "Drawing power from ancient ley lines and forgotten gods, Mage Priests wield destructive magic alongside sacred healing — a balance few can master.",
      "startingAttributes": {
        "Strength": 0,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 0,
        "Agility": 0,
        "Intellect": 5,
        "Wisdom": 4,
        "Tactics": 1
      },
      "signatureAbility": "m_l0_leyline",
      "level0Name": "Leyline",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "worge": {
      "id": "worge",
      "name": "Worge",
      "family": null,
      "emoji": "🐺",
      "color": "#d97706",
      "icon": "/icons/warlords/classes/worge.png",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/worge.png",
      "description": "A shapeshifter who wields nature and storm magic in human form, then transforms into a devastating beast.",
      "lore": "Worges walk between worlds — scholars of storm and root in mortal guise, unstoppable predators in beast form. Their mace and dagger channel primal energies until the wild within is unleashed.",
      "startingAttributes": {
        "Strength": 2,
        "Vitality": 2,
        "Endurance": 1,
        "Dexterity": 2,
        "Agility": 2,
        "Intellect": 2,
        "Wisdom": 1,
        "Tactics": 0
      },
      "signatureAbility": "wr_l0_bear",
      "level0Name": "Bear Form",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "ranger": {
      "id": "ranger",
      "name": "Ranger",
      "family": null,
      "emoji": "🏹",
      "color": "#22c55e",
      "icon": "/icons/warlords/classes/ranger.png",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/ranger.png",
      "description": "A deadly marksman with precise long-range attacks.",
      "lore": "Silent and patient, Rangers strike from the shadows with lethal precision. Their arrows find gaps in even the thickest armor.",
      "startingAttributes": {
        "Strength": 1,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 4,
        "Agility": 3,
        "Intellect": 1,
        "Wisdom": 0,
        "Tactics": 1
      },
      "signatureAbility": "r_l0_log",
      "level0Name": "Trail Log",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "priest": {
      "id": "priest",
      "name": "Priest",
      "family": "mage",
      "emoji": "✚",
      "color": "#fde68a",
      "icon": "/icons/warlords/classes/priest.jpg",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/priest.jpg",
      "description": "Discipline healer — Atonement from damage, shields, mass dispel, pain reflect.",
      "lore": "Priests bind an ally and turn every holy bolt into a heal. They strip hexes, plant barriers before slams, and reflect pain back as light.",
      "startingAttributes": {
        "Strength": 0,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 0,
        "Agility": 0,
        "Intellect": 2,
        "Wisdom": 5,
        "Tactics": 1
      },
      "signatureAbility": "p_l0_dawnvow",
      "level0Name": "Dawn Vow",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "raider": {
      "id": "raider",
      "name": "Raider",
      "family": "warrior",
      "emoji": "⚔",
      "color": "#b91c1c",
      "icon": "/icons/warlords/classes/raider.jpg",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/raider.jpg",
      "description": "Two-hand parry tank and execute DPS. Timing is the armor.",
      "lore": "Raiders dropped the shield. Every swing opens a parry window; a catch becomes Overpower. They offtank slams and cut healing in the arena.",
      "startingAttributes": {
        "Strength": 5,
        "Vitality": 2,
        "Endurance": 2,
        "Dexterity": 2,
        "Agility": 1,
        "Intellect": 0,
        "Wisdom": 0,
        "Tactics": 0
      },
      "signatureAbility": "rd_l0_bloodbound",
      "level0Name": "Bloodbound",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "thief": {
      "id": "thief",
      "name": "Thief",
      "family": "ranger",
      "emoji": "🗡",
      "color": "#ca8a04",
      "icon": "/icons/warlords/classes/thief.jpg",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/thief.jpg",
      "description": "Outlaw rogue — combo, pistol interrupt, blade flurry, smoke bomb peel.",
      "lore": "Thieves fight dirty and close. A pistol shot stops a cast; a smoke bomb covers the healer; Between the Eyes spends the combo.",
      "startingAttributes": {
        "Strength": 1,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 4,
        "Agility": 4,
        "Intellect": 0,
        "Wisdom": 0,
        "Tactics": 1
      },
      "signatureAbility": "t_l0_nightlog",
      "level0Name": "Night Log",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    },
    "verduror": {
      "id": "verduror",
      "name": "Verduror",
      "family": "worge",
      "emoji": "🌿",
      "color": "#86efac",
      "icon": "/icons/warlords/classes/verduror.jpg",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/verduror.jpg",
      "description": "Plant caster — oxygen seeds, vine lash, iguana crawl. Arcanum pages are cactus and Green Tara, found like spells.",
      "lore": "Verduror drop living plants. Iguana is a level 0 skill, not a form. The Arcanum opens on Barrel Cactus; Green Tara is the heal mantra.",
      "startingAttributes": {
        "Strength": 1,
        "Vitality": 2,
        "Endurance": 1,
        "Dexterity": 1,
        "Agility": 2,
        "Intellect": 1,
        "Wisdom": 3,
        "Tactics": 0
      },
      "signatureAbility": "v_l0_groveroot",
      "level0Name": "Grove Root",
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json"
    }
  },
  "classes": {
    "priest": {
      "classId": "priest",
      "className": "Priest",
      "classIcon": "/icons/warlords/classes/priest.jpg",
      "family": "mage",
      "color": "#fde68a",
      "emoji": "✚",
      "description": "Discipline healer — Atonement from damage, shields, mass dispel, pain reflect.",
      "lore": "Priests bind an ally and turn every holy bolt into a heal. They strip hexes, plant barriers before slams, and reflect pain back as light.",
      "startingAttributes": {
        "Strength": 0,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 0,
        "Agility": 0,
        "Intellect": 2,
        "Wisdom": 5,
        "Tactics": 1
      },
      "source": "objectstore:api/v1/classes.json + master-skillTrees.json + class-skill-bridges.json",
      "pickMode": "catalog",
      "specialAbility": {
        "id": "p_l0_dawnvow",
        "name": "Dawn Vow",
        "description": "Canticle starter. Faith on the avatar (F).",
        "icon": "/game-assets/icons/skills/class/bloodmage/bloodmage_01.png",
        "effectType": "passive",
        "effects": [
          "+6 Wisdom"
        ],
        "effect": "+6 Wisdom",
        "bonuses": {
          "wisdom": 6
        }
      },
      "tiers": [
        {
          "level": 1,
          "tierName": "Level 1 - Rites",
          "description": "Required level 1 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "p_atonement",
              "name": "Atonement",
              "description": "Damage you deal heals the bonded ally",
              "icon": "/icons/skill_nobg/Paladinskill_01_nobg.png",
              "effectType": "passive",
              "effects": [
                "40% of damage as heal"
              ],
              "maxPoints": 1,
              "effect": "40% of damage as heal"
            },
            {
              "id": "p_smite",
              "name": "Smite",
              "description": "Holy bolt. Feeds Atonement",
              "icon": "/icons/skill_nobg/Paladinskill_02_nobg.png",
              "effectType": "active",
              "effects": [
                "Holy damage"
              ],
              "maxPoints": 3,
              "effect": "Holy damage"
            },
            {
              "id": "p_flash_mend",
              "name": "Flash Mend",
              "description": "Instant emergency heal",
              "icon": "/icons/skill_nobg/Paladinskill_03_nobg.png",
              "effectType": "active",
              "effects": [
                "28% HP"
              ],
              "maxPoints": 3,
              "effect": "28% HP"
            }
          ]
        },
        {
          "level": 5,
          "tierName": "Level 5 - Wards",
          "description": "Required level 5 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "p_pw_shield",
              "name": "Word Shield",
              "description": "Absorb shield. Atonement ticks through it",
              "icon": "/icons/skill_nobg/Paladinskill_23_nobg.png",
              "effectType": "active",
              "effects": [
                "22% absorb 8s"
              ],
              "maxPoints": 3,
              "effect": "22% absorb 8s"
            },
            {
              "id": "p_purify",
              "name": "Purify",
              "description": "Dispel 2 magic, poison, or curse",
              "icon": "/icons/skill_nobg/Paladinskill_05_nobg.png",
              "effectType": "active",
              "effects": [
                "2 dispels"
              ],
              "maxPoints": 3,
              "effect": "2 dispels"
            }
          ]
        },
        {
          "level": 10,
          "tierName": "Level 10 - Discipline",
          "description": "Required level 10 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "p_pain_reflect",
              "name": "Pain Reflect",
              "description": "Ally takes less. Damage returns as heal and thorns",
              "icon": "/icons/skill_nobg/Paladinskill_08_nobg.png",
              "effectType": "active",
              "effects": [
                "30% taken down, 40% reflect"
              ],
              "maxPoints": 3,
              "effect": "30% taken down, 40% reflect"
            },
            {
              "id": "p_mass_dispel",
              "name": "Mass Dispel",
              "description": "AoE purge allies and enemies",
              "icon": "/icons/skill_nobg/Paladinskill_09_nobg.png",
              "effectType": "active",
              "effects": [
                "Strip 1 magic each"
              ],
              "maxPoints": 2,
              "effect": "Strip 1 magic each"
            },
            {
              "id": "p_barrier",
              "name": "Barrier Dome",
              "description": "Party bubble before a slam",
              "icon": "/icons/skill_nobg/Paladinskill_10_nobg.png",
              "effectType": "active",
              "effects": [
                "35% absorb 8s"
              ],
              "maxPoints": 2,
              "effect": "35% absorb 8s"
            }
          ]
        },
        {
          "level": 15,
          "tierName": "Level 15 - Mastery",
          "description": "Required level 15 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "p_evangelism",
              "name": "Evangelism",
              "description": "Extend Atonement. Healing from damage up",
              "icon": "/icons/skill_nobg/Paladinskill_12_nobg.png",
              "effectType": "active",
              "effects": [
                "+25% heal 8s"
              ],
              "maxPoints": 2,
              "effect": "+25% heal 8s"
            },
            {
              "id": "p_spirit_shell",
              "name": "Spirit Shell",
              "description": "Heals become absorbs",
              "icon": "/icons/skill_nobg/Paladinskill_13_nobg.png",
              "effectType": "active",
              "effects": [
                "10s"
              ],
              "maxPoints": 2,
              "effect": "10s"
            }
          ]
        },
        {
          "level": 20,
          "tierName": "Level 20 - Legendary Faith",
          "description": "Required level 20 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "p_rapture",
              "name": "Rapture",
              "description": "Shields bloom. Party immune 3s",
              "icon": "/icons/skill_nobg/Paladinskill_16_nobg.png",
              "effectType": "active",
              "effects": [
                "Ultimate"
              ],
              "maxPoints": 1,
              "effect": "Ultimate"
            },
            {
              "id": "p_penance",
              "name": "Penance",
              "description": "3 holy ticks damage or heal, each feeding Atonement",
              "icon": "/icons/skill_nobg/Paladinskill_17_nobg.png",
              "effectType": "active",
              "effects": [
                "Channel 3 ticks"
              ],
              "maxPoints": 1,
              "effect": "Channel 3 ticks"
            }
          ]
        }
      ]
    },
    "raider": {
      "classId": "raider",
      "className": "Raider",
      "classIcon": "/icons/warlords/classes/raider.jpg",
      "family": "warrior",
      "color": "#b91c1c",
      "emoji": "⚔",
      "description": "Two-hand parry tank and execute DPS. Timing is the armor.",
      "lore": "Raiders dropped the shield. Every swing opens a parry window; a catch becomes Overpower. They offtank slams and cut healing in the arena.",
      "startingAttributes": {
        "Strength": 5,
        "Vitality": 2,
        "Endurance": 2,
        "Dexterity": 2,
        "Agility": 1,
        "Intellect": 0,
        "Wisdom": 0,
        "Tactics": 0
      },
      "source": "objectstore:api/v1/classes.json + master-skillTrees.json + class-skill-bridges.json",
      "pickMode": "catalog",
      "specialAbility": {
        "id": "rd_l0_bloodbound",
        "name": "Bloodbound",
        "description": "Cleaver-line starter. Fury on the avatar (F).",
        "icon": "/game-assets/icons/skills/class/barbarian/barbarian_01.png",
        "effectType": "passive",
        "effects": [
          "+4 Strength"
        ],
        "effect": "+4 Strength",
        "bonuses": {
          "strength": 4
        }
      },
      "tiers": [
        {
          "level": 1,
          "tierName": "Level 1 - Two-Hand School",
          "description": "Required level 1 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "rd_riposte",
              "name": "Riposte Stance",
              "description": "Every 2H swing opens a parry window",
              "icon": "/icons/skill_nobg/Warriorskill_01_nobg.png",
              "effectType": "passive",
              "effects": [
                "Parry 0.35s"
              ],
              "maxPoints": 1,
              "effect": "Parry 0.35s"
            },
            {
              "id": "rd_overpower",
              "name": "Overpower",
              "description": "Cannot miss after a parry",
              "icon": "/icons/skill_nobg/Warriorskill_02_nobg.png",
              "effectType": "active",
              "effects": [
                "2H follow-up"
              ],
              "maxPoints": 3,
              "effect": "2H follow-up"
            },
            {
              "id": "rd_rend",
              "name": "Rend",
              "description": "2H bleed DoT",
              "icon": "/icons/skill_nobg/Warriorskill_03_nobg.png",
              "effectType": "active",
              "effects": [
                "Bleed 8s"
              ],
              "maxPoints": 3,
              "effect": "Bleed 8s"
            }
          ]
        },
        {
          "level": 5,
          "tierName": "Level 5 - Specialization",
          "description": "Required level 5 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "rd_sweeping",
              "name": "Sweeping Strikes",
              "description": "Next 5 hits cleave",
              "icon": "/icons/skill_nobg/Warriorskill_04_nobg.png",
              "effectType": "active",
              "effects": [
                "Pack tank"
              ],
              "maxPoints": 3,
              "effect": "Pack tank"
            },
            {
              "id": "rd_iron_parry",
              "name": "Iron Parry",
              "description": "Parry chance up. Absorb per parry",
              "icon": "/icons/skill_nobg/Warriorskill_05_nobg.png",
              "effectType": "passive",
              "effects": [
                "+12% parry"
              ],
              "maxPoints": 3,
              "effect": "+12% parry"
            }
          ]
        },
        {
          "level": 10,
          "tierName": "Level 10 - Advanced Combat",
          "description": "Required level 10 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "rd_mortal",
              "name": "Mortal Strike",
              "description": "Healing received cut 50%",
              "icon": "/icons/skill_nobg/Warriorskill_06_nobg.png",
              "effectType": "active",
              "effects": [
                "PvP pressure"
              ],
              "maxPoints": 3,
              "effect": "PvP pressure"
            },
            {
              "id": "rd_die_by_sword",
              "name": "Die by the Sword",
              "description": "Parry and dodge doubled 8s",
              "icon": "/icons/skill_nobg/Warriorskill_07_nobg.png",
              "effectType": "active",
              "effects": [
                "Last stand window"
              ],
              "maxPoints": 2,
              "effect": "Last stand window"
            },
            {
              "id": "rd_charge",
              "name": "Charge",
              "description": "Gap close. Opens Riposte",
              "icon": "/icons/skill_nobg/Warriorskill_08_nobg.png",
              "effectType": "active",
              "effects": [
                "12y root 1s"
              ],
              "maxPoints": 2,
              "effect": "12y root 1s"
            }
          ]
        },
        {
          "level": 15,
          "tierName": "Level 15 - Master Raider",
          "description": "Required level 15 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "rd_colossus",
              "name": "Colossus Smash",
              "description": "Armor break 8s",
              "icon": "/icons/skill_nobg/Warriorskill_09_nobg.png",
              "effectType": "active",
              "effects": [
                "-30% armor"
              ],
              "maxPoints": 2,
              "effect": "-30% armor"
            },
            {
              "id": "rd_bladestorm",
              "name": "Bladestorm",
              "description": "Spin 4s. Parry still works",
              "icon": "/icons/skill_nobg/Warriorskill_10_nobg.png",
              "effectType": "active",
              "effects": [
                "4m AoE"
              ],
              "maxPoints": 2,
              "effect": "4m AoE"
            }
          ]
        },
        {
          "level": 20,
          "tierName": "Level 20 - Legendary Raider",
          "description": "Required level 20 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "rd_recklessness",
              "name": "Recklessness",
              "description": "All 2H hits crit. Parry stays open",
              "icon": "/icons/skill_nobg/Warriorskill_11_nobg.png",
              "effectType": "active",
              "effects": [
                "12s"
              ],
              "maxPoints": 1,
              "effect": "12s"
            },
            {
              "id": "rd_last_stand",
              "name": "Last Stand",
              "description": "+30% HP. Parry refunds heal",
              "icon": "/icons/skill_nobg/Warriorskill_12_nobg.png",
              "effectType": "active",
              "effects": [
                "2H tank ult"
              ],
              "maxPoints": 1,
              "effect": "2H tank ult"
            }
          ]
        }
      ]
    },
    "thief": {
      "classId": "thief",
      "className": "Thief",
      "classIcon": "/icons/warlords/classes/thief.jpg",
      "family": "ranger",
      "color": "#ca8a04",
      "emoji": "🗡",
      "description": "Outlaw rogue — combo, pistol interrupt, blade flurry, smoke bomb peel.",
      "lore": "Thieves fight dirty and close. A pistol shot stops a cast; a smoke bomb covers the healer; Between the Eyes spends the combo.",
      "startingAttributes": {
        "Strength": 1,
        "Vitality": 1,
        "Endurance": 1,
        "Dexterity": 4,
        "Agility": 4,
        "Intellect": 0,
        "Wisdom": 0,
        "Tactics": 1
      },
      "source": "objectstore:api/v1/classes.json + master-skillTrees.json + class-skill-bridges.json",
      "pickMode": "catalog",
      "specialAbility": {
        "id": "t_l0_nightlog",
        "name": "Night Log",
        "description": "Knife-line starter. Edge on the avatar (F).",
        "icon": "/game-assets/icons/skills/class/thief/thief_01.png",
        "effectType": "passive",
        "effects": [
          "+3 Agility"
        ],
        "effect": "+3 Agility",
        "bonuses": {
          "agility": 3
        }
      },
      "tiers": [
        {
          "level": 1,
          "tierName": "Level 1 - Outlaw Basics",
          "description": "Required level 1 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "t_between",
              "name": "Between the Eyes",
              "description": "Combo finisher stun + crit",
              "icon": "/icons/skill_nobg/Archerskill_01_nobg.png",
              "effectType": "active",
              "effects": [
                "Spend combo"
              ],
              "maxPoints": 1,
              "effect": "Spend combo"
            },
            {
              "id": "t_sinister",
              "name": "Sinister Strike",
              "description": "Combo builder",
              "icon": "/icons/skill_nobg/Archerskill_02_nobg.png",
              "effectType": "active",
              "effects": [
                "+1 combo"
              ],
              "maxPoints": 3,
              "effect": "+1 combo"
            },
            {
              "id": "t_pistol",
              "name": "Pistol Shot",
              "description": "Ranged interrupt",
              "icon": "/icons/skill_nobg/Archerskill_03_nobg.png",
              "effectType": "active",
              "effects": [
                "12y interrupt"
              ],
              "maxPoints": 3,
              "effect": "12y interrupt"
            }
          ]
        },
        {
          "level": 5,
          "tierName": "Level 5 - Specialization",
          "description": "Required level 5 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "t_blade_flurry",
              "name": "Blade Flurry",
              "description": "Melee hits splash nearby foes",
              "icon": "/icons/skill_nobg/Archerskill_04_nobg.png",
              "effectType": "active",
              "effects": [
                "40% splash 10s"
              ],
              "maxPoints": 3,
              "effect": "40% splash 10s"
            },
            {
              "id": "t_grapple",
              "name": "Grappling Hook",
              "description": "Pull to a point or target",
              "icon": "/icons/skill_nobg/Archerskill_05_nobg.png",
              "effectType": "active",
              "effects": [
                "14y"
              ],
              "maxPoints": 2,
              "effect": "14y"
            }
          ]
        },
        {
          "level": 10,
          "tierName": "Level 10 - Advanced Outlaw",
          "description": "Required level 10 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "t_roll",
              "name": "Roll the Bones",
              "description": "Random combat buff table",
              "icon": "/icons/skill_nobg/Archerskill_06_nobg.png",
              "effectType": "active",
              "effects": [
                "20s"
              ],
              "maxPoints": 3,
              "effect": "20s"
            },
            {
              "id": "t_kidney",
              "name": "Kidney Shot",
              "description": "Combo stun",
              "icon": "/icons/skill_nobg/Archerskill_07_nobg.png",
              "effectType": "active",
              "effects": [
                "1–4s"
              ],
              "maxPoints": 2,
              "effect": "1–4s"
            },
            {
              "id": "t_smoke",
              "name": "Smoke Bomb",
              "description": "Targeted spells miss inside",
              "icon": "/icons/skill_nobg/Archerskill_08_nobg.png",
              "effectType": "active",
              "effects": [
                "5s 5m"
              ],
              "maxPoints": 2,
              "effect": "5s 5m"
            }
          ]
        },
        {
          "level": 15,
          "tierName": "Level 15 - Master Thief",
          "description": "Required level 15 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "t_adrenaline",
              "name": "Adrenaline Rush",
              "description": "Combo generation doubled",
              "icon": "/icons/skill_nobg/Archerskill_09_nobg.png",
              "effectType": "active",
              "effects": [
                "10s"
              ],
              "maxPoints": 2,
              "effect": "10s"
            },
            {
              "id": "t_vanish",
              "name": "Vanish",
              "description": "Drop combat. Next strike crits",
              "icon": "/icons/skill_nobg/Archerskill_10_nobg.png",
              "effectType": "active",
              "effects": [
                "4s stealth"
              ],
              "maxPoints": 2,
              "effect": "4s stealth"
            }
          ]
        },
        {
          "level": 20,
          "tierName": "Level 20 - Legendary Outlaw",
          "description": "Required level 20 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "t_killing_spree",
              "name": "Killing Spree",
              "description": "Seven teleport hits",
              "icon": "/icons/skill_nobg/Archerskill_11_nobg.png",
              "effectType": "active",
              "effects": [
                "Immune while dashing"
              ],
              "maxPoints": 1,
              "effect": "Immune while dashing"
            },
            {
              "id": "t_dreadblades",
              "name": "Dreadblades",
              "description": "Combo spenders cost nothing",
              "icon": "/icons/skill_nobg/Archerskill_12_nobg.png",
              "effectType": "active",
              "effects": [
                "12s"
              ],
              "maxPoints": 1,
              "effect": "12s"
            }
          ]
        }
      ]
    },
    "verduror": {
      "classId": "verduror",
      "className": "Verduror",
      "classIcon": "/icons/warlords/classes/verduror.jpg",
      "family": "worge",
      "color": "#86efac",
      "emoji": "🌿",
      "description": "Plant caster — oxygen seeds, vine lash, iguana crawl. Arcanum pages are cactus and Green Tara, found like spells.",
      "lore": "Verduror drop living plants. Iguana is a level 0 skill, not a form. The Arcanum opens on Barrel Cactus; Green Tara is the heal mantra.",
      "startingAttributes": {
        "Strength": 1,
        "Vitality": 2,
        "Endurance": 1,
        "Dexterity": 1,
        "Agility": 2,
        "Intellect": 1,
        "Wisdom": 3,
        "Tactics": 0
      },
      "source": "objectstore:api/v1/classes.json + master-skillTrees.json + class-skill-bridges.json",
      "pickMode": "catalog",
      "specialAbility": {
        "id": "v_l0_groveroot",
        "name": "Grove Root",
        "description": "Grove starter. Mist on the avatar (F).",
        "icon": "/game-assets/icons/skills/class/necromancer/necromancer_01.png",
        "effectType": "passive",
        "effects": [
          "+4 Wisdom"
        ],
        "effect": "+4 Wisdom",
        "bonuses": {
          "wisdom": 4
        }
      },
      "tiers": [
        {
          "level": 0,
          "tierName": "Level 0 - Seed",
          "description": "Required level 0 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_seed",
              "name": "Plant Seed",
              "description": "Drop an oxygen plant. It opens and heals whoever stands in the bloom.",
              "icon": "/icons/skills/class/verduror/plant-seed.png",
              "effectType": "active",
              "effects": [
                "Seed"
              ],
              "maxPoints": 3,
              "effect": "Seed",
              "cooldown": 8
            },
            {
              "id": "v_lash",
              "name": "Vine Lash",
              "description": "Lash an enemy. Allies in the whip's arc heal, and a seed drops at their feet.",
              "icon": "/icons/skills/class/verduror/vine-lash.png",
              "effectType": "active",
              "effects": [
                "Lash + seed"
              ],
              "maxPoints": 3,
              "effect": "Lash + seed",
              "cooldown": 6
            },
            {
              "id": "v_iguana",
              "name": "Iguana",
              "description": "Level 0 skill — crawl and cast. Not a form page. Nature bolts while you move.",
              "icon": "/icons/skills/class/verduror/iguana.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3
            }
          ]
        },
        {
          "level": 1,
          "tierName": "Level 1 - Sprout",
          "description": "Required level 1 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_bolt",
              "name": "Nature Bolt",
              "description": "Cast while moving. Builds wild mana for the next seed.",
              "icon": "/icons/skills/class/verduror/nature-bolt.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3
            }
          ]
        },
        {
          "level": 5,
          "tierName": "Level 5 - Grove",
          "description": "Required level 5 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_vine",
              "name": "Vine Cast",
              "description": "Root a target while you move. A seed can grow on the root.",
              "icon": "/icons/skills/class/verduror/vine-cast.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 8
            },
            {
              "id": "v_bloom",
              "name": "Seed Bloom",
              "description": "Force every planted oxygen plant to open. Pulse heal.",
              "icon": "/icons/skills/class/verduror/seed-bloom.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 12
            },
            {
              "id": "v_cactus_trap",
              "name": "Barrel Trap",
              "description": "Call the cactus page: plant a barrel cactus that swells and explodes.",
              "icon": "/icons/skills/class/verduror/barrel-cactus.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 14
            }
          ]
        },
        {
          "level": 10,
          "tierName": "Level 10 - Mantra",
          "description": "Required level 10 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_tara",
              "name": "Green Tara",
              "description": "Arcanum mantra. AOE heal in a green mandala.",
              "icon": "/icons/skills/class/verduror/green-tara.png",
              "effectType": "active",
              "effects": [
                "AOE heal"
              ],
              "maxPoints": 3,
              "effect": "AOE heal",
              "cooldown": 12
            },
            {
              "id": "v_blink",
              "name": "Slip Step",
              "description": "Short teleport. Does not need an animal page.",
              "icon": "/icons/skills/class/verduror/slip-step.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 12
            },
            {
              "id": "v_flare",
              "name": "Seedflare",
              "description": "Casting burst. Seeds in range bloom.",
              "icon": "/icons/skills/class/verduror/seed-bloom.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 10
            }
          ]
        },
        {
          "level": 15,
          "tierName": "Level 15 - Coil",
          "description": "Required level 15 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_surge",
              "name": "Wild Surge",
              "description": "Next three casts while moving are empowered.",
              "icon": "/icons/skills/class/verduror/wild-surge.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3,
              "cooldown": 14
            },
            {
              "id": "v_move_cast",
              "name": "Primal Cadence",
              "description": "Casting does not snare you. Iguana skill still crawls.",
              "icon": "/icons/skills/class/verduror/primal-cadence.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3
            },
            {
              "id": "v_grove",
              "name": "Living Grove",
              "description": "Oxygen plants, cactus traps, and Tara rings persist longer.",
              "icon": "/icons/skills/class/verduror/living-grove.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 3
            }
          ]
        },
        {
          "level": 20,
          "tierName": "Level 20 - Arcanum",
          "description": "Required level 20 (master-skillTrees.json)",
          "pickMode": "catalog",
          "choices": [
            {
              "id": "v_current",
              "name": "Primal Current",
              "description": "Seeds, cactus, and Tara at once. No GCD for a burst.",
              "icon": "/icons/skills/class/verduror/primal-current.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 1,
              "cooldown": 30
            },
            {
              "id": "v_arcanum",
              "name": "Open Arcanum",
              "description": "Signature: the last plant you dropped refunds Seedflare.",
              "icon": "/icons/skills/class/verduror/open-arcanum.png",
              "effectType": "active",
              "effects": [],
              "maxPoints": 1
            }
          ]
        }
      ]
    }
  }
};
