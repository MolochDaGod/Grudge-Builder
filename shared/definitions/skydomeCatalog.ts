/**
 * Skydome Catalog SSOT — ultimate_skydome_pack for sectors, Forge, Grok Builder.
 *
 * Pack host: assets.grudge-studio.com (R2 CDN).
 * Pack is a multi-skydome GLB (Doom 2016 style ARM set, 20 variants).
 * Consumers pick by id; load pack once and activate child by node name.
 */

export const SKYDOME_CDN_ROOT =
  'https://assets.grudge-studio.com/models/environment/skydomes' as const;

/** Multi-skydome production pack (all variants in one GLB). */
export const ULTIMATE_SKYDOME_PACK = {
  id: 'ultimate_skydome_pack',
  label: 'Ultimate Skydome Pack',
  description:
    '20 cinematic skydomes for sectors, Forge scenes, Grok Builder creations, and Open worlds.',
  glbUrls: [
    `${SKYDOME_CDN_ROOT}/ultimate_skydome_pack.glb`,
    '/models/environment/skydomes/ultimate_skydome_pack.glb',
  ] as const,
  sourceLocal: 'Documents/ultimate_skydome_pack.glb',
  variantCount: 20,
  tags: ['environment', 'sky', 'sector', 'forge', 'grok-builder', 'cinema'],
} as const;

export type SkydomeMood =
  | 'storm'
  | 'ash'
  | 'void'
  | 'blood'
  | 'dusk'
  | 'toxic'
  | 'cold'
  | 'ember'
  | 'neutral';

export interface SkydomeVariantDef {
  /** Stable fleet id */
  id: string;
  /** Index inside ultimate pack (0–19) */
  packIndex: number;
  /** GLTF node name prefix to match when activating */
  nodeMatch: string | RegExp;
  label: string;
  mood: SkydomeMood;
  /** Suggested Warlords sector / map family tags */
  sectorHints: string[];
  /** Default sky radius in metres (SI) */
  defaultRadiusM: number;
}

/**
 * 20 variants from ultimate_skydome_pack.glb (doom_2016_skydome_ARM.* roots).
 * Mood labels are production guidance — re-theme freely in Forge.
 */
