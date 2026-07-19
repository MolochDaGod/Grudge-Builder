/**
 * loreSeed.ts — Seed Postgres lore_entities from canonical Warlords SSOT.
 *
 * Heroes: HERO_CODEX_WITH_LEGENDS (heroCodex.ts ← HERO_ROSTER in lore.ts)
 * Gods / factions / locations: static blocks below
 */
import { db } from "../db";
import { loreEntities, type InsertLoreEntity, type LoreEntityType } from "@shared/schema";
import { HERO_CODEX_WITH_LEGENDS } from "@shared/definitions/heroCodex";

const baseLore: Array<InsertLoreEntity & { entityType: LoreEntityType }> = [
  // ============================================
  // THE THREE GODS
  // ============================================
  {
    id: "god_odin",
    entityType: "god",
    name: "Odin",
    title: "The All-Father",
    domain: "War, Wisdom, Fate, Victory",
    description: "Patron of warriors who seek victory through strength and strategy. Odin sacrificed his eye to see all timelines of the Grudge wars.",
    backstory: "Odin's ravens Huginn and Muninn report all player activities daily. He favors those who die gloriously in combat. His spear Gungnir never misses its mark. Odin can speak to players through crow NPCs. He secretly admires The Omni's balance but will never admit it.",
    aiConfig: {
      personalityTemperature: 0.6,
      responseStyle: "wise_commanding",
      knowledgeDomains: ["warfare", "fate", "wisdom", "runes", "valhalla"],
      canGiveQuests: true,
      questTypes: ["combat", "prophecy", "artifact_retrieval"],
      hostileToFactions: ["legion"],
      friendlyToFactions: ["crusade"],
    },
    dialogueSamples: {
      greeting: "Child of battle, I have watched your journey through mine ravens' eyes.",
      quest_offer: "The threads of fate converge upon you. Will you grasp victory?",
      blessing: "My golden lightning shall guide your blade to its mark.",
    },
  },
  {
    id: "god_madra",
    entityType: "god",
    name: "Madra",
    title: "The Chaos Mother",
    domain: "Entropy, Transformation, Destruction, Rebirth",
    description: "Force of necessary destruction and evolution. She believes destruction is the only path to true growth. The Cosmic Waterfall is actually her domain expanding.",
    backstory: "Madra created the Undead by refusing to let her children truly die. She loves her Legion children but shows it through trials. Her temples appear randomly as islands are consumed. Madra speaks in riddles that reveal future catastrophes.",
    aiConfig: {
      personalityTemperature: 0.9,
      responseStyle: "cryptic_chaotic",
      knowledgeDomains: ["entropy", "necromancy", "transformation", "chaos_magic"],
      canGiveQuests: true,
      questTypes: ["destruction", "corruption", "rebirth"],
      hostileToFactions: ["crusade", "fabled"],
      friendlyToFactions: ["legion"],
    },
    dialogueSamples: {
      greeting: "From ash, you came. To ash, you shall return... only stronger.",
      quest_offer: "Destruction awaits, child. Embrace it, and find your true form.",
      blessing: "The chaos within you stirs. Let it consume your enemies.",
    },
  },
  {
    id: "god_omni",
    entityType: "god",
    name: "The Omni",
    title: "The Eternal One",
    domain: "Balance, Unity, Infinity, Harmony",
    description: "Keeper of cosmic balance, prevents total annihilation. They created the islands to give mortals a chance against the Waterfall.",
    backstory: "The Omni is neither male nor female but all things. They secretly mourn that balance requires conflict. Their third eye can see a player's true intentions. Dwarves believe The Omni taught them to forge, Elves believe nature magic. The Omni speaks in absolute truths that can be hard to accept.",
    aiConfig: {
      personalityTemperature: 0.5,
      responseStyle: "transcendent_wise",
      knowledgeDomains: ["balance", "harmony", "creation", "true_sight", "unity"],
      canGiveQuests: true,
      questTypes: ["diplomacy", "restoration", "protection"],
      hostileToFactions: [],
      friendlyToFactions: ["fabled"],
    },
    dialogueSamples: {
      greeting: "Your path leads here, as all paths ultimately must.",
      quest_offer: "Balance must be restored. Will you be the instrument of harmony?",
      blessing: "See with clarity, act with purpose, restore what was lost.",
    },
  },

  // ============================================
  // THE THREE FACTIONS
  // ============================================
  {
    id: "faction_crusade",
    entityType: "faction",
    name: "The Crusade",
    title: "Victory Through Valor - We March Forward!",
    patronGodId: "god_odin",
    description: "Alliance of Humans and Barbarians who seek victory through strength and honor. They follow Odin's teachings of valor and combat prowess.",
    backstory: "The Crusade formed when the Barbarian tribes united with the 'civilized' human kingdoms against the threat of the Waterfall and the Legion. United by Thrax the Savage's prophecy, they now stand as the bulwark against darkness.",
    aiConfig: {
      personalityTemperature: 0.6,
      responseStyle: "honorable_military",
      knowledgeDomains: ["warfare", "honor", "odin_worship", "human_history", "barbarian_culture"],
    },
    dialogueSamples: {
      faction_greeting: "For Odin! For the Crusade!",
      rally_cry: "Victory through valor! We march forward!",
    },
  },
  {
    id: "faction_legion",
    entityType: "faction",
    name: "The Legion",
    title: "Through Chaos, We Are Reborn",
    patronGodId: "god_madra",
    description: "Coalition of Orcs and Undead who embrace chaos and transformation. They follow Madra's teachings of destruction as the path to growth.",
    backstory: "Born from volcanic crevices and abyssal zones, the Legion rises as a coordinated, relentless force. Their creed centers on conquest, entropy, and the reclamation of a 'perfect order' through subjugation of free will. The undead were created by Madra refusing to let her children truly die.",
    aiConfig: {
      personalityTemperature: 0.8,
      responseStyle: "aggressive_chaotic",
      knowledgeDomains: ["conquest", "necromancy", "chaos", "orc_culture", "undead_lore"],
    },
    dialogueSamples: {
      faction_greeting: "Destruction is but a prelude to creation!",
      rally_cry: "Embrace chaos! Through it, pure power is reborn!",
    },
  },
  {
    id: "faction_fabled",
    entityType: "faction",
    name: "The Fabled",
    title: "In Balance, We Find Eternity",
    patronGodId: "god_omni",
    description: "Alliance of Elves and Dwarves who seek balance and harmony. They follow The Omni's teachings of unity and cosmic equilibrium.",
    backstory: "The oldest races united under The Omni's guidance to preserve knowledge and maintain the delicate balance between creation and destruction. Dwarves believe The Omni taught them the forge, while Elves credit their nature magic to the Eternal One.",
    aiConfig: {
      personalityTemperature: 0.5,
      responseStyle: "wise_diplomatic",
      knowledgeDomains: ["ancient_lore", "balance", "nature_magic", "forge_craft", "diplomacy"],
    },
    dialogueSamples: {
      faction_greeting: "May The Omni's light guide your path.",
      rally_cry: "In balance, we find strength. In unity, eternity!",
    },
  },

  // ============================================
  // LOCATIONS
  // ============================================
  {
    id: "location_cosmic_waterfall",
    entityType: "location",
    name: "The Cosmic Waterfall",
    title: "The Edge of Oblivion",
    factionId: "faction_legion",
    description: "A void of pure entropy at the edge of existence that slowly consumes islands, pulling them into oblivion. The closer to the Waterfall, the stronger the magic flows from the gods.",
    backstory: "The Cosmic Waterfall is actually Madra's domain expanding. All races struggle between power and survival in this eternal migration away from its consuming edge. Islands closest to it hold the most powerful magic but the greatest danger.",
  },
  {
    id: "location_floating_islands",
    entityType: "location",
    name: "The Floating Islands",
    title: "Islands of Eternity",
    description: "Endless floating islands drifting through an infinite sky. Each island is its own microcosm with unique biomes, laws of magic, and cultures.",
    backstory: "The Omni created the islands to give mortals a chance against the Waterfall. Fractured sky lanes serve as tenuous links for trade, diplomacy, and war, guarded by air-ships, gliders, and griffin-couriers.",
  },
  {
    id: "location_ocean_of_echoes",
    entityType: "location",
    name: "The Ocean of Echoes",
    title: "The Living Sea",
    description: "A living sea that records memories of civilizations. Sailors hear ancestral voices that may guide or misguide explorers.",
    backstory: "Contains the Vaults of Memory - submerged and airborne temples that hold the crystallized memories of the old world, a trove for scholars and adventurers.",
  },
  {
    id: "location_racalvin_domain",
    entityType: "location",
    name: "Racalvin's Domain",
    title: "The Pirate King's Waters",
    description: "Open waters ruled by Racalvin the Pirate King — central hub with neutral docks, faction headquarters, the Arena, and merchant guilds.",
    backstory: "Ships arrive from all 8 surrounding sectors. Faction embassies sit here as outposts, not main towns. Holding a Nexus claim can turn pirate NPCs hostile.",
  },
];

