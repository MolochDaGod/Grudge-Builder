import type { Character, Account, HomeIsland } from "@shared/schema";

const CROSSMINT_BASE_URL = process.env.CROSSMINT_USE_STAGING === 'true'
  ? 'https://staging.crossmint.com' 
  : 'https://www.crossmint.com';

const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY || process.env.CROSSMINT_SECRET_KEY;
const CROSSMINT_COLLECTION_ID = process.env.CROSSMINT_COLLECTION_ID || 'default-solana';
const CROSSMINT_ISLAND_TEMPLATE_ID = process.env.CROSSMINT_ISLAND_CNFT || '';

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
    collection: {
      id: string;
      name: string;
    };
    token: {
      id: string;
      mintHash: string;
    };
  };
}

interface CharacterNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
  };
}

interface IslandNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
  };
}

export class CrossmintWalletService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!CROSSMINT_API_KEY) {
      throw new Error('Crossmint API key not configured');
    }
    this.apiKey = CROSSMINT_API_KEY;
    this.baseUrl = CROSSMINT_BASE_URL;
  }

  async createWalletForUser(email: string): Promise<CrossmintWallet | null> {
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
    try {
      const encodedEmail = encodeURIComponent(`email:${email}:solana-custodial-wallet`);
      const response = await fetch(`${this.baseUrl}/api/v1-alpha2/wallets/${encodedEmail}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
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
      return existingWallet;
    }
    return this.createWalletForUser(email);
  }

  buildCharacterMetadata(character: Character, imageUrl: string): CharacterNFTMetadata {
    const attrs = character.attributes as Record<string, number>;
    
    const getAttr = (key: string): number => {
      return attrs[key] || attrs[key.toLowerCase()] || attrs[key.toUpperCase()] || 0;
    };
    
    return {
      name: character.name,
      description: `${character.name} is a Level ${character.level} ${character.raceId} ${character.classId} from Grudge Warlords.`,
      image: imageUrl,
      attributes: [
        { trait_type: 'Race', value: character.raceId },
        { trait_type: 'Class', value: character.classId },
        { trait_type: 'Level', value: character.level },
        { trait_type: 'Strength', value: getAttr('strength') },
        { trait_type: 'Vitality', value: getAttr('vitality') },
        { trait_type: 'Endurance', value: getAttr('endurance') },
        { trait_type: 'Intellect', value: getAttr('intellect') },
        { trait_type: 'Wisdom', value: getAttr('wisdom') },
        { trait_type: 'Dexterity', value: getAttr('dexterity') },
        { trait_type: 'Agility', value: getAttr('agility') },
        { trait_type: 'Tactics', value: getAttr('tactics') },
        { trait_type: 'XP', value: character.xp },
        { trait_type: 'HP', value: character.hp },
      ],
      properties: {
        files: [{ uri: imageUrl, type: 'image/png' }],
        category: 'image',
      },
    };
  }

  async mintCharacterNFT(
    character: Character,
    imageUrl: string,
    recipientWallet: string,
    compressed: boolean = true
  ): Promise<CrossmintMintResponse | null> {
    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      const collectionId = CROSSMINT_COLLECTION_ID;
      
      console.log('[Crossmint] Minting NFT to wallet:', recipientWallet);
      console.log('[Crossmint] Using collection:', collectionId);
      console.log('[Crossmint] Base URL:', this.baseUrl);
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            recipient: `solana:${recipientWallet}`,
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            compressed,
            reuploadLinkedFiles: false,
          }),
        }
      );

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
    compressed: boolean = true
  ): Promise<CrossmintMintResponse | null> {
    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      const collectionId = CROSSMINT_COLLECTION_ID;
      
      console.log('[Crossmint] Minting NFT to email:', email);
      console.log('[Crossmint] Using collection:', collectionId);
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            recipient: `email:${email}:solana`,
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            compressed,
            reuploadLinkedFiles: false,
          }),
        }
      );

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

  async checkMintStatus(actionId: string): Promise<CrossmintMintStatus | null> {
    try {
      const collectionId = CROSSMINT_COLLECTION_ID;
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${collectionId}/nfts/${actionId}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Status check failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      console.log('[Crossmint] Status check result:', JSON.stringify(result));
      
      // Parse the response - Crossmint returns onChain.status for minting status
      const onChainStatus = result.onChain?.status || 'pending';
      
      // Extract owner wallet address from recipient field
      // Crossmint returns recipient as "solana:ADDRESS" or stores wallet info
      let ownerWallet: string | undefined;
      if (result.recipient) {
        // Format: "solana:ADDRESS" or "email:EMAIL:solana"
        const recipientParts = result.recipient.split(':');
        if (recipientParts[0] === 'solana' && recipientParts[1]) {
          ownerWallet = recipientParts[1];
        }
      }
      // Also check onChain.owner or owner field
      if (!ownerWallet && result.onChain?.owner) {
        ownerWallet = result.onChain.owner;
      }
      if (!ownerWallet && result.owner) {
        ownerWallet = result.owner;
      }
      
      const status: CrossmintMintStatus = {
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
      
      return status;
    } catch (error) {
      console.error('[Crossmint] Status check error:', error);
      return null;
    }
  }

  async pollUntilComplete(actionId: string, maxAttempts: number = 30, delayMs: number = 2000): Promise<CrossmintMintStatus | null> {
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

  async updateNFTMetadata(
    nftId: string,
    character: Character,
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      const collectionId = CROSSMINT_COLLECTION_ID;
      
      console.log('[Crossmint] Updating NFT metadata for:', nftId);
      console.log('[Crossmint] New metadata:', JSON.stringify(metadata, null, 2));
      
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] NFT metadata update failed:', response.status, errorText);
        return { success: false, error: `Update failed: ${response.status} ${errorText}` };
      }

      const result = await response.json();
      console.log('[Crossmint] NFT metadata update result:', JSON.stringify(result));
      return { success: true };
    } catch (error) {
      console.error('[Crossmint] NFT metadata update error:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== ISLAND NFT METHODS ====================

  buildIslandMetadata(island: HomeIsland, imageUrl: string): IslandNFTMetadata {
    const state = island.state as Record<string, unknown>;
    
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

  async mintIslandToEmail(
    island: HomeIsland,
    email: string,
    imageUrl: string
  ): Promise<CrossmintMintResponse | null> {
    try {
      const templateId = CROSSMINT_ISLAND_TEMPLATE_ID;
      if (!templateId) {
        console.error('[Crossmint] Island template ID not configured');
        return null;
      }

      const metadata = this.buildIslandMetadata(island, imageUrl);
      console.log('[Crossmint] Minting island cNFT to email:', email);
      console.log('[Crossmint] Island metadata:', JSON.stringify(metadata, null, 2));

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${CROSSMINT_COLLECTION_ID}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            recipient: `email:${email}:solana`,
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            compressed: true,
            templateId: templateId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island mint to email failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      console.log('[Crossmint] Island mint response:', JSON.stringify(result));

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
    imageUrl: string
  ): Promise<CrossmintMintResponse | null> {
    try {
      const templateId = CROSSMINT_ISLAND_TEMPLATE_ID;
      if (!templateId) {
        console.error('[Crossmint] Island template ID not configured');
        return null;
      }

      const metadata = this.buildIslandMetadata(island, imageUrl);
      console.log('[Crossmint] Minting island cNFT to wallet:', walletAddress);

      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/${CROSSMINT_COLLECTION_ID}/nfts`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify({
            recipient: `solana:${walletAddress}`,
            metadata: {
              name: metadata.name,
              image: metadata.image,
              description: metadata.description,
              attributes: metadata.attributes,
            },
            compressed: true,
            templateId: templateId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island mint to wallet failed:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      console.log('[Crossmint] Island mint response:', JSON.stringify(result));

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
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Crossmint] Island NFT metadata update failed:', response.status, errorText);
        return { success: false, error: `Update failed: ${response.status} ${errorText}` };
      }

      const result = await response.json();
      console.log('[Crossmint] Island NFT metadata update result:', JSON.stringify(result));
      return { success: true };
    } catch (error) {
      console.error('[Crossmint] Island NFT metadata update error:', error);
      return { success: false, error: String(error) };
    }
  }
}

export const crossmintWalletService = new CrossmintWalletService();
