/**
 * XState session for Island3D — REST bootstrap, staged loading, tick/time settings.
 */
import { setup, assign } from 'xstate';
import { characterAPI } from '@/lib/api';
import type { Character } from '@shared/schema';

export interface IslandTimeSettings {
  /** Sim seconds per real second (1 = realtime day cycle) */
  tickRate: number;
  /** Full day/night cycle length in sim-seconds */
  dayDurationSeconds: number;
  /** 0–1 time-of-day start */
  startTime: number;
}

export interface IslandSessionContext {
  characterId?: string;
  character: Character | null;
  loadProgress: number;
  loadLabel: string;
  error: string | null;
  time: IslandTimeSettings;
  combatMode: boolean;
}

export type IslandSessionEvent =
  | { type: 'START'; characterId?: string }
  | { type: 'PROGRESS'; progress: number; label?: string }
  | { type: 'READY' }
  | { type: 'FAIL'; error: string }
  | { type: 'SET_TICK_RATE'; tickRate: number }
  | { type: 'SET_DAY_DURATION'; dayDurationSeconds: number }
  | { type: 'SET_START_TIME'; startTime: number }
  | { type: 'TOGGLE_COMBAT' }
  | { type: 'SET_COMBAT'; combat: boolean };

const DEFAULT_TIME: IslandTimeSettings = {
  tickRate: 1,
  dayDurationSeconds: 600,
  startTime: 0.35,
};

export const islandSessionMachine = setup({
  types: {
    context: {} as IslandSessionContext,
    events: {} as IslandSessionEvent,
  },
  actors: {
    bootstrapCharacter: async ({ input }: { input: { characterId?: string } }) => {
      if (!input.characterId) return null;
      try {
        return await characterAPI.get(input.characterId);
      } catch {
        return null;
      }
    },
  },
}).createMachine({
  id: 'islandSession',
  initial: 'idle',
  context: {
    characterId: undefined,
    character: null,
    loadProgress: 0,
    loadLabel: 'Initializing…',
    error: null,
    time: DEFAULT_TIME,
    combatMode: false,
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'loadingCharacter',
          actions: assign({
            characterId: ({ event }) => event.characterId,
            loadProgress: 0,
            loadLabel: 'Fetching character…',
            error: null,
          }),
        },
      },
    },
    loadingCharacter: {
      invoke: {
        src: 'bootstrapCharacter',
        input: ({ context }) => ({ characterId: context.characterId }),
        onDone: {
          target: 'loadingWorld',
          actions: assign({
            character: ({ event }) => event.output,
            loadProgress: 8,
            loadLabel: 'Character loaded — loading world…',
          }),
        },
        onError: {
          target: 'loadingWorld',
          actions: assign({
            loadProgress: 8,
            loadLabel: 'Loading world (guest)…',
          }),
        },
      },
    },
    loadingWorld: {
      on: {
        PROGRESS: {
          actions: assign({
            loadProgress: ({ event }) => Math.max(0, Math.min(100, event.progress)),
            loadLabel: ({ event, context }) => event.label ?? context.loadLabel,
          }),
        },
        READY: 'playing',
        FAIL: {
          target: 'error',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },
    playing: {
      on: {
        PROGRESS: {
          actions: assign({
            loadProgress: ({ event }) => Math.max(0, Math.min(100, event.progress)),
          }),
        },
        SET_TICK_RATE: {
          actions: assign({
            time: ({ context, event }) => ({ ...context.time, tickRate: event.tickRate }),
          }),
        },
        SET_DAY_DURATION: {
          actions: assign({
            time: ({ context, event }) => ({
              ...context.time,
              dayDurationSeconds: event.dayDurationSeconds,
            }),
          }),
        },
        SET_START_TIME: {
          actions: assign({
            time: ({ context, event }) => ({ ...context.time, startTime: event.startTime }),
          }),
        },
        TOGGLE_COMBAT: {
          actions: assign({ combatMode: ({ context }) => !context.combatMode }),
        },
        SET_COMBAT: {
          actions: assign({ combatMode: ({ event }) => event.combat }),
        },
        START: {
          target: 'loadingCharacter',
          actions: assign({
            characterId: ({ event }) => event.characterId,
            loadProgress: 0,
            loadLabel: 'Reloading…',
            error: null,
          }),
        },
      },
    },
    error: {
      on: {
        START: {
          target: 'loadingCharacter',
          actions: assign({
            characterId: ({ event }) => event.characterId,
            error: null,
            loadProgress: 0,
            loadLabel: 'Retrying…',
          }),
        },
      },
    },
  },
});