/**
 * Multi-era account rosters — ONE Railway Postgres (grudge-api).
 *
 * Physical DB is never per-era. Filter: GET /api/characters?era=<era>.
 * Bag / wallet / home island = account. XP / equip / skills = character UUID.
 *
 * | Era      | Brand              | Pipeline | Slots | Create                         | Play                         |
 * |----------|--------------------|----------|-------|--------------------------------|------------------------------|
 * | warlords | Grudge Warlords    | grudge6  | 4     | character. /foundry            | grudgewarlords.com           |
 * | voxel    | GRUDOX / Grudges   | voxel    | 4     | character. ?era=voxel          | grudox.grudge-studio.com     |
 * | nexus    | Toon (deferred)    | toon     | 12    | character. ?era=nexus          | Foundry hub until toon ships |
 * | armada   | Mech               | mech     | 4     | Mech Builder                   | mech-playground              |
 *
 * Do not collapse brands. GRUDOX is voxel cabinets — not Warlords, not Nexus toon.
 * Guest product login is closed. Auth: id.grudge-studio.com only.
 */

export type GameEra = 'warlords' | 'nexus' | 'voxel' | 'armada';

/**
 * Render / mesh pipeline for model3d.renderPipeline + clients.
 * - grudge6: modular race kits (WK_/ELF_/…) — Warlords Foundry
 * - toon: Toon RTS kits — Nexus (shipping soon)
 * - voxel: voxel race / explorer avatars — Voxel era + **interim Nexus stand-in**
 * - mech: modular mech chassis/parts — Armada (Mech Builder / Mech Forge)
 * - armada_ship: legacy alias for naval props only (not the player roster)
 * - vrm / sprite2d: legacy optional
 */
export type RenderPipeline =
  | 'grudge6'
  | 'toon'
  | 'voxel'
  | 'mech'
  | 'armada_ship'
  | 'vrm'
  | 'sprite2d';

export interface EraSlotConfig {
  max: number;
  activeCharacterId: string | null;
}

export type AccountEraSlots = Record<GameEra, EraSlotConfig>;

export const GAME_ERAS: GameEra[] = ['warlords', 'nexus', 'voxel', 'armada'];

/** One physical player store for every era. Not D1, not a second bag DB. */
export const ERA_PLAYER_DATABASE = {
  engine: 'postgres',
  service: 'grudge-api',
  railway: 'grudge-api-production-0d46',
  publicUrl: 'https://grudge-api-production-0d46.up.railway.app',
} as const;

/** Eras that allow create/select (max > 0). */
export const PLAYABLE_CHARACTER_ERAS: GameEra[] = [
  'warlords',
  'nexus',
  'voxel',
  'armada',
];

/**
 * Product law slot caps — Engine accounts.eraSlots.max must match.
 */
export const DEFAULT_ERA_SLOTS: AccountEraSlots = {
  warlords: { max: 4, activeCharacterId: null },
  nexus: { max: 12, activeCharacterId: null },
  voxel: { max: 4, activeCharacterId: null },
  armada: { max: 4, activeCharacterId: null },
};

export const ERA_META: Record<
  GameEra,
  {
    label: string;
    shortLabel: string;
    description: string;
    defaultPipeline: RenderPipeline;
    /**
     * Mesh pipeline to load **until** defaultPipeline content ships.
     * Nexus: use voxel avatars until Toon RTS kits are ready.
     */
    interimPipeline?: RenderPipeline | null;
    playUrl: string;
    /** Optional world-maker / deploy surface (Mine-Loader maker, etc.) */
    worldsUrl?: string | null;
    /** Product slot count (same as DEFAULT_ERA_SLOTS[era].max) */
    slotCount: number;
    /** Create / avatar / hangar surface */
    createUrl: string | null;
    /** false = no hero/mech roster in production */
    charactersEnabled: boolean;
    /**
     * LED face (Open LED Mask smile visor) on cube / explorer head.
     * - default: always paint when using interim/voxel body
     * - backup: only when primary mech mesh / pilot head is missing
     * - none: grudge6 race kits (warlords)
     */
    ledFace: 'default' | 'backup' | 'none';
  }
