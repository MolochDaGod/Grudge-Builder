/**
 * Merge client BUILD_ASSETS into the shared Warlords asset showcase so the
 * page shows every placeable prop (furniture, traps, farming, etc.) with cost.
 */
import { BUILD_ASSETS, type BuildAssetDef } from '@/island3d/building/BuildAssetManifest';
import type {
  ShowcaseFamily,
  WarlordsAssetShowcaseCatalog,
  WarlordsShowcaseAsset,
} from '@shared/definitions/warlordsAssetShowcase';
import { getWarlordsAssetShowcase } from '@shared/definitions/warlordsAssetShowcase';

function familyFromBuild(a: BuildAssetDef): ShowcaseFamily {
  if (a.category === 'camp') return 'camp';
  if (a.id.includes('bench') || a.category === 'crafting' || a.category === 'furniture') {
    if (a.id.includes('bench') || a.category === 'crafting') return 'bench';
  }
  if (a.id.includes('tower') || a.id === 'watchtower') return 'tower';
  if (a.category === 'defense' && a.id.includes('tower')) return 'tower';
  if (a.category === 'units' || a.category === 'siege' || a.category === 'monsters') {
    return a.category === 'siege' ? 'siege' : 'unit';
  }
  if (a.category === 'transport' || a.id.includes('dock')) return 'dock';
  if (a.buildLayer === 'modular') return 'modular';
  return 'building';
}

function buildAssetToShowcase(a: BuildAssetDef): WarlordsShowcaseAsset {
  const defense = a.effect?.type === 'defense' ? a.effect.value : undefined;
  const storage = a.effect?.type === 'storage' ? a.effect.value : undefined;
  return {
    id: a.id,
    name: a.name,
    family: familyFromBuild(a),
    tags: [a.category, a.placement, a.buildLayer ?? 'prop'].filter(Boolean) as string[],
    description: a.effect?.description ?? a.name,
    modelPath: a.modelPath,
    nodeName: a.nodeName,
    extraNodes: a.extraNodes,
    scale: a.scale,
    sizeM: a.size,
    cost: a.cost.map((c) => ({
      itemId: c.itemId,
      quantity: c.quantity,
      label: c.itemId,
    })),
    stats: {
      maxHp:
        a.category === 'defense'
          ? 80 + (defense ?? 10) * 3
          : a.category === 'camp'
            ? 400
            : 100,
      defense,
      storageSlots: storage,
    },
    abilities: a.effect
      ? [
          {
            id: `${a.id}_fx`,
            name: a.effect.type,
            description: a.effect.description,
          },
        ]
      : [],
    attachments: (a.extraNodes ?? []).map((n) => ({
      kind: 'node' as const,
      id: n,
      label: n,
    })),
    status: a.modelPath ? 'live' : 'partial',
    ssot: ['client/src/island3d/building/BuildAssetManifest.ts'],
  };
}

/**
 * Full showcase: shared SSOT + every BuildAssetManifest entry not already listed.
 */
export function getMergedWarlordsAssetShowcase(): WarlordsAssetShowcaseCatalog {
  const base = getWarlordsAssetShowcase();
  const seen = new Set(base.assets.map((a) => a.id));
  const extras: WarlordsShowcaseAsset[] = [];

  for (const a of Object.values(BUILD_ASSETS)) {
    if (seen.has(a.id)) continue;
    // Skip pure nature/terrain clutter in primary showcase? Keep them under building.
    extras.push(buildAssetToShowcase(a));
    seen.add(a.id);
  }

  const assets = [...base.assets, ...extras].sort((a, b) =>
    a.family === b.family ? a.name.localeCompare(b.name) : a.family.localeCompare(b.family),
  );

  const counts = { ...base.counts, total: assets.length };
  for (const k of Object.keys(counts) as Array<keyof typeof counts>) {
    if (k === 'total') continue;
    counts[k] = 0;
  }
  for (const a of assets) {
    counts[a.family] = (counts[a.family] ?? 0) + 1;
  }
  counts.total = assets.length;

  return {
    ...base,
    version: `${base.version}+manifest`,
    summary:
      base.summary +
      ` Plus ${extras.length} additional BuildAssetManifest placeables (furniture, traps, farming, nature).`,
    counts,
    assets,
  };
}
