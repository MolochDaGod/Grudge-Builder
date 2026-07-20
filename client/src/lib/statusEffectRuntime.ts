/**
 * Lightweight client runtime for status effects on local player / combat units.
 * Combat systems call apply/remove; HUD reads via getSnapshot / subscribe.
 */
import {
  type ActiveStatusInstance,
  applyStatus,
  cleanseDots,
  cleanseAllCleansableDebuffs,
  cleanseTrapsAndMovement,
  cleanseForAbility,
  tickStatuses,
  createStatusInstance,
  getStatusDef,
} from '@shared/definitions/statusEffects';

type Listener = (effects: ActiveStatusInstance[]) => void;

class StatusEffectRuntime {
  private effects: ActiveStatusInstance[] = [];
  private listeners = new Set<Listener>();

  getSnapshot(): ActiveStatusInstance[] {
    return this.effects;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.effects);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = this.effects;
    for (const fn of this.listeners) fn(snap);
  }

  apply(
    statusId: string,
    opts?: Partial<Pick<ActiveStatusInstance, 'stacks' | 'remainingSec' | 'sourceId' | 'potency'>>,
  ): void {
    this.effects = applyStatus(this.effects, statusId, opts);
    this.emit();
  }

  remove(statusId: string): void {
    this.effects = this.effects.filter((s) => s.statusId !== statusId);
    this.emit();
  }

  cleanseDots(): void {
    this.effects = cleanseDots(this.effects);
    this.emit();
  }

  /** Mana Shield / Invincible — wipe all cleansable debuffs */
  cleanseCleansableDebuffs(): void {
    this.effects = cleanseAllCleansableDebuffs(this.effects);
    this.emit();
  }

  /** @deprecated */
  cleanseCleansable(): void {
    this.cleanseCleansableDebuffs();
  }

  /** Worge form swap — traps + movement impairs only */
  cleanseTrapsAndMovement(): void {
    this.effects = cleanseTrapsAndMovement(this.effects);
    this.emit();
  }

  /** Apply cleanse tied to ability id (mage_shield, warrior_invincible, …) */
  onAbilityUsed(abilityId: string): void {
    this.effects = cleanseForAbility(this.effects, abilityId);
    this.emit();
  }

  /** Call from game loop with delta seconds */
  tick(dtSec: number): string[] {
    const { list, expired } = tickStatuses(this.effects, dtSec);
    this.effects = list;
    if (expired.length) this.emit();
    else this.emit();
    return expired;
  }

  clear(): void {
    this.effects = [];
    this.emit();
  }

  /**
   * Demo / debug: seed effects spanning all 10 magic indicator orbs
   * (buffs: arcane/command/kinetic/chemical · debuffs: dark/blood/binding/atomic/primordial).
   */
  seedDemo(): void {
    const demo = [
      'shielded', // arcane
      'empowered', // command
      'hasted', // kinetic
      'regenerating', // chemical
      'precision', // magnetic
      'cursed', // dark
      'bleeding', // blood
      'rooted', // binding
      'burning', // atomic
      'poisoned', // primordial
    ]
      .map((id) => createStatusInstance(id, { remainingSec: getStatusDef(id)?.defaultDurationSec ?? 10 }))
      .filter(Boolean) as ActiveStatusInstance[];
    this.effects = demo;
    this.emit();
  }
}

/** Singleton for local player HUD */
export const playerStatusEffects = new StatusEffectRuntime();

/** Per-entity map for combat targets (id → runtime) */
const entityRuntimes = new Map<string, StatusEffectRuntime>();

export function getEntityStatusRuntime(entityId: string): StatusEffectRuntime {
  let r = entityRuntimes.get(entityId);
  if (!r) {
    r = new StatusEffectRuntime();
    entityRuntimes.set(entityId, r);
  }
  return r;
}

export function clearEntityStatuses(entityId: string): void {
  entityRuntimes.get(entityId)?.clear();
  entityRuntimes.delete(entityId);
}