> = {
  warlords: {
    label: 'Grudge Warlords',
    shortLabel: 'Warlords',
    description: 'grudge6 modular heroes — Foundry create, islands, crafting, MMO',
    defaultPipeline: 'grudge6',
    interimPipeline: null,
    playUrl: 'https://grudgewarlords.com',
    worldsUrl: null,
    slotCount: 4,
    createUrl: 'https://character.grudge-studio.com/foundry?era=warlords',
    charactersEnabled: true,
    ledFace: 'none',
  },
  nexus: {
    label: 'Nexus Era (Toon)',
    shortLabel: 'Nexus',
    description:
      'Toon RTS line (deferred). Interim mesh: voxel + LED face. Play is NOT GRUDOX.',
    defaultPipeline: 'toon',
    /** Stand-in mesh until dedicated Toon RTS characters are built */
    interimPipeline: 'voxel',
    playUrl: 'https://character.grudge-studio.com/?era=nexus',
    worldsUrl: null,
    slotCount: 12,
    createUrl: 'https://character.grudge-studio.com/?era=nexus',
    charactersEnabled: true,
    ledFace: 'default',
  },
  voxel: {
    label: 'Voxel Era',
    shortLabel: 'Voxel',
    description:
      'GRUDOX cabinets + Grudges / Mine-Loader worlds. Voxel explorers, LED face default.',
    defaultPipeline: 'voxel',
    interimPipeline: null,
    playUrl: 'https://grudox.grudge-studio.com',
    worldsUrl: 'https://mine.grudge-studio.com/#/lobby',
    slotCount: 4,
    createUrl: 'https://character.grudge-studio.com/?era=voxel',
    charactersEnabled: true,
    ledFace: 'default',
  },
  armada: {
    label: 'Armada (Mech)',
    shortLabel: 'Armada',
    description:
      'Modular mechs from Mech Builder — LED face as backup pilot/head when mesh missing',
    defaultPipeline: 'mech',
    interimPipeline: null,
    playUrl: 'https://mech-playground.vercel.app',
    worldsUrl: null,
    slotCount: 4,
    createUrl: 'https://grudge-studio.com/mech-armada',
    charactersEnabled: true,
    ledFace: 'backup',
  },
};

/**
 * Pipeline to use when loading meshes for an era.
 * Nexus returns voxel while toon content is not yet primary.
 */
export function effectivePipelineForEra(era: GameEra): RenderPipeline {
  const meta = ERA_META[era];
  return meta.interimPipeline ?? meta.defaultPipeline;
}

export function normalizeGameEra(value: unknown): GameEra {
  const v = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if (v === 'nexus' || v === 'armada' || v === 'warlords' || v === 'voxel') return v;
  // Aliases
  if (v === 'toon' || v === 'toon_rts' || v === 'rts_toon') return 'nexus';
  // GRUDOX brand = voxel cabinets — not Nexus toon, not Warlords
  if (v === 'grudox' || v === 'grudo' || v === 'grudges') return 'voxel';
  if (v === 'vox' || v === 'explorer' || v === 'mine_loader' || v === 'mineloader') {
    return 'voxel';
  }
  if (v === 'gcs' || v === 'warlord' || v === 'grudge6') return 'warlords';
  // Armada = mech builder product
  if (
    v === 'mech' ||
    v === 'mechs' ||
    v === 'mech_builder' ||
    v === 'mech_forge' ||
    v === 'mechforge' ||
    v === 'grim_armada' ||
    v === 'mech_armada'
  ) {
    return 'armada';
  }
  return 'warlords';
}

export function eraAllowsCharacters(era: GameEra): boolean {
  return ERA_META[era].charactersEnabled && DEFAULT_ERA_SLOTS[era].max > 0;
}

export function defaultPipelineForEra(era: GameEra): RenderPipeline {
  return ERA_META[era].defaultPipeline;
}

/** LED face policy for era (default / backup / none). */
export function ledFacePolicyForEra(era: GameEra): 'default' | 'backup' | 'none' {
  return ERA_META[era].ledFace;
}

/**
 * Merge DB era_slots with product law.
 * Always clamp max to product DEFAULT.
 */
export function mergeEraSlots(raw?: Partial<AccountEraSlots> | null): AccountEraSlots {
  const merged: AccountEraSlots = {
    warlords: { ...DEFAULT_ERA_SLOTS.warlords },
    nexus: { ...DEFAULT_ERA_SLOTS.nexus },
    voxel: { ...DEFAULT_ERA_SLOTS.voxel },
    armada: { ...DEFAULT_ERA_SLOTS.armada },
  };
  if (!raw) return merged;
  for (const era of GAME_ERAS) {
    const productMax = DEFAULT_ERA_SLOTS[era].max;
    const incoming = raw[era];
    if (incoming) {
      merged[era] = {
        max: productMax,
        activeCharacterId: incoming.activeCharacterId ?? null,
      };
    } else {
      merged[era] = { ...DEFAULT_ERA_SLOTS[era] };
    }
  }
  return merged;
}

/** JSON default for accounts.era_slots column / migrations. */
export const ERA_SLOTS_SQL_DEFAULT = JSON.stringify({
  warlords: { max: 4, activeCharacterId: null },
  nexus: { max: 12, activeCharacterId: null },
  voxel: { max: 4, activeCharacterId: null },
  armada: { max: 4, activeCharacterId: null },
});
