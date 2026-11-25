/**
 * Skill intent — hostile (red) vs friendly (green) vs self.
 * Used by action-bar ally pick and mage/priest T0 totem echo.
 * Not a second skill tree: ids come from classSkillTrees / weapon catalog.
 */

export type SkillIntent = 'hostile' | 'friendly' | 'self';
export type TotemPaint = 'red' | 'green' | 'purple';

/** Mage Shield / mana shield — drops the T0 totem caster. */
export const SHIELD_SKILL_IDS = new Set([
  'mage_mana_shield',
  'mage_15_mana_shield',
  'grim_prot_shield',
  'grim_prot_ward',
]);

const FRIENDLY_ID =
  /heal|mend|bless|purify|divine|radiant|sanctify|shield|ward|buff|light|intervene|sprout|bloom|mist|atonement|flash/i;
const HOSTILE_ID =
  /missile|fireball|meteor|bolt|smite|blast|strike|slash|shot|arrow|chain(?!_heal)|blizzard|armageddon|nuke/i;

/** Freya stun totem — first click picks a ground AOE zone. */
export const STUN_TOTEM_SKILL_IDS = new Set([
  'staff_stun_totem',
  'wand_r_stun_totem',
  'mage_stun_totem',
  'mage_0_stun_totem',
]);

export function skillIntentFromId(skillId: string): SkillIntent {
  const id = String(skillId || '');
  if (SHIELD_SKILL_IDS.has(id)) return 'self';
  if (STUN_TOTEM_SKILL_IDS.has(id)) return 'hostile';
  if (FRIENDLY_ID.test(id)) return 'friendly';
  if (HOSTILE_ID.test(id)) return 'hostile';
  if (/heal|ally|party/i.test(id)) return 'friendly';
  return 'hostile';
}

export function isFriendlySkill(skillId: string): boolean {
  const i = skillIntentFromId(skillId);
  return i === 'friendly' || i === 'self';
}

export function isHostileSkill(skillId: string): boolean {
  return skillIntentFromId(skillId) === 'hostile';
}

/**
 * Buff / shield / unique ward — cannot land twice on the same ally.
 * Stacking heals (heal/mend/flash/…) still may re-hit the same target.
 */
const UNIQUE_FRIENDLY =
  /shield|ward|buff|bless|sanctify|empower|haste|aura|barrier|prot|inspire|invincible/i;
const STACKING_HEAL =
  /heal|mend|flash|sprout|bloom|mist|atonement|renew|regenerat/i;

export function skillCannotStackOnSame(skillId: string): boolean {
  const id = String(skillId || '');
  if (SHIELD_SKILL_IDS.has(id)) return true;
  if (isHostileSkill(id)) return false;
  if (STACKING_HEAL.test(id) && !UNIQUE_FRIENDLY.test(id)) return false;
  return UNIQUE_FRIENDLY.test(id);
}

/** Red = mage attack path; green = priest heal path. */
export function totemPaintFromLoadout(
  classId: string | undefined,
  skillIds: Iterable<string | null | undefined>,
): TotemPaint {
  const blob = `${classId || ''} ${[...skillIds].filter(Boolean).join(' ')}`.toLowerCase();
  if (/\bpriest\b/.test(blob)) return 'green';
  if (/mage_1_heal|mage_5_greater_heal|mage_10_chain_heal|mage_10_group_heal/.test(blob)) {
    return 'green';
  }
  return 'red';
}

export const TOTEM_ECHO_DELAY_SEC = 1;
/** Red/green echo totem stays out this long — not a one-cast drop. */
export const TOTEM_DURATION_SEC = 120;
/** Recast (replace) cooldown. Only one echo totem may exist. */
export const TOTEM_COOLDOWN_SEC = 20;
export const TOTEM_ALLY_HP_REROUTE = 0.9;
/** SI pole height after standing the author GLB on +Y. */
export const TOTEM_HEIGHT_M = 1.2;
/** Stun totem ground-pick range and pulse radius (SI metres). */
export const STUN_TOTEM_RANGE_M = 14;
export const STUN_TOTEM_AOE_M = 4.5;
export const STUN_TOTEM_STUN_SEC = 2.5;
export const STUN_TOTEM_LIFE_SEC = 8;

/** Mage red = Tyr T2; priest green = Loki T4; stun purple = Freya T3. */
export const TOTEM_MESH_URL: Record<TotemPaint, string> = {
  red: '/models/vfx/totems/tyr_tier_2.glb',
  green: '/models/vfx/totems/loki_tier_4.glb',
  purple: '/models/vfx/totems/freya_tier_3.glb',
};
