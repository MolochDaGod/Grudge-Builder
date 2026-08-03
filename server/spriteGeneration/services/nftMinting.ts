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
   * Email bound to the account for Crossmint locators / email mint backup.
   * Prefer real account email, then crossmintEmail, then stable grudge+{id}@…
   */
  resolveAccountEmail(
    account: {
      grudgeId?: string | null;
      userId?: string | null;
      email?: string | null;
      crossmintEmail?: string | null;
    },
    override?: string | null,
  ): string | null {
    const raw =
      (override && String(override).trim()) ||
      (account.email && String(account.email).trim()) ||
      (account.crossmintEmail && String(account.crossmintEmail).trim()) ||
      "";
    if (raw && raw.includes("@")) return raw;
    const gid = account.grudgeId || account.userId;
    if (gid) return crossmintWalletService.stableEmailForGrudgeId(String(gid));
    return null;
  }

  /**
   * Ensure the account has exactly one Crossmint Solana server wallet.
   * Idempotent — creates on first call, reuses forever across eras/games.
   * Call on account create and before any character/island mint.
   */
  async ensureAccountWallet(accountId: string, email?: string): Promise<string | null> {
    return this.getWalletForAccount(accountId, email);
  }

  /**
   * Mint character cNFT → **account.walletAddress** (singular server-side wallet).
   *
   * Priority:
   *   1. account.walletAddress (ensure/create Crossmint server wallet)
   *   2. Backup: mint to **account email** (Crossmint email:…:solana) — not admin escrow
   *   3. Last resort / ops: AI_AGENT_WALLET escrow + claim later
   *
   * Game ownership stays Railway (accountId + characterId + grudgeId).
   * `options.escrowOnly = true` forces admin escrow only (ops backup).
   */
  async mintCharacterAsCNFT(
    characterId: string,
    accountId: string,
    email?: string,
    externalWallet?: string,
    options?: { directToUser?: boolean; escrowOnly?: boolean },
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

    const agentWallet =
      process.env.AI_AGENT_WALLET ||
      process.env.AGENT_ESCROW_WALLET ||
      process.env.CROSSMINT_TREASURY_WALLET;

    const forceEscrow = options?.escrowOnly === true;
    const accountEmail = this.resolveAccountEmail(
      account as {
        grudgeId?: string | null;
        userId?: string | null;
        email?: string | null;
        crossmintEmail?: string | null;
      },
      email,
    );
    // Explicit external wallet only when caller passes one (admin tools)
    const preferExternal =
      !!externalWallet && options?.directToUser !== false && !forceEscrow;

    let playerWallet: string | null = null;
    if (!forceEscrow) {
      if (preferExternal && externalWallet) {
        playerWallet = externalWallet;
      } else {
        // Singular account wallet — create if missing (first character path)
        playerWallet = await this.ensureAccountWallet(
          accountId,
          accountEmail || undefined,
        );
      }
    }

    let custody: "player" | "email_backup" | "escrow_admin" = "player";
    if (forceEscrow) custody = "escrow_admin";
    else if (!playerWallet && accountEmail) custody = "email_backup";
    else if (!playerWallet) custody = "escrow_admin";

    const ownership = {
      characterId: character.id,
      accountId: account.id,
      grudgeId: account.grudgeId || account.userId || null,
      grudgeCode: (character as { grudgeCode?: string | null }).grudgeCode || null,
      custody,
    };

    console.log("[NFT] Using image URL:", imageUrl);
    console.log("[NFT] Ownership bind:", ownership);
    console.log(
      `[NFT] Mint target custody=${custody} playerWallet=${playerWallet || "none"} email=${accountEmail || "none"}`,
    );

    let mintResult = null as Awaited<
      ReturnType<typeof crossmintWalletService.mintCharacterNFT>
    >;
    let targetWallet = "";
    let escrowed = false;

    if (playerWallet && !forceEscrow) {
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        playerWallet,
        true,
        ownership,
      );
      if (mintResult) {
        targetWallet = playerWallet;
      } else if (accountEmail) {
        console.warn(`[NFT] Address mint failed — email backup → ${accountEmail}`);
      }
    }

    if (!mintResult && accountEmail && !forceEscrow) {
      // Backup: mint to email connected to account (Crossmint email → their wallet)
      console.log(`[NFT] Email backup mint → ${accountEmail}`);
      mintResult = await crossmintWalletService.mintToEmail(
        character,
        imageUrl,
        accountEmail,
        true,
        { ...ownership, custody: "email_backup" },
      );
      if (mintResult) {
        targetWallet = `email:${accountEmail}:solana`;
        custody = "email_backup";
      }
    }

    if (!mintResult) {
      // Last resort only: admin escrow + claim (ops / disaster recovery)
      if (!agentWallet) {
        console.error(
          "[NFT] Wallet+email mint failed and no AI_AGENT_WALLET — cannot mint cNFT",
        );
        return {
          success: false,
          error:
            "Could not mint to account wallet or email; escrow wallet not configured (AI_AGENT_WALLET)",
        };
      }
      console.warn(`[NFT] Escrow LAST-RESORT mint → admin wallet: ${agentWallet}`);
      mintResult = await crossmintWalletService.mintCharacterNFT(
        character,
        imageUrl,
        agentWallet,
        true,
        { ...ownership, custody: "escrow_admin" },
      );
      targetWallet = `escrow:${agentWallet}`;
      escrowed = true;
      custody = "escrow_admin";
    }

    if (!mintResult) {
      return { success: false, error: "Failed to initiate NFT minting" };
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

    // Already provisioned — never create a second wallet for this account
    if (account.walletAddress) {
      return account.walletAddress;
    }

    // Prefer Grudge ID–stable Crossmint custodial wallet (1:1 with account)
    const grudgeId =
      (account as { grudgeId?: string | null }).grudgeId ||
      (account as { userId?: string | null }).userId ||
      null;
    const locatorEmail =
      email ||
      (account as { crossmintEmail?: string | null }).crossmintEmail ||
      (account as { email?: string | null }).email ||
      (grudgeId ? crossmintWalletService.stableEmailForGrudgeId(String(grudgeId)) : null);

    if (grudgeId) {
      const wallet = await crossmintWalletService.getOrCreateWalletForGrudgeId(String(grudgeId));
      if (wallet) {
        await db
          .update(accounts)
          .set({
            walletAddress: wallet.address,
            walletType: "crossmint",
            crossmintWalletId: wallet.id,
            crossmintEmail:
              locatorEmail ||
              crossmintWalletService.stableEmailForGrudgeId(String(grudgeId)),
            updatedAt: Date.now(),
          } as any)
          .where(eq(accounts.id, accountId));
        console.log(
          `[NFT] Provisioned account wallet ${wallet.address} for account ${accountId} grudgeId=${grudgeId}`,
        );
        return wallet.address;
      }
    }

    if (locatorEmail) {
      const wallet = await crossmintWalletService.getOrCreateWallet(locatorEmail);
      if (wallet) {
        await db
          .update(accounts)
          .set({
            walletAddress: wallet.address,
            walletType: "crossmint",
            crossmintWalletId: wallet.id,
            crossmintEmail: locatorEmail,
            updatedAt: Date.now(),
          } as any)
          .where(eq(accounts.id, accountId));
        console.log(
          `[NFT] Provisioned account wallet ${wallet.address} via email locator for ${accountId}`,
        );
        return wallet.address;
      }
    }

    return null;
  }

  /**
   * Mint home-island cNFT to the account's singular server wallet.
   * Same priority as characters: wallet → email backup → escrow last resort.
   */
  async mintIslandAsCNFT(
    accountId: string,
    island: {
      id: string;
      seed: string;
      name: string;
      mapStyle: string;
      mapImageUrl?: string | null;
    },
  ): Promise<{
    success: boolean;
    actionId?: string;
    mintAddress?: string;
    walletAddress?: string | null;
    error?: string;
  }> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const accountEmail = this.resolveAccountEmail(
      account as {
        grudgeId?: string | null;
        userId?: string | null;
        email?: string | null;
        crossmintEmail?: string | null;
      },
    );
    const walletAddress =
      (await this.ensureAccountWallet(accountId, accountEmail || undefined)) ||
      account.walletAddress ||
      null;

    // 1) Direct to account server wallet
    if (walletAddress) {
      const mintResult = await crossmintWalletService.mintIslandCNFT(
        { ...account, walletAddress } as typeof account,
        island,
      );
      if (mintResult.actionId) {
        console.log(
          `[NFT] Island cNFT → account wallet ${walletAddress} action=${mintResult.actionId}`,
        );
        return {
          success: true,
          actionId: mintResult.actionId,
          mintAddress: mintResult.mintAddress,
          walletAddress,
        };
      }
      console.warn(`[NFT] Island address mint failed — trying email backup`);
    }

    // 2) Backup: email connected to account
    if (accountEmail) {
      const imageUrl =
        island.mapImageUrl ||
        "https://www.crossmint.com/assets/crossmint/logo.png";
      const islandRow = {
        id: island.id,
        seed: island.seed,
        name: island.name,
        mapStyle: island.mapStyle,
        mapImageUrl: island.mapImageUrl,
        createdAt: Date.now(),
      } as any;
      const mintResult = await crossmintWalletService.mintIslandToEmail(
        islandRow,
        accountEmail,
        imageUrl,
      );
      if (mintResult?.actionId) {
        console.log(
          `[NFT] Island cNFT email backup → ${accountEmail} action=${mintResult.actionId}`,
        );
        return {
          success: true,
          actionId: mintResult.actionId,
          mintAddress: mintResult.onChain?.mintHash,
          walletAddress: `email:${accountEmail}:solana`,
        };
      }
    }

    // 3) Last resort: admin escrow (claim later)
    const agentWallet =
      process.env.AI_AGENT_WALLET ||
      process.env.AGENT_ESCROW_WALLET ||
      process.env.CROSSMINT_TREASURY_WALLET;
    if (!agentWallet) {
      return {
        success: false,
        error: "Island mint failed (wallet + email); no AI_AGENT_WALLET",
      };
    }
    console.warn(
      `[NFT] Island mint escrow LAST-RESORT for account ${accountId} → ${agentWallet}`,
    );
    const mintResult = await crossmintWalletService.mintIslandCNFT(
      { ...account, walletAddress: agentWallet } as typeof account,
      island,
    );
    return {
      success: !!mintResult.actionId,
      actionId: mintResult.actionId,
      mintAddress: mintResult.mintAddress,
      walletAddress: mintResult.actionId ? `escrow:${agentWallet}` : null,
      error: mintResult.actionId ? undefined : "Island mint failed",
    };
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
