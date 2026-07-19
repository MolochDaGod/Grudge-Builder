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
import { weaponTypeFromModel3d, normalizeRaceId } from '@shared/fleet';

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
  let char: Character | null = null;
  try {
    char = await resolveActiveWarlordsCharacter(opts.characterId);
  } catch (e) {
    console.warn('[Grudge6Player] resolve failed', e);
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

  // Default combat bar if still empty (playable without spellbook assignment)
  const hasWeaponSkills = WEAPON_SKILL_SLOTS.some((s) => hotbar.weaponSkills[s]);
  if (!hasWeaponSkills) {
    hotbar.weaponSkills = {
      1: 'warrior_0_strike',
      2: 'grim_dest_blast',
      3: 'grim_prot_ward',
      4: 'grim_conj_minion',
      5: 'grim_conj_lord',
    };
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

/** Labels for ModePlayHUD combat bar */
export function hotbarLabelsForHud(hotbar: PlayerHotbar): {
  weaponHotbar: Array<{ key: string; label: string; skillId?: string }>;
  classHotbar: Array<{ key: string; label: string; skillId?: string }>;
} {
  const short = (id: string | null | undefined) => {
    if (!id) return '—';
    const tail = id.split(/[._]/).pop() || id;
    return tail.slice(0, 8);
  };
  return {
    weaponHotbar: WEAPON_SKILL_SLOTS.map((s) => ({
      key: String(s),
      label: short(hotbar.weaponSkills[s]),
      skillId: hotbar.weaponSkills[s] ?? undefined,
    })),
    classHotbar: WEAPON_SKILL_SLOTS.map((s) => ({
      key: `S${s}`,
      label: short(hotbar.classAbilities[s]),
      skillId: hotbar.classAbilities[s] ?? undefined,
    })),
  };
}