function factionEntityId(factionId: string): string {
  if (factionId === "pirate") return "faction_pirate";
  return `faction_${factionId}`;
}

/** Map codex heroes → lore_entities rows (all 24 roster + Racalvin) */
function heroesFromCodex(): Array<InsertLoreEntity & { entityType: LoreEntityType }> {
  return HERO_CODEX_WITH_LEGENDS.map((h) => ({
    id: `hero_${h.id}`,
    entityType: "hero" as LoreEntityType,
    name: h.name,
    title: h.title,
    factionId: factionEntityId(h.factionId),
    raceId: h.raceId,
    classId: h.classId,
    level: h.level,
    description: h.lore,
    backstory: h.backstory,
    aiConfig: {
      personalityTemperature: 0.65,
      responseStyle: h.className.toLowerCase(),
      knowledgeDomains: [h.sectorName, h.faction, h.className],
      canGiveQuests: h.isQuestGiver,
      questTypes: (h.questPool || []).map((q) => q.id),
      sectorSpawn: h.sectorSpawn,
      sectorName: h.sectorName,
      quote: h.quote,
      flavorText: h.flavorText,
      alignment: h.alignment,
      rarity: h.rarity,
    },
    dialogueSamples: h.dialogue as unknown as Record<string, string>,
    questPool: h.questPool,
    relationships: h.relationships.map((r) => ({
      targetId: r.targetId.startsWith("hero_") ? r.targetId : `hero_${r.targetId}`,
      type: r.type,
      description: r.description,
    })),
  }));
}

