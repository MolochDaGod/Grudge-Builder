/**
 * Faction Hero Campaign + Production NPC Deploy — CANONICAL SSOT
 *
 * Production model:
 *   - All 27 heroes (24 HERO_ROSTER + Racalvin, Cpt. John Wayne, Scourge Faithbearer)
 *     are **production NPCs** owned/deployed by admin account **grudachain**.
 *   - Each hero is a quest giver with **exactly 3 campaign quests**.
 *   - Complete all heroes of **your** faction (8 × 3 = 24 quests for Crusade/Legion/Fabled)
 *     → unlock **faction commander on mount** in faction city for **end-game** quests.
 *   - End-game: enemy faction dragons, 3 world bosses, sack enemy island (also daily),
 *     turn in resources to faction for rewards, etc.
 *   - Daily mission board rotates sack / turn-in / patrol / world-boss pulse.
 *
 * Related:
 *   - heroCodex.ts (lore, dialogue, quest beat titles)
 *   - missionSystem.ts (objective types / rewards shape)
 *   - endGameMission.ts (Lv20 home-island End Game — separate from commander war end-game)
 *   - docs/PRODUCTION_HERO_WIPE_AND_MIGRATE.md
 *   - docs/FACTION_HERO_CAMPAIGN.md
 */

import { HERO_ROSTER, type FactionId, type SectorPosition } from './lore';
import {
  HERO_CODEX_WITH_LEGENDS,
  getHeroCodexEntry,
  type HeroCodexEntry,
} from './heroCodex';
import type { Mission, MissionObjective, MissionReward } from './missionSystem';

// ── Constants ────────────────────────────────────────────────────────────────

/** Master admin that deploys the 27 production NPCs */
export const PRODUCTION_HERO_DEPLOY_ACCOUNT = 'grudachain' as const;

/** Playtest admin — not the permanent vault of the 27 */
export const PRODUCTION_HERO_PLAYTEST_ACCOUNT = 'molochdadev' as const;

/** Campaign quests per hero (hard rule) */
export const QUESTS_PER_HERO = 3 as const;

/** Roster heroes per main war faction */
export const HEROES_PER_WAR_FACTION = 8 as const;

/** Quests required to unlock commander: 8 heroes × 3 */
export const QUESTS_TO_UNLOCK_COMMANDER = HEROES_PER_WAR_FACTION * QUESTS_PER_HERO; // 24

export type WarFactionId = 'crusade' | 'legion' | 'fabled';
export type CampaignFactionId = WarFactionId | 'pirate';

export const WAR_FACTIONS: WarFactionId[] = ['crusade', 'legion', 'fabled'];

export const FACTION_DISPLAY: Record<CampaignFactionId, string> = {
  crusade: 'The Crusade',
  legion: 'The Legion',
  fabled: 'The Fabled',
  pirate: 'Racalvin Free Port',
};

// ── Production NPC deploy ────────────────────────────────────────────────────

export type ProductionHeroDeployRole = 'faction_hero_npc' | 'legend_npc' | 'commander';

export interface ProductionHeroNpcDeploy {
  /** Codex / roster id */
  codexId: string;
  name: string;
  factionId: CampaignFactionId;
  raceId: string;
  classId: string;
  level: number;
  sectorSpawn: SectorPosition | 'CENTER';
  /** Always true for campaign heroes */
  isQuestGiver: true;
  /** Who owns the character rows / deploys world instances */
  deployAccount: typeof PRODUCTION_HERO_DEPLOY_ACCOUNT;
  deployRole: ProductionHeroDeployRole;
  /** Portrait key for UI / nameplates */
  portraitKey: string;
  /** grudge6 race prefix hint for 3D spawn */
  racePrefixHint: string;
  /** System prompt for prompted AI (dialogue / mission helper) */
  aiSystemPrompt: string;
  /** Short player-facing blurb */
  aiGreetingStyle: string;
  /** Exactly 3 campaign mission ids */
  campaignMissionIds: [string, string, string];
  /** Optional isCanonical model3d tag when seeded on grudachain */
  model3dTags: {
    codexId: string;
    isCanonical: true;
    isProductionNpc: true;
    gameEra: 'warlords';
  };
}

// ── Campaign quest (wraps Mission) ───────────────────────────────────────────

export interface HeroCampaignQuestMeta {
  missionId: string;
  heroId: string;
  factionId: CampaignFactionId;
  index: 1 | 2 | 3;
  title: string;
  description: string;
  /** Codex beat id if sourced from questPool */
  beatId?: string;
}

// ── Progress (client + server envelope) ──────────────────────────────────────

export interface FactionHeroCampaignProgress {
  /** Player's war faction (from character race mapping or choice) */
  playerFaction: WarFactionId | null;
  /** Completed campaign mission ids */
  completedMissionIds: string[];
  /** Heroes for whom all 3 campaign quests are done */
  heroesFullyCompleted: string[];
  /** Commander war end-game unlocked */
  commanderUnlocked: boolean;
  /** End-game / commander mission completions */
  completedEndGameIds: string[];
  /** Daily board */
  daily: {
    /** YYYY-MM-DD UTC */
    dayKey: string;
    offeredMissionIds: string[];
    completedMissionIds: string[];
  };
  /** Faction rep (turn-ins, sacks) */
  factionReputation: Partial<Record<WarFactionId, number>>;
  /** Schema for migrations */
  schemaVersion: 1;
}

