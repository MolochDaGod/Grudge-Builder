/**
 * Codex production package — weapons + armour for share / deploy.
 *
 * Output shape is deployable to:
 *   client/public/codex/equipment-production.json
 *   R2: codex/equipment-production.json
 *   info.grudge-studio.com / ObjectStore master registry consumers
 */

import {
  PRODUCTION_WEAPON_TYPES,
  listPrefabsForType,
  buildWeaponPrefabCoverage,
  type WeaponPrefabEntry,
} from '@shared/definitions/weaponPrefabCatalog';
import {
  listArmorPrefabs,
  buildArmorPrefabCoverage,
  armorToCodexRow,
  type ArmorPrefabEntry,
  type CodexEquipmentRow,
} from '@shared/definitions/armorPrefabCatalog';
import { getWeaponTypeDefinition } from '@shared/definitions/weaponSkillsNew';
import { TIER_VISUALS } from '@shared/definitions/weaponTierVisuals';
import {
  type ArsenalDrafts,
  applySkillDraft,
} from '@/lib/arsenalDraftStore';

export interface CodexProductionPackage {
  schema: 'grudge.codex.equipment.v1';
  generatedAt: string;
  productHosts: string[];
  sources: {
    weapons: string;
    armor: string;
    skills: string;
    tiers: string;
  };
  coverage: {
    weapons: ReturnType<typeof buildWeaponPrefabCoverage>;
    armor: ReturnType<typeof buildArmorPrefabCoverage>;
  };
  tierLadder: Array<{
    tier: number;
    name: string;
    rarity: string;
    rarityColor: string;
  }>;
  weapons: CodexEquipmentRow[];
  armor: CodexEquipmentRow[];
  skillTrees: Array<{
    weaponType: string;
    name: string;
    skillCount: number;
    slots: Array<{
      type: string;
      label: string;
      unlockTier: number;
      skills: Array<{
        id: string;
        name: string;
        description: string;
        damage: number;
        cooldown: number;
        tier: number;
        effects: string[];
        drafted?: boolean;
      }>;
    }>;
  }>;
  draftsSummary: {
    skills: number;
    prefabs: number;
    armor: number;
    systemNotes: string;
  };
  deployment: {
    publicPath: string;
    r2Key: string;
    cdnUrl: string;
    objectStoreHint: string;
    mergeTargets: string[];
  };
}

function weaponToCodexRow(
  p: WeaponPrefabEntry,
  draft?: { notes?: string; iconUrl?: string | null; label?: string },
): CodexEquipmentRow {
  return {
    kind: 'weapon',
    id: p.id,
    name: draft?.label ?? p.label,
    category: p.weaponType,
    subcategory: p.styleId,
    tierRange: [1, 8],
    iconUrl: draft?.iconUrl ?? p.iconUrl ?? `/icons/weapons/generated/${p.id}.png`,
    meshUrl: p.cdnUrl ?? p.localPath,
    r2Key: p.r2Key,
    status: p.status,
    productionReady: p.productionReady,
    statsAtT1: { styleIndex: p.styleIndex },
    statsAtT8: { styleIndex: p.styleIndex },
    lore: draft?.notes ?? p.notes,
    codexSlug: p.id,
    notes: draft?.notes ?? p.notes,
  };
}

function mergeArmor(
  p: ArmorPrefabEntry,
  drafts: ArsenalDrafts,
): ArmorPrefabEntry {
  const d = drafts.armor[p.id];
  if (!d) return p;
  return {
    ...p,
    name: d.name ?? p.name,
    lore: d.lore ?? p.lore,
    passive: d.passive ?? p.passive,
    attribute: d.attribute ?? p.attribute,
    effect: d.effect ?? p.effect,
    proc: d.proc ?? p.proc,
    setBonus: d.setBonus ?? p.setBonus,
    notes: d.notes ?? p.notes,
    iconUrl: d.iconUrl !== undefined ? d.iconUrl : p.iconUrl,
    status: d.status ?? p.status,
    productionReady: d.productionReady ?? p.productionReady,
    stats: d.stats ? { ...p.stats, ...d.stats } : p.stats,
  };
}

