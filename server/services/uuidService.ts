/**
 * UUID Service — single entry-point for all Grudge UUID lifecycle operations.
 *
 * Every gameplay event that creates, moves, consumes, or destroys an item
 * MUST go through this service so the ledger + validation cache stay in sync.
 */

import {
  generateGrudgeUUID,
  parseGrudgeUUID,
  getSlotCode,
  tierToCode,
  type TierCode,
} from "@shared/grudgeUUID";
import type { IStorage } from "../storage";
import type { UUIDEventType, InsertUuidLedger } from "@shared/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateItemUUIDOptions {
  slot: string;
  tier: number | null;
  itemId: number;
  itemName: string;
  accountId: string;
  characterId?: string;
  sourceType: "drop" | "harvest" | "craft" | "reward" | "trade" | "admin" | "quest" | "mission" | "dungeon" | "daily";
  sourceRef?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateItemUUIDResult {
  grudgeUuid: string;
  slot: string;
  tier: TierCode;
  itemName: string;
}

export interface ConsumeUUIDOptions {
  grudgeUuid: string;
  accountId: string;
  characterId?: string;
  recipeId?: string;
  sourceRef?: string;
}

export interface UpgradeUUIDOptions {
  oldUuid: string;
  newSlot: string;
  newTier: number;
  newItemId: number;
  newItemName: string;
  accountId: string;
  characterId?: string;
}

export interface UpgradeUUIDResult {
  oldUuid: string;
  newUuid: string;
  newTier: TierCode;
}

export interface TransferUUIDOptions {
  grudgeUuid: string;
  fromAccountId: string;
  toAccountId: string;
  sourceRef?: string;
}

export interface BatchDropItem {
  itemId: string;      // e.g. "ORE_IRON_T1"
  name: string;
  quantity: number;
  tier: number | null;
  slot?: string;       // inferred from itemId if omitted
  rarity?: string;
}

export interface ResolvedDropItem extends BatchDropItem {
  grudgeUuid: string;
}

// ---------------------------------------------------------------------------
// Slot inference from item ID prefixes
// ---------------------------------------------------------------------------

const ITEM_PREFIX_TO_SLOT: Record<string, string> = {
  ORE_:     "Ore",
  WOOD_:    "Wood",
  HERB_:    "Herb",
  POT_:     "Potion",
  FOOD_:    "Food",
  LOOM_:    "Fiber",
  LEATHER_: "Leather",
  HIDE_:    "Hide",
  FUR_:     "Hide",
  GEM_:     "Gem",
  STONE_:   "Stone",
  OIL_:     "Item",
  BONE:     "Material",
  FAT_:     "Material",
  PEARL:    "Gem",
  FOSSIL:   "Material",
  RESIN_:   "Material",
  DYE_:     "Material",
  TAR:      "Material",
  SINEW:    "Material",
  ANTLER:   "Material",
  TUSK_:    "Material",
  FANG_:    "Material",
  WOOL_:    "Fiber",
  MUTTON_:  "Food",
  MEAT_:    "Food",
  PORK_:    "Food",
  VENISON_: "Food",
  POTION_:  "Potion",
  // Equipment prefixes
  GRUDA_WPN_:  "Weapon",
  GRUDA_ARM_:  "Chest",       // generic armor, refined at parse time
  GRUDA_ACC_:  "Relic",
};

