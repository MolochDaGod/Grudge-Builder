/**
 * Grudge6 character loading — freeform ARPG adapter.
 * Race = body mesh. Equipment = weapons / armor. Class is flavor only.
 */
import { getModelForCharacter, type WeaponType } from '@/lib/modelManifest';
import type { Character } from '@/lib/characterManager';
import type { ControlMode } from '@/island3d/player/CharacterController3D';
import {
  RACE_GRUDGE6,
  defaultModel3d,
  panelEquipmentToModel3d,
  characterToJoinOptions,
  weaponTypeFromModel3d,
  normalizeRaceId,
  type Model3DField,
} from '@shared/fleet';

export { RACE_GRUDGE6, type Model3DField, characterToJoinOptions, normalizeRaceId };

export interface Grudge6LoadConfig {
  characterId: string;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  baseModelId: string;
  modelPath: string;
  scale: number;
  skinColor: string;
  armorColor: string;
  equippedMeshes: Record<string, string>;
  weaponSlots: Record<string, string>;
  hasWeapon: boolean;
  equippedWeaponType: WeaponType;
}

export function parseModel3d(char: Character & { model3d?: Partial<Model3DField> }): Model3DField {
  const raceId = normalizeRaceId(char.raceId || 'human');
  const classId = char.classId || 'adventurer';
  const stored = char.model3d;
  const hasMeshes = stored?.equippedMeshes && Object.keys(stored.equippedMeshes).length > 0;
  const hasWeapons = stored?.weaponSlots && Object.keys(stored.weaponSlots).length > 0;
  if (hasMeshes || hasWeapons) {
    return { ...defaultModel3d(raceId), ...stored };
  }
  return panelEquipmentToModel3d(raceId, classId, char.equipment ?? {}, stored);
}

export function buildGrudge6LoadConfig(char: Character): Grudge6LoadConfig {
  const model3d = parseModel3d(char);
  const raceId = normalizeRaceId(char.raceId || 'human');
  const grudge6 = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  const modelUnit = getModelForCharacter(raceId);

  const weaponSlots = model3d.weaponSlots ?? {};
  const hasWeapon = Object.keys(weaponSlots).some((s) => s !== 'shield') ||
    !!(char.equipment?.MainHand || char.equipment?.mainHand || char.equippedWeaponId);

  const equippedWeaponType = hasWeapon
    ? (weaponTypeFromModel3d(model3d) as WeaponType)
    : 'unarmed';

  return {
    characterId: char.id,
    name: char.name,
    raceId,
    classId: char.classId || 'adventurer',
    level: char.level ?? 1,
    baseModelId: model3d.baseModelId || grudge6.modelId,
    modelPath: grudge6.cdnPath || modelUnit.modelPath,
    scale: model3d.scale ?? grudge6.scale ?? modelUnit.scale,
    skinColor: model3d.skinColor ?? '#ffffff',
    armorColor: model3d.armorColor ?? '#ffffff',
    equippedMeshes: model3d.equippedMeshes ?? {},
    weaponSlots,
    hasWeapon,
    equippedWeaponType,
  };
}

/**
 * Control-mode weapon anim set.
 * Freeform: pass the player's actual equipped type — class is ignored.
 */
export function getWeaponTypeForMode(
  mode: ControlMode,
  _classId: string,
  hasWeapon: boolean,
  equippedWeaponType?: WeaponType | string,
): WeaponType {
  if (mode === 'harvest' || mode === 'build') return 'unarmed';
  if (!hasWeapon) return 'unarmed';
  return (equippedWeaponType as WeaponType) || 'sword';
}