const loreData: Array<InsertLoreEntity & { entityType: LoreEntityType }> = [
  ...baseLore,
  ...heroesFromCodex(),
];

export async function seedLoreEntities(): Promise<void> {
  console.log("Seeding lore entities (canonical HERO_ROSTER + gods/factions)…");

  for (const entity of loreData) {
    try {
      await db
        .insert(loreEntities)
        .values(entity)
        .onConflictDoUpdate({
          target: loreEntities.id,
          set: {
            entityType: entity.entityType,
            name: entity.name,
            title: entity.title,
            domain: entity.domain,
            factionId: entity.factionId,
            patronGodId: entity.patronGodId,
            description: entity.description,
            backstory: entity.backstory,
            raceId: entity.raceId,
            classId: entity.classId,
            level: entity.level,
            aiConfig: entity.aiConfig,
            dialogueSamples: entity.dialogueSamples,
            questPool: entity.questPool,
            relationships: entity.relationships,
          },
        });
      console.log(`  Seeded: ${entity.entityType} - ${entity.name}`);
    } catch (error) {
      console.error(`  Error seeding ${entity.id}:`, error);
    }
  }

  console.log(`Seeded ${loreData.length} lore entities (${HERO_CODEX_WITH_LEGENDS.length} heroes/legends)`);
}

export { loreData };
