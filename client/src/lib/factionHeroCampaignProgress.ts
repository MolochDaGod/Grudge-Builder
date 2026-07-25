/**
 * Client progress for faction hero campaigns / dailies / commander unlock.
 * Server-authoritative validation can mirror this shape later on Railway.
 */
import {
  type FactionHeroCampaignProgress,
  type WarFactionId,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  createEmptyCampaignProgress,
  recomputeCampaignProgress,
  markMissionComplete,
  getDailyMissionBoard,
  isCommanderUnlocked,
  countFactionCampaignCompletions,
  warFactionForRace,
  utcDayKey,
  getCommanderMissions,
  PRODUCTION_HERO_NPC_BY_ID,
  type ProductionHeroNpcDeploy,
} from '@shared/definitions/factionHeroCampaign';
import type { Mission } from '@shared/definitions/missionSystem';

export function loadCampaignProgress(): FactionHeroCampaignProgress {
  try {
    const raw = localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
    if (!raw) return createEmptyCampaignProgress();
    const parsed = JSON.parse(raw) as FactionHeroCampaignProgress;
    // Roll daily if day changed
    const day = utcDayKey();
    if (parsed.daily?.dayKey !== day) {
      parsed.daily = {
        dayKey: day,
        offeredMissionIds: getDailyMissionBoard(day, parsed.playerFaction).map((m) => m.id),
        completedMissionIds: [],
      };
    }
    return recomputeCampaignProgress(parsed);
  } catch {
    return createEmptyCampaignProgress();
  }
}

export function saveCampaignProgress(progress: FactionHeroCampaignProgress): void {
  try {
    localStorage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore quota */
  }
}

export function setPlayerFactionFromRace(raceId: string): FactionHeroCampaignProgress {
  const p = loadCampaignProgress();
  p.playerFaction = warFactionForRace(raceId);
  const next = recomputeCampaignProgress(p);
  saveCampaignProgress(next);
  return next;
}

export function completeCampaignMission(missionId: string): FactionHeroCampaignProgress {
  const next = markMissionComplete(loadCampaignProgress(), missionId);
  saveCampaignProgress(next);
  return next;
}

export function ensureDailyBoard(): { progress: FactionHeroCampaignProgress; missions: Mission[] } {
  const progress = loadCampaignProgress();
  const day = utcDayKey();
  let missions = getDailyMissionBoard(day, progress.playerFaction);
  if (progress.daily.dayKey !== day || progress.daily.offeredMissionIds.length === 0) {
    progress.daily = {
      dayKey: day,
      offeredMissionIds: missions.map((m) => m.id),
      completedMissionIds: [],
    };
    saveCampaignProgress(progress);
  } else {
    missions = progress.daily.offeredMissionIds
      .map((id) => missions.find((m) => m.id === id) || getDailyMissionBoard(day).find((m) => m.id === id))
      .filter(Boolean) as Mission[];
    if (missions.length === 0) {
      missions = getDailyMissionBoard(day, progress.playerFaction);
    }
  }
  return { progress, missions };
}

export function campaignStatusForUi(): {
  faction: WarFactionId | null;
  completed: number;
  total: number;
  heroesDone: string[];
  commanderUnlocked: boolean;
  commanderMissions: Mission[];
  daily: Mission[];
} {
  const progress = loadCampaignProgress();
  const faction = progress.playerFaction;
  if (!faction) {
    const { missions } = ensureDailyBoard();
    return {
      faction: null,
      completed: 0,
      total: 24,
      heroesDone: [],
      commanderUnlocked: false,
      commanderMissions: [],
      daily: missions,
    };
  }
  const { completed, total, heroIdsDone } = countFactionCampaignCompletions(progress, faction);
  const unlocked = isCommanderUnlocked(progress, faction);
  const { missions: daily } = ensureDailyBoard();
  return {
    faction,
    completed,
    total,
    heroesDone: heroIdsDone,
    commanderUnlocked: unlocked,
    commanderMissions: unlocked ? getCommanderMissions(faction, progress) : [],
    daily,
  };
}

export function getProductionNpc(codexId: string): ProductionHeroNpcDeploy | undefined {
  return PRODUCTION_HERO_NPC_BY_ID[codexId];
}

export function getNpcAiPrompt(codexId: string): string | null {
  return PRODUCTION_HERO_NPC_BY_ID[codexId]?.aiSystemPrompt ?? null;
}