function inferSlotFromItemId(itemId: string): string {
  // Check equipment sub-prefixes first (GRUDA_ARM_HEAD → Head, etc.)
  if (itemId.startsWith("GRUDA_ARM_")) {
    const sub = itemId.replace("GRUDA_ARM_", "").split("_")[0];
    const subMap: Record<string, string> = {
      HEAD: "Head", CHEST: "Chest", HANDS: "Hands", LEGS: "Legs",
      FEET: "Feet", SHOULDER: "Shoulder",
    };
    return subMap[sub] || "Chest";
  }
  if (itemId.startsWith("GRUDA_WPN_")) {
    const sub = itemId.replace("GRUDA_WPN_", "").split("_")[0];
    const subMap: Record<string, string> = {
      SWORD: "Sword", AXE: "Axe", MACE: "Mace", DAGGER: "Dagger",
      STAFF: "Staff", BOW: "Bow", HAMMER: "Hammer", SPEAR: "Spear",
      XBOW: "Crossbow", GUN: "Weapon",
    };
    return subMap[sub] || "Weapon";
  }
  if (itemId.startsWith("GRUDA_ACC_")) {
    const sub = itemId.replace("GRUDA_ACC_", "").split("_")[0];
    const subMap: Record<string, string> = {
      RING: "Ring", NECK: "Necklace", WAIST: "Relic",
    };
    return subMap[sub] || "Relic";
  }

  for (const [prefix, slot] of Object.entries(ITEM_PREFIX_TO_SLOT)) {
    if (itemId.startsWith(prefix)) return slot;
  }
  return "Item";
}

