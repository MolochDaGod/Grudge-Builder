/**
 * Race faction lobby islands — tutorial destinations after the Dock Quest Traveler.
 * Minimal SSOT for travelerTutorialQuest / tutorialFlow imports.
 */

export type FactionIslandRaceId =
  | "human"
  | "barbarian"
  | "elf"
  | "dwarf"
  | "orc"
  | "undead";

export interface RaceIslandMeta {
  name: string;
  subtitle: string;
}

export interface FactionHeroRef {
  heroId: string;
  name: string;
  title: string;
  classId: string;
}

/** Display names for each race's home / faction island */
export const RACE_ISLAND_NAMES: Record<FactionIslandRaceId, RaceIslandMeta> = {
  human: { name: "Haven Port", subtitle: "Human capital · tropical trade shore" },
  barbarian: { name: "Ashen Throne", subtitle: "Barbarian capital · volcanic highland" },
  elf: { name: "Starweave Canopy", subtitle: "Elf capital · sky canopy" },
  dwarf: { name: "Runeforge Hold", subtitle: "Dwarf capital · sky forge" },
  orc: { name: "Pit Foundry", subtitle: "Orc capital · industrial foundry" },
  undead: { name: "Drowned Sepulcher", subtitle: "Undead capital · drowned crypts" },
};

/** Mounted captains / commanders per race (tutorial endpoint NPCs) */
export const FACTION_HEROES_BY_RACE: Record<FactionIslandRaceId, FactionHeroRef[]> = {
  human: [
    { heroId: "hero_human_captain", name: "Aldric", title: "Harbor Captain", classId: "warrior" },
    { heroId: "hero_human_ranger", name: "Mira", title: "Shore Ranger", classId: "ranger" },
  ],
  barbarian: [
    { heroId: "hero_barb_warlord", name: "Krag", title: "Ash Warlord", classId: "warrior" },
  ],
  elf: [
    { heroId: "hero_elf_captain", name: "Lirael", title: "Canopy Warden", classId: "ranger" },
  ],
  dwarf: [
    { heroId: "hero_dwarf_captain", name: "Borin", title: "Forge Captain", classId: "warrior" },
  ],
  orc: [
    { heroId: "hero_orc_captain", name: "Grasha", title: "Pit Captain", classId: "warrior" },
  ],
  undead: [
    { heroId: "hero_undead_captain", name: "Morveth", title: "Sepulcher Lord", classId: "warrior" },
  ],
};

export const FACTION_ISLAND_RACE_IDS: FactionIslandRaceId[] = [
  "human",
  "barbarian",
  "elf",
  "dwarf",
  "orc",
  "undead",
];
