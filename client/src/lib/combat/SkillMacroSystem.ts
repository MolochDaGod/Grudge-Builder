/**
 * SkillMacroSystem — consolidated hotbar + skill-macro layer.
 *
 * Unifies:
 *   - hotbarLayout (weapon 1–5, consumable 6–8, Shift class abilities)
 *   - weapon skill ids from weaponSkillsNew / combat catalog
 *   - optional multi-step macros (sequence with delays)
 *
 * Does NOT execute combat VFX/damage — emits resolve events for
 * ProductionSkillCombatRuntime / ScriptableSkillRuntime to consume.
 */

import {
  type PlayerHotbar,
  type HotbarSlotMap,
  emptyHotbar,
  hotbarFromCharacter,
  hotbarToCharacterFields,
  WEAPON_SKILL_SLOTS,
  CONSUMABLE_SLOTS,
  CLASS_ABILITY_SLOTS,
  classAbilityHudKey,
  isClassAbilityHudKey,
} from '@/lib/hotbarLayout';

export type MacroSlotKind = 'weapon' | 'consumable' | 'class' | 'macro';

export interface MacroStep {
  /** Skill or consumable id */
  skillId: string;
  /** Delay after previous step (seconds). First step ignores this. */
  delaySec?: number;
}

export interface SkillMacro {
  id: string;
  name: string;
  /** Ordered steps */
  steps: MacroStep[];
  /** Optional hotbar slot binding (1–8 weapon/consumable, or 101–105 class) */
  bindSlot?: number;
  /** When true, cancel if player moves / takes damage (future) */
  interruptible?: boolean;
}

export interface ResolveHotbarInput {
  /** Physical key slot 1–8 */
  slot: number;
  /** Shift held → class ability bar */
  shift?: boolean;
  /** Optional: treat slot as macro id when mapped */
  preferMacro?: boolean;
}

export type MacroResolveResult =
  | { ok: true; kind: MacroSlotKind; skillId: string; hudKey: number; macroId?: string }
  | { ok: true; kind: 'macro'; macro: SkillMacro; hudKey: number }
  | { ok: false; reason: 'empty' | 'unknown_slot' | 'macro_missing' };

export type MacroFireListener = (result: Extract<MacroResolveResult, { ok: true }>) => void;

/**
 * Runtime state for one player's bars + named macros.
 */
export class SkillMacroSystem {
  private hotbar: PlayerHotbar;
  private macros = new Map<string, SkillMacro>();
  /** slot (1–8 or 101–105) → macro id */
  private slotMacros = new Map<number, string>();
  private listeners = new Set<MacroFireListener>();

  /** Active multi-step macro playback */
  private playing: {
    macro: SkillMacro;
    index: number;
    wait: number;
  } | null = null;

  constructor(hotbar?: PlayerHotbar) {
    this.hotbar = hotbar ? structuredClone(hotbar) : emptyHotbar();
  }

  static fromCharacter(char?: Parameters<typeof hotbarFromCharacter>[0]): SkillMacroSystem {
    return new SkillMacroSystem(hotbarFromCharacter(char));
  }

  getHotbar(): PlayerHotbar {
    return this.hotbar;
  }

  setHotbar(hotbar: PlayerHotbar): void {
    this.hotbar = structuredClone(hotbar);
  }

  /** Patch one weapon/consumable/class slot */
  setSlot(kind: 'weapon' | 'consumable' | 'class', slot: number, skillId: string | null): void {
    if (kind === 'weapon' && (WEAPON_SKILL_SLOTS as readonly number[]).includes(slot)) {
      this.hotbar.weaponSkills[slot] = skillId;
      return;
    }
    if (kind === 'consumable' && (CONSUMABLE_SLOTS as readonly number[]).includes(slot)) {
      this.hotbar.consumables[slot] = skillId;
      return;
    }
    if (kind === 'class' && (CLASS_ABILITY_SLOTS as readonly number[]).includes(slot)) {
      this.hotbar.classAbilities[slot] = skillId;
    }
  }

  /** Register or replace a multi-step macro */
  registerMacro(macro: SkillMacro): void {
    this.macros.set(macro.id, {
      ...macro,
      steps: macro.steps.map((s) => ({ ...s })),
    });
    if (macro.bindSlot != null) {
      this.slotMacros.set(macro.bindSlot, macro.id);
    }
  }

  unregisterMacro(id: string): void {
    const m = this.macros.get(id);
    if (m?.bindSlot != null) this.slotMacros.delete(m.bindSlot);
    this.macros.delete(id);
  }

  getMacro(id: string): SkillMacro | undefined {
    return this.macros.get(id);
  }

  listMacros(): SkillMacro[] {
    return Array.from(this.macros.values());
  }

  /** Bind a macro id to a hotbar HUD key (1–8 or 101–105) */
  bindMacroToSlot(macroId: string, hudKey: number): void {
    if (!this.macros.has(macroId)) return;
    this.slotMacros.set(hudKey, macroId);
    const m = this.macros.get(macroId)!;
    m.bindSlot = hudKey;
  }

  clearSlotMacro(hudKey: number): void {
    this.slotMacros.delete(hudKey);
  }

