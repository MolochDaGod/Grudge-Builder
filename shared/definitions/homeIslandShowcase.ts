/**
 * Warlords Era home-island showcase — the canonical public demo for /island-3d.
 *
 * Driftwood Bay + beach/tropical biome + organized CDN nature (no low-poly megakit).
 * Stable seed so every visit looks the same; matches 1024 m world / 2 m character contract.
 */
import {
  DRIFTWOOD_BAY,
  IRONFANG_SPIRE,
  type HomeIslandFoundationId,
} from './homeIslandFoundations';
import { HOME_ISLAND_WORLD_SIZE_M } from './homeIslandSeed';

export const HOME_ISLAND_SHOWCASE_VERSION = '1.0.0';

/** Stable public demo seed — never use Date.now() for the default experience. */
export const SHOWCASE_HOME_ISLAND_SEED = 'driftwood-bay-warlords-v1';

/** Optional highland alternate (query: ?foundation=ironfang_spire). */
export const SHOWCASE_IRONFANG_SEED = 'ironfang-spire-warlords-v1';

export interface HomeIslandShowcasePreset {
  id: string;
  label: string;
  seed: string;
  foundationId: HomeIslandFoundationId;
  /** Biome key for foundation resolve + nature scatter palette */
  biome: string;
  worldSizeM: number;
  characterHeightM: number;
  campPositionPercent: { x: number; y: number };
  mountainPercent: { x: number; y: number };
  summary: string;
  /** quality preset for Island3DEngine */
  quality: 'high' | 'medium';
}

/** Primary Warlords coastal home — best public example. */
export const SHOWCASE_DRIFTWOOD_BAY: HomeIslandShowcasePreset = {
  id: 'showcase_driftwood_bay',
  label: DRIFTWOOD_BAY.label,
  seed: SHOWCASE_HOME_ISLAND_SEED,
  foundationId: 'driftwood_bay',
  biome: 'beach',
  worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
  characterHeightM: DRIFTWOOD_BAY.characterHeightM,
  campPositionPercent: { ...DRIFTWOOD_BAY.layout.defaultCampPercent },
  mountainPercent: { ...DRIFTWOOD_BAY.layout.defaultMountainPercent },
  summary:
    'Warlords Era coastal home island — Driftwood Bay foundation, palm/deciduous ' +
    'organized nature, 1024 m world, 2 m character scale.',
  quality: 'high',
};

/** Highland alternate for A/B or ?foundation=ironfang_spire */
export const SHOWCASE_IRONFANG: HomeIslandShowcasePreset = {
  id: 'showcase_ironfang_spire',
  label: IRONFANG_SPIRE.label,
  seed: SHOWCASE_IRONFANG_SEED,
  foundationId: 'ironfang_spire',
  biome: 'forest',
  worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
  characterHeightM: IRONFANG_SPIRE.characterHeightM,
  campPositionPercent: { ...IRONFANG_SPIRE.layout.defaultCampPercent },
  mountainPercent: { ...IRONFANG_SPIRE.layout.defaultMountainPercent },
  summary:
    'Warlords Era highland home island — Ironfang Spire foundation, pine/rock dense scatter.',
  quality: 'high',
};

export const HOME_ISLAND_SHOWCASES = {
  driftwood_bay: SHOWCASE_DRIFTWOOD_BAY,
  ironfang_spire: SHOWCASE_IRONFANG,
} as const;

/**
 * Resolve showcase from URL params.
 * Default = Driftwood Bay (best Warlords stylized coastal example).
 */
export function resolveHomeIslandShowcase(search: string | URLSearchParams): HomeIslandShowcasePreset {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const foundation = (params.get('foundation') || params.get('preset') || '').toLowerCase();
  if (
    foundation === 'ironfang' ||
    foundation === 'ironfang_spire' ||
    foundation === 'highland' ||
    params.get('biome')?.toLowerCase().includes('forest') ||
    params.get('biome')?.toLowerCase().includes('winter')
  ) {
    // Explicit ironfang seed/biome still allows custom seed override
    const custom = params.get('seed');
    if (custom && custom !== SHOWCASE_HOME_ISLAND_SEED) {
      return { ...SHOWCASE_IRONFANG, seed: custom };
    }
    return SHOWCASE_IRONFANG;
  }

  const customSeed = params.get('seed');
  const customBiome = params.get('biome');
  if (customSeed || customBiome) {
    return {
      ...SHOWCASE_DRIFTWOOD_BAY,
      seed: customSeed || SHOWCASE_DRIFTWOOD_BAY.seed,
      biome: customBiome || SHOWCASE_DRIFTWOOD_BAY.biome,
    };
  }
  return SHOWCASE_DRIFTWOOD_BAY;
}
