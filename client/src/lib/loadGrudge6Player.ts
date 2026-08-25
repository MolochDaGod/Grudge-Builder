/**
 * loadGrudge6Player — apply a Warlords / uMMORPG-style race prefab to CharacterController3D.
 *
 * Same pipeline as Unity race player prefabs:
 *   race GLB (WK/ELF/ORC/…) → panel mesh catalog → weapons → anim set → hotbar 1–5
 */
import type { CharacterController3D } from '@/island3d/player/CharacterController3D';
import { CharacterManager, type Character } from '@/lib/characterManager';
import { characterAPI } from '@/lib/api';
import { parseModel3d, type Model3DField } from '@/lib/grudge6Character';
import {
  hotbarFromCharacter,
  type PlayerHotbar,
  WEAPON_SKILL_SLOTS,
} from '@/lib/hotbarLayout';
import { weaponTypeFromModel3d, normalizeRaceId, WARLORDS_PLAY_CONTRACT_VERSION } from '@shared/fleet';
import { defaultHotbarFromWeaponType } from '@/lib/viewerLaunchHandoff';
import { getWeaponSkillDisplay } from '@shared/definitions/weaponSkillDisplay.generated';

export interface Grudge6PlayerApplyOpts {
  /** Explicit character UUID (preferred) */
  characterId?: string | null;
  /** Fallbacks if API character is partial */
  raceId?: string;
  classId?: string;
  model3d?: Partial<Model3DField>;
  equipment?: Record<string, string | null>;
  /** When true, always load a race mesh even with no account (human warrior default). */
  forceDefault?: boolean;
  /** Skip roster fetch — use this character (launch hash / guest). */
  character?: Character | null;
}

export interface Grudge6PlayerApplyResult {
  ok: boolean;
  character: Character | null;
  raceId: string;
  classId: string;
  name: string;
  weaponType: string;
  hotbar: PlayerHotbar;
  error?: string;
}

/** Build action bar 1–5 from weapon mastery selections (uMMORPG style). */
export function actionBarFromWeaponSkillSelections(
  selections: Character['weaponSkillSelections'],
  weaponType: string,
): Record<number, string | null> {
  if (!selections || typeof selections !== 'object') {
    return { 1: null, 2: null, 3: null, 4: null, 5: null };
  }
  const key =
    weaponType in selections
      ? weaponType
      : Object.keys(selections).find((k) => k.toLowerCase() === weaponType.toLowerCase())
        ?? Object.keys(selections)[0];
  const sel = key ? selections[key] : null;
  if (!sel) return { 1: null, 2: null, 3: null, 4: null, 5: null };
  return {
    1: sel.hotkey1 ?? null,
    2: sel.hotkey2 ?? null,
    3: sel.hotkey3 ?? null,
    4: sel.hotkey4 ?? null,
    5: sel.hotkey5 ?? null,
  };
}