  onFire(listener: MacroFireListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(result: Extract<MacroResolveResult, { ok: true }>): void {
    for (const l of this.listeners) {
      try {
        l(result);
      } catch {
        /* listener errors must not break input */
      }
    }
  }

  /**
   * Resolve keypress → skill or macro. Does not start multi-step playback;
   * call fire() for that.
   */
  resolve(input: ResolveHotbarInput): MacroResolveResult {
    const { slot, shift } = input;
    if (slot < 1 || slot > 8) {
      return { ok: false, reason: 'unknown_slot' };
    }

    const hudKey = shift ? classAbilityHudKey(slot) : slot;

    // Prefer bound macro when present
    if (input.preferMacro !== false && this.slotMacros.has(hudKey)) {
      const mid = this.slotMacros.get(hudKey)!;
      const macro = this.macros.get(mid);
      if (!macro) return { ok: false, reason: 'macro_missing' };
      return { ok: true, kind: 'macro', macro, hudKey };
    }

    if (shift) {
      if (!(CLASS_ABILITY_SLOTS as readonly number[]).includes(slot)) {
        return { ok: false, reason: 'unknown_slot' };
      }
      const skillId = this.hotbar.classAbilities[slot];
      if (!skillId) return { ok: false, reason: 'empty' };
      return { ok: true, kind: 'class', skillId, hudKey };
    }

    if ((WEAPON_SKILL_SLOTS as readonly number[]).includes(slot)) {
      const skillId = this.hotbar.weaponSkills[slot];
      if (!skillId) return { ok: false, reason: 'empty' };
      return { ok: true, kind: 'weapon', skillId, hudKey };
    }

    if ((CONSUMABLE_SLOTS as readonly number[]).includes(slot)) {
      const skillId = this.hotbar.consumables[slot];
      if (!skillId) return { ok: false, reason: 'empty' };
      return { ok: true, kind: 'consumable', skillId, hudKey };
    }

    return { ok: false, reason: 'unknown_slot' };
  }

  /**
   * Fire slot: emit single skill or start multi-step macro.
   * Returns resolve result for UI feedback.
   */
  fire(input: ResolveHotbarInput): MacroResolveResult {
    const result = this.resolve(input);
    if (!result.ok) return result;

    if (result.kind === 'macro') {
      this.playing = { macro: result.macro, index: 0, wait: 0 };
      // Immediately fire first step
      const first = result.macro.steps[0];
      if (first) {
        this.emit({
          ok: true,
          kind: 'weapon',
          skillId: first.skillId,
          hudKey: result.hudKey,
          macroId: result.macro.id,
        });
        this.playing.index = 1;
        this.playing.wait = result.macro.steps[1]?.delaySec ?? 0;
      }
      this.emit(result);
      return result;
    }

    this.emit(result);
    return result;
  }

  /** Cancel multi-step macro */
  cancelMacro(): void {
    this.playing = null;
  }

  get isMacroPlaying(): boolean {
    return this.playing != null;
  }

  /**
   * Advance multi-step macros. Call from game tick with dt seconds.
   */
  update(dt: number): void {
    if (!this.playing) return;
    const { macro } = this.playing;
    if (this.playing.index >= macro.steps.length) {
      this.playing = null;
      return;
    }
    this.playing.wait -= dt;
    if (this.playing.wait > 0) return;

    const step = macro.steps[this.playing.index];
    if (!step) {
      this.playing = null;
      return;
    }
    this.emit({
      ok: true,
      kind: 'weapon',
      skillId: step.skillId,
      hudKey: macro.bindSlot ?? 0,
      macroId: macro.id,
    });
    this.playing.index += 1;
    if (this.playing.index >= macro.steps.length) {
      this.playing = null;
    } else {
      this.playing.wait = macro.steps[this.playing.index]?.delaySec ?? 0;
    }
  }

  /** Persist fields for character save */
  toCharacterFields(): ReturnType<typeof hotbarToCharacterFields> {
    return hotbarToCharacterFields(this.hotbar);
  }

  /** Snapshot macros for save/export */
  exportMacros(): SkillMacro[] {
    return this.listMacros();
  }

  importMacros(macros: SkillMacro[]): void {
    for (const m of macros) this.registerMacro(m);
  }
}

/** Build a 2–3 step weapon macro from skill ids */
export function makeChainMacro(
  id: string,
  name: string,
  skillIds: string[],
  opts?: { delaySec?: number; bindSlot?: number },
): SkillMacro {
  const delay = opts?.delaySec ?? 0.35;
  return {
    id,
    name,
    bindSlot: opts?.bindSlot,
    interruptible: true,
    steps: skillIds.map((skillId, i) => ({
      skillId,
      delaySec: i === 0 ? 0 : delay,
    })),
  };
}

export {
  WEAPON_SKILL_SLOTS,
  CONSUMABLE_SLOTS,
  CLASS_ABILITY_SLOTS,
  classAbilityHudKey,
  isClassAbilityHudKey,
  emptyHotbar,
  hotbarFromCharacter,
  type PlayerHotbar,
  type HotbarSlotMap,
};
