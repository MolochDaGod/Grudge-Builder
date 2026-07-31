/**
 * PlayModeStateManager — SSOT for combat / harvest play mode + Q input.
 *
 * Input contract (fleet best practice):
 *   · **Tap Q**  (< HOLD_MS): quick swap
 *       combat  → MainHand ↔ SecondaryWeapon (non-drop 2nd-weapon reserve)
 *       harvest → last tool ↔ build hammer (toolkit)
 *   · **Hold Q** (≥ HOLD_MS): open radial while held; release selects / closes
 *       combat  → weapon set + switch to Harvest
 *       harvest → tools (hatchet/pick/knife/rod/hammer) + switch to Combat
 *   · **R**      (harvest only): same tool radial without mode switch chips
 *
 * Mode dock buttons still call setMode() directly.
 * Engine owns mesh/equip side effects via inject hooks.
 */

import type { HarvestRadialToolId } from '@/game/harvest/HarvestToolActions';
import {
  DEFAULT_HARVEST_RADIAL_TOOL,
  HARVEST_RADIAL_TOOLS,
} from '@/game/harvest/HarvestToolActions';

/** Hold threshold before radial opens (ms). Below = tap. */
export const Q_HOLD_MS = 200;

/**
 * HUD dual-mode (build is harvest sub-state via toolkit).
 * Canonical name: playMode (see namingSsot PlayModeName).
 * Not "controlMode" (that includes build) and not "shell mode".
 */
export type PlayHudMode = 'combat' | 'harvest';
/** Alias of PlayHudMode — preferred in new docs */
export type PlayMode = PlayHudMode;

/** Which combat weapon set is drawn (MainHand vs non-drop secondary). */
export type CombatWeaponSet = 'primary' | 'secondary';

/**
 * Non-drop inventory / equipment reserve for weapon quick-swap.
 * SecondaryWeapon is NOT a paperdoll drop slot — bag UI must treat it as locked.
 */
export const NON_DROP_WEAPON_KEYS = {
  /** Active combat MainHand */
  primary: 'MainHand',
  /** Reserve 2nd weapon (Q-tap partner) — non-drop */
  secondary: 'SecondaryWeapon',
} as const;

export type QRadialItemId =
  | 'mode_combat'
  | 'mode_harvest'
  | `weapon_${CombatWeaponSet}`
  | `tool_${HarvestRadialToolId}`;

export interface QRadialItem {
  id: QRadialItemId;
  label: string;
  emoji: string;
  title: string;
  active?: boolean;
  /** Optional craftpix / ObjectStore icon */
  iconUrl?: string;
}

export interface PlayModeSnapshot {
  mode: PlayHudMode;
  harvestTool: HarvestRadialToolId;
  lastHarvestTool: HarvestRadialToolId;
  combatWeaponSet: CombatWeaponSet;
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  qRadialOpen: boolean;
  toolRadialOpen: boolean;
  qHolding: boolean;
  lastSwapDetail: string | null;
}

export interface PlayModeEngineBridge {
  enterCombatMode: () => Promise<void> | void;
  enterHarvestMode: () => Promise<void> | void;
  setHarvestRadialTool: (tool: HarvestRadialToolId) => Promise<void> | void;
  /**
   * Apply MainHand + SecondaryWeapon (non-drop) after swap / load.
   * Should refresh combat anims when mode is combat.
   */
  applyCombatWeapons: (opts: {
    mainHand: string | null;
    secondary: string | null;
    activeSet: CombatWeaponSet;
  }) => Promise<void> | void;
  getEquipment?: () => Record<string, string | null | undefined>;
}

