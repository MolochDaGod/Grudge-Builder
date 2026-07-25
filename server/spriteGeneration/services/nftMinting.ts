import { db } from '../../db';
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

    return this.toNFTStatus(nft);
  }

  async getNFTById(nftId: string): Promise<NFTStatus | null> {
    const [nft] = await db
      .select()
      .from(characterNFTs)
      .where(eq(characterNFTs.id, nftId))
      .limit(1);

    if (!nft) return null;

    return this.toNFTStatus(nft);
  }

  private toNFTStatus(nft: typeof characterNFTs.$inferSelect): NFTStatus {
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

  /**
   * Mint character cNFT.
   *
   * **Production default (escrow-first):** mint to the server admin wallet
   * (`AI_AGENT_WALLET` / `AGENT_ESCROW_WALLET` / `CROSSMINT_TREASURY_WALLET`).
   * Game ownership stays on Railway (accountId + characterId + grudgeId).
   * Players may later claim/transfer to their wallet (optional, may incur fees).
   *
   * Set `options.directToUser = true` only for explicit admin/legacy paths.
   */
  async mintCharacterAsCNFT(
    characterId: string,
    accountId: string,
    email?: string,
    externalWallet?: string,
    options?: { directToUser?: boolean },
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
      if (character.avatarUrl.startsWith('/')) {
        const baseUrl = process.env.APP_URL || 'https://grudgewarlords.com';
        imageUrl = `${baseUrl}${character.avatarUrl}`;
      } else if (character.avatarUrl.startsWith('http')) {
        imageUrl = character.avatarUrl;
      }
    }

    const ownership = {
      characterId: character.id,
      accountId: account.id,
      grudgeId: account.grudgeId || account.userId || null,
      grudgeCode: (character as { grudgeCode?: string | null }).grudgeCode || null,
    };

    console.log('[NFT] Using image URL:', imageUrl);
    console.log('[NFT] Ownership bind:', ownership);

    const agentWallet =
      process.env.AI_AGENT_WALLET ||
      process.env.AGENT_ESCROW_WALLET ||
      process.env.CROSSMINT_TREASURY_WALLET;

    const directToUser = options?.directToUser === true;
    let mintResult;
    let targetWallet: string;
    let escrowed = false;

    if (directToUser && externalWallet) {
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        externalWallet,
        true,
        ownership,
      );
      targetWallet = externalWallet;
    } else if (directToUser && email) {
      mintResult = await crossmintWalletService.mintToEmail(
        character,
        imageUrl,
        email,
        true,
        ownership,
      );
      targetWallet = `email:${email}:solana`;
    } else if (directToUser && account.walletAddress) {
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        account.walletAddress,
        true,
        ownership,
      );
      targetWallet = account.walletAddress;
    } else {
      // Escrow-first (production default)
      if (!agentWallet) {
        console.error('[NFT] No AI_AGENT_WALLET / AGENT_ESCROW_WALLET configured — cannot escrow cNFT');
        return { success: false, error: 'Server escrow wallet not configured (AI_AGENT_WALLET)' };
      }
      console.log(`[NFT] Escrow-first mint → admin wallet: ${agentWallet}`);
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        agentWallet,
        true,
        ownership,
      );
      targetWallet = `escrow:${agentWallet}`;
      escrowed = true;
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
          mintedToExternal: !escrowed && !!externalWallet,
        })
        .returning();
      nftRecord = inserted;
    }

    // Mirror action id on character for roster / inventory UI
    try {
      await db
        .update(characters)
        .set({ cnftId: mintResult.actionId } as any)
        .where(eq(characters.id, characterId));
    } catch (e) {
      console.warn('[NFT] Could not write characters.cnftId:', e);
    }

    console.log(
      `[NFT] Initiated cNFT mint for ${character.name} (${characterId}) escrow=${escrowed} action=${mintResult.actionId}`,
    );

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
      // Escrow records keep ownerWalletAddress as "escrow:<admin>" so claim still works.
      // Never overwrite escrow prefix with Crossmint's chain owner (admin wallet bare address).
      const stillEscrowed = !!nft.ownerWalletAddress?.startsWith('escrow:');
      const updateData: Record<string, unknown> = {
        status: stillEscrowed ? 'minted' : 'minted',
        mintAddress: status.data.token.mintHash,
        assetId: status.data.token.id,
        collectionAddress: status.data.collection.id,
        mintedAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (!stillEscrowed && status.ownerWallet) {
        updateData.ownerWalletAddress = status.ownerWallet;
      }

      await db
        .update(characterNFTs)
        .set(updateData)
        .where(eq(characterNFTs.id, nftId));

      console.log(
        `[NFT] Character NFT minted: ${status.data.token.mintHash}, escrow=${stillEscrowed}, chainOwner=${status.ownerWallet || 'unknown'}`,
      );
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
   * Claim fee metadata (informational). Transfer fees are paid by the claimer
   * (wallet gas / Crossmint). Optional GBUX cover via CNFT_CLAIM_FEE_GBUX.
   */
  getClaimFeeInfo(): {
    required: boolean;
    feeGbux: number;
    note: string;
  } {
    const feeGbux = Math.max(0, Number(process.env.CNFT_CLAIM_FEE_GBUX || '0') || 0);
    return {
      required: false, // claim itself is never required to play
      feeGbux,
      note:
        feeGbux > 0
          ? `Optional claim transfers the cNFT to your wallet. Transfer costs network fees; GBUX fee: ${feeGbux}.`
          : 'Optional claim transfers the cNFT to your wallet. You pay network/transfer fees only. Playing does not require a claim.',
    };
  }

  /**
   * Claim an escrowed cNFT — transfer from admin escrow wallet to the player's wallet.
   * Optional. Game ownership remains account-bound either way.
   * Only works for NFTs whose ownerWalletAddress starts with "escrow:".
   */
  async claimEscrowedNFT(
    nftId: string,
    accountId: string,
  ): Promise<{ success: boolean; error?: string; fee?: ReturnType<NFTMintingService['getClaimFeeInfo']> }> {
    const fee = this.getClaimFeeInfo();
    const nfts = await this.getAccountNFTs(accountId);
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) {
      return { success: false, error: 'NFT not found or does not belong to this account', fee };
    }
    if (!nft.ownerWallet?.startsWith('escrow:')) {
      return { success: false, error: 'This NFT is not in escrow', fee };
    }

    const [account] = await db
      .select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!account?.walletAddress) {
      return {
        success: false,
        error: 'You need a wallet before you can claim. Create one on the wallet page.',
        fee,
      };
    }

    const [nftRecord] = await db
      .select().from(characterNFTs).where(eq(characterNFTs.id, nftId)).limit(1);
    if (!nftRecord) {
      return { success: false, error: 'NFT record not found', fee };
    }

    // Prefer mint address / asset id once minted; fall back to action id while pending
    const tokenId = nftRecord.mintAddress || nftRecord.assetId || nftRecord.crossmintActionId;
    if (!tokenId) {
      return { success: false, error: 'No token ID available for transfer', fee };
    }

    // Optional GBUX claim fee (account resources) — only if configured
    if (fee.feeGbux > 0) {
      try {
        const resources = (account as { resources?: Record<string, number> }).resources || {};
        const bal = Number(resources.gbux ?? resources.GBUX ?? 0);
        if (bal < fee.feeGbux) {
          return {
            success: false,
            error: `Claim requires ${fee.feeGbux} GBUX (balance ${bal}). Claim is optional — you can keep playing without transferring the cNFT.`,
            fee,
          };
        }
        // Deduct via storage-agnostic update if column exists
        const next = { ...resources, gbux: bal - fee.feeGbux };
        await db
          .update(accounts)
          .set({ resources: next, updatedAt: Date.now() } as any)
          .where(eq(accounts.id, accountId));
      } catch (e) {
        console.warn('[NFT-Claim] GBUX fee skip/fail (non-blocking if column missing):', e);
      }
    }

    const escrowWallet = nft.ownerWallet.replace('escrow:', '');
    console.log(`[NFT-Claim] Transferring NFT ${nftId} from escrow ${escrowWallet} → ${account.walletAddress}`);

    const result = await crossmintWalletService.transferNFT(tokenId, escrowWallet, account.walletAddress);
    if (!result.success) {
      return { success: false, error: result.error || 'Transfer failed', fee };
    }

    await db.update(characterNFTs).set({
      ownerWalletAddress: account.walletAddress,
      status: 'transferred',
      mintedToExternal: false,
      transferredAt: Date.now(),
      updatedAt: Date.now(),
    }).where(eq(characterNFTs.id, nftId));

    console.log(`[NFT-Claim] ✅ NFT ${nftId} claimed → ${account.walletAddress}`);
    return { success: true, fee };
  }

  /** Get all escrowed NFTs for an account (ownerWallet starts with "escrow:"). */
  async getEscrowedNFTs(accountId: string): Promise<EnrichedNFTStatus[]> {
    const all = await this.getAccountNFTsEnriched(accountId);
    return all.filter(nft => nft.ownerWallet?.startsWith('escrow:'));
  }
}

export const nftMintingService = new NFTMintingService();