export const SKYDOME_VARIANTS: readonly SkydomeVariantDef[] = [
  { id: 'sky_doom_00', packIndex: 0, nodeMatch: /doom_2016_skydome_ARM_2$/i, label: 'Doom Core', mood: 'ash', sectorHints: ['ashen_wastes', 'ember_depths'], defaultRadiusM: 400 },
  { id: 'sky_doom_01', packIndex: 1, nodeMatch: /ARM\.001/i, label: 'Ash Horizon', mood: 'ash', sectorHints: ['ashen_wastes'], defaultRadiusM: 400 },
  { id: 'sky_doom_02', packIndex: 2, nodeMatch: /ARM\.002/i, label: 'Ember Vault', mood: 'ember', sectorHints: ['ember_depths', 'hellmaw'], defaultRadiusM: 400 },
  { id: 'sky_doom_03', packIndex: 3, nodeMatch: /ARM\.003/i, label: 'Blood Dusk', mood: 'blood', sectorHints: ['thornwood_wilds'], defaultRadiusM: 400 },
  { id: 'sky_doom_04', packIndex: 4, nodeMatch: /ARM\.004/i, label: 'Storm Rift', mood: 'storm', sectorHints: ['stormbreak_reef'], defaultRadiusM: 420 },
  { id: 'sky_doom_05', packIndex: 5, nodeMatch: /ARM\.005/i, label: 'Void Maw', mood: 'void', sectorHints: ['abyssal_trench', 'ethereal_falls'], defaultRadiusM: 450 },
  { id: 'sky_doom_06', packIndex: 6, nodeMatch: /ARM\.006/i, label: 'Toxic Bloom', mood: 'toxic', sectorHints: ['thornwood_wilds'], defaultRadiusM: 400 },
  { id: 'sky_doom_07', packIndex: 7, nodeMatch: /ARM\.007/i, label: 'Cold Abyss', mood: 'cold', sectorHints: ['frostbite_expanse'], defaultRadiusM: 400 },
  { id: 'sky_doom_08', packIndex: 8, nodeMatch: /ARM\.008/i, label: 'Neutral Plate', mood: 'neutral', sectorHints: ['haven_shore', 'convergence_nexus'], defaultRadiusM: 400 },
  { id: 'sky_doom_09', packIndex: 9, nodeMatch: /ARM\.009/i, label: 'Dusk March', mood: 'dusk', sectorHints: ['haven_shore'], defaultRadiusM: 400 },
  { id: 'sky_doom_10', packIndex: 10, nodeMatch: /ARM\.010/i, label: 'Ash Storm', mood: 'storm', sectorHints: ['ashen_wastes', 'stormbreak_reef'], defaultRadiusM: 420 },
  { id: 'sky_doom_11', packIndex: 11, nodeMatch: /ARM\.011/i, label: 'Blood Storm', mood: 'blood', sectorHints: ['assassination_grounds'], defaultRadiusM: 400 },
  { id: 'sky_doom_12', packIndex: 12, nodeMatch: /ARM\.012/i, label: 'Ember Night', mood: 'ember', sectorHints: ['ember_depths'], defaultRadiusM: 400 },
  { id: 'sky_doom_13', packIndex: 13, nodeMatch: /ARM\.013/i, label: 'Void Storm', mood: 'void', sectorHints: ['abyssal_trench'], defaultRadiusM: 450 },
  { id: 'sky_doom_14', packIndex: 14, nodeMatch: /ARM\.014/i, label: 'Toxic Dusk', mood: 'toxic', sectorHints: ['thornwood_wilds'], defaultRadiusM: 400 },
  { id: 'sky_doom_15', packIndex: 15, nodeMatch: /ARM\.015/i, label: 'Frost Vault', mood: 'cold', sectorHints: ['frostbite_expanse'], defaultRadiusM: 400 },
  { id: 'sky_doom_16', packIndex: 16, nodeMatch: /ARM\.016/i, label: 'Nexus Glow', mood: 'neutral', sectorHints: ['convergence_nexus'], defaultRadiusM: 400 },
  { id: 'sky_doom_17', packIndex: 17, nodeMatch: /ARM\.017/i, label: 'Rift Ash', mood: 'ash', sectorHints: ['ashen_wastes'], defaultRadiusM: 400 },
  { id: 'sky_doom_18', packIndex: 18, nodeMatch: /ARM\.018/i, label: 'Hell Plate', mood: 'ember', sectorHints: ['hellmaw', 'ember_depths'], defaultRadiusM: 420 },
  { id: 'sky_doom_19', packIndex: 19, nodeMatch: /ARM\.019/i, label: 'Assassination Night', mood: 'blood', sectorHints: ['assassination_grounds', 'danger_room'], defaultRadiusM: 400 },
] as const;

export type SkydomeVariantId = (typeof SKYDOME_VARIANTS)[number]['id'];

export function getSkydomeVariant(id: string): SkydomeVariantDef | undefined {
  return SKYDOME_VARIANTS.find((v) => v.id === id);
}

export function listSkydomesForSector(sectorHint: string): SkydomeVariantDef[] {
  const key = sectorHint.toLowerCase();
  return SKYDOME_VARIANTS.filter((v) =>
    v.sectorHints.some((h) => h.toLowerCase() === key || h.toLowerCase().includes(key)),
  );
}

/** Default skydome for a sector tag (first match, else neutral plate). */
export function defaultSkydomeForSector(sectorHint: string): SkydomeVariantDef {
  return listSkydomesForSector(sectorHint)[0] ?? SKYDOME_VARIANTS[8];
}

/** Forge / Grok Builder picker payload */
export function skydomePickerEntries(): Array<{
  id: string;
  label: string;
  mood: SkydomeMood;
  packUrl: string;
  packIndex: number;
}> {
  const packUrl = ULTIMATE_SKYDOME_PACK.glbUrls[0];
  return SKYDOME_VARIANTS.map((v) => ({
    id: v.id,
    label: v.label,
    mood: v.mood,
    packUrl,
    packIndex: v.packIndex,
  }));
}
