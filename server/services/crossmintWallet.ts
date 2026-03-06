import type { Character, Account } from "@shared/schema";

const CROSSMINT_BASE_URL = process.env.CROSSMINT_USE_STAGING === 'true'
  ? 'https://staging.crossmint.com' 
  : 'https://www.crossmint.com';

const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY || process.env.CROSSMINT_API_KEY;

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

export class CrossmintWalletService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!CROSSMINT_API_KEY) {
      console.warn('[Crossmint] API key not configured - wallet features disabled');
      this.apiKey = '';
      this.baseUrl = CROSSMINT_BASE_URL;
      return;
    }
    this.apiKey = CROSSMINT_API_KEY;
    this.baseUrl = CROSSMINT_BASE_URL;
  }

  async createWalletForUser(email: string): Promise<CrossmintWallet | null> {
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot create wallet - API key not configured');
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
    if (!this.apiKey) {
      return null;
    }

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
      console.log('[Crossmint] Using existing wallet for:', email);
      return existingWallet;
    }
    
    console.log('[Crossmint] Creating new wallet for:', email);
    return this.createWalletForUser(email);
  }

  buildCharacterMetadata(character: Character, imageUrl: string): CharacterNFTMetadata {
    const attributes = character.attributes as Record<string, number>;
    
    return {
      name: character.name,
      description: `${character.name} is a Level ${character.level} ${character.raceId} ${character.classId} from Grudge Warlords.`,
      image: imageUrl,
      attributes: [
        { trait_type: 'Race', value: character.raceId },
        { trait_type: 'Class', value: character.classId },
        { trait_type: 'Level', value: character.level },
        { trait_type: 'STR', value: attributes.STR || 0 },
        { trait_type: 'VIT', value: attributes.VIT || 0 },
        { trait_type: 'END', value: attributes.END || 0 },
        { trait_type: 'INT', value: attributes.INT || 0 },
        { trait_type: 'WIS', value: attributes.WIS || 0 },
        { trait_type: 'DEX', value: attributes.DEX || 0 },
        { trait_type: 'AGI', value: attributes.AGI || 0 },
        { trait_type: 'TAC', value: attributes.TAC || 0 },
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
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint NFT - API key not configured');
      return null;
    }

    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/default-solana/nfts`,
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
    if (!this.apiKey) {
      console.error('[Crossmint] Cannot mint NFT - API key not configured');
      return null;
    }

    try {
      const metadata = this.buildCharacterMetadata(character, imageUrl);
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/default-solana/nfts`,
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
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/collections/default-solana/nfts/${actionId}`,
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

      return await response.json() as CrossmintMintStatus;
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
}

export const crossmintWalletService = new CrossmintWalletService();
