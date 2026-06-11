/**
 * NFT Verification Service — syncs on-chain cNFT state with database.
 *
 * Checks all character and island NFTs in the database against Crossmint
 * to verify mint status, update mint addresses, confirm owner wallets,
 * and flag mismatches.
 *
 * Run via: POST /api/admin/verify-nfts (admin-only)
 * Or programmatically: await verifyAllNFTs()
 */

import { db, SANDBOX_MODE } from "../db";
import { characterNFTs, islandNFTs, accounts, characters } from "@shared/schema";
import { eq, isNotNull, sql } from "drizzle-orm";
import { crossmintWalletService } from "./crossmintWallet";

// ── Types ────────────────────────────────────────────────────────

export interface VerificationResult {
  characterNFTs: NFTCheckResult[];
  islandNFTs: NFTCheckResult[];
  summary: {
    totalChecked: number;
    verified: number;
    updated: number;
    mismatched: number;
    failed: number;
    pendingMints: number;
  };
  accounts: AccountSummary[];
}

export interface NFTCheckResult {
  nftId: string;
  type: 'character' | 'island';
  characterOrIslandName: string;
  dbStatus: string;
  crossmintStatus: string | null;
  mintAddress: string | null;
  ownerWallet: string | null;
  expectedOwnerWallet: string | null;
  ownerMatch: boolean;
  action: 'verified' | 'updated' | 'mismatch' | 'failed' | 'pending';
  error?: string;
}

export interface AccountSummary {
  accountId: string;
  displayName: string | null;
  grudgeId: string | null;
  walletAddress: string | null;
  gbuxBalance: number;
  characterCount: number;
  mintedNFTCount: number;
}

// ── Verification Logic ───────────────────────────────────────────

/**
 * Verify all character cNFTs against Crossmint.
 * Updates DB records where status has changed.
 */
