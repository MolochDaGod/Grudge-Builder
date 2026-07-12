import { characterAPI, partyAPI, WARLORDS_ERA } from "./api";
import type { AccountEraSlots } from "@shared/definitions/gameEras";

export interface ProfessionLevel {
  level: number;
  xp: number;
}

export interface SkillSlot {
  skillId: string | null;
  upgradeLevel: number;
}

export interface SkillLoadout {
  slots: {
    1: SkillSlot;
    2: SkillSlot;
    3: SkillSlot;
    4: SkillSlot;
  };
}

export interface WeaponSkillSelection {
  hotkey1?: string | null; // basic / slot 1
  hotkey2?: string | null;
  hotkey3?: string | null;
  hotkey4?: string | null;
  hotkey5?: string | null;
}

export interface Character {
  id: string;
  name: string;
  /** Human-facing GRDG-HUMWAR-… code (not the Postgres id) */
  grudgeCode?: string | null;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  attributes: Record<string, number>;
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
  professionLevels: Record<string, ProfessionLevel>;
  createdAt: number;
  revivalTime?: number | null;
  energy?: number;
  hp?: number;
  avatarUrl?: string | null;
  unspentAttributePoints?: number;
  skillPoints?: number;
  skillLoadouts?: Record<string, SkillLoadout>;
  weaponSkillLevel?: number | null;
  weaponSkillSelections?: Record<string, WeaponSkillSelection> | null;
  equippedWeaponId?: string | null;
  selectedSkills?: Record<number, string>; // Class skill tree selections by tier level
  /** @deprecated use weaponBar — kept for save compat */
  actionBar?: Record<number, string>;
  /** Keys 1–5: weapon mastery / weapon skills */
  weaponBar?: Record<number, string | null>;
  /** Keys 6–8: consumable item ids from inventory */
  consumableBar?: Record<number, string | null>;
  /** Shift+1–5: class tree abilities */
  classAbilityBar?: Record<number, string | null>;
  model3d?: {
    baseModelId?: string;
    equippedMeshes?: Record<string, string>;
    weaponSlots?: Record<string, string>;
    skinColor?: string;
    armorColor?: string;
    scale?: number;
    gameEra?: string;
  };
  gameEra?: string;
}

let cachedEraSlots: AccountEraSlots | null = null;

export interface InventoryItem {
  itemId: string;
  quantity: number;
  tier?: number;
}

export type EquipmentSlots = Record<string, string | null>;

const ACTIVE_CHAR_KEY_PREFIX = "gruda_active_character";

/** Canonical account id (grudge_id) — never invent a parallel key space */
function getAccountId(): string {
  return (
    localStorage.getItem("grudge_account_id") ||
    localStorage.getItem("grudge_id") ||
    localStorage.getItem("grudge_user_id") ||
    "guest"
  );
}

/** Get the active character storage key scoped to the current account */
function getActiveCharKey(): string {
  return `${ACTIVE_CHAR_KEY_PREFIX}_${getAccountId()}`;
}

const GLOBAL_ACTIVE_KEYS = [
  "grudge_active_character",
  "grudge.activeCharId",
] as const;

