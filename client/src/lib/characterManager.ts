import { characterAPI, partyAPI } from "./api";

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
  actionBar?: Record<number, string>; // Slots 1-5 assigned skill ids (uMMORPG style hotbar)
  model3d?: {
    baseModelId?: string;
    equippedMeshes?: Record<string, string>;
    weaponSlots?: Record<string, string>;
    skinColor?: string;
    armorColor?: string;
    scale?: number;
  };
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  tier?: number;
}

export type EquipmentSlots = Record<string, string | null>;

const ACTIVE_CHAR_KEY_PREFIX = "gruda_active_character";

/** Get the active character storage key scoped to the current account */
function getActiveCharKey(): string {
  // Try to get Grudge account ID from localStorage or auth headers
  const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
  return `${ACTIVE_CHAR_KEY_PREFIX}_${grudgeId}`;
}

export const CharacterManager = {
  /** Set the current account ID for scoped character selection */
  setAccountId: (accountId: string) => {
    localStorage.setItem('grudge_account_id', accountId);
  },

  getAll: async (): Promise<Character[]> => {
    try {
      return await characterAPI.getAll();
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
    return localStorage.getItem(getActiveCharKey());
  },

  setActive: (id: string) => {
    localStorage.setItem(getActiveCharKey(), id);
  },

  getActiveCharacter: async (): Promise<Character | null> => {
    const id = CharacterManager.getActiveId();
    if (!id) return null;
    try {
      const characters = await CharacterManager.getAll();
      return characters.find(c => c.id === id) || null;
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