export const CAMPAIGN_PROGRESS_STORAGE_KEY = 'warlords_faction_hero_campaign_v1';

export function createEmptyCampaignProgress(
  playerFaction: WarFactionId | null = null,
): FactionHeroCampaignProgress {
  return {
    playerFaction,
    completedMissionIds: [],
    heroesFullyCompleted: [],
    commanderUnlocked: false,
    completedEndGameIds: [],
    daily: {
      dayKey: utcDayKey(),
      offeredMissionIds: [],
      completedMissionIds: [],
    },
    factionReputation: {},
    schemaVersion: 1,
  };
}

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ── Race → default war faction ───────────────────────────────────────────────

export function warFactionForRace(raceId: string): WarFactionId {
  const r = (raceId || '').toLowerCase();
  if (r === 'orc' || r === 'undead') return 'legion';
  if (r === 'elf' || r === 'dwarf') return 'fabled';
  // human, barbarian, default
  return 'crusade';
}

export function racePrefixForRaceId(raceId: string): string {
  switch ((raceId || '').toLowerCase()) {
    case 'human':
      return 'WK_';
    case 'barbarian':
      return 'BRB_';
    case 'elf':
      return 'ELF_';
    case 'dwarf':
      return 'DWF_';
    case 'orc':
      return 'ORC_';
    case 'undead':
      return 'UD_';
    default:
      return 'WK_';
  }
}

// ── AI prompts ───────────────────────────────────────────────────────────────

export function buildHeroAiSystemPrompt(hero: HeroCodexEntry): string {
  const faction = FACTION_DISPLAY[hero.factionId as CampaignFactionId] || hero.faction;
  return [
    `You are ${hero.name}, "${hero.title}", a level ${hero.level} ${hero.race} ${hero.className} of ${faction}.`,
    `Alignment: ${hero.alignment}. Combat style: ${hero.combatStyle}. Weapons: ${hero.weapons}.`,
    `Lore: ${hero.lore}`,
    `Backstory: ${hero.backstory}`,
    `Signature quote: ${hero.quote}`,
    `Personality in dialogue:`,
    `- Neutral greeting: ${hero.dialogue.greeting_neutral}`,
    `- Friendly: ${hero.dialogue.greeting_friendly}`,
    `- Hostile: ${hero.dialogue.greeting_hostile}`,
    `- Quest offer: ${hero.dialogue.quest_offer}`,
    `- Combat start: ${hero.dialogue.combat_start}`,
    `- Victory: ${hero.dialogue.victory}`,
    `- Defeat: ${hero.dialogue.defeat}`,
    `You are a production Warlords world NPC deployed by Grudge Studio (account grudachain).`,
    `You give exactly three campaign quests to members of your faction. Stay in character.`,
    `Never invent alternate names. Never break the fourth wall about being an AI unless asked as a developer.`,
    `When offering quests, use the canonical titles from your campaign list. Reward valor, punish treachery.`,
    `Keep replies concise (2–4 sentences) unless the player asks for lore depth.`,
  ].join('\n');
}

// ── Build 3 campaign missions per hero ───────────────────────────────────────

