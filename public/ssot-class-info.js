/* Dossier companion for /skill-tree.html.
 * Trees are NOT in this file — they load from master-skillTrees-3.1.0.js.
 * Dossier text is ObjectStore classes.json, used only where 3.1.0 has no field.
 * Do not invent values.
 */
window.GRUDGE_SSOT_CLASS_INFO = {
  "id": "grudge-ssot-class-info",
  "source": {
    "trees": "Spawn 3.1.0 master-skillTrees.json (generated 2026-09-23T00:14:23.678Z, 117 skills) — loaded as master-skillTrees-3.1.0.js",
    "dossier": "https://objectstore.grudge-studio.com/api/v1/classes.json (v1.2.2, 2026-09-22) — lore, starting attributes, and crests only, where 3.1.0 has none",
    "playClasses": "https://objectstore.grudge-studio.com/api/v1/play-classes.json — family order, with id worge (not pack id worg)",
    "grimoire": "Spawn @1c52dfb grimoire-forms.js — Worge F forms, as written",
    "note": "Skill names, ids, tiers, prerequisites, and descriptions come only from 3.1.0. ObjectStore 3.0.0 trees are not used. Priest and verduror have no ObjectStore dossier (those 3.0.0 texts contradict the 3.1.0 trees). For the other six, dossier fields that contradict a 3.1.0 name were removed. The Grudge-Builder 4-class pack is not used for this page's trees."
  },
  "playOrder": [
    "warrior",
    "raider",
    "mage",
    "priest",
    "ranger",
    "thief",
    "worge",
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
    },
    "mage": {
      "id": "mage",
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
    },
    "thief": {
      "id": "thief",
      "name": "Thief",
      "family": "ranger",
      "emoji": "🗡",
      "color": "#ca8a04",
      "icon": "/icons/warlords/classes/thief.jpg",
      "iconUrl": "https://assets.grudge-studio.com/icons/warlords/classes/thief.jpg",
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
      "source": "https://objectstore.grudge-studio.com/api/v1/classes.json",
      "sourceVersion": "classes.json v1.2.2, updated 2026-09-22",
      "sourceNote": "ObjectStore dossier text. Used only where Spawn 3.1.0 has no matching field (lore, starting attributes, class crest, emoji). Not used for skill names, ids, or trees."
    }
  },
  "classes": {}
};