export function buildCodexProductionPackage(
  drafts: ArsenalDrafts,
): CodexProductionPackage {
  const weapons: CodexEquipmentRow[] = [];
  for (const wt of PRODUCTION_WEAPON_TYPES) {
    for (const p of listPrefabsForType(wt)) {
      weapons.push(weaponToCodexRow(p, drafts.prefabs[p.id]));
    }
  }

  const armor = listArmorPrefabs().map((p) =>
    armorToCodexRow(mergeArmor(p, drafts)),
  );

  const skillTrees = PRODUCTION_WEAPON_TYPES.map((wt) => {
    const def = getWeaponTypeDefinition(wt);
    if (!def) {
      return {
        weaponType: wt,
        name: wt,
        skillCount: 0,
        slots: [],
      };
    }
    const slots = def.slots.map((slot) => ({
      type: slot.type,
      label: slot.label,
      unlockTier: slot.unlockTier,
      skills: slot.skills.map((sk) => {
        const merged = applySkillDraft(sk, wt, drafts);
        const drafted = !!drafts.skills[wt.toUpperCase()]?.[sk.id];
        return {
          id: merged.id,
          name: merged.name,
          description: merged.description,
          damage: merged.damage,
          cooldown: merged.cooldown,
          tier: merged.tier,
          effects: merged.effects,
          drafted,
        };
      }),
    }));
    return {
      weaponType: wt,
      name: def.name,
      skillCount: slots.reduce((n, s) => n + s.skills.length, 0),
      slots,
    };
  });

  let skillDrafts = 0;
  for (const m of Object.values(drafts.skills)) skillDrafts += Object.keys(m).length;

  return {
    schema: 'grudge.codex.equipment.v1',
    generatedAt: new Date().toISOString(),
    productHosts: [
      'https://grudgewarlords.com',
      'https://grudge.studio',
      'https://client.grudge-studio.com',
    ],
    sources: {
      weapons: 'shared/definitions/weaponPrefabCatalog.ts',
      armor: 'shared/definitions/armorPrefabCatalog.ts',
      skills: 'shared/definitions/weaponSkillsNew.ts',
      tiers: 'shared/definitions/weaponTierVisuals.ts',
    },
    coverage: {
      weapons: buildWeaponPrefabCoverage(),
      armor: buildArmorPrefabCoverage(),
    },
    tierLadder: TIER_VISUALS.map((t) => ({
      tier: t.tier,
      name: t.tierName,
      rarity: t.rarityName,
      rarityColor: t.rarityColor,
    })),
    weapons,
    armor,
    skillTrees,
    draftsSummary: {
      skills: skillDrafts,
      prefabs: Object.keys(drafts.prefabs).length,
      armor: Object.keys(drafts.armor).length,
      systemNotes: drafts.systemNotes,
    },
    deployment: {
      publicPath: '/codex/equipment-production.json',
      r2Key: 'codex/equipment-production.json',
      cdnUrl: 'https://assets.grudge-studio.com/codex/equipment-production.json',
      objectStoreHint: 'POST/sync to ObjectStore master equipment when pipeline runs',
      mergeTargets: [
        'shared/definitions/weaponPrefabCatalog.ts',
        'shared/definitions/armorPrefabCatalog.ts',
        'shared/definitions/equipmentData.ts',
        'shared/definitions/weaponSkillsNew.ts',
        'client/public/codex/equipment-production.json',
      ],
    },
  };
}

export function downloadCodexProductionPackage(drafts: ArsenalDrafts): void {
  const pkg = buildCodexProductionPackage(drafts);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `equipment-production-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy codex share URL + summary for chat / PR. */
export function buildCodexShareText(drafts: ArsenalDrafts): string {
  const pkg = buildCodexProductionPackage(drafts);
  return [
    'Grudge Production Codex — weapons + armour',
    `Generated: ${pkg.generatedAt}`,
    `Weapons: ${pkg.weapons.length} · Armour: ${pkg.armor.length}`,
    `Coverage weapons: ${pkg.coverage.weapons.ready} ready / ${pkg.coverage.weapons.missing} missing`,
    `Coverage armour: ${pkg.coverage.armor.ready} ready / ${pkg.coverage.armor.fallback} fallback`,
    `Drafts: ${pkg.draftsSummary.skills} skills, ${pkg.draftsSummary.prefabs} weapon prefabs, ${pkg.draftsSummary.armor} armour`,
    '',
    'Product: https://grudgewarlords.com/arsenal',
    'Codex path: /codex/equipment-production.json',
    'CDN: https://assets.grudge-studio.com/codex/equipment-production.json',
  ].join('\n');
}
