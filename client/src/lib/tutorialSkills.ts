/**
 * tutorialSkills — canonical Warlords home-island hotbars + gathering professions.
 *
 * Production rule: do not invent a second skill list for the home island. Class
 * abilities come from shared/definitions/classSkillTrees and weapon abilities come
 * from shared/definitions/weaponSkillsNew, including persisted player selections.
 */
import type { Character, ProfessionLevel } from '@/lib/characterManager';
import { resolveProfessionLevel } from '@/lib/professionLevels';
import { RESOURCE_TO_PROFESSION } from '@/lib/professionSystem';
import { defaultModel3d, weaponTypeFromModel3d } from '@shared/fleet';
import {
  CLASS_SKILL_TREES,
  getClassSkillTree,
  type ClassSkillChoice,
  type ClassSkillTree,
} from '@shared/definitions/classSkillTrees';
import {
  WEAPON_TYPE_DEFINITIONS,
  getSkillsForSlot,
  type WeaponSkillOption,
  type WeaponTypeDefinition,
} from '@shared/definitions/weaponSkillsNew';

export interface HotbarSlot {
  /** 1-based slot position. */
  index: number;
  kind: 'class' | 'weapon' | 'item' | 'empty';
  label: string;
  /** Emoji or real icon asset path. */
  icon?: string;
  skillId?: string;
  description?: string;
  cooldown?: number;
  locked?: boolean;
  lockReason?: string;
}

export interface GatheringProfession {
  id: string;
  name: string;
  level: number;
}

/**
 * Home/open-world resource aliases missing from the legacy synchronous map.
 * App.tsx already hydrates the profession XP table from ObjectStore; this extends
 * only resource→profession routing so scrap/salvage actually trains Scavenging and
 * shore loot actually trains Fishing instead of falling through to Logging.
 */
const WARLORDS_RESOURCE_PROFESSION_EXTENSIONS: Record<string, string> = {
  scrap: 'Scavenging',
  salvage: 'Scavenging',
  debris: 'Scavenging',
  component: 'Scavenging',
  components: 'Scavenging',
  bolts: 'Scavenging',
  gear_fragment: 'Scavenging',
  shell: 'Fishing',
  shells: 'Fishing',
  pearl: 'Fishing',
  pearls: 'Fishing',
};
for (const [resource, profession] of Object.entries(WARLORDS_RESOURCE_PROFESSION_EXTENSIONS)) {
  if (!RESOURCE_TO_PROFESSION[resource]) RESOURCE_TO_PROFESSION[resource] = profession;
}

/** All six production gathering professions from ObjectStore profession SSOT. */
const GATHERING_PROFESSIONS = [
  'Logging',
  'Mining',
  'Herbalism',
  'Skinning',
  'Fishing',
  'Scavenging',
] as const;

function normalizeClassKey(classId?: string): string {
  const raw = String(classId ?? '').trim().toLowerCase();
  if (CLASS_SKILL_TREES[raw]) return raw;
  if (raw.startsWith('worg') || raw.startsWith('worge')) return 'worg';
  if (raw.includes('priest')) return 'mage';
  return CLASS_SKILL_TREES.warrior ? 'warrior' : raw;
}

function allClassChoices(tree: ClassSkillTree): ClassSkillChoice[] {
  return [tree.specialAbility, ...tree.tiers.flatMap((tier) => tier.choices)];
}

function classChoiceLevel(tree: ClassSkillTree, skillId: string): number {
  if (tree.specialAbility.id === skillId) return 0;
  return tree.tiers.find((tier) => tier.choices.some((choice) => choice.id === skillId))?.level ?? 0;
}

function classChoiceById(tree: ClassSkillTree, skillId: string): ClassSkillChoice | undefined {
  return allClassChoices(tree).find((choice) => choice.id === skillId);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Class hotbar — canonical shared tree, persisted Shift+bar first, then selected
 * tier choices, then unlocked active/ultimate skills. Passive nodes never occupy
 * an action key unless the persisted bar explicitly names them.
 */
export function buildClassHotbar(char: Character | null | undefined): HotbarSlot[] {
  const classKey = normalizeClassKey(char?.classId);
  const tree = getClassSkillTree(classKey);
  if (!tree) return [];

  const level = Math.max(1, Number(char?.level ?? 1));
  const persistedBar = Object.entries(char?.classAbilityBar ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, id]) => id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const selectedTierSkills = Object.entries(char?.selectedSkills ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, id]) => id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const unlockedActives = tree.tiers
    .filter((tier) => tier.level <= level)
    .flatMap((tier) => tier.choices)
    .filter((choice) => choice.effectType !== 'passive')
    .map((choice) => choice.id);

  const ids = unique([
    ...persistedBar,
    tree.specialAbility.id,
    ...selectedTierSkills,
    ...unlockedActives,
  ]);

  return ids
    .map((id) => classChoiceById(tree, id))
    .filter((choice): choice is ClassSkillChoice => !!choice)
    .slice(0, 4)
    .map((choice, i) => {
      const unlockLevel = classChoiceLevel(tree, choice.id);
      const locked = level < unlockLevel;
      return {
        index: i + 1,
        kind: 'class' as const,
        label: choice.name,
        icon: choice.icon,
        skillId: choice.id,
        description: choice.description,
        cooldown: choice.cooldown,
        locked,
        lockReason: locked ? `Unlocks at level ${unlockLevel}` : undefined,
      };
    });
}