export const CharacterManager = {
  /** Set the current account ID for scoped character selection */
  setAccountId: (accountId: string) => {
    const id = String(accountId || "").trim();
    if (!id) return;
    localStorage.setItem("grudge_account_id", id);
    localStorage.setItem("grudge_id", id);
  },

  getAccountId,

  getEraSlots: (): AccountEraSlots | null => cachedEraSlots,

  /**
   * Warlords-era roster only (Railway SSOT).
   * Clears stale active UUIDs that are not on this account's warlords list.
   */
  getAll: async (era = WARLORDS_ERA): Promise<Character[]> => {
    try {
      const envelope = await characterAPI.getEnvelope(era);
      cachedEraSlots = envelope.eraSlots;
      const list = Array.isArray(envelope.characters) ? envelope.characters : [];
      const serverActive = envelope.eraSlots?.[era]?.activeCharacterId;
      const localActive = CharacterManager.getActiveId();
      const owned = (id: string | null | undefined) =>
        !!id && list.some((c) => String(c.id) === String(id));

      if (serverActive && owned(serverActive)) {
        CharacterManager.setActiveLocal(serverActive);
      } else if (localActive && !owned(localActive)) {
        console.warn(
          "[CharacterManager] active character not on warlords roster — clearing",
          localActive,
        );
        CharacterManager.clearActiveLocal();
      }
      return list;
    } catch (e) {
      console.error("Failed to load characters from API", e);
      return [];
    }
  },

  addCharacter: async (character: Omit<Character, "id" | "createdAt" | "userId">, onAvatarReady?: (char: Character) => void): Promise<Character> => {
    try {
      // New characters start with 7 unspent attribute points per level
      const unspentPoints = character.unspentAttributePoints ?? (character.level * 7);
      
      const newChar = await characterAPI.create({
        ...character,
        gameEra: character.gameEra ?? WARLORDS_ERA,
        xp: 0,
        energy: 50,
        hp: 100,
        professionLevels: character.professionLevels || {},
        revivalTime: null,
        avatarUrl: null,
        unspentAttributePoints: unspentPoints,
        skillPoints: character.skillPoints ?? 1,
        skillLoadouts: character.skillLoadouts ?? {},
        weaponSkillLevel: character.weaponSkillLevel ?? 1,
        weaponSkillSelections: character.weaponSkillSelections ?? {},
        equippedWeaponId: character.equippedWeaponId ?? null,
        selectedSkills: character.selectedSkills ?? {},
        personality: null,
        chatTemperature: null,
        chatHistory: null,
      } as any);
      CharacterManager.setActive(newChar.id);
      
      // Generate AI avatar asynchronously
      characterAPI.regenerateAvatar(newChar.id).then(updatedChar => {
        console.log("Avatar generated for character:", updatedChar.name);
        // Notify caller that avatar is ready
        if (onAvatarReady) {
          onAvatarReady(updatedChar);
        }
      }).catch(err => {
        console.error("Failed to generate avatar:", err);
      });
      
      return newChar;
    } catch (e) {
      console.error("Failed to create character", e);
      throw e;
    }
  },

  deleteCharacter: async (id: string): Promise<void> => {
    try {
      await characterAPI.delete(id);
      
      // Remove from party if present
      const party = await CharacterManager.getParty();
      if (party.includes(id)) {
        await CharacterManager.setParty(party.filter(pid => pid !== id));
      }

      // If active character was deleted, clear or set to another
      const activeId = CharacterManager.getActiveId();
      if (activeId === id) {
        const characters = await CharacterManager.getAll();
        if (characters.length > 0) {
          CharacterManager.setActive(characters[0].id);
        } else {
        localStorage.removeItem(getActiveCharKey());
        }
      }
    } catch (e) {
      console.error("Failed to delete character", e);
      throw e;
    }
  },

  getActiveId: (): string | null => {
    const scoped = localStorage.getItem(getActiveCharKey());
    if (scoped) return scoped;
    for (const k of GLOBAL_ACTIVE_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return null;
  },

  /** Local-only active UUID write (all canonical keys). */
  setActiveLocal: (id: string) => {
    const uuid = String(id || "").trim();
    if (!uuid) return;
    localStorage.setItem(getActiveCharKey(), uuid);
    for (const k of GLOBAL_ACTIVE_KEYS) localStorage.setItem(k, uuid);
  },

  clearActiveLocal: () => {
    localStorage.removeItem(getActiveCharKey());
    for (const k of GLOBAL_ACTIVE_KEYS) localStorage.removeItem(k);
  },

  /**
   * Set active Warlords character UUID (must be owned — validated on next getAll).
   * Persists to Railway era slots via activate.
   */
  setActive: (id: string, era = WARLORDS_ERA) => {
    const uuid = String(id || "").trim();
    if (!uuid) {
      console.error("[CharacterManager] setActive rejected — empty id");
      return;
    }
    CharacterManager.setActiveLocal(uuid);
    characterAPI.activate(uuid, era).then((result) => {
      if (result?.eraSlots) cachedEraSlots = result.eraSlots;
    }).catch(() => {});
  },

  getActiveCharacter: async (): Promise<Character | null> => {
    try {
      const characters = await CharacterManager.getAll(WARLORDS_ERA);
      const id = CharacterManager.getActiveId();
      if (!id) return null;
      const found = characters.find((c) => String(c.id) === String(id));
      if (!found) {
        CharacterManager.clearActiveLocal();
        return null;
      }
      return found;
    } catch (e) {
      console.error("Failed to get active character", e);
      return null;
    }
  },

  updateCharacter: async (updatedChar: Character): Promise<Character> => {
    try {
      return await characterAPI.update(updatedChar.id, {
        name: updatedChar.name,
        level: updatedChar.level,
        xp: updatedChar.xp,
        hp: updatedChar.hp,
        energy: updatedChar.energy,
        attributes: updatedChar.attributes,
        equipment: updatedChar.equipment,
        inventory: updatedChar.inventory,
        professionLevels: updatedChar.professionLevels ?? {},
        revivalTime: updatedChar.revivalTime,
        avatarUrl: updatedChar.avatarUrl ?? null,
        unspentAttributePoints: updatedChar.unspentAttributePoints ?? 0,
        skillPoints: updatedChar.skillPoints ?? 1,
        skillLoadouts: updatedChar.skillLoadouts ?? {},
        weaponSkillLevel: updatedChar.weaponSkillLevel ?? 1,
        weaponSkillSelections: updatedChar.weaponSkillSelections ?? {},
        equippedWeaponId: updatedChar.equippedWeaponId ?? null,
        selectedSkills: updatedChar.selectedSkills ?? {},
      });
    } catch (e) {
      console.error("Failed to update character", e);
      throw e;
    }
  },

  regenerateAvatar: async (id: string): Promise<Character> => {
    try {
      return await characterAPI.regenerateAvatar(id);
    } catch (e) {
      console.error("Failed to regenerate avatar", e);
      throw e;
    }
  },

  // Party Management
  getParty: async (): Promise<string[]> => {
    try {
      const party = await partyAPI.get();
      return party.characterIds;
    } catch {
      return [];
    }
  },

  setParty: async (ids: string[]): Promise<void> => {
    try {
      // Max 3
      const limited = ids.slice(0, 3);
      await partyAPI.update(limited);
    } catch (e) {
      console.error("Failed to update party", e);
    }
  },

  addToParty: async (id: string): Promise<void> => {
    const party = await CharacterManager.getParty();
    if (!party.includes(id) && party.length < 3) {
      await CharacterManager.setParty([...party, id]);
    }
  },

  removeFromParty: async (id: string): Promise<void> => {
    const party = await CharacterManager.getParty();
    await CharacterManager.setParty(party.filter(pid => pid !== id));
  }
};
