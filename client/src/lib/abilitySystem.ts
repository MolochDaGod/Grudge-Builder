import type { Spell, Skill } from '@shared/schema';

export interface RuntimeAbility {
  id: string;
  name: string;
  type: 'spell' | 'skill' | 'basic_attack';
  icon: string;
  resourceCost: number;
  resourceType: 'mana' | 'stamina' | 'none';
  cooldown: number;
  range: number;
  baseDamage: number;
  damageMultiplier: number;
  damageType: string;
  targetingMode: 'self' | 'single' | 'aoe' | 'directional';
  aoeRadius: number;
  effects: Array<{ type: string; value: number; duration?: number }>;
  visualEffect?: { animation: string; color: string; particles?: string };
  description: string;
}

export interface AbilitySlot {
  index: number;
  hotkey: string;
  ability: RuntimeAbility | null;
  currentCooldown: number;
  isOnCooldown: boolean;
}

export interface AbilityBarState {
  slots: AbilitySlot[];
  globalCooldown: number;
  isGcdActive: boolean;
}

export const HOTKEY_BINDINGS = ['1', '2', '3', '4', '5'] as const;
export const GCD_DURATION = 500;

export function createDefaultAbilityBar(): AbilityBarState {
  const basicAttack: RuntimeAbility = {
    id: 'basic_attack',
    name: 'Attack',
    type: 'basic_attack',
    icon: 'sword',
    resourceCost: 0,
    resourceType: 'none',
    cooldown: 0,
    range: 1,
    baseDamage: 0,
    damageMultiplier: 100,
    damageType: 'physical',
    targetingMode: 'single',
    aoeRadius: 0,
    effects: [],
    description: 'A basic melee attack',
  };

  return {
    slots: HOTKEY_BINDINGS.map((hotkey, index) => ({
      index,
      hotkey,
      ability: index === 0 ? basicAttack : null,
      currentCooldown: 0,
      isOnCooldown: false,
    })),
    globalCooldown: 0,
    isGcdActive: false,
  };
}

export function spellToRuntime(spell: Spell): RuntimeAbility {
  return {
    id: spell.id,
    name: spell.name,
    type: 'spell',
    icon: spell.school || 'sparkles',
    resourceCost: spell.manaCost,
    resourceType: 'mana',
    cooldown: (spell.cooldown || 0) * 1000,
    range: spell.range || 1,
    baseDamage: spell.baseDamage || 0,
    damageMultiplier: 100,
    damageType: spell.damageType || 'magic',
    targetingMode: (spell.areaOfEffect || 0) > 0 ? 'aoe' : 'single',
    aoeRadius: spell.areaOfEffect || 0,
    effects: spell.effects || [],
    visualEffect: spell.visualEffect ?? undefined,
    description: spell.description || '',
  };
}

export function skillToRuntime(skill: Skill): RuntimeAbility {
  return {
    id: skill.id,
    name: skill.name,
    type: 'skill',
    icon: skill.weaponType || 'sword',
    resourceCost: skill.staminaCost,
    resourceType: 'stamina',
    cooldown: (skill.cooldown || 0) * 1000,
    range: 1,
    baseDamage: 0,
    damageMultiplier: skill.damageMultiplier || 100,
    damageType: skill.damageType || 'physical',
    targetingMode: 'single',
    aoeRadius: 0,
    effects: skill.effects || [],
    visualEffect: skill.visualEffect ?? undefined,
    description: skill.description || '',
  };
}

export function canUseAbility(
  ability: RuntimeAbility,
  currentMana: number,
  currentStamina: number,
  isOnCooldown: boolean,
  isGcdActive: boolean
): { canUse: boolean; reason?: string } {
  if (isGcdActive) {
    return { canUse: false, reason: 'Global cooldown active' };
  }
  if (isOnCooldown) {
    return { canUse: false, reason: 'Ability on cooldown' };
  }
  if (ability.resourceType === 'mana' && currentMana < ability.resourceCost) {
    return { canUse: false, reason: 'Not enough mana' };
  }
  if (ability.resourceType === 'stamina' && currentStamina < ability.resourceCost) {
    return { canUse: false, reason: 'Not enough stamina' };
  }
  return { canUse: true };
}

export function updateCooldowns(state: AbilityBarState, deltaTime: number): AbilityBarState | null {
  const hasActiveCooldowns = state.isGcdActive || state.slots.some(s => s.isOnCooldown);
  if (!hasActiveCooldowns) return null;

  let changed = false;
  const newSlots = state.slots.map(slot => {
    if (!slot.isOnCooldown) return slot;
    const newCooldown = Math.max(0, slot.currentCooldown - deltaTime);
    const isOnCooldown = newCooldown > 0;
    if (newCooldown !== slot.currentCooldown || isOnCooldown !== slot.isOnCooldown) {
      changed = true;
      return { ...slot, currentCooldown: newCooldown, isOnCooldown };
    }
    return slot;
  });

  const newGcd = Math.max(0, state.globalCooldown - deltaTime);
  const isGcdActive = newGcd > 0;
  if (newGcd !== state.globalCooldown || isGcdActive !== state.isGcdActive) {
    changed = true;
  }

  if (!changed) return null;

  return {
    slots: newSlots,
    globalCooldown: newGcd,
    isGcdActive,
  };
}

export function activateAbility(
  state: AbilityBarState,
  slotIndex: number
): { newState: AbilityBarState; ability: RuntimeAbility | null } {
  const slot = state.slots[slotIndex];
  if (!slot || !slot.ability) {
    return { newState: state, ability: null };
  }

  const ability = slot.ability;
  const newSlots = state.slots.map((s, i) => {
    if (i !== slotIndex) return s;
    return {
      ...s,
      currentCooldown: ability.cooldown,
      isOnCooldown: ability.cooldown > 0,
    };
  });

  return {
    newState: {
      slots: newSlots,
      globalCooldown: GCD_DURATION,
      isGcdActive: true,
    },
    ability,
  };
}

export function setAbilityInSlot(
  state: AbilityBarState,
  slotIndex: number,
  ability: RuntimeAbility | null
): AbilityBarState {
  const newSlots = state.slots.map((slot, i) => {
    if (i !== slotIndex) return slot;
    return {
      ...slot,
      ability,
      currentCooldown: 0,
      isOnCooldown: false,
    };
  });

  return { ...state, slots: newSlots };
}
