/**
 * BuildHammerRepair — toolkit / build hammer repair for sectional damage.
 *
 * Flow (user SSOT):
 *   1. Equip build hammer (R-radial toolkit) or build control mode.
 *   2. **RMB** raycast → select a damaged (hidden) section.
 *   3. **LMB** with selection → spend **1 wood** and restore the chunk.
 *
 * Wood sources (in order):
 *   - Player inventory (`wood` / `t0_wood` / `driftwood`)
 *   - Boat storage bag (optional getter)
 *
 * Does not place build props — only repairs SectionalDamageSystem sections.
 */

import * as THREE from "three";
import type {
  DamageSection,
  SectionalDamageSystem,
} from "./SectionalDamageSystem";

/** Canonical wood item ids accepted for repair. */
export const REPAIR_WOOD_IDS = ["wood", "t0_wood", "driftwood", "plank"] as const;

export const REPAIR_RULES = {
  /** Default wood cost per section restore */
  woodCost: 1,
  /** Max repair reach from player (m) */
  maxRangeM: 4.5,
  /** RMB selects, LMB applies */
  selectButton: "rmb" as const,
  applyButton: "lmb" as const,
  tool: "toolkit" as const,
} as const;

export interface WoodInventoryHost {
  /** Merged bag counts (player + farm overlay). */
  getCounts: () => Record<string, number>;
  /** Spend qty of itemId; return true if spent. */
  trySpend: (itemId: string, qty: number) => boolean;
  /** Optional boat / ship cargo hold. */
  getBoatCounts?: () => Record<string, number> | null;
  trySpendBoat?: (itemId: string, qty: number) => boolean;
}

export interface BuildHammerRepairOpts {
  damage: SectionalDamageSystem;
  inventory: WoodInventoryHost;
  /** Player world position for range checks */
  getPlayerPosition?: () => THREE.Vector3 | null;
  onPrompt?: (msg: string | null) => void;
  onRepaired?: (section: DamageSection, woodSpent: number, source: "player" | "boat") => void;
  woodCost?: number;
  maxRangeM?: number;
}

export type RepairSelectResult =
  | { ok: true; section: DamageSection; alreadyIntact: boolean }
  | { ok: false; reason: "no_hit" | "out_of_range" | "no_tool" };

export type RepairApplyResult =
  | {
      ok: true;
      section: DamageSection;
      woodSpent: number;
      source: "player" | "boat";
    }
  | {
      ok: false;
      reason:
        | "no_selection"
        | "already_intact"
        | "no_wood"
        | "out_of_range"
        | "repair_failed";
    };

function countWood(bag: Record<string, number>): { id: string; count: number } | null {
  for (const id of REPAIR_WOOD_IDS) {
    const n = bag[id] ?? 0;
    if (n > 0) return { id, count: n };
  }
  return null;
}

export class BuildHammerRepair {
  private damage: SectionalDamageSystem;
  private inventory: WoodInventoryHost;
  private getPlayerPosition: (() => THREE.Vector3 | null) | undefined;
  private onPrompt: ((msg: string | null) => void) | undefined;
  private onRepaired:
    | ((section: DamageSection, woodSpent: number, source: "player" | "boat") => void)
    | undefined;
  private woodCost: number;
  private maxRangeM: number;
  /** When true, RMB/LMB repair path is active (toolkit / build mode). */
  enabled = false;

  constructor(opts: BuildHammerRepairOpts) {
    this.damage = opts.damage;
    this.inventory = opts.inventory;
    this.getPlayerPosition = opts.getPlayerPosition;
    this.onPrompt = opts.onPrompt;
    this.onRepaired = opts.onRepaired;
    this.woodCost = opts.woodCost ?? REPAIR_RULES.woodCost;
    this.maxRangeM = opts.maxRangeM ?? REPAIR_RULES.maxRangeM;
  }

  get selected(): DamageSection | null {
    const id = this.damage.selectedSectionId;
    return id ? this.damage.getSection(id) ?? null : null;
  }