export type PlayModeListener = (snap: PlayModeSnapshot) => void;

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export class PlayModeStateManager {
  private mode: PlayHudMode = 'combat';
  private harvestTool: HarvestRadialToolId = DEFAULT_HARVEST_RADIAL_TOOL;
  private lastHarvestTool: HarvestRadialToolId = DEFAULT_HARVEST_RADIAL_TOOL;
  private combatWeaponSet: CombatWeaponSet = 'primary';
  private primaryWeaponId: string | null = null;
  private secondaryWeaponId: string | null = null;

  private qRadialOpen = false;
  private toolRadialOpen = false;
  private qHolding = false;
  private qDownAt = 0;
  private qHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private qTapConsumed = false;
  /** Last tap-Q result for HUD toast */
  lastSwapDetail: string | null = null;

  private bridge: PlayModeEngineBridge | null = null;
  private listeners = new Set<PlayModeListener>();
  private bound = false;

  /** Attach engine side effects (Island3DEngine methods). */
  connect(bridge: PlayModeEngineBridge): void {
    this.bridge = bridge;
    this.hydrateWeaponsFromEquipment();
  }

  disconnect(): void {
    this.bridge = null;
    this.unbindInput();
  }

  /** Load weapons from character equipment (MainHand + SecondaryWeapon). */
  hydrateWeaponsFromEquipment(eq?: Record<string, string | null | undefined>): void {
    const e = eq ?? this.bridge?.getEquipment?.() ?? {};
    const main = e.MainHand ?? e.mainHand ?? null;
    const sec = e.SecondaryWeapon ?? e.secondaryWeapon ?? null;
    if (main != null && String(main).length) this.primaryWeaponId = String(main);
    if (sec != null && String(sec).length) this.secondaryWeaponId = String(sec);
    // If only one weapon, keep secondary empty until bag assigns non-drop slot B
    this.emit();
  }

  /**
   * Explicitly set non-drop weapon pair (from inventory UI / loadout).
   * activeSet chooses which sits in MainHand.
   */
  setWeaponPair(
    primary: string | null,
    secondary: string | null,
    activeSet: CombatWeaponSet = 'primary',
  ): void {
    this.primaryWeaponId = primary;
    this.secondaryWeaponId = secondary;
    this.combatWeaponSet = activeSet;
    void this.pushWeaponsToEngine();
    this.emit();
  }

  bindInput(target: Window = window): void {
    if (this.bound) return;
    this.bound = true;
    target.addEventListener('keydown', this.onKeyDown, true);
    target.addEventListener('keyup', this.onKeyUp, true);
    target.addEventListener('blur', this.onBlur);
  }

  unbindInput(target: Window = window): void {
    if (!this.bound) return;
    this.bound = false;
    target.removeEventListener('keydown', this.onKeyDown, true);
    target.removeEventListener('keyup', this.onKeyUp, true);
    target.removeEventListener('blur', this.onBlur);
    this.clearHoldTimer();
  }

  subscribe(fn: PlayModeListener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): PlayModeSnapshot {
    return {
      mode: this.mode,
      harvestTool: this.harvestTool,
      lastHarvestTool: this.lastHarvestTool,
      combatWeaponSet: this.combatWeaponSet,
      primaryWeaponId: this.primaryWeaponId,
      secondaryWeaponId: this.secondaryWeaponId,
      qRadialOpen: this.qRadialOpen,
      toolRadialOpen: this.toolRadialOpen,
      qHolding: this.qHolding,
      lastSwapDetail: this.lastSwapDetail,
    };
  }

  /** Radial chips for current mode (hold-Q). */
  getQRadialItems(): QRadialItem[] {
    if (this.mode === 'combat') {
      return [
        {
          id: 'weapon_primary',
          label: 'Weapon 1',
          emoji: '⚔',
          title: this.primaryWeaponId
            ? `Primary: ${this.primaryWeaponId}`
            : 'Primary weapon (MainHand)',
          active: this.combatWeaponSet === 'primary',
        },
        {
          id: 'weapon_secondary',
          label: 'Weapon 2',
          emoji: '🗡',
          title: this.secondaryWeaponId
            ? `Secondary (non-drop): ${this.secondaryWeaponId}`
            : 'No 2nd weapon in non-drop slot',
          active: this.combatWeaponSet === 'secondary',
        },
        {
          id: 'mode_harvest',
          label: 'Harvest',
          emoji: '🪓',
          title: 'Switch to harvest mode',
        },
      ];
    }
    // Harvest: tools + combat switch
    const tools: QRadialItem[] = HARVEST_RADIAL_TOOLS.map((t) => ({
      id: `tool_${t.id}` as QRadialItemId,
      label: t.label,
      emoji: t.emoji,
      title: t.title,
      active: this.harvestTool === t.id,
    }));
    tools.push({
      id: 'mode_combat',
      label: 'Combat',
      emoji: '⚔',
      title: 'Switch to combat mode',
    });
    return tools;
  }

  async setMode(mode: PlayHudMode): Promise<void> {
    if (this.mode === mode) {
      this.closeRadials();
      return;
    }
    this.mode = mode;
    this.closeRadials();
    if (mode === 'combat') {
      await this.bridge?.enterCombatMode();
      await this.pushWeaponsToEngine();
    } else {
      await this.bridge?.enterHarvestMode();
      // enterHarvestMode sets tool via engine; sync local
      this.harvestTool = this.lastHarvestTool || DEFAULT_HARVEST_RADIAL_TOOL;
    }
    this.emit();
  }

  async setHarvestTool(tool: HarvestRadialToolId): Promise<void> {
    this.harvestTool = tool;
    if (tool !== 'toolkit') this.lastHarvestTool = tool;
    await this.bridge?.setHarvestRadialTool(tool);
    this.toolRadialOpen = false;
    this.qRadialOpen = false;
    this.emit();
  }

  setToolRadialOpen(open: boolean): void {
    if (open && this.mode !== 'harvest') return;
    this.toolRadialOpen = open;
    if (open) this.qRadialOpen = false;
    this.emit();
  }

  /** Close hold-Q radial and R tool radial. */
  closeAllRadials(): void {
    this.qRadialOpen = false;
    this.toolRadialOpen = false;
    this.emit();
  }

  toggleToolRadial(): void {
    this.setToolRadialOpen(!this.toolRadialOpen);
  }

  async selectQRadialItem(id: QRadialItemId): Promise<void> {
    if (id === 'mode_combat') {
      await this.setMode('combat');
      return;
    }
    if (id === 'mode_harvest') {
      await this.setMode('harvest');
      return;
    }
    if (id === 'weapon_primary') {
      await this.setCombatWeaponSet('primary');
      this.qRadialOpen = false;
      this.emit();
      return;
    }
    if (id === 'weapon_secondary') {
      await this.setCombatWeaponSet('secondary');
      this.qRadialOpen = false;
      this.emit();
      return;
    }
    if (id.startsWith('tool_')) {
      const tool = id.slice(5) as HarvestRadialToolId;
      await this.setHarvestTool(tool);
    }
  }

  /** Tap-Q: combat weapon swap or harvest hammer↔tool. */
  async quickSwap(): Promise<{ ok: boolean; reason?: string; detail?: string }> {
    if (this.mode === 'combat') {
      return this.swapCombatWeapons();
    }
    return this.swapHarvestHammerTool();
  }

  async swapCombatWeapons(): Promise<{ ok: boolean; reason?: string; detail?: string }> {
    if (!this.secondaryWeaponId && !this.primaryWeaponId) {
      return { ok: false, reason: 'empty', detail: 'No weapons in non-drop slots' };
    }
    if (!this.secondaryWeaponId) {
      return {
        ok: false,
        reason: 'no_secondary',
        detail: 'Assign a 2nd weapon to the non-drop SecondaryWeapon slot',
      };
    }
    // Flip which set is active
    const next: CombatWeaponSet =
      this.combatWeaponSet === 'primary' ? 'secondary' : 'primary';
    await this.setCombatWeaponSet(next);
    return {
      ok: true,
      detail: next === 'primary'
        ? `MainHand ← ${this.primaryWeaponId ?? '—'}`
        : `MainHand ← ${this.secondaryWeaponId ?? '—'}`,
    };
  }

  async setCombatWeaponSet(set: CombatWeaponSet): Promise<void> {
    this.combatWeaponSet = set;
    await this.pushWeaponsToEngine();
    this.emit();
  }

  async swapHarvestHammerTool(): Promise<{ ok: boolean; reason?: string; detail?: string }> {
    if (this.harvestTool === 'toolkit') {
      const tool = this.lastHarvestTool || DEFAULT_HARVEST_RADIAL_TOOL;
      await this.setHarvestTool(tool);
      return { ok: true, detail: `Tool ← ${tool}` };
    }
    await this.setHarvestTool('toolkit');
    return { ok: true, detail: 'Build hammer' };
  }

  /** Sync from engine (after external enterHarvestMode etc.). */
  syncFromEngine(opts: {
    mode?: PlayHudMode;
    harvestTool?: HarvestRadialToolId;
    lastHarvestTool?: HarvestRadialToolId;
  }): void {
    if (opts.mode) this.mode = opts.mode;
    if (opts.harvestTool) this.harvestTool = opts.harvestTool;
    if (opts.lastHarvestTool) this.lastHarvestTool = opts.lastHarvestTool;
    this.emit();
  }

  // ── Input ────────────────────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const key = e.key.toLowerCase();

    if (key === 'q') {
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      this.qHolding = true;
      this.qDownAt = performance.now();
      this.qTapConsumed = false;
      this.clearHoldTimer();
      this.qHoldTimer = setTimeout(() => {
        // Hold → open radial
        this.qRadialOpen = true;
        this.toolRadialOpen = false;
        this.qTapConsumed = true; // release will not quick-swap
        this.emit();
      }, Q_HOLD_MS);
      return;
    }

    if (key === 'r' && this.mode === 'harvest') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleToolRadial();
      return;
    }

    if (key === 'escape') {
      if (this.qRadialOpen || this.toolRadialOpen) {
        e.preventDefault();
        this.closeRadials();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() !== 'q') return;
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    this.clearHoldTimer();
    this.qHolding = false;

    const held = performance.now() - this.qDownAt;
    if (this.qRadialOpen) {
      // Close radial on release without selection (selection clicks close themselves)
      // Keep open until click or Esc — better for mouse pick. Only close if no open intent.
      // User can click chips; release alone leaves radial open for pick.
      this.emit();
      return;
    }

    if (!this.qTapConsumed && held < Q_HOLD_MS + 50) {
      void this.quickSwap().then((r) => {
        this.lastSwapDetail = r.ok
          ? (r.detail ?? 'Swapped')
          : (r.detail ?? r.reason ?? 'Swap failed');
        this.emit();
      });
    }
    this.emit();
  };

  private onBlur = (): void => {
    this.clearHoldTimer();
    this.qHolding = false;
  };

  private clearHoldTimer(): void {
    if (this.qHoldTimer) {
      clearTimeout(this.qHoldTimer);
      this.qHoldTimer = null;
    }
  }

  private closeRadials(): void {
    this.qRadialOpen = false;
    this.toolRadialOpen = false;
    this.emit();
  }

  private async pushWeaponsToEngine(): Promise<void> {
    const mainHand =
      this.combatWeaponSet === 'primary'
        ? this.primaryWeaponId
        : this.secondaryWeaponId;
    // Non-drop reserve always keeps both ids
    await this.bridge?.applyCombatWeapons({
      mainHand: mainHand ?? null,
      secondary:
        this.combatWeaponSet === 'primary'
          ? this.secondaryWeaponId
          : this.primaryWeaponId,
      activeSet: this.combatWeaponSet,
    });
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) {
      try {
        l(snap);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Singleton for the active play surface (island-3d / play / home-island). */
let _playMode: PlayModeStateManager | null = null;

export function getPlayModeStateManager(): PlayModeStateManager {
  if (!_playMode) _playMode = new PlayModeStateManager();
  return _playMode;
}

export function resetPlayModeStateManager(): void {
  _playMode?.disconnect();
  _playMode = null;
}
