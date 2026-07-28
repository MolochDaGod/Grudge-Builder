/**
 * Grudge Character Studio — multi-era account rosters (Engine Account DB SSOT).
 *
 * Production law (2026-07):
 * | Era      | Pipeline  | Slots | Characters / builds                    |
 * |----------|-----------|-------|----------------------------------------|
 * | warlords | grudge6   | 4     | Foundry create (character.gs.com)      |
 * | nexus    | toon      | 12    | Toon RTS roster (the 12 we made)       |
 * | voxel    | voxel     | 4     | Voxel / Explorer TVS heroes            |
 * | armada   | mech      | 4     | Mechs built in Mech Builder / Forge    |
 *
 * All fleet games list via GET /api/characters?era=<era>.
 * Account bag / GBUX stay account-scoped on /api/account/* (shared).
 */

export type GameEra = 'warlords' | 'nexus' | 'voxel' | 'armada';

/**
 * Render / mesh pipeline for model3d.renderPipeline + clients.
 * - grudge6: modular race kits (WK_/ELF_/…) — Warlords Foundry
 * - toon: Toon RTS 12-character set — Nexus
 * - voxel: voxel TVS / box-hero pipeline — Voxel / Explorer
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

/** Eras that allow create/select (max > 0). Includes Armada mechs. */
export const PLAYABLE_CHARACTER_ERAS: GameEra[] = [
  'warlords',
  'nexus',
  'voxel',
  'armada',
];

/**
 * Product law slot caps — Engine accounts.eraSlots.max must match.
 * Armada = 4 mech loadouts (Mech Builder), not ships.
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
    playUrl: string;
    /** Product slot count (same as DEFAULT_ERA_SLOTS[era].max) */
    slotCount: number;
    /** Foundry / create surface */
    createUrl: string | null;
    /** false = no hero/mech roster in production */
    charactersEnabled: boolean;
  }
> = {
  warlords: {
    label: 'Grudge Warlords',
    shortLabel: 'Warlords',
    description: 'grudge6 modular heroes — Foundry create, islands, crafting, MMO',
    defaultPipeline: 'grudge6',
    playUrl: 'https://client.grudge-studio.com',
    slotCount: 4,
    createUrl: 'https://character.grudge-studio.com/foundry?era=warlords',
    charactersEnabled: true,
  },
  nexus: {
    label: 'Nexus Era',
    shortLabel: 'Nexus',
    description: 'Toon RTS 12-character roster (the 12 heroes we made)',
    defaultPipeline: 'toon',
    // Mine-Loader / Realms — not client.grudge-studio.com (Warlords only)
    playUrl: 'https://mine-loader.vercel.app/#/play',
    slotCount: 12,
    createUrl: 'https://character.grudge-studio.com/?era=nexus',
    charactersEnabled: true,
  },
  voxel: {
    label: 'Voxel Era',
    shortLabel: 'Voxel',
    description: 'Voxel / Explorer heroes (TVS + Mine-Loader play)',
    defaultPipeline: 'voxel',
    playUrl: 'https://mine-loader.vercel.app/#/play',
    slotCount: 4,
    createUrl: 'https://character.grudge-studio.com/?era=voxel',
    charactersEnabled: true,
  },
  armada: {
    label: 'Armada (Mech)',
    shortLabel: 'Armada',
    description:
      'Modular mechs built in Mech Builder / Mech Forge — hangar loadouts, dust-arena combat (not naval ships)',
    defaultPipeline: 'mech',
    playUrl: 'https://mech-playground.vercel.app',
    slotCount: 4,
    createUrl: 'https://grudge-studio.com/mech-armada',
    charactersEnabled: true,
  },
};

export function normalizeGameEra(value: unknown): GameEra {
  const v = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if (v === 'nexus' || v === 'armada' || v === 'warlords' || v === 'voxel') return v;
  // Aliases
  if (v === 'toon' || v === 'toon_rts' || v === 'rts_toon') return 'nexus';
  if (v === 'vox' || v === 'explorer' || v === 'grudox') return 'voxel';
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

/**
 * Merge DB era_slots with product law.
 * Always clamp max to product DEFAULT (so legacy max:5 warlords → 4;
 * legacy armada max:0 or max:2 → 4 mechs).
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
        // Product law slot cap (never invent a higher max than DEFAULT)
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