  /**
   * RMB: raycast and select section for repair.
   * Prefers damaged/hidden sections under the cursor.
   */
  selectWithRaycaster(raycaster: THREE.Raycaster): RepairSelectResult {
    if (!this.enabled) {
      return { ok: false, reason: "no_tool" };
    }

    const section = this.damage.raycastSection(raycaster);
    if (!section) {
      this.damage.clearSelection();
      this.onPrompt?.(null);
      return { ok: false, reason: "no_hit" };
    }

    if (!this.inRange(section)) {
      this.onPrompt?.("Too far to repair — step closer.");
      return { ok: false, reason: "out_of_range" };
    }

    this.damage.selectSection(section.id);
    const alreadyIntact = section.state === "intact" && section.hp >= section.maxHp;

    if (alreadyIntact) {
      this.onPrompt?.(
        `${section.label}: intact (${Math.round(section.hp)}/${section.maxHp}). Target damaged chunks.`,
      );
    } else {
      const wood = this.peekWood();
      const have = wood?.count ?? 0;
      this.onPrompt?.(
        `Repair target: ${section.label} (${Math.round(section.hp)}/${section.maxHp}). ` +
          `LMB = fix (−${this.woodCost} wood, have ${have}).`,
      );
    }

    return { ok: true, section, alreadyIntact };
  }

  /**
   * LMB: spend wood and restore selected section visibility/HP.
   */
  applyRepair(): RepairApplyResult {
    if (!this.enabled) {
      return { ok: false, reason: "no_selection" };
    }

    const section = this.selected;
    if (!section) {
      this.onPrompt?.("RMB a damaged part first, then LMB to repair.");
      return { ok: false, reason: "no_selection" };
    }

    if (section.state === "intact" && section.hp >= section.maxHp) {
      this.onPrompt?.(`${section.label} is already intact.`);
      return { ok: false, reason: "already_intact" };
    }

    if (!this.inRange(section)) {
      this.onPrompt?.("Too far to repair — step closer.");
      return { ok: false, reason: "out_of_range" };
    }

    const cost = section.repairCostWood || this.woodCost;
    const spent = this.spendWood(cost);
    if (!spent) {
      this.onPrompt?.(`Need ${cost} wood (inventory or boat hold) to repair.`);
      return { ok: false, reason: "no_wood" };
    }

    const ok = this.damage.repairSection(section.id, true);
    if (!ok) {
      // Refund is intentionally not attempted — repair failed rarely
      this.onPrompt?.("Repair failed.");
      return { ok: false, reason: "repair_failed" };
    }

    this.onRepaired?.(section, cost, spent.source);
    this.onPrompt?.(
      `Repaired ${section.label} (−${cost} wood from ${spent.source}).`,
    );
    // Keep selection so player can chain-repair nearby sections after re-RMB
    this.damage.clearSelection();
    return {
      ok: true,
      section,
      woodSpent: cost,
      source: spent.source,
    };
  }

  /** Total wood available (player + boat). */
  peekWood(): { id: string; count: number; source: "player" | "boat" } | null {
    const player = countWood(this.inventory.getCounts());
    if (player) return { ...player, source: "player" };
    const boatBag = this.inventory.getBoatCounts?.();
    if (boatBag) {
      const boat = countWood(boatBag);
      if (boat) return { ...boat, source: "boat" };
    }
    return null;
  }

  private spendWood(
    qty: number,
  ): { id: string; source: "player" | "boat" } | null {
    // Prefer player inventory
    const bag = this.inventory.getCounts();
    for (const id of REPAIR_WOOD_IDS) {
      if ((bag[id] ?? 0) >= qty) {
        if (this.inventory.trySpend(id, qty)) {
          return { id, source: "player" };
        }
      }
    }
    // Then boat hold
    const boatBag = this.inventory.getBoatCounts?.();
    if (boatBag && this.inventory.trySpendBoat) {
      for (const id of REPAIR_WOOD_IDS) {
        if ((boatBag[id] ?? 0) >= qty) {
          if (this.inventory.trySpendBoat(id, qty)) {
            return { id, source: "boat" };
          }
        }
      }
    }
    return null;
  }

  private inRange(section: DamageSection): boolean {
    const pos = this.getPlayerPosition?.();
    if (!pos) return true;
    section.center.setFromMatrixPosition(section.mesh.matrixWorld);
    // Prefer true center
    const box = new THREE.Box3().setFromObject(section.mesh);
    if (!box.isEmpty()) box.getCenter(section.center);
    return pos.distanceTo(section.center) <= this.maxRangeM;
  }

  clear(): void {
    this.damage.clearSelection();
    this.onPrompt?.(null);
  }
}
