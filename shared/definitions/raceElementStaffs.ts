/**
 * T1 race-element staffs — each race tests a different magic school.
 *
 * Used for:
 *   - Starter / test loadouts per raceId
 *   - Staff mesh attach (T1 art)
 *   - Spell / cast VFX school (dragon koi, supernova, projectile tint)
 *
 * Mesh paths: /models/codex/t1/staffs/{race}_{element}.glb
 */

const CDN = 'https://assets.grudge-studio.com';

export type StaffElementId =
  | 'holy'
  | 'fire'
  | 'nature'
  | 'arcane'
  | 'shadow'
  | 'frost'
  | 'lightning';

export interface RaceElementStaffDef {
  /** Item id */
  id: string;
  /** Race key (RACE_GRUDGE6) */
  raceId: string;
  label: string;
  element: StaffElementId;
  /** Damage / school for combat + VFX */
  damageType: 'holy' | 'fire' | 'nature' | 'arcane' | 'shadow' | 'frost' | 'lightning';
  school: string;
  /** Power tier (T1 for race test staffs) */
  tier: 1;
  /** grudge6 kit staff variant while external loads */
  raceKitStaffVariant: 'A' | 'B' | 'C';
  localPath: string;
  r2Key: string;
  cdnUrl: string;
  /** Dragon koi cast variant */
  castAuraVariant: string;
  /** Supernova impact variant */
  impactVariant: 'original' | 'blue' | 'purple' | 'yellow';
  /** Status-magic / VFX key hints */
  vfxKeys: string[];
  /** Spell anim pack key preference */
  animKey: string;
  description: string;
}

function staffPaths(fileStem: string): Pick<RaceElementStaffDef, 'localPath' | 'r2Key' | 'cdnUrl'> {
  const r2Key = `models/codex/t1/staffs/${fileStem}.glb`;
  return {
    localPath: `/models/codex/t1/staffs/${fileStem}.glb`,
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
  };
}

/**
 * One T1 staff per playable race — element for testing spell effects.
 */
export const RACE_ELEMENT_STAFFS: Record<string, RaceElementStaffDef> = {
  human: {
    id: 't1_staff_human_holy',
    raceId: 'human',
    label: 'Crusade Dawn Staff',
    element: 'holy',
    damageType: 'holy',
    school: 'holy',
    tier: 1,
    raceKitStaffVariant: 'A',
    ...staffPaths('human_holy'),
    castAuraVariant: 'holy',
    impactVariant: 'yellow',
    vfxKeys: ['holy', 'smite', 'radiant', 'fx.mage.holy'],
    animKey: 'magic_cast',
    description: 'Human / Crusade T1 staff — holy light for heal and smite tests.',
  },
  barbarian: {
    id: 't1_staff_barbarian_fire',
    raceId: 'barbarian',
    label: 'Ashbrand Warstaff',
    element: 'fire',
    damageType: 'fire',
    school: 'fire',
    tier: 1,
    raceKitStaffVariant: 'B',
    ...staffPaths('barbarian_fire'),
    castAuraVariant: 'fire',
    impactVariant: 'original',
    vfxKeys: ['fire', 'flame', 'meteor', 'fx.mage.fire_fissure'],
    animKey: 'magic_cast',
    description: 'Barbarian T1 staff — fire school for fissure / ember tests.',
  },
  elf: {
    id: 't1_staff_elf_nature',
    raceId: 'elf',
    label: 'Verdant Spire',
    element: 'nature',
    damageType: 'nature',
    school: 'nature',
    tier: 1,
    raceKitStaffVariant: 'A',
    ...staffPaths('elf_nature'),
    castAuraVariant: 'nature',
    impactVariant: 'yellow',
    vfxKeys: ['nature', 'root', 'bloom', 'regen'],
    animKey: 'magic_cast',
    description: 'Elf / Fabled T1 staff — nature school for roots and HoTs.',
  },
  dwarf: {
    id: 't1_staff_dwarf_arcane',
    raceId: 'dwarf',
    label: 'Rune-Cane of the Hold',
    element: 'arcane',
    damageType: 'arcane',
    school: 'arcane',
    tier: 1,
    raceKitStaffVariant: 'C',
    ...staffPaths('dwarf_arcane'),
    castAuraVariant: 'arcane',
    impactVariant: 'purple',
    vfxKeys: ['arcane', 'mana', 'missile', 'reality'],
    animKey: 'magic_cast',
    description: 'Dwarf T1 staff — arcane missiles and rune pulse tests.',
  },
  orc: {
    id: 't1_staff_orc_shadow',
    raceId: 'orc',
    label: 'Maw-Shadow Staff',
    element: 'shadow',
    damageType: 'shadow',
    school: 'shadow',
    tier: 1,
    raceKitStaffVariant: 'B',
    ...staffPaths('orc_shadow'),
    castAuraVariant: 'shadow',
    impactVariant: 'purple',
    vfxKeys: ['shadow', 'void', 'dark', 'necro'],
    animKey: 'magic_cast',
    description: 'Orc / Legion T1 staff — shadow school for drain and fear tests.',
  },
  undead: {
    id: 't1_staff_undead_frost',
    raceId: 'undead',
    label: 'Grave-Ice Scepter',
    element: 'frost',
    damageType: 'frost',
    school: 'frost',
    tier: 1,
    raceKitStaffVariant: 'C',
    ...staffPaths('undead_frost'),
    castAuraVariant: 'frost',
    impactVariant: 'blue',
    vfxKeys: ['frost', 'ice', 'freeze', 'chill'],
    animKey: 'magic_cast',
    /** Fleet ice-staff SSOT mesh — Frostbite / frostStaves catalog rows alias this GLB */
    description:
      'Undead T1 ice staff (canonical ice mesh models/codex/t1/staffs/undead_frost.glb) — frost school for chill and ice bolt tests. Catalog frost staves map to this mesh on Item Database.',
  },
};

export function getRaceElementStaff(raceId: string): RaceElementStaffDef {
  const id = (raceId || 'human').toLowerCase();
  return RACE_ELEMENT_STAFFS[id] ?? RACE_ELEMENT_STAFFS.human!;
}

export function listRaceElementStaffs(): RaceElementStaffDef[] {
  return Object.values(RACE_ELEMENT_STAFFS);
}

/** Resolve staff mesh URL for a race (local first, then CDN). */
export function resolveRaceStaffMeshUrl(raceId: string): string {
  const s = getRaceElementStaff(raceId);
  return s.localPath;
}

/** Spell test package for Danger Room / island equip. */
export function getRaceStaffSpellTestPackage(raceId: string) {
  const staff = getRaceElementStaff(raceId);
  return {
    staff,
    castAura: {
      variant: staff.castAuraVariant,
      school: staff.school,
      damageType: staff.damageType,
    },
    impact: {
      variant: staff.impactVariant,
      school: staff.school,
      damageType: staff.damageType,
      vfxKey: staff.vfxKeys[0],
    },
    animKey: staff.animKey,
    weaponSlots: { staff: staff.raceKitStaffVariant } as Record<string, string>,
    externalMesh: staff.localPath,
  };
}