/** Resolve full Character from API / CharacterManager. */
export async function resolveActiveWarlordsCharacter(
  characterId?: string | null,
): Promise<Character | null> {
  const id =
    characterId
    || CharacterManager.getActiveId()
    || localStorage.getItem('grudge_active_character')
    || localStorage.getItem('gruda_active_character_guest');

  if (id) {
    try {
      const full = await characterAPI.get(id);
      if (full?.id) {
        CharacterManager.setActiveLocal(full.id);
        return full as Character;
      }
    } catch {
      /* fall through to roster */
    }
  }

  try {
    const active = await CharacterManager.getActiveCharacter();
    if (active) return active;
  } catch {
    /* ignore */
  }

  // Last resort: first warlords roster entry
  try {
    const list = await CharacterManager.getAll();
    if (list.length > 0) {
      CharacterManager.setActiveLocal(list[0].id);
      return list[0];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Load race GLB + mesh catalog + weapon anims + skill hotbar onto the controller.
 * Safe to call multiple times (race swap / equipment refresh).
 */
export async function applyGrudge6PlayerToController(
  character: CharacterController3D,
  opts: Grudge6PlayerApplyOpts = {},
): Promise<Grudge6PlayerApplyResult> {
  let char: Character | null = opts.character ?? null;
  if (!char) {
    try {
      char = await resolveActiveWarlordsCharacter(opts.characterId);
    } catch (e) {
      console.warn('[Grudge6Player] resolve failed', e);
    }
  }

  const raceId = normalizeRaceId(
    opts.raceId || char?.raceId || opts.model3d?.baseModelId || 'human',
  );
  const classId = opts.classId || char?.classId || 'warrior';
  const equipment = {
    ...(char?.equipment ?? {}),
    ...(opts.equipment ?? {}),
  } as Record<string, string | null>;

  const model3d = parseModel3d({
    ...(char ?? { id: 'local', name: 'Captain', raceId, classId, level: 1 }),
    raceId,
    classId,
    equipment,
    model3d: { ...(char?.model3d as any), ...opts.model3d },
  } as any);

  const weaponType = weaponTypeFromModel3d(model3d, classId) || 'sword';

  try {
    await character.loadCharacterFromManifest(
      raceId,
      classId,
      opts.characterId || char?.id,
      undefined,
      model3d,
      equipment,
    );
    character.setEquipment(equipment);
    const kit = character.loadedModelScene ?? character.model;
    if (kit?.userData) {
      kit.userData.warlordsPlayContract = WARLORDS_PLAY_CONTRACT_VERSION;
      kit.userData.grudge6Play = true;
      kit.userData.playPath = 'toon-rts-glb';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Grudge6Player] loadCharacterFromManifest failed:', msg);
    return {
      ok: false,
      character: char,
      raceId,
      classId,
      name: char?.name || 'Captain',
      weaponType,
      hotbar: hotbarFromCharacter(char),
      error: msg,
    };
  }

  // Hotbar: weaponBar / actionBar / weaponSkillSelections → slots 1–5
  const hotbar = hotbarFromCharacter(char);
  const fromSelections = actionBarFromWeaponSkillSelections(
    char?.weaponSkillSelections,
    weaponType,
  );
  for (const s of WEAPON_SKILL_SLOTS) {
    if (!hotbar.weaponSkills[s] && fromSelections[s]) {
      hotbar.weaponSkills[s] = fromSelections[s];
    }
  }

  // Empty bar → this weapon's weaponSkillsNew slots (not a class / grimoire demo bar)
  const hasWeaponSkills = WEAPON_SKILL_SLOTS.some((s) => hotbar.weaponSkills[s]);
  if (!hasWeaponSkills) {
    const fromWeapon = defaultHotbarFromWeaponType(weaponType);
    hotbar.weaponSkills = fromWeapon.weaponSkills;
  }

  const hasClass = WEAPON_SKILL_SLOTS.some((s) => hotbar.classAbilities[s]);
  if (!hasClass && (classId === 'mage' || classId === 'priest')) {
    hotbar.classAbilities[1] = 'mage_mana_shield';
    hotbar.classAbilities[2] = 'mage_0_missile';
    hotbar.classAbilities[3] = 'mage_1_heal';
  }

  const wt = String(weaponType || '').toLowerCase();
  if (wt === 'staff' || wt === 'wand') {
    const stunId = wt === 'wand' ? 'wand_r_stun_totem' : 'staff_stun_totem';
    if (!hotbar.weaponSkills[3]) hotbar.weaponSkills[3] = stunId;
    else if (!hotbar.weaponSkills[4] && hotbar.weaponSkills[3] !== stunId) {
      hotbar.weaponSkills[4] = stunId;
    }
  }

  character.loadHotbar(hotbar);

  console.log(
    `[Grudge6Player] Applied ${raceId}/${classId} "${char?.name ?? 'default'}" ` +
      `weapon=${weaponType} meshes=${Object.keys(model3d.equippedMeshes ?? {}).length} ` +
      `weapons=${Object.keys(model3d.weaponSlots ?? {}).length}`,
  );

  return {
    ok: true,
    character: char,
    raceId,
    classId,
    name: char?.name || 'Captain',
    weaponType,
    hotbar,
  };
}

/** Labels + icons from official WEAPON_SKILLS catalog (not id tails). */
export function hotbarLabelsForHud(hotbar: PlayerHotbar): {
  weaponHotbar: Array<{ key: string; label: string; skillId?: string; icon?: string }>;
  classHotbar: Array<{ key: string; label: string; skillId?: string; icon?: string }>;
} {
  const labelOf = (id: string | null | undefined) => {
    if (!id) return '—';
    return getWeaponSkillDisplay(id)?.name || id.replace(/[_-]+/g, ' ');
  };
  const iconOf = (id: string | null | undefined) => getWeaponSkillDisplay(id)?.icon;
  return {
    weaponHotbar: WEAPON_SKILL_SLOTS.map((s) => ({
      key: String(s),
      label: labelOf(hotbar.weaponSkills[s]),
      skillId: hotbar.weaponSkills[s] ?? undefined,
      icon: iconOf(hotbar.weaponSkills[s]),
    })),
    classHotbar: WEAPON_SKILL_SLOTS.map((s) => ({
      key: `S${s}`,
      label: labelOf(hotbar.classAbilities[s]),
      skillId: hotbar.classAbilities[s] ?? undefined,
      icon: iconOf(hotbar.classAbilities[s]),
    })),
  };
}
