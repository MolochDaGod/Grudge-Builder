/**
 * Traveler mission state machine for /tutorial.
 * SSOT: shared/definitions/travelerTutorialQuest.ts
 */
import { useCallback, useMemo, useState } from 'react';
import {
  TRAVELER_TUTORIAL_STEPS,
  TRAVELER_NPC,
  fullTravelerQuestForRace,
  type TravelerStepId,
  type TravelerTutorialStep,
  type TravelerStepKind,
  type RaceTravelerDest,
} from '@shared/definitions/travelerTutorialQuest';
import type { FactionIslandRaceId } from '@shared/definitions/factionLobbyIslands';

export type MissionProgress = {
  stepId: TravelerStepId | string;
  completed: boolean;
  count: number;
};

export type TravelerMissionState = {
  raceId: FactionIslandRaceId;
  dest: RaceTravelerDest;
  steps: TravelerTutorialStep[];
  activeIndex: number;
  progress: Record<string, MissionProgress>;
  completedAll: boolean;
  openedPanels: Set<string>;
};

const STORAGE_KEY = 'warlords_traveler_mission_v1';

function loadSaved(raceId: string): Partial<{ activeIndex: number; completedIds: string[] }> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.raceId !== raceId) return null;
    return data;
  } catch {
    return null;
  }
}

function saveProgress(raceId: string, activeIndex: number, completedIds: string[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ raceId, activeIndex, completedIds, t: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function useTravelerMissions(raceId: string | undefined) {
  const safeRace = (['human', 'elf', 'dwarf', 'orc', 'undead', 'barbarian'].includes(raceId || '')
    ? raceId
    : 'human') as FactionIslandRaceId;

  const quest = useMemo(() => fullTravelerQuestForRace(safeRace), [safeRace]);

  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = loadSaved(safeRace);
    return Math.min(saved?.activeIndex ?? 0, quest.steps.length - 1);
  });

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const saved = loadSaved(safeRace);
    return new Set(saved?.completedIds ?? []);
  });
  const [openedPanels, setOpenedPanels] = useState<Set<string>>(new Set());

  const activeStep = quest.steps[activeIndex] ?? quest.steps[0];
  const completedAll = completedIds.size >= quest.steps.length;

  const markPanelOpened = useCallback((panel: string) => {
    setOpenedPanels((prev) => {
      const next = new Set(prev);
      next.add(panel);
      return next;
    });
  }, []);

  const completeStep = useCallback(
    (stepId?: string) => {
      const id = stepId || activeStep?.id;
      if (!id) return null;
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        const idx = quest.steps.findIndex((s) => s.id === id);
        const nextIdx = Math.min(Math.max(idx + 1, activeIndex), quest.steps.length - 1);
        setActiveIndex(nextIdx);
        saveProgress(safeRace, nextIdx, [...next]);
        return next;
      });
      return quest.steps.find((s) => s.id === id) ?? null;
    },
    [activeStep?.id, activeIndex, quest.steps, safeRace],
  );

  const bumpCount = useCallback(
    (kind: TravelerStepKind | string, amount = 1) => {
      const step = activeStep;
      if (!step || step.kind !== kind) return false;
      const target = step.targetCount ?? 1;
      setCounts((prev) => {
        const n = (prev[step.id] ?? 0) + amount;
        const next = { ...prev, [step.id]: n };
        if (n >= target) {
          // defer complete so state settles
          queueMicrotask(() => completeStep(step.id));
        }
        return next;
      });
      return true;
    },
    [activeStep, completeStep],
  );

  /** Map production events → mission progress */
  const onGameEvent = useCallback(
    (event: {
      type:
        | 'dialogue_traveler'
        | 'move_marker'
        | 'harvest'
        | 'craft'
        | 'equip'
        | 'claim'
        | 'combat_kill'
        | 'panel_open'
        | 'board'
        | 'sail'
        | 'talk_commander';
      itemId?: string;
      panel?: string;
      resource?: string;
    }) => {
      const step = activeStep;
      if (!step || completedIds.has(step.id)) return;

      switch (event.type) {
        case 'dialogue_traveler':
          if (step.kind === 'dialogue' && step.id === 'meet_traveler') completeStep(step.id);
          break;
        case 'move_marker':
          if (step.kind === 'move') completeStep(step.id);
          break;
        case 'harvest':
          if (step.kind === 'harvest') bumpCount('harvest', 1);
          break;
        case 'craft':
          if (step.kind === 'craft') {
            if (step.id === 'craft_tools' && event.itemId?.includes('pickaxe')) completeStep(step.id);
            else if (step.id === 'craft_raft' && (event.itemId === 'raft' || event.itemId?.includes('raft'))) {
              try {
                localStorage.setItem('warlords_raft_crafted_v1', '1');
                localStorage.setItem('warlords_tutorial_complete_v1', '1');
              } catch {
                /* ignore */
              }
              completeStep(step.id);
            } else if (step.id === 'craft_tools') {
              completeStep(step.id);
            }
          }
          break;
        case 'equip':
          if (step.kind === 'equip') completeStep(step.id);
          break;
        case 'claim':
          if (step.kind === 'claim') completeStep(step.id);
          break;
        case 'combat_kill':
          if (step.kind === 'combat') bumpCount('combat', 1);
          break;
        case 'panel_open':
          if (event.panel) markPanelOpened(event.panel);
          if (step.id === 'ui_basics') {
            setOpenedPanels((prev) => {
              const next = new Set(prev);
              if (event.panel) next.add(event.panel);
              // need inventory, skills, main
              if (next.has('inventory') && next.has('skills') && next.has('main')) {
                queueMicrotask(() => completeStep(step.id));
              }
              return next;
            });
          }
          break;
        case 'board':
          if (step.kind === 'board') completeStep(step.id);
          break;
        case 'sail':
          if (step.kind === 'sail') completeStep(step.id);
          break;
        case 'talk_commander':
          if (step.kind === 'talk_commander') completeStep(step.id);
          break;
        default:
          break;
      }
    },
    [activeStep, bumpCount, completeStep, completedIds, markPanelOpened],
  );

  const checklist = useMemo(
    () =>
      quest.steps.map((s, i) => ({
        ...s,
        index: i,
        completed: completedIds.has(s.id),
        active: i === activeIndex && !completedIds.has(s.id),
        count: counts[s.id] ?? 0,
        target: s.targetCount ?? 1,
      })),
    [quest.steps, completedIds, activeIndex, counts],
  );

  return {
    npc: TRAVELER_NPC,
    dest: quest.dest,
    steps: quest.steps,
    activeStep,
    activeIndex,
    completedAll,
    checklist,
    openedPanels,
    totalRewards: quest.totalRewards,
    completeStep,
    bumpCount,
    onGameEvent,
    markPanelOpened,
    allSteps: TRAVELER_TUTORIAL_STEPS,
  };
}

export type UseTravelerMissions = ReturnType<typeof useTravelerMissions>;