const WEAPON_DEFINITION_ALIASES: Record<string, string> = {
  'sword-shield': 'SWORD',
  longbow: 'BOW',
  magic: 'STAFF',
  'fire-staff': 'STAFF',
  'frost-staff': 'STAFF',
  'nature-staff': 'STAFF',
  'holy-staff': 'STAFF',
  'arcane-staff': 'STAFF',
  'lightning-staff': 'STAFF',
  'fire-tome': 'WAND',
  'frost-tome': 'WAND',
  'nature-tome': 'WAND',
  'holy-tome': 'WAND',
  'arcane-tome': 'WAND',
  'lightning-tome': 'WAND',
  hammer1h: 'HAMMER',
  hammer2h: 'HAMMER',
};

function resolveWeaponDefinition(weaponType?: string | null): WeaponTypeDefinition | undefined {
  const raw = String(weaponType ?? '').trim();
  if (!raw || raw === 'unarmed') return undefined;
  const direct = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (WEAPON_TYPE_DEFINITIONS[direct]) return WEAPON_TYPE_DEFINITIONS[direct];
  const alias = WEAPON_DEFINITION_ALIASES[raw.toLowerCase()];
  if (alias && WEAPON_TYPE_DEFINITIONS[alias]) return WEAPON_TYPE_DEFINITIONS[alias];
  return undefined;
}

function inferEquippedWeaponType(
  char: Character | null | undefined,
  explicit?: string | null,
): string | null {
  if (explicit) return explicit;
  const model3d = char?.model3d;
  if (model3d) {
    try {
      const canonical = defaultModel3d(char?.raceId ?? 'human', {
        ...model3d,
        equippedMeshes: model3d.equippedMeshes ?? {},
        weaponSlots: model3d.weaponSlots ?? {},
      });
      return weaponTypeFromModel3d(canonical, char?.classId);
    } catch {
      /* fall through to legacy equippedWeaponId */
    }
  }
  return char?.equippedWeaponId ?? null;
}

function findWeaponSkillById(skillId: string): WeaponSkillOption | undefined {
  for (const def of Object.values(WEAPON_TYPE_DEFINITIONS)) {
    for (const slot of def.slots) {
      const found = getSkillsForSlot(slot, def.slots).find((skill) => skill.id === skillId);
      if (found) return found;
    }
    for (const form of def.formSkills ?? []) {
      const found = form.skills.find((skill) => skill.id === skillId);
      if (found) return found;
    }
  }
  return undefined;
}

function persistedWeaponSkillIds(char: Character | null | undefined, weaponType?: string | null): string[] {
  const directBar = Object.entries(char?.weaponBar ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, id]) => id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (directBar.length) return unique(directBar);

  const selections = char?.weaponSkillSelections ?? {};
  const wanted = String(weaponType ?? '').toLowerCase();
  const matching = Object.entries(selections).find(([key]) => {
    const normalized = key.toLowerCase();
    return normalized === wanted || normalized.replace(/[_-]/g, '') === wanted.replace(/[_-]/g, '');
  })?.[1] ?? Object.values(selections)[0];

  if (!matching) return [];
  return unique([
    matching.hotkey1,
    matching.hotkey2,
    matching.hotkey3,
    matching.hotkey4,
    matching.hotkey5,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0));
}

/**
 * Weapon hotbar — real mastery definitions and persisted selections. If no explicit
 * selection exists, choose the best skill available in each canonical weapon slot
 * at the character's current weapon mastery tier.
 */
export function buildWeaponHotbar(
  char: Character | null | undefined,
  hasWeapon: boolean,
  equippedWeaponType?: string | null,
): HotbarSlot[] {
  if (!hasWeapon) return [];

  const resolvedWeaponType = inferEquippedWeaponType(char, equippedWeaponType);
  const masteryTier = Math.max(1, Number(char?.weaponSkillLevel ?? 1));
  const persisted = persistedWeaponSkillIds(char, resolvedWeaponType);
  if (persisted.length) {
    return persisted
      .map((id) => findWeaponSkillById(id))
      .filter((skill): skill is WeaponSkillOption => !!skill)
      .slice(0, 5)
      .map((skill, i) => ({
        index: i + 1,
        kind: 'weapon' as const,
        label: skill.name,
        icon: skill.icon,
        skillId: skill.id,
        description: skill.description,
        cooldown: skill.cooldown,
        locked: skill.tier > masteryTier,
        lockReason: skill.tier > masteryTier ? `Requires weapon mastery T${skill.tier}` : undefined,
      }));
  }

  const def = resolveWeaponDefinition(resolvedWeaponType);
  if (!def) return [];

  const maxSlots = Math.max(1, Math.min(5, def.hotbarSlots ?? 4));
  return def.slots.slice(0, maxSlots).map((slot, i) => {
    const pool = getSkillsForSlot(slot, def.slots);
    const available = pool.filter((skill) => skill.tier <= masteryTier);
    const skill = available[available.length - 1] ?? pool[0];
    const locked = masteryTier < slot.unlockTier || !skill || skill.tier > masteryTier;
    return {
      index: i + 1,
      kind: 'weapon' as const,
      label: skill?.name ?? slot.label,
      icon: skill?.icon ?? def.icon,
      skillId: skill?.id,
      description: skill?.description,
      cooldown: skill?.cooldown,
      locked,
      lockReason: locked ? `Requires weapon mastery T${Math.max(slot.unlockTier, skill?.tier ?? 1)}` : undefined,
    };
  });
}

/** Map stored profession levels to all six gathering professions. */
export function getActiveGatheringProfessions(
  levels: Record<string, ProfessionLevel | number> | null | undefined,
): GatheringProfession[] {
  const lv = levels ?? {};
  return GATHERING_PROFESSIONS.map((name) => {
    const raw = lv[name] ?? lv[name.toLowerCase()];
    const level = typeof raw === 'number'
      ? raw
      : resolveProfessionLevel(lv as Record<string, ProfessionLevel>, name, 'gathering').level;
    return {
      id: name.toLowerCase(),
      name,
      level: Math.max(1, Number(level ?? 1)),
    };
  });
}
