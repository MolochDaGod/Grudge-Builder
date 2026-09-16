/**
 * Crossmint Wallet Service — Canonical, single source of truth.
 *
 * Handles:
 *   - Custodial wallet creation & lookup
 *   - Character cNFT minting (to wallet or email)
 *   - Island cNFT minting (to wallet or email)
 *   - Mint status polling & owner-wallet extraction
 *   - NFT metadata updates (character + island)
 *
 * All other files should import from here (or re-export this module).
 */

import type { Character, Account, HomeIsland } from "@shared/schema";

const CROSSMINT_BASE_URL = process.env.CROSSMINT_USE_STAGING === 'true'
  ? 'https://staging.crossmint.com'
  : 'https://www.crossmint.com';

const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY
  || process.env.CROSSMINT_SECRET_KEY
  || process.env.CROSSMINT_API_KEY;

/**
 * Warlords character collection (grudgedev project) — fleet SSOT.
 * Never fall back to Crossmint "default-solana" in production.
 * @see shared/fleet/manifest.ts CROSSMINT_COLLECTIONS.character
 */
const WARLORDS_CHARACTER_COLLECTION =
  "5061318d-ff65-4893-ac4b-9b28efb18ace";
const WARLORDS_CHARACTER_TEMPLATE =
  "a9bb2c8d-1350-4413-aec7-5ba1f6888511";

const CROSSMINT_COLLECTION_ID =
  process.env.CROSSMINT_COLLECTION_ID || WARLORDS_CHARACTER_COLLECTION;
const CROSSMINT_CHARACTER_TEMPLATE_ID =
  process.env.CROSSMINT_CHARACTER_TEMPLATE_ID || WARLORDS_CHARACTER_TEMPLATE;
/**
 * Home Island is a **template** on the same Solana collection as characters
 * (not a separate Crossmint collection). Verified GET:
 *   /collections/5061318d-…/templates/18d0e641-…
 * Env aliases:
 *   CROSSMINT_ISLAND_CNFT | CROSSMINT_ISLAND_TEMPLATE_ID | VITE_CROSSMINT_ISLAND_COLLECTION (legacy misname)
 */
const WARLORDS_ISLAND_TEMPLATE = "18d0e641-8713-4d5b-9a1d-ba67c516a3ce";
const CROSSMINT_ISLAND_TEMPLATE_ID =
  process.env.CROSSMINT_ISLAND_CNFT ||
  process.env.CROSSMINT_ISLAND_TEMPLATE_ID ||
  process.env.VITE_CROSSMINT_ISLAND_COLLECTION || // legacy: was mislabeled "collection"
  WARLORDS_ISLAND_TEMPLATE;
/** Islands mint into the Warlords collection (characters + islands share one MCC). */
const CROSSMINT_ISLAND_COLLECTION_ID =
  process.env.CROSSMINT_ISLAND_COLLECTION_ID ||
  process.env.CROSSMINT_COLLECTION_ID ||
  WARLORDS_CHARACTER_COLLECTION;
const CROSSMINT_PROJECT_ID =
  process.env.CROSSMINT_PROJECT_ID || "8410e23e-d003-4061-9b65-7c886a6c46ec";

// ── Shared types ──────────────────────────────────────────────────────

interface CrossmintWallet {
  id: string;
  type: string;
  address: string;
  chain: string;
  linkedUser?: string;
}

interface CrossmintMintResponse {
  actionId: string;
  onChain: {
    status: 'pending' | 'success' | 'failed';
    chain: string;
    txId?: string;
    mintHash?: string;
  };
}

interface CrossmintMintStatus {
  actionId: string;
  status: 'pending' | 'success' | 'failed';
  ownerWallet?: string;
  data?: {
    chain: string;
    txId: string;
    collection: { id: string; name: string };
    token: { id: string; mintHash: string };
  };
}

interface CharacterNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
  };
}

interface IslandNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
  };
}

// ── Service ───────────────────────────────────────────────────────────