function inferTierFromItemId(itemId: string): number | null {
  const match = itemId.match(/_T(\d)$/i);
  return match ? parseInt(match[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UUIDService {
  private itemCounter = 1;

  constructor(private storage: IStorage) {}

  /** Reset internal counter (useful for batch operations). */
  resetCounter(start = 1) {
    this.itemCounter = start;
  }

  // ── Create ──────────────────────────────────────────────────────────

  /**
   * Generate a new Grudge UUID for an item and log CREATED + ASSIGNED events.
   */
  async createItemUUID(opts: CreateItemUUIDOptions): Promise<CreateItemUUIDResult> {
    const grudgeUuid = generateGrudgeUUID(opts.slot, opts.tier, opts.itemId);
    const tierCode = tierToCode(opts.tier);

    // Log CREATED event
    await this.storage.logUuidEvent({
      grudgeUuid,
      eventType: "CREATED",
      accountId: opts.accountId,
      characterId: opts.characterId ?? null,
      itemId: String(opts.itemId),
      itemName: opts.itemName,
      itemTier: tierCode,
      itemSlot: getSlotCode(opts.slot),
      sourceType: opts.sourceType,
      sourceRef: opts.sourceRef ?? null,
      metadata: opts.metadata ?? null,
    });

    // Log ASSIGNED event
    await this.storage.logUuidEvent({
      grudgeUuid,
      eventType: "ASSIGNED",
      accountId: opts.accountId,
      characterId: opts.characterId ?? null,
      itemId: String(opts.itemId),
      itemName: opts.itemName,
      itemTier: tierCode,
      itemSlot: getSlotCode(opts.slot),
      sourceType: opts.sourceType,
      sourceRef: opts.sourceRef ?? null,
    });

    return { grudgeUuid, slot: opts.slot, tier: tierCode, itemName: opts.itemName };
  }

  // ── Batch resolve drops ─────────────────────────────────────────────

  /**
   * Take a list of rolled loot drops and stamp each with a Grudge UUID.
   * Logs CREATED + ASSIGNED ledger events for every item.
   */
  async resolveDrops(
    drops: BatchDropItem[],
    accountId: string,
    sourceType: CreateItemUUIDOptions["sourceType"],
    sourceRef?: string,
    characterId?: string,
  ): Promise<ResolvedDropItem[]> {
    const resolved: ResolvedDropItem[] = [];

    for (const drop of drops) {
      const slot = drop.slot || inferSlotFromItemId(drop.itemId);
      const tier = drop.tier ?? inferTierFromItemId(drop.itemId);

      // For stackable resources, generate one UUID per stack (not per unit)
      const result = await this.createItemUUID({
        slot,
        tier,
        itemId: this.itemCounter++,
        itemName: drop.name,
        accountId,
        characterId,
        sourceType,
        sourceRef,
        metadata: {
          originalItemId: drop.itemId,
          quantity: drop.quantity,
          rarity: drop.rarity,
        },
      });

      resolved.push({
        ...drop,
        grudgeUuid: result.grudgeUuid,
      });
    }

    return resolved;
  }

  // ── Consume (crafting input) ────────────────────────────────────────

  /**
   * Mark a UUID as CONSUMED (used as crafting material or consumed).
   * Validates ownership first.
   */
  async consumeUUID(opts: ConsumeUUIDOptions): Promise<void> {
    // Validate ownership
    const cache = await this.storage.validateUuid(opts.grudgeUuid);
    if (!cache) {
      throw new Error(`UUID not found: ${opts.grudgeUuid}`);
    }
    if (cache.currentState !== "ACTIVE") {
      throw new Error(`UUID ${opts.grudgeUuid} is ${cache.currentState}, cannot consume`);
    }
    if (cache.currentAccountId !== opts.accountId) {
      throw new Error(`UUID ${opts.grudgeUuid} not owned by account ${opts.accountId}`);
    }

    await this.storage.logUuidEvent({
      grudgeUuid: opts.grudgeUuid,
      eventType: "CONSUMED",
      accountId: opts.accountId,
      characterId: opts.characterId ?? null,
      sourceType: "craft",
      sourceRef: opts.sourceRef ?? null,
      metadata: opts.recipeId ? { recipeId: opts.recipeId } : null,
    });
  }

  // ── Upgrade ─────────────────────────────────────────────────────────

  /**
   * Archive the old UUID and create a new one for the upgraded item.
   */
  async upgradeUUID(opts: UpgradeUUIDOptions): Promise<UpgradeUUIDResult> {
    // Validate ownership of old UUID
    const cache = await this.storage.validateUuid(opts.oldUuid);
    if (!cache) throw new Error(`UUID not found: ${opts.oldUuid}`);
    if (cache.currentState !== "ACTIVE") {
      throw new Error(`UUID ${opts.oldUuid} is ${cache.currentState}, cannot upgrade`);
    }
    if (cache.currentAccountId !== opts.accountId) {
      throw new Error(`UUID ${opts.oldUuid} not owned by account ${opts.accountId}`);
    }

    // Create new UUID
    const newResult = await this.createItemUUID({
      slot: opts.newSlot,
      tier: opts.newTier,
      itemId: opts.newItemId,
      itemName: opts.newItemName,
      accountId: opts.accountId,
      characterId: opts.characterId,
      sourceType: "craft",
      sourceRef: `upgrade_from_${opts.oldUuid}`,
      metadata: { previousTier: cache.itemTier, previousUuid: opts.oldUuid },
    });

    // Archive old UUID with reference to new
    await this.storage.logUuidEvent({
      grudgeUuid: opts.oldUuid,
      eventType: "ARCHIVED",
      accountId: opts.accountId,
      characterId: opts.characterId ?? null,
      outputUuid: newResult.grudgeUuid,
      sourceType: "craft",
      sourceRef: `upgrade_to_${newResult.grudgeUuid}`,
      metadata: { previousTier: cache.itemTier },
    });

    return {
      oldUuid: opts.oldUuid,
      newUuid: newResult.grudgeUuid,
      newTier: newResult.tier,
    };
  }

  // ── Transfer ────────────────────────────────────────────────────────

  /**
   * Transfer a UUID from one account to another.
   */
  async transferUUID(opts: TransferUUIDOptions): Promise<void> {
    const cache = await this.storage.validateUuid(opts.grudgeUuid);
    if (!cache) throw new Error(`UUID not found: ${opts.grudgeUuid}`);
    if (cache.currentState !== "ACTIVE") {
      throw new Error(`UUID ${opts.grudgeUuid} is ${cache.currentState}, cannot transfer`);
    }
    if (cache.currentAccountId !== opts.fromAccountId) {
      throw new Error(`UUID ${opts.grudgeUuid} not owned by account ${opts.fromAccountId}`);
    }

    await this.storage.logUuidEvent({
      grudgeUuid: opts.grudgeUuid,
      eventType: "TRANSFERRED",
      accountId: opts.toAccountId,
      sourceType: "trade",
      sourceRef: opts.sourceRef ?? null,
      metadata: { previousOwnerAccountId: opts.fromAccountId },
    });
  }

  // ── Equip / Unequip ────────────────────────────────────────────────

  async equipUUID(grudgeUuid: string, accountId: string, characterId: string): Promise<void> {
    const cache = await this.storage.validateUuid(grudgeUuid);
    if (!cache) throw new Error(`UUID not found: ${grudgeUuid}`);
    if (cache.currentState !== "ACTIVE") {
      throw new Error(`UUID ${grudgeUuid} is ${cache.currentState}, cannot equip`);
    }
    if (cache.currentAccountId !== accountId) {
      throw new Error(`UUID ${grudgeUuid} not owned by account ${accountId}`);
    }

    await this.storage.logUuidEvent({
      grudgeUuid,
      eventType: "EQUIPPED",
      accountId,
      characterId,
    });
  }

  async unequipUUID(grudgeUuid: string, accountId: string, characterId: string): Promise<void> {
    await this.storage.logUuidEvent({
      grudgeUuid,
      eventType: "UNEQUIPPED",
      accountId,
      characterId,
    });
  }

  // ── Destroy ─────────────────────────────────────────────────────────

  async destroyUUID(grudgeUuid: string, accountId: string, reason?: string): Promise<void> {
    const cache = await this.storage.validateUuid(grudgeUuid);
    if (!cache) throw new Error(`UUID not found: ${grudgeUuid}`);
    if (cache.currentState !== "ACTIVE") {
      throw new Error(`UUID ${grudgeUuid} is ${cache.currentState}, cannot destroy`);
    }
    if (cache.currentAccountId !== accountId) {
      throw new Error(`UUID ${grudgeUuid} not owned by account ${accountId}`);
    }

    await this.storage.logUuidEvent({
      grudgeUuid,
      eventType: "DESTROYED",
      accountId,
      metadata: reason ? { description: reason } : null,
    });
  }

  // ── Validate ────────────────────────────────────────────────────────

  /**
   * Quick validation: is this UUID active and owned by this account?
   */
  async validateOwnership(grudgeUuid: string, accountId: string): Promise<boolean> {
    const cache = await this.storage.validateUuid(grudgeUuid);
    if (!cache) return false;
    return cache.currentState === "ACTIVE" && cache.currentAccountId === accountId;
  }

  /**
   * Batch validate multiple UUIDs for a single account.
   * Returns list of invalid UUIDs (empty = all valid).
   */
  async batchValidate(uuids: string[], accountId: string): Promise<string[]> {
    const invalid: string[] = [];
    for (const uuid of uuids) {
      if (!(await this.validateOwnership(uuid, accountId))) {
        invalid.push(uuid);
      }
    }
    return invalid;
  }

  // ── Crafting flow (full pipeline) ──────────────────────────────────

  /**
   * Execute a full crafting operation:
   * 1. Validate all input UUIDs
   * 2. Consume all inputs
   * 3. Generate output UUID
   * 4. Return crafted item
   */
  async craft(params: {
    inputUuids: string[];
    outputSlot: string;
    outputTier: number;
    outputItemId: number;
    outputItemName: string;
    accountId: string;
    characterId?: string;
    recipeId: string;
  }): Promise<CreateItemUUIDResult> {
    // 1. Validate all inputs
    const invalid = await this.batchValidate(params.inputUuids, params.accountId);
    if (invalid.length > 0) {
      throw new Error(`Invalid input UUIDs: ${invalid.join(", ")}`);
    }

    // 2. Consume all inputs
    for (const uuid of params.inputUuids) {
      await this.consumeUUID({
        grudgeUuid: uuid,
        accountId: params.accountId,
        characterId: params.characterId,
        recipeId: params.recipeId,
        sourceRef: `recipe_${params.recipeId}`,
      });
    }

    // 3. Generate output
    const result = await this.createItemUUID({
      slot: params.outputSlot,
      tier: params.outputTier,
      itemId: params.outputItemId,
      itemName: params.outputItemName,
      accountId: params.accountId,
      characterId: params.characterId,
      sourceType: "craft",
      sourceRef: `recipe_${params.recipeId}`,
      metadata: {
        inputUuids: params.inputUuids,
        recipeId: params.recipeId,
      },
    });

    return result;
  }
}
