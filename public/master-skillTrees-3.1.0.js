/* Exact Spawn 3.1.0 master-skillTrees.json — generated 2026-09-23T00:14:23.678Z, 117 skills, 8 classes. Do not edit. */
window.GRUDGE_MASTER_SKILL_TREES = {
  "version": "3.1.0",
  "generated": "2026-09-23T00:14:23.678Z",
  "totalClasses": 8,
  "totalSkills": 117,
  "skillTrees": {
    "warrior": {
      "uuid": "ITEM-20260621232130-000CDA-12518D41",
      "className": "Warrior",
      "color": "#ef4444",
      "tiers": [
        {
          "name": "Level 1 - Combat Basics",
          "requiredLevel": 1,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CC9-947ED2CB",
              "id": "w_taunt",
              "name": "Grudge Bellow",
              "icon": "/icons/skill_nobg/Warriorskill_01_nobg.png",
              "description": "Force enemies to target you",
              "effect": "+15% Threat",
              "maxPoints": 3,
              "bonuses": {
                "defense": 5
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_01_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CCA-AA308315",
              "id": "w_quick_strike",
              "name": "Quick Strike",
              "icon": "/icons/skill_nobg/Warriorskill_02_nobg.png",
              "description": "Fast attack with speed bonus",
              "effect": "+15% Attack Speed",
              "maxPoints": 3,
              "bonuses": {
                "attackSpeed": 5
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_02_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CCB-A4BB9A77",
              "id": "w_rending_strikes",
              "name": "Rending Strikes",
              "icon": "/icons/skill_nobg/Warriorskill_03_nobg.png",
              "description": "Attacks have a chance to cause bleeding",
              "effect": "+10% Bleed Proc",
              "maxPoints": 3,
              "bonuses": {
                "procChance": 3
              },
              "passive": true,
              "procEffect": {
                "type": "bleed",
                "damage": 0.08,
                "duration": 3
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_03_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 5 - Specialization",
          "requiredLevel": 5,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CCC-FDE7885D",
              "id": "w_damage_surge",
              "name": "Damage Surge",
              "icon": "/icons/skill_nobg/Warriorskill_04_nobg.png",
              "description": "Temporary damage boost",
              "effect": "+25% Damage for 3 turns",
              "maxPoints": 3,
              "requires": "w_quick_strike",
              "bonuses": {
                "damage": 3
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_04_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CCD-F1ADDC19",
              "id": "w_guardian_aura",
              "name": "Guardian's Aura",
              "icon": "/icons/skill_nobg/Paladinskill_23_nobg.png",
              "description": "Defense buff",
              "effect": "+15% Party Defense",
              "maxPoints": 3,
              "requires": "w_taunt",
              "bonuses": {
                "defense": 8
              },
              "grantedAbility": {
                "id": "guardian_aura",
                "name": "Guardian's Aura",
                "icon": "shield",
                "description": "Raise your defenses, gaining +20 defense for 3 turns",
                "type": "buff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 20,
                "cooldown": 5,
                "target": "self",
                "effect": {
                  "stat": "defense",
                  "flat": 20,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/barbarian/barbarian_05.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skills/class/barbarian/barbarian_05.png",
              "sourcePack": "barbarian",
              "originalIcon": "shield"
            },
            {
              "uuid": "SKIL-20260621232130-000CCE-8EEE5333",
              "id": "w_demoralizing_shout",
              "name": "Cowing Roar",
              "icon": "/icons/skill_nobg/Warriorskill_06_nobg.png",
              "description": "A fearsome shout that weakens enemy attacks",
              "effect": "-20% Enemy Attack",
              "maxPoints": 3,
              "requires": "w_taunt",
              "bonuses": {
                "defense": 3
              },
              "grantedAbility": {
                "id": "demoralizing_shout",
                "name": "Cowing Roar",
                "icon": "battle",
                "description": "Shout with fury, reducing all enemy attack by 20% for 3 turns",
                "type": "debuff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 15,
                "cooldown": 5,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "lower_attack",
                  "percent": 0.2,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/barbarian/barbarian_06.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_06_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 10 - Advanced",
          "requiredLevel": 10,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CCF-DFC4B8A7",
              "id": "w_dual_wield",
              "name": "Dual Wield",
              "icon": "/icons/skill_nobg/Warriorskill_07_nobg.png",
              "description": "Attack speed and multi-hit",
              "effect": "+30% Attack Speed",
              "maxPoints": 1,
              "requires": "w_damage_surge",
              "bonuses": {
                "attackSpeed": 15
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_07_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD0-186A462D",
              "id": "w_shield_spec",
              "name": "Shield Specialist",
              "icon": "/icons/skill_nobg/Warriorskill_08_nobg.png",
              "description": "Block chance and defense",
              "effect": "+20% Block Chance",
              "maxPoints": 3,
              "requires": "w_guardian_aura",
              "bonuses": {
                "block": 7
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_08_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD1-4D3733BC",
              "id": "w_life_drain",
              "name": "Life Drain",
              "icon": "/icons/skill_nobg/Warriorskill_09_nobg.png",
              "description": "Damage that heals you",
              "effect": "Heal 10% of Damage",
              "maxPoints": 2,
              "requires": "w_quick_strike",
              "bonuses": {
                "drainHealth": 5
              },
              "grantedAbility": {
                "id": "life_drain_strike",
                "name": "Life Drain",
                "icon": "heart",
                "description": "A draining strike that heals you for 20% of damage dealt",
                "type": "physical",
                "damage": 1.4,
                "manaCost": 0,
                "staminaCost": 20,
                "cooldown": 3,
                "target": "enemy",
                "drainPercent": 0.2,
                "iconUrl": "/icons/skills/class/barbarian/barbarian_09.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_09_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD2-2F256819",
              "id": "w_concussive_blow",
              "name": "Concussive Blow",
              "icon": "/icons/skill_nobg/Warriorskill_10_nobg.png",
              "description": "A stunning strike that dazes the target",
              "effect": "Stun 1 Turn",
              "maxPoints": 2,
              "requires": "w_damage_surge",
              "bonuses": {
                "damage": 4
              },
              "grantedAbility": {
                "id": "concussive_blow",
                "name": "Concussive Blow",
                "icon": "sparkle",
                "description": "A heavy blow that stuns the enemy for 1 turn",
                "type": "physical",
                "damage": 1.2,
                "manaCost": 0,
                "staminaCost": 22,
                "cooldown": 4,
                "target": "enemy",
                "effect": {
                  "type": "stun",
                  "duration": 1
                },
                "iconUrl": "/icons/skills/class/barbarian/barbarian_10.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_10_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD3-7F34DBB1",
              "id": "w_sunder_armor",
              "name": "Armor Crack",
              "icon": "/icons/skill_nobg/Warriorskill_11_nobg.png",
              "description": "Shatter enemy defenses",
              "effect": "-25% Enemy Defense",
              "maxPoints": 2,
              "requires": "w_rending_strikes",
              "bonuses": {
                "damage": 3
              },
              "grantedAbility": {
                "id": "sunder_armor",
                "name": "Armor Crack",
                "icon": "hammer",
                "description": "Smash through armor, lowering enemy defense by 25% for 3 turns",
                "type": "physical",
                "damage": 0.8,
                "manaCost": 0,
                "staminaCost": 18,
                "cooldown": 4,
                "target": "enemy",
                "effect": {
                  "type": "lower_defense",
                  "percent": 0.25,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/barbarian/barbarian_11.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_11_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 15 - Master",
          "requiredLevel": 15,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CD4-7CA3B2B3",
              "id": "w_execute",
              "name": "Headsman's Chop",
              "icon": "/icons/skill_nobg/Warriorskill_12_nobg.png",
              "description": "Bonus damage vs low health",
              "effect": "+50% Damage below 30% HP",
              "maxPoints": 1,
              "requires": "w_dual_wield",
              "bonuses": {
                "damage": 10
              },
              "grantedAbility": {
                "id": "execute",
                "name": "Headsman's Chop",
                "icon": "skull",
                "description": "Deal 3x damage to targets below 30% health",
                "type": "physical",
                "damage": 1.5,
                "manaCost": 0,
                "staminaCost": 30,
                "cooldown": 4,
                "target": "enemy",
                "executeDamage": 3,
                "executeThreshold": 0.3,
                "iconUrl": "/icons/skills/class/barbarian/barbarian_12.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_12_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD5-8B5EE98E",
              "id": "w_double_strike",
              "name": "Double Strike",
              "icon": "/icons/skill_nobg/Warriorskill_13_nobg.png",
              "description": "Two consecutive attacks",
              "effect": "Double Hit Combo",
              "maxPoints": 2,
              "requires": "w_life_drain",
              "bonuses": {
                "criticalChance": 5
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_13_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD6-806D7095",
              "id": "w_ignite_weapon",
              "name": "Ignite Weapon",
              "icon": "/icons/skill_nobg/Warriorskill_14_nobg.png",
              "description": "Enflame your weapon, burning enemies on hit",
              "effect": "Burn on Hit",
              "maxPoints": 2,
              "requires": "w_concussive_blow",
              "bonuses": {
                "damage": 5
              },
              "passive": true,
              "procEffect": {
                "type": "burn",
                "damage": 0.12,
                "duration": 3
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_14_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD7-EC46397A",
              "id": "w_bloodlust",
              "name": "Warpath Drums",
              "icon": "/icons/skill_nobg/Warriorskill_15_nobg.png",
              "description": "Each bleed on target increases your damage",
              "effect": "+8% Damage per Bleed",
              "maxPoints": 2,
              "requires": "w_rending_strikes",
              "bonuses": {
                "damage": 4,
                "attackSpeed": 5
              },
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Warriorskill_15_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary",
          "requiredLevel": 20,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CD8-4B647E06",
              "id": "w_avatar",
              "name": "Avatar Form",
              "icon": "/icons/skill_nobg/Warriorskill_16_nobg.png",
              "description": "All stats boost",
              "effect": "Ultimate Transformation",
              "maxPoints": 1,
              "requires": "w_execute",
              "bonuses": {
                "damage": 15,
                "defense": 15,
                "health": 50
              },
              "grantedAbility": {
                "id": "avatar_form",
                "name": "Avatar Form",
                "icon": "star",
                "description": "Transform into an avatar of war, boosting all stats for 4 turns",
                "type": "buff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 50,
                "cooldown": 10,
                "target": "self",
                "effect": {
                  "stat": "damage",
                  "multiplier": 1.5,
                  "duration": 4
                },
                "defenseBoost": {
                  "stat": "defense",
                  "flat": 25,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/barbarian/barbarian_16.png",
                "sourcePack": "barbarian"
              },
              "iconUrl": "/icons/skill_nobg/Warriorskill_16_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "uuid": "SKIL-20260621232130-000CD9-F4F555DA",
              "id": "w_relentless",
              "name": "Relentless",
              "icon": "/icons/skill_nobg/Warriorskill_17_nobg.png",
              "description": "Killing blows restore stamina and reset cooldowns",
              "effect": "Kill Reset",
              "maxPoints": 1,
              "requires": "w_double_strike",
              "bonuses": {
                "staminaRegen": 10,
                "attackSpeed": 8
              },
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Warriorskill_17_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        }
      ],
      "family": "warrior",
      "graph": {
        "totalNodes": 21,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 6
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-w_taunt",
            "id": 1,
            "name": "Grudge Bellow",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Force enemies to target you",
            "skillId": "w_taunt",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_quick_strike",
            "id": 2,
            "name": "Quick Strike",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Fast attack with speed bonus",
            "skillId": "w_quick_strike",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_rending_strikes",
            "id": 3,
            "name": "Rending Strikes",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Attacks have a chance to cause bleeding",
            "skillId": "w_rending_strikes",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Warrior-P1",
            "id": 4,
            "name": "Level 5 - Specialization",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Specialization.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_damage_surge",
            "id": 5,
            "name": "Damage Surge",
            "x": 22,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Temporary damage boost",
            "skillId": "w_damage_surge",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_guardian_aura",
            "id": 6,
            "name": "Guardian's Aura",
            "x": 50,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Defense buff",
            "skillId": "w_guardian_aura",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_demoralizing_shout",
            "id": 7,
            "name": "Cowing Roar",
            "x": 78,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "A fearsome shout that weakens enemy attacks",
            "skillId": "w_demoralizing_shout",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Warrior-P2",
            "id": 8,
            "name": "Level 10 - Advanced",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Advanced.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_dual_wield",
            "id": 9,
            "name": "Dual Wield",
            "x": 18,
            "y": 60,
            "reqLevel": 10,
            "parent": 8,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Attack speed and multi-hit",
            "skillId": "w_dual_wield",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_shield_spec",
            "id": 10,
            "name": "Shield Specialist",
            "x": 34,
            "y": 60,
            "reqLevel": 10,
            "parent": 8,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Block chance and defense",
            "skillId": "w_shield_spec",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_life_drain",
            "id": 11,
            "name": "Life Drain",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 8,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Damage that heals you",
            "skillId": "w_life_drain",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_concussive_blow",
            "id": 12,
            "name": "Concussive Blow",
            "x": 66,
            "y": 60,
            "reqLevel": 10,
            "parent": 8,
            "branch": "Center",
            "nodeType": "combat",
            "description": "A stunning strike that dazes the target",
            "skillId": "w_concussive_blow",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_sunder_armor",
            "id": 13,
            "name": "Armor Crack",
            "x": 82,
            "y": 60,
            "reqLevel": 10,
            "parent": 8,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Shatter enemy defenses",
            "skillId": "w_sunder_armor",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Warrior-P3",
            "id": 14,
            "name": "Level 15 - Master",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 8,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Master.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_execute",
            "id": 15,
            "name": "Headsman's Chop",
            "x": 18,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Bonus damage vs low health",
            "skillId": "w_execute",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_double_strike",
            "id": 16,
            "name": "Double Strike",
            "x": 39.33333333333333,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Two consecutive attacks",
            "skillId": "w_double_strike",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_ignite_weapon",
            "id": 17,
            "name": "Ignite Weapon",
            "x": 60.666666666666664,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "effect",
            "description": "Enflame your weapon, burning enemies on hit",
            "skillId": "w_ignite_weapon",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_bloodlust",
            "id": 18,
            "name": "Warpath Drums",
            "x": 82,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "effect",
            "description": "Each bleed on target increases your damage",
            "skillId": "w_bloodlust",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Warrior-P4",
            "id": 19,
            "name": "Level 20 - Legendary",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 14,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_avatar",
            "id": 20,
            "name": "Avatar Form",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Left",
            "nodeType": "combat",
            "description": "All stats boost",
            "skillId": "w_avatar",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-w_relentless",
            "id": 21,
            "name": "Relentless",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Right",
            "nodeType": "effect",
            "description": "Killing blows restore stamina and reset cooldowns",
            "skillId": "w_relentless",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "w_taunt",
        "name": "Grudge Bellow",
        "description": "Force enemies to target you"
      }
    },
    "mage": {
      "uuid": "ITEM-20260621232130-000CED-9F855249",
      "className": "Mage Priest",
      "color": "#8b5cf6",
      "tiers": [
        {
          "name": "Level 1 - Arcane Basics",
          "requiredLevel": 1,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CDB-07BBB77A",
              "id": "m_mana_flow",
              "name": "Mana Flow",
              "icon": "/icons/skill_nobg/Mageskill_01_nobg.png",
              "description": "Faster mana regeneration",
              "effect": "+20% Mana Regen",
              "maxPoints": 3,
              "bonuses": {
                "manaRegen": 0.5
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_01_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CDC-D0222B7D",
              "id": "m_arcane_focus",
              "name": "Arcane Focus",
              "icon": "/icons/abilities/ability_arcane_focus.png",
              "description": "Increased spell damage",
              "effect": "+10% Spell Damage",
              "maxPoints": 3,
              "bonuses": {
                "damage": 3
              },
              "iconUrl": "/icons/abilities/ability_arcane_focus.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CDD-5A7867D9",
              "id": "m_enfeeble",
              "name": "Enfeeble",
              "icon": "/icons/skill_nobg/Mageskill_03_nobg.png",
              "description": "Spells sap enemy strength",
              "effect": "-8% Enemy Attack on Hit",
              "maxPoints": 3,
              "bonuses": {
                "defense": 2
              },
              "passive": true,
              "procEffect": {
                "type": "lower_attack",
                "percent": 0.08,
                "duration": 2
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_03_nobg.png",
              "sourcePack": "firemage"
            }
          ]
        },
        {
          "name": "Level 5 - Elemental Arts",
          "requiredLevel": 5,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CDE-FE345B24",
              "id": "m_fire_mastery",
              "name": "Fire Mastery",
              "icon": "/icons/skill_nobg/Mageskill_04_nobg.png",
              "description": "Fire spell bonus",
              "effect": "+25% Fire Damage",
              "maxPoints": 3,
              "requires": "m_arcane_focus",
              "bonuses": {
                "damage": 5
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_04_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CDF-68132F8E",
              "id": "m_ice_mastery",
              "name": "Ice Mastery",
              "icon": "/icons/skill_nobg/Mageskill_05_nobg.png",
              "description": "Ice spell bonus",
              "effect": "+15% Slow Effect",
              "maxPoints": 3,
              "requires": "m_mana_flow",
              "bonuses": {
                "defense": 4
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_05_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE0-75015DE6",
              "id": "m_flame_brand",
              "name": "Flame Brand",
              "icon": "/icons/skill_nobg/Mageskill_06_nobg.png",
              "description": "Ignite the target in searing flames",
              "effect": "Burn DOT",
              "maxPoints": 3,
              "requires": "m_arcane_focus",
              "bonuses": {
                "damage": 3
              },
              "grantedAbility": {
                "id": "flame_brand",
                "name": "Flame Brand",
                "icon": "fire",
                "description": "Set the target ablaze, burning for 15% spell damage over 4 turns",
                "type": "magical",
                "damage": 0.6,
                "manaCost": 20,
                "staminaCost": 0,
                "cooldown": 3,
                "target": "enemy",
                "effect": {
                  "type": "burn",
                  "damage": 0.15,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_06.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_06_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE1-053EC9DF",
              "id": "m_blessing",
              "name": "Blessing",
              "icon": "/icons/skill_nobg/Priestskill_01_nobg.png",
              "description": "Divine light heals over time",
              "effect": "Heal Over Time",
              "maxPoints": 3,
              "requires": "m_mana_flow",
              "bonuses": {
                "health": 10
              },
              "grantedAbility": {
                "id": "blessing",
                "name": "Blessing",
                "icon": "sparkle",
                "description": "Bless yourself with divine light, healing 8% HP per turn for 4 turns",
                "type": "heal_over_time",
                "damage": 0,
                "manaCost": 22,
                "staminaCost": 0,
                "cooldown": 5,
                "target": "self",
                "healPercent": 0.08,
                "duration": 4,
                "iconUrl": "/icons/skills/class/firemage/firemage_07.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Priestskill_01_nobg.png",
              "sourcePack": "firemage"
            }
          ]
        },
        {
          "name": "Level 10 - Divine Power",
          "requiredLevel": 10,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CE2-B2B6F674",
              "id": "m_meteor",
              "name": "Meteor Strike",
              "icon": "/icons/skill_nobg/Mageskill_07_nobg.png",
              "description": "Call down a meteor",
              "effect": "Massive AoE",
              "maxPoints": 1,
              "requires": "m_fire_mastery",
              "bonuses": {
                "damage": 12
              },
              "grantedAbility": {
                "id": "meteor_strike",
                "name": "Meteor Strike",
                "icon": "bomb",
                "description": "Call down a devastating meteor hitting all enemies",
                "type": "magical",
                "damage": 3,
                "manaCost": 50,
                "staminaCost": 0,
                "cooldown": 5,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "burn",
                  "damage": 0.15,
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_08.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_07_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE3-75F841D9",
              "id": "m_divine_shield",
              "name": "Saint's Bulwark",
              "icon": "/icons/skill_nobg/Priestskill_02_nobg.png",
              "description": "Holy protection",
              "effect": "Absorb Damage",
              "maxPoints": 3,
              "requires": "m_ice_mastery",
              "bonuses": {
                "defense": 6,
                "resistance": 3
              },
              "iconUrl": "/icons/skill_nobg/Priestskill_02_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE4-B542121C",
              "id": "m_chain_lightning",
              "name": "Forked Storm",
              "icon": "/icons/skill_nobg/Mageskill_08_nobg.png",
              "description": "Lightning bounces between foes",
              "effect": "Hit 5 Targets",
              "maxPoints": 2,
              "requires": "m_arcane_focus",
              "bonuses": {
                "damage": 6,
                "criticalChance": 3
              },
              "grantedAbility": {
                "id": "chain_lightning",
                "name": "Forked Storm",
                "icon": "lightning",
                "description": "Launch lightning that chains to all enemies",
                "type": "magical",
                "damage": 2.2,
                "manaCost": 35,
                "staminaCost": 0,
                "cooldown": 3,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "dot",
                  "damage": 0.08,
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_10.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_08_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE5-E9C75EFF",
              "id": "m_sleep",
              "name": "Slumber",
              "icon": "/icons/skill_nobg/Mageskill_09_nobg.png",
              "description": "Put the target into a magical sleep",
              "effect": "Sleep 2 Turns",
              "maxPoints": 2,
              "requires": "m_ice_mastery",
              "bonuses": {
                "mana": 15
              },
              "grantedAbility": {
                "id": "slumber",
                "name": "Slumber",
                "icon": "moon",
                "description": "Lull the enemy into a deep sleep for 2 turns. Damage wakes them.",
                "type": "magical",
                "damage": 0,
                "manaCost": 30,
                "staminaCost": 0,
                "cooldown": 6,
                "target": "enemy",
                "effect": {
                  "type": "sleep",
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_11.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_09_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE6-87EAABCA",
              "id": "m_mind_break",
              "name": "Mind Break",
              "icon": "/icons/skill_nobg/Mageskill_10_nobg.png",
              "description": "Shatter mental defenses, lowering magic resistance",
              "effect": "-20% Enemy Defense",
              "maxPoints": 2,
              "requires": "m_enfeeble",
              "bonuses": {
                "damage": 4
              },
              "grantedAbility": {
                "id": "mind_break",
                "name": "Mind Break",
                "icon": "mind",
                "description": "Shatter the enemy mind, lowering defense by 20% for 3 turns",
                "type": "magical",
                "damage": 0.5,
                "manaCost": 25,
                "staminaCost": 0,
                "cooldown": 4,
                "target": "enemy",
                "effect": {
                  "type": "lower_defense",
                  "percent": 0.2,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_12.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_10_nobg.png",
              "sourcePack": "firemage"
            }
          ]
        },
        {
          "name": "Level 15 - Grand Magus",
          "requiredLevel": 15,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CE7-B276DE4D",
              "id": "m_spell_echo",
              "name": "Spell Echo",
              "icon": "/icons/skill_nobg/Mageskill_11_nobg.png",
              "description": "Chance to double cast",
              "effect": "20% Echo Chance",
              "maxPoints": 2,
              "requires": "m_meteor",
              "bonuses": {
                "damage": 8,
                "mana": 20
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_11_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE8-D1DBF3D7",
              "id": "m_holy_nova",
              "name": "Radiant Burst",
              "icon": "/icons/skill_nobg/Priestskill_03_nobg.png",
              "description": "AoE heal and damage",
              "effect": "Burst Heal + Damage",
              "maxPoints": 2,
              "requires": "m_divine_shield",
              "bonuses": {
                "health": 30,
                "damage": 5
              },
              "grantedAbility": {
                "id": "holy_nova",
                "name": "Radiant Burst",
                "icon": "sparkle",
                "description": "Release a burst of holy energy, healing yourself for 25% HP",
                "type": "heal",
                "damage": 0,
                "manaCost": 45,
                "staminaCost": 0,
                "cooldown": 5,
                "target": "self",
                "healPercent": 0.25,
                "iconUrl": "/icons/skills/class/firemage/firemage_14.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Priestskill_03_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CE9-6D80022F",
              "id": "m_confuse",
              "name": "Bewilderment",
              "icon": "/icons/skill_nobg/Mageskill_12_nobg.png",
              "description": "Confuse the target, making them attack randomly",
              "effect": "Confuse 2 Turns",
              "maxPoints": 2,
              "requires": "m_sleep",
              "bonuses": {
                "mana": 15
              },
              "grantedAbility": {
                "id": "bewilderment",
                "name": "Bewilderment",
                "icon": "chaos",
                "description": "Bewitch the enemy mind, confusing them for 2 turns. They may attack allies.",
                "type": "magical",
                "damage": 0,
                "manaCost": 35,
                "staminaCost": 0,
                "cooldown": 6,
                "target": "enemy",
                "effect": {
                  "type": "confuse",
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/firemage/firemage_15.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_12_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CEA-442620CF",
              "id": "m_purify",
              "name": "Brine Cleanse",
              "icon": "/icons/skill_nobg/Priestskill_04_nobg.png",
              "description": "Cleanse all debuffs and heal",
              "effect": "Remove Debuffs",
              "maxPoints": 1,
              "requires": "m_blessing",
              "bonuses": {
                "health": 20
              },
              "grantedAbility": {
                "id": "purify",
                "name": "Brine Cleanse",
                "icon": "sparkle",
                "description": "Cleanse all debuffs from yourself and heal 15% HP",
                "type": "heal",
                "damage": 0,
                "manaCost": 30,
                "staminaCost": 0,
                "cooldown": 6,
                "target": "self",
                "healPercent": 0.15,
                "cleanse": true,
                "iconUrl": "/icons/skills/class/firemage/firemage_16.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Priestskill_04_nobg.png",
              "sourcePack": "firemage"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary",
          "requiredLevel": 20,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CEB-4E634C6C",
              "id": "m_arcane_cataclysm",
              "name": "Arcane Cataclysm",
              "icon": "/icons/skill_nobg/Mageskill_13_nobg.png",
              "description": "Devastating magic storm",
              "effect": "Ultimate: Pure Magic",
              "maxPoints": 1,
              "requires": "m_spell_echo",
              "bonuses": {
                "damage": 20,
                "mana": 50,
                "criticalChance": 10
              },
              "grantedAbility": {
                "id": "arcane_cataclysm",
                "name": "Arcane Cataclysm",
                "icon": "star",
                "description": "Unleash a devastating arcane storm hitting all enemies",
                "type": "magical",
                "damage": 4,
                "manaCost": 70,
                "staminaCost": 0,
                "cooldown": 8,
                "target": "enemy",
                "isAoE": true,
                "iconUrl": "/icons/skills/class/firemage/firemage_17.png",
                "sourcePack": "firemage"
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_13_nobg.png",
              "sourcePack": "firemage"
            },
            {
              "uuid": "SKIL-20260621232130-000CEC-07F622DD",
              "id": "m_spellweave",
              "name": "Spellweave",
              "icon": "/icons/skill_nobg/Mageskill_14_nobg.png",
              "description": "Spells have a chance to apply a random debuff (burn, sleep, confuse, lower defense)",
              "effect": "Random Debuff Proc",
              "maxPoints": 1,
              "requires": "m_confuse",
              "bonuses": {
                "damage": 10,
                "mana": 25
              },
              "passive": true,
              "procEffect": {
                "type": "random_debuff",
                "options": [
                  "burn",
                  "sleep",
                  "confuse",
                  "lower_defense"
                ],
                "chance": 0.2
              },
              "iconUrl": "/icons/skill_nobg/Mageskill_14_nobg.png",
              "sourcePack": "firemage"
            }
          ]
        }
      ],
      "family": "mage",
      "graph": {
        "totalNodes": 22,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 7
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-m_mana_flow",
            "id": 1,
            "name": "Mana Flow",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Faster mana regeneration",
            "skillId": "m_mana_flow",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_arcane_focus",
            "id": 2,
            "name": "Arcane Focus",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Increased spell damage",
            "skillId": "m_arcane_focus",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_enfeeble",
            "id": 3,
            "name": "Enfeeble",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Spells sap enemy strength",
            "skillId": "m_enfeeble",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Mage Priest-P1",
            "id": 4,
            "name": "Level 5 - Elemental Arts",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Elemental Arts.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_fire_mastery",
            "id": 5,
            "name": "Fire Mastery",
            "x": 18,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Fire spell bonus",
            "skillId": "m_fire_mastery",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_ice_mastery",
            "id": 6,
            "name": "Ice Mastery",
            "x": 39.33333333333333,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Ice spell bonus",
            "skillId": "m_ice_mastery",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_flame_brand",
            "id": 7,
            "name": "Flame Brand",
            "x": 60.666666666666664,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Ignite the target in searing flames",
            "skillId": "m_flame_brand",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_blessing",
            "id": 8,
            "name": "Blessing",
            "x": 82,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Divine light heals over time",
            "skillId": "m_blessing",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Mage Priest-P2",
            "id": 9,
            "name": "Level 10 - Divine Power",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Divine Power.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_meteor",
            "id": 10,
            "name": "Meteor Strike",
            "x": 18,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Call down a meteor",
            "skillId": "m_meteor",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_divine_shield",
            "id": 11,
            "name": "Saint's Bulwark",
            "x": 34,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Holy protection",
            "skillId": "m_divine_shield",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_chain_lightning",
            "id": 12,
            "name": "Forked Storm",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Lightning bounces between foes",
            "skillId": "m_chain_lightning",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_sleep",
            "id": 13,
            "name": "Slumber",
            "x": 66,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Put the target into a magical sleep",
            "skillId": "m_sleep",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_mind_break",
            "id": 14,
            "name": "Mind Break",
            "x": 82,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Shatter mental defenses, lowering magic resistance",
            "skillId": "m_mind_break",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Mage Priest-P3",
            "id": 15,
            "name": "Level 15 - Grand Magus",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 9,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Grand Magus.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_spell_echo",
            "id": 16,
            "name": "Spell Echo",
            "x": 18,
            "y": 44,
            "reqLevel": 15,
            "parent": 15,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Chance to double cast",
            "skillId": "m_spell_echo",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_holy_nova",
            "id": 17,
            "name": "Radiant Burst",
            "x": 39.33333333333333,
            "y": 44,
            "reqLevel": 15,
            "parent": 15,
            "branch": "Right",
            "nodeType": "combat",
            "description": "AoE heal and damage",
            "skillId": "m_holy_nova",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_confuse",
            "id": 18,
            "name": "Bewilderment",
            "x": 60.666666666666664,
            "y": 44,
            "reqLevel": 15,
            "parent": 15,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Confuse the target, making them attack randomly",
            "skillId": "m_confuse",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_purify",
            "id": 19,
            "name": "Brine Cleanse",
            "x": 82,
            "y": 44,
            "reqLevel": 15,
            "parent": 15,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Cleanse all debuffs and heal",
            "skillId": "m_purify",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Mage Priest-P4",
            "id": 20,
            "name": "Level 20 - Legendary",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 15,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_arcane_cataclysm",
            "id": 21,
            "name": "Arcane Cataclysm",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 20,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Devastating magic storm",
            "skillId": "m_arcane_cataclysm",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-m_spellweave",
            "id": 22,
            "name": "Spellweave",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 20,
            "branch": "Right",
            "nodeType": "effect",
            "description": "Spells have a chance to apply a random debuff (burn, sleep, confuse, lower defense)",
            "skillId": "m_spellweave",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "m_mana_flow",
        "name": "Mana Flow",
        "description": "Faster mana regeneration"
      }
    },
    "worge": {
      "uuid": "ITEM-20260621232130-000CFF-22531714",
      "className": "Worge",
      "color": "#d97706",
      "tiers": [
        {
          "name": "Level 1 - Primal Roots",
          "requiredLevel": 1,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CEE-BCA706E3",
              "id": "wr_storm_touch",
              "name": "Storm Touch",
              "icon": "/icons/skill_nobg/Druideskill_01_nobg.png",
              "description": "Lightning spells hit harder",
              "effect": "+15% Storm Damage",
              "maxPoints": 3,
              "bonuses": {
                "damage": 3
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_01_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CEF-19AE17E2",
              "id": "wr_bark_skin",
              "name": "Oakhide",
              "icon": "/icons/skill_nobg/Druideskill_02_nobg.png",
              "description": "Nature hardens your skin",
              "effect": "+10% Defense",
              "maxPoints": 3,
              "bonuses": {
                "defense": 4,
                "health": 10
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_02_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF0-71C0A541",
              "id": "wr_feral_instinct",
              "name": "Feral Instinct",
              "icon": "/icons/skill_nobg/Druideskill_03_nobg.png",
              "description": "Chance for a bonus follow-up attack on hit",
              "effect": "+8% Proc Chance",
              "maxPoints": 3,
              "bonuses": {
                "procChance": 3,
                "attackSpeed": 2
              },
              "passive": true,
              "procEffect": {
                "type": "extra_attack",
                "damage": 0.5
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_03_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 5 - Dual Nature",
          "requiredLevel": 5,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CF1-B7B9334F",
              "id": "wr_weapon_mastery",
              "name": "Weapon Mastery",
              "icon": "/icons/skill_nobg/Druideskill_04_nobg.png",
              "description": "Mace and dagger expertise",
              "effect": "+20% Weapon Damage",
              "maxPoints": 3,
              "requires": "wr_storm_touch",
              "bonuses": {
                "damage": 4,
                "criticalChance": 3
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_04_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF2-959DEB13",
              "id": "wr_wild_growth",
              "name": "Verdant Surge",
              "icon": "/icons/skill_nobg/Druideskill_05_nobg.png",
              "description": "Nature heals strengthen",
              "effect": "+25% Heal Power",
              "maxPoints": 3,
              "requires": "wr_bark_skin",
              "bonuses": {
                "health": 15
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_05_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF3-22582ACA",
              "id": "wr_lacerate",
              "name": "Flay",
              "icon": "/icons/skill_nobg/Druideskill_06_nobg.png",
              "description": "Claw attack that causes deep bleeding",
              "effect": "Bleed DOT",
              "maxPoints": 3,
              "requires": "wr_feral_instinct",
              "bonuses": {
                "damage": 3
              },
              "grantedAbility": {
                "id": "lacerate",
                "name": "Flay",
                "icon": "target",
                "description": "Rip into the target with claws, causing bleed for 10% damage over 4 turns",
                "type": "physical",
                "damage": 1,
                "manaCost": 0,
                "staminaCost": 14,
                "cooldown": 3,
                "target": "enemy",
                "effect": {
                  "type": "bleed",
                  "damage": 0.1,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_06.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_06_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF4-BE240EE4",
              "id": "wr_soothing_rain",
              "name": "Soothing Rain",
              "icon": "/icons/skill_nobg/Druideskill_07_nobg.png",
              "description": "Call rain that heals over time",
              "effect": "Heal Over Time",
              "maxPoints": 3,
              "requires": "wr_bark_skin",
              "bonuses": {
                "health": 10
              },
              "grantedAbility": {
                "id": "soothing_rain",
                "name": "Soothing Rain",
                "icon": "nature",
                "description": "Call a gentle rain that heals 6% HP per turn for 5 turns",
                "type": "heal_over_time",
                "damage": 0,
                "manaCost": 18,
                "staminaCost": 0,
                "cooldown": 5,
                "target": "self",
                "healPercent": 0.06,
                "duration": 5,
                "iconUrl": "/icons/skills/class/necromancer/necromancer_07.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_07_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 10 - Shapeshifter",
          "requiredLevel": 10,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CF5-14C89F5D",
              "id": "wr_thunderclap",
              "name": "Thunder Stomp",
              "icon": "/icons/skill_nobg/Druideskill_08_nobg.png",
              "description": "Storm spells stun briefly",
              "effect": "Spell Stun Chance",
              "maxPoints": 1,
              "requires": "wr_weapon_mastery",
              "bonuses": {
                "damage": 10
              },
              "grantedAbility": {
                "id": "thunderclap",
                "name": "Thunder Stomp",
                "icon": "lightning",
                "description": "Slam the ground stunning all enemies for 1 turn",
                "type": "magical",
                "damage": 1.6,
                "manaCost": 30,
                "staminaCost": 0,
                "cooldown": 4,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "stun",
                  "duration": 1
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_08.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_08_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF6-851CC356",
              "id": "wr_iron_hide",
              "name": "Iron Hide",
              "icon": "/icons/skill_nobg/Druideskill_09_nobg.png",
              "description": "Bear form is tougher",
              "effect": "+30% Bear Defense",
              "maxPoints": 3,
              "requires": "wr_wild_growth",
              "bonuses": {
                "defense": 6,
                "health": 15
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_09_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF7-F6A10C74",
              "id": "wr_venom_edge",
              "name": "Venom Edge",
              "icon": "/icons/skill_nobg/Druideskill_10_nobg.png",
              "description": "Dagger poison is deadlier",
              "effect": "+20% Poison Damage",
              "maxPoints": 2,
              "requires": "wr_storm_touch",
              "bonuses": {
                "damage": 5
              },
              "grantedAbility": {
                "id": "venom_strike",
                "name": "Venom Strike",
                "icon": "sword",
                "description": "A venomous dagger strike that poisons for 4 turns",
                "type": "physical",
                "damage": 1.1,
                "manaCost": 0,
                "staminaCost": 18,
                "cooldown": 3,
                "target": "enemy",
                "effect": {
                  "type": "poison",
                  "damage": 0.18,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_10.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_10_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CF8-FBBB4AA8",
              "id": "wr_entangle",
              "name": "Entangle",
              "icon": "/icons/skill_nobg/Druideskill_11_nobg.png",
              "description": "Vines root and damage the target",
              "effect": "Root + DOT",
              "maxPoints": 2,
              "requires": "wr_wild_growth",
              "bonuses": {
                "defense": 4
              },
              "grantedAbility": {
                "id": "entangle",
                "name": "Entangle",
                "icon": "nature",
                "description": "Summon vines that stun for 1 turn and deal nature damage over 3 turns",
                "type": "magical",
                "damage": 0.5,
                "manaCost": 22,
                "staminaCost": 0,
                "cooldown": 5,
                "target": "enemy",
                "effect": {
                  "type": "stun",
                  "duration": 1
                },
                "secondaryEffect": {
                  "type": "dot",
                  "damage": 0.1,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_11.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_11_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 15 - Warden",
          "requiredLevel": 15,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CF9-E34716F5",
              "id": "wr_tempest",
              "name": "Tempest",
              "icon": "/icons/skill_nobg/Druideskill_12_nobg.png",
              "description": "Storm mastery unleashed",
              "effect": "+40% Storm Power",
              "maxPoints": 1,
              "requires": "wr_thunderclap",
              "bonuses": {
                "damage": 8,
                "attackSpeed": 10
              },
              "grantedAbility": {
                "id": "tempest",
                "name": "Tempest",
                "icon": "chaos",
                "description": "Summon a raging tempest hitting all enemies",
                "type": "magical",
                "damage": 2.5,
                "manaCost": 40,
                "staminaCost": 0,
                "cooldown": 4,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "lower_attack",
                  "percent": 0.15,
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_12.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_12_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CFA-7ECB9014",
              "id": "wr_rejuvenate",
              "name": "Green Mending",
              "icon": "/icons/skill_nobg/Druideskill_13_nobg.png",
              "description": "Nature mends all wounds",
              "effect": "Passive Regen",
              "maxPoints": 2,
              "requires": "wr_iron_hide",
              "bonuses": {
                "drainHealth": 5,
                "health": 20
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_13_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CFB-D79422D5",
              "id": "wr_primal_roar",
              "name": "Primal Roar",
              "icon": "/icons/skill_nobg/Druideskill_14_nobg.png",
              "description": "A terrifying roar that confuses and weakens",
              "effect": "Confuse + Lower Attack",
              "maxPoints": 2,
              "requires": "wr_iron_hide",
              "bonuses": {
                "defense": 5
              },
              "grantedAbility": {
                "id": "primal_roar",
                "name": "Primal Roar",
                "icon": "wolf",
                "description": "Unleash a primal roar that confuses all enemies for 2 turns",
                "type": "debuff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 25,
                "cooldown": 6,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "confuse",
                  "duration": 2
                },
                "secondaryEffect": {
                  "type": "lower_attack",
                  "percent": 0.15,
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_14.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_14_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "uuid": "SKIL-20260621232130-000CFC-209D2D3C",
              "id": "wr_savage_bleed",
              "name": "Savage Rend",
              "icon": "/icons/skill_nobg/Druideskill_15_nobg.png",
              "description": "Bear form attacks cause deep wounds",
              "effect": "Bear Bleed Proc",
              "maxPoints": 2,
              "requires": "wr_lacerate",
              "bonuses": {
                "damage": 6
              },
              "passive": true,
              "procEffect": {
                "type": "bleed",
                "damage": 0.12,
                "duration": 3
              },
              "iconUrl": "/icons/skill_nobg/Druideskill_15_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary",
          "requiredLevel": 20,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000CFD-5FFF1075",
              "id": "wr_natures_wrath",
              "name": "Nature's Wrath",
              "icon": "/icons/spells/lightning-blue-1.png",
              "description": "Command storm and wild as one",
              "effect": "Ultimate: Primal Storm",
              "maxPoints": 1,
              "requires": "wr_tempest",
              "bonuses": {
                "damage": 15,
                "attackSpeed": 15,
                "health": 40
              },
              "grantedAbility": {
                "id": "natures_wrath",
                "name": "Nature's Wrath",
                "icon": "star",
                "description": "Unleash primal storm hitting all enemies",
                "type": "magical",
                "damage": 3.5,
                "manaCost": 50,
                "staminaCost": 20,
                "cooldown": 8,
                "target": "enemy",
                "isAoE": true,
                "effect": {
                  "type": "dot",
                  "damage": 0.2,
                  "duration": 3
                },
                "iconUrl": "/icons/skills/class/necromancer/necromancer_16.png",
                "sourcePack": "necromancer"
              },
              "iconUrl": "/icons/skills/class/necromancer/necromancer_16.png",
              "sourcePack": "necromancer",
              "originalIcon": "star"
            },
            {
              "uuid": "SKIL-20260621232130-000CFE-5ED76222",
              "id": "wr_alpha_predator",
              "name": "Alpha Predator",
              "icon": "/icons/skill_nobg/Druideskill_16_nobg.png",
              "description": "Each kill in bear form extends duration and heals",
              "effect": "Kill Sustain",
              "maxPoints": 1,
              "requires": "wr_primal_roar",
              "bonuses": {
                "damage": 10,
                "health": 30,
                "drainHealth": 8
              },
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Druideskill_16_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        }
      ],
      "family": "worge",
      "graph": {
        "totalNodes": 21,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 6
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-wr_storm_touch",
            "id": 1,
            "name": "Storm Touch",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Lightning spells hit harder",
            "skillId": "wr_storm_touch",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_bark_skin",
            "id": 2,
            "name": "Oakhide",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Nature hardens your skin",
            "skillId": "wr_bark_skin",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_feral_instinct",
            "id": 3,
            "name": "Feral Instinct",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Chance for a bonus follow-up attack on hit",
            "skillId": "wr_feral_instinct",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Worge-P1",
            "id": 4,
            "name": "Level 5 - Dual Nature",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Dual Nature.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_weapon_mastery",
            "id": 5,
            "name": "Weapon Mastery",
            "x": 18,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Mace and dagger expertise",
            "skillId": "wr_weapon_mastery",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_wild_growth",
            "id": 6,
            "name": "Verdant Surge",
            "x": 39.33333333333333,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Nature heals strengthen",
            "skillId": "wr_wild_growth",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_lacerate",
            "id": 7,
            "name": "Flay",
            "x": 60.666666666666664,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Claw attack that causes deep bleeding",
            "skillId": "wr_lacerate",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_soothing_rain",
            "id": 8,
            "name": "Soothing Rain",
            "x": 82,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Call rain that heals over time",
            "skillId": "wr_soothing_rain",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Worge-P2",
            "id": 9,
            "name": "Level 10 - Shapeshifter",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Shapeshifter.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_thunderclap",
            "id": 10,
            "name": "Thunder Stomp",
            "x": 18,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Storm spells stun briefly",
            "skillId": "wr_thunderclap",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_iron_hide",
            "id": 11,
            "name": "Iron Hide",
            "x": 39.33333333333333,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Bear form is tougher",
            "skillId": "wr_iron_hide",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_venom_edge",
            "id": 12,
            "name": "Venom Edge",
            "x": 60.666666666666664,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Dagger poison is deadlier",
            "skillId": "wr_venom_edge",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_entangle",
            "id": 13,
            "name": "Entangle",
            "x": 82,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Vines root and damage the target",
            "skillId": "wr_entangle",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Worge-P3",
            "id": 14,
            "name": "Level 15 - Warden",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 9,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Warden.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_tempest",
            "id": 15,
            "name": "Tempest",
            "x": 18,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Storm mastery unleashed",
            "skillId": "wr_tempest",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_rejuvenate",
            "id": 16,
            "name": "Green Mending",
            "x": 39.33333333333333,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Nature mends all wounds",
            "skillId": "wr_rejuvenate",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_primal_roar",
            "id": 17,
            "name": "Primal Roar",
            "x": 60.666666666666664,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "combat",
            "description": "A terrifying roar that confuses and weakens",
            "skillId": "wr_primal_roar",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_savage_bleed",
            "id": 18,
            "name": "Savage Rend",
            "x": 82,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "effect",
            "description": "Bear form attacks cause deep wounds",
            "skillId": "wr_savage_bleed",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Worge-P4",
            "id": 19,
            "name": "Level 20 - Legendary",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 14,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_natures_wrath",
            "id": 20,
            "name": "Nature's Wrath",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Command storm and wild as one",
            "skillId": "wr_natures_wrath",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-wr_alpha_predator",
            "id": 21,
            "name": "Alpha Predator",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Right",
            "nodeType": "effect",
            "description": "Each kill in bear form extends duration and heals",
            "skillId": "wr_alpha_predator",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "wr_storm_touch",
        "name": "Storm Touch",
        "description": "Lightning spells hit harder"
      }
    },
    "ranger": {
      "uuid": "ITEM-20260621232130-000D11-6BAF93A3",
      "className": "Ranger",
      "color": "#22c55e",
      "tiers": [
        {
          "name": "Level 1 - Bowcraft",
          "requiredLevel": 1,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000D00-4AF24B7E",
              "id": "r_precision",
              "name": "Precision",
              "icon": "/icons/skill_nobg/Archerskill_01_nobg.png",
              "description": "Better accuracy",
              "effect": "+15% Accuracy",
              "maxPoints": 3,
              "bonuses": {
                "accuracy": 5,
                "criticalChance": 2
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_01_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D01-3D00DA6B",
              "id": "r_swift_draw",
              "name": "Swift Draw",
              "icon": "/icons/skill_nobg/Archerskill_02_nobg.png",
              "description": "Faster arrow nocking",
              "effect": "+10% Attack Speed",
              "maxPoints": 3,
              "bonuses": {
                "attackSpeed": 4
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_02_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D02-5A0C89A7",
              "id": "r_crippling_shot",
              "name": "Crippling Shot",
              "icon": "/icons/skill_nobg/Archerskill_03_nobg.png",
              "description": "Arrows weaken enemy defenses",
              "effect": "-8% Enemy Defense on Hit",
              "maxPoints": 3,
              "bonuses": {
                "damage": 2
              },
              "passive": true,
              "procEffect": {
                "type": "lower_defense",
                "percent": 0.08,
                "duration": 2
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_03_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 5 - Hunter",
          "requiredLevel": 5,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000D03-79600AC8",
              "id": "r_headshot",
              "name": "Headshot",
              "icon": "/icons/skill_nobg/Archerskill_04_nobg.png",
              "description": "Critical damage bonus",
              "effect": "+50% Crit Damage",
              "maxPoints": 3,
              "requires": "r_precision",
              "bonuses": {
                "criticalDamage": 15
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_04_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D04-2B6C9EBD",
              "id": "r_evasion",
              "name": "Nature's Grace",
              "icon": "/icons/spells/vines-jade-1.png",
              "description": "Dodge chance up",
              "effect": "+15% Evasion",
              "maxPoints": 3,
              "requires": "r_swift_draw",
              "bonuses": {
                "evasion": 5
              },
              "iconUrl": "/icons/skills/class/hunter/hunter_05.png",
              "sourcePack": "hunter",
              "originalIcon": "nature"
            },
            {
              "uuid": "SKIL-20260621232130-000D05-72F6898C",
              "id": "r_venom_arrow",
              "name": "Venom Arrow",
              "icon": "/icons/skill_nobg/Archerskill_05_nobg.png",
              "description": "Tip arrows with deadly poison",
              "effect": "Poison DOT",
              "maxPoints": 3,
              "requires": "r_precision",
              "bonuses": {
                "damage": 3
              },
              "grantedAbility": {
                "id": "venom_arrow",
                "name": "Venom Arrow",
                "icon": "skull",
                "description": "Fire a poison-tipped arrow that deals poison damage over 4 turns",
                "type": "physical",
                "damage": 0.7,
                "manaCost": 0,
                "staminaCost": 14,
                "cooldown": 3,
                "target": "enemy",
                "effect": {
                  "type": "poison",
                  "damage": 0.12,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_06.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_05_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D06-BAB6B03C",
              "id": "r_hunters_mark",
              "name": "Quarry Brand",
              "icon": "/icons/skill_nobg/Archerskill_15_nobg.png",
              "description": "Mark the target, lowering its defense",
              "effect": "-15% Enemy Defense",
              "maxPoints": 3,
              "requires": "r_crippling_shot",
              "bonuses": {
                "damage": 2,
                "criticalChance": 2
              },
              "grantedAbility": {
                "id": "hunters_mark",
                "name": "Quarry Brand",
                "icon": "target",
                "description": "Mark the enemy, reducing their defense by 20% for 4 turns",
                "type": "debuff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 12,
                "cooldown": 5,
                "target": "enemy",
                "effect": {
                  "type": "lower_defense",
                  "percent": 0.2,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_07.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skills/class/hunter/hunter_07.png",
              "sourcePack": "hunter",
              "originalIcon": "target"
            }
          ]
        },
        {
          "name": "Level 10 - Sharpshooter",
          "requiredLevel": 10,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000D07-A45755F0",
              "id": "r_piercing",
              "name": "Bodkin Shot",
              "icon": "/icons/skill_nobg/Archerskill_07_nobg.png",
              "description": "Arrows pierce armor",
              "effect": "25% Armor Pen",
              "maxPoints": 1,
              "requires": "r_headshot",
              "bonuses": {
                "armorPenetration": 10,
                "damage": 5
              },
              "grantedAbility": {
                "id": "piercing_shot",
                "name": "Bodkin Shot",
                "icon": "bow",
                "description": "Fire an armor-piercing arrow that ignores defense",
                "type": "physical",
                "damage": 2.2,
                "manaCost": 0,
                "staminaCost": 22,
                "cooldown": 3,
                "target": "enemy",
                "armorPiercing": true,
                "iconUrl": "/icons/skills/class/hunter/hunter_08.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_07_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D08-2A9D0577",
              "id": "r_multishot",
              "name": "Arrow Fan",
              "icon": "/icons/skill_nobg/Archerskill_08_nobg.png",
              "description": "Fire multiple arrows",
              "effect": "3 Arrow Spread",
              "maxPoints": 3,
              "requires": "r_swift_draw",
              "bonuses": {
                "damage": 4
              },
              "grantedAbility": {
                "id": "multishot",
                "name": "Arrow Fan",
                "icon": "chaos",
                "description": "Fire a spread of arrows hitting all enemies",
                "type": "physical",
                "damage": 1.8,
                "manaCost": 0,
                "staminaCost": 20,
                "cooldown": 3,
                "target": "enemy",
                "isAoE": true,
                "iconUrl": "/icons/skills/class/hunter/hunter_09.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_08_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D09-4C904E4B",
              "id": "r_trap",
              "name": "Bear Trap",
              "icon": "/icons/skill_nobg/Archerskill_09_nobg.png",
              "description": "Place traps that root",
              "effect": "1 Turn Stun",
              "maxPoints": 2,
              "requires": "r_evasion",
              "bonuses": {
                "defense": 5
              },
              "grantedAbility": {
                "id": "bear_trap",
                "name": "Bear Trap",
                "icon": "bomb",
                "description": "Set a trap that stuns the enemy for 1 turn",
                "type": "physical",
                "damage": 0.6,
                "manaCost": 0,
                "staminaCost": 15,
                "cooldown": 4,
                "target": "enemy",
                "effect": {
                  "type": "stun",
                  "duration": 1
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_10.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_09_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D0A-14CDCD4E",
              "id": "r_bleed_arrow",
              "name": "Barbed Arrow",
              "icon": "/icons/skill_nobg/Archerskill_10_nobg.png",
              "description": "Barbed tips cause heavy bleeding",
              "effect": "Bleed DOT",
              "maxPoints": 2,
              "requires": "r_venom_arrow",
              "bonuses": {
                "damage": 4
              },
              "grantedAbility": {
                "id": "barbed_arrow",
                "name": "Barbed Arrow",
                "icon": "target",
                "description": "Fire a barbed arrow that causes bleeding for 12% damage over 4 turns",
                "type": "physical",
                "damage": 0.9,
                "manaCost": 0,
                "staminaCost": 16,
                "cooldown": 3,
                "target": "enemy",
                "effect": {
                  "type": "bleed",
                  "damage": 0.12,
                  "duration": 4
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_11.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_10_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 15 - Elite",
          "requiredLevel": 15,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000D0B-A5F75C9E",
              "id": "r_sniper",
              "name": "Sniper",
              "icon": "/icons/skill_nobg/Archerskill_11_nobg.png",
              "description": "Massive long range damage",
              "effect": "+100% Range Damage",
              "maxPoints": 1,
              "requires": "r_piercing",
              "bonuses": {
                "damage": 12,
                "criticalChance": 8
              },
              "grantedAbility": {
                "id": "sniper_shot",
                "name": "Sniper Shot",
                "icon": "bow",
                "description": "A perfectly aimed shot that always critically strikes for massive damage",
                "type": "physical",
                "damage": 2.8,
                "manaCost": 0,
                "staminaCost": 30,
                "cooldown": 5,
                "target": "enemy",
                "guaranteedCrit": true,
                "iconUrl": "/icons/skills/class/hunter/hunter_12.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_11_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D0C-57452BE5",
              "id": "r_wind_walk",
              "name": "Wind Walk",
              "icon": "/icons/skill_nobg/Archerskill_12_nobg.png",
              "description": "Become invisible briefly",
              "effect": "Stealth + Speed",
              "maxPoints": 2,
              "requires": "r_trap",
              "bonuses": {
                "evasion": 8,
                "movementSpeed": 5
              },
              "grantedAbility": {
                "id": "wind_walk",
                "name": "Wind Walk",
                "icon": "energy",
                "description": "Fade into the wind, boosting evasion by 60% for 2 turns",
                "type": "buff",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 18,
                "cooldown": 5,
                "target": "self",
                "effect": {
                  "stat": "evasion",
                  "flat": 60,
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_13.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_12_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D0D-BAE7BDDE",
              "id": "r_sleep_dart",
              "name": "Sleep Dart",
              "icon": "/icons/skill_nobg/Archerskill_13_nobg.png",
              "description": "A tranquilizer dart that puts the enemy to sleep",
              "effect": "Sleep 2 Turns",
              "maxPoints": 2,
              "requires": "r_venom_arrow",
              "bonuses": {
                "damage": 3
              },
              "grantedAbility": {
                "id": "sleep_dart",
                "name": "Sleep Dart",
                "icon": "moon",
                "description": "Fire a tranquilizer dart, putting the enemy to sleep for 2 turns. Damage wakes them.",
                "type": "physical",
                "damage": 0,
                "manaCost": 0,
                "staminaCost": 20,
                "cooldown": 6,
                "target": "enemy",
                "effect": {
                  "type": "sleep",
                  "duration": 2
                },
                "iconUrl": "/icons/skills/class/hunter/hunter_14.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_13_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D0E-51D7A055",
              "id": "r_expose_weakness",
              "name": "Expose Weakness",
              "icon": "/icons/skill_nobg/Archerskill_14_nobg.png",
              "description": "Crits reduce enemy attack power",
              "effect": "Crit Debuff",
              "maxPoints": 2,
              "requires": "r_hunters_mark",
              "bonuses": {
                "criticalChance": 5,
                "damage": 3
              },
              "passive": true,
              "procEffect": {
                "type": "lower_attack",
                "percent": 0.12,
                "duration": 2,
                "onCrit": true
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_14_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary",
          "requiredLevel": 20,
          "skills": [
            {
              "uuid": "SKIL-20260621232130-000D0F-58FB3F7E",
              "id": "r_arrow_storm",
              "name": "Arrow Storm",
              "icon": "/icons/skill_nobg/Archerskill_15_nobg.png",
              "description": "Rain arrows from the sky",
              "effect": "Ultimate: Arrow Rain",
              "maxPoints": 1,
              "requires": "r_sniper",
              "bonuses": {
                "damage": 18,
                "criticalChance": 10,
                "attackSpeed": 10
              },
              "grantedAbility": {
                "id": "arrow_storm",
                "name": "Arrow Storm",
                "icon": "star",
                "description": "Rain a devastating storm of arrows on all enemies",
                "type": "physical",
                "damage": 3.5,
                "manaCost": 0,
                "staminaCost": 40,
                "cooldown": 7,
                "target": "enemy",
                "isAoE": true,
                "iconUrl": "/icons/skills/class/hunter/hunter_16.png",
                "sourcePack": "hunter"
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_15_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "uuid": "SKIL-20260621232130-000D10-78251387",
              "id": "r_death_blossom",
              "name": "Death Blossom",
              "icon": "/icons/skill_nobg/Archerskill_16_nobg.png",
              "description": "Attacks apply all DOTs at once (poison, bleed, lower defense)",
              "effect": "Multi-DOT Proc",
              "maxPoints": 1,
              "requires": "r_bleed_arrow",
              "bonuses": {
                "damage": 12,
                "criticalChance": 8
              },
              "passive": true,
              "procEffect": {
                "type": "multi_dot",
                "effects": [
                  "poison",
                  "bleed",
                  "lower_defense"
                ],
                "chance": 0.25
              },
              "iconUrl": "/icons/skill_nobg/Archerskill_16_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        }
      ],
      "family": "ranger",
      "graph": {
        "totalNodes": 21,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 6
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-r_precision",
            "id": 1,
            "name": "Precision",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Better accuracy",
            "skillId": "r_precision",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_swift_draw",
            "id": 2,
            "name": "Swift Draw",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Faster arrow nocking",
            "skillId": "r_swift_draw",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_crippling_shot",
            "id": 3,
            "name": "Crippling Shot",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Arrows weaken enemy defenses",
            "skillId": "r_crippling_shot",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Ranger-P1",
            "id": 4,
            "name": "Level 5 - Hunter",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Hunter.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_headshot",
            "id": 5,
            "name": "Headshot",
            "x": 18,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Critical damage bonus",
            "skillId": "r_headshot",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_evasion",
            "id": 6,
            "name": "Nature's Grace",
            "x": 39.33333333333333,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Dodge chance up",
            "skillId": "r_evasion",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_venom_arrow",
            "id": 7,
            "name": "Venom Arrow",
            "x": 60.666666666666664,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Tip arrows with deadly poison",
            "skillId": "r_venom_arrow",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_hunters_mark",
            "id": 8,
            "name": "Quarry Brand",
            "x": 82,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Mark the target, lowering its defense",
            "skillId": "r_hunters_mark",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Ranger-P2",
            "id": 9,
            "name": "Level 10 - Sharpshooter",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Sharpshooter.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_piercing",
            "id": 10,
            "name": "Bodkin Shot",
            "x": 18,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Arrows pierce armor",
            "skillId": "r_piercing",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_multishot",
            "id": 11,
            "name": "Arrow Fan",
            "x": 39.33333333333333,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Fire multiple arrows",
            "skillId": "r_multishot",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_trap",
            "id": 12,
            "name": "Bear Trap",
            "x": 60.666666666666664,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Place traps that root",
            "skillId": "r_trap",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_bleed_arrow",
            "id": 13,
            "name": "Barbed Arrow",
            "x": 82,
            "y": 60,
            "reqLevel": 10,
            "parent": 9,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Barbed tips cause heavy bleeding",
            "skillId": "r_bleed_arrow",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Ranger-P3",
            "id": 14,
            "name": "Level 15 - Elite",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 9,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Elite.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_sniper",
            "id": 15,
            "name": "Sniper",
            "x": 18,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Massive long range damage",
            "skillId": "r_sniper",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_wind_walk",
            "id": 16,
            "name": "Wind Walk",
            "x": 39.33333333333333,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Become invisible briefly",
            "skillId": "r_wind_walk",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_sleep_dart",
            "id": 17,
            "name": "Sleep Dart",
            "x": 60.666666666666664,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "combat",
            "description": "A tranquilizer dart that puts the enemy to sleep",
            "skillId": "r_sleep_dart",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_expose_weakness",
            "id": 18,
            "name": "Expose Weakness",
            "x": 82,
            "y": 44,
            "reqLevel": 15,
            "parent": 14,
            "branch": "Center",
            "nodeType": "effect",
            "description": "Crits reduce enemy attack power",
            "skillId": "r_expose_weakness",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Ranger-P4",
            "id": 19,
            "name": "Level 20 - Legendary",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 14,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_arrow_storm",
            "id": 20,
            "name": "Arrow Storm",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Rain arrows from the sky",
            "skillId": "r_arrow_storm",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-r_death_blossom",
            "id": 21,
            "name": "Death Blossom",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 19,
            "branch": "Right",
            "nodeType": "effect",
            "description": "Attacks apply all DOTs at once (poison, bleed, lower defense)",
            "skillId": "r_death_blossom",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "r_precision",
        "name": "Precision",
        "description": "Better accuracy"
      }
    },
    "priest": {
      "uuid": "ITEM-20260821120000-PRIEST-0001",
      "className": "Priest",
      "color": "#fde68a",
      "family": "mage",
      "tiers": [
        {
          "name": "Level 1 - Ledger",
          "requiredLevel": 1,
          "skills": [
            {
              "id": "p_mercy_ledger",
              "name": "Mercy Ledger",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_01.png",
              "description": "Healing you do is written as Mercy: 1 per 8 HP restored, cap 40. Mercy holds while you are in combat and fades outside it. This record is what your strikes hit with.",
              "effect": "1 Mercy / 8 HP healed · cap 40",
              "maxPoints": 1,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_01.png",
              "sourcePack": "priest",
              "passive": true
            },
            {
              "id": "p_mend",
              "name": "Mend",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_02.png",
              "description": "Restore an ally. Every point of that heal is written to Mercy.",
              "effect": "Heal · writes Mercy",
              "maxPoints": 3,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_02.png",
              "sourcePack": "priest",
              "requires": "p_mercy_ledger",
              "grantedAbility": {
                "id": "p_mend",
                "name": "Mend",
                "description": "Restore an ally. Every point of that heal is written to Mercy.",
                "type": "heal",
                "damage": 0,
                "manaCost": 14,
                "staminaCost": 0,
                "cooldown": 0,
                "target": "ally",
                "effect": {
                  "healPercent": 0.18,
                  "writesMercy": true
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_02.png",
                "sourcePack": "priest"
              }
            },
            {
              "id": "p_debt_lash",
              "name": "Debt Lash",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_03.png",
              "description": "A holy strike whose damage rises with the Mercy you have stored. It does not spend the ledger. You hit harder because of the healing you have already done.",
              "effect": "Hit + 35% of current Mercy",
              "maxPoints": 3,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_03.png",
              "sourcePack": "priest",
              "requires": "p_mercy_ledger",
              "grantedAbility": {
                "id": "p_debt_lash",
                "name": "Debt Lash",
                "description": "A holy strike whose damage rises with the Mercy you have stored. It does not spend the ledger. You hit harder because of the healing you have already done.",
                "type": "holy",
                "damage": 14,
                "manaCost": 8,
                "staminaCost": 0,
                "cooldown": 0,
                "target": "enemy",
                "effect": {
                  "mercyDamageRatio": 0.35,
                  "spendsMercy": false
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_03.png",
                "sourcePack": "priest"
              }
            }
          ]
        },
        {
          "name": "Level 5 - Witness",
          "requiredLevel": 5,
          "skills": [
            {
              "id": "p_witness",
              "name": "Witness",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_04.png",
              "description": "Mark one ally for 12 seconds. Heals on that ally write double Mercy. Pick who you are keeping alive.",
              "effect": "12s · double Mercy on one ally",
              "maxPoints": 3,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_04.png",
              "sourcePack": "priest",
              "requires": "p_mend",
              "grantedAbility": {
                "id": "p_witness",
                "name": "Witness",
                "description": "Mark one ally for 12 seconds. Heals on that ally write double Mercy. Pick who you are keeping alive.",
                "type": "buff",
                "damage": 0,
                "manaCost": 10,
                "staminaCost": 0,
                "cooldown": 10,
                "target": "ally",
                "effect": {
                  "duration": 12,
                  "mercyMultiplier": 2
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_04.png",
                "sourcePack": "priest"
              }
            },
            {
              "id": "p_unwrite",
              "name": "Unwrite",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_05.png",
              "description": "Strip one harmful effect from an ally. The harm you remove is written as Mercy.",
              "effect": "Cleanse 1 · +8 Mercy",
              "maxPoints": 3,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_05.png",
              "sourcePack": "priest",
              "requires": "p_mercy_ledger",
              "grantedAbility": {
                "id": "p_unwrite",
                "name": "Unwrite",
                "description": "Strip one harmful effect from an ally. The harm you remove is written as Mercy.",
                "type": "dispel",
                "damage": 0,
                "manaCost": 12,
                "staminaCost": 0,
                "cooldown": 12,
                "target": "ally",
                "effect": {
                  "dispels": 1,
                  "mercyOnDispel": 8
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_05.png",
                "sourcePack": "priest"
              }
            }
          ]
        },
        {
          "name": "Level 10 - The Account",
          "requiredLevel": 10,
          "skills": [
            {
              "id": "p_kept_wound",
              "name": "Kept Wound",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_06.png",
              "description": "While any ally is under half health, your heals write half again as much Mercy, and Debt Lash hits harder. The hurt ally is the book filling.",
              "effect": "+50% Mercy write and +20% Lash while an ally is hurt",
              "maxPoints": 3,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_06.png",
              "sourcePack": "priest",
              "passive": true,
              "requires": "p_mend"
            },
            {
              "id": "p_brand",
              "name": "Brand",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_07.png",
              "description": "Spend 15 Mercy to brand one enemy for 6 seconds. The brand burns lightly. Rectified and Shared Strike read this mark.",
              "effect": "Spend 15 Mercy · 6s brand burn",
              "maxPoints": 2,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_07.png",
              "sourcePack": "priest",
              "requires": "p_debt_lash",
              "grantedAbility": {
                "id": "p_brand",
                "name": "Brand",
                "description": "Spend 15 Mercy to brand one enemy for 6 seconds. The brand burns lightly. Rectified and Shared Strike read this mark.",
                "type": "debuff",
                "damage": 6,
                "manaCost": 10,
                "staminaCost": 0,
                "cooldown": 10,
                "target": "enemy",
                "effect": {
                  "spendMercy": 15,
                  "duration": 6,
                  "brand": true
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_07.png",
                "sourcePack": "priest"
              }
            },
            {
              "id": "p_step_to_hurt",
              "name": "Step to the Hurt",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_09.png",
              "description": "Cross to your most hurt ally and Mend them. That Mend writes Mercy.",
              "effect": "Move to lowest ally · Mend",
              "maxPoints": 2,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_09.png",
              "sourcePack": "priest",
              "requires": "p_mend",
              "grantedAbility": {
                "id": "p_step_to_hurt",
                "name": "Step to the Hurt",
                "description": "Cross to your most hurt ally and Mend them. That Mend writes Mercy.",
                "type": "heal",
                "damage": 0,
                "manaCost": 16,
                "staminaCost": 0,
                "cooldown": 14,
                "target": "ally",
                "effect": {
                  "dashToLowest": true,
                  "then": "p_mend",
                  "writesMercy": true
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_09.png",
                "sourcePack": "priest"
              }
            }
          ]
        },
        {
          "name": "Level 15 - Full Book",
          "requiredLevel": 15,
          "skills": [
            {
              "id": "p_full_book",
              "name": "Full Book",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_10.png",
              "description": "At 40 Mercy the ledger stops fading, and Debt Lash and Brand deal more. You feel the book fill.",
              "effect": "At cap: no decay, +25% Lash and Brand",
              "maxPoints": 2,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_10.png",
              "sourcePack": "priest",
              "passive": true,
              "requires": "p_mercy_ledger"
            },
            {
              "id": "p_shared_strike",
              "name": "Shared Strike",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_08.png",
              "description": "For 6 seconds, each ally attack on your Branded enemy heals that attacker. This is the small taste of Rectified. It does not spend the book.",
              "effect": "6s · ally hits on Brand heal the attacker",
              "maxPoints": 2,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_08.png",
              "sourcePack": "priest",
              "requires": "p_brand",
              "grantedAbility": {
                "id": "p_shared_strike",
                "name": "Shared Strike",
                "description": "For 6 seconds, each ally attack on your Branded enemy heals that attacker. This is the small taste of Rectified. It does not spend the book.",
                "type": "buff",
                "damage": 0,
                "manaCost": 18,
                "staminaCost": 0,
                "cooldown": 16,
                "target": "self",
                "effect": {
                  "duration": 6,
                  "allyHitHealOnBrand": true,
                  "spendsMercy": false
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_08.png",
                "sourcePack": "priest"
              }
            }
          ]
        },
        {
          "name": "Level 20 - Rectified",
          "requiredLevel": 20,
          "skills": [
            {
              "id": "p_rectified",
              "name": "Rectified",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_12.png",
              "description": "One unleash. Spend all Mercy on one enemy for 8 seconds: a holy burn each second equal to the Mercy spent, split across the mark. Every ally attack on that enemy heals the attacker for one burn tick. You cannot cast it again until the mark ends.",
              "effect": "Spend all Mercy · 8s burn · ally hits heal",
              "maxPoints": 1,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_12.png",
              "sourcePack": "priest",
              "requires": "p_brand",
              "grantedAbility": {
                "id": "rectified",
                "name": "Rectified",
                "description": "One unleash. Spend all Mercy on one enemy for 8 seconds: a holy burn each second equal to the Mercy spent, split across the mark. Every ally attack on that enemy heals the attacker for one burn tick. You cannot cast it again until the mark ends.",
                "type": "holy",
                "damage": 0,
                "manaCost": 25,
                "staminaCost": 0,
                "cooldown": 8,
                "target": "enemy",
                "effect": {
                  "spendAllMercy": true,
                  "duration": 8,
                  "burnPerSecond": "mercySpent/8",
                  "allyAttackHeal": "oneBurnTick",
                  "singleUnleash": true
                },
                "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_12.png",
                "sourcePack": "priest"
              }
            },
            {
              "id": "p_settled_ledger",
              "name": "Settled Ledger",
              "icon": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_11.png",
              "description": "When Rectified ends, a quarter of the Mercy you spent comes back, and allies it healed keep a 3 second regen. The unleash does not leave you empty.",
              "effect": "25% Mercy returns · 3s regen on healed allies",
              "maxPoints": 1,
              "iconUrl": "https://assets.grudge-studio.com/game-assets/icons/skills/class/priest/priest_11.png",
              "sourcePack": "priest",
              "passive": true,
              "requires": "p_rectified"
            }
          ]
        }
      ],
      "graph": {
        "totalNodes": 16,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 1
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-p_mercy_ledger",
            "id": 1,
            "name": "Mercy Ledger",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Healing you do is written as Mercy: 1 per 8 HP restored, cap 40. Mercy holds while you are in combat and fades outside it. This record is what your strikes hit with.",
            "skillId": "p_mercy_ledger",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_mend",
            "id": 2,
            "name": "Mend",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Restore an ally. Every point of that heal is written to Mercy.",
            "skillId": "p_mend",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_debt_lash",
            "id": 3,
            "name": "Debt Lash",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "A holy strike whose damage rises with the Mercy you have stored. It does not spend the ledger. You hit harder because of the healing you have already done.",
            "skillId": "p_debt_lash",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Priest-P1",
            "id": 4,
            "name": "Level 5 - Witness",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Witness.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_witness",
            "id": 5,
            "name": "Witness",
            "x": 32,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Mark one ally for 12 seconds. Heals on that ally write double Mercy. Pick who you are keeping alive.",
            "skillId": "p_witness",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_unwrite",
            "id": 6,
            "name": "Unwrite",
            "x": 68,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Strip one harmful effect from an ally. The harm you remove is written as Mercy.",
            "skillId": "p_unwrite",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Priest-P2",
            "id": 7,
            "name": "Level 10 - The Account",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - The Account.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_kept_wound",
            "id": 8,
            "name": "Kept Wound",
            "x": 22,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Left",
            "nodeType": "effect",
            "description": "While any ally is under half health, your heals write half again as much Mercy, and Debt Lash hits harder. The hurt ally is the book filling.",
            "skillId": "p_kept_wound",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_brand",
            "id": 9,
            "name": "Brand",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Spend 15 Mercy to brand one enemy for 6 seconds. The brand burns lightly. Rectified and Shared Strike read this mark.",
            "skillId": "p_brand",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_step_to_hurt",
            "id": 10,
            "name": "Step to the Hurt",
            "x": 78,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Cross to your most hurt ally and Mend them. That Mend writes Mercy.",
            "skillId": "p_step_to_hurt",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Priest-P3",
            "id": 11,
            "name": "Level 15 - Full Book",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 7,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Full Book.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_full_book",
            "id": 12,
            "name": "Full Book",
            "x": 32,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Left",
            "nodeType": "effect",
            "description": "At 40 Mercy the ledger stops fading, and Debt Lash and Brand deal more. You feel the book fill.",
            "skillId": "p_full_book",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_shared_strike",
            "id": 13,
            "name": "Shared Strike",
            "x": 68,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Right",
            "nodeType": "combat",
            "description": "For 6 seconds, each ally attack on your Branded enemy heals that attacker. This is the small taste of Rectified. It does not spend the book.",
            "skillId": "p_shared_strike",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Priest-P4",
            "id": 14,
            "name": "Level 20 - Rectified",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 11,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Rectified.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_rectified",
            "id": 15,
            "name": "Rectified",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "One unleash. Spend all Mercy on one enemy for 8 seconds: a holy burn each second equal to the Mercy spent, split across the mark. Every ally attack on that enemy heals the attacker for one burn tick. You cannot cast it again until the mark ends.",
            "skillId": "p_rectified",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-p_settled_ledger",
            "id": 16,
            "name": "Settled Ledger",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Right",
            "nodeType": "effect",
            "description": "When Rectified ends, a quarter of the Mercy you spent comes back, and allies it healed keep a 3 second regen. The unleash does not leave you empty.",
            "skillId": "p_settled_ledger",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "p_mercy_ledger",
        "name": "Mercy Ledger",
        "description": "Healing you have done is the damage you can deal. Rectified is the single unleash of that holy power."
      },
      "role": "Healing writes Mercy. Strikes deal damage from that record. Rectified spends the whole book: one holy burn, and allies are healed for attacking that enemy."
    },
    "raider": {
      "uuid": "ITEM-20260821120000-RAIDER-0001",
      "className": "Raider",
      "color": "#b91c1c",
      "family": "warrior",
      "tiers": [
        {
          "name": "Level 1 - Two-Hand School",
          "requiredLevel": 1,
          "skills": [
            {
              "id": "rd_riposte",
              "name": "Riposte Stance",
              "icon": "/icons/skill_nobg/Warriorskill_01_nobg.png",
              "description": "Every 2H swing opens a parry window",
              "effect": "Parry 0.35s",
              "maxPoints": 1,
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Warriorskill_01_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_overpower",
              "name": "Crushing Rebuke",
              "icon": "/icons/skill_nobg/Warriorskill_02_nobg.png",
              "description": "Cannot miss after a parry",
              "effect": "2H follow-up",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Warriorskill_02_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_rend",
              "name": "Gash",
              "icon": "/icons/skill_nobg/Warriorskill_03_nobg.png",
              "description": "2H bleed DoT",
              "effect": "Bleed 8s",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Warriorskill_03_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 5 - Specialization",
          "requiredLevel": 5,
          "skills": [
            {
              "id": "rd_sweeping",
              "name": "Twin Arc",
              "icon": "/icons/skill_nobg/Warriorskill_04_nobg.png",
              "description": "Next 5 hits cleave",
              "effect": "Pack tank",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Warriorskill_04_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_iron_parry",
              "name": "Iron Parry",
              "icon": "/icons/skill_nobg/Warriorskill_05_nobg.png",
              "description": "Parry chance up. Absorb per parry",
              "effect": "+12% parry",
              "maxPoints": 3,
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Warriorskill_05_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 10 - Advanced Combat",
          "requiredLevel": 10,
          "skills": [
            {
              "id": "rd_mortal",
              "name": "Wounding Blow",
              "icon": "/icons/skill_nobg/Warriorskill_06_nobg.png",
              "description": "Healing received cut 50%",
              "effect": "PvP pressure",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Warriorskill_06_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_die_by_sword",
              "name": "Edge of Defiance",
              "icon": "/icons/skill_nobg/Warriorskill_07_nobg.png",
              "description": "Parry and dodge doubled 8s",
              "effect": "Last stand window",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Warriorskill_07_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_charge",
              "name": "Bull Rush",
              "icon": "/icons/skill_nobg/Warriorskill_08_nobg.png",
              "description": "Gap close. Opens Riposte",
              "effect": "12y root 1s",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Warriorskill_08_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 15 - Master Raider",
          "requiredLevel": 15,
          "skills": [
            {
              "id": "rd_colossus",
              "name": "Plate Breaker",
              "icon": "/icons/skill_nobg/Warriorskill_09_nobg.png",
              "description": "Armor break 8s",
              "effect": "-30% armor",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Warriorskill_09_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_bladestorm",
              "name": "Iron Gale",
              "icon": "/icons/skill_nobg/Warriorskill_10_nobg.png",
              "description": "Spin 4s. Parry still works",
              "effect": "4m AoE",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Warriorskill_10_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary Raider",
          "requiredLevel": 20,
          "skills": [
            {
              "id": "rd_recklessness",
              "name": "Heedless Fury",
              "icon": "/icons/skill_nobg/Warriorskill_11_nobg.png",
              "description": "All 2H hits crit. Parry stays open",
              "effect": "12s",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Warriorskill_11_nobg.png",
              "sourcePack": "barbarian"
            },
            {
              "id": "rd_last_stand",
              "name": "Final Grudge",
              "icon": "/icons/skill_nobg/Warriorskill_12_nobg.png",
              "description": "+30% HP. Parry refunds heal",
              "effect": "2H tank ult",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Warriorskill_12_nobg.png",
              "sourcePack": "barbarian"
            }
          ]
        }
      ],
      "graph": {
        "totalNodes": 16,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 1
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-rd_riposte",
            "id": 1,
            "name": "Riposte Stance",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Every 2H swing opens a parry window",
            "skillId": "rd_riposte",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_overpower",
            "id": 2,
            "name": "Crushing Rebuke",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Cannot miss after a parry",
            "skillId": "rd_overpower",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_rend",
            "id": 3,
            "name": "Gash",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "2H bleed DoT",
            "skillId": "rd_rend",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Raider-P1",
            "id": 4,
            "name": "Level 5 - Specialization",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Specialization.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_sweeping",
            "id": 5,
            "name": "Twin Arc",
            "x": 32,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Next 5 hits cleave",
            "skillId": "rd_sweeping",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_iron_parry",
            "id": 6,
            "name": "Iron Parry",
            "x": 68,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "effect",
            "description": "Parry chance up. Absorb per parry",
            "skillId": "rd_iron_parry",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Raider-P2",
            "id": 7,
            "name": "Level 10 - Advanced Combat",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Advanced Combat.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_mortal",
            "id": 8,
            "name": "Wounding Blow",
            "x": 22,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Healing received cut 50%",
            "skillId": "rd_mortal",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_die_by_sword",
            "id": 9,
            "name": "Edge of Defiance",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Parry and dodge doubled 8s",
            "skillId": "rd_die_by_sword",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_charge",
            "id": 10,
            "name": "Bull Rush",
            "x": 78,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Gap close. Opens Riposte",
            "skillId": "rd_charge",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Raider-P3",
            "id": 11,
            "name": "Level 15 - Master Raider",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 7,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Master Raider.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_colossus",
            "id": 12,
            "name": "Plate Breaker",
            "x": 32,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Armor break 8s",
            "skillId": "rd_colossus",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_bladestorm",
            "id": 13,
            "name": "Iron Gale",
            "x": 68,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Spin 4s. Parry still works",
            "skillId": "rd_bladestorm",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Raider-P4",
            "id": 14,
            "name": "Level 20 - Legendary Raider",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 11,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary Raider.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_recklessness",
            "id": 15,
            "name": "Heedless Fury",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "All 2H hits crit. Parry stays open",
            "skillId": "rd_recklessness",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-rd_last_stand",
            "id": 16,
            "name": "Final Grudge",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "+30% HP. Parry refunds heal",
            "skillId": "rd_last_stand",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "rd_riposte",
        "name": "Riposte Stance",
        "description": "Every 2H swing opens a parry window"
      }
    },
    "thief": {
      "uuid": "ITEM-20260821120000-THIEF-0001",
      "className": "Thief",
      "color": "#ca8a04",
      "family": "ranger",
      "tiers": [
        {
          "name": "Level 1 - Cutthroat Basics",
          "requiredLevel": 1,
          "skills": [
            {
              "id": "t_between",
              "name": "Brow Breaker",
              "icon": "/icons/skill_nobg/Archerskill_01_nobg.png",
              "description": "Combo finisher stun + crit",
              "effect": "Spend combo",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Archerskill_01_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_sinister",
              "name": "Dirty Cut",
              "icon": "/icons/skill_nobg/Archerskill_02_nobg.png",
              "description": "Combo builder",
              "effect": "+1 combo",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Archerskill_02_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_pistol",
              "name": "Flintlock Crack",
              "icon": "/icons/skill_nobg/Archerskill_03_nobg.png",
              "description": "Ranged interrupt",
              "effect": "12y interrupt",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Archerskill_03_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 5 - Specialization",
          "requiredLevel": 5,
          "skills": [
            {
              "id": "t_blade_flurry",
              "name": "Steel Squall",
              "icon": "/icons/skill_nobg/Archerskill_04_nobg.png",
              "description": "Melee hits splash nearby foes",
              "effect": "40% splash 10s",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Archerskill_04_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_grapple",
              "name": "Boarding Hook",
              "icon": "/icons/skill_nobg/Archerskill_05_nobg.png",
              "description": "Pull to a point or target",
              "effect": "14y",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Archerskill_05_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 10 - Advanced Cutthroat",
          "requiredLevel": 10,
          "skills": [
            {
              "id": "t_roll",
              "name": "Liar's Dice",
              "icon": "/icons/skill_nobg/Archerskill_06_nobg.png",
              "description": "Random combat buff table",
              "effect": "20s",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Archerskill_06_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_kidney",
              "name": "Skull Rattle",
              "icon": "/icons/skill_nobg/Archerskill_07_nobg.png",
              "description": "Combo stun",
              "effect": "1–4s",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Archerskill_07_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_smoke",
              "name": "Saltsmoke Pot",
              "icon": "/icons/skill_nobg/Archerskill_08_nobg.png",
              "description": "Targeted spells miss inside",
              "effect": "5s 5m",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Archerskill_08_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 15 - Master Thief",
          "requiredLevel": 15,
          "skills": [
            {
              "id": "t_adrenaline",
              "name": "Grogfire Rush",
              "icon": "/icons/skill_nobg/Archerskill_09_nobg.png",
              "description": "Combo generation doubled",
              "effect": "10s",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Archerskill_09_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_vanish",
              "name": "Saltsmoke Fade",
              "icon": "/icons/skill_nobg/Archerskill_10_nobg.png",
              "description": "Drop combat. Next strike crits",
              "effect": "4s stealth",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Archerskill_10_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        },
        {
          "name": "Level 20 - Legendary Cutthroat",
          "requiredLevel": 20,
          "skills": [
            {
              "id": "t_killing_spree",
              "name": "Red Wake",
              "icon": "/icons/skill_nobg/Archerskill_11_nobg.png",
              "description": "Seven teleport hits",
              "effect": "Immune while dashing",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Archerskill_11_nobg.png",
              "sourcePack": "hunter"
            },
            {
              "id": "t_dreadblades",
              "name": "Grudgeblades",
              "icon": "/icons/skill_nobg/Archerskill_12_nobg.png",
              "description": "Combo spenders cost nothing",
              "effect": "12s",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Archerskill_12_nobg.png",
              "sourcePack": "hunter"
            }
          ]
        }
      ],
      "graph": {
        "totalNodes": 16,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 1
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-t_between",
            "id": 1,
            "name": "Brow Breaker",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Combo finisher stun + crit",
            "skillId": "t_between",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_sinister",
            "id": 2,
            "name": "Dirty Cut",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Combo builder",
            "skillId": "t_sinister",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_pistol",
            "id": 3,
            "name": "Flintlock Crack",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Ranged interrupt",
            "skillId": "t_pistol",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Thief-P1",
            "id": 4,
            "name": "Level 5 - Specialization",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Specialization.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_blade_flurry",
            "id": 5,
            "name": "Steel Squall",
            "x": 32,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Melee hits splash nearby foes",
            "skillId": "t_blade_flurry",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_grapple",
            "id": 6,
            "name": "Boarding Hook",
            "x": 68,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Pull to a point or target",
            "skillId": "t_grapple",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Thief-P2",
            "id": 7,
            "name": "Level 10 - Advanced Cutthroat",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Advanced Cutthroat.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_roll",
            "id": 8,
            "name": "Liar's Dice",
            "x": 22,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Random combat buff table",
            "skillId": "t_roll",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_kidney",
            "id": 9,
            "name": "Skull Rattle",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Combo stun",
            "skillId": "t_kidney",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_smoke",
            "id": 10,
            "name": "Saltsmoke Pot",
            "x": 78,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Targeted spells miss inside",
            "skillId": "t_smoke",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Thief-P3",
            "id": 11,
            "name": "Level 15 - Master Thief",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 7,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Master Thief.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_adrenaline",
            "id": 12,
            "name": "Grogfire Rush",
            "x": 32,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Combo generation doubled",
            "skillId": "t_adrenaline",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_vanish",
            "id": 13,
            "name": "Saltsmoke Fade",
            "x": 68,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Drop combat. Next strike crits",
            "skillId": "t_vanish",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Thief-P4",
            "id": 14,
            "name": "Level 20 - Legendary Cutthroat",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 11,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Legendary Cutthroat.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_killing_spree",
            "id": 15,
            "name": "Red Wake",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Seven teleport hits",
            "skillId": "t_killing_spree",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-t_dreadblades",
            "id": 16,
            "name": "Grudgeblades",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Combo spenders cost nothing",
            "skillId": "t_dreadblades",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "t_between",
        "name": "Brow Breaker",
        "description": "Combo finisher stun + crit"
      }
    },
    "verduror": {
      "uuid": "ITEM-20260821120000-VERDUR-0001",
      "className": "Verduror",
      "color": "#86efac",
      "family": "worge",
      "tiers": [
        {
          "name": "Level 1 - Mist Arts",
          "requiredLevel": 1,
          "skills": [
            {
              "id": "v_jade_mist",
              "name": "Jade Mist Form",
              "icon": "/icons/skill_nobg/Druideskill_01_nobg.png",
              "description": "Mist aura heals nearby allies while you melee",
              "effect": "Stance HPS",
              "maxPoints": 1,
              "passive": true,
              "iconUrl": "/icons/skill_nobg/Druideskill_01_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_soothing_mist",
              "name": "Calming Spray",
              "icon": "/icons/skill_nobg/Druideskill_02_nobg.png",
              "description": "Channeled single heal",
              "effect": "Instant other heals on target",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Druideskill_02_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_crane_kick",
              "name": "Crane Kick",
              "icon": "/icons/skill_nobg/Druideskill_03_nobg.png",
              "description": "Melee kick. Splashes Calming Spray",
              "effect": "Fistweaver filler",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Druideskill_03_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 5 - Envelop",
          "requiredLevel": 5,
          "skills": [
            {
              "id": "v_enveloping",
              "name": "Sea Fog Embrace",
              "icon": "/icons/skill_nobg/Druideskill_04_nobg.png",
              "description": "Hot + incoming reduced",
              "effect": "-20% taken 6s",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Druideskill_04_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_rising_sun",
              "name": "Dawnbreaker Kick",
              "icon": "/icons/skill_nobg/Druideskill_05_nobg.png",
              "description": "Next 3 Crane Kicks heal more",
              "effect": "Loop",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Druideskill_05_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 10 - Forms",
          "requiredLevel": 10,
          "skills": [
            {
              "id": "v_chiji",
              "name": "Chi-Ji Form",
              "icon": "/icons/skill_nobg/Druideskill_06_nobg.png",
              "description": "Crane form. Gusts heal as you melee",
              "effect": "+20% MS 20s",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Druideskill_06_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_revival",
              "name": "Mass Mending",
              "icon": "/icons/skill_nobg/Druideskill_07_nobg.png",
              "description": "Party AoE heal",
              "effect": "35% 15m",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Druideskill_07_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_detox",
              "name": "Bile Purge",
              "icon": "/icons/skill_nobg/Druideskill_08_nobg.png",
              "description": "Dispel magic, poison, disease",
              "effect": "2 dispels",
              "maxPoints": 3,
              "iconUrl": "/icons/skill_nobg/Druideskill_08_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 15 - Focus",
          "requiredLevel": 15,
          "skills": [
            {
              "id": "v_tea",
              "name": "Stormbrew Draught",
              "icon": "/icons/skill_nobg/Druideskill_09_nobg.png",
              "description": "Next heal instant and empowered",
              "effect": "15s",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Druideskill_09_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_font",
              "name": "Wellspring",
              "icon": "/icons/skill_nobg/Druideskill_10_nobg.png",
              "description": "Moving AoE heal",
              "effect": "Walk the party",
              "maxPoints": 2,
              "iconUrl": "/icons/skill_nobg/Druideskill_10_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        },
        {
          "name": "Level 20 - Celestial",
          "requiredLevel": 20,
          "skills": [
            {
              "id": "v_celestial",
              "name": "Celestial Form",
              "icon": "/icons/skill_nobg/Druideskill_11_nobg.png",
              "description": "Mist heals double. You can still Crane Kick",
              "effect": "16s",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Druideskill_11_nobg.png",
              "sourcePack": "necromancer"
            },
            {
              "id": "v_serpent",
              "name": "Invoke Serpent",
              "icon": "/icons/skill_nobg/Druideskill_12_nobg.png",
              "description": "Jade serpent channels Calming Spray while you melee",
              "effect": "20s",
              "maxPoints": 1,
              "iconUrl": "/icons/skill_nobg/Druideskill_12_nobg.png",
              "sourcePack": "necromancer"
            }
          ]
        }
      ],
      "graph": {
        "totalNodes": 16,
        "branches": [
          {
            "name": "Core",
            "color": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            },
            "nodeCount": 3
          },
          {
            "name": "Path",
            "color": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Left",
            "color": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Right",
            "color": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            },
            "nodeCount": 4
          },
          {
            "name": "Center",
            "color": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            },
            "nodeCount": 1
          }
        ],
        "nodes": [
          {
            "uuid": "NODE-CLASS-v_jade_mist",
            "id": 1,
            "name": "Jade Mist Form",
            "x": 22,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "effect",
            "description": "Mist aura heals nearby allies while you melee",
            "skillId": "v_jade_mist",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_soothing_mist",
            "id": 2,
            "name": "Calming Spray",
            "x": 50,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Channeled single heal",
            "skillId": "v_soothing_mist",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_crane_kick",
            "id": 3,
            "name": "Crane Kick",
            "x": 78,
            "y": 92,
            "reqLevel": 1,
            "parent": null,
            "branch": "Core",
            "nodeType": "combat",
            "description": "Melee kick. Splashes Calming Spray",
            "skillId": "v_crane_kick",
            "l0": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#fbbf24",
              "fill": "rgba(251,191,36,0.25)"
            }
          },
          {
            "uuid": "NODE-CLASS-Verduror-P1",
            "id": 4,
            "name": "Level 5 - Envelop",
            "x": 50,
            "y": 84,
            "reqLevel": 4,
            "parent": 1,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 5 - Envelop.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_enveloping",
            "id": 5,
            "name": "Sea Fog Embrace",
            "x": 32,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Hot + incoming reduced",
            "skillId": "v_enveloping",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_rising_sun",
            "id": 6,
            "name": "Dawnbreaker Kick",
            "x": 68,
            "y": 76,
            "reqLevel": 5,
            "parent": 4,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Next 3 Crane Kicks heal more",
            "skillId": "v_rising_sun",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Verduror-P2",
            "id": 7,
            "name": "Level 10 - Forms",
            "x": 50,
            "y": 68,
            "reqLevel": 9,
            "parent": 4,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 10 - Forms.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_chiji",
            "id": 8,
            "name": "Chi-Ji Form",
            "x": 22,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Crane form. Gusts heal as you melee",
            "skillId": "v_chiji",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_revival",
            "id": 9,
            "name": "Mass Mending",
            "x": 50,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Party AoE heal",
            "skillId": "v_revival",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_detox",
            "id": 10,
            "name": "Bile Purge",
            "x": 78,
            "y": 60,
            "reqLevel": 10,
            "parent": 7,
            "branch": "Center",
            "nodeType": "combat",
            "description": "Dispel magic, poison, disease",
            "skillId": "v_detox",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#22c55e",
              "fill": "rgba(34,197,94,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Verduror-P3",
            "id": 11,
            "name": "Level 15 - Focus",
            "x": 50,
            "y": 52,
            "reqLevel": 14,
            "parent": 7,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 15 - Focus.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_tea",
            "id": 12,
            "name": "Stormbrew Draught",
            "x": 32,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Next heal instant and empowered",
            "skillId": "v_tea",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_font",
            "id": 13,
            "name": "Wellspring",
            "x": 68,
            "y": 44,
            "reqLevel": 15,
            "parent": 11,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Moving AoE heal",
            "skillId": "v_font",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-Verduror-P4",
            "id": 14,
            "name": "Level 20 - Celestial",
            "x": 50,
            "y": 36,
            "reqLevel": 19,
            "parent": 11,
            "branch": "Path",
            "nodeType": "stat",
            "description": "Path node — spend to open Level 20 - Celestial.",
            "skillId": null,
            "path": true,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#64748b",
              "fill": "rgba(100,116,139,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_celestial",
            "id": 15,
            "name": "Celestial Form",
            "x": 32,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Left",
            "nodeType": "combat",
            "description": "Mist heals double. You can still Crane Kick",
            "skillId": "v_celestial",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#f97316",
              "fill": "rgba(249,115,22,0.2)"
            }
          },
          {
            "uuid": "NODE-CLASS-v_serpent",
            "id": 16,
            "name": "Invoke Serpent",
            "x": 68,
            "y": 28,
            "reqLevel": 20,
            "parent": 14,
            "branch": "Right",
            "nodeType": "combat",
            "description": "Jade serpent channels Calming Spray while you melee",
            "skillId": "v_serpent",
            "l0": false,
            "bonuses": [],
            "unlocks": [],
            "branchColor": {
              "stroke": "#6366f1",
              "fill": "rgba(99,102,241,0.2)"
            }
          }
        ]
      },
      "specIdentity": {
        "skillId": "v_jade_mist",
        "name": "Jade Mist Form",
        "description": "Mist aura heals nearby allies while you melee"
      }
    }
  },
  "graphNote": "Each class.graph uses the same node schema as master-professionTrees (x/y 0–100, parent, branch, nodeType). Path nodes sit between pick tiers. L0 skill is spec identity — swap family spec by reset + different L0, or rewrite with the same L0."
};