async function verifyCharacterNFTs(): Promise<NFTCheckResult[]> {
  if (SANDBOX_MODE) return [];

  const nfts = await db
    .select({
      nft: characterNFTs,
      character: characters,
      account: accounts,
    })
    .from(characterNFTs)
    .leftJoin(characters, eq(characterNFTs.characterId, characters.id))
    .leftJoin(accounts, eq(characterNFTs.accountId, accounts.id));

  const results: NFTCheckResult[] = [];

  for (const row of nfts) {
    const { nft, character, account } = row;
    const result: NFTCheckResult = {
      nftId: nft.id,
      type: 'character',
      characterOrIslandName: character?.name || `Character ${nft.characterId}`,
      dbStatus: nft.status,
      crossmintStatus: null,
      mintAddress: nft.mintAddress,
      ownerWallet: nft.ownerWalletAddress,
      expectedOwnerWallet: account?.walletAddress || null,
      ownerMatch: false,
      action: 'pending',
    };

    // Skip if no crossmint action ID (never minted)
    if (!nft.crossmintActionId) {
      result.action = 'pending';
      result.crossmintStatus = 'no_action_id';
      results.push(result);
      continue;
    }

    try {
      const status = await crossmintWalletService.checkMintStatus(nft.crossmintActionId);

      if (!status) {
        result.action = 'failed';
        result.error = 'Crossmint API returned null';
        results.push(result);
        continue;
      }

      result.crossmintStatus = status.status;

      if (status.status === 'success') {
        const newMintAddress = status.data?.token?.mintHash || null;
        const newOwnerWallet = status.ownerWallet || null;

        result.mintAddress = newMintAddress;
        result.ownerWallet = newOwnerWallet;
        result.ownerMatch = !!(
          newOwnerWallet &&
          account?.walletAddress &&
          newOwnerWallet === account.walletAddress
        );

        // Update DB if needed
        const needsUpdate =
          nft.status !== 'minted' ||
          nft.mintAddress !== newMintAddress ||
          nft.ownerWalletAddress !== newOwnerWallet;

        if (needsUpdate) {
          await db
            .update(characterNFTs)
            .set({
              status: 'minted',
              mintAddress: newMintAddress,
              ownerWalletAddress: newOwnerWallet,
              assetId: status.data?.token?.id || nft.assetId,
              collectionAddress: status.data?.collection?.id || nft.collectionAddress,
              mintedAt: nft.mintedAt || Date.now(),
              updatedAt: Date.now(),
            })
            .where(eq(characterNFTs.id, nft.id));

          result.action = 'updated';
        } else {
          result.action = result.ownerMatch ? 'verified' : 'mismatch';
        }
      } else if (status.status === 'failed') {
        if (nft.status !== 'minted') {
          // Don't overwrite a previously confirmed mint
          await db
            .update(characterNFTs)
            .set({ status: 'pending', updatedAt: Date.now() })
            .where(eq(characterNFTs.id, nft.id));
        }
        result.action = 'failed';
        result.error = 'Crossmint reports mint failed';
      } else {
        result.action = 'pending';
      }
    } catch (err) {
      result.action = 'failed';
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);

    // Rate limit: 200ms between Crossmint API calls
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

/**
 * Verify all island cNFTs against Crossmint.
 */
async function verifyIslandNFTs(): Promise<NFTCheckResult[]> {
  if (SANDBOX_MODE) return [];

  const nfts = await db
    .select({
      nft: islandNFTs,
      account: accounts,
    })
    .from(islandNFTs)
    .leftJoin(accounts, eq(islandNFTs.accountId, accounts.id));

  const results: NFTCheckResult[] = [];

  for (const row of nfts) {
    const { nft, account } = row;
    const result: NFTCheckResult = {
      nftId: nft.id,
      type: 'island',
      characterOrIslandName: `Island ${nft.islandId?.slice(0, 8)}`,
      dbStatus: nft.status,
      crossmintStatus: null,
      mintAddress: nft.mintAddress,
      ownerWallet: nft.ownerWalletAddress,
      expectedOwnerWallet: account?.walletAddress || null,
      ownerMatch: false,
      action: 'pending',
    };

    if (!nft.crossmintActionId) {
      result.action = 'pending';
      result.crossmintStatus = 'no_action_id';
      results.push(result);
      continue;
    }

    try {
      const status = await crossmintWalletService.checkMintStatus(nft.crossmintActionId);

      if (!status) {
        result.action = 'failed';
        result.error = 'Crossmint API returned null';
        results.push(result);
        continue;
      }

      result.crossmintStatus = status.status;

      if (status.status === 'success') {
        const newMintAddress = status.data?.token?.mintHash || null;
        const newOwnerWallet = status.ownerWallet || null;

        result.mintAddress = newMintAddress;
        result.ownerWallet = newOwnerWallet;
        result.ownerMatch = !!(
          newOwnerWallet &&
          account?.walletAddress &&
          newOwnerWallet === account.walletAddress
        );

        const needsUpdate =
          nft.status !== 'minted' ||
          nft.mintAddress !== newMintAddress ||
          nft.ownerWalletAddress !== newOwnerWallet;

        if (needsUpdate) {
          await db
            .update(islandNFTs)
            .set({
              status: 'minted',
              mintAddress: newMintAddress,
              ownerWalletAddress: newOwnerWallet,
              assetId: status.data?.token?.id || nft.assetId,
              collectionAddress: status.data?.collection?.id || nft.collectionAddress,
              mintedAt: nft.mintedAt || Date.now(),
              updatedAt: Date.now(),
            })
            .where(eq(islandNFTs.id, nft.id));

          result.action = 'updated';
        } else {
          result.action = result.ownerMatch ? 'verified' : 'mismatch';
        }
      } else if (status.status === 'failed') {
        result.action = 'failed';
        result.error = 'Crossmint reports mint failed';
      } else {
        result.action = 'pending';
      }
    } catch (err) {
      result.action = 'failed';
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

/**
 * Get account summaries with wallet + GBUX + character counts.
 */
async function getAccountSummaries(): Promise<AccountSummary[]> {
  if (SANDBOX_MODE) return [];

  const rows = await db
    .select({
      accountId: accounts.id,
      displayName: accounts.displayName,
      grudgeId: accounts.grudgeId,
      walletAddress: accounts.walletAddress,
      gbuxBalance: accounts.gbuxBalance,
      characterCount: sql<number>`(SELECT COUNT(*) FROM characters WHERE characters.account_id = ${accounts.id})`,
      mintedNFTCount: sql<number>`(SELECT COUNT(*) FROM character_nfts WHERE character_nfts.account_id = ${accounts.id} AND character_nfts.status = 'minted')`,
    })
    .from(accounts)
    .where(isNotNull(accounts.walletAddress))
    .orderBy(sql`${accounts.gbuxBalance} DESC`);

  return rows.map(r => ({
    accountId: r.accountId,
    displayName: r.displayName,
    grudgeId: r.grudgeId,
    walletAddress: r.walletAddress,
    gbuxBalance: r.gbuxBalance,
    characterCount: Number(r.characterCount),
    mintedNFTCount: Number(r.mintedNFTCount),
  }));
}

// ── Main verification function ───────────────────────────────────

export async function verifyAllNFTs(): Promise<VerificationResult> {
  console.log('[NFTVerification] Starting full verification...');

  const charResults = await verifyCharacterNFTs();
  const islandResults = await verifyIslandNFTs();
  const accountSummaries = await getAccountSummaries();

  const allResults = [...charResults, ...islandResults];

  const summary = {
    totalChecked: allResults.length,
    verified: allResults.filter(r => r.action === 'verified').length,
    updated: allResults.filter(r => r.action === 'updated').length,
    mismatched: allResults.filter(r => r.action === 'mismatch').length,
    failed: allResults.filter(r => r.action === 'failed').length,
    pendingMints: allResults.filter(r => r.action === 'pending').length,
  };

  console.log('[NFTVerification] Complete:', JSON.stringify(summary));

  return {
    characterNFTs: charResults,
    islandNFTs: islandResults,
    summary,
    accounts: accountSummaries,
  };
}