export class CrossmintWalletService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!CROSSMINT_API_KEY) {
      console.warn('[Crossmint] API key not configured — wallet & NFT features disabled');
      this.apiKey = '';
      this.baseUrl = CROSSMINT_BASE_URL;
      return;
    }
    this.apiKey = CROSSMINT_API_KEY;
    this.baseUrl = CROSSMINT_BASE_URL;
  }

  // ==================== WALLET METHODS ====================

  async createWalletForUser(email: string): Promise<CrossmintWallet | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot create wallet — API key not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1-alpha2/wallets`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'solana-custodial-wallet',
          linkedUser: `email:${email}:solana-custodial-wallet`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Wallet creation failed:', response.status, errorText);
        return null;
      }

      const wallet = await response.json() as CrossmintWallet;
      console.log('[Crossmint] Wallet created:', wallet.address);
      return wallet;
    } catch (error) {
      console.error('[Crossmint] Wallet creation error:', error);
      return null;
    }
  }

  async getWalletByEmail(email: string): Promise<CrossmintWallet | null> {
    if (!this.apiKey) return null;

    try {
      const encodedEmail = encodeURIComponent(`email:${email}:solana-custodial-wallet`);
      const response = await fetch(`${this.baseUrl}/api/v1-alpha2/wallets/${encodedEmail}`, {
        method: 'GET',
        headers: { 'X-API-KEY': this.apiKey },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorText = await response.text();
        console.error('[Crossmint] Get wallet failed:', response.status, errorText);
        return null;
      }

      return await response.json() as CrossmintWallet;
    } catch (error) {
      console.error('[Crossmint] Get wallet error:', error);
      return null;
    }
  }

  async getOrCreateWallet(email: string): Promise<CrossmintWallet | null> {
    const existingWallet = await this.getWalletByEmail(email);
    if (existingWallet) {
      console.log('[Crossmint] Using existing wallet for:', email);
      return existingWallet;
    }
    console.log('[Crossmint] Creating new wallet for:', email);
    return this.createWalletForUser(email);
  }

  /**
   * Stable server-side wallet locator for a Grudge ID.
   * Email form is Crossmint v1-alpha2 custodial convention (phase 1).
   * Always use the same synthetic address so one grudgeId → one Solana wallet.
   */
  stableEmailForGrudgeId(grudgeId: string): string {
    const safe = String(grudgeId || "guest")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 48) || "guest";
    return `grudge+${safe}@accounts.grudge-studio.com`;
  }

  /** Ensure Crossmint Solana custodial wallet for this Grudge ID (preferred over raw email). */
  async getOrCreateWalletForGrudgeId(grudgeId: string): Promise<CrossmintWallet | null> {
    if (!grudgeId) return null;
    return this.getOrCreateWallet(this.stableEmailForGrudgeId(grudgeId));
  }

  // ==================== CHARACTER NFT METHODS ====================

  buildCharacterMetadata(
    character: Character,
    imageUrl: string,
    ownership?: {
      characterId?: string | null;
      accountId?: string | null;
      grudgeId?: string | null;
      grudgeCode?: string | null;
      custody?: string | null;
    },
  ): CharacterNFTMetadata {
    const attrs = (character.attributes || {}) as Record<string, number>;
    const equip = (character.equipment || {}) as Record<string, unknown>;
    const model3d = (character.model3d || {}) as Record<string, unknown>;

    // Case-insensitive attribute lookup (handles Strength, strength, STR, etc.)
    const getAttr = (key: string): number => {
      return attrs[key] || attrs[key.toLowerCase()] || attrs[key.toUpperCase()] || 0;
    };

    const equipSlot = (slot: string): string => {
      const v = equip[slot] ?? equip[slot.toLowerCase()] ?? equip[slot.toUpperCase()];
      if (v == null || v === "") return "none";
      if (typeof v === "string") return v;
      if (typeof v === "object" && v && "itemId" in (v as object)) {
        return String((v as { itemId?: string }).itemId || "none");
      }
      return String(v);
    };

    const equipSlots = [
      "Head",
      "Chest",
      "Hands",
      "Legs",
      "Feet",
      "Shoulder",
      "Back",
      "MainHand",
      "OffHand",
      "Accessory1",
      "Accessory2",
    ] as const;

    const ownershipAttrs: Array<{ trait_type: string; value: string | number }> = [];
    ownershipAttrs.push({ trait_type: "Name", value: character.name });
    ownershipAttrs.push({
      trait_type: "Era",
      value: (character as { gameEra?: string }).gameEra || "warlords",
    });
    if (ownership?.characterId) {
      ownershipAttrs.push({ trait_type: "CharacterId", value: ownership.characterId });
    }
    if (ownership?.accountId) {
      ownershipAttrs.push({ trait_type: "AccountId", value: ownership.accountId });
    }
    if (ownership?.grudgeId) {
      ownershipAttrs.push({ trait_type: "GrudgeId", value: ownership.grudgeId });
    }
    if (ownership?.grudgeCode) {
      ownershipAttrs.push({ trait_type: "GrudgeCode", value: ownership.grudgeCode });
    }
    const prefabId =
      (typeof model3d.prefabId === "string" && model3d.prefabId) ||
      (typeof model3d.startingPrefabId === "string" && model3d.startingPrefabId) ||
      "";
    if (prefabId) {
      ownershipAttrs.push({ trait_type: "PrefabId", value: prefabId });
    }
    for (const slot of equipSlots) {
      ownershipAttrs.push({ trait_type: slot, value: equipSlot(slot) });
    }
    ownershipAttrs.push({
      trait_type: "Custody",
      value: ownership?.custody || "escrow_admin",
    });
    ownershipAttrs.push({ trait_type: "GameOwnership", value: "railway_account" });
    ownershipAttrs.push({
      trait_type: "CrossmintProject",
      value: CROSSMINT_PROJECT_ID.slice(0, 8),
    });

    return {
      name: character.name,
      description: `${character.name} is a Level ${character.level} ${character.raceId} ${character.classId} from Grudge Warlords. Game ownership is bound to Grudge ID / account; chain custody may be server-escrow until claimed.`,
      image: imageUrl,
      attributes: [
        { trait_type: "Race", value: character.raceId },
        { trait_type: "Class", value: character.classId },
        { trait_type: "Level", value: character.level },
        { trait_type: "Strength", value: getAttr("Strength") },
        { trait_type: "Vitality", value: getAttr("Vitality") },
        { trait_type: "Endurance", value: getAttr("Endurance") },
        { trait_type: "Intellect", value: getAttr("Intellect") },
        { trait_type: "Wisdom", value: getAttr("Wisdom") },
        { trait_type: "Dexterity", value: getAttr("Dexterity") },
        { trait_type: "Agility", value: getAttr("Agility") },
        { trait_type: "Tactics", value: getAttr("Tactics") },
        { trait_type: "XP", value: character.xp },
        { trait_type: "HP", value: character.hp },
        ...ownershipAttrs,
      ],
      properties: {
        files: [{ uri: imageUrl, type: "image/png" }],
        category: "image",
      },
    };
  }

  async mintCharacterNFT(
    character: Character,
    imageUrl: string,
    recipientWallet: string,
    compressed: boolean = true,
    ownership?: {
      characterId?: string | null;
      accountId?: string | null;
      grudgeId?: string | null;
      grudgeCode?: string | null;
    },
  ): Promise<CrossmintMintResponse | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint NFT — API key not configured');
      return null;
    }

    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl, ownership);
      const collectionId = CROSSMINT_COLLECTION_ID;

      console.log('[Crossmint] Minting NFT to wallet:', recipientWallet);
      console.log('[Crossmint] Using collection:', collectionId, 'template:', CROSSMINT_CHARACTER_TEMPLATE_ID);

      // Idempotent mint-with-id when character UUID available (avoids duplicate cNFTs)
      const idempotentId = ownership?.characterId
        ? encodeURIComponent(String(ownership.characterId))
        : null;
      const mintUrl = idempotentId
        ? `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${idempotentId}`
        : `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts`;

      const body: Record<string, unknown> = {
        recipient: `solana:${recipientWallet}`,
        metadata: {
          name: metadata.name,
          image: metadata.image,
          description: metadata.description,
          attributes: metadata.attributes,
        },
        compressed,
        reuploadLinkedFiles: false,
      };
      if (CROSSMINT_CHARACTER_TEMPLATE_ID) {
        body.templateId = CROSSMINT_CHARACTER_TEMPLATE_ID;
      }

      const response = await fetch(mintUrl, {
        method: idempotentId ? "PUT" : "POST",
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] NFT mint failed:', response.status, errorText);
        return null;
      }

      const result = await response.json() as CrossmintMintResponse;
      console.log('[Crossmint] NFT mint initiated:', result.actionId);
      return result;
    } catch (error) {
      console.error('[Crossmint] NFT mint error:', error);
      return null;
    }
  }

  async mintToEmail(
    character: Character,
    imageUrl: string,
    email: string,
    compressed: boolean = true,
    ownership?: {
      characterId?: string | null;
      accountId?: string | null;
      grudgeId?: string | null;
      grudgeCode?: string | null;
    },
  ): Promise<CrossmintMintResponse | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint NFT — API key not configured');
      return null;
    }

    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl, ownership);
      const collectionId = CROSSMINT_COLLECTION_ID;

      console.log('[Crossmint] Minting NFT to email:', email);

      const idempotentId = ownership?.characterId
        ? encodeURIComponent(String(ownership.characterId))
        : null;
      const mintUrl = idempotentId
        ? `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${idempotentId}`
        : `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts`;

      const body: Record<string, unknown> = {
        recipient: `email:${email}:solana`,
        metadata: {
          name: metadata.name,
          image: metadata.image,
          description: metadata.description,
          attributes: metadata.attributes,
        },
        compressed,
        reuploadLinkedFiles: false,
      };
      if (CROSSMINT_CHARACTER_TEMPLATE_ID) {
        body.templateId = CROSSMINT_CHARACTER_TEMPLATE_ID;
      }

      const response = await fetch(mintUrl, {
        method: idempotentId ? 'PUT' : 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] NFT mint to email failed:', response.status, errorText);
        return null;
      }

      const result = await response.json() as CrossmintMintResponse;
      console.log('[Crossmint] NFT mint to email initiated:', result.actionId);
      return result;
    } catch (error) {
      console.error('[Crossmint] NFT mint to email error:', error);
      return null;
    }
  }

  async updateNFTMetadata(
    actionIdOrTokenId: string,
    character: Character,
    imageUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Crossmint API key not configured' };
    }

    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      const collectionId = CROSSMINT_COLLECTION_ID;

      console.log('[Crossmint] Updating NFT metadata for:', actionIdOrTokenId);

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${actionIdOrTokenId}`,
        {
          method: 'PATCH',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            reuploadLinkedFiles: false,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] NFT metadata update failed:', response.status, errorText);
        return { success: false, error: `Crossmint API error (${response.status})` };
      }

      console.log('[Crossmint] NFT metadata updated for:', character.name);
      return { success: true };
    } catch (error) {
      console.error('[Crossmint] NFT metadata update error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================== ISLAND NFT METHODS ====================

  buildIslandMetadata(island: HomeIsland, imageUrl: string): IslandNFTMetadata {
    return {
      name: island.name || `Home Island #${island.id.slice(0, 8)}`,
      description: `A unique home island in Grudge Warlords. Map style: ${island.mapStyle}. Seed: ${island.seed.slice(0, 8)}...`,
      image: imageUrl,
      attributes: [
        { trait_type: 'Map Style', value: island.mapStyle },
        { trait_type: 'Seed', value: island.seed.slice(0, 16) },
        { trait_type: 'Island ID', value: island.id.slice(0, 8) },
        { trait_type: 'Created At', value: new Date(island.createdAt).toISOString().split('T')[0] },
      ],
      properties: {
        files: [{ uri: imageUrl, type: 'image/png' }],
        category: 'island',
      },
    };
  }

  /**
   * Mint island cNFT directly to an account's wallet (used during island init).
   */
  async mintIslandCNFT(
    account: Account,
    island: { id: string; seed: string; name: string; mapStyle: string; mapImageUrl?: string | null },
  ): Promise<{ actionId?: string; mintAddress?: string }> {
    if (!this.apiKey) {
      console.warn('[Crossmint] Cannot mint island NFT — API key not configured');
      return {};
    }

    const walletAddress = account.walletAddress;
    if (!walletAddress) {
      console.warn('[Crossmint] Account has no wallet address');
      return {};
    }

    const metadata = {
      name: island.name || 'Home Island',
      description: `${island.name} — a home island in Grudge Warlords. Seed: ${island.seed}`,
      image: island.mapImageUrl || '',
      attributes: [
        { trait_type: 'Seed', value: island.seed },
        { trait_type: 'Map Style', value: island.mapStyle || 'iron' },
      ],
    };

    try {
      // Same Warlords collection as characters; Home Island is template 18d0e641-…
      const islandCollection = CROSSMINT_ISLAND_COLLECTION_ID || CROSSMINT_COLLECTION_ID;
      const body: Record<string, unknown> = {
        recipient: `solana:${walletAddress}`,
        metadata,
        compressed: true,
      };
      if (CROSSMINT_ISLAND_TEMPLATE_ID) {
        body.templateId = CROSSMINT_ISLAND_TEMPLATE_ID;
      }
      console.log(
        `[Crossmint] Island mint collection=${islandCollection} template=${CROSSMINT_ISLAND_TEMPLATE_ID || "none"} wallet=${walletAddress}`,
      );
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${islandCollection}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        console.error('[Crossmint] Island mint failed:', response.status, await response.text());
        return {};
      }

      const result = await response.json() as CrossmintMintResponse;
      return {
        actionId: result.actionId,
        mintAddress: result.onChain?.mintHash,
      };
    } catch (error) {
      console.error('[Crossmint] Island mint error:', error);
      return {};
    }
  }

  async mintIslandToEmail(
    island: HomeIsland,
    email: string,
    imageUrl: string,
  ): Promise<CrossmintMintResponse | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint island NFT — API key not configured');
      return null;
    }

    try {
      const metadata = this.buildIslandMetadata(island, imageUrl);
      console.log('[Crossmint] Minting island cNFT to email:', email);

      const body: Record<string, unknown> = {
        recipient: `email:${email}:solana`,
        metadata: {
          name: metadata.name,
          image: metadata.image,
          description: metadata.description,
          attributes: metadata.attributes,
        },
        compressed: true,
      };
      if (CROSSMINT_ISLAND_TEMPLATE_ID) {
        body.templateId = CROSSMINT_ISLAND_TEMPLATE_ID;
      }

      const islandCollection = CROSSMINT_ISLAND_COLLECTION_ID || CROSSMINT_COLLECTION_ID;
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${islandCollection}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island mint to email failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      return {
        actionId: result.actionId || result.id,
        onChain: {
          status: result.onChain?.status || 'pending',
          chain: result.onChain?.chain || 'solana',
          txId: result.onChain?.txId,
          mintHash: result.onChain?.mintHash,
        },
      };
    } catch (error) {
      console.error('[Crossmint] Island mint to email error:', error);
      return null;
    }
  }

  async mintIslandToWallet(
    island: HomeIsland,
    walletAddress: string,
    imageUrl: string,
  ): Promise<CrossmintMintResponse | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint island NFT — API key not configured');
      return null;
    }

    try {
      const metadata = this.buildIslandMetadata(island, imageUrl);
      console.log('[Crossmint] Minting island cNFT to wallet:', walletAddress);

      const body: Record<string, unknown> = {
        recipient: `solana:${walletAddress}`,
        metadata: {
          name: metadata.name,
          image: metadata.image,
          description: metadata.description,
          attributes: metadata.attributes,
        },
        compressed: true,
      };
      if (CROSSMINT_ISLAND_TEMPLATE_ID) {
        body.templateId = CROSSMINT_ISLAND_TEMPLATE_ID;
      }

      const islandCollection = CROSSMINT_ISLAND_COLLECTION_ID || CROSSMINT_COLLECTION_ID;
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${islandCollection}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island mint to wallet failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      return {
        actionId: result.actionId || result.id,
        onChain: {
          status: result.onChain?.status || 'pending',
          chain: result.onChain?.chain || 'solana',
          txId: result.onChain?.txId,
          mintHash: result.onChain?.mintHash,
        },
      };
    } catch (error) {
      console.error('[Crossmint] Island mint to wallet error:', error);
      return null;
    }
  }

  async updateIslandNFTMetadata(
    nftId: string,
    island: HomeIsland,
    imageUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Crossmint API key not configured' };
    }

    try {
      const metadata = this.buildIslandMetadata(island, imageUrl);
      const collectionId = CROSSMINT_COLLECTION_ID;

      console.log('[Crossmint] Updating island NFT metadata for:', nftId);

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${nftId}`,
        {
          method: 'PATCH',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            reuploadLinkedFiles: false,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island NFT metadata update failed:', response.status, errorText);
        return { success: false, error: `Update failed: ${response.status} ${errorText}` };
      }

      return { success: true };
    } catch (error) {
      console.error('[Crossmint] Island NFT metadata update error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Submit a serialized Solana VersionedTransaction from BUDBai (Jupiter swap).
   */
  async submitSerializedSolanaTx(
    walletAddress: string,
    swapTransactionBase64: string,
  ): Promise<{ success: boolean; swapTx?: string; pending?: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: "Crossmint API key not configured" };
    }
    const locators = [
      walletAddress,
      "email:poker-ai-agent@grudge-studio.com:solana",
    ];
    let last = "no locator accepted";
    for (const loc of locators) {
      const paths = [
        `${this.baseUrl}/api/2025-06-09/wallets/${encodeURIComponent(loc)}/transactions`,
        `${this.baseUrl}/api/v1-alpha2/wallets/${encodeURIComponent(loc)}/transactions`,
      ];
      for (const url of paths) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "X-API-KEY": this.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              params: { transaction: swapTransactionBase64 },
            }),
          });
          const text = await response.text();
          let j: {
            id?: string;
            onChain?: { txId?: string };
            status?: string;
            error?: string;
            message?: string;
          } = {};
          try {
            j = JSON.parse(text) as typeof j;
          } catch {
            last = `${response.status} ${text.slice(0, 120)}`;
            continue;
          }
          if (response.ok) {
            const sig = j.onChain?.txId || j.id;
            const pending = /pending|awaiting/i.test(String(j.status || ""));
            return { success: true, swapTx: sig, pending };
          }
          last = j.error || j.message || `${response.status} ${text.slice(0, 120)}`;
        } catch (e) {
          last = e instanceof Error ? e.message : String(e);
        }
      }
    }
    return { success: false, error: last };
  }

  /**
   * Send SPL / native from a live Crossmint Solana wallet.
   * Official: POST /2025-06-09/wallets/{locator}/tokens/{chain:mint}/transfers
   * Send SPL from a live Crossmint Solana wallet.
   * Official REST: POST /2025-06-09/wallets/{locator}/tokens/solana:{mint}/transfers
   * Project API key is the admin signer on v1-alpha2 solana-custodial wallets
   * (one-tap, no Phantom). Poll until onChain.txId is a Solana signature.
   * @see https://docs.crossmint.com/wallets/guides/transfer-tokens
   * @see https://docs.crossmint.com/api-reference/wallets/transfer-token
   */
  async sendSplToken(opts: {
    fromWallet: string;
    toWallet: string;
    amount: string;
    mint: string;
    emailLocator?: string;
    extraLocators?: string[];
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    signature?: string;
    explorerLink?: string;
    pending?: boolean;
    error?: string;
    status?: string;
  }> {
    if (!this.apiKey) {
      return { success: false, error: "Crossmint API key not configured" };
    }
    const tokenLocator = `solana:${opts.mint.trim()}`;
    const mint = opts.mint.trim();
    const tokenLocator = `solana:${mint}`;
    const locators = [
      opts.fromWallet,
      opts.emailLocator,
      ...(opts.extraLocators || []),
    ].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);

    const isSolanaSig = (s?: string) =>
      Boolean(s && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(s) && !s.includes("-"));

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const pollTx = async (
      loc: string,
      txId: string,
    ): Promise<{
      signature?: string;
      explorerLink?: string;
      status?: string;
      error?: string;
    }> => {
      let lastStatus = "pending";
      for (let i = 0; i < 20; i++) {
        if (i > 0) await sleep(1500);
        try {
          const r = await fetch(
            `${this.baseUrl}/api/2025-06-09/wallets/${encodeURIComponent(loc)}/transactions/${encodeURIComponent(txId)}`,
            { headers: { "X-API-KEY": this.apiKey } },
          );
          const j = (await r.json()) as {
            status?: string;
            onChain?: { txId?: string; explorerLink?: string };
            error?: string;
            message?: string;
          };
          lastStatus = String(j.status || lastStatus);
          const sig = j.onChain?.txId;
          if (j.status === "failed") {
            return { error: j.error || j.message || "Crossmint transfer failed", status: j.status };
          }
          if (isSolanaSig(sig)) {
            return {
              signature: sig,
              explorerLink:
                j.onChain?.explorerLink || `https://solscan.io/tx/${sig}`,
              status: j.status,
            };
          }
          if (/awaiting/i.test(lastStatus)) {
            return {
              error:
                "Crossmint wallet is awaiting a signer. Play wallet is server-custodial — check CROSSMINT_SERVER_API_KEY scopes (wallets:transactions.create).",
              status: lastStatus,
            };
          }
        } catch (e) {
          lastStatus = e instanceof Error ? e.message : String(e);
        }
      }
      return {
        error: `Crossmint send still pending (${lastStatus}) — no Solana signature yet`,
        status: lastStatus,
      };
    };

    let last = "no locator accepted";
    const idem =
      opts.idempotencyKey ||
      `gbux:${opts.fromWallet.slice(0, 12)}:${opts.toWallet.slice(0, 12)}:${opts.amount}:${Date.now()}`;
    for (const loc of locators) {
      const url = `${this.baseUrl}/api/2025-06-09/wallets/${encodeURIComponent(loc)}/tokens/${encodeURIComponent(tokenLocator)}/transfers`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "X-API-KEY": this.apiKey,
            "Content-Type": "application/json",
            "x-idempotency-key": idem,
          },
          body: JSON.stringify({
            recipient: opts.toWallet,
            amount: opts.amount,
            transactionType: "direct",
            fees: { mode: "project" },
          }),
        });
        const text = await response.text();
        let j: {
          id?: string;
          status?: string;
          onChain?: { txId?: string; explorerLink?: string };
          error?: string;
          message?: string;
        } = {};
        try {
          j = JSON.parse(text) as typeof j;
        } catch {
          last = `${response.status} ${text.slice(0, 160)}`;
          continue;
        }
        if (response.ok || response.status === 201) {
          const sig = j.onChain?.txId || j.id;
          const pending = /pending|awaiting/i.test(String(j.status || ""));
          const immediate = j.onChain?.txId;
          if (isSolanaSig(immediate)) {
            return {
              success: true,
              signature: immediate,
              explorerLink:
                j.onChain?.explorerLink || `https://solscan.io/tx/${immediate}`,
              pending: false,
              status: j.status || "success",
            };
          }
          if (/awaiting/i.test(String(j.status || ""))) {
            last =
              "Crossmint returned awaiting-approval — custodial API key must be the admin signer";
            continue;
          }
          if (j.id) {
            const polled = await pollTx(loc, j.id);
            if (polled.signature) {
              return {
                success: true,
                signature: polled.signature,
                explorerLink: polled.explorerLink,
                pending: false,
                status: polled.status,
              };
            }
            last = polled.error || last;
            if (polled.status === "failed") break;
            continue;
          }
          last = "Crossmint accepted transfer but returned no on-chain signature";
          continue;
        }
        last = j.error || j.message || `${response.status} ${text.slice(0, 160)}`;
      } catch (e) {
        last = e instanceof Error ? e.message : String(e);
      }
    }
    return { success: false, error: last };
  }

  // ==================== TRANSFER (escrow → player) ====================

  /**
   * Transfer a cNFT from the agent escrow wallet to a player's wallet.
   * Uses Crossmint's transfer API for custodial wallets.
   */
  async transferNFT(
    nftActionIdOrTokenId: string,
    fromWallet: string,
    toWallet: string,
  ): Promise<{ success: boolean; actionId?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Crossmint API key not configured' };
    }

    try {
      const collectionId = CROSSMINT_COLLECTION_ID;
      console.log(`[Crossmint] Transferring NFT ${nftActionIdOrTokenId} from ${fromWallet} → ${toWallet}`);

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${nftActionIdOrTokenId}/transfer`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            recipient: `solana:${toWallet}`,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Transfer failed:', response.status, errorText);
        return { success: false, error: `Transfer failed: ${response.status} ${errorText}` };
      }

      const result = await response.json();
      console.log('[Crossmint] Transfer initiated:', result.actionId || result.id);
      return { success: true, actionId: result.actionId || result.id };
    } catch (error) {
      console.error('[Crossmint] Transfer error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================== STATUS & POLLING ====================

  async checkMintStatus(actionId: string): Promise<CrossmintMintStatus | null> {
    if (!this.apiKey) return null;

    try {
      const collectionId = CROSSMINT_COLLECTION_ID;

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${actionId}`,
        {
          method: 'GET',
          headers: { 'x-api-key': this.apiKey },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Status check failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      const onChainStatus = result.onChain?.status || 'pending';

      // Extract owner wallet address from various Crossmint response shapes
      let ownerWallet: string | undefined;
      if (result.recipient) {
        const recipientParts = result.recipient.split(':');
        if (recipientParts[0] === 'solana' && recipientParts[1]) {
          ownerWallet = recipientParts[1];
        }
      }
      if (!ownerWallet && result.onChain?.owner) {
        ownerWallet = result.onChain.owner;
      }
      if (!ownerWallet && result.owner) {
        ownerWallet = result.owner;
      }

      return {
        actionId,
        status: onChainStatus,
        ownerWallet,
        data: onChainStatus === 'success' ? {
          chain: result.onChain?.chain || 'solana',
          txId: result.onChain?.txId || '',
          collection: {
            id: result.collection?.id || collectionId,
            name: result.collection?.name || '',
          },
          token: {
            id: result.id || actionId,
            mintHash: result.onChain?.mintHash || '',
          },
        } : undefined,
      };
    } catch (error) {
      console.error('[Crossmint] Status check error:', error);
      return null;
    }
  }

  async pollUntilComplete(
    actionId: string,
    maxAttempts: number = 30,
    delayMs: number = 2000,
  ): Promise<CrossmintMintStatus | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkMintStatus(actionId);

      if (!status) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      if (status.status === 'success' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.error('[Crossmint] Polling timeout for action:', actionId);
    return null;
  }
}

export const crossmintWalletService = new CrossmintWalletService();
