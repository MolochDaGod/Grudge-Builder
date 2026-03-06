export interface ProfessionTitle {
  level: number;
  title: string;
  description: string;
  unlockRequirement?: string;
  isSecret?: boolean;
}

export interface ProfessionTitleSet {
  profession: string;
  titles: ProfessionTitle[];
}

export const professionTitles: ProfessionTitleSet[] = [
  {
    profession: "Miner",
    titles: [
      {
        level: 25,
        title: "Prospector",
        description: "You've learned to read the stone and find veins others miss."
      },
      {
        level: 50,
        title: "Tunnelwarden",
        description: "The deep places hold no fear for you. You know their secrets."
      },
      {
        level: 75,
        title: "Forgemaster",
        description: "Metal bends to your will. Your creations are sought by warriors across the realm."
      },
      {
        level: 100,
        title: "Mountainbreaker",
        description: "You've shattered peaks and forged legends. The earth trembles at your approach."
      },
      {
        level: 105,
        title: "???",
        description: "A title whispered only in the deepest mines...",
        unlockRequirement: "Craft the Divine Worldforge Hammer",
        isSecret: true
      }
    ]
  },
  {
    profession: "Forester",
    titles: [
      {
        level: 25,
        title: "Woodwalker",
        description: "The forest paths are open to you. You move unseen among the trees."
      },
      {
        level: 50,
        title: "Beastbinder",
        description: "Creatures of the wild recognize you as kin. Their hides serve your craft."
      },
      {
        level: 75,
        title: "Grovekeeper",
        description: "Ancient trees share their wisdom with you. Your leather is supple as shadow."
      },
      {
        level: 100,
        title: "Wildshaper",
        description: "You command the primal forces of nature. Your arrows fly true through any storm."
      },
      {
        level: 105,
        title: "???",
        description: "A title known only to those who speak with the Worldtree...",
        unlockRequirement: "Craft the Worldtree Heartbow",
        isSecret: true
      }
    ]
  },
  {
    profession: "Mystic",
    titles: [
      {
        level: 25,
        title: "Acolyte",
        description: "The arcane currents flow through you. Your enchantments shimmer with power."
      },
      {
        level: 50,
        title: "Spellweaver",
        description: "You thread magic like silk, binding it to mortal steel and cloth."
      },
      {
        level: 75,
        title: "Arcanist",
        description: "The old mysteries reveal themselves. Your staves channel pure elemental fury."
      },
      {
        level: 100,
        title: "Voidtouched",
        description: "You've glimpsed beyond the veil. Reality bends around your creations."
      },
      {
        level: 105,
        title: "???",
        description: "A title spoken only in tongues forgotten by time...",
        unlockRequirement: "Craft the Staff of Eternal Dawn",
        isSecret: true
      }
    ]
  },
  {
    profession: "Chef",
    titles: [
      {
        level: 25,
        title: "Apprentice Cook",
        description: "Your meals sustain adventurers on their journeys. Simple but hearty."
      },
      {
        level: 50,
        title: "Brewmaster",
        description: "Potions and ales flow from your cauldron. Warriors seek your tonics before battle."
      },
      {
        level: 75,
        title: "Feast Warden",
        description: "Your banquets grant legendary buffs. Kings request your presence at their tables."
      },
      {
        level: 100,
        title: "Grandmaster Alchemist",
        description: "You've mastered the fusion of flavor and magic. Your elixirs grant impossible power."
      },
      {
        level: 105,
        title: "???",
        description: "A title earned only by those who taste the divine...",
        unlockRequirement: "Craft the Elixir of Immortality",
        isSecret: true
      }
    ]
  },
  {
    profession: "Engineer",
    titles: [
      {
        level: 25,
        title: "Tinkerer",
        description: "Gears click and springs coil under your touch. Simple machines obey your design."
      },
      {
        level: 50,
        title: "Siege Artisan",
        description: "Your war machines breach castle walls. Commanders pay fortunes for your blueprints."
      },
      {
        level: 75,
        title: "Automaton Crafter",
        description: "You've breathed artificial life into metal. Your constructs serve faithfully."
      },
      {
        level: 100,
        title: "Grand Artificer",
        description: "Technology and magic merge in your hands. Your inventions reshape warfare."
      },
      {
        level: 105,
        title: "???",
        description: "A title known only to those who've built the impossible...",
        unlockRequirement: "Craft the Perpetual Engine",
        isSecret: true
      }
    ]
  }
];

export function getTitleForLevel(profession: string, level: number): ProfessionTitle | null {
  const professionSet = professionTitles.find(p => p.profession.toLowerCase() === profession.toLowerCase());
  if (!professionSet) return null;
  
  const applicableTitles = professionSet.titles
    .filter(t => !t.isSecret && t.level <= level)
    .sort((a, b) => b.level - a.level);
  
  return applicableTitles[0] || null;
}

export function getAllTitles(profession: string): ProfessionTitle[] {
  const professionSet = professionTitles.find(p => p.profession.toLowerCase() === profession.toLowerCase());
  return professionSet?.titles || [];
}

export function getNextTitle(profession: string, level: number): ProfessionTitle | null {
  const professionSet = professionTitles.find(p => p.profession.toLowerCase() === profession.toLowerCase());
  if (!professionSet) return null;
  
  const nextTitle = professionSet.titles
    .filter(t => !t.isSecret && t.level > level)
    .sort((a, b) => a.level - b.level)[0];
  
  return nextTitle || null;
}
