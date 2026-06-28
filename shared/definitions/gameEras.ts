/**
 * Grudge Character Studio — multi-era account rosters.
 * Warlords (grudge6 MMO), Nexus (legacy/cNFT), Armada (naval commanders).
 */
export type GameEra = 'warlords' | 'nexus' | 'armada';

export type RenderPipeline = 'grudge6' | 'vrm' | 'armada_ship' | 'sprite2d';

export interface EraSlotConfig {
  max: number;
  activeCharacterId: string | null;
}

export type AccountEraSlots = Record<GameEra, EraSlotConfig>;

export const GAME_ERAS: GameEra[] = ['warlords', 'nexus', 'armada'];

export const DEFAULT_ERA_SLOTS: AccountEraSlots = {
  warlords: { max: 5, activeCharacterId: null },
  nexus: { max: 2, activeCharacterId: null },
  armada: { max: 2, activeCharacterId: null },
};

export const ERA_META: Record<GameEra, {
  label: string;
  shortLabel: string;
  description: string;
  defaultPipeline: RenderPipeline;
  playUrl: string;
}> = {
  warlords: {
    label: 'Grudge Warlords',
    shortLabel: 'Warlords',
    description: 'grudge6 heroes — islands, crafting, professions, MMO',
    defaultPipeline: 'grudge6',
    playUrl: 'https://grudgewarlords.com',
  },
  nexus: {
    label: 'Nexus Era',
    shortLabel: 'Nexus',
    description: 'Season 0 legacy heroes and cNFT roster',
    defaultPipeline: 'grudge6',
    playUrl: 'https://grudgewarlords.com/harvest',
  },
  armada: {
    label: 'Grim Armada',
    shortLabel: 'Armada',
    description: 'Naval commanders and fleet captains',
    defaultPipeline: 'armada_ship',
    playUrl: 'https://armada.grudge-studio.com',
  },
};

export function normalizeGameEra(value: unknown): GameEra {
  if (value === 'nexus' || value === 'armada' || value === 'warlords') return value;
  return 'warlords';
}

export function mergeEraSlots(raw?: Partial<AccountEraSlots> | null): AccountEraSlots {
  const merged = { ...DEFAULT_ERA_SLOTS };
  if (!raw) return merged;
  for (const era of GAME_ERAS) {
    if (raw[era]) {
      merged[era] = {
        max: raw[era].max ?? DEFAULT_ERA_SLOTS[era].max,
        activeCharacterId: raw[era].activeCharacterId ?? null,
      };
    }
  }
  return merged;
}