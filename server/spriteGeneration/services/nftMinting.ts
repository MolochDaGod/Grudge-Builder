import { db } from '../db';
import { characterNFTs, characters, accounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { crossmintWalletService } from './crossmintWallet';

export interface MintCharacterResult {
  success: boolean;
  nftId?: string;
  actionId?: string;
  error?: string;
}

export interface NFTStatus {
  id: string;
  characterId: string;
  status: string;
  mintAddress?: string | null;
  assetId?: string | null;
  isCompressed: boolean;
  ownerWallet?: string | null;
}

export interface EnrichedNFTStatus extends NFTStatus {
  character?: {
    name: string;
    avatarUrl: string | null;
    raceId: string;
    classId: string;
    level: number;
    xp: number;
    hp: number;
    attributes: Record<string, number>;
  } | null;
}

export class NFTMintingService {
  async getCharacterNFT(characterId: string): Promise<NFTStatus | null> {
    const [nft] = await db
      .select()
      .from(characterNFTs)
      .where(eq(characterNFTs.characterId, characterId))
      .limit(1);

    if (!nft) return null;

    return {
      id: nft.id,
      characterId: nft.characterId,
      status: nft.status,
      mintAddress: nft.mintAddress,
      assetId: nft.assetId,
      isCompressed: nft.isCompressed,
      ownerWallet: nft.ownerWalletAddress,
    };
  }

  async getAccountNFTs(accountId: string): Promise<NFTStatus[]> {
    const nfts = await db
      .select()
      .from(characterNFTs)
      .where(eq(characterNFTs.accountId, accountId));

    return nfts.map(nft => ({
      id: nft.id,
      characterId: nft.characterId,
      status: nft.status,
      mintAddress: nft.mintAddress,
      assetId: nft.assetId,
      isCompressed: nft.isCompressed,
      ownerWallet: nft.ownerWalletAddress,
    }));
  }

  async getAccountNFTsEnriched(accountId: string): Promise<EnrichedNFTStatus[]> {
    const nfts = await db
      .select({
        nft: characterNFTs,
        character: characters,
      })
      .from(characterNFTs)
      .leftJoin(characters, eq(characterNFTs.characterId, characters.id))
      .where(eq(characterNFTs.accountId, accountId));

    return nfts.map(({ nft, character }) => ({
      id: nft.id,
      characterId: nft.characterId,
      status: nft.status,
      mintAddress: nft.mintAddress,
      assetId: nft.assetId,
      isCompressed: nft.isCompressed,
      ownerWallet: nft.ownerWalletAddress,
      character: character ? {
        name: character.name,
        avatarUrl: character.avatarUrl,
        raceId: character.raceId,
        classId: character.classId,
        level: character.level,
        xp: character.xp,
        hp: character.hp,
        attributes: character.attributes as Record<string, number>,
      } : null,
    }));
  }

  async mintCharacterAsCNFT(
    characterId: string,
    accountId: string,
    email?: string,
    externalWallet?: string
  ): Promise<MintCharacterResult> {
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);

    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const existingNFT = await this.getCharacterNFT(characterId);
    if (existingNFT && existingNFT.status !== 'pending') {
      return { success: false, error: 'Character already has an NFT' };
    }

    // Make sure image URL is absolute - use Crossmint logo as fallback
    let imageUrl = 'https://www.crossmint.com/assets/crossmint/logo.png';
    if (character.avatarUrl) {
      // If it's a relative URL, make it absolute using the app URL
      if (character.avatarUrl.startsWith('/')) {
        const baseUrl = process.env.APP_URL || 'https://grudgewarlords.com';
        imageUrl = `${baseUrl}${character.avatarUrl}`;
      } else if (character.avatarUrl.startsWith('http')) {
        imageUrl = character.avatarUrl;
      }
    }
    
    console.log('[NFT] Using image URL:', imageUrl);

    let mintResult;
    let targetWallet: string;

    if (externalWallet) {
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        externalWallet,
        true
      );
      targetWallet = externalWallet;
    } else if (email) {
      mintResult = await crossmintWalletService.mintToEmail(
        character,
        imageUrl,
        email,
        true
      );
      targetWallet = `email:${email}:solana`;
    } else if (account.walletAddress) {
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        account.walletAddress,
        true
      );
      targetWallet = account.walletAddress;
    } else {
      // No wallet or email — escrow to the agent AI wallet.
      // The cNFT is held here until the player sets up a server-side wallet,
      // at which point they can claim it from the wallet page.
      const agentWallet = process.env.AI_AGENT_WALLET || process.env.AGENT_ESCROW_WALLET || process.env.CROSSMINT_TREASURY_WALLET;
      if (!agentWallet) {
        console.error('[NFT] No AGENT_ESCROW_WALLET configured — cannot escrow cNFT');
        return { success: false, error: 'No wallet available and escrow not configured' };
      }
      console.log(`[NFT] Player has no wallet — escrowing cNFT to agent wallet: ${agentWallet}`);
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        agentWallet,
        true
      );
      targetWallet = `escrow:${agentWallet}`;
    }

    if (!mintResult) {
      return { success: false, error: 'Failed to initiate NFT minting' };
    }

    let nftRecord;
    
    if (existingNFT) {
      const [updated] = await db
        .update(characterNFTs)
        .set({
          status: 'minting',
          crossmintActionId: mintResult.actionId,
          ownerWalletAddress: targetWallet,
          updatedAt: Date.now(),
        })
        .where(eq(characterNFTs.characterId, characterId))
        .returning();
      nftRecord = updated;
    } else {
      const [inserted] = await db
        .insert(characterNFTs)
        .values({
          characterId,
          accountId,
          status: 'minting',
          isCompressed: true,
          crossmintActionId: mintResult.actionId,
          ownerWalletAddress: targetWallet,
          imageUri: imageUrl,
          mintedToExternal: !!externalWallet,
        })
        .returning();
      nftRecord = inserted;
    }

    console.log(`[NFT] Initiated cNFT mint for character ${character.name} (${characterId})`);

    return {
      success: true,
      nftId: nftRecord?.id,
      actionId: mintResult.actionId,
    };
  }

  async checkAndUpdateMintStatus(nftId: string): Promise<NFTStatus | null> {
    const [nft] = await db
      .select()
      .from(characterNFTs)
      .where(eq(characterNFTs.id, nftId))
      .limit(1);

    if (!nft || !nft.crossmintActionId) {
      return null;
    }

    if (nft.status === 'minted') {
      return {
        id: nft.id,
        characterId: nft.characterId,
        status: nft.status,
        mintAddress: nft.mintAddress,
        assetId: nft.assetId,
        isCompressed: nft.isCompressed,
        ownerWallet: nft.ownerWalletAddress,
      };
    }

    const status = await crossmintWalletService.checkMintStatus(nft.crossmintActionId);

    if (!status) {
      return null;
    }

    if (status.status === 'success' && status.data) {
      // Update NFT record with mint details and owner wallet
      const updateData: Record<string, unknown> = {
        status: 'minted',
        mintAddress: status.data.token.mintHash,
        assetId: status.data.token.id,
        collectionAddress: status.data.collection.id,
        mintedAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Update owner wallet if we got it from Crossmint
      if (status.ownerWallet) {
        updateData.ownerWalletAddress = status.ownerWallet;
      }
      
      await db
        .update(characterNFTs)
        .set(updateData)
        .where(eq(characterNFTs.id, nftId));

      console.log(`[NFT] Character NFT minted successfully: ${status.data.token.mintHash}, owner: ${status.ownerWallet || 'unknown'}`);
    } else if (status.status === 'failed') {
      await db
        .update(characterNFTs)
        .set({
          status: 'pending',
          updatedAt: Date.now(),
        })
        .where(eq(characterNFTs.id, nftId));

      console.error(`[NFT] Character NFT minting failed for ${nft.characterId}`);
    }

    return this.getCharacterNFT(nft.characterId);
  }

  async getWalletForAccount(accountId: string, email?: string): Promise<string | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) return null;

    if (account.walletAddress) {
      return account.walletAddress;
    }

    if (email) {
      const wallet = await crossmintWalletService.getOrCreateWallet(email);
      if (wallet) {
        await db
          .update(accounts)
          .set({
            walletAddress: wallet.address,
            walletType: 'crossmint',
            crossmintWalletId: wallet.id,
            crossmintEmail: email,
            updatedAt: Date.now(),
          })
          .where(eq(accounts.id, accountId));

        return wallet.address;
      }
    }

    return null;
  }

  async linkExternalWallet(accountId: string, walletAddress: string): Promise<boolean> {
    try {
      await db
        .update(accounts)
        .set({
          walletAddress,
          walletType: 'external',
          crossmintWalletId: null,
          crossmintEmail: null,
          updatedAt: Date.now(),
        })
        .where(eq(accounts.id, accountId));

      console.log(`[NFT] Linked external wallet ${walletAddress} to account ${accountId}`);
      return true;
    } catch (error) {
      console.error('[NFT] Failed to link external wallet:', error);
    return false;
    }
  }

  /**
   * Claim an escrowed cNFT — transfer it from the agent wallet to the player's wallet.
   * Only works for NFTs whose ownerWalletAddress starts with "escrow:".
   */
  async claimEscrowedNFT(
    nftId: string,
    accountId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const nfts = await this.getAccountNFTs(accountId);
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) {
      return { success: false, error: 'NFT not found or does not belong to this account' };
    }
    if (!nft.ownerWallet?.startsWith('escrow:')) {
      return { success: false, error: 'This NFT is not in escrow' };
    }

    const [account] = await db
      .select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!account?.walletAddress) {
      return { success: false, error: 'You need a wallet before you can claim. Create one on the wallet page.' };
    }

    const [nftRecord] = await db
      .select().from(characterNFTs).where(eq(characterNFTs.id, nftId)).limit(1);
    if (!nftRecord) {
      return { success: false, error: 'NFT record not found' };
    }

    const tokenId = nftRecord.crossmintActionId || nftRecord.assetId;
    if (!tokenId) {
      return { success: false, error: 'No token ID available for transfer' };
    }

    const escrowWallet = nft.ownerWallet.replace('escrow:', '');
    console.log(`[NFT-Claim] Transferring NFT ${nftId} from escrow ${escrowWallet} → ${account.walletAddress}`);

    const result = await crossmintWalletService.transferNFT(tokenId, escrowWallet, account.walletAddress);
    if (!result.success) {
      return { success: false, error: result.error || 'Transfer failed' };
    }

    await db.update(characterNFTs).set({
      ownerWalletAddress: account.walletAddress,
      status: 'minted',
      mintedToExternal: false,
      updatedAt: Date.now(),
    }).where(eq(characterNFTs.id, nftId));

    console.log(`[NFT-Claim] ✅ NFT ${nftId} claimed → ${account.walletAddress}`);
    return { success: true };
  }

  /** Get all escrowed NFTs for an account (ownerWallet starts with "escrow:"). */
  async getEscrowedNFTs(accountId: string): Promise<EnrichedNFTStatus[]> {
    const all = await this.getAccountNFTsEnriched(accountId);
    return all.filter(nft => nft.ownerWallet?.startsWith('escrow:'));
  }
}

export const nftMintingService = new NFTMintingService();
