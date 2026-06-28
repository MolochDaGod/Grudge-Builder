/**
 * tutorialSkills — builds the home-island hotbars and active gathering
 * professions from a character. Pure helpers consumed by
 * src/pages/home-island.tsx and rendered by TutorialGameplayHUD.
 *
 * Hotbar convention (per game design): slots 1-4 are skills, slot 5 is left
 * empty, consumables live in 6-8 (handled elsewhere). Here we surface the
 * class skill slots (1-4) and a separate weapon-skill row.
 */
import type { Character, ProfessionLevel } from '@/lib/characterManager';
import { resolveProfessionLevel } from '@/lib/professionLevels';

export interface HotbarSlot {
  /** 1-based slot position. */
  index: number;
  kind: 'class' | 'weapon' | 'item' | 'empty';
  label: string;
  icon?: string;
  skillId?: string;
  locked?: boolean;
  lockReason?: string;
}

export interface GatheringProfession {
  id: string;
  name: string;
  level: number;
}

const GATHERING_PROFESSIONS = ['Logging', 'Mining', 'Herbalism', 'Skinning', 'Fishing'] as const;

/** Four starter skills per class, unlocking as the character levels up. */
const CLASS_SKILLS: Record<string, { id: string; label: string; icon: string; unlock: number }[]> = {
  warrior: [
    { id: 'cleave', label: 'Cleave', icon: '⚔️', unlock: 1 },
    { id: 'shield-bash', label: 'Shield Bash', icon: '🛡️', unlock: 1 },
    { id: 'charge', label: 'Charge', icon: '💨', unlock: 5 },
    { id: 'warcry', label: 'War Cry', icon: '📣', unlock: 10 },
  ],
  mage: [
    { id: 'firebolt', label: 'Firebolt', icon: '🔥', unlock: 1 },
    { id: 'frost-nova', label: 'Frost Nova', icon: '❄️', unlock: 1 },
    { id: 'arcane-ward', label: 'Arcane Ward', icon: '🔮', unlock: 5 },
    { id: 'meteor', label: 'Meteor', icon: '☄️', unlock: 10 },
  ],
  ranger: [
    { id: 'aimed-shot', label: 'Aimed Shot', icon: '🏹', unlock: 1 },
    { id: 'multishot', label: 'Multishot', icon: '🎯', unlock: 1 },
    { id: 'trap', label: 'Snare Trap', icon: '🪤', unlock: 5 },
    { id: 'rain-arrows', label: 'Arrow Rain', icon: '🌧️', unlock: 10 },
  ],
  worg: [
    { id: 'maul', label: 'Maul', icon: '🐺', unlock: 1 },
    { id: 'howl', label: 'Howl', icon: '🌙', unlock: 1 },
    { id: 'pounce', label: 'Pounce', icon: '💢', unlock: 5 },
    { id: 'shapeshift', label: 'Shapeshift', icon: '🐾', unlock: 10 },
  ],
};

function classKey(classId?: string): keyof typeof CLASS_SKILLS {
  const c = (classId ?? 'warrior').toLowerCase();
  if (c.startsWith('worg') || c.startsWith('worge')) return 'worg';
  if (c in CLASS_SKILLS) return c as keyof typeof CLASS_SKILLS;
  return 'warrior';
}

/** Class skill hotbar — slots 1-4. Higher-tier skills lock until level. */
export function buildClassHotbar(char: Character | null | undefined): HotbarSlot[] {
  const level = Number((char as any)?.level ?? 1);
  const skills = CLASS_SKILLS[classKey((char as any)?.classId)];
  return skills.map((s, i) => {
    const locked = level < s.unlock;
    return {
      index: i + 1,
      kind: 'class',
      label: s.label,
      icon: s.icon,
      skillId: s.id,
      locked,
      lockReason: locked ? `Unlocks at level ${s.unlock}` : undefined,
    };
  });
}

/** Weapon skill row — locked entirely until a weapon is equipped. */
export function buildWeaponHotbar(
  char: Character | null | undefined,
  hasWeapon: boolean,
): HotbarSlot[] {
  const base: { id: string; label: string; icon: string }[] = [
    { id: 'weapon-basic', label: 'Strike', icon: '🗡️' },
    { id: 'weapon-heavy', label: 'Heavy Blow', icon: '💥' },
    { id: 'weapon-special', label: 'Special', icon: '✨' },
  ];
  return base.map((s, i) => ({
    index: i + 1,
    kind: 'weapon',
    label: s.label,
    icon: s.icon,
    skillId: s.id,
    locked: !hasWeapon,
    lockReason: hasWeapon ? undefined : 'Equip a weapon from the Arsenal',
  }));
}

/** Map stored profession levels to the five gathering professions. */
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