function objectiveTemplates(
  heroId: string,
  index: 1 | 2 | 3,
  title: string,
): MissionObjective[] {
  // Varied objective shapes so campaign feels distinct per slot
  if (index === 1) {
    return [
      {
        id: `${heroId}_q1_talk`,
        description: `Speak with ${title.includes('Talk') ? 'the contact' : 'allies'} and accept the charge`,
        type: 'interact',
        targetNodeId: `npc_${heroId}`,
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
      {
        id: `${heroId}_q1_kill`,
        description: 'Defeat enemy patrols threatening the sector (0/8)',
        type: 'kill',
        targetTemplateIds: ['faction_patrol', 'raider', 'corrupted_scout'],
        requiredCount: 8,
        currentCount: 0,
        optional: false,
        order: 2,
      },
    ];
  }
  if (index === 2) {
    return [
      {
        id: `${heroId}_q2_collect`,
        description: 'Gather war supplies for the faction (0/12)',
        type: 'collect',
        targetItemIds: ['ITEM-iron-ore', 'ITEM-pine-log', 'ITEM-herb-bundle', 'wood', 'stone'],
        requiredCount: 12,
        currentCount: 0,
        optional: false,
        order: 1,
      },
      {
        id: `${heroId}_q2_reach`,
        description: 'Scout the marked contested ground',
        type: 'reach_location',
        targetRadius: 12,
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 2,
      },
    ];
  }
  return [
    {
      id: `${heroId}_q3_kill_elite`,
      description: 'Slay the sector champion or elite (0/1)',
      type: 'kill',
      targetTemplateIds: ['sector_champion', 'elite_raider', 'lieutenant'],
      requiredCount: 1,
      currentCount: 0,
      optional: false,
      order: 1,
    },
    {
      id: `${heroId}_q3_return`,
      description: `Return to the hero and report`,
      type: 'interact',
      targetNodeId: `npc_${heroId}`,
      requiredCount: 1,
      currentCount: 0,
      optional: false,
      order: 2,
    },
    {
      id: `${heroId}_q3_bonus_survive`,
      description: 'Optional: Survive 60s in the contested zone',
      type: 'survive',
      durationSec: 60,
      requiredCount: 1,
      currentCount: 0,
      optional: true,
      order: 3,
    },
  ];
}

function rewardsForQuest(index: 1 | 2 | 3, factionId: CampaignFactionId): MissionReward {
  const rep: [string, number][] =
    factionId === 'pirate'
      ? [['pirate', 15 * index]]
      : [[factionId, 20 * index]];
  return {
    gold: 40 + index * 35,
    xp: 80 + index * 60,
    reputation: rep,
    items:
      index === 3
        ? ([['ITEM-faction-commendation', 1]] as [string, number][])
        : ([['ITEM-starter-health-potion', 2]] as [string, number][]),
    unlocks: index === 3 ? [`hero_campaign_${index}_complete`] : undefined,
  };
}

function ensureThreeBeats(hero: HeroCodexEntry): Array<{ id: string; title: string; description: string }> {
  const pool = hero.questPool?.length
    ? hero.questPool
    : [
        { id: `${hero.id}_gen_1`, title: 'Prove Yourself', description: 'Show valor in the field' },
        { id: `${hero.id}_gen_2`, title: 'War Supplies', description: 'Gather what the front needs' },
        { id: `${hero.id}_gen_3`, title: 'Strike the Foe', description: 'Eliminate a marked threat' },
      ];
  const out = pool.slice(0, QUESTS_PER_HERO).map((b, i) => ({
    id: b.id || `${hero.id}_quest_${i + 1}`,
    title: b.title,
    description: b.description,
  }));
  while (out.length < QUESTS_PER_HERO) {
    const n = (out.length + 1) as 1 | 2 | 3;
    out.push({
      id: `${hero.id}_quest_${n}`,
      title: `Campaign Charge ${n}`,
      description: `Complete charge ${n} for ${hero.name}`,
    });
  }
  return out.slice(0, QUESTS_PER_HERO);
}

function buildHeroCampaignMissions(hero: HeroCodexEntry): {
  missions: Mission[];
  meta: HeroCampaignQuestMeta[];
  missionIds: [string, string, string];
} {
  const factionId = (hero.factionId === 'pirate' ? 'pirate' : hero.factionId) as CampaignFactionId;
  const beats = ensureThreeBeats(hero);
  const missions: Mission[] = [];
  const meta: HeroCampaignQuestMeta[] = [];
  const missionIds: string[] = [];

  beats.forEach((beat, i) => {
    const index = (i + 1) as 1 | 2 | 3;
    const missionId = `HERO_CAMPAIGN_${hero.id}_Q${index}`.toUpperCase();
    missionIds.push(missionId);
    const prereq =
      index === 1 ? [] : [`HERO_CAMPAIGN_${hero.id}_Q${index - 1}`.toUpperCase()];

    const mission: Mission = {
      id: missionId,
      title: `${hero.name}: ${beat.title}`,
      description: `${beat.description} — given by ${hero.name} (${FACTION_DISPLAY[factionId]}).`,
      flavorText: hero.dialogue.quest_offer,
      category: 'faction',
      difficulty: index + (hero.difficulty === 'Expert' ? 3 : hero.difficulty === 'Advanced' ? 2 : 1),
      recommendedLevel: Math.max(5, Math.min(50, hero.level - 20 + index * 5)),
      objectives: objectiveTemplates(hero.id, index, beat.title),
      rewards: rewardsForQuest(index, factionId),
      prerequisites: prereq,
      autoActivate: false,
      canFail: false,
      timeLimitSec: 0,
      zoneRestriction: hero.sectorSpawn === 'CENTER' ? undefined : String(hero.sectorSpawn),
    };
    missions.push(mission);
    meta.push({
      missionId,
      heroId: hero.id,
      factionId,
      index,
      title: beat.title,
      description: beat.description,
      beatId: beat.id,
    });
  });

  return {
    missions,
    meta,
    missionIds: missionIds as [string, string, string],
  };
}

// ── Build full production deploy table ───────────────────────────────────────

function toDeploy(hero: HeroCodexEntry): ProductionHeroNpcDeploy {
  const built = buildHeroCampaignMissions(hero);
  const factionId = (hero.factionId === 'pirate' ? 'pirate' : hero.factionId) as CampaignFactionId;
  const isLegend = hero.id === 'racalvin' || hero.id === 'john_wayne' || hero.id === 'scourge_faithbearer';

  return {
    codexId: hero.id,
    name: hero.name,
    factionId,
    raceId: String(hero.raceId),
    classId: String(hero.classId),
    level: hero.level,
    sectorSpawn: hero.sectorSpawn,
    isQuestGiver: true,
    deployAccount: PRODUCTION_HERO_DEPLOY_ACCOUNT,
    deployRole: isLegend ? 'legend_npc' : 'faction_hero_npc',
    portraitKey: hero.portraitKey,
    racePrefixHint: racePrefixForRaceId(String(hero.raceId)),
    aiSystemPrompt: buildHeroAiSystemPrompt(hero),
    aiGreetingStyle: hero.dialogue.greeting_neutral,
    campaignMissionIds: built.missionIds,
    model3dTags: {
      codexId: hero.id,
      isCanonical: true,
      isProductionNpc: true,
      gameEra: 'warlords',
    },
  };
}

/** All 27 production NPC deploys (roster + legends) */
export const PRODUCTION_HERO_NPCS: ProductionHeroNpcDeploy[] = HERO_CODEX_WITH_LEGENDS.map(toDeploy);

export const PRODUCTION_HERO_NPC_BY_ID: Record<string, ProductionHeroNpcDeploy> =
  Object.fromEntries(PRODUCTION_HERO_NPCS.map((h) => [h.codexId, h]));

// ── Mission catalogs ─────────────────────────────────────────────────────────

function collectCampaignMissions(): {
  missions: Record<string, Mission>;
  meta: HeroCampaignQuestMeta[];
} {
  const missions: Record<string, Mission> = {};
  const meta: HeroCampaignQuestMeta[] = [];
  for (const hero of HERO_CODEX_WITH_LEGENDS) {
    const built = buildHeroCampaignMissions(hero);
    for (const m of built.missions) missions[m.id] = m;
    meta.push(...built.meta);
  }
  return { missions, meta };
}

const _campaignBuilt = collectCampaignMissions();

/** All hero campaign missions (27 × 3 = 81) */
export const HERO_CAMPAIGN_MISSIONS: Record<string, Mission> = _campaignBuilt.missions;

export const HERO_CAMPAIGN_QUEST_META: HeroCampaignQuestMeta[] = _campaignBuilt.meta;

export function getHeroCampaignMissions(heroId: string): Mission[] {
  const deploy = PRODUCTION_HERO_NPC_BY_ID[heroId];
  if (!deploy) return [];
  return deploy.campaignMissionIds
    .map((id) => HERO_CAMPAIGN_MISSIONS[id])
    .filter(Boolean);
}

export function heroesForFaction(factionId: CampaignFactionId): ProductionHeroNpcDeploy[] {
  return PRODUCTION_HERO_NPCS.filter((h) => h.factionId === factionId);
}

export function rosterHeroesForWarFaction(factionId: WarFactionId): ProductionHeroNpcDeploy[] {
  return PRODUCTION_HERO_NPCS.filter(
    (h) => h.factionId === factionId && h.deployRole === 'faction_hero_npc',
  );
}

// ── Commander unlock ─────────────────────────────────────────────────────────

export interface FactionCommanderDef {
  factionId: WarFactionId;
  /** Codex-style id for the mounted commander NPC */
  commanderId: string;
  name: string;
  title: string;
  /** Faction city / lobby island key */
  cityKey: 'crusade' | 'legion' | 'fabled';
  sectorId: string;
  mounted: true;
  unlockRequiresQuestCount: number;
  /** End-game mission ids offered only after unlock */
  endGameMissionIds: string[];
  aiSystemPrompt: string;
}

export const FACTION_COMMANDERS: Record<WarFactionId, FactionCommanderDef> = {
  crusade: {
    factionId: 'crusade',
    commanderId: 'commander_crusade',
    name: 'High Commander Solbrand',
    title: 'Mounted Warlord of the Radiant Host',
    cityKey: 'crusade',
    sectorId: 'ethereal_falls',
    mounted: true,
    unlockRequiresQuestCount: QUESTS_TO_UNLOCK_COMMANDER,
    endGameMissionIds: [
      'ENDGAME_SLAY_LEGION_DRAGON',
      'ENDGAME_SLAY_FABLED_DRAGON',
      'ENDGAME_WORLD_BOSS_1',
      'ENDGAME_WORLD_BOSS_2',
      'ENDGAME_WORLD_BOSS_3',
      'ENDGAME_SACK_ENEMY_ISLAND',
      'ENDGAME_FACTION_RESOURCE_TURNIN',
    ],
    aiSystemPrompt:
      'You are the mounted High Commander of The Crusade in the faction city. ' +
      'Players who completed all eight Crusade hero campaigns may approach you for end-game war orders: ' +
      'slay enemy faction dragons, hunt world bosses, sack enemy islands, and turn in strategic resources. ' +
      'Speak with iron discipline and holy purpose. Keep answers short and martial.',
  },
  legion: {
    factionId: 'legion',
    commanderId: 'commander_legion',
    name: 'Warlord Ashcrown',
    title: 'Mounted Skull of the Ash Host',
    cityKey: 'legion',
    sectorId: 'ashen_wastes',
    mounted: true,
    unlockRequiresQuestCount: QUESTS_TO_UNLOCK_COMMANDER,
    endGameMissionIds: [
      'ENDGAME_SLAY_CRUSADE_DRAGON',
      'ENDGAME_SLAY_FABLED_DRAGON',
      'ENDGAME_WORLD_BOSS_1',
      'ENDGAME_WORLD_BOSS_2',
      'ENDGAME_WORLD_BOSS_3',
      'ENDGAME_SACK_ENEMY_ISLAND',
      'ENDGAME_FACTION_RESOURCE_TURNIN',
    ],
    aiSystemPrompt:
      'You are the mounted Warlord of The Legion. Only veterans who finished all Legion hero quests may take your end-game orders. ' +
      'Offer dragon hunts, world bosses, island sacks, and resource turn-ins. Speak harsh, efficient, and cruelly practical.',
  },
  fabled: {
    factionId: 'fabled',
    commanderId: 'commander_fabled',
    name: 'Archon Starforge',
    title: 'Mounted Archon of the Starwoven Host',
    cityKey: 'fabled',
    sectorId: 'frostbite_expanse',
    mounted: true,
    unlockRequiresQuestCount: QUESTS_TO_UNLOCK_COMMANDER,
    endGameMissionIds: [
      'ENDGAME_SLAY_CRUSADE_DRAGON',
      'ENDGAME_SLAY_LEGION_DRAGON',
      'ENDGAME_WORLD_BOSS_1',
      'ENDGAME_WORLD_BOSS_2',
      'ENDGAME_WORLD_BOSS_3',
      'ENDGAME_SACK_ENEMY_ISLAND',
      'ENDGAME_FACTION_RESOURCE_TURNIN',
    ],
    aiSystemPrompt:
      'You are the mounted Archon of The Fabled. Unlock only after all Fabled hero campaigns. ' +
      'Issue end-game war orders with courtly precision: enemy dragons, world bosses, sacks, resource tributes.',
  },
};

/** Count completed campaign missions for a war faction */
export function countFactionCampaignCompletions(
  progress: FactionHeroCampaignProgress,
  factionId: WarFactionId,
): { completed: number; total: number; heroIdsDone: string[] } {
  const heroes = rosterHeroesForWarFaction(factionId);
  const total = heroes.length * QUESTS_PER_HERO;
  let completed = 0;
  const heroIdsDone: string[] = [];
  for (const h of heroes) {
    const done = h.campaignMissionIds.filter((id) =>
      progress.completedMissionIds.includes(id),
    ).length;
    completed += done;
    if (done >= QUESTS_PER_HERO) heroIdsDone.push(h.codexId);
  }
  return { completed, total, heroIdsDone };
}

export function isCommanderUnlocked(
  progress: FactionHeroCampaignProgress,
  factionId: WarFactionId,
): boolean {
  if (progress.commanderUnlocked && progress.playerFaction === factionId) return true;
  const { completed, total } = countFactionCampaignCompletions(progress, factionId);
  return completed >= total;
}

export function recomputeCampaignProgress(
  progress: FactionHeroCampaignProgress,
): FactionHeroCampaignProgress {
  const faction = progress.playerFaction;
  if (!faction) return progress;
  const { completed, total, heroIdsDone } = countFactionCampaignCompletions(progress, faction);
  return {
    ...progress,
    heroesFullyCompleted: heroIdsDone,
    commanderUnlocked: completed >= total,
  };
}

export function markMissionComplete(
  progress: FactionHeroCampaignProgress,
  missionId: string,
): FactionHeroCampaignProgress {
  if (progress.completedMissionIds.includes(missionId)) {
    return recomputeCampaignProgress(progress);
  }
  const next: FactionHeroCampaignProgress = {
    ...progress,
    completedMissionIds: [...progress.completedMissionIds, missionId],
  };
  // End-game ids
  if (missionId.startsWith('ENDGAME_') || missionId.startsWith('DAILY_')) {
    if (missionId.startsWith('ENDGAME_') && !next.completedEndGameIds.includes(missionId)) {
      next.completedEndGameIds = [...next.completedEndGameIds, missionId];
    }
    if (missionId.startsWith('DAILY_')) {
      const day = utcDayKey();
      if (next.daily.dayKey !== day) {
        next.daily = { dayKey: day, offeredMissionIds: [], completedMissionIds: [] };
      }
      if (!next.daily.completedMissionIds.includes(missionId)) {
        next.daily.completedMissionIds = [...next.daily.completedMissionIds, missionId];
      }
    }
  }
  return recomputeCampaignProgress(next);
}

// ── End-game + daily missions ────────────────────────────────────────────────

function endGameMission(
  id: string,
  title: string,
  description: string,
  objectives: MissionObjective[],
  rewards: MissionReward,
  difficulty = 8,
): Mission {
  return {
    id,
    title,
    description,
    category: 'faction',
    difficulty,
    recommendedLevel: 20,
    objectives,
    rewards,
    prerequisites: [], // gated by commander unlock, not mission prereq chain
    autoActivate: false,
    canFail: true,
    timeLimitSec: 0,
  };
}

export const ENDGAME_COMMANDER_MISSIONS: Record<string, Mission> = {
  ENDGAME_SLAY_CRUSADE_DRAGON: endGameMission(
    'ENDGAME_SLAY_CRUSADE_DRAGON',
    'Slay the Crusade Dragon',
    'Hunt the radiant dragon that roosts over Crusade holdings. Commander war order.',
    [
      {
        id: 'kill_crusade_dragon',
        description: 'Defeat the Crusade faction dragon (0/1)',
        type: 'kill',
        targetTemplateIds: ['dragon_crusade', 'faction_dragon_crusade'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    {
      gold: 500,
      xp: 2000,
      reputation: [['legion', 40], ['fabled', 40]],
      unlocks: ['trophy_crusade_dragon'],
    },
    9,
  ),
  ENDGAME_SLAY_LEGION_DRAGON: endGameMission(
    'ENDGAME_SLAY_LEGION_DRAGON',
    'Slay the Legion Dragon',
    'Bring down the ash dragon of the Legion. Commander war order.',
    [
      {
        id: 'kill_legion_dragon',
        description: 'Defeat the Legion faction dragon (0/1)',
        type: 'kill',
        targetTemplateIds: ['dragon_legion', 'faction_dragon_legion'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    {
      gold: 500,
      xp: 2000,
      reputation: [['crusade', 40], ['fabled', 40]],
      unlocks: ['trophy_legion_dragon'],
    },
    9,
  ),
  ENDGAME_SLAY_FABLED_DRAGON: endGameMission(
    'ENDGAME_SLAY_FABLED_DRAGON',
    'Slay the Fabled Dragon',
    'Fell the starwoven dragon of the Fabled. Commander war order.',
    [
      {
        id: 'kill_fabled_dragon',
        description: 'Defeat the Fabled faction dragon (0/1)',
        type: 'kill',
        targetTemplateIds: ['dragon_fabled', 'faction_dragon_fabled'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    {
      gold: 500,
      xp: 2000,
      reputation: [['crusade', 40], ['legion', 40]],
      unlocks: ['trophy_fabled_dragon'],
    },
    9,
  ),
  ENDGAME_WORLD_BOSS_1: endGameMission(
    'ENDGAME_WORLD_BOSS_1',
    'World Boss: Tidebreaker Colossus',
    'Join the hunt for the first world boss of the Grudge Ocean Line.',
    [
      {
        id: 'kill_wb_1',
        description: 'Defeat Tidebreaker Colossus (0/1)',
        type: 'kill',
        targetTemplateIds: ['world_boss_1', 'tidebreaker_colossus'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    { gold: 400, xp: 1500, items: [['ITEM-world-boss-token', 1]] },
    8,
  ),
  ENDGAME_WORLD_BOSS_2: endGameMission(
    'ENDGAME_WORLD_BOSS_2',
    'World Boss: Ashen Sky-Wyrm',
    'Second world boss — ash and sky over contested seas.',
    [
      {
        id: 'kill_wb_2',
        description: 'Defeat Ashen Sky-Wyrm (0/1)',
        type: 'kill',
        targetTemplateIds: ['world_boss_2', 'ashen_sky_wyrm'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    { gold: 450, xp: 1700, items: [['ITEM-world-boss-token', 1]] },
    9,
  ),
  ENDGAME_WORLD_BOSS_3: endGameMission(
    'ENDGAME_WORLD_BOSS_3',
    'World Boss: Starforge Leviathan',
    'Third world boss — deep water and star-iron scales.',
    [
      {
        id: 'kill_wb_3',
        description: 'Defeat Starforge Leviathan (0/1)',
        type: 'kill',
        targetTemplateIds: ['world_boss_3', 'starforge_leviathan'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    { gold: 500, xp: 2000, items: [['ITEM-world-boss-token', 2]] },
    10,
  ),
  ENDGAME_SACK_ENEMY_ISLAND: endGameMission(
    'ENDGAME_SACK_ENEMY_ISLAND',
    'Sack Enemy Faction Island',
    'Raid an enemy faction island: breach defenses, seize cache, extract. Also available as a daily.',
    [
      {
        id: 'reach_enemy_island',
        description: 'Reach the marked enemy faction island',
        type: 'reach_location',
        targetRadius: 20,
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
      {
        id: 'kill_defenders',
        description: 'Defeat island defenders (0/15)',
        type: 'kill',
        targetTemplateIds: ['faction_defender', 'island_guard', 'siege_crew'],
        requiredCount: 15,
        currentCount: 0,
        optional: false,
        order: 2,
      },
      {
        id: 'seize_cache',
        description: 'Interact with the war cache',
        type: 'interact',
        targetNodeId: 'enemy_island_cache',
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 3,
      },
    ],
    {
      gold: 350,
      xp: 1200,
      reputation: [['crusade', 25], ['legion', 25], ['fabled', 25]],
      items: [['ITEM-war-spoils', 3]],
    },
    7,
  ),
  ENDGAME_FACTION_RESOURCE_TURNIN: endGameMission(
    'ENDGAME_FACTION_RESOURCE_TURNIN',
    'Faction Resource Tribute',
    'Turn in strategic resources at the faction city for gold, rep, and supply crates. Repeatable from commander / daily board.',
    [
      {
        id: 'turnin_resources',
        description: 'Deliver 40 strategic resources to the faction quartermaster',
        type: 'collect',
        targetItemIds: [
          'ITEM-iron-ore',
          'ITEM-pine-log',
          'ITEM-herb-bundle',
          'wood',
          'stone',
          'ITEM-war-spoils',
        ],
        requiredCount: 40,
        currentCount: 0,
        optional: false,
        order: 1,
      },
      {
        id: 'talk_quartermaster',
        description: 'Speak with the faction quartermaster',
        type: 'interact',
        targetNodeId: 'faction_quartermaster',
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 2,
      },
    ],
    {
      gold: 200,
      xp: 600,
      reputation: [['crusade', 30], ['legion', 30], ['fabled', 30]],
      items: [['ITEM-faction-supply-crate', 1]],
    },
    4,
  ),
};

/** Daily mission templates (ids prefixed DAILY_) */
export const DAILY_MISSION_TEMPLATES: Mission[] = [
  {
    ...ENDGAME_COMMANDER_MISSIONS.ENDGAME_SACK_ENEMY_ISLAND,
    id: 'DAILY_SACK_ENEMY_ISLAND',
    title: 'Daily: Sack Enemy Island',
    category: 'daily',
    difficulty: 6,
    recommendedLevel: 15,
  },
  {
    ...ENDGAME_COMMANDER_MISSIONS.ENDGAME_FACTION_RESOURCE_TURNIN,
    id: 'DAILY_FACTION_RESOURCE_TURNIN',
    title: 'Daily: Resource Tribute',
    category: 'daily',
    difficulty: 3,
    recommendedLevel: 10,
  },
  {
    id: 'DAILY_FACTION_PATROL',
    title: 'Daily: Faction Patrol',
    description: 'Clear enemy patrols along your faction border.',
    category: 'daily',
    difficulty: 4,
    recommendedLevel: 12,
    objectives: [
      {
        id: 'patrol_kills',
        description: 'Defeat enemy border units (0/12)',
        type: 'kill',
        targetTemplateIds: ['faction_patrol', 'raider'],
        requiredCount: 12,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    rewards: { gold: 120, xp: 400, reputation: [['crusade', 15], ['legion', 15], ['fabled', 15]] },
    prerequisites: [],
    autoActivate: false,
    canFail: false,
    timeLimitSec: 0,
  },
  {
    id: 'DAILY_WORLD_BOSS_PULSE',
    title: 'Daily: World Boss Pulse',
    description: 'Deal meaningful damage or participate in any active world boss kill.',
    category: 'daily',
    difficulty: 7,
    recommendedLevel: 18,
    objectives: [
      {
        id: 'wb_participate',
        description: 'Contribute to a world boss defeat (0/1)',
        type: 'kill',
        targetTemplateIds: ['world_boss_1', 'world_boss_2', 'world_boss_3'],
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
    ],
    rewards: { gold: 250, xp: 900, items: [['ITEM-world-boss-token', 1]] },
    prerequisites: [],
    autoActivate: false,
    canFail: false,
    timeLimitSec: 0,
  },
  {
    id: 'DAILY_HERO_ASSIST',
    title: 'Daily: Aid a Faction Hero',
    description: 'Complete any single campaign objective step for a hero of your faction.',
    category: 'daily',
    difficulty: 3,
    recommendedLevel: 8,
    objectives: [
      {
        id: 'assist_hero',
        description: 'Interact with a faction hero NPC',
        type: 'interact',
        targetNodeId: 'faction_hero_any',
        requiredCount: 1,
        currentCount: 0,
        optional: false,
        order: 1,
      },
      {
        id: 'assist_kills',
        description: 'Defeat foes while on hero business (0/6)',
        type: 'kill',
        targetTemplateIds: ['faction_patrol', 'raider', 'corrupted_scout'],
        requiredCount: 6,
        currentCount: 0,
        optional: false,
        order: 2,
      },
    ],
    rewards: { gold: 100, xp: 350 },
    prerequisites: [],
    autoActivate: false,
    canFail: false,
    timeLimitSec: 0,
  },
];

export const DAILY_MISSIONS: Record<string, Mission> = Object.fromEntries(
  DAILY_MISSION_TEMPLATES.map((m) => [m.id, m]),
);

/**
 * Deterministic daily board (3 missions) from day key + optional faction salt.
 */
export function getDailyMissionBoard(
  dayKey: string = utcDayKey(),
  factionId?: WarFactionId | null,
): Mission[] {
  const pool = DAILY_MISSION_TEMPLATES;
  let hash = 0;
  const seed = `${dayKey}:${factionId || 'any'}`;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const picks: Mission[] = [];
  const used = new Set<number>();
  for (let n = 0; n < 3 && picks.length < pool.length; n++) {
    let idx = (hash + n * 17) % pool.length;
    let guard = 0;
    while (used.has(idx) && guard++ < pool.length) idx = (idx + 1) % pool.length;
    used.add(idx);
    picks.push(pool[idx]);
  }
  return picks;
}

/** Missions the mounted commander offers (requires unlock) */
export function getCommanderMissions(
  factionId: WarFactionId,
  progress: FactionHeroCampaignProgress,
): Mission[] {
  if (!isCommanderUnlocked(progress, factionId)) return [];
  const def = FACTION_COMMANDERS[factionId];
  return def.endGameMissionIds
    .map((id) => ENDGAME_COMMANDER_MISSIONS[id])
    .filter(Boolean)
    /** Filter dragon missions: don't offer own-faction dragon as primary target */
    .filter((m) => {
      if (factionId === 'crusade' && m.id === 'ENDGAME_SLAY_CRUSADE_DRAGON') return false;
      if (factionId === 'legion' && m.id === 'ENDGAME_SLAY_LEGION_DRAGON') return false;
      if (factionId === 'fabled' && m.id === 'ENDGAME_SLAY_FABLED_DRAGON') return false;
      return true;
    });
}

// ── Unified catalog (register with mission system consumers) ─────────────────

export const FACTION_HERO_MISSION_CATALOG: Record<string, Mission> = {
  ...HERO_CAMPAIGN_MISSIONS,
  ...ENDGAME_COMMANDER_MISSIONS,
  ...DAILY_MISSIONS,
};

export function getFactionHeroMission(id: string): Mission | undefined {
  return FACTION_HERO_MISSION_CATALOG[id];
}

// ── Deploy checklist helpers ─────────────────────────────────────────────────

export function productionHeroDeploySummary(): {
  totalNpcs: number;
  byFaction: Record<string, number>;
  campaignMissions: number;
  endGameMissions: number;
  dailyTemplates: number;
  deployAccount: string;
} {
  const byFaction: Record<string, number> = {};
  for (const h of PRODUCTION_HERO_NPCS) {
    byFaction[h.factionId] = (byFaction[h.factionId] || 0) + 1;
  }
  return {
    totalNpcs: PRODUCTION_HERO_NPCS.length,
    byFaction,
    campaignMissions: Object.keys(HERO_CAMPAIGN_MISSIONS).length,
    endGameMissions: Object.keys(ENDGAME_COMMANDER_MISSIONS).length,
    dailyTemplates: DAILY_MISSION_TEMPLATES.length,
    deployAccount: PRODUCTION_HERO_DEPLOY_ACCOUNT,
  };
}

/** JSON-serializable export for ObjectStore / admin tools */
export function exportProductionHeroDeployManifest(): unknown {
  return {
    version: '1.0.0',
    updated: new Date().toISOString().slice(0, 10),
    deployAccount: PRODUCTION_HERO_DEPLOY_ACCOUNT,
    playtestAccount: PRODUCTION_HERO_PLAYTEST_ACCOUNT,
    questsPerHero: QUESTS_PER_HERO,
    questsToUnlockCommander: QUESTS_TO_UNLOCK_COMMANDER,
    summary: productionHeroDeploySummary(),
    npcs: PRODUCTION_HERO_NPCS.map((n) => ({
      codexId: n.codexId,
      name: n.name,
      factionId: n.factionId,
      sectorSpawn: n.sectorSpawn,
      deployRole: n.deployRole,
      campaignMissionIds: n.campaignMissionIds,
      portraitKey: n.portraitKey,
      racePrefixHint: n.racePrefixHint,
      model3dTags: n.model3dTags,
      // AI prompts included for server-side agent bootstrap
      aiSystemPrompt: n.aiSystemPrompt,
    })),
    commanders: FACTION_COMMANDERS,
    campaignQuestMeta: HERO_CAMPAIGN_QUEST_META,
  };
}

/** Validate codex coverage — call in tests / migrate dry-run */
export function assertProductionHeroCoverage(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (PRODUCTION_HERO_NPCS.length !== 27) {
    errors.push(`Expected 27 NPCs, got ${PRODUCTION_HERO_NPCS.length}`);
  }
  if (Object.keys(HERO_CAMPAIGN_MISSIONS).length !== 27 * QUESTS_PER_HERO) {
    errors.push(
      `Expected ${27 * QUESTS_PER_HERO} campaign missions, got ${Object.keys(HERO_CAMPAIGN_MISSIONS).length}`,
    );
  }
  for (const f of WAR_FACTIONS) {
    const n = rosterHeroesForWarFaction(f).length;
    if (n !== HEROES_PER_WAR_FACTION) {
      errors.push(`Faction ${f} expected ${HEROES_PER_WAR_FACTION} roster heroes, got ${n}`);
    }
  }
  for (const id of ['racalvin', 'john_wayne', 'scourge_faithbearer']) {
    if (!PRODUCTION_HERO_NPC_BY_ID[id]) errors.push(`Missing legend NPC ${id}`);
  }
  // Ensure every roster id has a codex entry
  for (const h of HERO_ROSTER) {
    if (!getHeroCodexEntry(h.id)) errors.push(`Missing codex for roster ${h.id}`);
  }
  return { ok: errors.length === 0, errors };
}
