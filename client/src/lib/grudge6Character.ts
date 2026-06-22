/**
 * Grudge6 character loading — client adapter over @shared/fleet/character.
 */
import { CLASS_WEAPON_MAP, getModelForCharacter, type WeaponType } from '@/lib/modelManifest';
import type { Character } from '@/lib/characterManager';
import type { ControlMode } from '@/island3d/player/CharacterController3D';
import {
  RACE_GRUDGE6,
  defaultModel3d,
  characterToJoinOptions,
  type Model3DField,
} from '@shared/fleet';

export { RACE_GRUDGE6, type Model3DField, characterToJoinOptions };

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
  return { ...defaultModel3d(char.raceId || 'human'), ...char.model3d };
}

export function buildGrudge6LoadConfig(char: Character): Grudge6LoadConfig {
  const model3d = parseModel3d(char);
  const raceId = char.raceId || 'human';
  const grudge6 = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  const modelUnit = getModelForCharacter(raceId, char.classId || 'warrior');

  const weaponSlots = model3d.weaponSlots ?? {};
  const hasWeapon = Object.keys(weaponSlots).length > 0 ||
    !!(char.equipment?.mainHand || char.equippedWeaponId);

  return {
    characterId: char.id,
    name: char.name,
    raceId,
    classId: char.classId || 'warrior',
    level: char.level ?? 1,
    baseModelId: model3d.baseModelId || grudge6.modelId,
    modelPath: modelUnit.modelPath,
    scale: model3d.scale ?? modelUnit.scale,
    skinColor: model3d.skinColor ?? '#ffffff',
    armorColor: model3d.armorColor ?? '#ffffff',
    equippedMeshes: model3d.equippedMeshes ?? {},
    weaponSlots,
    hasWeapon,
    equippedWeaponType: hasWeapon
      ? (CLASS_WEAPON_MAP[char.classId] ?? modelUnit.weaponType)
      : 'unarmed',
  };
}

export function getWeaponTypeForMode(
  mode: ControlMode,
  classId: string,
  hasWeapon: boolean,
): WeaponType {
  if (mode === 'harvest' || mode === 'build') return 'unarmed';
  if (!hasWeapon) return 'unarmed';
  return CLASS_WEAPON_MAP[classId] ?? 'sword';
}